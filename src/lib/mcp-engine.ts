import { prisma } from './db/prisma';
import { TaskStatus, TaskPriority, ExploreResourceType, PipelineStage, IdeaCategory, CommsSource, CommsDirection } from '@prisma/client';

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface McpResourceDefinition {
  uri: string;
  name: string;
  mimeType: string;
  description: string;
}

// 1. Tool Definitions
export const mcpTools: McpToolDefinition[] = [
  {
    name: 'create_task',
    description: 'Creates a new operational task in the workspace.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'The title of the task.' },
        description: { type: 'string', description: 'Optional detailed description.' },
        priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'], description: 'Priority level (default: MEDIUM).' },
        due_date: { type: 'string', description: 'Optional ISO date string, e.g. 2026-06-30T12:00:00Z.' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Optional list of tags.' },
      },
      required: ['title'],
    },
  },
  {
    name: 'create_idea',
    description: 'Creates a new product/business idea. The system categorizes it automatically.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'The title of the idea.' },
        description: { type: 'string', description: 'Optional description detailing the idea.' },
        impact: { type: 'number', description: 'Impact score from 1-10 (default: 5).' },
        effort: { type: 'number', description: 'Effort score from 1-10 (default: 5).' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Optional list of tags.' },
      },
      required: ['title'],
    },
  },
  {
    name: 'add_client_note',
    description: 'Appends a persistent client note or update history to a specific client record.',
    inputSchema: {
      type: 'object',
      properties: {
        client_id: { type: 'string', description: 'The unique client UUID.' },
        note: { type: 'string', description: 'The note or update to append.' },
      },
      required: ['client_id', 'note'],
    },
  },
  {
    name: 'get_summary',
    description: 'Returns a summarized textual list of recent tasks, meetings, or clients.',
    inputSchema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['tasks', 'meetings', 'clients'], description: 'The record type to summarize.' },
        limit: { type: 'number', description: 'Number of recent items to include (default: 5).' },
      },
      required: ['type'],
    },
  },
  {
    name: 'log_communication',
    description: 'Logs a client communication entry (email/message history).',
    inputSchema: {
      type: 'object',
      properties: {
        client_id: { type: 'string', description: 'The client UUID.' },
        type: { type: 'string', enum: ['EMAIL', 'WHATSAPP'], description: 'Communication type.' },
        direction: { type: 'string', enum: ['INBOUND', 'OUTBOUND'], description: 'Direction of communication.' },
        subject: { type: 'string', description: 'Optional subject line (usually for EMAIL).' },
        content: { type: 'string', description: 'Detailed email or message content.' },
      },
      required: ['client_id', 'type', 'direction', 'content'],
    },
  },
  {
    name: 'create_meeting',
    description: 'Schedules a new meeting.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Meeting title.' },
        agenda: { type: 'string', description: 'Optional agenda details.' },
        scheduled_at: { type: 'string', description: 'ISO scheduled timestamp, e.g. 2026-06-20T10:00:00Z.' },
        duration: { type: 'number', description: 'Duration in minutes (e.g. 30, 60).' },
      },
      required: ['title', 'scheduled_at', 'duration'],
    },
  },
  {
    name: 'add_expense',
    description: 'Logs an operational expense transaction.',
    inputSchema: {
      type: 'object',
      properties: {
        description: { type: 'string', description: 'Details of the expense.' },
        amount: { type: 'number', description: 'Numerical dollar amount.' },
        category: { type: 'string', description: 'Expense category (default: Operations).' },
      },
      required: ['description', 'amount'],
    },
  },
  {
    name: 'add_resource',
    description: 'Saves a digital resource to the Explore Hub, triggering AI summaries.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Resource title.' },
        url: { type: 'string', description: 'Optional link URL.' },
        content: { type: 'string', description: 'Optional text contents.' },
        type: { type: 'string', enum: ['ARTICLE', 'PAPER', 'TUTORIAL', 'VIDEO', 'BOOK'], description: 'Resource type (default: ARTICLE).' },
        topic: { type: 'string', description: 'Optional learning topic/category.' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Optional tag array.' },
      },
      required: ['title'],
    },
  },
  {
    name: 'get_dashboard_stats',
    description: 'Retrieves current operations dashboard status numbers.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'create_industry',
    description: 'Registers a new industry vertical.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'The unique name of the industry vertical.' },
        icon: { type: 'string', description: 'Optional emoji or icon name representing the industry.' },
        color: { type: 'string', description: 'Optional color class or hex string for styling, e.g. #3B82F6.' },
      },
      required: ['name'],
    },
  },
  {
    name: 'create_business_model',
    description: 'Creates a business model canvas entry for a product.',
    inputSchema: {
      type: 'object',
      properties: {
        product_name: { type: 'string', description: 'The name of the product.' },
        industry_id: { type: 'string', description: 'Optional ID of the industry vertical.' },
        canvas_data: { type: 'string', description: 'Optional JSON-serialized 9-block BMC structure.' },
        architecture_notes: { type: 'string', description: 'Optional notes on architecture.' },
      },
      required: ['product_name'],
    },
  },
  {
    name: 'add_employee',
    description: 'Registers a new employee/contractor profile.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Name of the employee.' },
        role: { type: 'string', description: 'Role or job title, e.g. Lead Engineer.' },
        email: { type: 'string', description: 'Unique email address.' },
        hourly_rate: { type: 'number', description: 'Hourly rate in INR.' },
        status: { type: 'string', enum: ['ACTIVE', 'INACTIVE'], description: 'Employment status (default: ACTIVE).' },
      },
      required: ['name', 'role', 'email', 'hourly_rate'],
    },
  },
  {
    name: 'log_employee_payment',
    description: 'Logs contractor hours, amount, and payment status, triggering transactions if PAID.',
    inputSchema: {
      type: 'object',
      properties: {
        employee_id: { type: 'string', description: 'ID of the employee.' },
        hours_worked: { type: 'number', description: 'Number of hours worked.' },
        amount: { type: 'number', description: 'Total payment amount in INR.' },
        status: { type: 'string', enum: ['PENDING', 'PAID'], description: 'Payment status (default: PENDING).' },
        period: { type: 'string', description: 'Optional payment period, e.g. June 2026.' },
        notes: { type: 'string', description: 'Optional descriptive notes.' },
      },
      required: ['employee_id', 'hours_worked', 'amount'],
    },
  },
  {
    name: 'add_legal_document',
    description: 'Registers a legal document (contract, NDA, agreement).',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Title of the legal document.' },
        type: { type: 'string', enum: ['CONTRACT', 'NDA', 'AGREEMENT', 'INVOICE', 'COMPLIANCE'], description: 'Document type.' },
        file_url: { type: 'string', description: 'Path or link to the document file.' },
        client_id: { type: 'string', description: 'Optional linked client ID.' },
        project_id: { type: 'string', description: 'Optional linked project ID.' },
        employee_id: { type: 'string', description: 'Optional linked employee ID.' },
        status: { type: 'string', enum: ['DRAFT', 'ACTIVE', 'EXPIRED'], description: 'Document status (default: DRAFT).' },
        expiry_date: { type: 'string', description: 'Optional expiry date (ISO date string).' },
      },
      required: ['title', 'type', 'file_url'],
    },
  },
];

// 2. Resource Definitions
export const mcpResources: McpResourceDefinition[] = [
  {
    uri: 'ops://tasks/pending',
    name: 'Pending Tasks',
    mimeType: 'text/markdown',
    description: 'Lists all uncompleted tasks (TODO, IN_PROGRESS, IN_REVIEW).',
  },
  {
    uri: 'ops://meetings/today',
    name: 'Meetings Scheduled Today',
    mimeType: 'text/markdown',
    description: "Lists today's meetings.",
  },
  {
    uri: 'ops://clients/active',
    name: 'Active Clients',
    mimeType: 'text/markdown',
    description: 'Lists clients in active pipeline stages.',
  },
  {
    uri: 'ops://ideas/recent',
    name: 'Recent Ideas',
    mimeType: 'text/markdown',
    description: 'Lists recently captured ideas.',
  },
  {
    uri: 'ops://money/summary',
    name: 'Cash Flow Summary',
    mimeType: 'text/markdown',
    description: 'Financial cash flow totals summary.',
  },
];

// 3. Tool Executor
export async function executeTool(name: string, args: any, userId: string): Promise<string> {
  switch (name) {
    case 'create_task': {
      const { title, description, priority, due_date, tags } = args;
      const task = await prisma.task.create({
        data: {
          title,
          description: description || null,
          priority: (priority as TaskPriority) || TaskPriority.MEDIUM,
          due_date: due_date ? new Date(due_date) : null,
          tags: tags || [],
          created_by: userId,
        },
      });

      // Emit socket notification
      const io = (globalThis as any).io;
      if (io) io.emit('tasks:update', { action: 'create', taskId: task.id });

      return `Task "${task.title}" created successfully with ID: ${task.id}`;
    }

    case 'create_idea': {
      const { title, description, impact, effort, tags } = args;

      // Determine category (simple auto-categorization mapping)
      const fullText = `${title} ${description || ''}`.toLowerCase();
      let category: IdeaCategory = IdeaCategory.PRODUCT;
      if (fullText.includes('marketing') || fullText.includes('ad') || fullText.includes('social') || fullText.includes('campaign')) {
        category = IdeaCategory.CONTENT;
      } else if (fullText.includes('finance') || fullText.includes('money') || fullText.includes('pricing') || fullText.includes('revenue') || fullText.includes('profit')) {
        category = IdeaCategory.BUSINESS;
      } else if (fullText.includes('operation') || fullText.includes('process') || fullText.includes('workflow') || fullText.includes('internal')) {
        category = IdeaCategory.BUSINESS;
      }

      const idea = await prisma.idea.create({
        data: {
          title,
          description: description || null,
          category,
          impact: impact !== undefined ? Number(impact) : 5,
          effort: effort !== undefined ? Number(effort) : 5,
          tags: tags || [],
          created_by: userId,
        },
      });

      // Emit socket update
      const io = (globalThis as any).io;
      if (io) io.emit('ideas:update', { action: 'create', ideaId: idea.id });

      return `Idea "${idea.title}" created successfully and categorized as ${idea.category}. ID: ${idea.id}`;
    }

    case 'add_client_note': {
      const { client_id, note } = args;
      const client = await prisma.client.findUnique({
        where: { id: client_id },
      });
      if (!client) throw new Error('Client not found.');

      const updatedNotes = client.notes ? `${client.notes}\n---\nNote added via MCP API:\n${note}` : note;

      await prisma.client.update({
        where: { id: client_id },
        data: { notes: updatedNotes },
      });

      // Log interaction
      await prisma.interaction.create({
        data: {
          client_id,
          type: 'NOTE',
          summary: 'Note added via MCP API',
          details: note,
          created_by: userId,
        },
      });

      // Emit socket update
      const io = (globalThis as any).io;
      if (io) io.emit('clients:update', { action: 'update', clientId: client_id });

      return `Client note successfully added to client: ${client.name}`;
    }

    case 'get_summary': {
      const { type, limit } = args;
      const maxLimit = limit ? Number(limit) : 5;

      if (type === 'tasks') {
        const tasks = await prisma.task.findMany({
          orderBy: { created_at: 'desc' },
          take: maxLimit,
        });
        const summary = tasks.map(t => `- [${t.status}] ${t.title} (Priority: ${t.priority})`).join('\n');
        return `Recent Tasks Summary:\n${summary || 'No tasks found.'}`;
      } else if (type === 'meetings') {
        const meetings = await prisma.meeting.findMany({
          orderBy: { scheduled_at: 'desc' },
          take: maxLimit,
        });
        const summary = meetings.map(m => `- [${m.status}] ${m.title} at ${new Date(m.scheduled_at).toLocaleString()} (Duration: ${m.duration}m)`).join('\n');
        return `Recent Meetings Summary:\n${summary || 'No meetings found.'}`;
      } else if (type === 'clients') {
        const clients = await prisma.client.findMany({
          orderBy: { last_communication_at: 'desc' },
          take: maxLimit,
        });
        const summary = clients.map(c => `- ${c.name} (${c.company || 'No Company'}) - Stage: ${c.pipeline_stage}`).join('\n');
        return `Recent Clients Summary:\n${summary || 'No clients found.'}`;
      }
      throw new Error('Invalid summary type.');
    }

    case 'log_communication': {
      const { client_id, type, direction, subject, content } = args;
      const client = await prisma.client.findUnique({
        where: { id: client_id },
      });
      if (!client) throw new Error('Client not found.');

      const source = type === 'EMAIL' ? CommsSource.GMAIL : CommsSource.WHATSAPP;
      const commsDirection = direction === 'INBOUND' ? CommsDirection.INBOUND : CommsDirection.OUTBOUND;

      await prisma.communicationLog.create({
        data: {
          client_id,
          source,
          direction: commsDirection,
          subject: subject || null,
          body: content,
          message_id: `mcp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          received_at: new Date(),
        },
      });

      await prisma.client.update({
        where: { id: client_id },
        data: { last_communication_at: new Date() },
      });

      // Emit socket update
      const io = (globalThis as any).io;
      if (io) io.emit('clients:update', { action: 'update', clientId: client_id });

      return `Communication log created successfully for client ${client.name}`;
    }

    case 'create_meeting': {
      const { title, agenda, scheduled_at, duration } = args;
      const meeting = await prisma.meeting.create({
        data: {
          title,
          agenda: agenda || null,
          scheduled_at: new Date(scheduled_at),
          duration: Number(duration),
          created_by: userId,
        },
      });

      // Emit socket update
      const io = (globalThis as any).io;
      if (io) io.emit('meetings:update', { action: 'create', meetingId: meeting.id });

      return `Meeting "${meeting.title}" scheduled successfully. ID: ${meeting.id}`;
    }

    case 'add_expense': {
      const { description, amount, category } = args;
      const transaction = await prisma.transaction.create({
        data: {
          description,
          amount: Number(amount),
          type: 'EXPENSE',
          category: category || 'Operations',
          date: new Date(),
        },
      });

      // Emit socket update
      const io = (globalThis as any).io;
      if (io) io.emit('money:update', { action: 'transaction', transactionId: transaction.id });

      return `Expense for "${transaction.description}" of ₹${transaction.amount} logged successfully.`;
    }

    case 'add_resource': {
      const { title, url, content, type, topic, tags } = args;
      const resourceType = (type as ExploreResourceType) || ExploreResourceType.ARTICLE;

      const aiSummary = `Summary of "${title}" logged via MCP: ${content ? content.slice(0, 150) + '...' : 'Learning resource added.'}`;
      const aiKeyPoints = [`Key takeaways from "${title}".`];

      const resource = await prisma.exploreResource.create({
        data: {
          title,
          url: url || null,
          content: content || null,
          type: resourceType,
          topic: topic || 'General',
          ai_summary: aiSummary,
          ai_key_points: aiKeyPoints,
          tags: tags || ['General'],
        },
      });

      // Emit socket update
      const io = (globalThis as any).io;
      if (io) io.emit('explore:update', { action: 'create', resourceId: resource.id });

      return `Explore resource "${resource.title}" added successfully. ID: ${resource.id}`;
    }

    case 'get_dashboard_stats': {
      const pendingTasksCount = await prisma.task.count({
        where: { status: { in: [TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.IN_REVIEW] } },
      });

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const meetingsTodayCount = await prisma.meeting.count({
        where: {
          scheduled_at: {
            gte: today,
            lt: tomorrow,
          },
        },
      });

      const activeClientsCount = await prisma.client.count({
        where: { pipeline_stage: { in: [PipelineStage.LEAD, PipelineStage.CONTACTED, PipelineStage.PROPOSAL] } },
      });

      // Financials (incomes vs expenses)
      const transactions = await prisma.transaction.findMany();
      const incomeTotal = transactions.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + t.amount, 0);
      const expenseTotal = transactions.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + t.amount, 0);
      const netProfit = incomeTotal - expenseTotal;

      const stats = {
        pending_tasks: pendingTasksCount,
        meetings_today: meetingsTodayCount,
        active_clients: activeClientsCount,
        financial_summary: {
          total_income: incomeTotal,
          total_expense: expenseTotal,
          net_profit: netProfit,
        },
      };

      return JSON.stringify(stats, null, 2);
    }

    case 'create_industry': {
      const { name, icon, color } = args;
      const industry = await prisma.industry.create({
        data: {
          name,
          icon: icon || null,
          color: color || null,
        },
      });

      const io = (globalThis as any).io;
      if (io) io.emit('industries:update', { action: 'create', industryId: industry.id });

      return `Industry vertical "${industry.name}" created successfully. ID: ${industry.id}`;
    }

    case 'create_business_model': {
      const { product_name, industry_id, canvas_data, architecture_notes } = args;
      
      let parsedCanvas = {
        key_partners: '',
        key_activities: '',
        key_resources: '',
        value_propositions: '',
        customer_relationships: '',
        channels: '',
        customer_segments: '',
        cost_structure: '',
        revenue_streams: ''
      };

      if (canvas_data) {
        try {
          parsedCanvas = JSON.parse(canvas_data);
        } catch (e) {
          // ignore or parse as a simple text description
        }
      }

      const businessModel = await prisma.businessModel.create({
        data: {
          product_name,
          industry_id: industry_id || null,
          canvas_data: parsedCanvas,
          architecture_notes: architecture_notes || null,
        },
      });

      const io = (globalThis as any).io;
      if (io) io.emit('business-model:update', { action: 'create', businessModelId: businessModel.id });

      return `Business model canvas for "${businessModel.product_name}" created successfully. ID: ${businessModel.id}`;
    }

    case 'add_employee': {
      const { name, role, email, hourly_rate, status } = args;
      const employee = await prisma.employee.create({
        data: {
          name,
          role,
          email,
          hourly_rate: Number(hourly_rate),
          status: status || 'ACTIVE',
        },
      });

      const io = (globalThis as any).io;
      if (io) io.emit('employees:update', { action: 'create', employeeId: employee.id });

      return `Employee/Contractor "${employee.name}" added successfully. ID: ${employee.id}`;
    }

    case 'log_employee_payment': {
      const { employee_id, hours_worked, amount, status, period, notes } = args;
      
      const employee = await prisma.employee.findUnique({
        where: { id: employee_id },
      });
      if (!employee) throw new Error('Employee not found.');

      const payment = await prisma.employeePayment.create({
        data: {
          employee_id,
          hours_worked: Number(hours_worked),
          payment_amount: Number(amount),
          amount: Number(amount),
          status: status || 'PENDING',
          period: period || '',
          notes: notes || null,
          payment_date: status === 'PAID' ? new Date() : null,
        },
      });

      const allUsers = await prisma.user.findMany();
      const { createAndBroadcastNotification } = require('./realtime/notifications');

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
        // Create expense
        await prisma.transaction.create({
          data: {
            amount: payment.amount,
            type: 'EXPENSE',
            category: 'Employee Payment',
            date: new Date(),
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

      const io = (globalThis as any).io;
      if (io) {
        io.emit('employees:update', { action: 'update', employeeId: employee_id });
        if (payment.status === 'PAID') {
          io.emit('money:update', { action: 'transaction' });
        }
      }

      return `Employee payment of ₹${payment.amount} logged successfully. Status: ${payment.status}`;
    }

    case 'add_legal_document': {
      const { title, type, file_url, client_id, project_id, employee_id, status, expiry_date } = args;

      const document = await prisma.legalDocument.create({
        data: {
          title,
          type,
          file_url,
          client_id: client_id || null,
          project_id: project_id || null,
          employee_id: employee_id || null,
          status: status || 'DRAFT',
          expiry_date: expiry_date ? new Date(expiry_date) : null,
          version: 1,
          versions: '[]',
        },
      });

      const io = (globalThis as any).io;
      if (io) io.emit('legal:update', { action: 'create', documentId: document.id });

      return `Legal document "${document.title}" registered successfully. ID: ${document.id}`;
    }

    default:
      throw new Error(`Tool "${name}" not supported.`);
  }
}

// 4. Resource Resolver
export async function resolveResource(uri: string, userId: string): Promise<string> {
  switch (uri) {
    case 'ops://tasks/pending': {
      const tasks = await prisma.task.findMany({
        where: { status: { in: [TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.IN_REVIEW] } },
        orderBy: { priority: 'desc' },
      });

      const lines = tasks.map(
        t => `- **[${t.priority}]** ${t.title} (Status: ${t.status}, Due: ${t.due_date ? new Date(t.due_date).toLocaleDateString() : 'None'})`
      );
      return `# Pending Operations Tasks\n\n${lines.join('\n') || 'No pending tasks!'}`;
    }

    case 'ops://meetings/today': {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const meetings = await prisma.meeting.findMany({
        where: {
          scheduled_at: {
            gte: today,
            lt: tomorrow,
          },
        },
        orderBy: { scheduled_at: 'asc' },
      });

      const lines = meetings.map(
        m => `- **${new Date(m.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}** - ${m.title} (${m.duration} mins)`
      );
      return `# Today's Scheduled Meetings\n\n${lines.join('\n') || 'No meetings scheduled for today.'}`;
    }

    case 'ops://clients/active': {
      const activeStages = [PipelineStage.LEAD, PipelineStage.CONTACTED, PipelineStage.PROPOSAL];
      const clients = await prisma.client.findMany({
        where: { pipeline_stage: { in: activeStages } },
        orderBy: { name: 'asc' },
      });

      const lines = clients.map(
        c => `- **${c.name}** (${c.company || 'Private'}) - Pipeline Stage: *${c.pipeline_stage}* (Value: ₹${c.value || 0})`
      );
      return `# Active Operations Pipeline Clients\n\n${lines.join('\n') || 'No active clients in pipeline.'}`;
    }

    case 'ops://ideas/recent': {
      const ideas = await prisma.idea.findMany({
        orderBy: { created_at: 'desc' },
        take: 10,
      });

      const lines = ideas.map(
        i => `- **${i.title}** (${i.category}) - Impact: ${i.impact}/10, Effort: ${i.effort}/10`
      );
      return `# Recent Product & Business Ideas\n\n${lines.join('\n') || 'No ideas recorded yet.'}`;
    }

    case 'ops://money/summary': {
      const transactions = await prisma.transaction.findMany();
      const incomeTotal = transactions.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + t.amount, 0);
      const expenseTotal = transactions.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + t.amount, 0);
      const netProfit = incomeTotal - expenseTotal;

      const unpaidInvoices = await prisma.invoice.findMany({
        where: { status: { in: ['SENT', 'OVERDUE'] } },
      });
      const unpaidTotal = unpaidInvoices.reduce((sum, inv) => sum + inv.total, 0);

      return `# Operations Cash Flow Recap
- **Total Registered Inbound Revenue (Income)**: ₹${incomeTotal.toFixed(2)}
- **Total Operational Expenses**: ₹${expenseTotal.toFixed(2)}
- **Net Operating Margin (Profit)**: ₹${netProfit.toFixed(2)}
- **Outstanding Accounts Receivable (Unpaid Invoices)**: ₹${unpaidTotal.toFixed(2)}
`;
    }

    default:
      throw new Error(`Resource URI "${uri}" not supported.`);
  }
}
