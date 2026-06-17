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
    const { summary, transcript } = await req.json();

    if (!summary || !transcript) {
      return NextResponse.json(
        { error: 'Summary and transcript are required for Fathom import.' },
        { status: 400 }
      );
    }

    const meeting = await prisma.meeting.update({
      where: { id },
      data: {
        fathom_summary: summary,
        fathom_transcript: transcript,
        fathom_imported_at: new Date(),
      },
    });

    // Broadcast update
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const io = (globalThis as any).io;
    if (io) {
      io.emit('meetings:update', { action: 'fathom-import', meetingId: id });
    }

    return NextResponse.json(meeting);
  } catch (error) {
    console.error('POST /api/meetings/[id]/fathom-import error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while importing Fathom data.' },
      { status: 500 }
    );
  }
}
