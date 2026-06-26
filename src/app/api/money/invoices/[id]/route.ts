import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { InvoiceStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

// Valid status transitions: DRAFT -> SENT -> PAID, and any status -> OVERDUE
const VALID_STATUS_TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  DRAFT: ['SENT', 'OVERDUE'],
  SENT: ['PAID', 'OVERDUE'],
  PAID: ['OVERDUE'],
  OVERDUE: ['SENT', 'PAID'], // Allow recovery from overdue
};

// GET /api/money/invoices/[id] — fetch single invoice
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = requireAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const { id } = params;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        client: { select: { id: true, name: true, email: true, company: true } },
        project: { select: { id: true, name: true } },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found.' }, { status: 404 });
    }

    return NextResponse.json(invoice);
  } catch (error) {
    console.error('GET invoice error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}

// PATCH /api/money/invoices/[id] — update invoice
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = requireAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const { id } = params;

    const existing = await prisma.invoice.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Invoice not found.' }, { status: 404 });
    }

    const body = await req.json();
    const { status, amount, total, items, client_id, project_id, issue_date, due_date, file_url } = body;

    // Validate status transition if status is being changed
    if (status && status !== existing.status) {
      const allowedTransitions = VALID_STATUS_TRANSITIONS[existing.status];
      if (!allowedTransitions.includes(status as InvoiceStatus)) {
        return NextResponse.json(
          {
            error: `Invalid status transition from "${existing.status}" to "${status}". Allowed: ${allowedTransitions.join(', ')}.`,
          },
          { status: 400 }
        );
      }
    }

    const invoice = await prisma.invoice.update({
      where: { id },
      data: {
        ...(status ? { status: status as InvoiceStatus } : {}),
        ...(amount !== undefined ? { amount: Number(amount) } : {}),
        ...(total !== undefined ? { total: Number(total) } : {}),
        ...(items !== undefined ? { items } : {}),
        ...(client_id !== undefined ? { client_id: client_id || null } : {}),
        ...(project_id !== undefined ? { project_id: project_id || null } : {}),
        ...(issue_date ? { issue_date: new Date(issue_date) } : {}),
        ...(due_date ? { due_date: new Date(due_date) } : {}),
        ...(file_url !== undefined ? { file_url: file_url || null } : {}),
      },
      include: {
        client: { select: { id: true, name: true, email: true, company: true } },
        project: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(invoice);
  } catch (error) {
    console.error('PATCH invoice error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}

// DELETE /api/money/invoices/[id] — delete invoice
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = requireAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const { id } = params;

    const existing = await prisma.invoice.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Invoice not found.' }, { status: 404 });
    }

    await prisma.invoice.delete({ where: { id } });

    return NextResponse.json({ message: 'Invoice deleted successfully.' });
  } catch (error) {
    console.error('DELETE invoice error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
