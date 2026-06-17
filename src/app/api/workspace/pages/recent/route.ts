import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

// GET /api/workspace/pages/recent - Get last 10 edited pages
export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const pages = await prisma.workspacePage.findMany({
      where: {
        is_deleted: false,
      },
      orderBy: {
        updated_at: 'desc',
      },
      take: 10,
      select: {
        id: true,
        title: true,
        folder_id: true,
        icon: true,
        cover_image: true,
        updated_at: true,
      },
    });

    return NextResponse.json(pages);
  } catch (error) {
    console.error('GET recent pages error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while retrieving recent pages.' },
      { status: 500 }
    );
  }
}
