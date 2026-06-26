import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { PipelineStage } from '@prisma/client';
import { addClientWonIncome } from '@/lib/money/auto-income';

export const dynamic = 'force-dynamic';

// Valid pipeline transitions
const VALID_TRANSITIONS: Record<PipelineStage, PipelineStage[]> = {
  LEAD: ['CONTACTED', 'CHURNED'],
  CONTACTED: ['PROPOSAL', 'CHURNED'],
  PROPOSAL: ['NEGOTIATION', 'CHURNED'],
  NEGOTIATION: ['ACTIVE', 'CHURNED'],
  ACTIVE: ['CHURNED'],
  CHURNED: ['LEAD'],
};

// PATCH /api/clients/[id]/pipeline
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = requireAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const body = await req.json();
    const { pipeline_stage: newStage } = body as { pipeline_stage: PipelineStage };

    if (!newStage) {
      return NextResponse.json({ error: 'pipeline_stage is required.' }, { status: 400 });
    }

    const client = await prisma.client.findUnique({
      where: { id: params.id },
      select: { id: true, pipeline_stage: true, name: true },
    });

    if (!client) return NextResponse.json({ error: 'Client not found.' }, { status: 404 });

    const allowed = VALID_TRANSITIONS[client.pipeline_stage] || [];
    if (!allowed.includes(newStage)) {
      return NextResponse.json(
        {
          error: `Invalid transition: ${client.pipeline_stage} → ${newStage}. Allowed: ${allowed.join(', ') || 'none'}.`,
        },
        { status: 400 }
      );
    }

    const updated = await prisma.client.update({
      where: { id: params.id },
      data: { pipeline_stage: newStage },
    });

    // Auto-add income when client is won (moved to ACTIVE)
    let incomeAdded: number | null = null;
    if (newStage === 'ACTIVE' && client.pipeline_stage !== 'ACTIVE') {
      incomeAdded = await addClientWonIncome(params.id);
    }

    const io = (globalThis as { io?: { emit: (event: string, data: unknown) => void } }).io;
    if (io) {
      io.emit('clients:update', { action: 'pipeline', clientId: updated.id, stage: newStage });
      if (incomeAdded) io.emit('money:update', { action: 'income', source: 'client', amount: incomeAdded });
    }

    // Trigger notification for all other users
    try {
      const { createAndBroadcastNotification } = require('@/lib/realtime/notifications');
      const otherUsers = await prisma.user.findMany({
        where: { id: { not: user.id } },
      });
      for (const u of otherUsers) {
        await createAndBroadcastNotification(u.id, {
          title: 'Client Stage Changed',
          body: `Client "${client.name}" has transitioned from ${client.pipeline_stage} to ${newStage}`,
          type: 'CLIENT_STAGE_CHANGED',
          link: `/clients`,
        });
      }
    } catch (err) {
      console.error('Failed to trigger client pipeline notification:', err);
    }

    return NextResponse.json({ ...updated, incomeAdded });
  } catch (error) {
    console.error('PATCH pipeline error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
