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

    const modeSetting = await prisma.setting.findUnique({ where: { key: 'whatsapp_connection_mode' } });
    const qrConnectedSetting = await prisma.setting.findUnique({ where: { key: 'whatsapp_qr_connected' } });
    const tokenSetting = await prisma.setting.findUnique({ where: { key: 'whatsapp_api_token' } });
    const phoneSetting = await prisma.setting.findUnique({ where: { key: 'whatsapp_phone_number_id' } });

    const mode = modeSetting?.value || 'business';
    const qrConnected = qrConnectedSetting?.value === 'true';
    const token = tokenSetting?.value || process.env.WHATSAPP_API_TOKEN || '';
    const phoneId = phoneSetting?.value || process.env.WHATSAPP_PHONE_NUMBER_ID || '';

    const connected = mode === 'qr' ? qrConnected : !!(token && phoneId);

    if (connected) {
      return NextResponse.json({
        success: true,
        status: 'CONNECTED',
        message: mode === 'qr' ? '🟢 Connected (QR Code - Read-Only)' : '🟢 Connected (Business API - Active)',
      });
    } else {
      return NextResponse.json({
        success: false,
        status: 'DISCONNECTED',
        message: '🔴 Disconnected',
      });
    }
  } catch (error) {
    console.error('GET auth whatsapp test-connection API error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while checking connection.' },
      { status: 500 }
    );
  }
}
