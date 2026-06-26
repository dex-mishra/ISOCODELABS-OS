import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

// GET /api/ventures/[id]/funding
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = requireAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const rounds = await prisma.fundingRound.findMany({
      where: { venture_id: params.id },
      orderBy: { created_at: 'desc' },
    });

    return NextResponse.json(rounds);
  } catch (error) {
    console.error('GET funding rounds error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}

// POST /api/ventures/[id]/funding
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = requireAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const body = await req.json();
    const { round_name, target_amount, raised_amount, valuation, status, date, investor_notes, min_users, min_revenue, min_requirements } = body;

    if (!round_name) {
      return NextResponse.json(
        { error: 'round_name is required.' },
        { status: 400 }
      );
    }

    const round = await prisma.fundingRound.create({
      data: {
        venture_id: params.id,
        round_name,
        target_amount: target_amount ? Number(target_amount) : null,
        raised_amount: raised_amount ? Number(raised_amount) : 0,
        valuation: valuation ? Number(valuation) : null,
        status: status || 'PLANNING',
        date: date ? new Date(date) : null,
        investor_notes: investor_notes || null,
        min_users: min_users ? Number(min_users) : null,
        min_revenue: min_revenue ? Number(min_revenue) : null,
        min_requirements: min_requirements || null,
      },
    });

    return NextResponse.json(round, { status: 201 });
  } catch (error) {
    console.error('POST funding round error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
