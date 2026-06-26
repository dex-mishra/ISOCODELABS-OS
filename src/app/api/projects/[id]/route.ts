import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { ProjectStatus } from '@prisma/client';
import { addProjectCompletionIncome } from '@/lib/money/auto-income';

export const dynamic = 'force-dynamic';

// GET /api/projects/[id] - get project details with milestones and tasks
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = requireAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { id } = params;

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        client: true,
        creator: {
          select: { id: true, name: true, email: true, avatar_url: true },
        },
        milestones: {
          orderBy: { due_date: 'asc' },
        },
        tasks: {
          orderBy: { created_at: 'desc' },
          include: {
            assignee: {
              select: { id: true, name: true, email: true, avatar_url: true },
            },
          },
        },
        transactions: {
          orderBy: { date: 'desc' },
        },
        invoices: {
          orderBy: { issue_date: 'desc' },
        },
        industry: {
          select: { id: true, name: true },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found.' }, { status: 404 });
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error('GET project by ID error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while retrieving the project.' },
      { status: 500 }
    );
  }
}

// PUT /api/projects/[id] - update project
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = requireAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { id } = params;
    const body = await req.json();
    const { name, description, client_id, status, start_date, end_date, budget, industry_id } = body;

    if (!name || !client_id) {
      return NextResponse.json(
        { error: 'Project name and client are required.' },
        { status: 400 }
      );
    }

    // Capture previous status to detect transition INTO completed
    const prev = await prisma.project.findUnique({
      where: { id },
      select: { status: true },
    });

    const project = await prisma.project.update({
      where: { id },
      data: {
        name,
        description,
        client_id,
        status: status as ProjectStatus,
        start_date: start_date ? new Date(start_date) : null,
        end_date: end_date ? new Date(end_date) : null,
        budget: budget ? parseFloat(budget) : null,
        industry_id: industry_id || null,
      },
      include: {
        client: {
          select: { id: true, name: true, company: true },
        },
        industry: {
          select: { id: true, name: true },
        },
      },
    });

    // Auto-add income when project transitions INTO completed
    let incomeAdded: number | null = null;
    if (status === 'COMPLETED' && prev?.status !== 'COMPLETED') {
      incomeAdded = await addProjectCompletionIncome(id);
      const io = (globalThis as { io?: { emit: (event: string, data: unknown) => void } }).io;
      if (io && incomeAdded) {
        io.emit('money:update', { action: 'income', source: 'project', amount: incomeAdded });
      }
    }

    // Broadcast WebSocket event
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const io = (globalThis as any).io;
    if (io) {
      io.emit('projects:update', { action: 'update', projectId: id });
    }

    return NextResponse.json({ ...project, incomeAdded });
  } catch (error) {
    console.error('PUT project by ID error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while updating the project.' },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id] - delete project
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = requireAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { id } = params;

    // Disconnect tasks and delete milestones/project in a transaction
    await prisma.$transaction(async (tx) => {
      // 1. Remove project association from tasks
      await tx.task.updateMany({
        where: { project_id: id },
        data: { project_id: null },
      });

      // 2. Delete milestones (already has cascade delete in schema, but being explicit is safer)
      await tx.milestone.deleteMany({
        where: { project_id: id },
      });

      // 3. Delete the project
      await tx.project.delete({
        where: { id },
      });
    });

    // Broadcast WebSocket event
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const io = (globalThis as any).io;
    if (io) {
      io.emit('projects:update', { action: 'delete', projectId: id });
      io.emit('tasks:update', { action: 'update' }); // Since some tasks lost project connection
    }

    return NextResponse.json({ message: 'Project deleted successfully.' });
  } catch (error) {
    console.error('DELETE project by ID error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while deleting the project.' },
      { status: 500 }
    );
  }
}
