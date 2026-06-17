import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

// GET /api/workspace/search?q=term - Search pages by title or content blocks
export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || '';
    const searchTerms = query.trim().toLowerCase();

    // Retrieve active pages with their block contents
    const pages = await prisma.workspacePage.findMany({
      where: {
        is_deleted: false,
      },
      select: {
        id: true,
        title: true,
        content: true,
        icon: true,
        folder_id: true,
        updated_at: true,
      },
    });

    if (!searchTerms) {
      // If query is empty, return simple list of pages
      return NextResponse.json(
        pages.map((p) => ({
          id: p.id,
          title: p.title,
          icon: p.icon,
          folder_id: p.folder_id,
          updated_at: p.updated_at,
        }))
      );
    }

    const matchedPages = pages.filter((page) => {
      // Check title
      if (page.title.toLowerCase().includes(searchTerms)) {
        return true;
      }

      // Check text-based blocks inside page content
      if (Array.isArray(page.content)) {
        for (const block of page.content) {
          if (block && typeof block === 'object') {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const blockContent = (block as any).content || '';
            if (
              typeof blockContent === 'string' &&
              blockContent.toLowerCase().includes(searchTerms)
            ) {
              return true;
            }

            // Check meta fields for table data, embeds, or code block text
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const meta = (block as any).meta;
            if (meta) {
              // Check code language
              if (meta.language && meta.language.toLowerCase().includes(searchTerms)) {
                return true;
              }
              // Check embed URL
              if (meta.url && meta.url.toLowerCase().includes(searchTerms)) {
                return true;
              }
              // Check table rows
              if (Array.isArray(meta.rows)) {
                for (const row of meta.rows) {
                  if (Array.isArray(row)) {
                    for (const cell of row) {
                      if (typeof cell === 'string' && cell.toLowerCase().includes(searchTerms)) {
                        return true;
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }

      return false;
    });

    // Strip content blocks from search list response to keep it lightweight
    const results = matchedPages.map((p) => ({
      id: p.id,
      title: p.title,
      icon: p.icon,
      folder_id: p.folder_id,
      updated_at: p.updated_at,
    }));

    return NextResponse.json(results);
  } catch (error) {
    console.error('GET workspace search error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred during search.' },
      { status: 500 }
    );
  }
}
