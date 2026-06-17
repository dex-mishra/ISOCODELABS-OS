import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = requireAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: 'Account ID is required.' }, { status: 400 });
    }

    const account = await prisma.dashboardAccount.findUnique({
      where: { id }
    });

    if (!account) {
      return NextResponse.json({ error: 'Account not found.' }, { status: 404 });
    }

    await prisma.dashboardAccount.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Account successfully disconnected.' });
  } catch (error) {
    console.error('DELETE dashboard account error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while deleting the account.' },
      { status: 500 }
    );
  }
}
