import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const tokenSetting = await prisma.setting.findUnique({ where: { key: 'whatsapp_api_token' } });
    const phoneSetting = await prisma.setting.findUnique({
      where: { key: 'whatsapp_phone_number_id' },
    });

    const token = tokenSetting?.value || process.env.WHATSAPP_API_TOKEN || '';
    const phoneId = phoneSetting?.value || process.env.WHATSAPP_PHONE_NUMBER_ID || '';

    const connected = !!(token && phoneId);

    return NextResponse.json({
      connected,
      phone_number_id: phoneId || null,
      is_mock: token.startsWith('mock'),
    });
  } catch (error) {
    console.error('GET auth whatsapp status API error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while fetching status.' },
      { status: 500 }
    );
  }
}
