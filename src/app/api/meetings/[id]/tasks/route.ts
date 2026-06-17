import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = requireAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { id } = params;
    const body = await req.json();
    const { title, description, priority, assigneeId, due_date } = body;

    if (!title) {
      return NextResponse.json({ error: 'Task title is required.' }, { status: 400 });
    }

    const task = await prisma.task.create({
      data: {
        title,
        description: description || '',
        priority: priority || 'MEDIUM',
        status: 'TODO',
        due_date: due_date ? new Date(due_date) : null,
        meeting_id: id,
        created_by: user.id,
        assignee_id: assigneeId || null,
      },
      include: {
        assignee: {
          select: { id: true, name: true, email: true, avatar_url: true },
        },
      },
    });

    // Broadcast tasks update
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const io = (globalThis as any).io;
    if (io) {
      io.emit('tasks:update', { action: 'create', taskId: task.id, meetingId: id });
    }

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error('POST /api/meetings/[id]/tasks error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while creating the task.' },
      { status: 500 }
    );
  }
}
