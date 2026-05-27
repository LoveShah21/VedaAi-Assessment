import express from 'express';
import http from 'http';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import mongoose from 'mongoose';
import { env } from './config/env';
import { connectDB } from './config/db';
import { redisClient } from './config/redis';
import { initSocket } from './socket/socketManager';
import { initGenerationWorker } from './workers/generationWorker';
import assignmentRoutes from './routes/assignmentRoutes';
import groupRoutes from './routes/groupRoutes';
import settingsRoutes from './routes/settingsRoutes';
import activityRoutes from './routes/activityRoutes';
import resultRoutes from './routes/resultRoutes';
import { errorHandler } from './middlewares/errorHandler';
import { getAssignmentStats } from './controllers/assignmentController';

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

// Start BullMQ Worker
const worker = initGenerationWorker();
console.log('👷 Question generation worker initialized and listening...');

// Connect to MongoDB
connectDB();

// Ensure upload directory exists
const uploadDir = path.resolve(env.UPLOAD_DIR);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Middlewares
// Request logger for visibility in Render/deployment logs
app.use((req, res, next) => {
  console.log(`📥 [${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

const allowedOrigins = [env.FRONTEND_URL, 'http://localhost:3000'];
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }
      try {
        const hostname = new URL(origin).hostname;
        const isVercel = /\.vercel\.app$/.test(hostname);
        const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
        if (allowedOrigins.includes(origin) || isVercel || isLocal) {
          callback(null, true);
        } else {
          callback(new Error(`Origin ${origin} not allowed by CORS`));
        }
      } catch (err) {
        callback(null, false);
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static PDF uploads
app.use('/uploads', express.static(uploadDir));

// Routes
app.use('/api/assignments', assignmentRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/results', resultRoutes);
app.get('/api/stats', getAssignmentStats);

// Base route for health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use(errorHandler);

// Handle graceful shutdown
const gracefulShutdown = async () => {
  console.log('👋 Shutting down gracefully...');
  try {
    await worker.close();
    await mongoose.disconnect();
    await redisClient.quit();
    console.log('📡 Connections closed successfully');
  } catch (err) {
    console.error('Error during shutdown connections cleanup:', err);
  }
  server.close(() => {
    console.log('HTTP Server closed');
    process.exit(0);
  });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

server.listen(env.PORT, () => {
  console.log(`🚀 Server running in ${env.NODE_ENV} mode on port ${env.PORT}`);
});
