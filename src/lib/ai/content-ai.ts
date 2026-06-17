import { ContentType } from '@prisma/client';

const GCP_PROJECT_ID = process.env.GCP_PROJECT_ID || '';
const GCP_LOCATION = process.env.GCP_LOCATION || 'us-central1';

interface IdeaInput {
  title: string;
  description?: string | null;
  content_type: ContentType;
  target_audience?: string | null;
  tags: string[];
}

export interface ValidationResult {
  feasibility_score: number;
  audience_fit_score: number;
  originality_score: number;
  overall_score: number;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

export interface OutlineResult {
  sections: Array<{ title: string; keyPoints: string[] }>;
  estimated_word_count: number;
  estimated_read_time: number;
}

export interface SuggestionsResult {
  format: string;
  angle: string;
  distribution: string[];
  timing: string;
}

export interface TrendResult {
  isTrending: boolean;
  trendingScore: number;
  relatedTrends: string[];
  competitorContent: string;
  recommendedTiming: string;
}

/**
 * Access token fetcher for GCP Vertex AI API.
 */
async function getAccessToken(): Promise<string | null> {
  // Try metadata server (on GCP)
  const metaRes = await fetch(
    'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',
    { headers: { 'Metadata-Flavor': 'Google' }, signal: AbortSignal.timeout(2000) }
  ).catch(() => null);

  if (metaRes?.ok) {
    const tokenData = await metaRes.json();
    return tokenData.access_token;
  }

  // Try SA key JSON from env
  if (process.env.GCP_SA_KEY_JSON) {
    const sdkTokenRes = await fetch(
      `https://oauth2.googleapis.com/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion: process.env.GCP_SA_KEY_JSON,
        }),
        signal: AbortSignal.timeout(5000),
      }
    ).catch(() => null);

    if (sdkTokenRes?.ok) {
      const tokenData = await sdkTokenRes.json();
      return tokenData.access_token;
    }
  }

  return null;
}

/**
 * Helper to call Gemini Pro via Vertex AI rest endpoint.
 */
async function callGemini(prompt: string, maxTokens = 1024): Promise<string | null> {
  if (!GCP_PROJECT_ID) return null;

  try {
    const accessToken = await getAccessToken();
    if (!accessToken) return null;

    const endpoint = `https://${GCP_LOCATION}-aiplatform.googleapis.com/v1/projects/${GCP_PROJECT_ID}/locations/${GCP_LOCATION}/publishers/google/models/gemini-1.5-pro:generateContent`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.4,
          maxOutputTokens: maxTokens,
        },
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      console.warn('Gemini AI call failed:', await res.text());
      return null;
    }

    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  } catch (error) {
    console.error('callGemini error:', error);
    return null;
  }
}

/**
 * 1. Validate Content Idea
 */
export async function validateContentIdea(idea: IdeaInput): Promise<ValidationResult> {
  const prompt = `You are an AI Content Strategist. Analyze this content idea and validate its feasibility, target audience fit, and originality.
Idea Title: ${idea.title}
Description: ${idea.description || 'No description provided'}
Content Type: ${idea.content_type}
Target Audience: ${idea.target_audience || 'General public'}
Tags: ${idea.tags.join(', ') || 'None'}

Provide your assessment in the following strict JSON format:
{
  "feasibility_score": 0.0 to 1.0 (float),
  "audience_fit_score": 0.0 to 1.0 (float),
  "originality_score": 0.0 to 1.0 (float),
  "overall_score": 0.0 to 1.0 (float),
  "strengths": ["strength 1", "strength 2"],
  "weaknesses": ["weakness 1", "weakness 2"],
  "recommendations": ["rec 1", "rec 2"]
}
Respond ONLY with this JSON. No additional text or markdown formatting.`;

  const aiResponse = await callGemini(prompt);
  if (aiResponse) {
    try {
      return JSON.parse(aiResponse) as ValidationResult;
    } catch (e) {
      console.error('Failed to parse validation JSON:', e);
    }
  }

  // Fallback Mock
  const feasibility = 0.85;
  const audienceFit = 0.78;
  const originality = 0.82;
  return {
    feasibility_score: feasibility,
    audience_fit_score: audienceFit,
    originality_score: originality,
    overall_score: parseFloat(((feasibility + audienceFit + originality) / 3).toFixed(2)),
    strengths: [
      `Highly relevant to ${idea.target_audience || 'the target audience'}.`,
      `Addresses a clear knowledge gap in ${idea.content_type.toLowerCase()} format.`,
    ],
    weaknesses: [
      `Requires detailed technical research/examples.`,
      `High competition for general keywords on this topic.`,
    ],
    recommendations: [
      `Add real-world case studies to enhance originality.`,
      `Target long-tail keywords for SEO distribution.`,
    ],
  };
}

/**
 * 2. Generate Content Outline
 */
export async function buildContentOutline(idea: IdeaInput): Promise<OutlineResult> {
  const prompt = `You are a Senior Editor. Create a structured, ready-to-write content outline for the following content idea:
Title: ${idea.title}
Description: ${idea.description || 'None'}
Content Type: ${idea.content_type}
Target Audience: ${idea.target_audience || 'General public'}

Provide the outline structure in the following strict JSON format:
{
  "sections": [
    {
      "title": "Section Header (e.g. Introduction, The Core Challenge...)",
      "keyPoints": ["bullet point 1 to cover", "bullet point 2 to cover"]
    }
  ],
  "estimated_word_count": number (integer, e.g. 1000),
  "estimated_read_time": number (integer minutes, e.g. 5)
}
Respond ONLY with this JSON. No additional text or markdown.`;

  const aiResponse = await callGemini(prompt, 1500);
  if (aiResponse) {
    try {
      return JSON.parse(aiResponse) as OutlineResult;
    } catch (e) {
      console.error('Failed to parse outline JSON:', e);
    }
  }

  // Fallback Mock
  return {
    sections: [
      {
        title: '1. Introduction',
        keyPoints: [
          `Hook the audience by stating the main challenge regarding "${idea.title}".`,
          `Outline what the article will cover and the key takeaway.`,
        ],
      },
      {
        title: '2. The Core Problem Explained',
        keyPoints: [
          `Define why traditional approaches to this topic fall short.`,
          `Discuss the primary obstacles experienced by ${idea.target_audience || 'readers'}.`,
        ],
      },
      {
        title: '3. Actionable Solutions & Best Practices',
        keyPoints: [
          `Step-by-step guidance on implementing the solution.`,
          `Provide concrete code snippets or workflow blueprints.`,
        ],
      },
      {
        title: '4. Summary & Call to Action',
        keyPoints: [
          `Recap the vital takeaways.`,
          `Prompt readers to share their thoughts or download resources.`,
        ],
      },
    ],
    estimated_word_count: idea.content_type === 'BLOG_POST' ? 1200 : 600,
    estimated_read_time: idea.content_type === 'BLOG_POST' ? 6 : 3,
  };
}

/**
 * 3. Get Development Suggestions
 */
export async function getDevelopmentSuggestions(idea: IdeaInput): Promise<SuggestionsResult> {
  const prompt = `You are an expert Content Publisher. Provide actionable development, angle, distribution, and timing suggestions for this idea:
Title: ${idea.title}
Description: ${idea.description || 'None'}
Content Type: ${idea.content_type}
Target Audience: ${idea.target_audience || 'General'}

Respond in the following strict JSON format:
{
  "format": "Detailed recommendation for exact format (e.g. 1500-word case study, carousel deck, video script)",
  "angle": "Unique perspective/hook to take (e.g. Focus on architectural blunders rather than basic setup)",
  "distribution": ["platform 1", "platform 2", "platform 3"],
  "timing": "Best publishing time suggestion (e.g. Tuesday morning 9AM EST for B2B engagement)"
}
Respond ONLY with this JSON. No additional text.`;

  const aiResponse = await callGemini(prompt);
  if (aiResponse) {
    try {
      return JSON.parse(aiResponse) as SuggestionsResult;
    } catch (e) {
      console.error('Failed to parse suggestions JSON:', e);
    }
  }

  // Fallback Mock
  return {
    format: idea.content_type === 'BLOG_POST' ? '1200-word Deep Dive technical article' : 'LinkedIn Carousel and thread',
    angle: 'Pragmatic first-principles engineering breakdown with production-ready code blocks.',
    distribution: ['LinkedIn Newsletter', 'X/Twitter Thread', 'HackerNews ShowHN'],
    timing: 'Tuesday or Thursday morning around 9:30 AM local time for peak developer/business focus.',
  };
}

/**
 * 4. Validate against Market Trends
 */
export async function validateTrend(idea: IdeaInput): Promise<TrendResult> {
  const prompt = `You are a Market Trend Analyst. Analyze current search, industry, and social media trends to validate this topic:
Title: ${idea.title}
Description: ${idea.description || 'None'}
Tags: ${idea.tags.join(', ') || 'None'}

Respond in the following strict JSON format:
{
  "isTrending": boolean (true/false),
  "trendingScore": 0.0 to 1.0 (float),
  "relatedTrends": ["topic A", "topic B"],
  "competitorContent": "Brief analysis of what competitors are publishing on this theme",
  "recommendedTiming": "Publish immediately / Next 2 weeks / Q3 etc."
}
Respond ONLY with this JSON. No additional text.`;

  const aiResponse = await callGemini(prompt);
  if (aiResponse) {
    try {
      return JSON.parse(aiResponse) as TrendResult;
    } catch (e) {
      console.error('Failed to parse trend JSON:', e);
    }
  }

  // Fallback Mock
  return {
    isTrending: true,
    trendingScore: 0.81,
    relatedTrends: ['Developer productivity tools', 'AI agents in workflows', 'Clean code architectures'],
    competitorContent: 'Competitors are writing high-level conceptual posts about this. You can differentiate by showing actual implementation details.',
    recommendedTiming: 'Within the next 2 weeks to ride the current wave of interest.',
  };
}
