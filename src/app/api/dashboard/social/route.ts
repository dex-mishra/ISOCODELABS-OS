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

    const socialProviders = ['twitter', 'linkedin', 'youtube', 'instagram', 'facebook'];

    const accounts = await prisma.dashboardAccount.findMany({
      where: {
        provider: {
          in: socialProviders
        }
      },
      orderBy: { created_at: 'desc' }
    });

    const safeAccounts = accounts.map(acc => {
      const metricsObj = (acc.metrics && typeof acc.metrics === 'object')
        ? (acc.metrics as Record<string, unknown>)
        : {};

      const cleanMetrics = { ...metricsObj };
      delete cleanMetrics.credentials;

      return {
        id: acc.id,
        name: acc.name,
        provider: acc.provider,
        last_synced_at: acc.last_synced_at,
        metrics: cleanMetrics
      };
    });

    return NextResponse.json(safeAccounts);
  } catch (error) {
    console.error('GET dashboard social error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while retrieving social accounts.' },
      { status: 500 }
    );
  }
}
