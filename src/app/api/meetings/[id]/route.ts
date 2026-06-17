import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';

// GET /api/meetings/[id] - get single meeting
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = requireAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { id } = params;

    const meeting = await prisma.meeting.findUnique({
      where: { id },
      include: {
        creator: {
          select: { id: true, name: true, email: true, avatar_url: true },
        },
        attendees: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatar_url: true },
            },
          },
        },
        tasks: {
          include: {
            assignee: {
              select: { id: true, name: true, email: true, avatar_url: true },
            },
          },
        },
      },
    });

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found.' }, { status: 404 });
    }

    return NextResponse.json(meeting);
  } catch (error) {
    console.error('GET meeting by ID error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while retrieving the meeting.' },
      { status: 500 }
    );
  }
}

// PUT /api/meetings/[id] - update meeting
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = requireAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { id } = params;
    const body = await req.json();
    const { title, description, agenda, scheduled_at, duration, attendeeIds } = body;

    if (!title || !scheduled_at || !duration) {
      return NextResponse.json(
        { error: 'Title, scheduled_at, and duration are required.' },
        { status: 400 }
      );
    }

    // Update meeting details and sync attendees (delete old ones and create new ones)
    const meeting = await prisma.$transaction(async (tx) => {
      // Clear old attendees
      await tx.meetingAttendee.deleteMany({
        where: { meeting_id: id },
      });

      // Update meeting fields and connect new attendees
      return tx.meeting.update({
        where: { id },
        data: {
          title,
          description,
          agenda,
          scheduled_at: new Date(scheduled_at),
          duration: parseInt(duration, 10),
          attendees: {
            create: (attendeeIds || []).map((userId: string) => ({
              user: { connect: { id: userId } },
            })),
          },
        },
        include: {
          creator: {
            select: { id: true, name: true, email: true, avatar_url: true },
          },
          attendees: {
            include: {
              user: {
                select: { id: true, name: true, email: true, avatar_url: true },
              },
            },
          },
        },
      });
    });

    // Broadcast update via socket
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const io = (globalThis as any).io;
    if (io) {
      io.emit('meetings:update', { action: 'update', meetingId: id });
    }

    return NextResponse.json(meeting);
  } catch (error) {
    console.error('PUT meeting by ID error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while updating the meeting.' },
      { status: 500 }
    );
  }
}

// DELETE /api/meetings/[id] - delete meeting
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = requireAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { id } = params;

    // Hard delete since schema has no soft-delete flag, cascades to attendees
    await prisma.meeting.delete({
      where: { id },
    });

    // Broadcast deletion via socket
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const io = (globalThis as any).io;
    if (io) {
      io.emit('meetings:update', { action: 'delete', meetingId: id });
    }

    return NextResponse.json({ message: 'Meeting deleted successfully.' });
  } catch (error) {
    console.error('DELETE meeting by ID error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while deleting the meeting.' },
      { status: 500 }
    );
  }
}
