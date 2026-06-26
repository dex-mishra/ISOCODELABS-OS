import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { analyzeFinancials } from '@/lib/ai/money-ai';

export const dynamic = 'force-dynamic';

// POST /api/money/ai-analysis — AI-powered financial analysis
export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    // Fetch last 6 months of transactions
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const [transactions, invoices] = await Promise.all([
      prisma.transaction.findMany({
        where: {
          date: { gte: sixMonthsAgo },
        },
        include: {
          client: { select: { id: true, name: true } },
          project: { select: { id: true, name: true } },
          industry: { select: { id: true, name: true } },
        },
        orderBy: { date: 'desc' },
      }),
      prisma.invoice.findMany({
        include: {
          client: { select: { id: true, name: true } },
          project: { select: { id: true, name: true } },
        },
        orderBy: { issue_date: 'desc' },
      }),
    ]);

    const analysis = await analyzeFinancials(transactions, invoices);

    return NextResponse.json({
      analysis,
      metadata: {
        transactions_analyzed: transactions.length,
        invoices_analyzed: invoices.length,
        period_start: sixMonthsAgo.toISOString(),
        period_end: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('POST ai-analysis error:', error);

    // Surface Vertex AI unavailable errors clearly
    const err = error as Error;
    if (err.message && err.message.includes('Vertex AI')) {
      return NextResponse.json(
        { error: err.message },
        { status: 503 }
      );
    }

    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
