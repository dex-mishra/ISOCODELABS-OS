import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { ContentType, ContentIdeaStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

// GET /api/content/ideas/[id]
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = requireAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const idea = await prisma.contentIdea.findUnique({
      where: { id: params.id },
      include: {
        creator: { select: { id: true, name: true, avatar_url: true } },
        validations: {
          orderBy: { created_at: 'desc' },
        },
        outlines: {
          orderBy: { created_at: 'desc' },
        },
      },
    });

    if (!idea) {
      return NextResponse.json({ error: 'Content idea not found.' }, { status: 404 });
    }

    return NextResponse.json(idea);
  } catch (error) {
    console.error('GET content idea detail error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}

// PUT /api/content/ideas/[id]
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = requireAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const body = await req.json();
    const { title, description, content_type, target_audience, tags, status } = body;

    const existingIdea = await prisma.contentIdea.findUnique({
      where: { id: params.id },
    });

    if (!existingIdea) {
      return NextResponse.json({ error: 'Content idea not found.' }, { status: 404 });
    }

    const updatedIdea = await prisma.contentIdea.update({
      where: { id: params.id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(content_type !== undefined && { content_type: content_type as ContentType }),
        ...(target_audience !== undefined && { target_audience }),
        ...(tags !== undefined && { tags }),
        ...(status !== undefined && { status: status as ContentIdeaStatus }),
      },
      include: {
        creator: { select: { id: true, name: true, avatar_url: true } },
        validations: { orderBy: { created_at: 'desc' } },
        outlines: { orderBy: { created_at: 'desc' } },
      },
    });

    // Real-time update
    const io = (globalThis as { io?: { emit: (event: string, data: unknown) => void } }).io;
    if (io) {
      io.emit('ideas:update', { action: 'update', ideaId: updatedIdea.id });
    }

    return NextResponse.json(updatedIdea);
  } catch (error) {
    console.error('PUT content idea error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}

// DELETE /api/content/ideas/[id]
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = requireAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const existingIdea = await prisma.contentIdea.findUnique({
      where: { id: params.id },
    });

    if (!existingIdea) {
      return NextResponse.json({ error: 'Content idea not found.' }, { status: 404 });
    }

    await prisma.contentIdea.delete({
      where: { id: params.id },
    });

    // Real-time update
    const io = (globalThis as { io?: { emit: (event: string, data: unknown) => void } }).io;
    if (io) {
      io.emit('ideas:update', { action: 'delete', ideaId: params.id });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE content idea error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
