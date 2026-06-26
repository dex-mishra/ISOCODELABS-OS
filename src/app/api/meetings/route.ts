import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { Prisma, MeetingStatus } from '@prisma/client';
import { requireAuth } from '@/lib/auth/middleware';
import { createMeetingWithGoogleMeet } from '@/lib/integrations/google-meet';

// GET /api/meetings - list meetings with filters
export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const search = searchParams.get('search');
    const ventureId = searchParams.get('venture_id');

    const whereClause: Prisma.MeetingWhereInput = {};

    if (status) {
      whereClause.status = status as MeetingStatus;
    }

    if (ventureId) {
      whereClause.venture_id = ventureId;
    }

    if (startDate || endDate) {
      whereClause.scheduled_at = {};
      if (startDate) {
        whereClause.scheduled_at.gte = new Date(startDate);
      }
      if (endDate) {
        whereClause.scheduled_at.lte = new Date(endDate);
      }
    }

    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { agenda: { contains: search, mode: 'insensitive' } },
      ];
    }

    const meetings = await prisma.meeting.findMany({
      where: whereClause,
      orderBy: { scheduled_at: 'desc' },
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

    return NextResponse.json(meetings);
  } catch (error) {
    console.error('GET meetings API error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while retrieving meetings.' },
      { status: 500 }
    );
  }
}

// POST /api/meetings - create meeting
export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const body = await req.json();
    const { title, description, agenda, scheduled_at, duration, attendeeIds, venture_id } = body;

    if (!title || !scheduled_at || !duration) {
      return NextResponse.json(
        { error: 'Title, scheduled_at, and duration are required.' },
        { status: 400 }
      );
    }

    // Generate Google Meet link
    const googleMeetData = await createMeetingWithGoogleMeet(
      {
        title,
        description,
        scheduled_at: new Date(scheduled_at),
        duration: parseInt(duration, 10),
      },
      user.id
    );

    // Create meeting in database
    const meeting = await prisma.meeting.create({
      data: {
        title,
        description,
        agenda,
        scheduled_at: new Date(scheduled_at),
        duration: parseInt(duration, 10),
        google_meet_link: googleMeetData.google_meet_link,
        google_calendar_event_id: googleMeetData.google_calendar_event_id,
        venture_id: venture_id || null,
        created_by: user.id,
        attendees: {
          create: (attendeeIds || []).map((id: string) => ({
            user: { connect: { id } },
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

    // Broadcast update via socket
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const io = (globalThis as any).io;
    if (io) {
      io.emit('meetings:update', { action: 'create', meetingId: meeting.id });
    }

    return NextResponse.json(meeting, { status: 201 });
  } catch (error) {
    console.error('POST meetings API error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while creating the meeting.' },
      { status: 500 }
    );
  }
}
