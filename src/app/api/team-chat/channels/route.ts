import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

// GET /api/team-chat/channels - list channels the user is a member of
export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const channels = await prisma.teamChannel.findMany({
      where: {
        members: {
          some: {
            user_id: user.id,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
      include: {
        _count: {
          select: { members: true },
        },
      },
    });

    const result = channels.map((channel) => ({
      id: channel.id,
      name: channel.name,
      created_by: channel.created_by,
      created_at: channel.created_at,
      updated_at: channel.updated_at,
      memberCount: channel._count.members,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('GET /api/team-chat/channels error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while retrieving channels.' },
      { status: 500 }
    );
  }
}

// POST /api/team-chat/channels - create a new channel
export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const body = await req.json();
    const rawName = body.name;

    // Validate: name must be a string
    if (typeof rawName !== 'string') {
      return NextResponse.json(
        { error: 'Channel name is required.' },
        { status: 400 }
      );
    }

    // Trim whitespace
    const name = rawName.trim();

    // Reject empty/whitespace-only names
    if (name.length === 0) {
      return NextResponse.json(
        { error: 'Channel name is required.' },
        { status: 400 }
      );
    }

    // Reject names longer than 50 characters
    if (name.length > 50) {
      return NextResponse.json(
        { error: 'Channel name must be 50 characters or less.' },
        { status: 400 }
      );
    }

    // Check for duplicate name (case-insensitive)
    const existing = await prisma.teamChannel.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'A channel with this name already exists.' },
        { status: 409 }
      );
    }

    // Get all users (both founders) to add as members
    const allUsers = await prisma.user.findMany({
      select: { id: true },
    });

    // Create channel and add all users as members in a transaction
    const channel = await prisma.$transaction(async (tx) => {
      const newChannel = await tx.teamChannel.create({
        data: {
          name,
          created_by: user.id,
        },
      });

      // Create ChannelMember records for all users
      await tx.channelMember.createMany({
        data: allUsers.map((u) => ({
          channel_id: newChannel.id,
          user_id: u.id,
        })),
      });

      // Return the channel with members included
      return tx.teamChannel.findUnique({
        where: { id: newChannel.id },
        include: {
          members: {
            include: {
              user: {
                select: { id: true, name: true, avatar_url: true },
              },
            },
          },
          _count: {
            select: { members: true },
          },
        },
      });
    });

    return NextResponse.json(channel, { status: 201 });
  } catch (error) {
    console.error('POST /api/team-chat/channels error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while creating the channel.' },
      { status: 500 }
    );
  }
}
