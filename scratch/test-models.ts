import { getAccessToken } from '../src/lib/ai/chat';

async function test() {
  const token = await getAccessToken();
  if (!token) {
    console.error("No access token!");
    return;
  }

  const projectId = process.env.GCP_PROJECT_ID || 'automaters';
  const locations = ['us-central1', 'us-east4', 'europe-west1', 'europe-west4', 'europe-west9', 'asia-northeast1'];
  const models = [
    'gemini-1.5-flash-001',
    'gemini-1.5-flash-002',
    'gemini-1.5-flash',
    'gemini-1.5-pro-001',
    'gemini-1.5-pro-002',
    'gemini-1.5-pro',
    'gemini-1.0-pro-002',
    'gemini-pro',
    'gemini-pro-vision'
  ];

  for (const loc of locations) {
    for (const model of models) {
      const endpoint = `https://${loc}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${loc}/publishers/google/models/${model}:generateContent`;
      
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: "hi" }] }],
            generationConfig: { maxOutputTokens: 5 },
          }),
        });

        if (res.ok) {
          const data = await res.json();
          console.log(`🟢 SUCCESS: location=${loc}, model=${model}`);
          console.log("Response:", data?.candidates?.[0]?.content?.parts?.[0]?.text);
          return; // Stop at first successful model!
        } else {
          const text = await res.text();
          if (text.includes("disabled") || text.includes("permission")) {
            console.log(`❌ AUTH/API ERROR: location=${loc}, model=${model} - ${text.substring(0, 100)}`);
          } else {
            console.log(`🔴 NOT FOUND: location=${loc}, model=${model}`);
          }
        }
      } catch (err) {
        console.log(`⚠️ ERROR: location=${loc}, model=${model} -`, err);
      }
    }
  }
}

test();
