import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

// POST /api/clients/[id]/connect-gmail
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = requireAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const body = await req.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email address is required.' }, { status: 400 });
    }

    // Store tracked email in settings
    const key = `client_gmail_${params.id}`;
    await prisma.setting.upsert({
      where: { key },
      update: { value: email, category: 'client_integration' },
      create: { key, value: email, category: 'client_integration' },
    });

    await prisma.client.update({
      where: { id: params.id },
      data: { connected_gmail: true },
    });

    return NextResponse.json({ success: true, tracked_email: email });
  } catch (error) {
    console.error('connect-gmail error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
