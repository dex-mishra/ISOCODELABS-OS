import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

const DEFAULT_CANVAS_DATA = {
  key_partners: '',
  key_activities: '',
  key_resources: '',
  value_propositions: '',
  customer_relationships: '',
  channels: '',
  customer_segments: '',
  cost_structure: '',
  revenue_streams: '',
};

// GET /api/business-model — list business models
export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const productName = searchParams.get('product_name');
    const ventureId = searchParams.get('venture_id');

    if (productName) {
      // Fetch all versions of a specific product, newest first
      const models = await prisma.businessModel.findMany({
        where: { product_name: productName },
        include: {
          industry: { select: { id: true, name: true, icon: true, color: true } },
        },
        orderBy: { version: 'desc' },
      });

      return NextResponse.json(models);
    }

    if (ventureId) {
      // Fetch business models linked to a specific venture
      const models = await prisma.businessModel.findMany({
        where: { venture_id: ventureId },
        include: {
          industry: { select: { id: true, name: true, icon: true, color: true } },
        },
        orderBy: { updated_at: 'desc' },
      });

      return NextResponse.json(models);
    }

    // Fetch the latest version for each unique product_name.
    // Step 1: Get the max version per product_name using groupBy.
    const latestVersions = await prisma.businessModel.groupBy({
      by: ['product_name'],
      _max: { version: true },
    });

    if (latestVersions.length === 0) {
      return NextResponse.json([]);
    }

    // Step 2: Fetch full records matching each (product_name, max_version) pair.
    const models = await prisma.businessModel.findMany({
      where: {
        OR: latestVersions.map((entry) => ({
          product_name: entry.product_name,
          version: entry._max.version!,
        })),
      },
      include: {
        industry: { select: { id: true, name: true, icon: true, color: true } },
      },
      orderBy: { updated_at: 'desc' },
    });

    return NextResponse.json(models);
  } catch (error) {
    console.error('GET business-model error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}

// POST /api/business-model — create a new business model canvas
export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const body = await req.json();
    const { product_name, industry_id, venture_id, canvas_data, architecture_notes, revenue_model } = body;

    if (!product_name) {
      return NextResponse.json({ error: 'product_name is required.' }, { status: 400 });
    }

    // Auto-increment version: find the current max version for this product_name
    const existing = await prisma.businessModel.aggregate({
      where: { product_name },
      _max: { version: true },
    });
    const nextVersion = (existing._max.version ?? 0) + 1;

    const model = await prisma.businessModel.create({
      data: {
        product_name,
        industry_id: industry_id || null,
        venture_id: venture_id || null,
        canvas_data: canvas_data || DEFAULT_CANVAS_DATA,
        architecture_notes: architecture_notes || null,
        revenue_model: revenue_model || null,
        version: nextVersion,
      },
      include: {
        industry: { select: { id: true, name: true, icon: true, color: true } },
      },
    });

    return NextResponse.json(model, { status: 201 });
  } catch (error) {
    console.error('POST business-model error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
