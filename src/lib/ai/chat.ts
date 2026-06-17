import { IdeaCategory, ContentType } from '@prisma/client';

const GCP_PROJECT_ID = process.env.GCP_PROJECT_ID || '';
const GCP_LOCATION = process.env.GCP_LOCATION || 'us-central1';

export interface ChatMessageInput {
  role: 'user' | 'model' | 'USER' | 'AI';
  content: string;
  images?: string[];
}

export interface ExtractedIdea {
  title: string;
  description: string;
  category: IdeaCategory;
  keyPoints: string[];
}

export interface ExtractedContent {
  title: string;
  body: string;
  type: ContentType;
  outline: string[];
}

/**
 * Access token fetcher for GCP Vertex AI API.
 */
async function getAccessToken(): Promise<string | null> {
  if (process.env.VERTEX_AI_STATUS === 'unavailable') {
    return null;
  }

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
 * Downloads an image from a URL or reads it from public path, returning base64 inlineData.
 */
async function getBase64Image(src: string): Promise<{ mimeType: string; data: string } | null> {
  try {
    if (src.startsWith('data:image/')) {
      const parts = src.split(';base64,');
      const mimeType = parts[0].replace('data:', '');
      const data = parts[1];
      return { mimeType, data };
    }
    if (src.startsWith('http://') || src.startsWith('https://')) {
      const res = await fetch(src);
      if (res.ok) {
        const buf = await res.arrayBuffer();
        const base64 = Buffer.from(buf).toString('base64');
        const contentType = res.headers.get('content-type') || 'image/png';
        return { mimeType: contentType, data: base64 };
      }
    }
    if (src.startsWith('/')) {
      const fs = await import('fs/promises');
      const path = await import('path');
      const fullPath = path.join(process.cwd(), 'public', src);
      const data = await fs.readFile(fullPath).catch(() => null);
      if (data) {
        const ext = path.extname(src).toLowerCase();
        let mimeType = 'image/png';
        if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
        else if (ext === '.gif') mimeType = 'image/gif';
        else if (ext === '.webp') mimeType = 'image/webp';
        return { mimeType, data: data.toString('base64') };
      }
    }
  } catch (e) {
    console.error('Failed to parse/download image:', src, e);
  }
  return null;
}

/**
 * 1. Multi-turn AI Chat
 */
export async function sendChatMessage(
  history: ChatMessageInput[],
  newMessage: string,
  model: 'gemini-pro' | 'gemini-1.5-flash' = 'gemini-pro',
  images: string[] = []
): Promise<string> {
  if (process.env.VERTEX_AI_STATUS === 'unavailable') {
    throw new Error('Vertex AI Service is currently unavailable.');
  }

  // Model name mapping
  const targetModel = model === 'gemini-1.5-flash' ? 'gemini-1.5-flash' : 'gemini-1.5-pro';

  if (GCP_PROJECT_ID) {
    try {
      const accessToken = await getAccessToken();
      if (accessToken) {
        const endpoint = `https://${GCP_LOCATION}-aiplatform.googleapis.com/v1/projects/${GCP_PROJECT_ID}/locations/${GCP_LOCATION}/publishers/google/models/${targetModel}:generateContent`;

        // Format history
        const contents = [];
        for (const msg of history) {
          const role = msg.role === 'USER' || msg.role === 'user' ? 'user' : 'model';
          const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [{ text: msg.content }];
          
          if (msg.images && msg.images.length > 0) {
            for (const img of msg.images) {
              const b64Data = await getBase64Image(img);
              if (b64Data) {
                parts.push({
                  inlineData: {
                    mimeType: b64Data.mimeType,
                    data: b64Data.data,
                  },
                });
              }
            }
          }

          contents.push({ role, parts });
        }

        // Add the new message
        const newParts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [{ text: newMessage }];
        if (images.length > 0) {
          for (const img of images) {
            const b64Data = await getBase64Image(img);
            if (b64Data) {
              newParts.push({
                inlineData: {
                  mimeType: b64Data.mimeType,
                  data: b64Data.data,
                },
              });
            }
          }
        }
        contents.push({ role: 'user', parts: newParts });

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents,
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 2048,
            },
          }),
          signal: AbortSignal.timeout(30000),
        });

        if (res.ok) {
          const data = await res.json();
          return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        } else {
          console.warn('Vertex AI Chat failed response:', await res.text());
        }
      }
    } catch (e) {
      console.error('Error in sendChatMessage:', e);
      if (e instanceof Error && e.message && e.message.includes('Vertex AI')) {
        throw e;
      }
    }
  }

  // Fallback Mock Replies (if credentials are not configured but status isn't 'unavailable')
  const lowerMsg = newMessage.toLowerCase();
  
  if (images.length > 0) {
    return `I see you've attached ${images.length} image(s). Based on these visuals, they look like wireframes or visual styles that align well with clean, Apple-inspired aesthetics. We can incorporate these design styles directly into the project concept layout. How do you plan to structure the core user flow?`;
  }

  if (lowerMsg.includes('youtube script') || lowerMsg.includes('write me a script')) {
    return `### YouTube Video Script: Rebuilding Ops Hubs with AI

**[Visual Hook]**: Zoom in on an interactive Kanban board with cards sliding around automatically.
**[Audio Intro]**: "Are you tired of jumping between 5 different tabs just to keep track of tasks, meetings, and client emails? Today we are building the ultimate internal operations engine..."

#### Section 1: The Problem (0:00 - 1:15)
- Explain how scattered tools kill founder productivity.
- Show traditional spreadsheets vs. a custom Notion-like hub.

#### Section 2: Building with Gemini & Next.js (1:15 - 3:00)
- **Key Point**: Real-time WebSockets keep both founders in sync.
- **Key Point**: Conversational AI helps brainstorm and validate features before writing code.

#### Section 3: Summary & Call to Action (3:00 - 4:00)
- "Building your own tools gives you superpower advantages. If you want this template, drop a comment below and check the repo!"

*Would you like to copy this into the content editor body or refine the tone of the intro script?*`;
  }

  if (lowerMsg.includes('fitness tracking') || lowerMsg.includes('fitness')) {
    return `A fitness tracking app is a great direction! To differentiate in this crowded space, we should focus on the **real-time AI coaching aspect** you mentioned.

Here are a few questions to refine the concept:
1. **Target Audience**: Are we targeting gym newcomers who need guidance, or powerlifters optimizing routines?
2. **Technical Feasibility**: Will it integrate with wearables (Apple Watch/Fitbit) to pull heart rate data, or is it purely manual input?
3. **Core Benefit**: How does the AI customized workout differ from standard workout templates?

Once you refine these details, we can log this as a **PRODUCT** or **FEATURE** idea in our backlog. Let me know your thoughts!`;
  }

  return `Interesting concept! Let's explore this further. 

To help structure this idea:
- What is the primary problem this solves?
- Who is the ideal user for this?
- What are the key technical challenges we need to account for?

Once we hash out these points, we can click **"Log This Idea"** (or **"Log as Content"**) to extract a formatted title, description, and category to save in our backlog.`;
}

/**
 * 2. Extract structured Idea details from a chat conversation
 */
export async function extractIdeaFromConversation(history: ChatMessageInput[]): Promise<ExtractedIdea> {
  if (process.env.VERTEX_AI_STATUS === 'unavailable') {
    throw new Error('Vertex AI Service is currently unavailable.');
  }

  const chatTranscript = history
    .map((m) => `${m.role === 'USER' || m.role === 'user' ? 'User' : 'AI'}: ${m.content}`)
    .join('\n\n');

  const prompt = `You are a Product Manager. Analyze the following conversation transcript about a product/feature idea:
${chatTranscript}

Extract the core details and return them in a strict JSON format:
{
  "title": "A concise, professional title for the idea (e.g. AI-Powered Workout Sync)",
  "description": "A comprehensive HTML-formatted summary of the idea, detailing its value proposition, user flows, and features. Use <p>, <ul>, and <li> tags.",
  "category": "PRODUCT" | "FEATURE" | "CONTENT" | "BUSINESS" | "OTHER",
  "keyPoints": ["Key feature 1", "Key challenge 2", "Next step 3"]
}
Respond ONLY with this JSON. No extra text or markdown formatting.`;

  if (GCP_PROJECT_ID) {
    try {
      const accessToken = await getAccessToken();
      if (accessToken) {
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
              temperature: 0.2,
              maxOutputTokens: 1500,
            },
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
          return JSON.parse(text) as ExtractedIdea;
        }
      }
    } catch (e) {
      console.error('Failed to extract idea using Gemini:', e);
    }
  }

  // Fallback Mock Extraction
  const lastUserMsg = [...history].reverse().find((m) => m.role === 'USER' || m.role === 'user')?.content || 'Custom AI Project';
  const title = lastUserMsg.length < 50 ? lastUserMsg : lastUserMsg.slice(0, 45) + '...';
  
  let category: IdeaCategory = IdeaCategory.PRODUCT;
  if (lowerContains(lastUserMsg, ['video', 'post', 'newsletter', 'script'])) {
    category = IdeaCategory.CONTENT;
  } else if (lowerContains(lastUserMsg, ['button', 'screen', 'sidebar', 'ui', 'feature'])) {
    category = IdeaCategory.FEATURE;
  }

  return {
    title: title.replace(/[?.!]/g, ''),
    description: `<h3>Concept Summary</h3><p>Automatically logged from discussions with AI assistant. This concept focuses on: "${lastUserMsg}".</p><p>Key items established in the brainstorming session include workflow automation, sleek design layouts, and Gemini Pro integrations.</p>`,
    category,
    keyPoints: [
      'Initial brainstorming complete.',
      'Aesthetics aligned to Apple design system.',
      'Requires database schema integration check.',
    ],
  };
}

/**
 * 3. Extract structured Content details from a chat conversation
 */
export async function extractContentFromConversation(history: ChatMessageInput[]): Promise<ExtractedContent> {
  if (process.env.VERTEX_AI_STATUS === 'unavailable') {
    throw new Error('Vertex AI Service is currently unavailable.');
  }

  const chatTranscript = history
    .map((m) => `${m.role === 'USER' || m.role === 'user' ? 'User' : 'AI'}: ${m.content}`)
    .join('\n\n');

  const prompt = `You are a Content Editor. Analyze this content brainstorming conversation:
${chatTranscript}

Extract the core content details and return them in a strict JSON format:
{
  "title": "A short, engaging title for the content item",
  "body": "The fully drafted body text, script, or copy of the content item. Format in HTML using standard tags (<p>, <h3>, <ul>, etc.)",
  "type": "BLOG_POST" | "SOCIAL_MEDIA" | "VIDEO" | "NEWSLETTER" | "OTHER",
  "outline": ["Intro Hook", "Core Message", "CTA"]
}
Respond ONLY with this JSON. No extra text or markdown formatting.`;

  if (GCP_PROJECT_ID) {
    try {
      const accessToken = await getAccessToken();
      if (accessToken) {
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
              temperature: 0.2,
              maxOutputTokens: 2000,
            },
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
          return JSON.parse(text) as ExtractedContent;
        }
      }
    } catch (e) {
      console.error('Failed to extract content using Gemini:', e);
    }
  }

  // Fallback Mock Extraction
  const lastUserMsg = [...history].reverse().find((m) => m.role === 'USER' || m.role === 'user')?.content || 'Content Concept';
  const title = lastUserMsg.length < 55 ? lastUserMsg : lastUserMsg.slice(0, 50) + '...';

  let type: ContentType = ContentType.BLOG_POST;
  if (lowerContains(lastUserMsg, ['video', 'youtube', 'tiktok'])) {
    type = ContentType.VIDEO;
  } else if (lowerContains(lastUserMsg, ['linkedin', 'tweet', 'twitter'])) {
    type = ContentType.SOCIAL_MEDIA;
  } else if (lowerContains(lastUserMsg, ['newsletter', 'email'])) {
    type = ContentType.NEWSLETTER;
  }

  return {
    title: title.replace(/[?.!]/g, ''),
    body: `<h3>Draft Content Summary</h3><p>Draft generated from AI conversation: "${lastUserMsg}"</p><p>Review and publish schedules inside the Content Pipeline calendar view.</p>`,
    type,
    outline: ['Introduction Hook', 'Supporting Case Study / Data', 'Final Takeaway & Call to Action'],
  };
}

function lowerContains(text: string, matches: string[]): boolean {
  const lower = text.toLowerCase();
  return matches.some((m) => lower.includes(m));
}
