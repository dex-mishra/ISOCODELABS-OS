import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

// GET /api/settings/keys — List user's keys
export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const keys = await prisma.mcpApiKey.findMany({
      where: { created_by: user.id },
      select: {
        id: true,
        name: true,
        is_active: true,
        permissions: true,
        last_used_at: true,
        revoked_at: true,
        created_at: true,
      },
      orderBy: { created_at: 'desc' },
    });

    return NextResponse.json(keys);
  } catch (error) {
    console.error('GET /api/settings/keys error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}

// POST /api/settings/keys — Generate a new API key
export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const body = await req.json();
    const { name, permissions } = body;

    if (!name) {
      return NextResponse.json({ error: 'Key name is required.' }, { status: 400 });
    }

    // Generate a secure random key
    const rawKey = `iso_ops_${crypto.randomBytes(24).toString('hex')}`;
    // Hash it for DB storage
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

    const keyRecord = await prisma.mcpApiKey.create({
      data: {
        name,
        key_hash: keyHash,
        permissions: permissions || [],
        created_by: user.id,
      },
      select: {
        id: true,
        name: true,
        is_active: true,
        permissions: true,
        created_at: true,
      },
    });

    // Return raw key ONCE along with the database record
    return NextResponse.json({
      rawKey,
      keyRecord,
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/settings/keys error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
