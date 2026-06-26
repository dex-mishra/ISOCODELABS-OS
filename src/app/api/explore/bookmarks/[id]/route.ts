import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';

// DELETE /api/explore/bookmarks/[id] — remove bookmark
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = requireAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const id = params.id;

    // Fetch details before deleting to emit proper socket notifications
    const bookmark = await prisma.exploreBookmark.findUnique({
      where: { id },
      select: { resource_id: true, user_id: true },
    });

    if (!bookmark) {
      return NextResponse.json({ error: 'Bookmark not found.' }, { status: 404 });
    }

    if (bookmark.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized to delete this bookmark.' }, { status: 403 });
    }

    await prisma.exploreBookmark.delete({
      where: { id },
    });

    // Emit socket update
    const io = (globalThis as any).io;
    if (io) {
      io.emit('explore:update', { action: 'bookmark_change', resourceId: bookmark.resource_id });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/explore/bookmarks/[id] error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
