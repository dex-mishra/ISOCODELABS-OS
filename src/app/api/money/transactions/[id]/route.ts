import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { TxType } from '@prisma/client';

export const dynamic = 'force-dynamic';

// PATCH /api/money/transactions/[id] — update transaction
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = requireAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const { id } = params;

    const existing = await prisma.transaction.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Transaction not found.' }, { status: 404 });
    }

    const body = await req.json();
    const { amount, type, category, date, description, client_id, project_id, industry_id, recurring } = body;

    const transaction = await prisma.transaction.update({
      where: { id },
      data: {
        ...(amount !== undefined ? { amount: Number(amount) } : {}),
        ...(type ? { type: type as TxType } : {}),
        ...(category !== undefined ? { category } : {}),
        ...(date ? { date: new Date(date) } : {}),
        ...(description !== undefined ? { description: description || null } : {}),
        ...(client_id !== undefined ? { client_id: client_id || null } : {}),
        ...(project_id !== undefined ? { project_id: project_id || null } : {}),
        ...(industry_id !== undefined ? { industry_id: industry_id || null } : {}),
        ...(recurring !== undefined
          ? { recurring: recurring === true || recurring === 'true' }
          : {}),
      },
      include: {
        client: { select: { id: true, name: true, email: true, company: true } },
        project: { select: { id: true, name: true } },
        industry: { select: { id: true, name: true, icon: true, color: true } },
      },
    });

    return NextResponse.json(transaction);
  } catch (error) {
    console.error('PATCH transaction error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}

// DELETE /api/money/transactions/[id] — delete transaction
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = requireAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const { id } = params;

    const existing = await prisma.transaction.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Transaction not found.' }, { status: 404 });
    }

    await prisma.transaction.delete({ where: { id } });

    return NextResponse.json({ message: 'Transaction deleted successfully.' });
  } catch (error) {
    console.error('DELETE transaction error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
