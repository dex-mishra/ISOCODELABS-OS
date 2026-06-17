import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { ContentType, ContentIdeaStatus, Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

// GET /api/content/ideas
export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const contentType = searchParams.get('content_type');
    const search = searchParams.get('search');

    const whereClause: Prisma.ContentIdeaWhereInput = {};

    if (status) {
      whereClause.status = status as ContentIdeaStatus;
    }
    if (contentType) {
      whereClause.content_type = contentType as ContentType;
    }
    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { target_audience: { contains: search, mode: 'insensitive' } },
        { tags: { has: search } },
      ];
    }

    const ideas = await prisma.contentIdea.findMany({
      where: whereClause,
      include: {
        creator: { select: { id: true, name: true, avatar_url: true } },
        validations: {
          orderBy: { created_at: 'desc' },
          take: 1,
        },
        outlines: {
          orderBy: { created_at: 'desc' },
          take: 1,
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return NextResponse.json(ideas);
  } catch (error) {
    console.error('GET content ideas error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}

// POST /api/content/ideas
export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const body = await req.json();
    const { title, description, content_type, target_audience, tags } = body;

    if (!title || !content_type) {
      return NextResponse.json({ error: 'Title and Content Type are required.' }, { status: 400 });
    }

    const idea = await prisma.contentIdea.create({
      data: {
        title,
        description: description || '',
        content_type: content_type as ContentType,
        target_audience: target_audience || 'General public',
        status: ContentIdeaStatus.RAW,
        tags: tags || [],
        created_by: user.id,
      },
      include: {
        creator: { select: { id: true, name: true, avatar_url: true } },
        validations: true,
        outlines: true,
      },
    });

    // Real-time update
    const io = (globalThis as { io?: { emit: (event: string, data: unknown) => void } }).io;
    if (io) {
      io.emit('ideas:update', { action: 'create', ideaId: idea.id });
    }

    return NextResponse.json(idea, { status: 201 });
  } catch (error) {
    console.error('POST content idea error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
