import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { ContentType, ContentStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

// GET /api/content/[id]
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = requireAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const contentItem = await prisma.contentItem.findUnique({
      where: { id: params.id },
      include: {
        product: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true, avatar_url: true } },
      },
    });

    if (!contentItem) {
      return NextResponse.json({ error: 'Content item not found.' }, { status: 404 });
    }

    return NextResponse.json(contentItem);
  } catch (error) {
    console.error('GET content item detail error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}

// PUT /api/content/[id]
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = requireAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const body = await req.json();
    const { title, body: bodyText, type, status, product_id, platforms, tags, publish_date } = body;

    const existingItem = await prisma.contentItem.findUnique({
      where: { id: params.id },
    });

    if (!existingItem) {
      return NextResponse.json({ error: 'Content item not found.' }, { status: 404 });
    }

    const updatedItem = await prisma.contentItem.update({
      where: { id: params.id },
      data: {
        ...(title !== undefined && { title }),
        ...(bodyText !== undefined && { body: bodyText }),
        ...(type !== undefined && { type: type as ContentType }),
        ...(status !== undefined && { status: status as ContentStatus }),
        ...(product_id !== undefined && { product_id: product_id || null }),
        ...(platforms !== undefined && { platforms }),
        ...(tags !== undefined && { tags }),
        ...(publish_date !== undefined && { publish_date: publish_date ? new Date(publish_date) : null }),
      },
      include: {
        product: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true, avatar_url: true } },
      },
    });

    // Real-time update
    const io = (globalThis as { io?: { emit: (event: string, data: unknown) => void } }).io;
    if (io) {
      io.emit('content:update', { action: 'update', contentId: updatedItem.id });
    }

    return NextResponse.json(updatedItem);
  } catch (error) {
    console.error('PUT content item error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}

// DELETE /api/content/[id]
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = requireAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const existingItem = await prisma.contentItem.findUnique({
      where: { id: params.id },
    });

    if (!existingItem) {
      return NextResponse.json({ error: 'Content item not found.' }, { status: 404 });
    }

    await prisma.contentItem.delete({
      where: { id: params.id },
    });

    // Real-time update
    const io = (globalThis as { io?: { emit: (event: string, data: unknown) => void } }).io;
    if (io) {
      io.emit('content:update', { action: 'delete', contentId: params.id });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE content item error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
