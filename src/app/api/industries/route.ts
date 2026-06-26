import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

// GET /api/industries — list all industries with counts
export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const industries = await prisma.industry.findMany({
      orderBy: { name: 'asc' },
      include: {
        products: {
          select: { id: true, name: true },
        },
        _count: {
          select: {
            clients: true,
            projects: true,
            products: true,
          },
        },
      },
    });

    return NextResponse.json(industries);
  } catch (error) {
    console.error('GET industries error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}

// POST /api/industries — create a new industry
export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const body = await req.json();
    const { name, icon, color } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required.' }, { status: 400 });
    }

    const industry = await prisma.industry.create({
      data: {
        name: name.trim(),
        icon: icon || null,
        color: color || null,
      },
      include: {
        _count: {
          select: { clients: true, projects: true, products: true },
        },
        products: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(industry, { status: 201 });
  } catch (error) {
    console.error('POST industry error:', error);
    // Handle unique constraint violation
    if ((error as { code?: string }).code === 'P2002') {
      return NextResponse.json({ error: 'An industry with that name already exists.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
