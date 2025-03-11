const winston = require('winston');
const config = require('config');

// 创建日志记录器
const createLogger = () => {
  const logConfig = config.get('logging');
  
  return winston.createLogger({
    level: logConfig.level,
    format: winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
    ),
    transports: [
      new winston.transports.Console(),
      new winston.transports.File({ filename: logConfig.log_file })
    ]
  });
};

// 导出日志记录器
const logger = createLogger();

module.exports = logger; 