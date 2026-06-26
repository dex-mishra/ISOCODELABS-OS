const fs = require('fs');
const { GoogleAuth } = require('google-auth-library');

async function main() {
  const saPath = 'C:/Users/iamth/Downloads/gcp-sa-key.json';
  const auth = new GoogleAuth({
    keyFilename: saPath,
    scopes: ['https://www.googleapis.com/auth/cloud-platform']
  });
  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();
  const token = tokenResponse.token;
  console.log("Token generated successfully:", token ? token.substring(0, 20) + "..." : "null");

  const projectId = 'automaters';
  const locations = ['us-central1'];
  const model = 'gemini-2.5-flash';

  for (const location of locations) {
    const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:generateContent`;

    console.log(`Requesting endpoint (${location}):`, endpoint);

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [{ text: 'Write a one-word positive slogan.' }]
          }]
        }),
        signal: AbortSignal.timeout(15000)
      });

      console.log(`Response status (${location}):`, res.status, res.statusText);
      const data = await res.json();
      if (res.status === 200) {
        console.log(`🟢 SUCCESS in ${location}:`, JSON.stringify(data, null, 2));
        return;
      } else {
        console.log(`🔴 FAILED in ${location}:`, data?.error?.message || 'Unknown error');
      }
    } catch (e) {
      console.log(`❌ ERROR in ${location}:`, e.message);
    }
  }
}

main().catch(err => console.error(err));
