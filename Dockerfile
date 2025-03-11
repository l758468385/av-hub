FROM ghcr.io/puppeteer/puppeteer:latest

# 复制应用代码
WORKDIR /app
COPY . .

# 安装依赖
RUN npm install

# 设置环境变量
ENV XDG_CONFIG_HOME=/tmp/.chromium
ENV XDG_CACHE_HOME=/tmp/.chromium

# 暴露端口
EXPOSE 8000

# 启动应用
CMD ["node", "app.js"]