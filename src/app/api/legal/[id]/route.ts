import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';

// GET /api/legal/[id] — get a specific legal document
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = requireAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const document = await prisma.legalDocument.findUnique({
      where: { id: params.id },
      include: {
        client: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found.' }, { status: 404 });
    }

    return NextResponse.json(document);
  } catch (error) {
    console.error('GET legal document by id error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}

// PATCH /api/legal/[id] — update a legal document (or upload new version)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = requireAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const currentDoc = await prisma.legalDocument.findUnique({
      where: { id: params.id },
    });

    if (!currentDoc) {
      return NextResponse.json({ error: 'Document not found.' }, { status: 404 });
    }

    const body = await req.json();
    const { title, type, file_url, client_id, project_id, status, signed_date, expiry_date, tags } = body;

    const data: any = {};
    if (title !== undefined) data.title = title.trim();
    if (type !== undefined) data.type = type;
    if (client_id !== undefined) data.client_id = client_id || null;
    if (project_id !== undefined) data.project_id = project_id || null;
    if (status !== undefined) data.status = status;
    if (signed_date !== undefined) data.signed_date = signed_date ? new Date(signed_date) : null;
    if (expiry_date !== undefined) data.expiry_date = expiry_date ? new Date(expiry_date) : null;
    if (tags !== undefined) data.tags = tags;

    // Version history archiving if file_url changes
    if (file_url && file_url !== currentDoc.file_url) {
      let versionsArray: any[] = [];
      try {
        versionsArray = JSON.parse((currentDoc.versions as string) || '[]');
      } catch (e) {
        versionsArray = [];
      }

      versionsArray.push({
        version: currentDoc.version,
        file_url: currentDoc.file_url,
        created_at: currentDoc.updated_at || new Date().toISOString(),
      });

      data.file_url = file_url;
      data.version = currentDoc.version + 1;
      data.versions = JSON.stringify(versionsArray);
    }

    const updatedDoc = await prisma.legalDocument.update({
      where: { id: params.id },
      data,
      include: {
        client: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(updatedDoc);
  } catch (error) {
    console.error('PATCH legal document error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}

// DELETE /api/legal/[id] — delete a legal document
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = requireAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    await prisma.legalDocument.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE legal document error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
