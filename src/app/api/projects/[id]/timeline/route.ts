import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

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
        milestones: {
          orderBy: { due_date: 'asc' },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found.' }, { status: 404 });
    }

    const totalMilestones = project.milestones.length;
    const completedMilestones = project.milestones.filter((m) => m.status === 'COMPLETED').length;
    const progress = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

    return NextResponse.json({
      projectName: project.name,
      startDate: project.start_date,
      endDate: project.end_date,
      progress,
      milestones: project.milestones,
    });
  } catch (error) {
    console.error('GET project timeline error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while fetching the timeline.' },
      { status: 500 }
    );
  }
}
