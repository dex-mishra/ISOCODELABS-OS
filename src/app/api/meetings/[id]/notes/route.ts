import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = requireAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { id } = params;
    const { notes } = await req.json();

    const meeting = await prisma.meeting.update({
      where: { id },
      data: { notes },
    });

    // Broadcast update
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const io = (globalThis as any).io;
    if (io) {
      io.emit('meetings:update', { action: 'notes', meetingId: id });
    }

    return NextResponse.json(meeting);
  } catch (error) {
    console.error('PUT /api/meetings/[id]/notes error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while saving meeting notes.' },
      { status: 500 }
    );
  }
}
