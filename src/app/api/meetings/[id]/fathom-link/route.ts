import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { isValidFathomUrl } from '@/lib/integrations/fathom';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = requireAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { id } = params;
    const { fathom_link } = await req.json();

    if (!isValidFathomUrl(fathom_link)) {
      return NextResponse.json(
        { error: 'Invalid Fathom URL. Must match fathom.video/share/*' },
        { status: 400 }
      );
    }

    const meeting = await prisma.meeting.update({
      where: { id },
      data: { fathom_link },
    });

    // Broadcast update
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const io = (globalThis as any).io;
    if (io) {
      io.emit('meetings:update', { action: 'fathom-link', meetingId: id });
    }

    return NextResponse.json(meeting);
  } catch (error) {
    console.error('PUT /api/meetings/[id]/fathom-link error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while saving the Fathom link.' },
      { status: 500 }
    );
  }
}
