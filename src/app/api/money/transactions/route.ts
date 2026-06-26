import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { TxType } from '@prisma/client';

export const dynamic = 'force-dynamic';

// GET /api/money/transactions — list with filters
export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const category = searchParams.get('category');
    const industryId = searchParams.get('industry_id');
    const clientId = searchParams.get('client_id');
    const projectId = searchParams.get('project_id');
    const ventureId = searchParams.get('venture_id');
    const recurring = searchParams.get('recurring');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const search = searchParams.get('search');

    const transactions = await prisma.transaction.findMany({
      where: {
        ...(type ? { type: type as TxType } : {}),
        ...(category ? { category } : {}),
        ...(industryId ? { industry_id: industryId } : {}),
        ...(clientId ? { client_id: clientId } : {}),
        ...(projectId ? { project_id: projectId } : {}),
        ...(ventureId ? { venture_id: ventureId } : {}),
        ...(recurring !== null && recurring !== undefined && recurring !== ''
          ? { recurring: recurring === 'true' }
          : {}),
        ...(startDate || endDate
          ? {
              date: {
                ...(startDate ? { gte: new Date(startDate) } : {}),
                ...(endDate ? { lte: new Date(endDate) } : {}),
              },
            }
          : {}),
        ...(search
          ? {
              OR: [
                { description: { contains: search, mode: 'insensitive' as const } },
                { category: { contains: search, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      },
      include: {
        client: { select: { id: true, name: true, email: true, company: true } },
        project: { select: { id: true, name: true } },
        industry: { select: { id: true, name: true, icon: true, color: true } },
      },
      orderBy: { date: 'desc' },
    });

    return NextResponse.json(transactions);
  } catch (error) {
    console.error('GET transactions error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}

// POST /api/money/transactions — create transaction
export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const body = await req.json();
    const { amount, type, category, date, description, client_id, project_id, industry_id, venture_id, recurring } = body;

    if (amount === undefined || amount === null || !type || !category || !date) {
      return NextResponse.json(
        { error: 'amount, type, category, and date are required.' },
        { status: 400 }
      );
    }

    if (!['INCOME', 'EXPENSE'].includes(type)) {
      return NextResponse.json(
        { error: 'type must be INCOME or EXPENSE.' },
        { status: 400 }
      );
    }

    const transaction = await prisma.transaction.create({
      data: {
        amount: Number(amount),
        type: type as TxType,
        category,
        date: new Date(date),
        description: description || null,
        client_id: client_id || null,
        project_id: project_id || null,
        industry_id: industry_id || null,
        venture_id: venture_id || null,
        recurring: recurring === true || recurring === 'true' ? true : false,
      },
      include: {
        client: { select: { id: true, name: true, email: true, company: true } },
        project: { select: { id: true, name: true } },
        industry: { select: { id: true, name: true, icon: true, color: true } },
      },
    });

    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    console.error('POST transactions error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
