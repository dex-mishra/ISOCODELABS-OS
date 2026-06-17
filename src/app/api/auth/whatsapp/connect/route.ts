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

    const body = await req.json();
    const { whatsapp_api_token, whatsapp_phone_number_id } = body;

    if (!whatsapp_api_token || !whatsapp_phone_number_id) {
      return NextResponse.json(
        { error: 'WhatsApp API token and Phone Number ID are required.' },
        { status: 400 }
      );
    }

    await prisma.setting.upsert({
      where: { key: 'whatsapp_api_token' },
      update: { value: whatsapp_api_token },
      create: { key: 'whatsapp_api_token', value: whatsapp_api_token, category: 'integrations' },
    });

    await prisma.setting.upsert({
      where: { key: 'whatsapp_phone_number_id' },
      update: { value: whatsapp_phone_number_id },
      create: {
        key: 'whatsapp_phone_number_id',
        value: whatsapp_phone_number_id,
        category: 'integrations',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'WhatsApp Business API configured successfully.',
    });
  } catch (error) {
    console.error('POST auth whatsapp connect API error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while saving credentials.' },
      { status: 500 }
    );
  }
}
