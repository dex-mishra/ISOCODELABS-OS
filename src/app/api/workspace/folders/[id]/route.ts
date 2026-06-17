import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

async function isDescendant(parent_id: string, child_id: string): Promise<boolean> {
  let currentId = parent_id;
  while (currentId) {
    if (currentId === child_id) {
      return true;
    }
    const parent = await prisma.workspaceFolder.findUnique({
      where: { id: currentId },
      select: { parent_id: true }
    });
    currentId = parent?.parent_id || '';
  }
  return false;
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

async function getMaxChildDepth(folderId: string): Promise<number> {
  const children = await prisma.workspaceFolder.findMany({
    where: { parent_id: folderId },
    select: { id: true }
  });
  if (children.length === 0) {
    return 1;
  }
  let maxChildDepth = 0;
  for (const child of children) {
    const d = await getMaxChildDepth(child.id);
    if (d > maxChildDepth) {
      maxChildDepth = d;
    }
  }
  return maxChildDepth + 1;
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = requireAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { name, parent_id, icon } = await req.json();
    const folderId = params.id;

    if (!name) {
      return NextResponse.json({ error: 'Folder name is required.' }, { status: 400 });
    }

    if (parent_id) {
      if (parent_id === folderId) {
        return NextResponse.json({ error: 'Cannot move folder into itself.' }, { status: 400 });
      }
      
      const isCycle = await isDescendant(parent_id, folderId);
      if (isCycle) {
        return NextResponse.json({ error: 'Cannot move folder into its own descendant.' }, { status: 400 });
      }

      const parentDepth = await getFolderDepth(parent_id);
      const subtreeDepth = await getMaxChildDepth(folderId);
      if (parentDepth + subtreeDepth > 5) {
        return NextResponse.json({ error: 'Moving here would exceed the maximum nesting depth of 5.' }, { status: 400 });
      }
    }

    const updatedFolder = await prisma.workspaceFolder.update({
      where: { id: folderId },
      data: {
        name,
        parent_id: parent_id === undefined ? undefined : (parent_id || null),
        icon: icon === undefined ? undefined : (icon || null)
      }
    });

    return NextResponse.json(updatedFolder);
  } catch (error: any) {
    console.error('Folder PUT error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = requireAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const folderId = params.id;

    await prisma.workspaceFolder.delete({
      where: { id: folderId }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Folder DELETE error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
