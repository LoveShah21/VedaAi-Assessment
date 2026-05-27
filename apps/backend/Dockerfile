FROM node:20-alpine

# Install Puppeteer/Chromium system dependencies
RUN apk add --no-cache \
      chromium \
      nss \
      freetype \
      harfbuzz \
      ca-certificates \
      ttf-freefont

# Tell Puppeteer to use the system-installed Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    NODE_ENV=production

WORKDIR /usr/src/app

COPY package.json ./
RUN npm install --legacy-peer-deps

COPY . .
RUN npm run build

# Render assigns PORT dynamically — no hardcoded EXPOSE
CMD ["node", "dist/index.js"]
