import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

// PATCH /api/notifications/[id]/read - Mark a specific notification as read
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = requireAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { id } = params;

    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      return NextResponse.json({ error: 'Notification not found.' }, { status: 404 });
    }

    if (notification.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { is_read: true },
    });

    // Broadcast updated unread count via socket
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const io = (globalThis as any).io;
    if (io) {
      const unreadCount = await prisma.notification.count({
        where: {
          user_id: user.id,
          is_read: false,
        },
      });
      io.to(`user:${user.id}`).emit('unread-count', { count: unreadCount });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('PATCH /api/notifications/[id]/read error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while updating the notification.' },
      { status: 500 }
    );
  }
}
