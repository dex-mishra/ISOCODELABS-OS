import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

// GET /api/employees — list all employees
export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const employees = await prisma.employee.findMany({
      orderBy: { name: 'asc' },
      include: {
        tasks: {
          select: { id: true, status: true },
        },
        projects: {
          select: { id: true, name: true, status: true },
        },
        _count: {
          select: { payments: true },
        },
      },
    });

    return NextResponse.json(employees);
  } catch (error) {
    console.error('GET employees error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}

// POST /api/employees — create a new employee profile
export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const body = await req.json();
    const { name, role, email, phone, skills, hourly_rate, availability, contract_start, contract_end, status } = body;

    if (!name?.trim() || !role?.trim() || !email?.trim() || hourly_rate === undefined) {
      return NextResponse.json({ error: 'Name, Role, Email, and Hourly Rate are required.' }, { status: 400 });
    }

    // Check unique email
    const existing = await prisma.employee.findUnique({ where: { email: email.trim() } });
    if (existing) {
      return NextResponse.json({ error: 'An employee with this email already exists.' }, { status: 409 });
    }

    const employee = await prisma.employee.create({
      data: {
        name: name.trim(),
        role: role.trim(),
        email: email.trim(),
        phone: phone || null,
        skills: skills || [],
        hourly_rate: parseFloat(hourly_rate),
        availability: availability || 'Full-time',
        status: status || 'ACTIVE',
        contract_start: contract_start ? new Date(contract_start) : null,
        contract_end: contract_end ? new Date(contract_end) : null,
      },
      include: {
        tasks: { select: { id: true, status: true } },
        projects: { select: { id: true, name: true } },
        _count: { select: { payments: true } },
      },
    });

    return NextResponse.json(employee, { status: 201 });
  } catch (error) {
    console.error('POST employee error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
