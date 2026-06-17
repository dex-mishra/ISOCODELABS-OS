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

    const settingsList = await prisma.setting.findMany();
    const settingsMap: Record<string, string> = {};
    settingsList.forEach((s) => {
      settingsMap[s.key] = s.value;
    });

    // 1. Google connection info
    const googleTokensKey = `google_tokens_user_${user.id}`;
    const googleSetting = settingsMap[googleTokensKey];
    let googleStatus = {
      connected: false,
      email: null as string | null,
      scopes: [] as string[],
    };

    if (googleSetting) {
      try {
        const tokens = JSON.parse(decrypt(googleSetting));
        const isExpired = tokens.expires_at - 60000 < Date.now();
        googleStatus = {
          connected: true,
          email: tokens.email || 'connected-user@google.com',
          scopes: tokens.scope ? tokens.scope.split(' ') : [],
        };
      } catch (err) {
        console.error('Failed to parse Google OAuth tokens:', err);
      }
    }

    // 2. WhatsApp connection info
    const whatsappToken = settingsMap['whatsapp_api_token'] || process.env.WHATSAPP_API_TOKEN || '';
    const whatsappPhoneId = settingsMap['whatsapp_phone_number_id'] || process.env.WHATSAPP_PHONE_NUMBER_ID || '';
    const whatsappConnected = !!(whatsappToken && whatsappPhoneId);

    // 3. Google AI connection info
    const googleAiKey = settingsMap['google_ai_api_key'] || process.env.GOOGLE_AI_API_KEY || '';
    const googleAiConnected = !!googleAiKey;
    const googleAiStatus = googleAiKey.startsWith('mock') ? 'mock' : 'active';

    const integrations = {
      google: googleStatus,
      whatsapp: {
        connected: whatsappConnected,
        phone_number_id: whatsappPhoneId || null,
        is_mock: whatsappToken.startsWith('mock'),
      },
      google_ai: {
        connected: googleAiConnected,
        status: googleAiStatus,
        key_masked: googleAiKey
          ? googleAiKey.length > 8
            ? googleAiKey.substring(0, 4) + '••••' + googleAiKey.substring(googleAiKey.length - 4)
            : '••••'
          : null,
      },
      fathom: {
        connected: true, // Fathom is link paste based
        status: 'online',
      },
    };

    return NextResponse.json(integrations);
  } catch (error) {
    console.error('GET settings integrations status API error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while retrieving integration status.' },
      { status: 500 }
    );
  }
}
