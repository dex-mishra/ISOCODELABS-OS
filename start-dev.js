const { spawn, execSync } = require('child_process');

// Fixed port for consistency (OAuth redirect URIs depend on this)
const PORT = 3000;

// 1. Kill any process already using the port (prevents Next.js from jumping ports)
try {
  const out = execSync(`netstat -ano | findstr :${PORT}`, { encoding: 'utf8' });
  const pids = new Set();
  out.split('\n').forEach((line) => {
    const parts = line.trim().split(/\s+/);
    const pid = parts[parts.length - 1];
    if (pid && /^\d+$/.test(pid) && pid !== '0') pids.add(pid);
  });
  pids.forEach((pid) => {
    try {
      execSync(`taskkill /PID ${pid} /F`);
      console.log(`🛑 Killed stale process ${pid} on port ${PORT}`);
    } catch {}
  });
} catch {
  // No process on the port — good
}

// 2. Spawn Next.js dev server on the FIXED port
console.log(`🚀 Starting Next.js dev server on port ${PORT}`);

const nextProcess = spawn('npx', ['next', 'dev', '-p', String(PORT)], {
  stdio: 'inherit',
  shell: true,
});

nextProcess.on('close', (code) => {
  process.exit(code || 0);
});
