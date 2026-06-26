/**
 * AI Model Registry — Vertex AI Models (GCP Promotional Credits Eligible)
 * 
 * Only Google first-party models (direct API, serverless).
 * Claude/xAI/managed API models are excluded — they require separate billing.
 */

export interface AIModel {
  id: string;
  name: string;
  publisher: 'google';
  vertexModelId: string;
  tier: 'fast' | 'standard' | 'advanced' | 'premium';
  description: string;
  isDefault?: boolean;
}

export const AI_MODELS: AIModel[] = [
  // === TIER: FAST (High-volume, low-latency) ===
  {
    id: 'gemini-3.5-flash',
    name: 'Gemini 3.5 Flash',
    publisher: 'google',
    vertexModelId: 'gemini-3.5-flash',
    tier: 'fast',
    description: 'Highly efficient, natively multimodal — optimized for speed, large contexts, and high-volume tasks',
    isDefault: true,
  },
  {
    id: 'gemini-3.1-flash-lite',
    name: 'Gemini 3.1 Flash Lite',
    publisher: 'google',
    vertexModelId: 'gemini-3.1-flash-lite',
    tier: 'fast',
    description: 'Lightweight 3.1 gen — ultra-low latency for cost-sensitive traffic',
  },
  {
    id: 'gemini-3-flash-preview',
    name: 'Gemini 3 Flash Preview',
    publisher: 'google',
    vertexModelId: 'gemini-3-flash-preview',
    tier: 'fast',
    description: 'Mid-tier workhorse — near-Pro intelligence with Flash speed',
  },
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    publisher: 'google',
    vertexModelId: 'gemini-2.5-flash',
    tier: 'fast',
    description: 'Balanced reasoning and speed for general multimodal tasks',
  },
  {
    id: 'gemini-2.5-flash-lite',
    name: 'Gemini 2.5 Flash-Lite',
    publisher: 'google',
    vertexModelId: 'gemini-2.5-flash-lite',
    tier: 'fast',
    description: 'Most balanced model for low-latency use cases',
  },

  // === TIER: ADVANCED (Complex reasoning & coding) ===
  {
    id: 'gemini-3.1-pro-preview',
    name: 'Gemini 3.1 Pro Preview',
    publisher: 'google',
    vertexModelId: 'gemini-3.1-pro-preview',
    tier: 'premium',
    description: '1M token context window — best for entire repos and massive documents',
  },
  {
    id: 'gemini-3-pro-preview',
    name: 'Gemini 3 Pro Preview',
    publisher: 'google',
    vertexModelId: 'gemini-3-pro-preview',
    tier: 'advanced',
    description: 'Top-tier agentic and coding model with best multimodal understanding',
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    publisher: 'google',
    vertexModelId: 'gemini-2.5-pro',
    tier: 'advanced',
    description: 'Strongest 2.5 gen — specialized for complex logic and coding',
  },

  // === TIER: IMAGE/MULTIMODAL ===
  {
    id: 'gemini-3.1-flash-image',
    name: 'Gemini 3.1 Flash Image',
    publisher: 'google',
    vertexModelId: 'gemini-3.1-flash-image',
    tier: 'standard',
    description: 'Image generation integrated with Flash speed',
  },
  {
    id: 'gemini-3-pro-image',
    name: 'Gemini 3 Pro Image',
    publisher: 'google',
    vertexModelId: 'gemini-3-pro-image',
    tier: 'advanced',
    description: 'High-tier multimodal — rapid creative workflows and image editing',
  },
  {
    id: 'gemini-2.5-flash-image',
    name: 'Gemini 2.5 Flash Image',
    publisher: 'google',
    vertexModelId: 'gemini-2.5-flash-image',
    tier: 'standard',
    description: 'Rapid image generation and multi-turn editing (Nano Banana)',
  },
];

export type ModelId = typeof AI_MODELS[number]['id'];

export const DEFAULT_MODEL_ID = 'gemini-3.5-flash';

export function getModelById(id: string): AIModel | undefined {
  return AI_MODELS.find((m) => m.id === id);
}

export function getModelEndpoint(modelId: string, projectId: string, location: string): string {
  const model = getModelById(modelId);
  if (!model) {
    // Fallback to default
    return `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/gemini-3.5-flash`;
  }

  return `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/${model.publisher}/models/${model.vertexModelId}`;
}

/** Check if a model uses Claude (Anthropic) — different request/response format */
export function isClaudeModel(modelId: string): boolean {
  // No Claude models in this registry — they're paid/excluded
  return false;
}
