import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { TaskStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = requireAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { id } = params;
    const body = await req.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json({ error: 'Status is required.' }, { status: 400 });
    }

    const task = await prisma.task.update({
      where: { id },
      data: {
        status: status as TaskStatus,
      },
    });

    // Broadcast socket event
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const io = (globalThis as any).io;
    if (io) {
      io.emit('tasks:update', { action: 'update', taskId: id });
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error('PATCH task status error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while updating the task status.' },
      { status: 500 }
    );
  }
}
