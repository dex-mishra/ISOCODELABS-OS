import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { generateClientInsight } from '@/lib/ai/communication-insights';

export const dynamic = 'force-dynamic';

// GET /api/clients/[id]/insights/daily
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = requireAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);

    const insight = await generateClientInsight(params.id, user.id, startOfDay, now, 'DAILY_DIGEST');

    return NextResponse.json(insight);
  } catch (error) {
    console.error('GET daily insight error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
