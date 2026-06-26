import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const childBrands = await prisma.childBrand.findMany({
      orderBy: { created_at: 'desc' },
    });

    return NextResponse.json(childBrands);
  } catch (error) {
    console.error('GET child-brands error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const body = await req.json();
    const {
      name,
      product_type,
      mission,
      vision,
      enemy,
      target_audience,
      promise,
      story,
      voice,
      vocabulary,
      tagline,
      messaging,
      custom_colors,
      custom_logo_url,
    } = body;

    if (!name || !product_type) {
      return NextResponse.json(
        { error: 'Name and product_type are required.' },
        { status: 400 }
      );
    }

    if (!['CHILD_PRODUCT', 'DAUGHTER_COMPANY'].includes(product_type)) {
      return NextResponse.json(
        { error: 'product_type must be CHILD_PRODUCT or DAUGHTER_COMPANY.' },
        { status: 400 }
      );
    }

    // Daughter companies do not inherit brand philosophy - warn if brand-specific fields are provided
    if (product_type === 'DAUGHTER_COMPANY') {
      const brandPhilosophyFields = { mission, vision, enemy, promise, story, voice };
      const providedFields = Object.entries(brandPhilosophyFields)
        .filter(([, value]) => value !== undefined && value !== null)
        .map(([key]) => key);

      if (providedFields.length > 0) {
        // Daughter companies define their own identity independently -
        // these fields are accepted but the brand does not enforce inheritance
      }
    }

    const childBrand = await prisma.childBrand.create({
      data: {
        name,
        product_type,
        mission: mission || null,
        vision: vision || null,
        enemy: enemy || null,
        target_audience: target_audience || null,
        promise: promise || null,
        story: story || null,
        voice: voice || null,
        vocabulary: vocabulary || [],
        tagline: tagline || null,
        messaging: messaging || null,
        custom_colors: custom_colors || null,
        custom_logo_url: custom_logo_url || null,
        status: 'DRAFT',
      },
    });

    return NextResponse.json(childBrand, { status: 201 });
  } catch (error) {
    console.error('POST child-brands error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
