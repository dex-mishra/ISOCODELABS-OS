import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing database...');

  // Team chat tables first (depend on User)
  await prisma.teamMessage.deleteMany({});
  await prisma.channelMember.deleteMany({});
  await prisma.teamChannel.deleteMany({});

  // Rest of deletions
  await prisma.meetingAttendee.deleteMany({});
  await prisma.subTask.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.meeting.deleteMany({});
  await prisma.chatMessage.deleteMany({});
  await prisma.milestone.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.interaction.deleteMany({});
  await prisma.communicationLog.deleteMany({});
  await prisma.clientInsight.deleteMany({});
  await prisma.client.deleteMany({});
  await prisma.contentItem.deleteMany({});
  await prisma.contentOutline.deleteMany({});
  await prisma.contentIdeaValidation.deleteMany({});
  await prisma.contentIdea.deleteMany({});
  await prisma.aiValidation.deleteMany({});
  await prisma.idea.deleteMany({});
  await prisma.workspacePage.deleteMany({});
  await prisma.workspaceFolder.deleteMany({});
  await prisma.testResult.deleteMany({});
  await prisma.setting.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.mcpApiKey.deleteMany({});
  await prisma.employeePayment.deleteMany({});
  await prisma.employee.deleteMany({});
  await prisma.businessModel.deleteMany({});
  await prisma.transaction.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.legalDocument.deleteMany({});
  await prisma.exploreBookmark.deleteMany({});
  await prisma.exploreResource.deleteMany({});
  await prisma.dashboardAccount.deleteMany({});
  await prisma.industryProduct.deleteMany({});
  await prisma.industry.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('Seeding users...');
  const salt = await bcrypt.genSalt(10);

  const founder1 = await prisma.user.create({
    data: {
      email: 'devansh@isocodelabs.com',
      name: 'Devansh Mishra',
      password_hash: await bcrypt.hash('Av6*10^23', salt),
    },
  });

  const founder2 = await prisma.user.create({
    data: {
      email: 'aryan@isocodelabs.com',
      name: 'Aryan',
      password_hash: await bcrypt.hash('Isocode@2026', salt),
    },
  });

  console.log('Seeding tasks...');

  // === COMMON TASKS (unassigned, MEDIUM priority, TODO) ===

  const task1 = await prisma.task.create({
    data: {
      title: 'Freelance website account creation',
      status: 'TODO',
      priority: 'MEDIUM',
      created_by: founder1.id,
    },
  });
  await prisma.subTask.createMany({
    data: [
      { task_id: task1.id, title: 'freelancer.com', order: 0 },
      { task_id: task1.id, title: 'upwork.com', order: 1 },
      { task_id: task1.id, title: 'fiverr', order: 2 },
    ],
  });

  const task2 = await prisma.task.create({
    data: {
      title: 'Meddesk - Small practitioners (frontend)',
      status: 'TODO',
      priority: 'MEDIUM',
      created_by: founder1.id,
    },
  });
  await prisma.subTask.createMany({
    data: [
      { task_id: task2.id, title: 'Scraping from Google Maps', order: 0 },
      { task_id: task2.id, title: 'Scraping from JustDial', order: 1 },
      { task_id: task2.id, title: 'Phone call', order: 2 },
    ],
  });

  const task3 = await prisma.task.create({
    data: {
      title: 'Meddesk - Medium to large clinics',
      status: 'TODO',
      priority: 'MEDIUM',
      created_by: founder1.id,
    },
  });
  await prisma.subTask.createMany({
    data: [
      { task_id: task3.id, title: 'Scraping from Google Maps', order: 0 },
      { task_id: task3.id, title: 'Scraping from JustDial', order: 1 },
    ],
  });

  const task4 = await prisma.task.create({
    data: {
      title: 'Social Accounts',
      status: 'TODO',
      priority: 'MEDIUM',
      created_by: founder1.id,
    },
  });
  await prisma.subTask.createMany({
    data: [
      { task_id: task4.id, title: 'LinkedIn company page', order: 0 },
      { task_id: task4.id, title: 'YouTube Channel', order: 1 },
      { task_id: task4.id, title: 'Instagram', order: 2 },
      { task_id: task4.id, title: 'Facebook', order: 3 },
      { task_id: task4.id, title: 'Reddit', order: 4 },
      { task_id: task4.id, title: 'Quora', order: 5 },
      { task_id: task4.id, title: 'Website Blogs', order: 6 },
    ],
  });

  // === ARYAN'S TASKS (assigned to Aryan, HIGH priority) ===

  await prisma.task.create({
    data: {
      title: 'Business email create',
      status: 'TODO',
      priority: 'HIGH',
      assignee_id: founder2.id,
      created_by: founder1.id,
    },
  });

  await prisma.task.create({
    data: {
      title: 'Kiro credits',
      status: 'DONE',
      priority: 'HIGH',
      assignee_id: founder2.id,
      created_by: founder1.id,
    },
  });

  await prisma.task.create({
    data: {
      title: 'AWS credits',
      status: 'DONE',
      priority: 'HIGH',
      assignee_id: founder2.id,
      created_by: founder1.id,
    },
  });

  await prisma.task.create({
    data: {
      title: 'Google Cloud credits',
      status: 'TODO',
      priority: 'HIGH',
      assignee_id: founder2.id,
      created_by: founder1.id,
    },
  });

  await prisma.task.create({
    data: {
      title: 'Redo main Isocode website',
      status: 'TODO',
      priority: 'HIGH',
      assignee_id: founder2.id,
      created_by: founder1.id,
    },
  });

  await prisma.task.create({
    data: {
      title: 'Prepare demo frontend pages and link to Isocode website',
      status: 'TODO',
      priority: 'HIGH',
      assignee_id: founder2.id,
      created_by: founder1.id,
    },
  });

  await prisma.task.create({
    data: {
      title: 'Watch Alex Hormozi - cold outreach playbook + research SDK antigravity',
      status: 'TODO',
      priority: 'HIGH',
      assignee_id: founder2.id,
      created_by: founder1.id,
    },
  });

  const task12 = await prisma.task.create({
    data: {
      title: 'Acrosstek',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      assignee_id: founder2.id,
      created_by: founder1.id,
    },
  });
  await prisma.subTask.createMany({
    data: [
      { task_id: task12.id, title: 'PRD', is_completed: true, order: 0 },
      { task_id: task12.id, title: 'Build', is_completed: true, order: 1 },
      { task_id: task12.id, title: 'Github', is_completed: true, order: 2 },
      { task_id: task12.id, title: 'Host', is_completed: true, order: 3 },
    ],
  });

  // === DEVANSH'S TASKS (assigned to Devansh, HIGH priority) ===

  await prisma.task.create({
    data: {
      title: 'Internal Operations Management OS',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      assignee_id: founder1.id,
      created_by: founder1.id,
    },
  });

  await prisma.task.create({
    data: {
      title: 'Sales script share',
      status: 'TODO',
      priority: 'HIGH',
      assignee_id: founder1.id,
      created_by: founder1.id,
    },
  });

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
