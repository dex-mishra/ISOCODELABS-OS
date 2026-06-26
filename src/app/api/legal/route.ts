import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { createAndBroadcastNotification } from '@/lib/realtime/notifications';

export const dynamic = 'force-dynamic';

// GET /api/legal — list all legal documents
export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const client_id = searchParams.get('client_id');
    const project_id = searchParams.get('project_id');
    const employee_id = searchParams.get('employee_id');
    const search = searchParams.get('search');

    // 1. Check for documents expiring within 30 days and trigger notifications
    try {
      const now = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(now.getDate() + 30);

      const expiringDocs = await prisma.legalDocument.findMany({
        where: {
          expiry_date: {
            gte: now,
            lte: thirtyDaysFromNow,
          },
          status: { not: 'EXPIRED' }
        }
      });

      if (expiringDocs.length > 0) {
        const allUsers = await prisma.user.findMany();
        for (const doc of expiringDocs) {
          const link = `/legal?id=${doc.id}`;
          for (const u of allUsers) {
            const existing = await prisma.notification.findFirst({
              where: {
                user_id: u.id,
                type: 'LEGAL_EXPIRY',
                link: link
              }
            });
            if (!existing) {
              await createAndBroadcastNotification(u.id, {
                title: 'Document Expiring Soon',
                body: `The document "${doc.title}" is expiring on ${doc.expiry_date ? new Date(doc.expiry_date).toLocaleDateString() : 'soon'}.`,
                type: 'LEGAL_EXPIRY',
                link: link
              });
            }
          }
        }
      }
    } catch (notificationError) {
      console.error('Error checking expiring documents/sending notifications:', notificationError);
    }

    const where: any = {};

    if (type) where.type = type;
    if (status) where.status = status;
    if (client_id) where.client_id = client_id;
    if (project_id) where.project_id = project_id;
    if (employee_id) where.employee_id = employee_id;
    
    if (search?.trim()) {
      where.OR = [
        { title: { contains: search.trim(), mode: 'insensitive' } },
        { tags: { hasSome: [search.trim()] } },
      ];
    }

    const documents = await prisma.legalDocument.findMany({
      where,
      include: {
        client: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
        employee: { select: { id: true, name: true } },
      },
      orderBy: { created_at: 'desc' },
    });

    return NextResponse.json(documents);
  } catch (error) {
    console.error('GET legal documents error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}

// POST /api/legal — create a new legal document
export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const body = await req.json();
    const { title, type, file_url, client_id, project_id, employee_id, status, signed_date, expiry_date, tags } = body;

    if (!title?.trim() || !type || !file_url?.trim()) {
      return NextResponse.json({ error: 'Title, Type, and File URL are required.' }, { status: 400 });
    }
    const document = await prisma.legalDocument.create({
      data: {
        title: title.trim(),
        type,
        file_url: file_url.trim(),
        client_id: client_id || null,
        project_id: project_id || null,
        employee_id: employee_id || null,
        status: status || 'DRAFT',
        signed_date: signed_date ? new Date(signed_date) : null,
        expiry_date: expiry_date ? new Date(expiry_date) : null,
        version: 1,
        tags: tags || [],
        versions: '[]',
      },
      include: {
        client: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
        employee: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    console.error('POST legal document error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}

