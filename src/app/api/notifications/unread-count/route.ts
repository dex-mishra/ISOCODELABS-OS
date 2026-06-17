import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

// GET /api/notifications/unread-count - Get count of unread notifications
export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const count = await prisma.notification.count({
      where: {
        user_id: user.id,
        is_read: false,
      },
    });

    return NextResponse.json({ count });
  } catch (error) {
    console.error('GET /api/notifications/unread-count error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while calculating unread count.' },
      { status: 500 }
    );
  }
}
