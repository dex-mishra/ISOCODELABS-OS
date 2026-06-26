import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

// GET /api/ventures — list all ventures with counts
export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const ventures = await prisma.venture.findMany({
      where: {
        ...(type ? { type } : {}),
        ...(status ? { status } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' as const } },
                { description: { contains: search, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      },
      include: {
        creator: { select: { id: true, name: true, email: true, avatar_url: true } },
        _count: {
          select: {
            tasks: true,
            projects: true,
            clients: true,
            meetings: true,
            assets: true,
            funding_rounds: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return NextResponse.json(ventures);
  } catch (error) {
    console.error('GET ventures error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}

// POST /api/ventures — create venture
export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const body = await req.json();
    const { name, description, type, status, website, logo_url } = body;

    if (!name || !type) {
      return NextResponse.json(
        { error: 'name and type are required.' },
        { status: 400 }
      );
    }

    if (!['PRODUCT', 'SISTER_COMPANY'].includes(type)) {
      return NextResponse.json(
        { error: 'type must be PRODUCT or SISTER_COMPANY.' },
        { status: 400 }
      );
    }

    const venture = await prisma.venture.create({
      data: {
        name,
        description: description || null,
        type,
        status: status || 'ACTIVE',
        website: website || null,
        logo_url: logo_url || null,
        created_by: user.id,
      },
      include: {
        creator: { select: { id: true, name: true, email: true, avatar_url: true } },
        _count: {
          select: {
            tasks: true,
            projects: true,
            clients: true,
            meetings: true,
            assets: true,
            funding_rounds: true,
          },
        },
      },
    });

    return NextResponse.json(venture, { status: 201 });
  } catch (error) {
    console.error('POST ventures error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
