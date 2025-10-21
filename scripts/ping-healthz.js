const HEALTHZ_URL = process.env.HEALTHZ_URL || 'http://localhost:3000/healthz';
const INTERVAL_MS = 60000;

async function pingHealthz() {
  const start = Date.now();
  
  try {
    const response = await fetch(HEALTHZ_URL);
    const latency = Date.now() - start;
    const text = await response.text();
    
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
    
    if (response.ok) {
      console.log(`[UP] ${new Date().toISOString()} | Status: ${response.status} | Latency: ${latency}ms | ${JSON.stringify(data)}`);
    } else {
      console.log(`[DOWN] ${new Date().toISOString()} | Status: ${response.status} | Latency: ${latency}ms | ${JSON.stringify(data)}`);
    }
  } catch (error) {
    const latency = Date.now() - start;
    console.log(`[DOWN] ${new Date().toISOString()} | Error: ${error.message} | Latency: ${latency}ms`);
  }
}

async function startMonitoring() {
  console.log(`Starting uptime monitor for ${HEALTHZ_URL}`);
  console.log(`Ping interval: ${INTERVAL_MS / 1000} seconds\n`);
  
  await pingHealthz();
  
  setInterval(pingHealthz, INTERVAL_MS);
}

startMonitoring().catch(err => {
  console.error('Fatal error in uptime monitor:', err);
  process.exit(1);
});
