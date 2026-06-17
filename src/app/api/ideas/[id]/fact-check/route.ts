import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { factCheckIdea } from '@/lib/ai/idea-validation';
import { Prisma, IdeaStatus } from '@prisma/client';

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

    if (!idea.description || !idea.description.trim()) {
      return NextResponse.json(
        { error: 'Cannot fact-check an idea with an empty description.' },
        { status: 400 }
      );
    }

    // Call Vertex AI fact-checking
    let claimsResult;
    try {
      claimsResult = await factCheckIdea({
        title: idea.title,
        description: idea.description,
      });
    } catch (aiError) {
      console.error('AI fact-check error:', aiError);
      const err = aiError as Error;
      return NextResponse.json(
        { error: err.message || 'AI Validation Service is currently unavailable.' },
        { status: 503 }
      );
    }

    // Compute confidence: validClaims / totalClaims
    const totalClaims = claimsResult.length;
    const validClaims = claimsResult.filter((c) => c.isValid).length;
    const confidence = totalClaims > 0 ? parseFloat((validClaims / totalClaims).toFixed(2)) : 1.0;

    const promptText = `Fact check claims in idea description:\nTitle: ${idea.title}\nDescription: ${idea.description}`;

    // Save validation record
    const validation = await prisma.aiValidation.create({
      data: {
        idea_id: idea.id,
        type: 'FACT_CHECK',
        prompt: promptText,
        response: JSON.stringify(claimsResult),
        confidence,
        claims: claimsResult as unknown as Prisma.InputJsonValue, // Stores the array of ClaimCheck objects
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
      io.emit('ideas:update', { action: 'fact-check', ideaId: idea.id, status: updatedStatus });
    }

    return NextResponse.json(validation);
  } catch (error) {
    console.error('POST fact-check idea error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
