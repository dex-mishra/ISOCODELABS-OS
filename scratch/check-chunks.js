const fs = require('fs');

async function checkChunks() {
  console.log('Fetching http://localhost:3003/login...');
  try {
    const res = await fetch('http://localhost:3003/login');
    if (res.status !== 200) {
      console.error(`❌ GET /login failed with status ${res.status}`);
      return;
    }
    const html = await res.text();
    console.log('✅ GET /login returned 200 OK');

    // Simple regex to find src="..." of script tags
    const scriptRegex = /<script[^>]+src=["']([^"']+)["']/g;
    let match;
    const scripts = [];
    while ((match = scriptRegex.exec(html)) !== null) {
      scripts.push(match[1]);
    }

    console.log(`Found ${scripts.length} script tags in HTML:`, scripts);

    for (const src of scripts) {
      const url = src.startsWith('http') ? src : `http://localhost:3003${src}`;
      console.log(`Fetching chunk: ${url}...`);
      try {
        const chunkRes = await fetch(url);
        if (chunkRes.status === 200) {
          console.log(`  ✅ 200 OK - ${src}`);
        } else {
          console.error(`  ❌ ${chunkRes.status} ERROR - ${src}`);
        }
      } catch (err) {
        console.error(`  ❌ FAILED to fetch ${src}: ${err.message}`);
      }
    }
  } catch (err) {
    console.error('❌ Error during check:', err.message);
  }
}

checkChunks();
