import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { PipelineStage } from '@prisma/client';

export const dynamic = 'force-dynamic';

  // GET /api/clients — list with filters
export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const stage = searchParams.get('pipeline_stage');
    const source = searchParams.get('source');
    const industryId = searchParams.get('industry_id');
    const ventureId = searchParams.get('venture_id');

    const clients = await prisma.client.findMany({
      where: {
        ...(stage ? { pipeline_stage: stage as PipelineStage } : {}),
        ...(source ? { source } : {}),
        ...(industryId ? { industry_id: industryId } : {}),
        ...(ventureId ? { venture_id: ventureId } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { company: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
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
        industry_id: true,
        industry: { select: { id: true, name: true, icon: true, color: true } },
      },
      orderBy: { created_at: 'desc' },
    });

    return NextResponse.json(clients);
  } catch (error) {
    console.error('GET clients error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}

// POST /api/clients — create client
export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const body = await req.json();
    const { name, email, phone, company, pipeline_stage, source, value, notes, industry_id } = body;

    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required.' }, { status: 400 });
    }

    const client = await prisma.client.create({
      data: {
        name,
        email,
        phone: phone || null,
        company: company || null,
        pipeline_stage: (pipeline_stage as PipelineStage) || 'LEAD',
        source: source || null,
        value: value ? Number(value) : null,
        notes: notes || null,
        industry_id: industry_id || null,
        created_by: user.id,
      },
      include: {
        industry: { select: { id: true, name: true, icon: true, color: true } },
      },
    });

    const io = (globalThis as { io?: { emit: (event: string, data: unknown) => void } }).io;
    if (io) io.emit('clients:update', { action: 'create', clientId: client.id });

    return NextResponse.json(client, { status: 201 });
  } catch (error) {
    console.error('POST clients error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
