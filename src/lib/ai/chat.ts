import { IdeaCategory, ContentType } from '@prisma/client';
import { getModelEndpoint, DEFAULT_MODEL_ID } from './models';

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

let cachedToken: string | null = null;
let tokenExpiry = 0;

/**
 * Helper to fetch with exponential backoff for 429 rate limit errors.
 * On 429: wait 2 seconds, retry. If still 429, wait 4 seconds, retry once more. Max 3 attempts.
 * If all retries fail, throws Error with a specific rate limit message.
 */
export async function fetchWithRetry(url: string, options: RequestInit, maxAttempts = 3): Promise<Response> {
  let attempt = 0;
  while (attempt < maxAttempts) {
    attempt++;
    try {
      const res = await fetch(url, options);
      if (res.status === 429) {
        if (attempt >= maxAttempts) {
          throw new Error("AI is busy (rate limited). Please wait a moment and try again.");
        }
        const delay = attempt === 1 ? 2000 : 4000;
        console.warn(`Got 429 rate limit error. Retrying in ${delay}ms (attempt ${attempt}/${maxAttempts})...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      return res;
    } catch (e) {
      if (e instanceof Error && e.message === "AI is busy (rate limited). Please wait a moment and try again.") {
        throw e;
      }
      if (attempt >= maxAttempts) {
        throw e;
      }
      throw e;
    }
  }
  throw new Error("AI is busy (rate limited). Please wait a moment and try again.");
}


/**
 * Access token fetcher for GCP Vertex AI API.
 */
export async function getAccessToken(): Promise<string | null> {
  if (process.env.VERTEX_AI_STATUS === 'unavailable') {
    return null;
  }

  // 1. Try GOOGLE_APPLICATION_CREDENTIALS file (works locally + deployed)
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    try {
      if (cachedToken && Date.now() < tokenExpiry) {
        return cachedToken;
      }

      const fs = require('fs');
      if (fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
        const { GoogleAuth } = require('google-auth-library');
        const auth = new GoogleAuth({
          keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
          scopes: ['https://www.googleapis.com/auth/cloud-platform']
        });
        const client = await auth.getClient();
        const tokenResponse = await client.getAccessToken();
        if (tokenResponse.token) {
          cachedToken = tokenResponse.token;
          // Set expiry 55 minutes from now to ensure buffer
          tokenExpiry = Date.now() + 55 * 60 * 1000;
          return tokenResponse.token;
        }
      }
    } catch (err) {
      console.error('Error fetching token using GOOGLE_APPLICATION_CREDENTIALS:', err);
    }
  }

  // 2. Try metadata server (on GCP)
  const metaRes = await fetch(
    'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',
    { headers: { 'Metadata-Flavor': 'Google' }, signal: AbortSignal.timeout(2000) }
  ).catch(() => null);

  if (metaRes?.ok) {
    const tokenData = await metaRes.json();
    return tokenData.access_token;
  }

  // 3. Try SA key JSON from env (fallback / legacy)
  if (process.env.GCP_SA_KEY_JSON) {
    const sdkTokenRes = await fetchWithRetry(
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
  model: string = DEFAULT_MODEL_ID,
  images: string[] = []
): Promise<string> {
  if (process.env.VERTEX_AI_STATUS === 'unavailable') {
    throw new Error('Vertex AI Service is currently unavailable.');
  }

  // Resolve model — legacy values map to default
  const resolvedModelId = (model === 'gemini-pro' || model === 'gemini-1.5-flash') ? DEFAULT_MODEL_ID : (model || DEFAULT_MODEL_ID);

  const accessToken = await getAccessToken();
  const hasGoogleAiKey = process.env.GOOGLE_AI_API_KEY && process.env.GOOGLE_AI_API_KEY !== 'mock-google-ai-key';

  if (!accessToken && !hasGoogleAiKey) {
    throw new Error("AI not configured. Set GOOGLE_APPLICATION_CREDENTIALS (service account key path) in .env");
  }

  if (GCP_PROJECT_ID && accessToken) {
    try {
      // Claude models use a different request/response format — currently disabled (paid)

      const endpoint = getModelEndpoint(resolvedModelId, GCP_PROJECT_ID, GCP_LOCATION) + ':streamGenerateContent?alt=sse';

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

      const res = await fetchWithRetry(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: "You are a co-founder advisor for Isocodelabs. Be concise, actionable, and direct. Under 150 words per reply. Ask clarifying questions when vague." }]
          },
          contents,
          generationConfig: {
            temperature: 0.6,
            maxOutputTokens: 512,
          },
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (res.ok) {
        // Parse SSE stream and collect all text chunks
        const text = await res.text();
        const lines = text.split('\n');
        let fullResponse = '';
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6).trim();
            if (jsonStr === '[DONE]') break;
            try {
              const chunk = JSON.parse(jsonStr);
              const part = chunk.candidates?.[0]?.content?.parts?.[0]?.text;
              if (part) fullResponse += part;
            } catch {
              // skip malformed chunks
            }
          }
        }
        
        return fullResponse || '';
      } else {
        const errText = await res.text();
        console.warn('Vertex AI Chat failed response:', errText);
        throw new Error(`Vertex AI API error: ${errText}`);
      }
    } catch (e) {
      console.error('Error in sendChatMessage:', e);
      throw e;
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

  const accessToken = await getAccessToken();
  const hasGoogleAiKey = process.env.GOOGLE_AI_API_KEY && process.env.GOOGLE_AI_API_KEY !== 'mock-google-ai-key';

  if (!accessToken && !hasGoogleAiKey) {
    throw new Error("AI not configured. Set GOOGLE_APPLICATION_CREDENTIALS (service account key path) in .env");
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

  if (GCP_PROJECT_ID && accessToken) {
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
            temperature: 0.2,
            maxOutputTokens: 1500,
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        return JSON.parse(text) as ExtractedIdea;
      } else {
        const errText = await res.text();
        console.warn('Vertex AI Extract Idea failed response:', errText);
        throw new Error(`Vertex AI API error: ${errText}`);
      }
    } catch (e) {
      console.error('Failed to extract idea using Gemini:', e);
      throw e;
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

  const accessToken = await getAccessToken();
  const hasGoogleAiKey = process.env.GOOGLE_AI_API_KEY && process.env.GOOGLE_AI_API_KEY !== 'mock-google-ai-key';

  if (!accessToken && !hasGoogleAiKey) {
    throw new Error("AI not configured. Set GOOGLE_APPLICATION_CREDENTIALS (service account key path) in .env");
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

  if (GCP_PROJECT_ID && accessToken) {
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
            temperature: 0.2,
            maxOutputTokens: 2000,
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        return JSON.parse(text) as ExtractedContent;
      } else {
        const errText = await res.text();
        console.warn('Vertex AI Extract Content failed response:', errText);
        throw new Error(`Vertex AI API error: ${errText}`);
      }
    } catch (e) {
      console.error('Failed to extract content using Gemini:', e);
      throw e;
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

/**
 * 4. Stream AI response word-by-word
 */
export async function streamChatMessage(
  history: ChatMessageInput[],
  newMessage: string,
  model: string = DEFAULT_MODEL_ID,
  images: string[] = []
): Promise<ReadableStream<string>> {
  if (process.env.VERTEX_AI_STATUS === 'unavailable') {
    throw new Error('Vertex AI Service is currently unavailable.');
  }

  // Resolve model — legacy values map to default
  const resolvedModelId = (model === 'gemini-pro' || model === 'gemini-1.5-flash') ? DEFAULT_MODEL_ID : (model || DEFAULT_MODEL_ID);
  const accessToken = await getAccessToken();
  const hasGoogleAiKey = process.env.GOOGLE_AI_API_KEY && process.env.GOOGLE_AI_API_KEY !== 'mock-google-ai-key';

  if (!accessToken && !hasGoogleAiKey) {
    throw new Error("AI not configured. Set GOOGLE_APPLICATION_CREDENTIALS (service account key path) in .env");
  }

  if (GCP_PROJECT_ID && accessToken) {
    // Claude models are disabled (paid) — all models route through Gemini format

    const endpoint = getModelEndpoint(resolvedModelId, GCP_PROJECT_ID, GCP_LOCATION) + ':streamGenerateContent';

    const contents = [];
    for (const msg of history) {
      const role = msg.role === 'USER' || msg.role === 'user' ? 'user' : 'model';
      const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [{ text: msg.content }];
      if (msg.images && msg.images.length > 0) {
        for (const img of msg.images) {
          const b64Data = await getBase64Image(img);
          if (b64Data) {
            parts.push({ inlineData: { mimeType: b64Data.mimeType, data: b64Data.data } });
          }
        }
      }
      contents.push({ role, parts });
    }

    const newParts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [{ text: newMessage }];
    if (images.length > 0) {
      for (const img of images) {
        const b64Data = await getBase64Image(img);
        if (b64Data) {
          newParts.push({ inlineData: { mimeType: b64Data.mimeType, data: b64Data.data } });
        }
      }
    }
    contents.push({ role: 'user', parts: newParts });

    const res = await fetchWithRetry(endpoint, {
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
      signal: AbortSignal.timeout(60000),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn('Vertex AI Stream failed response:', errText);
      throw new Error(`Vertex AI API error: ${errText}`);
    }

    const reader = res.body?.getReader();
    if (!reader) {
      throw new Error("Response body is not readable.");
    }

    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    return new ReadableStream<string>({
      async pull(controller) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            controller.close();
            break;
          }
          buffer += decoder.decode(value, { stream: true });

          let braceCount = 0;
          let inString = false;
          let escapeNext = false;
          let startIdx = -1;

          for (let i = 0; i < buffer.length; i++) {
            const char = buffer[i];
            if (escapeNext) {
              escapeNext = false;
              continue;
            }
            if (char === '\\') {
              escapeNext = true;
              continue;
            }
            if (char === '"') {
              inString = !inString;
              continue;
            }
            if (!inString) {
              if (char === '{') {
                if (braceCount === 0) {
                  startIdx = i;
                }
                braceCount++;
              } else if (char === '}') {
                braceCount--;
                if (braceCount === 0 && startIdx !== -1) {
                  const jsonStr = buffer.slice(startIdx, i + 1);
                  try {
                    const parsed = JSON.parse(jsonStr);
                    const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
                    if (text) {
                      controller.enqueue(text);
                    }
                  } catch (e) {
                    console.warn('Failed to parse json chunk inside stream:', e);
                  }
                  buffer = buffer.slice(i + 1);
                  i = -1;
                  startIdx = -1;
                }
              }
            }
          }
        }
      },
      cancel() {
        reader.releaseLock();
      }
    });
  }

  // Fallback Mock Stream
  let interval: NodeJS.Timeout;
  return new ReadableStream<string>({
    start(controller) {
      let mockReply = `Interesting concept! Let's explore this further. (Streaming mock response)`;
      const lowerMsg = newMessage.toLowerCase();
      if (images.length > 0) {
        mockReply = `I see you've attached ${images.length} image(s). Based on these visuals, they look like wireframes or layouts. (Streaming mock response)`;
      } else if (lowerMsg.includes('youtube script') || lowerMsg.includes('write me a script')) {
        mockReply = `### YouTube Video Script: Rebuilding Ops Hubs with AI\n\n**[Visual Hook]**: Kanbans moving. (Streaming mock response)`;
      }
      
      const words = mockReply.split(' ');
      let idx = 0;
      interval = setInterval(() => {
        if (idx < words.length) {
          controller.enqueue(words[idx] + (idx === words.length - 1 ? '' : ' '));
          idx++;
        } else {
          clearInterval(interval);
          controller.close();
        }
      }, 60);
    },
    cancel() {
      if (interval) clearInterval(interval);
    }
  });
}

