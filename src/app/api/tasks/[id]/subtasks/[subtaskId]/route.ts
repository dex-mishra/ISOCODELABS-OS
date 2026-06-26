import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { TaskPriority } from '@prisma/client';

export const dynamic = 'force-dynamic';

// PATCH /api/tasks/[id]/subtasks/[subtaskId] — toggle, rename, or convert
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; subtaskId: string } }
) {
  try {
    const user = requireAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const { id: task_id, subtaskId } = params;
    const body = await req.json();
    const { action, title, is_completed, assignee_id } = body;

    // Special action: convert subtask to a full Task
    if (action === 'convert') {
      const subtask = await prisma.subTask.findUnique({ where: { id: subtaskId } });
      if (!subtask) return NextResponse.json({ error: 'Subtask not found.' }, { status: 404 });

      // Get the parent task to copy some context
      const parentTask = await prisma.task.findUnique({
        where: { id: task_id },
        select: { project_id: true, assignee_id: true, priority: true },
      });

      // Create new full task
      const newTask = await prisma.task.create({
        data: {
          title: subtask.title,
          status: 'TODO',
          priority: (parentTask?.priority as TaskPriority) || 'MEDIUM',
          assignee_id: subtask.assignee_id || parentTask?.assignee_id || null,
          project_id: parentTask?.project_id || null,
          tags: [],
          created_by: user.id,
        },
      });

      // Delete the subtask
      await prisma.subTask.delete({ where: { id: subtaskId } });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const io = (globalThis as any).io;
      if (io) {
        io.emit('tasks:update', { action: 'convert_subtask', taskId: task_id, newTaskId: newTask.id });
      }

      return NextResponse.json({ converted: true, newTaskId: newTask.id });
    }

    // Regular update
    const updateData: {
      title?: string;
      is_completed?: boolean;
      assignee_id?: string | null;
    } = {};

    if (title !== undefined) updateData.title = title;
    if (is_completed !== undefined) updateData.is_completed = is_completed;
    if (assignee_id !== undefined) updateData.assignee_id = assignee_id || null;

    const updated = await prisma.subTask.update({
      where: { id: subtaskId },
      data: updateData,
      include: {
        assignee: { select: { id: true, name: true, avatar_url: true } },
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const io = (globalThis as any).io;
    if (io) io.emit('tasks:update', { action: 'subtask_update', taskId: task_id });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('PATCH subtask error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}

// DELETE /api/tasks/[id]/subtasks/[subtaskId] — delete single subtask
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; subtaskId: string } }
) {
  try {
    const user = requireAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const { id: task_id, subtaskId } = params;

    await prisma.subTask.delete({ where: { id: subtaskId } });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const io = (globalThis as any).io;
    if (io) io.emit('tasks:update', { action: 'subtask_delete', taskId: task_id });

    return NextResponse.json({ message: 'Subtask deleted.' });
  } catch (error) {
    console.error('DELETE subtask error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
