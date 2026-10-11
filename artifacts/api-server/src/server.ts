import { createServer } from 'node:http';
import { Server } from 'socket.io';
import app from './app';
import { setupChatSocket } from './socket/chat';
import { authenticateSocketConnection } from './middlewares/auth';

export const httpServer = createServer(app);
export const io = new Server(httpServer, {
  path: '/api/socket.io',
  cors: { origin: '*' },
});

io.use(authenticateSocketConnection);
setupChatSocket(io);
