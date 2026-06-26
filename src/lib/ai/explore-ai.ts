import { ExploreResourceType } from '@prisma/client';
import { getAccessToken, fetchWithRetry } from './chat';

const GCP_PROJECT_ID = process.env.GCP_PROJECT_ID || '';
const GCP_LOCATION = process.env.GCP_LOCATION || 'us-central1';

interface SummaryResult {
  summary: string;
  key_points: string[];
  tags: string[];
}

interface StudyPlanStep {
  resourceId: string;
  order: number;
  objective: string;
}

/**
 * Helper to call Gemini Pro via Vertex AI rest endpoint.
 */
async function callGemini(prompt: string, maxTokens = 2048, temperature = 0.3): Promise<string | null> {
  if (process.env.VERTEX_AI_STATUS === 'unavailable') {
    throw new Error('Vertex AI Service is currently unavailable.');
  }

  const accessToken = await getAccessToken();
  const hasGoogleAiKey = process.env.GOOGLE_AI_API_KEY && process.env.GOOGLE_AI_API_KEY !== 'mock-google-ai-key';

  if (!accessToken && !hasGoogleAiKey) {
    throw new Error("AI not configured. Set GOOGLE_APPLICATION_CREDENTIALS (service account key path) in .env");
  }

  if (!GCP_PROJECT_ID || !accessToken) return null;

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
          temperature: temperature,
          maxOutputTokens: maxTokens,
        },
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn('Gemini AI call failed:', errText);
      throw new Error(`Vertex AI API error: ${errText}`);
    }

    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  } catch (error) {
    console.error('callGemini error:', error);
    throw error;
  }
}

/**
 * 1. Summarize content and generate key points and tags
 */
export async function summarizeResource(title: string, content: string, url?: string): Promise<SummaryResult> {
  if (process.env.VERTEX_AI_STATUS === 'unavailable') {
    throw new Error('Vertex AI Service is currently unavailable.');
  }

  const cleanContent = (content || '').trim().slice(0, 15000);
  const prompt = `You are an AI Learning Assistant. Analyze this learning resource and generate:
1. A concise, premium 3-4 sentence summary of the resource content.
2. A list of 3-7 core key takeaways/points (each 1 sentence).
3. A list of 2-5 relevant tags/topics for categorization (e.g. "React", "Marketing", "Database", "Product Strategy").

Resource Title: ${title}
${url ? `Resource URL: ${url}` : ''}
Content:
${cleanContent}

Provide your analysis in the following strict JSON format:
{
  "summary": "The summary text...",
  "key_points": ["Point 1...", "Point 2...", "Point 3..."],
  "tags": ["Tag1", "Tag2", "Tag3"]
}

Respond ONLY with this JSON. No additional formatting or markdown.`;

  const aiResponse = await callGemini(prompt, 1500, 0.2);
  if (aiResponse) {
    try {
      const parsed = JSON.parse(aiResponse);
      if (parsed.summary && Array.isArray(parsed.key_points) && Array.isArray(parsed.tags)) {
        return parsed as SummaryResult;
      }
    } catch (e) {
      console.error('Failed to parse summary JSON:', e);
    }
  }

  // Graceful Fallback Mock
  const commonTags = ['General', 'Operations'];
  if (title.toLowerCase().includes('react') || title.toLowerCase().includes('next')) commonTags.push('Frontend', 'Next.js');
  if (title.toLowerCase().includes('sql') || title.toLowerCase().includes('db') || title.toLowerCase().includes('prisma')) commonTags.push('Database');
  if (title.toLowerCase().includes('ai') || title.toLowerCase().includes('gemini') || title.toLowerCase().includes('model')) commonTags.push('AI');

  const words = cleanContent.split(/\s+/).slice(0, 50).join(' ');
  const fallbackSummary = `This resource, titled "${title}", covers essential practices and strategic workflows. It details practical application structures, execution guidelines, and integration opportunities within the target domain. ${words ? `Key sections touch on: ${words}...` : ''}`;

  return {
    summary: fallbackSummary,
    key_points: [
      `Key concept introduction in "${title}" aligns with standard industry operational workflows.`,
      `Practical examples provide actionable steps for setting up components and managing dependencies.`,
      `The material discusses optimization paths and potential bottlenecks to avoid during implementation.`
    ],
    tags: commonTags
  };
}

/**
 * 2. Answer a question grounded in the resource context
 */
export async function answerResourceQuestion(
  resource: { title: string; content?: string | null; ai_summary?: string | null; ai_key_points?: any },
  question: string,
  history: { role: string; content: string }[] = []
): Promise<string> {
  if (process.env.VERTEX_AI_STATUS === 'unavailable') {
    throw new Error('Vertex AI Service is currently unavailable.');
  }

  const keyPointsText = Array.isArray(resource.ai_key_points) 
    ? resource.ai_key_points.join('\n- ') 
    : JSON.stringify(resource.ai_key_points);

  const historyText = history.map(h => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.content}`).join('\n');

  const prompt = `You are a Resource Tutor. Answer the user's question grounded strictly on the resource context provided below.
If the answer cannot be found or inferred from the resource context, politely state that the resource does not specify that details and answer as best as you can based on the context.

Resource Context:
Title: ${resource.title}
AI Summary: ${resource.ai_summary || 'No summary'}
Key takeaways:
- ${keyPointsText || 'None'}
Content:
${(resource.content || '').slice(0, 10000) || 'No content details provided'}

Conversation History:
${historyText}

User's Question: ${question}

Provide a helpful, precise answer in clear Markdown format. Do not repeat the context or add metadata.`;

  // We can use a slightly higher temperature for conversational feel
  const aiResponse = await callGemini(prompt, 1524, 0.4);
  if (aiResponse) {
    return aiResponse.trim();
  }

  // Graceful Fallback Mock
  return `This is a simulated answer about the resource **"${resource.title}"**. 
  
Based on the provided resource material, the query regarding *"_${question}_"* relates to the core themes of the document. The resource highlights strategic execution, efficiency improvements, and domain-specific optimizations.

*If you would like to explore this topic further, consider reviewing the full content or bookmarking specific sections for note-taking.*`;
}

/**
 * 3. Generate structured study plan from selected resources
 */
export async function generateStudyPlan(resources: { id: string; title: string; topic?: string | null; type: string }[]): Promise<StudyPlanStep[]> {
  if (process.env.VERTEX_AI_STATUS === 'unavailable') {
    throw new Error('Vertex AI Service is currently unavailable.');
  }

  const resourcesList = resources.map((r, i) => `[ID: ${r.id}] ${r.title} (Type: ${r.type}, Topic: ${r.topic || 'General'})`).join('\n');

  const prompt = `You are an expert Curriculum Designer. Arrange the following learning resources into a logical, sequential study plan.
For each resource, define a learning objective or task that the user should accomplish.

Resources to schedule:
${resourcesList}

Provide your response in the following strict JSON format:
[
  {
    "resourceId": "the resource UUID",
    "order": 1,
    "objective": "Logical objective/goal for studying this resource, explaining how it fits into the sequence (1-2 sentences)."
  }
]

Respond ONLY with this JSON array. No markdown styling or extra text.`;

  const aiResponse = await callGemini(prompt, 1500, 0.3);
  if (aiResponse) {
    try {
      const parsed = JSON.parse(aiResponse);
      if (Array.isArray(parsed)) {
        return parsed as StudyPlanStep[];
      }
    } catch (e) {
      console.error('Failed to parse study plan JSON:', e);
    }
  }

  // Graceful Fallback Mock
  return resources.map((r, idx) => ({
    resourceId: r.id,
    order: idx + 1,
    objective: `Step ${idx + 1}: Study the ${r.type.toLowerCase()} "${r.title}" to build foundational knowledge on ${r.topic || 'the selected subject'} and align with the core curriculum goals.`
  }));
}
