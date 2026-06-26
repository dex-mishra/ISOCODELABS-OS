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

    // Upsert the connection mode to 'qr'
    await prisma.setting.upsert({
      where: { key: 'whatsapp_connection_mode' },
      update: { value: 'qr' },
      create: { key: 'whatsapp_connection_mode', value: 'qr', category: 'integrations' },
    });

    // Upsert the QR connection state to 'true'
    await prisma.setting.upsert({
      where: { key: 'whatsapp_qr_connected' },
      update: { value: 'true' },
      create: { key: 'whatsapp_qr_connected', value: 'true', category: 'integrations' },
    });

    // Broadcast update via socket
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const io = (globalThis as any).io;
    if (io) {
      io.emit('settings:update', { action: 'whatsapp_status' });
    }

    return NextResponse.json({
      success: true,
      message: 'WhatsApp QR Code linked successfully (mock read-only mode).',
    });
  } catch (error) {
    console.error('POST auth whatsapp connect-qr API error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while connecting.' },
      { status: 500 }
    );
  }
}
