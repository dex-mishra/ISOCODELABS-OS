import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = requireAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { id } = params;

    const meeting = await prisma.meeting.update({
      where: { id },
      data: {
        status: 'IN_PROGRESS',
        meeting_started_at: new Date(),
      },
    });

    // Broadcast update
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const io = (globalThis as any).io;
    if (io) {
      io.emit('meetings:update', { action: 'start', meetingId: id });
    }

    // Trigger notification for all other users
    try {
      const { createAndBroadcastNotification } = require('@/lib/realtime/notifications');
      const otherUsers = await prisma.user.findMany({
        where: { id: { not: user.id } },
      });
      for (const u of otherUsers) {
        await createAndBroadcastNotification(u.id, {
          title: 'Meeting Started',
          body: `Meeting "${meeting.title}" has started.`,
          type: 'MEETING_STARTED',
          link: `/meetings`,
        });
      }
    } catch (err) {
      console.error('Failed to trigger meeting start notification:', err);
    }

    return NextResponse.json(meeting);
  } catch (error) {
    console.error('POST /api/meetings/[id]/start error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while starting the meeting.' },
      { status: 500 }
    );
  }
}
