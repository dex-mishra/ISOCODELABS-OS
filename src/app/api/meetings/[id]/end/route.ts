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

    const currentMeeting = await prisma.meeting.findUnique({
      where: { id },
    });

    if (!currentMeeting) {
      return NextResponse.json({ error: 'Meeting not found.' }, { status: 404 });
    }

    const startedAt = currentMeeting.meeting_started_at || new Date();
    const endedAt = new Date();
    
    // Calculate actual duration in minutes
    const actualDuration = Math.max(
      1,
      Math.round((endedAt.getTime() - startedAt.getTime()) / 60000)
    );

    const meeting = await prisma.meeting.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        meeting_ended_at: endedAt,
        duration: actualDuration,
      },
    });

    // Broadcast update
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const io = (globalThis as any).io;
    if (io) {
      io.emit('meetings:update', { action: 'end', meetingId: id });
    }

    return NextResponse.json(meeting);
  } catch (error) {
    console.error('POST /api/meetings/[id]/end error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while ending the meeting.' },
      { status: 500 }
    );
  }
}
