export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  
  return res.status(200).json({ 
    message: 'API is working!', 
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString()
  });
}
