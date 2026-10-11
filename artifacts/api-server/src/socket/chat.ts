import type { Server, Socket } from 'socket.io';
import { db, messages } from '@workspace/db';
import { logger } from '../lib/logger';
import type { AuthenticatedUser } from '../middlewares/auth';

export const setupChatSocket = (io: Server) => {
  io.on('connection', (socket: Socket) => {
    const authUser = socket.data.authUser as AuthenticatedUser;
    logger.info({ socketId: socket.id, userId: authUser.id }, 'A chat client connected');

    // ተጠቃሚውን ወደራሱ ክፍል (Room) ማስገባት
    socket.on('join_room', () => {
      const room = authUser.id.toString();
      socket.join(room);
      logger.info({ userId: authUser.id, socketId: socket.id }, 'Chat client joined its own room');
    });

    // የቀጥታ መልእክት መላኪያና ዳታቤዝ ላይ ማስቀመጫ
    socket.on('send_message', async (data: { receiverId: number; message: string }) => {
      const { receiverId, message } = data;
      if (!Number.isSafeInteger(receiverId) || receiverId <= 0 || typeof message !== 'string' || !message.trim()) {
        socket.emit('message_error', { error: 'Invalid message payload' });
        return;
      }

      try {
        // 1. መልእክቱን ዳታቤዝ ውስጥ ማስቀመጥ
        const [savedMsg] = await db.insert(messages).values({
          senderId: authUser.id,
          receiverId,
          message: message.trim(),
        }).returning();

        // 2. ለተቀባዩ በReal-time መላክ
        io.to(receiverId.toString()).emit('receive_message', savedMsg);
      } catch (error) {
        logger.error({ err: error, socketId: socket.id }, 'Failed to persist chat message');
      }
    });

    socket.on('disconnect', () => {
      logger.info({ socketId: socket.id }, 'A chat client disconnected');
    });
  });
};
