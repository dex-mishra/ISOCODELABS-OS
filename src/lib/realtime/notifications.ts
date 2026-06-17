import { prisma } from '../db/prisma';

export async function createAndBroadcastNotification(
  userId: string,
  data: {
    title: string;
    body: string;
    type: string;
    link?: string;
  }
) {
  try {
    // 1. Create notification in database
    const notification = await prisma.notification.create({
      data: {
        user_id: userId,
        title: data.title,
        body: data.body,
        type: data.type,
        link: data.link || null,
        is_read: false,
      },
    });

    // 2. Broadcast via socket if server is running
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const io = (globalThis as any).io;
    if (io) {
      // Emit the new notification to the user's private room
      io.to(`user:${userId}`).emit('notification', notification);

      // Recalculate unread count and emit it
      const unreadCount = await prisma.notification.count({
        where: {
          user_id: userId,
          is_read: false,
        },
      });
      io.to(`user:${userId}`).emit('unread-count', { count: unreadCount });
    }

    return notification;
  } catch (error) {
    console.error('Failed to create and broadcast notification:', error);
    throw error;
  }
}
