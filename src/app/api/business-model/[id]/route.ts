import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

// GET /api/business-model/[id]
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = requireAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const model = await prisma.businessModel.findUnique({
      where: { id: params.id },
      include: {
        industry: { select: { id: true, name: true, icon: true, color: true } },
      },
    });

    if (!model) return NextResponse.json({ error: 'Business model not found.' }, { status: 404 });

    return NextResponse.json(model);
  } catch (error) {
    console.error('GET business-model detail error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}

// PATCH /api/business-model/[id] — partial update
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = requireAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const existing = await prisma.businessModel.findUnique({
      where: { id: params.id },
    });

    if (!existing) return NextResponse.json({ error: 'Business model not found.' }, { status: 404 });

    const body = await req.json();
    const { canvas_data, architecture_notes, revenue_model, industry_id } = body;

    const model = await prisma.businessModel.update({
      where: { id: params.id },
      data: {
        ...(canvas_data !== undefined && { canvas_data }),
        ...(architecture_notes !== undefined && { architecture_notes }),
        ...(revenue_model !== undefined && { revenue_model }),
        ...(industry_id !== undefined && { industry_id: industry_id || null }),
      },
      include: {
        industry: { select: { id: true, name: true, icon: true, color: true } },
      },
    });

    return NextResponse.json(model);
  } catch (error) {
    console.error('PATCH business-model error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}

// DELETE /api/business-model/[id]
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = requireAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const existing = await prisma.businessModel.findUnique({
      where: { id: params.id },
    });

    if (!existing) return NextResponse.json({ error: 'Business model not found.' }, { status: 404 });

    await prisma.businessModel.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE business-model error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
