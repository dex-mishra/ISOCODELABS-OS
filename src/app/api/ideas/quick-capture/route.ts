import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { IdeaCategory } from '@prisma/client';
import { getAccessToken, fetchWithRetry } from '@/lib/ai/chat';

export const dynamic = 'force-dynamic';

const GCP_PROJECT_ID = process.env.GCP_PROJECT_ID || '';
const GCP_LOCATION = process.env.GCP_LOCATION || 'us-central1';

interface ExtractedIdea {
  title: string;
  category: IdeaCategory;
  description: string;
}

async function extractIdeaFromText(text: string): Promise<ExtractedIdea> {
  const fallback: ExtractedIdea = {
    title: text.length > 80 ? text.slice(0, 77) + '...' : text,
    category: 'OTHER' as IdeaCategory,
    description: text,
  };

  const token = await getAccessToken();
  const hasGoogleAiKey = process.env.GOOGLE_AI_API_KEY && process.env.GOOGLE_AI_API_KEY !== 'mock-google-ai-key';

  if (!token && !hasGoogleAiKey) {
    throw new Error("AI not configured. Set GOOGLE_APPLICATION_CREDENTIALS (service account key path) in .env");
  }

  if (!GCP_PROJECT_ID || !token) return fallback;

  const prompt = `You are an idea extraction assistant for a digital agency.
Given a raw idea note, extract and return a JSON object with:
- title: A concise, clear title (max 80 characters)
- category: One of PRODUCT, FEATURE, CONTENT, BUSINESS, or OTHER
- description: A brief expanded description (1-2 sentences)

Raw idea: "${text}"

Respond ONLY with valid JSON, no markdown, no explanation.`;

  try {
    const apiUrl = `https://${GCP_LOCATION}-aiplatform.googleapis.com/v1/projects/${GCP_PROJECT_ID}/locations/${GCP_LOCATION}/publishers/google/models/gemini-2.5-flash:generateContent`;

    const res = await fetchWithRetry(apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 256 },
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn('Vertex AI quick capture failed:', errText);
      throw new Error(`Vertex AI API error: ${errText}`);
    }

    const data = await res.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

    // Strip markdown code fences if present
    const clean = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    const parsed = JSON.parse(clean);

    const VALID_CATEGORIES: IdeaCategory[] = ['PRODUCT', 'FEATURE', 'CONTENT', 'BUSINESS', 'OTHER'];
    return {
      title: String(parsed.title || fallback.title).slice(0, 80),
      category: VALID_CATEGORIES.includes(parsed.category) ? parsed.category : 'OTHER',
      description: String(parsed.description || text),
    };
  } catch (err) {
    if (err instanceof Error && (err.message.includes('AI not configured') || err.message.includes('Vertex AI API error') || err.message.includes('AI is busy'))) {
      throw err;
    }
    return fallback;
  }
}

// POST /api/ideas/quick-capture — capture a raw idea with optional AI processing
export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    // Verify user exists in DB
    const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { id: true } });
    if (!dbUser) return NextResponse.json({ error: 'User not found.' }, { status: 401 });

    const body = await req.json();
    const { text } = body;

    if (!text?.trim()) {
      return NextResponse.json({ error: 'Text is required.' }, { status: 400 });
    }

    // Extract title, category, description via AI (with graceful fallback)
    const extracted = await extractIdeaFromText(text.trim());

    const idea = await prisma.idea.create({
      data: {
        title: extracted.title,
        description: extracted.description || text.trim(),
        category: extracted.category,
        status: 'RAW',
        impact: 5,
        effort: 5,
        tags: [],
        created_by: user.id,
      },
      include: {
        creator: { select: { id: true, name: true, avatar_url: true } },
        validations: true,
      },
    });

    // Broadcast
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const io = (globalThis as any).io;
    if (io) io.emit('ideas:update', { action: 'create', ideaId: idea.id });

    return NextResponse.json({ idea, aiProcessed: !!GCP_PROJECT_ID }, { status: 201 });
  } catch (error) {
    console.error('POST quick-capture error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
