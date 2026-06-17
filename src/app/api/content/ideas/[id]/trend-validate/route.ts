import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { validateTrend } from '@/lib/ai/content-ai';

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

    // Call Vertex AI to check trends
    const trendAnalysis = await validateTrend({
      title: idea.title,
      description: idea.description,
      content_type: idea.content_type,
      target_audience: idea.target_audience,
      tags: idea.tags,
    });

    return NextResponse.json(trendAnalysis);
  } catch (error) {
    console.error('POST trend-validate error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
