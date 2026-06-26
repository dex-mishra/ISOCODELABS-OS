import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export const dynamic = 'force-dynamic';

// GET /api/files/[...path] — serve uploaded files dynamically from disk
export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  try {
    if (!params.path || params.path.length === 0) {
      return NextResponse.json({ error: 'No path specified.' }, { status: 400 });
    }

    const filePath = join(process.cwd(), 'public', 'uploads', ...params.path);
    if (!existsSync(filePath)) {
      return NextResponse.json({ error: 'File not found.' }, { status: 404 });
    }

    const fileBuffer = await readFile(filePath);
    const filename = params.path[params.path.length - 1];
    
    // Determine content type based on extension
    let contentType = 'application/octet-stream';
    if (filename.endsWith('.pdf')) {
      contentType = 'application/pdf';
    } else if (filename.endsWith('.docx')) {
      contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    } else if (filename.endsWith('.png')) {
      contentType = 'image/png';
    } else if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) {
      contentType = 'image/jpeg';
    }

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${filename}"`,
        // Prevent caching for dynamic previews
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      }
    });
  } catch (error) {
    console.error('API File serving error:', error);
    return NextResponse.json({ error: 'An error occurred while serving the file.' }, { status: 500 });
  }
}
