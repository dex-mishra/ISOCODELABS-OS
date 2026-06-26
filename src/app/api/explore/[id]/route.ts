import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';

// PATCH /api/explore/[id] — update resource
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = requireAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const id = params.id;
    const body = await req.json();
    const { is_read, topic, title, tags } = body;

    const resource = await prisma.exploreResource.update({
      where: { id },
      data: {
        ...(is_read !== undefined && { is_read }),
        ...(topic !== undefined && { topic }),
        ...(title !== undefined && { title }),
        ...(tags !== undefined && { tags }),
      },
      include: {
        industry: { select: { id: true, name: true, icon: true, color: true } },
        bookmarks: {
          where: { user_id: user.id },
        },
      },
    });

    // Emit socket update
    const io = (globalThis as any).io;
    if (io) {
      io.emit('explore:update', { action: 'update', resourceId: id });
    }

    return NextResponse.json(resource);
  } catch (error) {
    console.error('PATCH /api/explore/[id] error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}

// DELETE /api/explore/[id] — delete resource
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = requireAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const id = params.id;

    await prisma.exploreResource.delete({
      where: { id },
    });

    // Emit socket update
    const io = (globalThis as any).io;
    if (io) {
      io.emit('explore:update', { action: 'delete', resourceId: id });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/explore/[id] error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
