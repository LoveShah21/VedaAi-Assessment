# ---- Stage 1: Build ----
FROM node:20-alpine AS builder

# Set Node memory limits for the build stage to prevent OOM on Render
ENV NODE_OPTIONS="--max-old-space-size=450" \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

WORKDIR /usr/src/app

COPY package.json ./

# Optimize npm to use minimal memory and prevent OOM
RUN npm config set progress false && \
    npm config set maxsockets 1 && \
    npm install --legacy-peer-deps --no-audit --no-fund && \
    npm cache clean --force

COPY . .
RUN npm run build

# ---- Stage 2: Production ----
FROM node:20-alpine

# Install system Chromium for Puppeteer in the final runtime stage
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    NODE_ENV=production \
    NODE_OPTIONS="--max-old-space-size=256"

WORKDIR /usr/src/app

COPY package.json ./

# Install only production dependencies in the final image
RUN npm config set progress false && \
    npm config set maxsockets 1 && \
    npm install --omit=dev --legacy-peer-deps --no-audit --no-fund && \
    npm cache clean --force

# Copy compiled output from builder stage
COPY --from=builder /usr/src/app/dist ./dist

# Render assigns PORT dynamically
CMD ["node", "dist/index.js"]