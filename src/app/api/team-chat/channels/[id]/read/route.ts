import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

// PATCH /api/team-chat/channels/[id]/read - mark channel as read for the user
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = requireAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const channelId = params.id;

    // Verify user is a member of the channel
    const membership = await prisma.channelMember.findUnique({
      where: {
        channel_id_user_id: {
          channel_id: channelId,
          user_id: user.id,
        },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: 'You are not a member of this channel.' },
        { status: 403 }
      );
    }

    // Update last_read_at to current timestamp
    await prisma.channelMember.update({
      where: {
        channel_id_user_id: {
          channel_id: channelId,
          user_id: user.id,
        },
      },
      data: {
        last_read_at: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PATCH /api/team-chat/channels/[id]/read error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while marking channel as read.' },
      { status: 500 }
    );
  }
}
