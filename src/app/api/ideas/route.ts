import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { Prisma, IdeaCategory, IdeaStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

// GET /api/ideas
export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const impact = searchParams.get('impact');
    const effort = searchParams.get('effort');
    const search = searchParams.get('search');
    const sort = searchParams.get('sort') || 'newest';

    const where: Prisma.IdeaWhereInput = {
      is_deleted: false,
    };

    if (category && category !== 'ALL') {
      where.category = category as IdeaCategory;
    }
    if (status && status !== 'ALL') {
      where.status = status as IdeaStatus;
    }
    if (impact) {
      where.impact = parseInt(impact, 10);
    }
    if (effort) {
      where.effort = parseInt(effort, 10);
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Fetch ideas with validations
    let ideas = await prisma.idea.findMany({
      where,
      include: {
        creator: { select: { id: true, name: true, avatar_url: true } },
        validations: {
          orderBy: { created_at: 'desc' },
          take: 1,
        },
      },
      orderBy: { created_at: 'desc' },
    });

    // In-memory sorting for complex order fields
    if (sort === 'highest_confidence') {
      ideas = ideas.sort((a, b) => {
        const confA = a.validations?.[0]?.confidence ?? -1;
        const confB = b.validations?.[0]?.confidence ?? -1;
        return confB - confA;
      });
    } else if (sort === 'highest_impact') {
      ideas = ideas.sort((a, b) => b.impact - a.impact);
    } else if (sort === 'lowest_effort') {
      ideas = ideas.sort((a, b) => a.effort - b.effort);
    }

    return NextResponse.json(ideas);
  } catch (error) {
    console.error('GET ideas list error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}

// POST /api/ideas
export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const body = await req.json();
    const { title, description, category, impact, effort, tags, chat_message_ids } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required.' }, { status: 400 });
    }

    const newIdea = await prisma.idea.create({
      data: {
        title,
        description: description || null,
        category: (category as IdeaCategory) || IdeaCategory.PRODUCT,
        impact: impact !== undefined ? parseInt(impact, 10) : 5,
        effort: effort !== undefined ? parseInt(effort, 10) : 5,
        tags: Array.isArray(tags) ? tags : [],
        created_by: user.id,
      },
      include: {
        creator: { select: { id: true, name: true, avatar_url: true } },
        validations: true,
      },
    });

    // Link chat messages to the newly created idea
    if (chat_message_ids && Array.isArray(chat_message_ids) && chat_message_ids.length > 0) {
      await prisma.chatMessage.updateMany({
        where: {
          id: { in: chat_message_ids },
        },
        data: {
          context_id: newIdea.id,
        },
      });
    }

    // Broadcast change
    const io = (globalThis as unknown as { io?: { emit: (event: string, data: unknown) => void } }).io;
    if (io) {
      io.emit('ideas:update', { action: 'create', ideaId: newIdea.id });
    }

    return NextResponse.json(newIdea, { status: 201 });
  } catch (error) {
    console.error('POST create idea error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
