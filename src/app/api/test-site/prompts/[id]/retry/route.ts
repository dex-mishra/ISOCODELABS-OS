import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { submitImagePrompt } from '@/lib/integrations/nanobana';
import { submitVideoPrompt } from '@/lib/integrations/veo';
import { Prisma } from '@prisma/client';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = requireAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: 'Prompt ID is required.' }, { status: 400 });
    }

    const oldResult = await prisma.testResult.findUnique({
      where: { id }
    });

    if (!oldResult) {
      return NextResponse.json({ error: 'Original prompt result not found.' }, { status: 404 });
    }

    const oldParams = (oldResult.parameters && typeof oldResult.parameters === 'object')
      ? (oldResult.parameters as Record<string, unknown>)
      : {};

    // Create a new TestResult using the old details
    const testResult = await prisma.testResult.create({
      data: {
        prompt: oldResult.prompt,
        provider: oldResult.provider,
        parameters: oldParams as Prisma.InputJsonValue,
        status: 'PENDING',
        output_type: oldResult.output_type,
        created_by: user.id
      }
    });

    const currentParams = (testResult.parameters && typeof testResult.parameters === 'object')
      ? (testResult.parameters as Record<string, unknown>)
      : {};

    // Start background execution
    if (testResult.provider === 'NANOBANA') {
      submitImagePrompt(testResult.id, testResult.prompt, currentParams).catch((err) => {
        console.error(`Async image generation error for retry ${testResult.id}:`, err);
      });
    } else {
      submitVideoPrompt(testResult.id, testResult.prompt, currentParams).catch((err) => {
        console.error(`Async video generation error for retry ${testResult.id}:`, err);
      });
    }

    return NextResponse.json(testResult, { status: 201 });
  } catch (error) {
    console.error('POST test-site retry error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while retrying the prompt.' },
      { status: 500 }
    );
  }
}
