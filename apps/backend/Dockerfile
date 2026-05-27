# ---- Stage 1: Build ----
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Set BEFORE npm install so Puppeteer doesn't download its own Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

COPY package*.json ./
# Use npm ci for deterministic, faster installs (no peer dep wrestling)
RUN npm ci

COPY . .
RUN npm run build

# ---- Stage 2: Production ----
FROM node:20-alpine

# Install system Chromium for Puppeteer AFTER the build stage
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    NODE_ENV=production

WORKDIR /usr/src/app

# Only install production deps in the final image
COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled output from builder
COPY --from=builder /usr/src/app/dist ./dist

EXPOSE 5000

CMD ["node", "dist/index.js"]