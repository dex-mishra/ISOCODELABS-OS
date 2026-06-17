import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const folderId = searchParams.get('folder_id');
    const search = searchParams.get('search');

    const whereClause: Prisma.WorkspacePageWhereInput = {
      is_deleted: false
    };

    if (folderId) {
      whereClause.folder_id = folderId === 'root' ? null : folderId;
    }

    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: 'insensitive' } }
      ];
    }

    const pages = await prisma.workspacePage.findMany({
      where: whereClause,
      select: {
        id: true,
        title: true,
        icon: true,
        folder_id: true,
        updated_at: true,
      },
      orderBy: { updated_at: 'desc' }
    });

    return NextResponse.json(pages);
  } catch (error: any) {
    console.error('Pages GET error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { title, folder_id, icon } = await req.json();

    if (!title) {
      return NextResponse.json({ error: 'Page title is required.' }, { status: 400 });
    }

    const defaultContent = {
      type: 'doc',
      content: []
    };

    const page = await prisma.workspacePage.create({
      data: {
        title,
        folder_id: folder_id || null,
        icon: icon || null,
        content: defaultContent,
        created_by: user.id,
        last_edited_by: user.id
      }
    });

    return NextResponse.json(page, { status: 201 });
  } catch (error: any) {
    console.error('Pages POST error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
