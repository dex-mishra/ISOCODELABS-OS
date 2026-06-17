import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

// GET /api/clients/pipeline — clients grouped by stage
export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const clients = await prisma.client.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        company: true,
        pipeline_stage: true,
        source: true,
        value: true,
        connected_gmail: true,
        connected_whatsapp: true,
        last_communication_at: true,
        created_at: true,
      },
      orderBy: { created_at: 'desc' },
    });

    const grouped: Record<string, typeof clients> = {
      LEAD: [],
      CONTACTED: [],
      PROPOSAL: [],
      NEGOTIATION: [],
      ACTIVE: [],
      CHURNED: [],
    };

    for (const client of clients) {
      grouped[client.pipeline_stage].push(client);
    }

    return NextResponse.json(grouped);
  } catch (error) {
    console.error('GET pipeline error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
