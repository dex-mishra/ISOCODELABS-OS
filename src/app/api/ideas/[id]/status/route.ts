import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { IdeaStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

// PATCH /api/ideas/[id]/status
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = requireAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const body = await req.json();
    const { status } = body;

    if (!status || !Object.values(IdeaStatus).includes(status as IdeaStatus)) {
      return NextResponse.json({ error: 'Valid status is required.' }, { status: 400 });
    }

    const existingIdea = await prisma.idea.findUnique({
      where: { id: params.id },
    });

    if (!existingIdea || existingIdea.is_deleted) {
      return NextResponse.json({ error: 'Idea not found.' }, { status: 404 });
    }

    const updatedIdea = await prisma.idea.update({
      where: { id: params.id },
      data: { status: status as IdeaStatus },
    });

    // Broadcast change
    const io = (globalThis as unknown as { io?: { emit: (event: string, data: unknown) => void } }).io;
    if (io) {
      io.emit('ideas:update', { action: 'status', ideaId: updatedIdea.id, status: updatedIdea.status });
    }

    return NextResponse.json(updatedIdea);
  } catch (error) {
    console.error('PATCH idea status error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
