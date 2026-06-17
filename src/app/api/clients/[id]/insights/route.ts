import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { generateClientInsight } from '@/lib/ai/communication-insights';
import { InsightType } from '@prisma/client';

export const dynamic = 'force-dynamic';

// GET /api/clients/[id]/insights — list past insights
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = requireAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const insights = await prisma.clientInsight.findMany({
      where: { client_id: params.id },
      orderBy: { created_at: 'desc' },
      take: 20,
    });

    return NextResponse.json(insights);
  } catch (error) {
    console.error('GET insights error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}

// POST /api/clients/[id]/insights — generate new insight
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = requireAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const body = await req.json();
    const { start_date, end_date, type } = body;

    const startDate = start_date ? new Date(start_date) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = end_date ? new Date(end_date) : new Date();

    const insight = await generateClientInsight(
      params.id,
      user.id,
      startDate,
      endDate,
      (type as InsightType) || 'COMMUNICATION_SUMMARY'
    );

    return NextResponse.json(insight, { status: 201 });
  } catch (error) {
    console.error('POST insights error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
