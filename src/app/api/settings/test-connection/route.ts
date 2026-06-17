import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const body = await req.json();
    const { google_ai_api_key } = body;

    if (!google_ai_api_key) {
      return NextResponse.json({ error: 'API key is required for testing.' }, { status: 400 });
    }

    const keyLower = google_ai_api_key.toLowerCase();
    if (keyLower.startsWith('mock') || keyLower === 'test-key') {
      // Simulate connection delay
      await new Promise((resolve) => setTimeout(resolve, 800));
      return NextResponse.json({
        success: true,
        message: 'Mock connection successful. Google AI Studio simulation mode is active.',
      });
    }

    // Real API validation query
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${google_ai_api_key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            instances: [{ prompt: 'connection test' }],
            parameters: { sampleCount: 1, aspectRatio: '1:1' },
          }),
          signal: AbortSignal.timeout(10000),
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.predictions && data.predictions.length > 0) {
          return NextResponse.json({
            success: true,
            message: 'Connection verified! Google AI Studio API key is active and responding.',
          });
        }
      }

      const errData = await response.json().catch(() => ({}));
      const errMessage = errData.error?.message || response.statusText;
      return NextResponse.json({
        success: false,
        error: `Validation failed: ${errMessage} (Status: ${response.status})`,
      });
    } catch (err: any) {
      console.error('Real Google AI connection test error:', err);
      return NextResponse.json({
        success: false,
        error: `Connection timeout or network failure: ${err.message}`,
      });
    }
  } catch (error) {
    console.error('POST settings test-connection API error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while testing connection.' },
      { status: 500 }
    );
  }
}
