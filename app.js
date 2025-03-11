const express = require('express');
const cors = require('cors');
const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');
const schedule = require('node-schedule');
const config = require('config');
const logger = require('./utils/logger');
const { AVSpider, HacgSpider } = require('./utils/spider');

// 创建Express应用
const app = express();

// 配置CORS
app.use(cors({
  origin: config.get('app.cors_origins'),
  credentials: config.get('app.cors_credentials'),
  methods: config.get('app.cors_methods'),
  allowedHeaders: config.get('app.cors_headers')
}));

// 在app.js中添加这一行（在初始化Express应用之后）
app.use(express.static('public'));

// 获取图片URL函数
const getImageUrl = async (videoUrl) => {
  try {
    // 构建图片目录URL
    const imageDirUrl = videoUrl.replace('index.m3u8', 'image/');
    
    // 发送请求获取目录内容
    const response = await axios.get(imageDirUrl, { timeout: 20000 });
    
    // 解析HTML并提取链接
    const $ = cheerio.load(response.data);
    const links = [];
    const webpLinks = [];
    
    $('a[href]').each((index, element) => {
      const href = $(element).attr('href');
      if (href !== '../') {
        const fullUrl = imageDirUrl + href;
        links.push(fullUrl);
        
        if (href.endsWith('.webp')) {
          webpLinks.push(fullUrl);
        }
      }
    });
    
    // 优先返回.webp链接，如果没有则从其他链接中随机返回
    if (links.length === 0) {
      logger.warning('No image links found.');
      return null;
    }
    
    return webpLinks.length > 0
      ? webpLinks[Math.floor(Math.random() * webpLinks.length)]
      : links[Math.floor(Math.random() * links.length)];
  } catch (error) {
    logger.error(`Failed to obtain the image URL: ${error.message}`);
    return null;
  }
};

// 读取随机行函数
const readRandomLine = (filePath) => {
  try {
    if (!fs.existsSync(filePath)) {
      logger.error('File not found');
      throw new Error('File not found');
    }
    
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
      logger.error('File is empty');
      throw new Error('File is empty');
    }
    
    const randomLine = lines[Math.floor(Math.random() * lines.length)].trim();
    return getImageUrl(randomLine).then(imgUrl => [randomLine, imgUrl]);
  } catch (error) {
    throw error;
  }
};

// 路由：获取hacg数据
app.get('/v1/hacg', async (req, res) => {
  try {
    const data = await fs.readJson(config.get('files.hacg_json_path'), { encoding: 'utf-8' });
    logger.info('HACG data fetched successfully');
    return res.json({ data });
  } catch (error) {
    logger.error(`Failed to fetch HACG data: ${error.message}`);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 路由：获取AV磁力链接
app.get('/v1/avcode/:codeStr', async (req, res) => {
  const { codeStr } = req.params;
  const crawler = new AVSpider(codeStr);
  
  try {
    const videoLinks = await crawler.getVideoUrl();
    let allMagnetLinks = [];
    
    for (const link of videoLinks) {
      const magnetLinks = await crawler.getMagnetLinks(link);
      allMagnetLinks = [...allMagnetLinks, ...magnetLinks];
    }
    
    if (allMagnetLinks.length === 0) {
      logger.error(`No magnet links found for AV code: ${codeStr}`);
      return res.status(404).json({ error: 'No magnet links found' });
    }
    
    logger.info(`Magnet links found for AV code: ${codeStr}`);
    return res.json({
      status: 'succeed',
      data: allMagnetLinks.map(item => String(item))
    });
  } catch (error) {
    logger.error(`Error processing AV code: ${error.message}`);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 路由：获取随机视频URL
app.get('/v1/get_video', async (req, res) => {
  try {
    const filePath = config.get('files.video_urls_txt_path');
    const [videoUrl, imgUrl] = await readRandomLine(filePath);
    
    logger.info('Random video URL and image URL fetched successfully');
    return res.json({
      url: videoUrl,
      img_url: imgUrl || ''
    });
  } catch (error) {
    logger.error(`Failed to fetch random video URL: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
});

// 运行HacgSpider任务
const runHacgSpider = async () => {
  const hacgSpider = new HacgSpider();
  await hacgSpider.updateJsonFile();
  logger.info('HacgSpider task completed.');
};

// 设置每天凌晨1点运行HacgSpider任务
schedule.scheduleJob('0 1 * * *', runHacgSpider);

// 启动服务器
const PORT = config.get('app.port');
app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Server running at http://0.0.0.0:${PORT}`);
});

// 导出应用实例（用于测试）
module.exports = app; 