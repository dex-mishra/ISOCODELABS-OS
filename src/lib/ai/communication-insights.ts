import { prisma } from '../db/prisma';
import { SentimentType, InsightType } from '@prisma/client';
import { getAccessToken, fetchWithRetry } from './chat';

const GCP_PROJECT_ID = process.env.GCP_PROJECT_ID || '';
const GCP_LOCATION = process.env.GCP_LOCATION || 'us-central1';

interface InsightResult {
  summary: string;
  key_topics: string[];
  sentiment_overview: SentimentType;
  action_items: string[];
  change_requests: string[];
}

function buildPrompt(
  clientName: string,
  communications: Array<{ source: string; direction: string; subject?: string | null; body: string; received_at: Date }>
): string {
  const commLines = communications
    .map((c) => {
      const dir = c.direction === 'INBOUND' ? '← From client' : '→ To client';
      const src = c.source;
      const subj = c.subject ? `[${c.subject}]` : '';
      const date = c.received_at.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return `[${date}] [${src}] ${dir} ${subj}: ${c.body.slice(0, 500)}`;
    })
    .join('\n\n');

  return `You are an AI assistant analyzing client communications for a digital agency.

Client: ${clientName}
Total messages: ${communications.length}

--- COMMUNICATIONS ---
${commLines}
--- END COMMUNICATIONS ---

Analyze these client communications and respond ONLY with valid JSON in this exact format:
{
  "summary": "2-3 sentence overview of the communication history and current status",
  "key_topics": ["topic1", "topic2", "topic3"],
  "sentiment_overview": "POSITIVE" | "NEUTRAL" | "NEGATIVE",
  "action_items": ["action item 1", "action item 2"],
  "change_requests": ["change request 1 if any"]
}

Rules:
- summary: concise paragraph about what was discussed and current client status
- key_topics: 3-6 short topic tags discussed in the communications
- sentiment_overview: must be exactly POSITIVE, NEUTRAL, or NEGATIVE
- action_items: specific next steps that need to be done based on client messages
- change_requests: any client-requested modifications or new requirements mentioned; empty array if none
Respond ONLY with the JSON object. No markdown, no explanation.`;
}

/**
 * Mock insight generator when Vertex AI is not configured.
 */
function generateMockInsight(
  communications: Array<{ source: string; direction: string; body: string }>
): InsightResult {
  const inbound = communications.filter((c) => c.direction === 'INBOUND').length;
  const total = communications.length;

  return {
    summary: `Analyzed ${total} communication${total !== 1 ? 's' : ''} across ${
      new Set(communications.map((c) => c.source)).size
    } channel(s). ${inbound} inbound message${inbound !== 1 ? 's' : ''} from client. (AI analysis unavailable — Vertex AI not configured)`,
    key_topics: ['Client communication', 'Project updates', 'Requirements'],
    sentiment_overview: 'NEUTRAL',
    action_items: ['Review recent client messages manually', 'Schedule follow-up call'],
    change_requests: [],
  };
}

/**
 * Call Vertex AI Gemini Pro to generate insight.
 * Falls back to mock if GCP not configured.
 */
async function callVertexAI(prompt: string): Promise<InsightResult | null> {
  const accessToken = await getAccessToken();
  const hasGoogleAiKey = process.env.GOOGLE_AI_API_KEY && process.env.GOOGLE_AI_API_KEY !== 'mock-google-ai-key';

  if (!accessToken && !hasGoogleAiKey) {
    throw new Error("AI not configured. Set GOOGLE_APPLICATION_CREDENTIALS (service account key path) in .env");
  }

  if (!GCP_PROJECT_ID || !accessToken) {
    return null;
  }

  try {
    const endpoint = `https://${GCP_LOCATION}-aiplatform.googleapis.com/v1/projects/${GCP_PROJECT_ID}/locations/${GCP_LOCATION}/publishers/google/models/gemini-2.5-flash:generateContent`;

    const res = await fetchWithRetry(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.3,
          maxOutputTokens: 1024,
        },
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn('Vertex AI call failed:', errText);
      throw new Error(`Vertex AI API error: ${errText}`);
    }

    const data = await res.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    const parsed = JSON.parse(rawText) as InsightResult;
    // Validate sentiment
    if (!['POSITIVE', 'NEUTRAL', 'NEGATIVE'].includes(parsed.sentiment_overview)) {
      parsed.sentiment_overview = 'NEUTRAL';
    }
    return parsed;
  } catch (error) {
    if (error instanceof Error && error.message.includes("AI is busy")) {
      throw error;
    }
    console.error('callVertexAI error:', error);
    return null;
  }
}

/**
 * Generate and persist a ClientInsight for the given timeframe.
 */
export async function generateClientInsight(
  clientId: string,
  userId: string,
  startDate: Date,
  endDate: Date,
  type: InsightType = 'COMMUNICATION_SUMMARY'
): Promise<{
  id: string;
  summary: string;
  key_topics: string[];
  sentiment_overview: SentimentType;
  action_items: string[];
  change_requests: string[];
  email_count: number;
  whatsapp_count: number;
  manual_log_count: number;
  created_at: Date;
}> {
  // Fetch client info
  const client = await prisma.client.findUniqueOrThrow({
    where: { id: clientId },
    select: { id: true, name: true },
  });

  // Fetch communications in timeframe
  const communications = await prisma.communicationLog.findMany({
    where: {
      client_id: clientId,
      received_at: { gte: startDate, lte: endDate },
    },
    orderBy: { received_at: 'asc' },
  });

  const emailCount = communications.filter((c) => c.source === 'GMAIL').length;
  const whatsappCount = communications.filter((c) => c.source === 'WHATSAPP').length;
  const manualCount = communications.filter((c) => c.source === 'MANUAL').length;

  let result: InsightResult;

  if (communications.length === 0) {
    result = {
      summary: `No communications found for ${client.name} in the selected time period.`,
      key_topics: [],
      sentiment_overview: 'NEUTRAL',
      action_items: [],
      change_requests: [],
    };
  } else {
    const prompt = buildPrompt(client.name, communications);
    const aiResult = await callVertexAI(prompt);
    result = aiResult || generateMockInsight(communications);
  }

  // Persist insight
  const insight = await prisma.clientInsight.create({
    data: {
      client_id: clientId,
      type,
      timeframe_start: startDate,
      timeframe_end: endDate,
      summary: result.summary,
      key_topics: result.key_topics,
      sentiment_overview: result.sentiment_overview,
      action_items: result.action_items,
      change_requests: result.change_requests,
      email_count: emailCount,
      whatsapp_count: whatsappCount,
      manual_log_count: manualCount,
      generated_by: userId,
    },
  });

  return {
    id: insight.id,
    summary: insight.summary,
    key_topics: insight.key_topics,
    sentiment_overview: insight.sentiment_overview,
    action_items: insight.action_items,
    change_requests: insight.change_requests,
    email_count: insight.email_count,
    whatsapp_count: insight.whatsapp_count,
    manual_log_count: insight.manual_log_count,
    created_at: insight.created_at,
  };
}
