import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { ProjectStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

// GET /api/projects - list projects with basic info & milestone completion counts
export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const whereClause: Record<string, unknown> = {};
    if (status && status !== 'ALL') {
      whereClause.status = status as ProjectStatus;
    }
    if (searchParams.get('industry_id')) {
      whereClause.industry_id = searchParams.get('industry_id');
    }
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { client: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const projects = await prisma.project.findMany({
      where: whereClause,
      orderBy: { created_at: 'desc' },
      include: {
        client: {
          select: { id: true, name: true, company: true },
        },
        industry: {
          select: { id: true, name: true, icon: true, color: true },
        },
        milestones: {
          select: { id: true, status: true },
        },
      },
    });

    return NextResponse.json(projects);
  } catch (error) {
    console.error('GET projects error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while fetching projects.' },
      { status: 500 }
    );
  }
}

// POST /api/projects - create new project
export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const body = await req.json();
    const { name, description, client_id, status, start_date, end_date, budget, industry_id } = body;

    if (!name || !client_id) {
      return NextResponse.json(
        { error: 'Project name and client are required.' },
        { status: 400 }
      );
    }

    const project = await prisma.project.create({
      data: {
        name,
        description,
        client_id,
        status: (status as ProjectStatus) || 'PLANNING',
        start_date: start_date ? new Date(start_date) : null,
        end_date: end_date ? new Date(end_date) : null,
        budget: budget ? parseFloat(budget) : null,
        industry_id: industry_id || null,
        created_by: user.id,
      },
      include: {
        client: {
          select: { id: true, name: true, company: true },
        },
        industry: {
          select: { id: true, name: true, icon: true, color: true },
        },
        milestones: true,
      },
    });

    // Broadcast WebSocket event
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const io = (globalThis as any).io;
    if (io) {
      io.emit('projects:update', { action: 'create', projectId: project.id });
    }

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error('POST projects error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while creating the project.' },
      { status: 500 }
    );
  }
}
