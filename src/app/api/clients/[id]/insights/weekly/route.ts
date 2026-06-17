import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { generateClientInsight } from '@/lib/ai/communication-insights';

export const dynamic = 'force-dynamic';

// GET /api/clients/[id]/insights/weekly
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = requireAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const insight = await generateClientInsight(params.id, user.id, weekAgo, now, 'WEEKLY_DIGEST');

    return NextResponse.json(insight);
  } catch (error) {
    console.error('GET weekly insight error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
