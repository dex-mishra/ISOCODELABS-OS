import { prisma } from '../db/prisma';

export async function submitImagePrompt(
  resultId: string,
  prompt: string,
  parameters: Record<string, unknown>
): Promise<string> {
  const startTime = Date.now();
  try {
    // Update status to PROCESSING
    await prisma.testResult.update({
      where: { id: resultId },
      data: { status: 'PROCESSING' }
    });

    const setting = await prisma.setting.findUnique({ where: { key: 'google_ai_api_key' } });
    const apiKey = setting?.value || process.env.GOOGLE_AI_API_KEY || '';
    let imageUrl = '';

    // If it's a mock key or not set, try Vertex AI with service account
    if (!apiKey || apiKey === 'mock-google-ai-key') {
      // Use Vertex AI with service account (same as chat)
      const { getAccessToken } = await import('../ai/chat');
      const accessToken = await getAccessToken();
      
      if (!accessToken) {
        throw new Error('Imagen not configured. Need GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_AI_API_KEY');
      }

      const GCP_PROJECT_ID = process.env.GCP_PROJECT_ID || '';
      const GCP_LOCATION = process.env.GCP_LOCATION || 'us-central1';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      try {
        let aspectRatioParam = "1:1";
        if (parameters && typeof parameters === 'object') {
          const res = parameters.resolution;
          if (res === "768x1024") aspectRatioParam = "3:4";
          else if (res === "1024x768") aspectRatioParam = "4:3";
        }

        let promptText = prompt;
        if (parameters && typeof parameters === 'object' && parameters.style) {
          promptText = `${prompt}, style: ${parameters.style}`;
        }

        const response = await fetch(
          `https://${GCP_LOCATION}-aiplatform.googleapis.com/v1/projects/${GCP_PROJECT_ID}/locations/${GCP_LOCATION}/publishers/google/models/imagen-3.0-generate-002:predict`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              instances: [{ prompt: promptText }],
              parameters: {
                sampleCount: 1,
                aspectRatio: aspectRatioParam,
              }
            }),
            signal: controller.signal
          }
        );

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMsg = errorData.error?.message || response.statusText;
          throw new Error(`Imagen API error: ${errorMsg} (${response.status})`);
        }

        const data = await response.json();
        const base64Bytes = data.predictions?.[0]?.bytesBase64Encoded;
        if (!base64Bytes) {
          throw new Error(`Imagen did not return image data. Response: ${JSON.stringify(data).slice(0, 200)}`);
        }
        imageUrl = `data:image/png;base64,${base64Bytes}`;
      } catch (err) {
        clearTimeout(timeoutId);
        throw err;
      }
    } else {
      // Real API Call with 60 seconds timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      try {
        let aspectRatioParam = "1:1";
        if (parameters && typeof parameters === 'object') {
          const res = parameters.resolution;
          if (res === "768x1024") aspectRatioParam = "3:4";
          else if (res === "1024x768") aspectRatioParam = "4:3";
        }

        let promptText = prompt;
        if (parameters && typeof parameters === 'object' && parameters.style) {
          promptText = `${prompt}, style: ${parameters.style}`;
        }

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            instances: [
              { prompt: promptText }
            ],
            parameters: {
              sampleCount: 1,
              aspectRatio: aspectRatioParam,
              outputMimeType: "image/jpeg"
            }
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMsg = errorData.error?.message || response.statusText;
          throw new Error(`Google AI API error: ${errorMsg} (${response.status})`);
        }

        const data = await response.json();
        const base64Bytes = data.predictions?.[0]?.bytesBase64Encoded;
        if (!base64Bytes) {
          throw new Error(`Google AI API did not return image bytes. Response: ${JSON.stringify(data)}`);
        }
        imageUrl = `data:image/jpeg;base64,${base64Bytes}`;
      } catch (err) {
        clearTimeout(timeoutId);
        throw err;
      }
    }

    const processingTime = Math.floor((Date.now() - startTime) / 1000);
    await prisma.testResult.update({
      where: { id: resultId },
      data: {
        status: 'COMPLETED',
        output_url: imageUrl,
        processing_time: processingTime,
        completed_at: new Date()
      }
    });

    // Broadcast update and trigger notification
    const io = (globalThis as any).io;
    if (io) {
      io.to('test-site').emit('test-site:update', { action: 'completed', resultId });
    }
    try {
      const { createAndBroadcastNotification } = require('../realtime/notifications');
      const allUsers = await prisma.user.findMany();
      for (const u of allUsers) {
        await createAndBroadcastNotification(u.id, {
          title: 'Generation Done (Imagen)',
          body: `Image generation for prompt "${prompt.substring(0, 30)}..." has completed.`,
          type: 'GENERATION_DONE',
          link: '/test-site'
        });
      }
    } catch (err) {
      console.error('Failed to trigger Imagen completion notification:', err);
    }

    return imageUrl;
  } catch (error: unknown) {
    const processingTime = Math.floor((Date.now() - startTime) / 1000);
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Imagen prompt ${resultId} failed:`, errorMessage);

    await prisma.testResult.update({
      where: { id: resultId },
      data: {
        status: 'FAILED',
        error_message: errorMessage,
        processing_time: processingTime,
        completed_at: new Date()
      }
    });

    // Broadcast failure and trigger notification
    const io = (globalThis as any).io;
    if (io) {
      io.to('test-site').emit('test-site:update', { action: 'failed', resultId });
    }
    try {
      const { createAndBroadcastNotification } = require('../realtime/notifications');
      const allUsers = await prisma.user.findMany();
      for (const u of allUsers) {
        await createAndBroadcastNotification(u.id, {
          title: 'Generation Failed (Imagen)',
          body: `Image generation for prompt "${prompt.substring(0, 30)}..." failed: ${errorMessage}`,
          type: 'GENERATION_DONE',
          link: '/test-site'
        });
      }
    } catch (err) {
      console.error('Failed to trigger Imagen failure notification:', err);
    }

    throw error;
  }
}
