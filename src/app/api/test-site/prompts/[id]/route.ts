import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';

export async function GET(
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
      return NextResponse.json({ error: 'Prompt ID is required.' }, { status: 400 });
    }

    const result = await prisma.testResult.findUnique({
      where: { id }
    });

    if (!result) {
      return NextResponse.json({ error: 'Prompt result not found.' }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('GET test-site prompt details error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while fetching prompt status.' },
      { status: 500 }
    );
  }
}

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
      return NextResponse.json({ error: 'Prompt ID is required.' }, { status: 400 });
    }

    const result = await prisma.testResult.findUnique({
      where: { id }
    });

    if (!result) {
      return NextResponse.json({ error: 'Prompt result not found.' }, { status: 404 });
    }

    await prisma.testResult.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Prompt result deleted successfully.' });
  } catch (error) {
    console.error('DELETE test-site prompt error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while deleting prompt result.' },
      { status: 500 }
    );
  }
}
