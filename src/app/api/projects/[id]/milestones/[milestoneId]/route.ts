import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { MilestoneStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

// PUT /api/projects/[id]/milestones/[milestoneId] - update milestone
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; milestoneId: string } }
) {
  try {
    const user = requireAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { id, milestoneId } = params;
    const body = await req.json();
    const { title, description, due_date, status } = body;

    if (!title) {
      return NextResponse.json({ error: 'Milestone title is required.' }, { status: 400 });
    }

    const milestone = await prisma.milestone.update({
      where: { id: milestoneId },
      data: {
        title,
        description,
        due_date: due_date ? new Date(due_date) : null,
        status: status as MilestoneStatus,
      },
    });

    // Broadcast WebSocket update
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const io = (globalThis as any).io;
    if (io) {
      io.emit('projects:update', { action: 'update', projectId: id });
    }

    return NextResponse.json(milestone);
  } catch (error) {
    console.error('PUT project milestone error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while updating the milestone.' },
      { status: 500 }
    );
  }
}
