/**
 * TikFlow Media Stream Redirect (/api/stream)
 * Clean 302 redirect - never hits Vercel's 4.5MB serverless payload limit!
 */
export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { url } = req.query || {};

  if (!url) {
    return res.status(400).send('Missing "url" parameter');
  }

  res.writeHead(302, { Location: url });
  res.end();
}
