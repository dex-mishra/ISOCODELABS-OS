import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { contextType: string; contextId: string } }
) {
  try {
    const user = requireAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { contextType, contextId } = params;

    if (!contextType || !contextId) {
      return NextResponse.json({ error: 'Invalid context parameters.' }, { status: 400 });
    }

    const messages = await prisma.chatMessage.findMany({
      where: {
        context_type: contextType.toUpperCase(),
        context_id: contextId,
      },
      orderBy: {
        created_at: 'asc',
      },
    });

    return NextResponse.json(messages);
  } catch (error) {
    console.error('GET chat history error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
