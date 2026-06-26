import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';

// DELETE /api/settings/keys/[id] — Revoke a key
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = requireAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const id = params.id;

    // Check if key exists and belongs to current user
    const key = await prisma.mcpApiKey.findUnique({
      where: { id },
      select: { created_by: true },
    });

    if (!key) {
      return NextResponse.json({ error: 'API Key not found.' }, { status: 404 });
    }

    if (key.created_by !== user.id) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
    }

    // Revoke key by setting is_active=false and revoked_at=now
    const updatedKey = await prisma.mcpApiKey.update({
      where: { id },
      data: {
        is_active: false,
        revoked_at: new Date(),
      },
      select: {
        id: true,
        name: true,
        is_active: true,
        revoked_at: true,
      },
    });

    return NextResponse.json(updatedKey);
  } catch (error) {
    console.error('DELETE /api/settings/keys/[id] error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
