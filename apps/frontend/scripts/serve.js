import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(process.cwd(), 'src');
const port = Number(process.env.FRONTEND_PORT || 4173);

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8'
};

createServer((req, res) => {
  let path = req.url === '/' ? '/index.html' : req.url;
  const safePath = path.split('?')[0];
  const full = resolve(root, `.${safePath}`);
  if (!full.startsWith(root) || !existsSync(full)) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Not found');
    return;
  }
  const ext = safePath.slice(safePath.lastIndexOf('.'));
  res.writeHead(200, { 'content-type': mime[ext] || 'text/plain; charset=utf-8' });
  res.end(readFileSync(full));
}).listen(port, () => {
  console.log(`Frontend running on http://localhost:${port}`);
});
