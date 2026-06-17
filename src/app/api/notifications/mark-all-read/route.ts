import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

// PATCH /api/notifications/mark-all-read - Mark all notifications as read for current user
export async function PATCH(req: NextRequest) {
  try {
    const user = requireAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    await prisma.notification.updateMany({
      where: {
        user_id: user.id,
        is_read: false,
      },
      data: {
        is_read: true,
      },
    });

    // Broadcast updated unread count (0) via socket
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const io = (globalThis as any).io;
    if (io) {
      io.to(`user:${user.id}`).emit('unread-count', { count: 0 });
    }

    return NextResponse.json({ message: 'All notifications marked as read.' });
  } catch (error) {
    console.error('PATCH /api/notifications/mark-all-read error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while marking notifications as read.' },
      { status: 500 }
    );
  }
}
