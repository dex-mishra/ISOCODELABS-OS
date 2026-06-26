import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { answerResourceQuestion } from '@/lib/ai/explore-ai';

// POST /api/explore/[id]/qa — Q&A grounded on this resource
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = requireAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const id = params.id;
    const body = await req.json();
    const { question, history } = body;

    if (!question) {
      return NextResponse.json({ error: 'Question is required.' }, { status: 400 });
    }

    const resource = await prisma.exploreResource.findUnique({
      where: { id },
    });

    if (!resource) {
      return NextResponse.json({ error: 'Resource not found.' }, { status: 404 });
    }

    const answer = await answerResourceQuestion(resource, question, history || []);

    return NextResponse.json({ answer });
  } catch (error) {
    console.error('POST /api/explore/[id]/qa error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred during Q&A.' }, { status: 500 });
  }
}
