   FROM node:18-buster-slim

   WORKDIR /app

   # 安装Chrome依赖
   RUN apt-get update \
       && apt-get install -y wget gnupg \
       && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
       && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
       && apt-get update \
       && apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf \
         --no-install-recommends \
       && rm -rf /var/lib/apt/lists/*

   # 设置Puppeteer配置
   ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
   ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

   # 复制项目文件
   COPY package*.json ./
   RUN npm install
   COPY . .

   # 创建日志目录
   RUN mkdir -p /app/logs

   EXPOSE 8000

   CMD ["node", "app.js"]