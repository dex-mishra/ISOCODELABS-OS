import { prisma } from '../db/prisma';

/**
 * Creates an INCOME transaction when a project is completed.
 * Idempotent: will not create a duplicate for the same project completion.
 * Returns the amount added, or null if nothing was added.
 */
export async function addProjectCompletionIncome(projectId: string): Promise<number | null> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, name: true, budget: true, client_id: true, industry_id: true },
  });

  if (!project || !project.budget || project.budget <= 0) {
    return null;
  }

  const description = `Project completed: ${project.name}`;

  // Idempotency check — don't double-add for the same project completion
  const existing = await prisma.transaction.findFirst({
    where: {
      project_id: project.id,
      type: 'INCOME',
      description,
    },
  });
  if (existing) return null;

  await prisma.transaction.create({
    data: {
      project_id: project.id,
      client_id: project.client_id || null,
      industry_id: project.industry_id || null,
      amount: project.budget,
      type: 'INCOME',
      category: 'Product Revenue',
      date: new Date(),
      description,
    },
  });

  return project.budget;
}

/**
 * Creates an INCOME transaction when a client is won (moved to ACTIVE).
 * Idempotent by client + description.
 * Returns the amount added, or null if nothing was added.
 */
export async function addClientWonIncome(clientId: string): Promise<number | null> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { id: true, name: true, value: true, industry_id: true },
  });

  if (!client || !client.value || client.value <= 0) {
    return null;
  }

  const description = `Client closed: ${client.name}`;

  const existing = await prisma.transaction.findFirst({
    where: {
      client_id: client.id,
      type: 'INCOME',
      description,
    },
  });
  if (existing) return null;

  await prisma.transaction.create({
    data: {
      client_id: client.id,
      industry_id: client.industry_id || null,
      amount: client.value,
      type: 'INCOME',
      category: 'Client Payment',
      date: new Date(),
      description,
    },
  });

  return client.value;
}
