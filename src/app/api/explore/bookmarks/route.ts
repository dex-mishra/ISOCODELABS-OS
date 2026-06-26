import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

// GET /api/explore/bookmarks — list user bookmarks
export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const bookmarks = await prisma.exploreBookmark.findMany({
      where: { user_id: user.id },
      include: {
        resource: {
          select: { id: true, title: true, topic: true, type: true, tags: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return NextResponse.json(bookmarks);
  } catch (error) {
    console.error('GET /api/explore/bookmarks error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}

// POST /api/explore/bookmarks — create or update a bookmark
export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const body = await req.json();
    const { id, resource_id, highlight_text, note } = body;

    if (!resource_id) {
      return NextResponse.json({ error: 'resource_id is required.' }, { status: 400 });
    }

    let bookmark;

    if (id) {
      // Update existing bookmark
      bookmark = await prisma.exploreBookmark.update({
        where: { id, user_id: user.id },
        data: {
          highlight_text: highlight_text !== undefined ? highlight_text : null,
          note: note !== undefined ? note : null,
        },
        include: {
          resource: {
            select: { id: true, title: true, topic: true, type: true, tags: true },
          },
        },
      });
    } else {
      // Create new bookmark
      bookmark = await prisma.exploreBookmark.create({
        data: {
          resource_id,
          user_id: user.id,
          highlight_text: highlight_text || null,
          note: note || null,
        },
        include: {
          resource: {
            select: { id: true, title: true, topic: true, type: true, tags: true },
          },
        },
      });
    }

    // Emit socket update
    const io = (globalThis as any).io;
    if (io) {
      io.emit('explore:update', { action: 'bookmark_change', resourceId: resource_id });
    }

    return NextResponse.json(bookmark, { status: id ? 200 : 201 });
  } catch (error) {
    console.error('POST /api/explore/bookmarks error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
