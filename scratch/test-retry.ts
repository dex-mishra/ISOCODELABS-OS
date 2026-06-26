import { sendChatMessage } from '../src/lib/ai/chat';

async function runTests() {
  console.log("=== STARTING VERTEX AI 429 RETRY TESTS ===\n");

  const originalFetch = globalThis.fetch;
  let callCount = 0;

  // Mock fetch to simulate 429 rate limits
  const mockFetch = async (url: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    callCount++;
    const now = new Date().toLocaleTimeString();
    console.log(`[Mock Fetch] Call #${callCount} at ${now} to: ${url}`);
    
    // Simulate first 2 calls returning 429
    if (callCount <= 2) {
      console.log(`[Mock Fetch] Returning 429 Rate Limit...`);
      return new Response(JSON.stringify({ error: "Rate limit reached" }), {
        status: 429,
        statusText: "Too Many Requests",
        headers: { "Content-Type": "application/json" }
      });
    }

    // 3rd call returns 200 OK
    console.log(`[Mock Fetch] Returning 200 OK...`);
    return new Response(JSON.stringify({
      candidates: [{
        content: {
          parts: [{ text: "Mock response after retries!" }]
        }
      }]
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  };

  // 1. Test case: Recoverable rate limit (succeeds on 3rd attempt)
  try {
    globalThis.fetch = mockFetch as any;
    callCount = 0;
    
    console.log("--- TEST 1: Recoverable 429 (should retry twice and succeed) ---");
    const startTime = Date.now();
    const result = await sendChatMessage([], "Hello", "gemini-1.5-flash");
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log(`Result: "${result}"`);
    console.log(`Total duration: ${duration}s (Expected: ~6s due to 2s + 4s backoff)`);
    if (callCount === 3 && result === "Mock response after retries!") {
      console.log("✅ TEST 1 PASSED!");
    } else {
      console.log("❌ TEST 1 FAILED!");
    }
  } catch (err) {
    console.error("❌ TEST 1 ERROR:", err);
  }

  // 2. Test case: Persistent rate limit (fails after 3 attempts)
  try {
    globalThis.fetch = async (url: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      console.log(`[Mock Fetch] Persistent Call to: ${url}`);
      return new Response(JSON.stringify({ error: "Rate limit reached" }), {
        status: 429,
        statusText: "Too Many Requests",
        headers: { "Content-Type": "application/json" }
      });
    };

    console.log("\n--- TEST 2: Persistent 429 (should fail and throw rate-limit message) ---");
    await sendChatMessage([], "Hello", "gemini-1.5-flash");
    console.log("❌ TEST 2 FAILED (Did not throw error!)");
  } catch (err) {
    console.log(`Caught Error: "${err instanceof Error ? err.message : String(err)}"`);
    if (err instanceof Error && err.message === "AI is busy (rate limited). Please wait a moment and try again.") {
      console.log("✅ TEST 2 PASSED!");
    } else {
      console.log("❌ TEST 2 FAILED (Unexpected error message!)");
    }
  }

  // Restore fetch
  globalThis.fetch = originalFetch;
}

runTests();
