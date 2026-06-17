import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

export async function PUT(req: NextRequest) {
  try {
    const user = requireAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const body = await req.json();
    const { theme_mode, theme_accent_color, theme_density } = body;

    const updates = [
      { key: 'theme_mode', value: theme_mode },
      { key: 'theme_accent_color', value: theme_accent_color },
      { key: 'theme_density', value: theme_density },
    ];

    for (const update of updates) {
      if (update.value !== undefined && update.value !== null) {
        await prisma.setting.upsert({
          where: { key: update.key },
          update: { value: String(update.value) },
          create: {
            key: update.key,
            value: String(update.value),
            category: 'appearance',
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Theme preferences updated successfully.',
      theme: {
        theme_mode,
        theme_accent_color,
        theme_density,
      },
    });
  } catch (error) {
    console.error('PUT settings theme API error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while updating theme settings.' },
      { status: 500 }
    );
  }
}
