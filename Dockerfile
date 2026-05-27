# --- Build Phase ---
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Copy root and workspace package files
COPY package*.json ./
COPY apps/backend/package*.json ./apps/backend/
COPY apps/frontend/package*.json ./apps/frontend/

# Install dependencies across all workspaces
RUN npm install

# Copy source files
COPY . .

# Compile backend TypeScript and build Next.js frontend
RUN npm run build

# --- Production Phase ---
FROM node:20-alpine

# Install Puppeteer/Chromium dependencies for backend PDF generation
RUN apk add --no-cache \
      chromium \
      nss \
      freetype \
      harfbuzz \
      ca-certificates \
      ttf-freefont

# Configure Puppeteer to use the container-installed Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    NODE_ENV=production

WORKDIR /usr/src/app

# Copy built code and dependencies from builder
COPY --from=builder /usr/src/app /usr/src/app

# Expose proxy port (Render default)
EXPOSE 10000

# Start Express, Next.js, and Root Proxy concurrently
CMD ["npm", "start"]
