import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { extractContentFromConversation, ChatMessageInput } from '@/lib/ai/chat';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const body = await req.json();
    const { conversation_history } = body;

    if (!conversation_history || !Array.isArray(conversation_history)) {
      return NextResponse.json({ error: 'conversation_history array is required.' }, { status: 400 });
    }

    try {
      const extracted = await extractContentFromConversation(conversation_history as ChatMessageInput[]);
      return NextResponse.json(extracted);
    } catch (aiError) {
      console.error('Vertex AI extraction error:', aiError);
      const message = aiError instanceof Error ? aiError.message : 'AI Extraction Service is currently unavailable.';
      return NextResponse.json(
        { error: message },
        { status: 503 }
      );
    }
  } catch (error) {
    console.error('POST extract content error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
