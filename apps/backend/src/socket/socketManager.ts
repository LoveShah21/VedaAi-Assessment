// apps/backend/src/socket/socketManager.ts
import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { env } from '../config/env';

let io: SocketIOServer | null = null;

export const initSocket = (server: HttpServer): SocketIOServer => {
  io = new SocketIOServer(server, {
    cors: {
      origin: env.FRONTEND_URL,
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

    socket.on('unsubscribe', (assignmentId: string) => {
      if (assignmentId) {
        socket.leave(assignmentId);
        console.log(`🔌 Client ${socket.id} unsubscribed from ${assignmentId}`);
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
