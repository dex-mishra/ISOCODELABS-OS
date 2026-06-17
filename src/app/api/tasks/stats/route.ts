import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const now = new Date();

    // Counts by status
    const statusCounts = await prisma.task.groupBy({
      by: ['status'],
      _count: {
        id: true,
      },
    });

    const counts = {
      TODO: 0,
      IN_PROGRESS: 0,
      IN_REVIEW: 0,
      DONE: 0,
    };

    statusCounts.forEach((group) => {
      if (group.status in counts) {
        counts[group.status as keyof typeof counts] = group._count.id;
      }
    });

    // Overdue counts
    const overdueCount = await prisma.task.count({
      where: {
        due_date: {
          lt: now,
        },
        status: {
          not: 'DONE',
        },
      },
    });

    // Per-assignee breakdown
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        avatar_url: true,
        assigned_tasks: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    const assigneeBreakdown = users.map((u) => {
      const taskCounts = {
        total: u.assigned_tasks.length,
        TODO: u.assigned_tasks.filter((t) => t.status === 'TODO').length,
        IN_PROGRESS: u.assigned_tasks.filter((t) => t.status === 'IN_PROGRESS').length,
        IN_REVIEW: u.assigned_tasks.filter((t) => t.status === 'IN_REVIEW').length,
        DONE: u.assigned_tasks.filter((t) => t.status === 'DONE').length,
      };

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        avatar_url: u.avatar_url,
        counts: taskCounts,
      };
    });

    // Add "Unassigned" breakdown
    const unassignedTasks = await prisma.task.findMany({
      where: {
        assignee_id: null,
      },
      select: {
        status: true,
      },
    });

    const unassignedCounts = {
      total: unassignedTasks.length,
      TODO: unassignedTasks.filter((t) => t.status === 'TODO').length,
      IN_PROGRESS: unassignedTasks.filter((t) => t.status === 'IN_PROGRESS').length,
      IN_REVIEW: unassignedTasks.filter((t) => t.status === 'IN_REVIEW').length,
      DONE: unassignedTasks.filter((t) => t.status === 'DONE').length,
    };

    assigneeBreakdown.push({
      id: 'unassigned',
      name: 'Unassigned',
      email: '',
      avatar_url: null,
      counts: unassignedCounts,
    });

    return NextResponse.json({
      counts,
      overdueCount,
      assigneeBreakdown,
    });
  } catch (error) {
    console.error('GET task stats error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while calculating task statistics.' },
      { status: 500 }
    );
  }
}
