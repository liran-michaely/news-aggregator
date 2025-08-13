export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.status(204).end();
    return;
  }
  const url = req.query.url;
  if (!url || typeof url !== 'string') {
    res.status(400).json({ error: 'Missing url parameter' });
    return;
  }
  try {
    // Prevent SSRF to internal/private hosts
    const bad = /^(?:https?:\/\/(?:localhost|127\.|0\.0\.0\.0|10\.|192\.168\.|172\.(?:1[6-9]|2\d|3[0-1])\.))/i;
    if (bad.test(url)) {
      res.status(400).json({ error: 'Blocked URL' });
      return;
    }
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const ct = r.headers.get('content-type') || 'text/plain; charset=utf-8';
    const body = await r.text();
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', ct);
    res.status(r.status).send(body);
  } catch (e) {
    res.status(502).json({ error: String(e) });
  }
}