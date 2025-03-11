FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --production

COPY . .

# 创建日志目录
RUN mkdir -p /app/logs

EXPOSE 8000

CMD ["node", "app.js"] 