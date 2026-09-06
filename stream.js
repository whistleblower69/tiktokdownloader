import { Readable } from 'stream';

/**
 * TikFlow Media Stream Proxy (/api/stream)
 * Forces direct attachment download header so browsers download MP4/MP3 files automatically
 * instead of opening them in a new tab / video player.
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { url, name } = req.query;

  if (!url) {
    return res.status(400).send('Missing "url" query parameter.');
  }

  const filename = (name || 'tiktok_video.mp4').replace(/[^\w\d_\-\.äöüÄÖÜß]/g, '_');

  try {
    const upstream = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Referer': 'https://www.tiktok.com/'
      }
    });

    if (!upstream.ok) {
      return res.status(upstream.status).send(`Failed to fetch upstream media: ${upstream.statusText}`);
    }

    const isAudio = filename.endsWith('.mp3') || url.includes('.mp3');
    const contentType = upstream.headers.get('content-type') || (isAudio ? 'audio/mpeg' : 'video/mp4');
    const contentLength = upstream.headers.get('content-length');

    // Force automatic browser download (Content-Disposition: attachment)
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', contentType);
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }

    if (upstream.body) {
      const nodeStream = Readable.fromWeb(upstream.body);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (err) {
    console.error('Stream proxy error:', err);
    if (!res.writableEnded) {
      res.status(500).send('Stream proxy error: ' + err.message);
    }
  }
}
