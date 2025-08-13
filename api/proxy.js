export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  const targetUrl = req.query.url;
  if (!targetUrl) {
    res.status(400).json({ error: 'Missing url parameter' });
    return;
  }
  try {
    const response = await fetch(targetUrl);
    const contentType = response.headers.get('content-type') || 'text/plain';
    const data = await response.text();
    res.setHeader('Content-Type', contentType);
    res.status(200).send(data);
  } catch (error) {
    res.status(500).json({ error: error.toString() });
  }
}
