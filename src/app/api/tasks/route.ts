import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { Prisma, TaskStatus, TaskPriority } from '@prisma/client';

export const dynamic = 'force-dynamic';

// GET /api/tasks - list with filters
export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const assigneeId = searchParams.get('assigneeId');
    const projectId = searchParams.get('projectId');
    const meetingId = searchParams.get('meetingId');
    const ventureId = searchParams.get('venture_id');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const search = searchParams.get('search');

    const whereClause: Prisma.TaskWhereInput = {};

    if (status) {
      whereClause.status = status as TaskStatus;
    }
    if (priority) {
      whereClause.priority = priority as TaskPriority;
    }
    if (assigneeId) {
      if (assigneeId === 'unassigned') {
        whereClause.assignee_id = null;
      } else {
        whereClause.assignee_id = assigneeId;
      }
    }
    if (projectId) {
      if (projectId === 'none') {
        whereClause.project_id = null;
      } else {
        whereClause.project_id = projectId;
      }
    }
    if (meetingId) {
      if (meetingId === 'none') {
        whereClause.meeting_id = null;
      } else {
        whereClause.meeting_id = meetingId;
      }
    }
    if (ventureId) {
      whereClause.venture_id = ventureId;
    }

    if (startDate || endDate) {
      whereClause.due_date = {};
      if (startDate) {
        whereClause.due_date.gte = new Date(startDate);
      }
      if (endDate) {
        whereClause.due_date.lte = new Date(endDate);
      }
    }

    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const tasks = await prisma.task.findMany({
      where: whereClause,
      orderBy: { created_at: 'desc' },
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

    return NextResponse.json(tasks);
  } catch (error) {
    console.error('GET tasks API error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while retrieving tasks.' },
      { status: 500 }
    );
  }
}

// POST /api/tasks - create task
export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const body = await req.json();
    const { title, description, status, priority, assignee_id, due_date, meeting_id, project_id, venture_id, tags } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required.' }, { status: 400 });
    }

    const task = await prisma.task.create({
      data: {
        title,
        description,
        status: (status as TaskStatus) || 'TODO',
        priority: (priority as TaskPriority) || 'MEDIUM',
        assignee_id: assignee_id || null,
        due_date: due_date ? new Date(due_date) : null,
        meeting_id: meeting_id || null,
        project_id: project_id || null,
        venture_id: venture_id || null,
        tags: tags || [],
        created_by: user.id,
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

    // Broadcast socket event
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const io = (globalThis as any).io;
    if (io) {
      io.emit('tasks:update', { action: 'create', taskId: task.id });
    }

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error('POST tasks API error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while creating the task.' },
      { status: 500 }
    );
  }
}
