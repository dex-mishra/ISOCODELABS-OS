import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

interface ActivityItem {
  id: string;
  module: string;
  action: string;
  title: string;
  detail: string;
  timestamp: Date;
}

export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    // 1. Fetch all tasks to get status aggregation
    const tasks = await prisma.task.findMany({
      select: { status: true }
    });
    const todo = tasks.filter(t => t.status === 'TODO').length;
    const inProgress = tasks.filter(t => t.status === 'IN_PROGRESS').length;
    const inReview = tasks.filter(t => t.status === 'IN_REVIEW').length;
    const done = tasks.filter(t => t.status === 'DONE').length;

    // 2. Fetch upcoming meetings (today onwards)
    const upcomingMeetings = await prisma.meeting.findMany({
      where: {
        scheduled_at: {
          gte: new Date()
        }
      },
      orderBy: { scheduled_at: 'asc' },
      take: 5,
      include: {
        attendees: {
          include: {
            user: {
              select: { id: true, name: true, avatar_url: true }
            }
          }
        }
      }
    });

    // 3. Active projects count
    const activeProjects = await prisma.project.count({
      where: { status: 'ACTIVE' }
    });

    // 4. Client pipeline distributions
    const clients = await prisma.client.findMany({
      select: { pipeline_stage: true }
    });
    const pipeline = {
      LEAD: clients.filter(c => c.pipeline_stage === 'LEAD').length,
      CONTACTED: clients.filter(c => c.pipeline_stage === 'CONTACTED').length,
      PROPOSAL: clients.filter(c => c.pipeline_stage === 'PROPOSAL').length,
      NEGOTIATION: clients.filter(c => c.pipeline_stage === 'NEGOTIATION').length,
      ACTIVE: clients.filter(c => c.pipeline_stage === 'ACTIVE').length,
      CHURNED: clients.filter(c => c.pipeline_stage === 'CHURNED').length
    };

    // 5. Unified recent activities across modules
    const [recentTasks, recentMeetings, recentClients, recentProjects, recentIdeas, recentContent] = await Promise.all([
      prisma.task.findMany({ orderBy: { updated_at: 'desc' }, take: 5, include: { assignee: { select: { name: true } } } }),
      prisma.meeting.findMany({ orderBy: { updated_at: 'desc' }, take: 5 }),
      prisma.client.findMany({ orderBy: { updated_at: 'desc' }, take: 5 }),
      prisma.project.findMany({ orderBy: { updated_at: 'desc' }, take: 5 }),
      prisma.idea.findMany({ orderBy: { updated_at: 'desc' }, take: 5 }),
      prisma.contentItem.findMany({ orderBy: { updated_at: 'desc' }, take: 5 })
    ]);

    const activities: ActivityItem[] = [
      ...recentTasks.map(t => ({
        id: `task-${t.id}`,
        module: 'tasks',
        action: t.status === 'DONE' ? 'completed' : 'updated',
        title: t.title,
        detail: `Status set to ${t.status}. Assigned to ${t.assignee?.name || 'Unassigned'}`,
        timestamp: t.updated_at
      })),
      ...recentMeetings.map(m => ({
        id: `meeting-${m.id}`,
        module: 'meetings',
        action: m.status === 'COMPLETED' ? 'completed' : 'scheduled',
        title: m.title,
        detail: `Status is ${m.status}. Scheduled for ${new Date(m.scheduled_at).toLocaleDateString()}`,
        timestamp: m.updated_at
      })),
      ...recentClients.map(c => ({
        id: `client-${c.id}`,
        module: 'clients',
        action: 'updated',
        title: c.name,
        detail: `Stage set to ${c.pipeline_stage}. Company: ${c.company || 'N/A'}`,
        timestamp: c.updated_at
      })),
      ...recentProjects.map(p => ({
        id: `project-${p.id}`,
        module: 'projects',
        action: 'updated',
        title: p.name,
        detail: `Status set to ${p.status}. Budget: $${p.budget || 0}`,
        timestamp: p.updated_at
      })),
      ...recentIdeas.map(i => ({
        id: `idea-${i.id}`,
        module: 'ideas',
        action: 'updated',
        title: i.title,
        detail: `Idea status is ${i.status}. Category: ${i.category}`,
        timestamp: i.updated_at
      })),
      ...recentContent.map(c => ({
        id: `content-${c.id}`,
        module: 'content',
        action: 'updated',
        title: c.title,
        detail: `${c.type} content is ${c.status}`,
        timestamp: c.updated_at
      }))
    ];

    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const activityFeed = activities.slice(0, 10);

    return NextResponse.json({
      tasksStatus: { todo, inProgress, inReview, done },
      upcomingMeetings,
      activeProjects,
      pipeline,
      activityFeed
    });
  } catch (error) {
    console.error('GET dashboard overview error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while loading dashboard statistics.' },
      { status: 500 }
    );
  }
}
