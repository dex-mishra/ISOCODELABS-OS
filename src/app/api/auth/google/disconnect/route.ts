import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const key = `google_tokens_user_${user.id}`;
    
    // Check if exists
    const existing = await prisma.setting.findUnique({ where: { key } });
    if (existing) {
      await prisma.setting.delete({ where: { key } });
    }

    return NextResponse.json({ success: true, message: 'Google connection disconnected successfully.' });
  } catch (error) {
    console.error('POST auth google disconnect API error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while disconnecting.' },
      { status: 500 }
    );
  }
}
