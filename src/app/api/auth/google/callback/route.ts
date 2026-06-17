import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens } from '@/lib/integrations/google-meet';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // Represents userId

    if (!code || !state) {
      return NextResponse.json({ error: 'Code or state parameter is missing from Google redirect.' }, { status: 400 });
    }

    const success = await exchangeCodeForTokens(code, state);
    if (!success) {
      return NextResponse.redirect(new URL('/settings?google=failed', req.url));
    }

    // Redirect to settings page with success indicator
    return NextResponse.redirect(new URL('/settings?google=success', req.url));
  } catch (error) {
    console.error('API /api/auth/google/callback error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred during Google OAuth callback.' }, { status: 500 });
  }
}
