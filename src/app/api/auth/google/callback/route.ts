import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens } from '@/lib/integrations/google-meet';

export const dynamic = 'force-dynamic';

function getBaseUrl(req: NextRequest): string {
  // Use x-forwarded-host (set by Cloud Run) or host header, with protocol
  const forwardedHost = req.headers.get('x-forwarded-host');
  const host = forwardedHost || req.headers.get('host') || 'localhost:3000';
  const protocol = req.headers.get('x-forwarded-proto') || 'https';
  return `${protocol}://${host}`;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // Represents userId

    if (!code || !state) {
      return NextResponse.json({ error: 'Code or state parameter is missing from Google redirect.' }, { status: 400 });
    }

    const baseUrl = getBaseUrl(req);

    const success = await exchangeCodeForTokens(code, state);
    if (!success) {
      return NextResponse.redirect(`${baseUrl}/settings?google=failed`);
    }

    // Redirect to settings page with success indicator
    return NextResponse.redirect(`${baseUrl}/settings?google=success`);
  } catch (error) {
    console.error('API /api/auth/google/callback error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred during Google OAuth callback.' }, { status: 500 });
  }
}
