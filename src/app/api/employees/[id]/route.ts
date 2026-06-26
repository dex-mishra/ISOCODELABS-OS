import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';

// GET /api/employees/[id] — get details of a specific employee
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = requireAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const employee = await prisma.employee.findUnique({
      where: { id: params.id },
      include: {
        tasks: {
          select: { id: true, title: true, status: true, priority: true, due_date: true },
          orderBy: { due_date: 'asc' },
        },
        projects: {
          select: { id: true, name: true, status: true },
        },
        payments: {
          orderBy: { created_at: 'desc' },
        },
        legal_documents: {
          orderBy: { created_at: 'desc' },
        },
      },
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found.' }, { status: 404 });
    }

    return NextResponse.json(employee);
  } catch (error) {
    console.error('GET employee by id error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}

// PATCH /api/employees/[id] — update employee profile
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = requireAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const body = await req.json();
    const { name, role, email, phone, skills, hourly_rate, availability, contract_start, contract_end, status, projectIds, taskIds } = body;

    const data: any = {};
    if (name !== undefined) data.name = name.trim();
    if (role !== undefined) data.role = role.trim();
    if (email !== undefined) data.email = email.trim();
    if (phone !== undefined) data.phone = phone || null;
    if (skills !== undefined) data.skills = skills;
    if (hourly_rate !== undefined) data.hourly_rate = parseFloat(hourly_rate);
    if (availability !== undefined) data.availability = availability;
    if (status !== undefined) data.status = status;
    if (contract_start !== undefined) data.contract_start = contract_start ? new Date(contract_start) : null;
    if (contract_end !== undefined) data.contract_end = contract_end ? new Date(contract_end) : null;

    // Handle project linkage: update many-to-many relationship
    if (projectIds !== undefined) {
      data.projects = {
        set: projectIds.map((id: string) => ({ id })),
      };
    }

    const updatedEmployee = await prisma.employee.update({
      where: { id: params.id },
      data,
      include: {
        tasks: { select: { id: true, status: true } },
        projects: { select: { id: true, name: true } },
        payments: { orderBy: { created_at: 'desc' } },
      },
    });

    // Handle task assignments if taskIds is provided
    if (taskIds !== undefined) {
      // Disconnect all current tasks assigned to this employee first
      await prisma.task.updateMany({
        where: { employee_id: params.id },
        data: { employee_id: null },
      });
      // Connect new tasks
      if (taskIds.length > 0) {
        await prisma.task.updateMany({
          where: { id: { in: taskIds } },
          data: { employee_id: params.id },
        });
      }
    }

    return NextResponse.json(updatedEmployee);
  } catch (error) {
    console.error('PATCH employee error:', error);
    // Handle unique constraint violation on email
    if ((error as { code?: string }).code === 'P2002') {
      return NextResponse.json({ error: 'An employee with this email already exists.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}

// DELETE /api/employees/[id] — delete employee profile
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = requireAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    await prisma.employee.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE employee error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
