import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { sendChatMessage, ChatMessageInput } from '@/lib/ai/chat';

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

    const targetModel = model || 'gemini-pro';
    const targetImages = Array.isArray(images) ? images : [];
    const history = Array.isArray(conversation_history) ? (conversation_history as ChatMessageInput[]) : [];

    // 1. Save user message to database
    const userMsg = await prisma.chatMessage.create({
      data: {
        context_type: (context_type as string).toUpperCase(),
        context_id: context_id || null,
        role: 'USER',
        content: message,
        model_used: targetModel,
        images: targetImages,
      },
    });

    // 2. Query Vertex AI Chat engine
    let aiResponseText = '';
    try {
      aiResponseText = await sendChatMessage(history, message, targetModel, targetImages);
    } catch (aiError) {
      console.error('Vertex AI chat query error:', aiError);
      const messageText = aiError instanceof Error ? aiError.message : 'AI Chat Service is currently unavailable.';
      return NextResponse.json(
        { error: messageText },
        { status: 503 }
      );
    }

    // 3. Save AI response message to database
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

    return NextResponse.json({ userMessage: userMsg, aiMessage: aiMsg });
  } catch (error) {
    console.error('POST chat message error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
