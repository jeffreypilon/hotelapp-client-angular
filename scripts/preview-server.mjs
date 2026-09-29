// Minimal static file server for `npm run preview` -- serves dist/browser so the runtime
// public/config.js mechanism (see environment-setup-guide.md) can be exercised, which `ng serve`
// never does. No new dependency: node:http/node:fs only, per dependency-policy.md's "could fifty
// lines replace it?" question.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join } from 'node:path';

const ROOT = join(process.cwd(), 'dist/hotelapp-client-angular/browser');
const PORT = 4300;

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
};

createServer(async (req, res) => {
  let path = join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  try {
    const s = await stat(path);
    if (s.isDirectory()) path = join(path, 'index.html');
  } catch {
    path = join(ROOT, 'index.html');
  }
  try {
    const body = await readFile(path);
    res.writeHead(200, { 'Content-Type': MIME[extname(path)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
}).listen(PORT, () => {
  console.log(`Preview server: http://localhost:${PORT}`);
});
