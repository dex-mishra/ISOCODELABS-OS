import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { InteractionType } from '@prisma/client';

export const dynamic = 'force-dynamic';

// GET /api/clients/[id]/interactions
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = requireAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const interactions = await prisma.interaction.findMany({
      where: { client_id: params.id },
      orderBy: { date: 'desc' },
      include: { creator: { select: { id: true, name: true, avatar_url: true } } },
    });

    return NextResponse.json(interactions);
  } catch (error) {
    console.error('GET interactions error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}

// POST /api/clients/[id]/interactions
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = requireAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const body = await req.json();
    const { type, summary, details, date } = body;

    if (!summary) {
      return NextResponse.json({ error: 'Summary is required.' }, { status: 400 });
    }

    const interaction = await prisma.interaction.create({
      data: {
        client_id: params.id,
        type: (type as InteractionType) || 'NOTE',
        summary,
        details: details || null,
        date: date ? new Date(date) : new Date(),
        created_by: user.id,
      },
      include: { creator: { select: { id: true, name: true, avatar_url: true } } },
    });

    return NextResponse.json(interaction, { status: 201 });
  } catch (error) {
    console.error('POST interaction error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
