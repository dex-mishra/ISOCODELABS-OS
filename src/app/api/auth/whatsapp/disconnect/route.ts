import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    // Check and delete whatsapp_api_token
    const existingToken = await prisma.setting.findUnique({ where: { key: 'whatsapp_api_token' } });
    if (existingToken) {
      await prisma.setting.delete({ where: { key: 'whatsapp_api_token' } });
    }

    // Check and delete whatsapp_phone_number_id
    const existingPhone = await prisma.setting.findUnique({
      where: { key: 'whatsapp_phone_number_id' },
    });
    if (existingPhone) {
      await prisma.setting.delete({ where: { key: 'whatsapp_phone_number_id' } });
    }

    // Check and delete whatsapp_connection_mode
    const existingMode = await prisma.setting.findUnique({ where: { key: 'whatsapp_connection_mode' } });
    if (existingMode) {
      await prisma.setting.delete({ where: { key: 'whatsapp_connection_mode' } });
    }

    // Check and delete whatsapp_qr_connected
    const existingQr = await prisma.setting.findUnique({ where: { key: 'whatsapp_qr_connected' } });
    if (existingQr) {
      await prisma.setting.delete({ where: { key: 'whatsapp_qr_connected' } });
    }

    return NextResponse.json({ success: true, message: 'WhatsApp connection disconnected successfully.' });
  } catch (error) {
    console.error('POST auth whatsapp disconnect API error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while disconnecting.' },
      { status: 500 }
    );
  }
}
