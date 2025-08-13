export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.status(204).end();
    return;
  }
  const url = req.query.url;
  if (!url) {
    res.status(400).json({ error: 'Missing url parameter' });
    return;
  }
  try {
    const target = new URL(url);
    const forbidden = ['localhost','127.0.0.1','0.0.0.0'];
    if (forbidden.includes(target.hostname)) {
      res.status(400).json({ error: 'Forbidden host' });
      return;
    }
    const r = await fetch(target.toString(), {
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; NewsAggBot/1.0)' },
      redirect: 'follow'
    });
    const text = await r.text();
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=600');
    const ct = r.headers.get('content-type') || 'text/plain; charset=utf-8';
    res.setHeader('Content-Type', ct);
    res.status(200).send(text);
  } catch (e) {
    res.status(502).json({ error: e.message || String(e) });
  }
}