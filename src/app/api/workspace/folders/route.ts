import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    // Fetch all folders
    const folders = await prisma.workspaceFolder.findMany({
      include: {
        pages: {
          where: { is_deleted: false },
          select: {
            id: true,
            title: true,
            icon: true,
            updated_at: true,
          },
          orderBy: { updated_at: 'desc' }
        }
      }
    });

    // Construct the tree in-memory
    const folderMap = new Map();
    folders.forEach(f => {
      folderMap.set(f.id, { ...f, children: [] });
    });

    const rootFolders: any[] = [];
    folders.forEach(f => {
      const folderNode = folderMap.get(f.id);
      if (f.parent_id) {
        const parentNode = folderMap.get(f.parent_id);
        if (parentNode) {
          parentNode.children.push(folderNode);
        } else {
          rootFolders.push(folderNode);
        }
      } else {
        rootFolders.push(folderNode);
      }
    });

    return NextResponse.json(rootFolders);
  } catch (error: any) {
    console.error('Folders GET error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

async function getFolderDepth(folderId: string): Promise<number> {
  let depth = 1;
  let currentId = folderId;
  while (true) {
    const parent = await prisma.workspaceFolder.findUnique({
      where: { id: currentId },
      select: { parent_id: true }
    });
    if (!parent || !parent.parent_id) {
      break;
    }
    currentId = parent.parent_id;
    depth++;
  }
  return depth;
}

export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { name, parent_id, icon } = await req.json();

    if (!name) {
      return NextResponse.json({ error: 'Folder name is required.' }, { status: 400 });
    }

    if (parent_id) {
      const depth = await getFolderDepth(parent_id);
      if (depth >= 5) {
        return NextResponse.json({ error: 'Maximum folder nesting level (5) exceeded.' }, { status: 400 });
      }
    }

    const folder = await prisma.workspaceFolder.create({
      data: {
        name,
        parent_id: parent_id || null,
        icon: icon || null,
      }
    });

    return NextResponse.json(folder, { status: 201 });
  } catch (error: any) {
    console.error('Folders POST error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
