import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { InvoiceStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

// GET /api/money/invoices — list with filters
export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const clientId = searchParams.get('client_id');
    const projectId = searchParams.get('project_id');
    const search = searchParams.get('search');

    const invoices = await prisma.invoice.findMany({
      where: {
        ...(status ? { status: status as InvoiceStatus } : {}),
        ...(clientId ? { client_id: clientId } : {}),
        ...(projectId ? { project_id: projectId } : {}),
        ...(search
          ? {
              OR: [
                { invoice_number: { contains: search, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      },
      include: {
        client: { select: { id: true, name: true, email: true, company: true } },
        project: { select: { id: true, name: true } },
      },
      orderBy: { issue_date: 'desc' },
    });

    return NextResponse.json(invoices);
  } catch (error) {
    console.error('GET invoices error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}

// POST /api/money/invoices — create invoice
export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const body = await req.json();
    const { invoice_number, amount, total, items, client_id, project_id, issue_date, due_date } = body;

    if (!invoice_number || amount === undefined || amount === null || !issue_date || !due_date) {
      return NextResponse.json(
        { error: 'invoice_number, amount, issue_date, and due_date are required.' },
        { status: 400 }
      );
    }

    // Check for duplicate invoice number
    const duplicate = await prisma.invoice.findUnique({
      where: { invoice_number },
    });
    if (duplicate) {
      return NextResponse.json(
        { error: `Invoice number "${invoice_number}" already exists.` },
        { status: 409 }
      );
    }

    const invoice = await prisma.invoice.create({
      data: {
        invoice_number,
        amount: Number(amount),
        total: total !== undefined ? Number(total) : Number(amount),
        items: items || [],
        status: 'DRAFT',
        issue_date: new Date(issue_date),
        due_date: new Date(due_date),
        client_id: client_id || null,
        project_id: project_id || null,
      },
      include: {
        client: { select: { id: true, name: true, email: true, company: true } },
        project: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    console.error('POST invoices error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
