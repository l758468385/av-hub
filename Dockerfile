FROM ghcr.io/puppeteer/puppeteer:latestWORKDIR /appCOPY . .RUN npm installENV XDG_CONFIG_HOME=/tmp/.chromiumENV XDG_CACHE_HOME=/tmp/.chromiumEXPOSE 8000CMD ["node", "app.js"]