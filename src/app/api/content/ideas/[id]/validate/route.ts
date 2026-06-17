import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { validateContentIdea } from '@/lib/ai/content-ai';
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

    // Set status to VALIDATING first
    await prisma.contentIdea.update({
      where: { id: params.id },
      data: { status: ContentIdeaStatus.VALIDATING },
    });

    // Notify real-time clients that we are validating
    const io = (globalThis as { io?: { emit: (event: string, data: unknown) => void } }).io;
    if (io) {
      io.emit('ideas:update', { action: 'validating', ideaId: idea.id });
    }

    // Call Vertex AI validation
    const result = await validateContentIdea({
      title: idea.title,
      description: idea.description,
      content_type: idea.content_type,
      target_audience: idea.target_audience,
      tags: idea.tags,
    });

    // Create ContentIdeaValidation record
    const validation = await prisma.contentIdeaValidation.create({
      data: {
        idea_id: idea.id,
        feasibility_score: result.feasibility_score,
        audience_fit_score: result.audience_fit_score,
        originality_score: result.originality_score,
        overall_score: result.overall_score,
        strengths: result.strengths,
        weaknesses: result.weaknesses,
        recommendations: result.recommendations,
        generated_by: user.id,
      },
    });

    // Update status to VALIDATED
    await prisma.contentIdea.update({
      where: { id: params.id },
      data: { status: ContentIdeaStatus.VALIDATED },
    });

    if (io) {
      io.emit('ideas:update', { action: 'validated', ideaId: idea.id });
    }

    return NextResponse.json(validation);
  } catch (error) {
    console.error('POST validate content idea error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
