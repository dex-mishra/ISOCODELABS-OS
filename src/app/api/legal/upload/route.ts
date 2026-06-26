import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save locally under public/uploads/legal
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'legal');
    await mkdir(uploadDir, { recursive: true });

    // Generate unique filename using UUID and keep the original file extension (default to pdf)
    const fileExtension = file.name.includes('.') ? file.name.split('.').pop() : 'pdf';
    const filename = `${uuidv4()}.${fileExtension}`;
    const filePath = join(uploadDir, filename);

    await writeFile(filePath, buffer);

    return NextResponse.json({ url: `/api/files/legal/${filename}` });
  } catch (error) {
    console.error('Legal upload API error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred during file upload.' },
      { status: 500 }
    );
  }
}
