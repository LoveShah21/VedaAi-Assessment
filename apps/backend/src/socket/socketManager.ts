// apps/backend/src/socket/socketManager.ts
import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { env } from '../config/env';

let io: SocketIOServer | null = null;

export const initSocket = (server: HttpServer): SocketIOServer => {
  const allowedOrigins = [env.FRONTEND_URL, 'http://localhost:3000'];
  io = new SocketIOServer(server, {
    cors: {
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
            callback(null, origin);
          } else {
            callback(new Error(`Origin ${origin} not allowed by CORS`));
          }
        } catch (err) {
          callback(null, false);
        }
      },
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket: Socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    socket.on('subscribe', (assignmentId: string) => {
      if (assignmentId) {
        socket.join(assignmentId);
        console.log(`🔌 Client ${socket.id} subscribed to ${assignmentId}`);
      }
    });

    socket.on('join-job', (assignmentId: string) => {
      if (assignmentId) {
        socket.join(assignmentId);
        console.log(`🔌 Client ${socket.id} joined job room ${assignmentId}`);
      }
    });

    socket.on('unsubscribe', (assignmentId: string) => {
      if (assignmentId) {
        socket.leave(assignmentId);
        console.log(`🔌 Client ${socket.id} unsubscribed from ${assignmentId}`);
      }
    });

    socket.on('leave-job', (assignmentId: string) => {
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

export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error('Socket.io has not been initialized');
  }
  return io;
};

export const emitToAssignment = (assignmentId: string, event: string, data: unknown): void => {
  if (io) {
    io.to(assignmentId).emit(event, data);
  }
};
