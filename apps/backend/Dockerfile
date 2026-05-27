FROM node:20-alpine

# Install Puppeteer/Chromium system dependencies
RUN apk add --no-cache \
      chromium \
      nss \
      freetype \
      harfbuzz \
      ca-certificates \
      ttf-freefont

# Tell Puppeteer to use the system-installed Chromium, set node memory limits
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    NODE_ENV=production \
    NODE_OPTIONS="--max-old-space-size=450"

WORKDIR /usr/src/app

COPY package.json ./

# Optimize npm to use minimal memory and prevent OOM on Render Free tier
RUN npm config set progress false && \
    npm config set maxsockets 1 && \
    npm install --legacy-peer-deps --no-audit --no-fund && \
    npm cache clean --force

COPY . .
RUN npm run build

# Render assigns PORT dynamically — no hardcoded EXPOSE
CMD ["node", "dist/index.js"]
