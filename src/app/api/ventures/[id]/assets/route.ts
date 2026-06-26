import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

// GET /api/ventures/[id]/assets
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = requireAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const assets = await prisma.ventureAsset.findMany({
      where: { venture_id: params.id },
      orderBy: { created_at: 'desc' },
    });

    return NextResponse.json(assets);
  } catch (error) {
    console.error('GET venture assets error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}

// POST /api/ventures/[id]/assets
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = requireAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const body = await req.json();
    const { type, label, url, notes } = body;

    if (!type || !label || !url) {
      return NextResponse.json(
        { error: 'type, label, and url are required.' },
        { status: 400 }
      );
    }

    const asset = await prisma.ventureAsset.create({
      data: {
        venture_id: params.id,
        type,
        label,
        url,
        notes: notes || null,
      },
    });

    return NextResponse.json(asset, { status: 201 });
  } catch (error) {
    console.error('POST venture assets error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
