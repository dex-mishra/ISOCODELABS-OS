import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { executeTool, resolveResource } from '../src/lib/mcp-engine';

const prisma = new PrismaClient();

// Simulated Rate Limiter (copied from route.ts for testing validation)
const rateLimits = new Map<string, { count: number; windowStart: number }>();

function testIsRateLimited(keyId: string, limitMax = 100): boolean {
  const now = Date.now();
  const limit = rateLimits.get(keyId);

  if (!limit) {
    rateLimits.set(keyId, { count: 1, windowStart: now });
    return false;
  }

  if (now - limit.windowStart > 60000) {
    rateLimits.set(keyId, { count: 1, windowStart: now });
    return false;
  }

  if (limit.count >= limitMax) {
    return true;
  }

  limit.count++;
  return false;
}

async function main() {
  console.log('🏁 Starting MCP Module Verification...');

  try {
    // 1. Verify API Key Generation & Hashing
    console.log('\nTesting Key Generation and Hashing...');
    const rawKey = `iso_ops_test_${crypto.randomBytes(16).toString('hex')}`;
    const hash = crypto.createHash('sha256').update(rawKey).digest('hex');

    const user = await prisma.user.findFirst();
    if (!user) {
      throw new Error('No user found in database. Seed user first.');
    }

    const keyRecord = await prisma.mcpApiKey.create({
      data: {
        name: 'Test Agent Key',
        key_hash: hash,
        permissions: ['*'],
        created_by: user.id,
      },
    });

    console.log('✅ Created McpApiKey in DB. Key name:', keyRecord.name);

    // Verify key hash matches
    const searchHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const lookup = await prisma.mcpApiKey.findFirst({
      where: { key_hash: searchHash, is_active: true },
    });

    if (lookup && lookup.id === keyRecord.id) {
      console.log('✅ Key lookup and authentication matched successfully.');
    } else {
      throw new Error('Key lookup failed.');
    }

    // 2. Verify Rate Limiting logic
    console.log('\nTesting Rate Limiting threshold...');
    // We execute 101 requests for our key
    let wasLimited = false;
    for (let i = 0; i < 105; i++) {
      if (testIsRateLimited(keyRecord.id, 100)) {
        console.log(`✅ Rate limited triggered on request count: ${i + 1}`);
        wasLimited = true;
        break;
      }
    }
    if (!wasLimited) {
      throw new Error('Rate limiter did not trigger at 100 requests.');
    }

    // 3. Verify Tool Executions
    console.log('\nTesting MCP Tools via execution engine...');

    // Test: create_task
    const taskResult = await executeTool(
      'create_task',
      { title: 'Task via MCP API', description: 'Testing tool call', priority: 'HIGH' },
      user.id
    );
    console.log('✅ Tool [create_task] result:', taskResult);

    // Verify task written to DB
    const checkTask = await prisma.task.findFirst({
      where: { title: 'Task via MCP API' },
    });
    if (checkTask) {
      console.log('✅ Verified task written in database successfully.');
      // Cleanup task
      await prisma.task.delete({ where: { id: checkTask.id } });
    } else {
      throw new Error('Task was not found in DB.');
    }

    // Test: get_dashboard_stats
    const statsResult = await executeTool('get_dashboard_stats', {}, user.id);
    const parsedStats = JSON.parse(statsResult);
    console.log('✅ Tool [get_dashboard_stats] result keys:', Object.keys(parsedStats));

    // Test: add_expense
    const expenseResult = await executeTool(
      'add_expense',
      { description: 'Hosting Server', amount: 45.5, category: 'Infrastructure' },
      user.id
    );
    console.log('✅ Tool [add_expense] result:', expenseResult);

    // Verify transaction created
    const checkTx = await prisma.transaction.findFirst({
      where: { description: 'Hosting Server' },
    });
    if (checkTx) {
      console.log('✅ Verified expense transaction in database successfully.');
      // Cleanup transaction
      await prisma.transaction.delete({ where: { id: checkTx.id } });
    } else {
      throw new Error('Transaction was not found in DB.');
    }

    // 4. Verify Resource Resolving
    console.log('\nTesting MCP Resource resolving...');

    const tasksResource = await resolveResource('ops://tasks/pending', user.id);
    console.log('✅ Resource [ops://tasks/pending] resolved content length:', tasksResource.length);
    if (!tasksResource.includes('# Pending Operations Tasks')) {
      throw new Error('Incorrect tasks resource format.');
    }

    const moneyResource = await resolveResource('ops://money/summary', user.id);
    console.log('✅ Resource [ops://money/summary] resolved content length:', moneyResource.length);
    if (!moneyResource.includes('# Operations Cash Flow Recap')) {
      throw new Error('Incorrect money resource format.');
    }

    // 5. Verify Revoking Key
    console.log('\nTesting key revocation...');
    await prisma.mcpApiKey.update({
      where: { id: keyRecord.id },
      data: { is_active: false, revoked_at: new Date() },
    });

    const checkRevoked = await prisma.mcpApiKey.findFirst({
      where: { key_hash: searchHash, is_active: true, revoked_at: null },
    });

    if (!checkRevoked) {
      console.log('✅ Verified key revocation. Subsequent auth lookup is null.');
    } else {
      throw new Error('Revoked key is still active in lookup!');
    }

    // Cleanup key
    await prisma.mcpApiKey.delete({ where: { id: keyRecord.id } });

    console.log('\n🎉 ALL MCP TESTS PASSED SUCCESSFULLY!');

  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
