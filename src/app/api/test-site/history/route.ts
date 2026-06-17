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
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const skip = (page - 1) * limit;

    const [results, total] = await Promise.all([
      prisma.testResult.findMany({
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
      prisma.testResult.count(),
    ]);

    return NextResponse.json({
      results,
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error('GET test-site history error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while fetching prompt history.' },
      { status: 500 }
    );
  }
}
