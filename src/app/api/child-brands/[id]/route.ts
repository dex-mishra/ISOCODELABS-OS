import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = requireAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const childBrand = await prisma.childBrand.findUnique({
      where: { id: params.id },
    });

    if (!childBrand) {
      return NextResponse.json({ error: 'Child brand not found.' }, { status: 404 });
    }

    return NextResponse.json(childBrand);
  } catch (error) {
    console.error('GET child-brand error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = requireAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const existing = await prisma.childBrand.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Child brand not found.' }, { status: 404 });
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
      status,
    } = body;

    if (product_type && !['CHILD_PRODUCT', 'DAUGHTER_COMPANY'].includes(product_type)) {
      return NextResponse.json(
        { error: 'product_type must be CHILD_PRODUCT or DAUGHTER_COMPANY.' },
        { status: 400 }
      );
    }

    if (status && !['DRAFT', 'ACTIVE', 'ARCHIVED'].includes(status)) {
      return NextResponse.json(
        { error: 'status must be DRAFT, ACTIVE, or ARCHIVED.' },
        { status: 400 }
      );
    }

    const childBrand = await prisma.childBrand.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(product_type !== undefined && { product_type }),
        ...(mission !== undefined && { mission }),
        ...(vision !== undefined && { vision }),
        ...(enemy !== undefined && { enemy }),
        ...(target_audience !== undefined && { target_audience }),
        ...(promise !== undefined && { promise }),
        ...(story !== undefined && { story }),
        ...(voice !== undefined && { voice }),
        ...(vocabulary !== undefined && { vocabulary }),
        ...(tagline !== undefined && { tagline }),
        ...(messaging !== undefined && { messaging }),
        ...(custom_colors !== undefined && { custom_colors }),
        ...(custom_logo_url !== undefined && { custom_logo_url }),
        ...(status !== undefined && { status }),
      },
    });

    return NextResponse.json(childBrand);
  } catch (error) {
    console.error('PUT child-brand error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = requireAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const existing = await prisma.childBrand.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Child brand not found.' }, { status: 404 });
    }

    await prisma.childBrand.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Child brand deleted successfully.' });
  } catch (error) {
    console.error('DELETE child-brand error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
