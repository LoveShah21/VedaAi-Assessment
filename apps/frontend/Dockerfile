FROM node:20-alpine

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

# Next.js build-time variables resolution
RUN cp .env.local .env || true

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
