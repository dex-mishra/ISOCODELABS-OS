import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

function getCategory(key: string): string {
  if (key.startsWith('theme_')) return 'appearance';
  if (
    key.startsWith('whatsapp_') ||
    key.startsWith('google_') ||
    key.startsWith('fathom_')
  ) {
    return 'integrations';
  }
  return 'general';
}

// GET /api/settings
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

    // Provide default fallbacks from env or system defaults
    const responseSettings = {
      google_ai_api_key:
        settingsMap['google_ai_api_key'] ||
        process.env.GOOGLE_AI_API_KEY ||
        'mock-google-ai-key',
      whatsapp_api_token:
        settingsMap['whatsapp_api_token'] ||
        process.env.WHATSAPP_API_TOKEN ||
        'mock-whatsapp-token',
      whatsapp_phone_number_id:
        settingsMap['whatsapp_phone_number_id'] ||
        process.env.WHATSAPP_PHONE_NUMBER_ID ||
        'mock-phone-number-id',
      theme_mode: settingsMap['theme_mode'] || 'light',
      theme_accent_color: settingsMap['theme_accent_color'] || '#0071e3',
      theme_density: settingsMap['theme_density'] || 'comfortable',
    };

    return NextResponse.json(responseSettings);
  } catch (error) {
    console.error('GET settings API error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while retrieving settings.' },
      { status: 500 }
    );
  }
}

// PUT /api/settings
export async function PUT(req: NextRequest) {
  try {
    const user = requireAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const body = await req.json();

    for (const [key, value] of Object.entries(body)) {
      if (value === undefined || value === null) continue;
      
      await prisma.setting.upsert({
        where: { key },
        update: { value: String(value) },
        create: {
          key,
          value: String(value),
          category: getCategory(key),
        },
      });
    }

    // Return current settings
    const settingsList = await prisma.setting.findMany();
    const settingsMap: Record<string, string> = {};
    settingsList.forEach((s) => {
      settingsMap[s.key] = s.value;
    });

    return NextResponse.json(settingsMap);
  } catch (error) {
    console.error('PUT settings API error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while updating settings.' },
      { status: 500 }
    );
  }
}
