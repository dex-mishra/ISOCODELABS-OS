import { prisma } from '../db/prisma';

const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'isocodelabs-webhook-verify';

interface WhatsAppMessage {
  id: string;
  from: string;
  timestamp: string;
  type: string;
  text?: { body: string };
}

interface NormalizedWhatsApp {
  message_id: string;
  body: string;
  sender_phone: string;
  direction: 'INBOUND' | 'OUTBOUND';
  received_at: Date;
}

export { WHATSAPP_VERIFY_TOKEN };

/**
 * Fetch WhatsApp messages for a phone number using the Business Cloud API.
 * Returns empty with not_connected flag if env vars not set.
 */
export async function getWhatsAppMessages(
  phone: string
): Promise<{ messages: NormalizedWhatsApp[]; not_connected: boolean }> {
  const tokenSetting = await prisma.setting.findUnique({ where: { key: 'whatsapp_api_token' } });
  const phoneSetting = await prisma.setting.findUnique({ where: { key: 'whatsapp_phone_number_id' } });

  const token = tokenSetting?.value || process.env.WHATSAPP_API_TOKEN || '';
  const phoneId = phoneSetting?.value || process.env.WHATSAPP_PHONE_NUMBER_ID || '';

  if (!token || !phoneId) {
    return { messages: [], not_connected: true };
  }

  try {
    // Normalize phone to E.164 (strip non-digits, ensure starts with country code)
    const normalizedPhone = phone.replace(/\D/g, '');

    const res = await fetch(
      `https://graph.facebook.com/v18.0/${phoneId}/messages?status=received&limit=50`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!res.ok) {
      console.warn('WhatsApp fetch messages failed:', await res.text());
      return { messages: [], not_connected: false };
    }

    const data = await res.json();
    const rawMessages: WhatsAppMessage[] = data.messages || [];

    // Filter to only messages from/to this client phone
    const filtered = rawMessages.filter((m) =>
      m.from.replace(/\D/g, '').includes(normalizedPhone) ||
      normalizedPhone.includes(m.from.replace(/\D/g, ''))
    );

    const normalized: NormalizedWhatsApp[] = filtered.map((m) => ({
      message_id: m.id,
      body: m.text?.body || `[${m.type} message]`,
      sender_phone: m.from,
      direction: 'INBOUND',
      received_at: new Date(Number(m.timestamp) * 1000),
    }));

    return { messages: normalized, not_connected: false };
  } catch (error) {
    console.error('getWhatsAppMessages error:', error);
    return { messages: [], not_connected: false };
  }
}

/**
 * Upserts WhatsApp messages with dedup by message_id.
 * Returns count of new messages stored.
 */
export async function storeWhatsAppMessages(
  clientId: string,
  messages: NormalizedWhatsApp[]
): Promise<number> {
  let newCount = 0;

  for (const msg of messages) {
    try {
      const existing = await prisma.communicationLog.findUnique({
        where: { message_id: msg.message_id },
      });

      if (!existing) {
        await prisma.communicationLog.create({
          data: {
            client_id: clientId,
            source: 'WHATSAPP',
            direction: msg.direction,
            body: msg.body,
            sender_phone: msg.sender_phone,
            received_at: msg.received_at,
            message_id: msg.message_id,
            attachments: [],
            action_items: [],
          },
        });
        newCount++;
      }
    } catch (err) {
      console.error('storeWhatsAppMessages: error storing message', msg.message_id, err);
    }
  }

  if (newCount > 0) {
    await prisma.client.update({
      where: { id: clientId },
      data: {
        last_communication_at: new Date(),
        total_whatsapp_messages: { increment: newCount },
      },
    });
  }

  return newCount;
}

/**
 * Handles an inbound webhook message event. Stores the message if not already present.
 */
export async function handleInboundWebhook(clientId: string, message: WhatsAppMessage): Promise<void> {
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
        sender_phone: message.from,
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
