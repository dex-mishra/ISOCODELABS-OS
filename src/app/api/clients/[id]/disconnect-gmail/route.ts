import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = requireAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const key = `client_gmail_${params.id}`;
    await prisma.setting.deleteMany({ where: { key } });

    await prisma.client.update({
      where: { id: params.id },
      data: { connected_gmail: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('disconnect-gmail error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
