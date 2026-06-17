import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import { getGoogleAuthUrl } from '@/lib/integrations/google-meet';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Auth token is required to connect Google Calendar.' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid or expired auth token.' }, { status: 401 });
    }

    const authUrl = getGoogleAuthUrl(decoded.id);
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('API /api/auth/google error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
