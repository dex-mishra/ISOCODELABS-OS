import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { summarizeResource } from '@/lib/ai/explore-ai';
import { ExploreResourceType } from '@prisma/client';

export const dynamic = 'force-dynamic';

// GET /api/explore — list explore resources
export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') as ExploreResourceType | null;
    const topic = searchParams.get('topic');
    const industryId = searchParams.get('industry_id');
    const isRead = searchParams.get('is_read');
    const search = searchParams.get('search');
    const bookmarked = searchParams.get('bookmarked') === 'true';
    const tag = searchParams.get('tag');

    // Build query filters
    const where: any = {};

    if (type) {
      where.type = type;
    }
    if (topic) {
      where.topic = topic;
    }
    if (industryId) {
      where.industry_id = industryId;
    }
    if (isRead !== null && isRead !== undefined && isRead !== '') {
      where.is_read = isRead === 'true';
    }
    if (tag) {
      where.tags = { has: tag };
    }
    if (bookmarked) {
      where.bookmarks = {
        some: {
          user_id: user.id,
        },
      };
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
        { topic: { contains: search, mode: 'insensitive' } },
        { tags: { hasSome: [search] } },
      ];
    }

    const resources = await prisma.exploreResource.findMany({
      where,
      include: {
        industry: { select: { id: true, name: true, icon: true, color: true } },
        bookmarks: {
          where: { user_id: user.id },
          select: { id: true, note: true, highlight_text: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return NextResponse.json(resources);
  } catch (error) {
    console.error('GET /api/explore error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}

// POST /api/explore — create a new resource and trigger Vertex AI summary
export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const body = await req.json();
    const { title, url, content, type, topic, industry_id, tags: inputTags } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required.' }, { status: 400 });
    }

    const resourceType = type || ExploreResourceType.ARTICLE;

    // Trigger AI summarizer and tag generator
    let aiSummary = '';
    let aiKeyPoints: string[] = [];
    let tags: string[] = inputTags || [];

    try {
      // Summarize using Vertex AI helper
      const summaryResult = await summarizeResource(title, content || title, url || undefined);
      aiSummary = summaryResult.summary;
      aiKeyPoints = summaryResult.key_points;
      if (!inputTags || inputTags.length === 0) {
        tags = summaryResult.tags;
      }
    } catch (aiErr) {
      console.error('Vertex AI summarization failed:', aiErr);
      // fallback in case of errors
      aiSummary = `Summary of "${title}": A resource covering key strategies and execution principles.`;
      aiKeyPoints = [`Key takeaways from "${title}".`];
      if (tags.length === 0) tags = ['General'];
    }

    const resource = await prisma.exploreResource.create({
      data: {
        title,
        url: url || null,
        content: content || null,
        type: resourceType,
        topic: topic || 'General',
        industry_id: industry_id || null,
        ai_summary: aiSummary,
        ai_key_points: aiKeyPoints,
        tags: tags,
        is_read: false,
      },
      include: {
        industry: { select: { id: true, name: true, icon: true, color: true } },
        bookmarks: {
          where: { user_id: user.id },
        },
      },
    });

    // Emit socket update
    const io = (globalThis as any).io;
    if (io) {
      io.emit('explore:update', { action: 'create', resourceId: resource.id });
    }

    // Trigger notification
    try {
      const { createAndBroadcastNotification } = require('@/lib/realtime/notifications');
      const allUsers = await prisma.user.findMany();
      for (const u of allUsers) {
        await createAndBroadcastNotification(u.id, {
          title: 'New Explore Resource',
          body: `New resource: "${resource.title}" has been added to Explore.`,
          type: 'EXPLORE',
          link: '/explore'
        });
      }
    } catch (notificationErr) {
      console.error('Failed to trigger explore notification:', notificationErr);
    }

    return NextResponse.json(resource, { status: 201 });
  } catch (error) {
    console.error('POST /api/explore error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}

