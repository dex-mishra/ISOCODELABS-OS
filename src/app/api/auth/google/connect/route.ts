import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { getGoogleAuthUrl } from '@/lib/integrations/google-meet';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const authUrl = getGoogleAuthUrl(user.id);
    return NextResponse.json({ url: authUrl });
  } catch (error) {
    console.error('POST auth google connect API error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while generating connection link.' },
      { status: 500 }
    );
  }
}
