import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

// DELETE /api/ventures/[id]/assets/[assetId]
export async function DELETE(req: NextRequest, { params }: { params: { id: string; assetId: string } }) {
  try {
    const user = requireAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    await prisma.ventureAsset.delete({ where: { id: params.assetId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE venture asset error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
