import { sendChatMessage } from '../src/lib/ai/chat';

async function test() {
  console.log("Checking GOOGLE_APPLICATION_CREDENTIALS path:", process.env.GOOGLE_APPLICATION_CREDENTIALS);
  console.log("GCP_PROJECT_ID:", process.env.GCP_PROJECT_ID);
  
  try {
    console.log("\nSending message 1 (gemini-1.5-flash)...");
    const response1 = await sendChatMessage([], "Write a short slogan for an organic coffee brand.", "gemini-1.5-flash");
    console.log("\n--- Prompt 1: Write a short slogan for an organic coffee brand. ---");
    console.log(response1);

    console.log("\nSending message 2 (gemini-1.5-flash)...");
    const response2 = await sendChatMessage([], "Explain quantum computing in one sentence.", "gemini-1.5-flash");
    console.log("\n--- Prompt 2: Explain quantum computing in one sentence. ---");
    console.log(response2);
  } catch (error) {
    console.error("\nTest failed with error:", error);
  }
}

test();
