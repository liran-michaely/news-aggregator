export default async function handler(req, res) {
  // Set CORS headers for all requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const url = req.query.url;
  if (!url) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }
  
  let target;
  try {
    target = new URL(url);
  } catch (error) {
    return res.status(400).json({ error: 'Invalid url parameter' });
  }
  
  // Security check for internal networks
  const forbidden = ['localhost','127.0.0.1','0.0.0.0', '10.', '192.168.', '172.'];
  if (forbidden.some(host => target.hostname.includes(host)) || !['http:','https:'].includes(target.protocol)) {
    return res.status(400).json({ error: 'Forbidden host' });
  }
  
  try {
    // Use Node.js fetch (available in Node 18+) or import fetch for older versions
    const fetchFunction = global.fetch || (await import('node-fetch')).default;
    
    const response = await fetchFunction(target.toString(), {
      method: 'GET',
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache'
      },
      redirect: 'follow'
    });
    
    if (!response.ok) {
      console.error(`Fetch failed for ${url}: ${response.status} ${response.statusText}`);
      return res.status(502).json({ 
        error: 'Failed to fetch resource', 
        status: response.status,
        statusText: response.statusText 
      });
    }
    
    const text = await response.text();
    
    // Set response headers
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=1800');
    const contentType = response.headers.get('content-type') || 'application/xml; charset=utf-8';
    res.setHeader('Content-Type', contentType);
    
    return res.status(200).send(text);
    
  } catch (error) {
    console.error('Proxy error for', url, ':', error.message);
    return res.status(502).json({ 
      error: 'Failed to fetch resource', 
      details: error.message 
    });
  }
}
