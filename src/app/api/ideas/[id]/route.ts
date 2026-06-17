import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { IdeaCategory } from '@prisma/client';

export const dynamic = 'force-dynamic';

// GET /api/ideas/[id]
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = requireAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const idea = await prisma.idea.findUnique({
      where: { id: params.id },
      include: {
        creator: { select: { id: true, name: true, avatar_url: true } },
        validations: {
          orderBy: { created_at: 'desc' },
        },
      },
    });

    if (!idea || idea.is_deleted) {
      return NextResponse.json({ error: 'Idea not found.' }, { status: 404 });
    }

    return NextResponse.json(idea);
  } catch (error) {
    console.error('GET idea detail error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}

// PUT /api/ideas/[id]
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = requireAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const body = await req.json();
    const { title, description, category, impact, effort, tags, status } = body;

    const existingIdea = await prisma.idea.findUnique({
      where: { id: params.id },
    });

    if (!existingIdea || existingIdea.is_deleted) {
      return NextResponse.json({ error: 'Idea not found.' }, { status: 404 });
    }

    const updatedIdea = await prisma.idea.update({
      where: { id: params.id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(category !== undefined && { category: category as IdeaCategory }),
        ...(impact !== undefined && { impact: parseInt(impact, 10) }),
        ...(effort !== undefined && { effort: parseInt(effort, 10) }),
        ...(tags !== undefined && { tags }),
        ...(status !== undefined && { status }),
      },
      include: {
        creator: { select: { id: true, name: true, avatar_url: true } },
        validations: {
          orderBy: { created_at: 'desc' },
        },
      },
    });

    // Broadcast change
    const io = (globalThis as unknown as { io?: { emit: (event: string, data: unknown) => void } }).io;
    if (io) {
      io.emit('ideas:update', { action: 'update', ideaId: updatedIdea.id });
    }

    return NextResponse.json(updatedIdea);
  } catch (error) {
    console.error('PUT update idea error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}

// DELETE /api/ideas/[id]
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = requireAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const existingIdea = await prisma.idea.findUnique({
      where: { id: params.id },
    });

    if (!existingIdea || existingIdea.is_deleted) {
      return NextResponse.json({ error: 'Idea not found.' }, { status: 404 });
    }

    // Soft delete
    await prisma.idea.update({
      where: { id: params.id },
      data: { is_deleted: true },
    });

    // Broadcast change
    const io = (globalThis as unknown as { io?: { emit: (event: string, data: unknown) => void } }).io;
    if (io) {
      io.emit('ideas:update', { action: 'delete', ideaId: params.id });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE idea error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
