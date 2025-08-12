
// Simple CORS relay on Vercel
const fetchFn = global.fetch || (await import('node-fetch')).default;
module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, *');
    res.status(204).end();
    return;
  }
  const target = (req.query && req.query.url) || '';
  if (!target) { 
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(400).json({ error: 'Missing url parameter' }); 
    return; 
  }
  try {
    const u = new URL(target);
    const host = u.hostname;
    const forbidden = /(^localhost$)|(^127\.)|(^10\.)|(^172\.(1[6-9]|2\d|3[0-1])\.)|(^192\.168\.)/;
    if (forbidden.test(host)) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.status(400).json({ error: 'Local addresses blocked' });
      return;
    }
    const r = await fetchFn(target, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NewsAggregator/1.0)',
        'Accept': '*/*'
      }
    });
    const body = await r.text();
    res.setHeader('Content-Type', r.headers.get('content-type') || 'text/plain; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    res.status(r.status).send(body);
  } catch (err) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(502).json({ error: 'Upstream fetch failed', detail: String(err && err.message || err) });
  }
};
