import fetch from 'node-fetch';

export default async function handler(req, res) {
  // Set CORS headers for all requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const url = req.query.url;
  if (!url) {
    res.status(400).json({ error: 'Missing url parameter' });
    return;
  }
  let target;
  try {
    target = new URL(url);
  } catch (_) {
    res.status(400).json({ error: 'Invalid url parameter' });
    return;
  }
  const forbidden = ['localhost','127.0.0.1','0.0.0.0', '10.', '192.168.', '172.'];
  if (forbidden.some(host => target.hostname.includes(host)) || !['http:','https:'].includes(target.protocol)) {
    res.status(400).json({ error: 'Forbidden host' });
    return;
  }
  try {
    const r = await fetch(target.toString(), {
      headers: { 
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache'
      },
      redirect: 'follow',
      timeout: 10000
    });
    
    if (!r.ok) {
      throw new Error(`HTTP ${r.status}: ${r.statusText}`);
    }
    
    const text = await r.text();
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=1800');
    const ct = r.headers.get('content-type') || 'text/plain; charset=utf-8';
    res.setHeader('Content-Type', ct);
    res.status(200).send(text);
  } catch (e) {
    console.error('Proxy error:', e.message);
    res.status(502).json({ error: 'Failed to fetch resource', details: e.message });
  }
}
