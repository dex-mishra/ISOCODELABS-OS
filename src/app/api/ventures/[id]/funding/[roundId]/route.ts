import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

// PATCH /api/ventures/[id]/funding/[roundId]
export async function PATCH(req: NextRequest, { params }: { params: { id: string; roundId: string } }) {
  try {
    const user = requireAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const body = await req.json();
    const { round_name, target_amount, raised_amount, valuation, status, date, investor_notes, min_users, min_revenue, min_requirements } = body;

    const round = await prisma.fundingRound.update({
      where: { id: params.roundId },
      data: {
        ...(round_name !== undefined ? { round_name } : {}),
        ...(target_amount !== undefined ? { target_amount: target_amount ? Number(target_amount) : null } : {}),
        ...(raised_amount !== undefined ? { raised_amount: raised_amount ? Number(raised_amount) : 0 } : {}),
        ...(valuation !== undefined ? { valuation: valuation ? Number(valuation) : null } : {}),
        ...(status !== undefined ? { status } : {}),
        ...(date !== undefined ? { date: date ? new Date(date) : null } : {}),
        ...(investor_notes !== undefined ? { investor_notes } : {}),
        ...(min_users !== undefined ? { min_users: min_users ? Number(min_users) : null } : {}),
        ...(min_revenue !== undefined ? { min_revenue: min_revenue ? Number(min_revenue) : null } : {}),
        ...(min_requirements !== undefined ? { min_requirements } : {}),
      },
    });

    return NextResponse.json(round);
  } catch (error) {
    console.error('PATCH funding round error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}

// DELETE /api/ventures/[id]/funding/[roundId]
export async function DELETE(req: NextRequest, { params }: { params: { id: string; roundId: string } }) {
  try {
    const user = requireAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    await prisma.fundingRound.delete({ where: { id: params.roundId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE funding round error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
