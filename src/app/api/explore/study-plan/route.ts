import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { generateStudyPlan } from '@/lib/ai/explore-ai';

// POST /api/explore/study-plan — compile resources into structured learning path
export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const body = await req.json();
    const { resource_ids } = body;

    if (!resource_ids || !Array.isArray(resource_ids) || resource_ids.length === 0) {
      return NextResponse.json({ error: 'resource_ids (non-empty array) is required.' }, { status: 400 });
    }

    const resources = await prisma.exploreResource.findMany({
      where: {
        id: { in: resource_ids },
      },
      select: {
        id: true,
        title: true,
        topic: true,
        type: true,
      },
    });

    if (resources.length === 0) {
      return NextResponse.json({ error: 'No resources found matching the provided IDs.' }, { status: 404 });
    }

    // Call Vertex AI to structure the learning sequence
    const planSteps = await generateStudyPlan(resources);

    // Map plan steps back to original resources details to return a full payload
    const orderedPlan = planSteps.map((step) => {
      const resource = resources.find((r) => r.id === step.resourceId);
      return {
        ...step,
        resource: resource || null,
      };
    }).sort((a, b) => a.order - b.order);

    return NextResponse.json(orderedPlan);
  } catch (error) {
    console.error('POST /api/explore/study-plan error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred compiling the study plan.' }, { status: 500 });
  }
}
