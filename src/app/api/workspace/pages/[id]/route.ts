import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = requireAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const page = await prisma.workspacePage.findFirst({
      where: {
        id: params.id,
        is_deleted: false
      }
    });

    if (!page) {
      return NextResponse.json({ error: 'Page not found.' }, { status: 404 });
    }

    return NextResponse.json(page);
  } catch (error: any) {
    console.error('Page GET error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = requireAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { title, content, icon } = await req.json();

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (icon !== undefined) updateData.icon = icon;
    updateData.last_edited_by = user.id;

    const updatedPage = await prisma.workspacePage.update({
      where: { id: params.id },
      data: updateData
    });

    return NextResponse.json(updatedPage);
  } catch (error: any) {
    console.error('Page PUT error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = requireAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const deletedPage = await prisma.workspacePage.update({
      where: { id: params.id },
      data: {
        is_deleted: true,
        last_edited_by: user.id
      }
    });

    return NextResponse.json({ success: true, id: deletedPage.id });
  } catch (error: any) {
    console.error('Page DELETE error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
