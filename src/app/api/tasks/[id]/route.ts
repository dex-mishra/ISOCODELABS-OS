import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { TaskStatus, TaskPriority } from '@prisma/client';

export const dynamic = 'force-dynamic';

// GET /api/tasks/[id] - single task details
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = requireAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { id } = params;

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        assignee: {
          select: { id: true, name: true, email: true, avatar_url: true },
        },
        project: {
          select: { id: true, name: true },
        },
        meeting: {
          select: { id: true, title: true },
        },
        sub_tasks: {
          orderBy: { created_at: 'asc' },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found.' }, { status: 404 });
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error('GET task by ID error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while retrieving the task.' },
      { status: 500 }
    );
  }
}

// PUT /api/tasks/[id] - update task fields
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = requireAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { id } = params;
    const body = await req.json();
    const { title, description, status, priority, assignee_id, due_date, meeting_id, project_id, tags, subTasks, comments, activities } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required.' }, { status: 400 });
    }

    const existingTask = await prisma.task.findUnique({
      where: { id },
      select: { assignee_id: true }
    });

    // Update task and sub_tasks in a transaction
    const task = await prisma.$transaction(async (tx) => {
      // 1. Update task fields
      await tx.task.update({
        where: { id },
        data: {
          title,
          description,
          status: status as TaskStatus,
          priority: priority as TaskPriority,
          assignee_id: assignee_id || null,
          due_date: due_date ? new Date(due_date) : null,
          meeting_id: meeting_id || null,
          project_id: project_id || null,
          tags: tags || [],
          comments: comments || undefined,
          activities: activities || undefined,
        },
        include: {
          assignee: {
            select: { id: true, name: true, email: true, avatar_url: true },
          },
          project: {
            select: { id: true, name: true },
          },
          meeting: {
            select: { id: true, title: true },
          },
          sub_tasks: true,
        },
      });

      // 2. Sync sub-tasks if provided in the body
      if (Array.isArray(subTasks)) {
        // Delete existing ones not in the input array (by id)
        const incomingIds = subTasks.filter((st) => st.id).map((st) => st.id);
        await tx.subTask.deleteMany({
          where: {
            task_id: id,
            id: { notIn: incomingIds },
          },
        });

        // Upsert sub-tasks
        for (const st of subTasks) {
          if (st.id) {
            await tx.subTask.update({
              where: { id: st.id },
              data: {
                title: st.title,
                is_completed: st.is_completed,
                assignee_id: st.assignee_id || null,
              },
            });
          } else {
            await tx.subTask.create({
              data: {
                task_id: id,
                title: st.title,
                is_completed: st.is_completed || false,
                assignee_id: st.assignee_id || null,
              },
            });
          }
        }
      }

      // Re-fetch the updated task with newly synced sub-tasks
      return tx.task.findUnique({
        where: { id },
        include: {
          assignee: {
            select: { id: true, name: true, email: true, avatar_url: true },
          },
          project: {
            select: { id: true, name: true },
          },
          meeting: {
            select: { id: true, title: true },
          },
          sub_tasks: {
            orderBy: { created_at: 'asc' },
          },
        },
      });
    });

    // Broadcast socket event
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const io = (globalThis as any).io;
    if (io) {
      io.emit('tasks:update', { action: 'update', taskId: id });
    }

    // Trigger notification if assigned to another user and assignee has changed
    if (task && assignee_id && assignee_id !== user.id && (!existingTask || existingTask.assignee_id !== assignee_id)) {
      try {
        const { createAndBroadcastNotification } = require('@/lib/realtime/notifications');
        await createAndBroadcastNotification(assignee_id, {
          title: 'Task Assigned',
          body: `You have been assigned the task: "${task.title}"`,
          type: 'TASK_ASSIGNED',
          link: `/tasks`,
        });
      } catch (err) {
        console.error('Failed to trigger task assignment notification:', err);
      }
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error('PUT task by ID error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while updating the task.' },
      { status: 500 }
    );
  }
}

// DELETE /api/tasks/[id] - hard delete
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = requireAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { id } = params;

    await prisma.task.delete({
      where: { id },
    });

    // Broadcast socket event
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const io = (globalThis as any).io;
    if (io) {
      io.emit('tasks:update', { action: 'delete', taskId: id });
    }

    return NextResponse.json({ message: 'Task deleted successfully.' });
  } catch (error) {
    console.error('DELETE task by ID error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while deleting the task.' },
      { status: 500 }
    );
  }
}
