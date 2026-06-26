import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 50;
const MAX_CONTENT_LENGTH = 5000;
const MAX_IMAGES = 4;

// GET /api/team-chat/channels/[id]/messages - paginated messages for a channel
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = requireAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const channelId = params.id;

    // Verify user is a member of the channel
    const membership = await prisma.channelMember.findUnique({
      where: {
        channel_id_user_id: {
          channel_id: channelId,
          user_id: user.id,
        },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: 'You are not a member of this channel.' },
        { status: 403 }
      );
    }

    // Parse cursor from query params
    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get('cursor');

    // Build the query: fetch messages older than cursor, ordered by created_at descending
    let messages;

    if (cursor) {
      // Get the cursor message's created_at to paginate
      const cursorMessage = await prisma.teamMessage.findUnique({
        where: { id: cursor },
        select: { created_at: true },
      });

      if (!cursorMessage) {
        return NextResponse.json(
          { error: 'Invalid cursor.' },
          { status: 400 }
        );
      }

      messages = await prisma.teamMessage.findMany({
        where: {
          channel_id: channelId,
          created_at: {
            lt: cursorMessage.created_at,
          },
        },
        orderBy: {
          created_at: 'desc',
        },
        take: PAGE_SIZE,
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              avatar_url: true,
            },
          },
        },
      });
    } else {
      // No cursor — fetch the most recent 50 messages
      messages = await prisma.teamMessage.findMany({
        where: {
          channel_id: channelId,
        },
        orderBy: {
          created_at: 'desc',
        },
        take: PAGE_SIZE,
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              avatar_url: true,
            },
          },
        },
      });
    }

    // Determine nextCursor and hasMore
    const hasMore = messages.length === PAGE_SIZE;
    const nextCursor = hasMore ? messages[messages.length - 1].id : null;

    return NextResponse.json({
      messages,
      nextCursor,
      hasMore,
    });
  } catch (error) {
    console.error('GET /api/team-chat/channels/[id]/messages error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while retrieving messages.' },
      { status: 500 }
    );
  }
}


// POST /api/team-chat/channels/[id]/messages - send a new message to a channel
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = requireAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const channelId = params.id;

    // Verify user is a member of the channel
    const membership = await prisma.channelMember.findUnique({
      where: {
        channel_id_user_id: {
          channel_id: channelId,
          user_id: user.id,
        },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: 'You are not a member of this channel.' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { content, images } = body;

    // Validate content: must be a string
    if (typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Message content is required.' },
        { status: 400 }
      );
    }

    // Reject empty or whitespace-only content
    if (content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message content cannot be empty.' },
        { status: 400 }
      );
    }

    // Reject content exceeding max length
    if (content.length > MAX_CONTENT_LENGTH) {
      return NextResponse.json(
        { error: `Message content must not exceed ${MAX_CONTENT_LENGTH} characters.` },
        { status: 400 }
      );
    }

    // Validate images: if present, must be an array with max 4 items
    if (images !== undefined) {
      if (!Array.isArray(images)) {
        return NextResponse.json(
          { error: 'Images must be an array.' },
          { status: 400 }
        );
      }

      if (images.length > MAX_IMAGES) {
        return NextResponse.json(
          { error: `A maximum of ${MAX_IMAGES} images are allowed per message.` },
          { status: 400 }
        );
      }
    }

    // Persist message to DB
    const message = await prisma.teamMessage.create({
      data: {
        channel_id: channelId,
        sender_id: user.id,
        content,
        images: images || [],
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatar_url: true,
          },
        },
      },
    });

    // Emit Socket.io event to the channel room
    const io = (globalThis as unknown as { io?: { to: (room: string) => { emit: (event: string, data: unknown) => void } } }).io;
    if (io) {
      io.to(`team-channel:${channelId}`).emit('team-chat:message', message);
    }

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    console.error('POST /api/team-chat/channels/[id]/messages error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while sending the message.' },
      { status: 500 }
    );
  }
}
