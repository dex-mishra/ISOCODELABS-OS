import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { submitImagePrompt } from '@/lib/integrations/nanobana';
import { submitVideoPrompt } from '@/lib/integrations/veo';
import { GenProvider, GenOutputType, Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const body = await req.json();
    const { prompt, provider, parameters } = body;

    if (!prompt || !provider) {
      return NextResponse.json(
        { error: 'Prompt text and provider are required.' },
        { status: 400 }
      );
    }

    if (provider !== 'NANOBANA' && provider !== 'VEO') {
      return NextResponse.json(
        { error: 'Provider must be either NANOBANA or VEO.' },
        { status: 400 }
      );
    }

    // Create a new TestResult in PENDING state
    const testResult = await prisma.testResult.create({
      data: {
        prompt,
        provider: provider as GenProvider,
        parameters: (parameters || {}) as Prisma.InputJsonValue,
        status: 'PENDING',
        output_type: (provider === 'NANOBANA' ? 'IMAGE' : 'VIDEO') as GenOutputType,
        created_by: user.id
      }
    });

    const currentParams = (testResult.parameters && typeof testResult.parameters === 'object')
      ? (testResult.parameters as Record<string, unknown>)
      : {};

    // Fire generation task asynchronously and do not block the HTTP response
    if (provider === 'NANOBANA') {
      submitImagePrompt(testResult.id, prompt, currentParams).catch((err) => {
        console.error(`Async image generation error for ${testResult.id}:`, err);
      });
    } else {
      submitVideoPrompt(testResult.id, prompt, currentParams).catch((err) => {
        console.error(`Async video generation error for ${testResult.id}:`, err);
      });
    }

    // Return the newly created PENDING testResult
    return NextResponse.json(testResult, { status: 201 });
  } catch (error) {
    console.error('POST test-site prompt error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while submitting prompt.' },
      { status: 500 }
    );
  }
}
