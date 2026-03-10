const DEFAULT_TIMEOUT_MS = Number(process.env.KEEPALIVE_TIMEOUT_MS || 10000);
const DEFAULT_METHOD = String(process.env.KEEPALIVE_METHOD || 'GET').toUpperCase();
const DEFAULT_HEADERS = { 'User-Agent': 'tenderflow-keepalive/1.0' };

function parseUrls(value) {
  return String(value || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function ping(url, method, timeoutMs) {
  const startedAt = Date.now();
  try {
    const response = await fetchWithTimeout(url, { method, headers: DEFAULT_HEADERS }, timeoutMs);
    const elapsedMs = Date.now() - startedAt;
    if (!response.ok) {
      console.error(`[keepalive] ${url} responded ${response.status} in ${elapsedMs}ms`);
      return false;
    }
    console.log(`[keepalive] ${url} responded ${response.status} in ${elapsedMs}ms`);
    return true;
  } catch (error) {
    const elapsedMs = Date.now() - startedAt;
    console.error(`[keepalive] ${url} failed after ${elapsedMs}ms: ${error.message}`);
    return false;
  }
}

async function run() {
  const urls = parseUrls(process.env.KEEPALIVE_URLS);
  if (urls.length === 0) {
    console.error('[keepalive] KEEPALIVE_URLS is empty. Provide a comma-separated list of URLs.');
    process.exit(1);
  }

  const timeoutMs = Number.isFinite(DEFAULT_TIMEOUT_MS) && DEFAULT_TIMEOUT_MS > 0 ? DEFAULT_TIMEOUT_MS : 10000;
  const method = ['GET', 'HEAD'].includes(DEFAULT_METHOD) ? DEFAULT_METHOD : 'GET';

  const results = await Promise.all(urls.map((url) => ping(url, method, timeoutMs)));
  const failed = results.filter((ok) => !ok).length;

  if (failed > 0) {
    console.error(`[keepalive] ${failed} request(s) failed.`);
    process.exit(1);
  }
}

run().catch((error) => {
  console.error(`[keepalive] unexpected error: ${error.message}`);
  process.exit(1);
});
