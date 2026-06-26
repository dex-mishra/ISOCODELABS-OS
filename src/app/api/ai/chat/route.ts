import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { streamChatMessage, ChatMessageInput } from '@/lib/ai/chat';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const body = await req.json();
    const { message, context_type, context_id, model, conversation_history, images } = body;

    if (!message || !context_type) {
      return NextResponse.json({ error: 'Message and context_type are required.' }, { status: 400 });
    }

    const targetModel = (model as string) || 'gemini-3.5-flash';
    const targetImages = Array.isArray(images) ? images : [];
    const history = Array.isArray(conversation_history) ? (conversation_history as ChatMessageInput[]) : [];

    // 1. Save user message to database
    await prisma.chatMessage.create({
      data: {
        context_type: (context_type as string).toUpperCase(),
        context_id: context_id || null,
        role: 'USER',
        content: message,
        model_used: targetModel,
        images: targetImages,
      },
    });

    // 2. Query Vertex AI Chat engine using streaming
    let aiStream: ReadableStream<string>;
    try {
      aiStream = await streamChatMessage(history, message, targetModel, targetImages);
    } catch (aiError) {
      console.error('Vertex AI chat query error:', aiError);
      const messageText = aiError instanceof Error ? aiError.message : 'AI Chat Service is currently unavailable.';
      return NextResponse.json(
        { error: messageText },
        { status: 503 }
      );
    }

    const reader = aiStream.getReader();
    const encoder = new TextEncoder();
    let aiResponseText = '';

    const responseStream = new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              break;
            }
            aiResponseText += value;
            controller.enqueue(encoder.encode(value));
          }

          // 3. Save AI response message to database on stream completion
          const aiMsg = await prisma.chatMessage.create({
            data: {
              context_type: (context_type as string).toUpperCase(),
              context_id: context_id || null,
              role: 'AI',
              content: aiResponseText,
              model_used: targetModel,
              images: [],
            },
          });

          // 4. Emit socket real-time updates
          const io = (globalThis as unknown as { io?: { emit: (event: string, data: unknown) => void } }).io;
          if (io) {
            const socketContext = (context_type as string).toLowerCase();
            io.emit(`${socketContext}:update`, {
              action: 'chat',
              contextId: context_id || null,
              chatMessageId: aiMsg.id,
            });
          }
        } catch (err) {
          console.error("Error in streaming response:", err);
          controller.error(err);
        } finally {
          controller.close();
          reader.releaseLock();
        }
      }
    });

    return new Response(responseStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (error) {
    console.error('POST chat message error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
