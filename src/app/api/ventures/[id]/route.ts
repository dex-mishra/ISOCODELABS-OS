import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

// GET /api/ventures/[id] — single venture with all relations
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = requireAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const venture = await prisma.venture.findUnique({
      where: { id: params.id },
      include: {
        creator: { select: { id: true, name: true, email: true, avatar_url: true } },
        assets: { orderBy: { created_at: 'desc' } },
        funding_rounds: { orderBy: { created_at: 'desc' } },
        _count: {
          select: {
            tasks: true,
            projects: true,
            clients: true,
            meetings: true,
            business_models: true,
          },
        },
      },
    });

    if (!venture) {
      return NextResponse.json({ error: 'Venture not found.' }, { status: 404 });
    }

    return NextResponse.json(venture);
  } catch (error) {
    console.error('GET venture error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}

// PATCH /api/ventures/[id] — update venture
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = requireAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const body = await req.json();
    const { name, description, type, status, website, logo_url } = body;

    const venture = await prisma.venture.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(type !== undefined ? { type } : {}),
        ...(status !== undefined ? { status } : {}),
        ...(website !== undefined ? { website } : {}),
        ...(logo_url !== undefined ? { logo_url } : {}),
      },
      include: {
        creator: { select: { id: true, name: true, email: true, avatar_url: true } },
        assets: { orderBy: { created_at: 'desc' } },
        funding_rounds: { orderBy: { created_at: 'desc' } },
        _count: {
          select: {
            tasks: true,
            projects: true,
            clients: true,
            meetings: true,
            business_models: true,
          },
        },
      },
    });

    return NextResponse.json(venture);
  } catch (error) {
    console.error('PATCH venture error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}

// DELETE /api/ventures/[id]
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = requireAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    await prisma.venture.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE venture error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
