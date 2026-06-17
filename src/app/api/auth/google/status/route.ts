import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { decrypt } from '@/lib/auth/encrypt';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const key = `google_tokens_user_${user.id}`;
    const setting = await prisma.setting.findUnique({ where: { key } });

    if (!setting) {
      return NextResponse.json({ connected: false, email: null, scopes: [] });
    }

    try {
      const tokens = JSON.parse(decrypt(setting.value));
      return NextResponse.json({
        connected: true,
        email: tokens.email || 'connected-user@google.com',
        scopes: tokens.scope ? tokens.scope.split(' ') : [],
      });
    } catch (err) {
      return NextResponse.json({ connected: false, email: null, scopes: [] });
    }
  } catch (error) {
    console.error('GET auth google status API error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while fetching status.' },
      { status: 500 }
    );
  }
}
