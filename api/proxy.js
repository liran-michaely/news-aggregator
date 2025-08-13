export default async function handler(req, res) {
  const targetUrl = req.query.url;
  if (!targetUrl) {
    res.status(400).json({ error: 'Missing url parameter' });
    return;
  }
  try {
    const response = await fetch(targetUrl);
    const data = await response.text();
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.status(200).send(data);
  } catch (err) {
    res.status(500).json({ error: err.toString() });
  }
}