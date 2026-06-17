import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { CommsDirection } from '@prisma/client';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

// POST /api/clients/[id]/communications/log — add manual communication log
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = requireAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const body = await req.json();
    const { body: messageBody, direction, subject } = body;

    if (!messageBody) {
      return NextResponse.json({ error: 'Body text is required.' }, { status: 400 });
    }

    const log = await prisma.communicationLog.create({
      data: {
        client_id: params.id,
        source: 'MANUAL',
        direction: (direction as CommsDirection) || 'INBOUND',
        body: messageBody,
        subject: subject || null,
        received_at: new Date(),
        message_id: `manual-${randomUUID()}`,
        attachments: [],
        action_items: [],
      },
    });

    // Update last_communication_at
    await prisma.client.update({
      where: { id: params.id },
      data: { last_communication_at: new Date() },
    });

    return NextResponse.json(log, { status: 201 });
  } catch (error) {
    console.error('communications log error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
