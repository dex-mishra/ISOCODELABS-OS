const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// 1. Delete .next folder to prevent build cache corruption
const nextDir = path.join(__dirname, '.next');
if (fs.existsSync(nextDir)) {
  console.log('🧹 Clearing .next cache directory...');
  try {
    fs.rmSync(nextDir, { recursive: true, force: true });
    console.log('✅ .next directory removed successfully.');
  } catch (error) {
    console.error('⚠️ Failed to remove .next directory:', error.message);
  }
}

// 2. Spawn Next.js dev server on port 3003
console.log('🚀 Spawning Next.js dev server: npx next dev -p 3003');

const nextProcess = spawn('npx', ['next', 'dev', '-p', '3003'], {
  stdio: 'inherit',
  shell: true,
});

nextProcess.on('close', (code) => {
  process.exit(code || 0);
});

