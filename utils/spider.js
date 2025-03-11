const cheerio = require('cheerio');
const fs = require('fs-extra');
const path = require('path');
const logger = require('./logger');
const config = require('config');
const puppeteer = require('puppeteer');

class AVSpider {
  constructor(avCode) {
    this.avCode = avCode.toLowerCase();
    const avSpiderConfig = config.get('av_spider');
    this.sourceUrl = avSpiderConfig.source_url;
    // this.proxyUrl = avSpiderConfig.use_proxy ? avSpiderConfig.proxy_url : null;
    this.proxyUrl = null;
    
    // 设置请求头
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Cache-Control': 'max-age=0'
    };
  }

  // 初始化浏览器
  async initBrowser() {
    const args = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-infobars',
      '--window-position=0,0',
      '--ignore-certifcate-errors',
      '--ignore-certifcate-errors-spki-list'
    ];
    
    if (this.proxyUrl) {
      args.push(`--proxy-server=${this.proxyUrl}`);
    }
    
    const browser = await puppeteer.launch({
      headless: true,
      args,
      ignoreHTTPSErrors: true
    });
    
    return browser;
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
    
    let browser;
    try {
      browser = await this.initBrowser();
      const page = await browser.newPage();
      
      // 设置用户代理和额外头信息
      await page.setUserAgent(this.headers['User-Agent']);
      await page.setExtraHTTPHeaders(this.headers);
      
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
      const content = await page.content();
      
      const $ = cheerio.load(content);
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
    } finally {
      if (browser) await browser.close();
    }
  }

  // 获取磁力链接
  async getMagnetLinks(link) {
    let browser;
    try {
      browser = await this.initBrowser();
      const page = await browser.newPage();
      
      // 设置用户代理和额外头信息
      await page.setUserAgent(this.headers['User-Agent']);
      await page.setExtraHTTPHeaders(this.headers);
      
      await page.goto(link, { waitUntil: 'networkidle2', timeout: 60000 });
      const content = await page.content();
      
      const $ = cheerio.load(content);
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
    } finally {
      if (browser) await browser.close();
    }
  }
}

class HacgSpider {
  constructor() {
    const hacgSpiderConfig = config.get('hacg_spider');
    this.url = hacgSpiderConfig.source_url;
    this.filepath = config.get('files.hacg_json_path');
  }

  // 初始化浏览器
  async initBrowser() {
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-infobars',
        '--window-position=0,0',
        '--ignore-certifcate-errors',
        '--ignore-certifcate-errors-spki-list'
      ],
      ignoreHTTPSErrors: true
    });
    
    return browser;
  }

  // 获取总页数
  async getPages() {
    let browser;
    try {
      browser = await this.initBrowser();
      const page = await browser.newPage();
      
      await page.goto(this.url, { waitUntil: 'networkidle2', timeout: 60000 });
      const content = await page.content();
      
      const $ = cheerio.load(content);
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
    } finally {
      if (browser) await browser.close();
    }
  }

  // 从页面获取链接
  async getLinks(page) {
    const url = `${this.url}page/${page}?s=%E5%90%88%E9%9B%86&submit=%E6%90%9C%E7%B4%A2`;
    const links = {};
    const magnetLinks = {};
    let browser;
    
    try {
      browser = await this.initBrowser();
      const browserPage = await browser.newPage();
      
      await browserPage.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
      const content = await browserPage.content();
      
      const $ = cheerio.load(content);
      
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
          await browserPage.goto(link, { waitUntil: 'networkidle2', timeout: 60000 });
          const content = await browserPage.content();
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
    } finally {
      if (browser) await browser.close();
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