import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import downloadHandler from './api/download.js';
import streamHandler from './api/stream.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = 3000;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);

  // Route: /api/download
  if (parsedUrl.pathname === '/api/download') {
    const mockReq = {
      query: Object.fromEntries(parsedUrl.searchParams),
      method: req.method
    };

    const mockRes = {
      statusCode: 200,
      headers: {},
      setHeader(k, v) { this.headers[k] = v; res.setHeader(k, v); },
      status(code) { this.statusCode = code; return this; },
      end() { res.writeHead(this.statusCode); res.end(); },
      json(obj) {
        res.writeHead(this.statusCode, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(obj));
      }
    };

    try {
      await downloadHandler(mockReq, mockRes);
    } catch (err) {
      console.error('Download Handler error:', err);
      if (!res.writableEnded) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: err.message }));
      }
    }
    return;
  }

  // Route: /api/stream
  if (parsedUrl.pathname === '/api/stream') {
    const mockReq = {
      query: Object.fromEntries(parsedUrl.searchParams),
      method: req.method
    };

    // Attach stream helper methods to res
    res.status = (code) => { res.statusCode = code; return res; };
    res.send = (msg) => { res.end(msg); return res; };

    try {
      await streamHandler(mockReq, res);
    } catch (err) {
      console.error('Stream Handler error:', err);
      if (!res.writableEnded) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Stream error: ' + err.message);
      }
    }
    return;
  }

  // Static files in /public
  let filePath = parsedUrl.pathname === '/' ? '/index.html' : parsedUrl.pathname;
  const safePath = path.normalize(path.join(__dirname, 'public', filePath));

  if (!safePath.startsWith(path.join(__dirname, 'public'))) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.readFile(safePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/html' });
      return res.end('<h1>404 Not Found</h1>');
    }
    const ext = path.extname(safePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    res.end(content);
  });
});

server.listen(PORT, () => {
  console.log(`\nTikFlow Server running at http://localhost:${PORT}`);
});
