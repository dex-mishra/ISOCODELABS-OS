const { execSync } = require('child_process');

async function test() {
  let token;
  try {
    token = execSync('gcloud auth print-access-token').toString().trim();
  } catch (err) {
    console.error("Failed to get gcloud token:", err.message);
    return;
  }

  const projects = ['automaters', 'gen-lang-client-0221463216'];
  const locations = ['us-central1', 'us-east4', 'europe-west1', 'europe-west4'];
  const models = ['gemini-1.5-flash', 'gemini-1.5-flash-001', 'gemini-1.5-pro', 'gemini-1.5-pro-001'];

  for (const proj of projects) {
    for (const loc of locations) {
      for (const model of models) {
        const endpoint = `https://${loc}-aiplatform.googleapis.com/v1/projects/${proj}/locations/${loc}/publishers/google/models/${model}:generateContent`;
        try {
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              contents: [{ role: 'user', parts: [{ text: 'hi' }] }]
            }),
            signal: AbortSignal.timeout(3000)
          });
          if (res.status === 200) {
            const data = await res.json();
            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            console.log(`🟢 SUCCESS: project=${proj}, location=${loc}, model=${model} -> ${text.trim()}`);
            return; // Stop on first success!
          } else {
            const data = await res.json().catch(() => ({}));
            const msg = data?.error?.message || 'Unknown error';
            if (!msg.includes('disabled') && !msg.includes('billing')) {
              // Standard 404 or other error
              // console.log(`🔴 project=${proj}, location=${loc}, model=${model} -> ${res.status}: ${msg.substring(0, 80)}`);
            } else {
              console.log(`⚠️ project=${proj}, location=${loc}, model=${model} -> ${res.status}: ${msg.substring(0, 80)}`);
            }
          }
        } catch (e) {
          // console.log(`❌ project=${proj}, location=${loc}, model=${model} -> Error: ${e.message}`);
        }
      }
    }
  }
  console.log("Finished scanning all combinations. No working endpoint found.");
}

test();
