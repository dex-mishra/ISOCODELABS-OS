import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { ContentType, ContentStatus, Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

// GET /api/content - list content items with filters
export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const platform = searchParams.get('platform');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const search = searchParams.get('search');

    const whereClause: Prisma.ContentItemWhereInput = {};

    if (type) {
      whereClause.type = type as ContentType;
    }
    if (status) {
      whereClause.status = status as ContentStatus;
    }
    if (platform) {
      whereClause.platforms = { has: platform };
    }
    if (startDate || endDate) {
      whereClause.publish_date = {};
      if (startDate) {
        whereClause.publish_date.gte = new Date(startDate);
      }
      if (endDate) {
        whereClause.publish_date.lte = new Date(endDate);
      }
    }
    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { body: { contains: search, mode: 'insensitive' } },
        { tags: { has: search } },
      ];
    }

    const contentItems = await prisma.contentItem.findMany({
      where: whereClause,
      include: {
        product: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true, avatar_url: true } },
      },
      orderBy: [
        { publish_date: 'asc' },
        { created_at: 'desc' },
      ],
    });

    return NextResponse.json(contentItems);
  } catch (error) {
    console.error('GET content items error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}

// POST /api/content - create a content item
export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const body = await req.json();
    const { title, type, status, product_id, platforms, tags, publish_date, body: bodyText, chat_message_ids } = body;

    if (!title || !type) {
      return NextResponse.json({ error: 'Title and Type are required.' }, { status: 400 });
    }

    const contentItem = await prisma.contentItem.create({
      data: {
        title,
        type: type as ContentType,
        status: (status as ContentStatus) || ContentStatus.IDEA,
        body: bodyText || '',
        product_id: product_id || null,
        platforms: platforms || [],
        tags: tags || [],
        publish_date: publish_date ? new Date(publish_date) : null,
        created_by: user.id,
      },
      include: {
        product: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true, avatar_url: true } },
      },
    });

    // Link chat messages to the newly created content item
    if (chat_message_ids && Array.isArray(chat_message_ids) && chat_message_ids.length > 0) {
      await prisma.chatMessage.updateMany({
        where: {
          id: { in: chat_message_ids },
        },
        data: {
          context_id: contentItem.id,
        },
      });
    }

    // Real-time notification
    const io = (globalThis as { io?: { emit: (event: string, data: unknown) => void } }).io;
    if (io) {
      io.emit('content:update', { action: 'create', contentId: contentItem.id });
    }

    return NextResponse.json(contentItem, { status: 201 });
  } catch (error) {
    console.error('POST content item error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
