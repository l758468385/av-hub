# AVHub Node.js 版本

这是一个使用 Node.js 实现的 AVHub 项目，用于替代原 Python 实现版本，提供相同的功能。

## 功能

- 获取 HACG 数据
- 根据 AV 代码获取磁力链接
- 获取随机视频 URL

## 技术栈

- Node.js
- Express.js
- Axios
- Cheerio
- Node-Schedule
- Winston (日志)
- Config

## 安装

```bash
# 安装依赖
npm install

# 安装开发依赖
npm install nodemon -D
```

## 配置

配置文件位于 `config/default.json`，包括以下内容：

- app: 应用配置（CORS、端口等）
- files: 文件路径配置
- av_spider: AV 爬虫配置
- hacg_spider: HACG 爬虫配置
- logging: 日志配置

## 使用

### 开发环境

```bash
npm run dev
```

### 生产环境

```bash
npm start
```

## API 端点

### 获取 HACG 数据

```
GET /v1/hacg
```

### 根据 AV 代码获取磁力链接

```
GET /v1/avcode/:codeStr
```

### 获取随机视频 URL

```
GET /v1/get_video
```

## Docker 部署

```bash
# 构建镜像
docker build -t avhub-node .

# 运行容器
docker run -d -p 8000:8000 avhub-node
```

## 自动任务

系统会在每天凌晨 1 点自动运行 HacgSpider 任务，更新 HACG 数据。 