"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitToAssignment = exports.getIO = exports.initSocket = void 0;
// apps/backend/src/socket/socketManager.ts
const socket_io_1 = require("socket.io");
const env_1 = require("../config/env");
let io = null;
const initSocket = (server) => {
    io = new socket_io_1.Server(server, {
        cors: {
            origin: env_1.env.FRONTEND_URL,
            methods: ['GET', 'POST'],
            credentials: true,
        },
    });
    io.on('connection', (socket) => {
        console.log(`🔌 Client connected: ${socket.id}`);
        socket.on('subscribe', (assignmentId) => {
            if (assignmentId) {
                socket.join(assignmentId);
                console.log(`🔌 Client ${socket.id} subscribed to ${assignmentId}`);
            }
        });
        socket.on('join-job', (assignmentId) => {
            if (assignmentId) {
                socket.join(assignmentId);
                console.log(`🔌 Client ${socket.id} joined job room ${assignmentId}`);
            }
        });
        socket.on('unsubscribe', (assignmentId) => {
            if (assignmentId) {
                socket.leave(assignmentId);
                console.log(`🔌 Client ${socket.id} unsubscribed from ${assignmentId}`);
            }
        });
        socket.on('leave-job', (assignmentId) => {
            if (assignmentId) {
                socket.leave(assignmentId);
                console.log(`🔌 Client ${socket.id} left job room ${assignmentId}`);
            }
        });
        socket.on('disconnect', () => {
            console.log(`🔌 Client disconnected: ${socket.id}`);
        });
    });
    return io;
};
exports.initSocket = initSocket;
const getIO = () => {
    if (!io) {
        throw new Error('Socket.io has not been initialized');
    }
    return io;
};
exports.getIO = getIO;
const emitToAssignment = (assignmentId, event, data) => {
    if (io) {
        io.to(assignmentId).emit(event, data);
    }
};
exports.emitToAssignment = emitToAssignment;
