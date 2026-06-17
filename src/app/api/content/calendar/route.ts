import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const dateFilter: Prisma.DateTimeNullableFilter = { not: null };
    if (startDate || endDate) {
      if (startDate) dateFilter.gte = new Date(startDate);
      if (endDate) dateFilter.lte = new Date(endDate);
    }

    const calendarItems = await prisma.contentItem.findMany({
      where: {
        publish_date: dateFilter,
      },
      include: {
        product: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true, avatar_url: true } },
      },
      orderBy: {
        publish_date: 'asc',
      },
    });

    return NextResponse.json(calendarItems);
  } catch (error) {
    console.error('GET content calendar error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
