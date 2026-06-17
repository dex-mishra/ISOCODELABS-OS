import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { buildContentOutline } from '@/lib/ai/content-ai';
import { ContentIdeaStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = requireAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const idea = await prisma.contentIdea.findUnique({
      where: { id: params.id },
    });

    if (!idea) {
      return NextResponse.json({ error: 'Content idea not found.' }, { status: 404 });
    }

    // Call Vertex AI to build outline
    const result = await buildContentOutline({
      title: idea.title,
      description: idea.description,
      content_type: idea.content_type,
      target_audience: idea.target_audience,
      tags: idea.tags,
    });

    // Create ContentOutline record
    const outline = await prisma.contentOutline.create({
      data: {
        idea_id: idea.id,
        sections: result.sections,
        estimated_word_count: result.estimated_word_count,
        estimated_read_time: result.estimated_read_time,
        generated_by: user.id,
      },
    });

    // Update status to OUTLINED
    await prisma.contentIdea.update({
      where: { id: params.id },
      data: { status: ContentIdeaStatus.OUTLINED },
    });

    // Notify real-time clients
    const io = (globalThis as { io?: { emit: (event: string, data: unknown) => void } }).io;
    if (io) {
      io.emit('ideas:update', { action: 'outlined', ideaId: idea.id });
    }

    // Trigger notification for all users
    try {
      const { createAndBroadcastNotification } = require('@/lib/realtime/notifications');
      const allUsers = await prisma.user.findMany();
      for (const u of allUsers) {
        await createAndBroadcastNotification(u.id, {
          title: 'AI Outline Completed',
          body: `AI outline has completed for content idea: "${idea.title}"`,
          type: 'AI_COMPLETED',
          link: `/content`,
        });
      }
    } catch (err) {
      console.error('Failed to trigger content outline AI notification:', err);
    }

    return NextResponse.json(outline);
  } catch (error) {
    console.error('POST build content outline error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
