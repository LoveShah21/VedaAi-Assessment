const mongoose = require('mongoose');
const Redis = require('ioredis');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env files with precedence over process.env
let envConfig = {};

// Load backend .env if it exists
const backendEnvPath = path.resolve(__dirname, 'apps/backend/.env');
if (fs.existsSync(backendEnvPath)) {
  try {
    const parsed = dotenv.parse(fs.readFileSync(backendEnvPath));
    envConfig = { ...envConfig, ...parsed };
  } catch (err) {
    console.warn(`⚠️ Failed to parse backend .env file: ${err.message}`);
  }
}

// Load root .env if it exists (overrides/supplements backend)
const rootEnvPath = path.resolve(__dirname, '.env');
if (fs.existsSync(rootEnvPath)) {
  try {
    const parsed = dotenv.parse(fs.readFileSync(rootEnvPath));
    envConfig = { ...envConfig, ...parsed };
  } catch (err) {
    console.warn(`⚠️ Failed to parse root .env file: ${err.message}`);
  }
}

// Precedence: .env files first, then terminal env variables
const mongoUri = envConfig.MONGODB_URI || process.env.MONGODB_URI;
const redisUrl = envConfig.REDIS_URL || process.env.REDIS_URL;

async function testMongo(uri) {
  if (!uri) {
    console.log('⚠️ MongoDB: Connection string is not set. Skipping...');
    return false;
  }
  console.log(`🔌 MongoDB: Connecting to database...`);
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log('✅ MongoDB: Connection successful!');
    await mongoose.disconnect();
    return true;
  } catch (err) {
    console.error('❌ MongoDB: Connection failed!');
    console.error(`   Error details: ${err.message}`);
    return false;
  }
}

async function testRedis(url) {
  if (!url) {
    console.log('⚠️ Redis: Connection string is not set. Skipping...');
    return false;
  }
  console.log(`🔌 Redis: Connecting to server...`);
  try {
    const redis = new Redis(url, {
      connectTimeout: 5000,
      maxRetriesPerRequest: 1
    });

    await new Promise((resolve, reject) => {
      redis.on('connect', () => {
        resolve();
      });
      redis.on('error', (err) => {
        reject(err);
      });
    });

    console.log('✅ Redis: Connection successful!');
    redis.disconnect();
    return true;
  } catch (err) {
    console.error('❌ Redis: Connection failed!');
    console.error(`   Error details: ${err.message}`);
    return false;
  }
}

async function main() {
  console.log('====================================');
  console.log('VedaAI Connection Verification Tool');
  console.log('====================================\n');

  console.log('Precedence Order: .env Files -> Terminal Env');
  console.log(`- MONGODB_URI: ${mongoUri ? mongoUri.replace(/:([^@]+)@/, ':****@') : 'Not Found'}`);
  console.log(`- REDIS_URL:   ${redisUrl ? redisUrl.replace(/:([^@]+)@/, ':****@') : 'Not Found'}\n`);

  const mongoOk = await testMongo(mongoUri);
  console.log('');
  const redisOk = await testRedis(redisUrl);

  console.log('\n====================================');
  if (mongoOk && redisOk) {
    console.log('🎉 SUCCESS: All systems are green and ready for deployment!');
  } else {
    console.log('⚠️ WARNING: Please check connection errors above before deploying.');
  }
  console.log('====================================');
  process.exit(mongoOk && redisOk ? 0 : 1);
}

main();
