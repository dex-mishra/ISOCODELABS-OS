import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { WHATSAPP_VERIFY_TOKEN } from '@/lib/integrations/whatsapp';

export const dynamic = 'force-dynamic';

// GET — webhook verification challenge from Meta
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

// POST — incoming webhook event from Meta
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Standard WhatsApp Business API webhook structure
    const entry = body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const messageData = changes?.value;

    if (!messageData?.messages?.length) {
      return NextResponse.json({ status: 'ok' });
    }

    for (const message of messageData.messages) {
      const fromPhone = message.from;

      // Find which client this phone belongs to
      const phoneSettings = await prisma.setting.findMany({
        where: { key: { startsWith: 'client_whatsapp_phone_' } },
      });

      let clientId: string | null = null;
      for (const setting of phoneSettings) {
        const normalizedStored = setting.value.replace(/\D/g, '');
        const normalizedFrom = fromPhone.replace(/\D/g, '');
        if (
          normalizedStored.includes(normalizedFrom) ||
          normalizedFrom.includes(normalizedStored)
        ) {
          clientId = setting.key.replace('client_whatsapp_phone_', '');
          break;
        }
      }

      if (!clientId) continue;

      // Deduplicate and store
      const existing = await prisma.communicationLog.findUnique({
        where: { message_id: message.id },
      });

      if (!existing) {
        await prisma.communicationLog.create({
          data: {
            client_id: clientId,
            source: 'WHATSAPP',
            direction: 'INBOUND',
            body: message.text?.body || `[${message.type} message]`,
            sender_phone: fromPhone,
            received_at: new Date(Number(message.timestamp) * 1000),
            message_id: message.id,
            attachments: [],
            action_items: [],
          },
        });

        await prisma.client.update({
          where: { id: clientId },
          data: {
            last_communication_at: new Date(),
            total_whatsapp_messages: { increment: 1 },
          },
        });
      }
    }

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('WhatsApp webhook error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
