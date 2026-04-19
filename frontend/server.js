/**
 * Minimal static file server for the Vue SPA dist folder.
 * SPA routing: any unknown path falls back to index.html.
 * Used by PM2 instead of the `serve` CLI to avoid PATH/version issues.
 */
const http = require('http');
const path = require('path');
const fs   = require('fs');

const DIST = path.join(__dirname, 'dist');
const PORT = Number(process.env.PORT) || 3000;

const MIME = {
  '.html':  'text/html; charset=utf-8',
  '.js':    'application/javascript',
  '.css':   'text/css',
  '.json':  'application/json',
  '.png':   'image/png',
  '.jpg':   'image/jpeg',
  '.jpeg':  'image/jpeg',
  '.gif':   'image/gif',
  '.svg':   'image/svg+xml',
  '.ico':   'image/x-icon',
  '.woff':  'font/woff',
  '.woff2': 'font/woff2',
  '.ttf':   'font/ttf',
  '.map':   'application/json',
};

const server = http.createServer((req, res) => {
  // Strip query string and decode URI
  let urlPath = req.url.split('?')[0];
  try { urlPath = decodeURIComponent(urlPath); } catch (_) {}

  let filePath = path.join(DIST, urlPath);

  // Security: prevent path traversal
  if (!filePath.startsWith(DIST)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }

  // Resolve to a file
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    // SPA fallback → index.html
    filePath = path.join(DIST, 'index.html');
  }

  const ext      = path.extname(filePath).toLowerCase();
  const mimeType = MIME[ext] || 'application/octet-stream';
  const isHtml   = ext === '.html' || ext === '';

  res.setHeader('Content-Type', mimeType);
  res.setHeader('Cache-Control', isHtml ? 'no-cache' : 'public, max-age=31536000, immutable');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  const stream = fs.createReadStream(filePath);
  stream.on('error', () => { res.writeHead(404); res.end('Not found'); });
  stream.pipe(res);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`✅ HR Frontend serving ${DIST} on port ${PORT}`);
});
