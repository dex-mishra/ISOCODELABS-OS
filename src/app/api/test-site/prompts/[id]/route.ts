import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import path from 'path';
import fs from 'fs';

export async function GET(
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

    const result = await prisma.testResult.findUnique({
      where: { id }
    });

    if (!result) {
      return NextResponse.json({ error: 'Prompt result not found.' }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('GET test-site prompt details error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while fetching prompt status.' },
      { status: 500 }
    );
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

    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: 'Prompt ID is required.' }, { status: 400 });
    }

    const result = await prisma.testResult.findUnique({
      where: { id }
    });

    if (!result) {
      return NextResponse.json({ error: 'Prompt result not found.' }, { status: 404 });
    }

    await prisma.testResult.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Prompt result deleted successfully.' });
  } catch (error) {
    console.error('DELETE test-site prompt error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while deleting prompt result.' },
      { status: 500 }
    );
  }
}

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

    const result = await prisma.testResult.findUnique({
      where: { id }
    });

    if (!result) {
      return NextResponse.json({ error: 'Prompt result not found.' }, { status: 404 });
    }

    const outputUrl = result.output_url;
    if (!outputUrl) {
      return NextResponse.json({ error: 'No output available to save.' }, { status: 400 });
    }

    // Check if it's already saved as a file URL
    if (!outputUrl.startsWith('data:')) {
      return NextResponse.json(result); // Already saved, return as is
    }

    const matches = outputUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return NextResponse.json({ error: 'Invalid data URL format.' }, { status: 400 });
    }

    const mimeType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');

    // Determine extension
    let extension = 'png';
    if (mimeType.includes('jpeg')) extension = 'jpg';
    else if (mimeType.includes('gif')) extension = 'gif';
    else if (mimeType.includes('mp4')) extension = 'mp4';
    else if (mimeType.includes('video')) extension = 'mp4';

    const filename = `${result.provider.toLowerCase()}-${Date.now()}.${extension}`;
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'test-site');

    // Create dir if not exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, filename);
    fs.writeFileSync(filePath, buffer);

    const relativeUrl = `/uploads/test-site/${filename}`;

    // Update database
    const updatedResult = await prisma.testResult.update({
      where: { id },
      data: {
        output_url: relativeUrl
      }
    });

    // Notify clients about update
    const io = (globalThis as any).io;
    if (io) {
      io.to('test-site').emit('test-site:update', { action: 'saved', resultId: id });
    }

    return NextResponse.json(updatedResult);
  } catch (error) {
    console.error('POST save-file error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while saving prompt result.' },
      { status: 500 }
    );
  }
}
