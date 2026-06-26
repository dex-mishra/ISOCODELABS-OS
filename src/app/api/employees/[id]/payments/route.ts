import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { createAndBroadcastNotification } from '@/lib/realtime/notifications';

// POST /api/employees/[id]/payments — record a new payment for an employee
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = requireAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const employee = await prisma.employee.findUnique({
      where: { id: params.id },
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found.' }, { status: 404 });
    }

    const body = await req.json();
    const { hours_worked, amount, status, payment_date, period, notes } = body;

    if (hours_worked === undefined || amount === undefined) {
      return NextResponse.json({ error: 'Hours worked and Payment amount are required.' }, { status: 400 });
    }

    const payment = await prisma.employeePayment.create({
      data: {
        employee_id: params.id,
        hours_worked: parseFloat(hours_worked),
        payment_amount: parseFloat(amount),
        amount: parseFloat(amount),
        status: status || 'PENDING',
        payment_date: payment_date ? new Date(payment_date) : null,
        period: period || '',
        notes: notes || null,
      },
    });

    // Send notifications and create transactions based on status
    try {
      const allUsers = await prisma.user.findMany();
      if (payment.status === 'PENDING') {
        for (const u of allUsers) {
          await createAndBroadcastNotification(u.id, {
            title: 'Employee Payment Pending',
            body: `A payment of ₹${payment.amount} is due for ${employee.name} (${payment.period}).`,
            type: 'PAYMENT_DUE',
            link: '/employees'
          });
        }
      } else if (payment.status === 'PAID') {
        // Create an EXPENSE transaction
        await prisma.transaction.create({
          data: {
            amount: payment.amount,
            type: 'EXPENSE',
            category: 'Employee Payment',
            date: payment.payment_date || new Date(),
            description: `Payment to employee ${employee.name} for period ${payment.period}`,
          }
        });

        for (const u of allUsers) {
          await createAndBroadcastNotification(u.id, {
            title: 'Employee Payment Recorded',
            body: `A payment of ₹${payment.amount} was recorded for ${employee.name} (${payment.period}).`,
            type: 'PAYMENT_RECORDED',
            link: '/employees'
          });
        }
      }
    } catch (notificationError) {
      console.error('Error in post-payment triggers (notification/transaction):', notificationError);
    }

    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    console.error('POST employee payment error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}

