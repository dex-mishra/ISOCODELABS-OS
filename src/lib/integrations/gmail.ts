import { prisma } from '../db/prisma';
import { getGoogleAccessToken } from './google-meet';

interface GmailMessage {
  id: string;
  threadId: string;
  snippet: string;
  payload: {
    headers: Array<{ name: string; value: string }>;
    body?: { data?: string };
    parts?: Array<{ mimeType: string; body?: { data?: string } }>;
  };
  internalDate: string;
}

interface NormalizedEmail {
  message_id: string;
  subject: string;
  body: string;
  sender_email: string;
  direction: 'INBOUND' | 'OUTBOUND';
  received_at: Date;
  thread_id: string;
}

function decodeBase64(encoded: string): string {
  try {
    return Buffer.from(encoded.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
  } catch {
    return '';
  }
}

function extractBody(message: GmailMessage): string {
  // Try direct body first
  if (message.payload.body?.data) {
    return decodeBase64(message.payload.body.data);
  }
  // Try parts (multipart messages)
  const textPart = message.payload.parts?.find((p) => p.mimeType === 'text/plain');
  if (textPart?.body?.data) {
    return decodeBase64(textPart.body.data);
  }
  return message.snippet || '';
}

function getHeader(headers: Array<{ name: string; value: string }>, name: string): string {
  return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || '';
}

/**
 * Fetch Gmail messages related to a client email address.
 * Returns empty array with not_connected flag if no token or scope missing.
 */
export async function getGmailMessages(
  clientEmail: string,
  userId: string,
  since?: Date,
  until?: Date
): Promise<{ messages: NormalizedEmail[]; not_connected: boolean }> {
  try {
    const accessToken = await getGoogleAccessToken(userId);

    if (!accessToken || accessToken.startsWith('mock')) {
      return { messages: [], not_connected: true };
    }

    // Build query
    let query = `from:${clientEmail} OR to:${clientEmail}`;
    if (since) {
      const afterTs = Math.floor(since.getTime() / 1000);
      query += ` after:${afterTs}`;
    }
    if (until) {
      const beforeTs = Math.floor(until.getTime() / 1000);
      query += ` before:${beforeTs}`;
    }

    // List message IDs
    const listRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=50`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!listRes.ok) {
      console.warn('Gmail list messages failed:', await listRes.text());
      return { messages: [], not_connected: false };
    }

    const listData = await listRes.json();
    const messageRefs: Array<{ id: string }> = listData.messages || [];

    // Fetch full message details in parallel (limit to 20 for performance)
    const details = await Promise.allSettled(
      messageRefs.slice(0, 20).map(({ id }) =>
        fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: AbortSignal.timeout(8000),
        }).then((r) => r.json() as Promise<GmailMessage>)
      )
    );

    const normalized: NormalizedEmail[] = [];

    for (const result of details) {
      if (result.status !== 'fulfilled') continue;
      const msg = result.value;
      const headers = msg.payload?.headers || [];

      const from = getHeader(headers, 'From');
      const subject = getHeader(headers, 'Subject');
      const body = extractBody(msg);
      const isInbound = from.toLowerCase().includes(clientEmail.toLowerCase());

      normalized.push({
        message_id: msg.id,
        subject: subject || '(no subject)',
        body: body.slice(0, 2000),
        sender_email: from,
        direction: isInbound ? 'INBOUND' : 'OUTBOUND',
        received_at: new Date(Number(msg.internalDate)),
        thread_id: msg.threadId,
      });
    }

    return { messages: normalized, not_connected: false };
  } catch (error) {
    console.error('getGmailMessages error:', error);
    return { messages: [], not_connected: false };
  }
}

/**
 * Upserts Gmail messages into CommunicationLog with deduplication by message_id.
 * Returns count of new messages stored.
 */
export async function storeGmailMessages(
  clientId: string,
  messages: NormalizedEmail[]
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
            source: 'GMAIL',
            direction: msg.direction,
            subject: msg.subject,
            body: msg.body,
            sender_email: msg.sender_email,
            received_at: msg.received_at,
            thread_id: msg.thread_id,
            message_id: msg.message_id,
            attachments: [],
            action_items: [],
          },
        });
        newCount++;
      }
    } catch (err) {
      console.error('storeGmailMessages: error storing message', msg.message_id, err);
    }
  }

  if (newCount > 0) {
    await prisma.client.update({
      where: { id: clientId },
      data: {
        last_communication_at: new Date(),
        total_emails: { increment: newCount },
      },
    });
  }

  return newCount;
}
