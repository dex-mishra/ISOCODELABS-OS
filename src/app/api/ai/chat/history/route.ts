import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const contextType = searchParams.get('context_type')?.toUpperCase() || 'IDEA';
    const contextId = searchParams.get('context_id') || null;
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

    const messages = await prisma.chatMessage.findMany({
      where: {
        context_type: contextType,
        context_id: contextId,
      },
      orderBy: { created_at: 'asc' },
      take: limit,
      select: {
        id: true,
        role: true,
        content: true,
        model_used: true,
        images: true,
        created_at: true,
        context_id: true,
      },
    });

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('GET chat history error:', error);
    return NextResponse.json({ error: 'Failed to fetch chat history.' }, { status: 500 });
  }
}
