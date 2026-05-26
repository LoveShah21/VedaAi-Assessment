"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const mongoose_1 = __importDefault(require("mongoose"));
const env_1 = require("./config/env");
const db_1 = require("./config/db");
const redis_1 = require("./config/redis");
const socketManager_1 = require("./socket/socketManager");
const generationWorker_1 = require("./workers/generationWorker");
const assignmentRoutes_1 = __importDefault(require("./routes/assignmentRoutes"));
const groupRoutes_1 = __importDefault(require("./routes/groupRoutes"));
const settingsRoutes_1 = __importDefault(require("./routes/settingsRoutes"));
const activityRoutes_1 = __importDefault(require("./routes/activityRoutes"));
const errorHandler_1 = require("./middlewares/errorHandler");
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
// Initialize Socket.io
(0, socketManager_1.initSocket)(server);
// Start BullMQ Worker
const worker = (0, generationWorker_1.initGenerationWorker)();
console.log('👷 Question generation worker initialized and listening...');
// Connect to MongoDB
(0, db_1.connectDB)();
// Ensure upload directory exists
const uploadDir = path_1.default.resolve(env_1.env.UPLOAD_DIR);
if (!fs_1.default.existsSync(uploadDir)) {
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
}
// Middlewares
app.use((0, cors_1.default)({
    origin: env_1.env.FRONTEND_URL,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Serve static PDF uploads
app.use('/uploads', express_1.default.static(uploadDir));
// Routes
app.use('/api/assignments', assignmentRoutes_1.default);
app.use('/api/groups', groupRoutes_1.default);
app.use('/api/settings', settingsRoutes_1.default);
app.use('/api/activity', activityRoutes_1.default);
// Base route for health check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});
// Error handling middleware
app.use(errorHandler_1.errorHandler);
// Handle graceful shutdown
const gracefulShutdown = async () => {
    console.log('👋 Shutting down gracefully...');
    try {
        await worker.close();
        await mongoose_1.default.disconnect();
        await redis_1.redisClient.quit();
        console.log('📡 Connections closed successfully');
    }
    catch (err) {
        console.error('Error during shutdown connections cleanup:', err);
    }
    server.close(() => {
        console.log('HTTP Server closed');
        process.exit(0);
    });
};
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
server.listen(env_1.env.PORT, () => {
    console.log(`🚀 Server running in ${env_1.env.NODE_ENV} mode on port ${env_1.env.PORT}`);
});
