import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { validateIdea } from '@/lib/ai/idea-validation';
import { IdeaStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = requireAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const idea = await prisma.idea.findUnique({
      where: { id: params.id },
    });

    if (!idea || idea.is_deleted) {
      return NextResponse.json({ error: 'Idea not found.' }, { status: 404 });
    }

    // Call Vertex AI validation
    let result;
    try {
      result = await validateIdea({
        title: idea.title,
        description: idea.description,
        category: idea.category,
        impact: idea.impact,
        effort: idea.effort,
        tags: idea.tags,
      });
    } catch (aiError) {
      console.error('AI validation error:', aiError);
      const err = aiError as Error;
      return NextResponse.json(
        { error: err.message || 'AI Validation Service is currently unavailable.' },
        { status: 503 }
      );
    }

    const promptText = `Validate this product or feature idea:\nTitle: ${idea.title}\nDescription: ${idea.description}`;
    
    // Save validation record
    const validation = await prisma.aiValidation.create({
      data: {
        idea_id: idea.id,
        type: 'VALIDATION',
        prompt: promptText,
        response: JSON.stringify(result),
        confidence: result.confidence_score,
        claims: {
          market_assessment: result.market_assessment,
          competitor_landscape: result.competitor_landscape,
        },
      },
    });

    // Update status to VALIDATED if currently RAW
    let updatedStatus = idea.status;
    if (idea.status === IdeaStatus.RAW) {
      updatedStatus = IdeaStatus.VALIDATED;
      await prisma.idea.update({
        where: { id: idea.id },
        data: { status: IdeaStatus.VALIDATED },
      });
    }

    // Broadcast change
    const io = (globalThis as unknown as { io?: { emit: (event: string, data: unknown) => void } }).io;
    if (io) {
      io.emit('ideas:update', { action: 'validate', ideaId: idea.id, status: updatedStatus });
    }

    // Trigger notification for all users
    try {
      const { createAndBroadcastNotification } = require('@/lib/realtime/notifications');
      const allUsers = await prisma.user.findMany();
      for (const u of allUsers) {
        await createAndBroadcastNotification(u.id, {
          title: 'AI Validation Completed',
          body: `AI validation has completed for idea: "${idea.title}"`,
          type: 'AI_COMPLETED',
          link: `/ideas`,
        });
      }
    } catch (err) {
      console.error('Failed to trigger idea validation AI notification:', err);
    }

    return NextResponse.json(validation);
  } catch (error) {
    console.error('POST validate idea error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
