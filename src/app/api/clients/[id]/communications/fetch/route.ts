import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { getGmailMessages, storeGmailMessages } from '@/lib/integrations/gmail';
import { getWhatsAppMessages, storeWhatsAppMessages } from '@/lib/integrations/whatsapp';

export const dynamic = 'force-dynamic';

// POST /api/clients/[id]/communications/fetch
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = requireAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const body = await req.json();
    const { start_date, end_date } = body;

    const startDate = start_date ? new Date(start_date) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const endDate = end_date ? new Date(end_date) : new Date();

    const client = await prisma.client.findUnique({
      where: { id: params.id },
      select: { id: true, email: true, connected_gmail: true, connected_whatsapp: true },
    });

    if (!client) return NextResponse.json({ error: 'Client not found.' }, { status: 404 });

    const results = { gmail_fetched: 0, whatsapp_fetched: 0, gmail_not_connected: false, whatsapp_not_connected: false };

    // Fetch Gmail if connected
    if (client.connected_gmail) {
      const gmailSetting = await prisma.setting.findUnique({
        where: { key: `client_gmail_${params.id}` },
      });
      const trackedEmail = gmailSetting?.value || client.email;

      const { messages, not_connected } = await getGmailMessages(trackedEmail, user.id, startDate, endDate);
      results.gmail_not_connected = not_connected;
      if (messages.length > 0) {
        results.gmail_fetched = await storeGmailMessages(params.id, messages);
      }
    }

    // Fetch WhatsApp if connected
    if (client.connected_whatsapp) {
      const waSetting = await prisma.setting.findUnique({
        where: { key: `client_whatsapp_phone_${params.id}` },
      });

      if (waSetting?.value) {
        const { messages, not_connected } = await getWhatsAppMessages(waSetting.value);
        results.whatsapp_not_connected = not_connected;
        if (messages.length > 0) {
          results.whatsapp_fetched = await storeWhatsAppMessages(params.id, messages);
        }
      }
    }

    // Return combined timeline from DB for the date range
    const logs = await prisma.communicationLog.findMany({
      where: {
        client_id: params.id,
        received_at: { gte: startDate, lte: endDate },
      },
      orderBy: { received_at: 'desc' },
    });

    return NextResponse.json({
      logs,
      fetched: results,
      total: logs.length,
    });
  } catch (error) {
    console.error('communications fetch error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
