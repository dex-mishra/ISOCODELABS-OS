import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { ContentStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = requireAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const body = await req.json();
    const { publish_date } = body;

    if (!publish_date) {
      return NextResponse.json({ error: 'Publish date is required to schedule.' }, { status: 400 });
    }

    const contentItem = await prisma.contentItem.findUnique({
      where: { id: params.id },
    });

    if (!contentItem) {
      return NextResponse.json({ error: 'Content item not found.' }, { status: 404 });
    }

    // CRITICAL RULE: "API returns 400 if trying to schedule content with empty body"
    const cleanedBody = contentItem.body?.trim();
    if (!cleanedBody) {
      return NextResponse.json({ error: 'Cannot schedule content with an empty body.' }, { status: 400 });
    }

    const updatedItem = await prisma.contentItem.update({
      where: { id: params.id },
      data: {
        publish_date: new Date(publish_date),
        status: ContentStatus.SCHEDULED,
      },
      include: {
        product: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true, avatar_url: true } },
      },
    });

    // Real-time update
    const io = (globalThis as { io?: { emit: (event: string, data: unknown) => void } }).io;
    if (io) {
      io.emit('content:update', { action: 'schedule', contentId: updatedItem.id });
    }

    return NextResponse.json(updatedItem);
  } catch (error) {
    console.error('PATCH schedule content error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
