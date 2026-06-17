import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = requireAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const body = await req.json();
    const { phone } = body;

    if (!phone) {
      return NextResponse.json({ error: 'Phone number is required.' }, { status: 400 });
    }

    const key = `client_whatsapp_phone_${params.id}`;
    await prisma.setting.upsert({
      where: { key },
      update: { value: phone, category: 'client_integration' },
      create: { key, value: phone, category: 'client_integration' },
    });

    await prisma.client.update({
      where: { id: params.id },
      data: { connected_whatsapp: true },
    });

    return NextResponse.json({ success: true, tracked_phone: phone });
  } catch (error) {
    console.error('connect-whatsapp error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
