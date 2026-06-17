import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing database...');
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
  await prisma.exploreBookmark.deleteMany({});
  await prisma.exploreResource.deleteMany({});
  await prisma.dashboardAccount.deleteMany({});
  await prisma.industryProduct.deleteMany({});
  await prisma.industry.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('Seeding users...');
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('admin123', salt);

  const founder1 = await prisma.user.create({
    data: {
      email: 'dex.mishra@gmail.com',
      name: 'Founder One',
      password_hash: passwordHash,
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80',
    },
  });

  const founder2 = await prisma.user.create({
    data: {
      email: 'founder2@isocodelabs.com',
      name: 'Founder Two',
      password_hash: passwordHash,
      avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&h=256&q=80',
    },
  });

  console.log('Seeding industries & products...');
  const saas = await prisma.industry.create({ data: { name: 'SaaS' } });
  const med = await prisma.industry.create({ data: { name: 'Medical/Doctors' } });
  const fitness = await prisma.industry.create({ data: { name: 'Gym/Fitness' } });

  const product1 = await prisma.industryProduct.create({
    data: {
      industry_id: saas.id,
      name: 'Nanobana',
      description: 'AI visual generation testing console.',
    },
  });

  const product2 = await prisma.industryProduct.create({
    data: {
      industry_id: med.id,
      name: 'MedScheduler',
      description: 'Automated booking and patient portal system.',
    },
  });

  console.log('Seeding clients...');
  const client1 = await prisma.client.create({
    data: {
      name: 'Dr. Jane Smith',
      email: 'jane.smith@medicalclinic.com',
      phone: '+15550192',
      company: 'Metro Clinic',
      pipeline_stage: 'ACTIVE',
      notes: 'Wants to launch MedScheduler next month.',
      source: 'Referral',
      value: 12000,
      connected_gmail: true,
      created_by: founder1.id,
    },
  });

  const client2 = await prisma.client.create({
    data: {
      name: 'John Fit',
      email: 'john@fitnessworld.com',
      phone: '+15550293',
      company: 'Fitness World',
      pipeline_stage: 'PROPOSAL',
      notes: 'Interested in gym mobile integration app.',
      source: 'Cold Outreach',
      value: 8500,
      created_by: founder2.id,
    },
  });

  console.log('Seeding projects...');
  const project1 = await prisma.project.create({
    data: {
      name: 'MedScheduler V1',
      description: 'Phase 1 MedScheduler deployment for Dr. Jane Smith.',
      client_id: client1.id,
      status: 'ACTIVE',
      budget: 12000,
      start_date: new Date('2026-06-01'),
      end_date: new Date('2026-07-31'),
      created_by: founder1.id,
    },
  });

  console.log('Seeding meetings...');
  const meeting1 = await prisma.meeting.create({
    data: {
      title: 'MedScheduler Kickoff',
      description: 'Discuss milestones, branding preferences, and timelines.',
      agenda: '1. Review requirements\n2. Design system overview\n3. Schedule user interviews',
      notes: 'Jane requested a very minimal interface, using white and light blue colors.',
      scheduled_at: new Date('2026-06-10T10:00:00Z'),
      duration: 60,
      status: 'COMPLETED',
      google_meet_link: 'https://meet.google.com/abc-defg-hij',
      fathom_link: 'https://fathom.video/share/1234567890',
      fathom_summary: '- Discussed design theme: Clean and minimalist.\n- Target launch: Mid-July.\n- Action items: Founder One to setup prototype.',
      fathom_transcript: 'Founder One: Welcome Jane. Jane: Thank you, I am excited to get started. Let us keep it simple.',
      created_by: founder1.id,
    },
  });

  await prisma.meetingAttendee.create({
    data: {
      meeting_id: meeting1.id,
      user_id: founder1.id,
    },
  });

  await prisma.meetingAttendee.create({
    data: {
      meeting_id: meeting1.id,
      user_id: founder2.id,
    },
  });

  console.log('Seeding tasks...');
  const task1 = await prisma.task.create({
    data: {
      title: 'Setup MedScheduler Prototype',
      description: 'Initialize repo, setup Tailwind configs, and create landing page mockup.',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      assignee_id: founder1.id,
      due_date: new Date('2026-06-20'),
      project_id: project1.id,
      meeting_id: meeting1.id,
      tags: ['Development', 'MedScheduler'],
      created_by: founder1.id,
    },
  });

  await prisma.subTask.create({
    data: {
      task_id: task1.id,
      title: 'Initialize repository',
      is_completed: true,
      assignee_id: founder1.id,
    },
  });

  await prisma.subTask.create({
    data: {
      task_id: task1.id,
      title: 'Setup Apple design design tokens',
      is_completed: false,
      assignee_id: founder1.id,
    },
  });

  for (let i = 2; i <= 10; i++) {
    await prisma.task.create({
      data: {
        title: `Seeded Task #${i}`,
        description: `Description for task number ${i}.`,
        status: i % 3 === 0 ? 'DONE' : i % 2 === 0 ? 'IN_PROGRESS' : 'TODO',
        priority: i % 4 === 0 ? 'URGENT' : i % 3 === 0 ? 'HIGH' : 'MEDIUM',
        assignee_id: i % 2 === 0 ? founder1.id : founder2.id,
        due_date: new Date(Date.now() + i * 24 * 60 * 60 * 1000),
        created_by: founder1.id,
      },
    });
  }

  console.log('Seeding content items & ideas...');
  await prisma.contentItem.create({
    data: {
      title: 'Why Doctors Need Simple Scheduling Software',
      body: 'In this blog post, we look at how simple designs help clinics reduce administrative overhead...',
      type: 'BLOG_POST',
      status: 'DRAFT',
      product_id: product2.id,
      platforms: ['Blog', 'Twitter'],
      tags: ['Healthcare', 'Productivity'],
      created_by: founder1.id,
    },
  });

  const idea = await prisma.idea.create({
    data: {
      title: 'Virtual Ward Rounds for MedScheduler',
      description: 'Integrate real-time video link with clinic profiles for doctors to do remote virtual rounds.',
      category: 'FEATURE',
      status: 'VALIDATED',
      impact: 4,
      effort: 3,
      tags: ['Video', 'Healthcare'],
      created_by: founder2.id,
    },
  });

  await prisma.aiValidation.create({
    data: {
      idea_id: idea.id,
      type: 'VIABILITY_AUDIT',
      prompt: 'Validate ward round concept.',
      response: 'Highly feasible. Recommended integration: Google Meet API v2 or Custom WebRTC.',
      confidence: 0.9,
      claims: { verified: true, source: 'GCP health review paper' },
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
