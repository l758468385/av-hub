const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs-extra');
const path = require('path');
const logger = require('./logger');
const config = require('config');

class AVSpider {
  constructor(avCode) {
    this.avCode = avCode.toLowerCase();
    const avSpiderConfig = config.get('av_spider');
    this.sourceUrl = avSpiderConfig.source_url;
    this.proxyUrl = avSpiderConfig.use_proxy ? avSpiderConfig.proxy_url : null;
    
    // 设置请求头
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.132 Safari/537.36',
      'Content-Type': 'application/json'
    };
    
    // 设置代理
    this.axiosConfig = {
      headers: this.headers
    };
    
    if (this.proxyUrl) {
      const { HttpsProxyAgent } = require('https-proxy-agent');
      this.axiosConfig.httpsAgent = new HttpsProxyAgent(this.proxyUrl);
      this.axiosConfig.proxy = {
        host: new URL(this.proxyUrl).hostname,
        port: new URL(this.proxyUrl).port
      };
    }
  }

  // 获取视频URL
  async getVideoUrl() {
    const codeStr = this.avCode.replace('-', '');
    const match = codeStr.match(/([a-zA-Z]+)(\d+)/);
    
    if (!match) {
      logger.error(`Invalid AV code format: ${this.avCode}`);
      return [];
    }
    
    const [, letters, digits] = match;
    const formattedCode = `${letters.toLowerCase()}-${digits}`;
    const url = `${this.sourceUrl}${formattedCode}`;
    
    try {
      const response = await axios.get(url, this.axiosConfig);
      const $ = cheerio.load(response.data);
      const uniqueLinks = new Set();
      
      $('a').each((index, element) => {
        const altText = $(element).attr('alt');
        if (altText && altText.includes(formattedCode)) {
          const href = $(element).attr('href');
          if (href) {
            uniqueLinks.add(href);
          }
        }
      });
      
      logger.info(`Found video URLs: ${Array.from(uniqueLinks).join(', ')}`);
      return Array.from(uniqueLinks);
    } catch (error) {
      logger.error(`Request Error: ${error.message}`);
      return [];
    }
  }

  // 获取磁力链接
  async getMagnetLinks(link) {
    try {
      const response = await axios.get(link, this.axiosConfig);
      const $ = cheerio.load(response.data);
      const targetTable = $('.min-w-full');
      const result = [];
      
      if (targetTable.length > 0) {
        targetTable.find('tr').each((rowIndex, row) => {
          const data = [];
          
          $(row).find('td').each((colIndex, col) => {
            const links = $(col).find('a[rel="nofollow"]');
            
            if (links.length > 0) {
              links.each((i, link) => {
                const href = $(link).attr('href');
                if (href && !href.includes('keepshare.org')) {
                  data.push(href);
                }
              });
            }
            
            const text = $(col).text().trim();
            if (text !== '下载' && !text.includes('keepshare.org')) {
              data.push(text);
            }
          });
          
          if (data.length > 0) {
            result.push(data);
          }
        });
      }
      
      logger.info(`Magnet links extracted from ${link}`);
      return result;
    } catch (error) {
      logger.error(`Request Error: ${error.message}`);
      return [];
    }
  }
}

class HacgSpider {
  constructor() {
    const hacgSpiderConfig = config.get('hacg_spider');
    this.url = hacgSpiderConfig.source_url;
    this.filepath = config.get('files.hacg_json_path');
  }

  // 获取总页数
  async getPages() {
    try {
      const response = await axios.get(this.url);
      const $ = cheerio.load(response.data);
      const divElement = $('.wp-pagenavi');
      const pageText = divElement.length > 0 ? divElement.text() : '';
      
      let pages = null;
      if (pageText.includes('共')) {
        pages = parseInt(pageText.split('共')[1].split('页')[0]);
      }
      
      logger.info(`Total pages found: ${pages}`);
      return pages;
    } catch (error) {
      logger.error(`Request Error: ${error.message}`);
      return null;
    }
  }

  // 从页面获取链接
  async getLinks(page) {
    const url = `${this.url}page/${page}?s=%E5%90%88%E9%9B%86&submit=%E6%90%9C%E7%B4%A2`;
    const links = {};
    const magnetLinks = {};
    
    try {
      const response = await axios.get(url);
      const $ = cheerio.load(response.data);
      
      $('a').each((index, element) => {
        const href = $(element).attr('href');
        const text = $(element).text().trim();
        
        if (text.includes('月合集')) {
          links[text] = href;
        }
      });
      
      // 获取每个链接的磁力链接
      for (const [title, link] of Object.entries(links)) {
        try {
          const response = await axios.get(link);
          const content = response.data;
          const matches = content.match(/\b[a-f0-9]{40}\b/);
          
          if (matches) {
            magnetLinks[title] = `magnet:?xt=urn:btih:${matches[0]}`;
          }
        } catch (error) {
          logger.error(`Request Error: ${error.message}`);
          continue;
        }
      }
      
      logger.info(`Magnet links extracted from page ${page}`);
      return magnetLinks;
    } catch (error) {
      logger.error(`Request Error: ${error.message}`);
      return {};
    }
  }

  // 更新JSON文件
  async updateJsonFile() {
    let results = {};
    
    // 检查文件是否存在及其大小
    const fileExists = await fs.pathExists(this.filepath);
    
    if (!fileExists || (await fs.stat(this.filepath)).size === 0) {
      // 文件不存在或为空，进行完整更新
      const totalPages = await this.getPages();
      
      if (totalPages === null) {
        logger.error('Unable to get total pages');
        return;
      }
      
      for (let i = 1; i <= totalPages; i++) {
        const newData = await this.getLinks(i);
        results = { ...results, ...newData };
        logger.info(`Page ${i} processed (Full Update)`);
      }
    } else {
      // 文件存在，进行增量更新
      results = await fs.readJson(this.filepath, { encoding: 'utf-8' });
      const totalPages = await this.getPages();
      
      if (totalPages === null) {
        logger.error('Unable to get total pages');
        return;
      }
      
      for (let i = 1; i <= totalPages; i++) {
        const newData = await this.getLinks(i);
        let allExists = true;
        
        for (const [title, magnetLink] of Object.entries(newData)) {
          if (!results[title] || results[title] !== magnetLink) {
            allExists = false;
            break;
          }
        }
        
        if (!allExists) {
          results = { ...newData, ...results };
          logger.info(`Page ${i} processed (Incremental Update)`);
        } else {
          logger.info(`Page ${i} data already exists in the JSON file, stop updating`);
          break;
        }
      }
    }
    
    // 写入JSON文件
    await fs.outputJson(this.filepath, results, { spaces: 4 });
    logger.info('JSON file updated');
  }
}

module.exports = {
  AVSpider,
  HacgSpider
}; 