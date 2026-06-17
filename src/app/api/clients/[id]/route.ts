import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { PipelineStage } from '@prisma/client';

export const dynamic = 'force-dynamic';

// GET /api/clients/[id]
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = requireAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const client = await prisma.client.findUnique({
      where: { id: params.id },
      include: {
        interactions: {
          orderBy: { date: 'desc' },
          include: { creator: { select: { id: true, name: true, avatar_url: true } } },
        },
        communication_logs: {
          orderBy: { received_at: 'desc' },
          take: 50,
        },
        client_insights: {
          orderBy: { created_at: 'desc' },
          take: 10,
        },
        projects: {
          select: { id: true, name: true, status: true },
          orderBy: { created_at: 'desc' },
        },
      },
    });

    if (!client) return NextResponse.json({ error: 'Client not found.' }, { status: 404 });

    return NextResponse.json(client);
  } catch (error) {
    console.error('GET client detail error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}

// PUT /api/clients/[id]
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = requireAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const body = await req.json();
    const { name, email, phone, company, pipeline_stage, source, value, notes } = body;

    const client = await prisma.client.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone }),
        ...(company !== undefined && { company }),
        ...(pipeline_stage !== undefined && { pipeline_stage: pipeline_stage as PipelineStage }),
        ...(source !== undefined && { source }),
        ...(value !== undefined && { value: value ? Number(value) : null }),
        ...(notes !== undefined && { notes }),
      },
    });

    const io = (globalThis as { io?: { emit: (event: string, data: unknown) => void } }).io;
    if (io) io.emit('clients:update', { action: 'update', clientId: client.id });

    return NextResponse.json(client);
  } catch (error) {
    console.error('PUT client error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}

// DELETE /api/clients/[id] — hard delete (cascade handles relations)
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = requireAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    await prisma.client.delete({ where: { id: params.id } });

    const io = (globalThis as { io?: { emit: (event: string, data: unknown) => void } }).io;
    if (io) io.emit('clients:update', { action: 'delete', clientId: params.id });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE client error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
