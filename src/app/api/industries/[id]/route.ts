import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

// GET /api/industries/[id] — single industry with detail
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = requireAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const { id } = params;

    const industry = await prisma.industry.findUnique({
      where: { id },
      include: {
        products: {
          include: {
            _count: { select: { content_items: true } },
          },
        },
        clients: {
          select: {
            id: true,
            name: true,
            email: true,
            company: true,
            pipeline_stage: true,
            value: true,
          },
          orderBy: { created_at: 'desc' },
        },
        projects: {
          select: {
            id: true,
            name: true,
            status: true,
            budget: true,
            start_date: true,
            end_date: true,
            client: { select: { id: true, name: true } },
          },
          orderBy: { created_at: 'desc' },
        },
        _count: {
          select: { clients: true, projects: true, products: true },
        },
      },
    });

    if (!industry) return NextResponse.json({ error: 'Industry not found.' }, { status: 404 });

    return NextResponse.json(industry);
  } catch (error) {
    console.error('GET industry error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}

// PATCH /api/industries/[id] — update name/icon/color
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = requireAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const { id } = params;
    const body = await req.json();
    const { name, icon, color } = body;

    const updateData: { name?: string; icon?: string | null; color?: string | null } = {};
    if (name !== undefined) updateData.name = name.trim();
    if (icon !== undefined) updateData.icon = icon || null;
    if (color !== undefined) updateData.color = color || null;

    const updated = await prisma.industry.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('PATCH industry error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}

// DELETE /api/industries/[id] — delete industry (nullifies references)
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = requireAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const { id } = params;

    // Nullify industry_id on clients and projects before deleting
    await prisma.$transaction([
      prisma.client.updateMany({ where: { industry_id: id }, data: { industry_id: null } }),
      prisma.project.updateMany({ where: { industry_id: id }, data: { industry_id: null } }),
      prisma.industry.delete({ where: { id } }),
    ]);

    return NextResponse.json({ message: 'Industry deleted.' });
  } catch (error) {
    console.error('DELETE industry error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
