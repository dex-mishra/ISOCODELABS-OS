import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

// GET /api/tasks/[id]/subtasks — list subtasks for a task
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = requireAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const { id } = params;

    const subtasks = await prisma.subTask.findMany({
      where: { task_id: id },
      include: {
        assignee: { select: { id: true, name: true, avatar_url: true } },
      },
      orderBy: [{ order: 'asc' }, { created_at: 'asc' }],
    });

    return NextResponse.json(subtasks);
  } catch (error) {
    console.error('GET subtasks error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}

// POST /api/tasks/[id]/subtasks — create a new subtask
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = requireAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const { id } = params;
    const body = await req.json();
    const { title, assignee_id } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: 'Title is required.' }, { status: 400 });
    }

    // Verify the parent task exists
    const task = await prisma.task.findUnique({ where: { id }, select: { id: true } });
    if (!task) return NextResponse.json({ error: 'Task not found.' }, { status: 404 });

    // Get the current max order for this task
    const maxOrder = await prisma.subTask.aggregate({
      where: { task_id: id },
      _max: { order: true },
    });
    const nextOrder = (maxOrder._max.order ?? -1) + 1;

    const subtask = await prisma.subTask.create({
      data: {
        task_id: id,
        title: title.trim(),
        is_completed: false,
        order: nextOrder,
        assignee_id: assignee_id || null,
      },
      include: {
        assignee: { select: { id: true, name: true, avatar_url: true } },
      },
    });

    // Broadcast
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const io = (globalThis as any).io;
    if (io) io.emit('tasks:update', { action: 'subtask_create', taskId: id });

    return NextResponse.json(subtask, { status: 201 });
  } catch (error) {
    console.error('POST subtask error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
