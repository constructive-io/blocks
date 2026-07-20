import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(appDir, 'out');
const port = Number(process.env.PORT ?? 4173);

const mime: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
};

function resolveRequest(requestUrl: string | undefined): string | null {
  const pathname = decodeURIComponent(new URL(requestUrl ?? '/', 'http://localhost').pathname);
  if (pathname !== '/blocks' && !pathname.startsWith('/blocks/')) return null;
  const relative = pathname.slice('/blocks'.length).replace(/^\//, '');
  const candidate = path.resolve(outDir, relative);
  if (candidate !== outDir && !candidate.startsWith(`${outDir}${path.sep}`)) return null;
  if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  const index = path.join(candidate, 'index.html');
  return fs.existsSync(index) ? index : null;
}

const server = http.createServer((request, response) => {
  const file = resolveRequest(request.url);
  if (!file) {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Not found');
    return;
  }
  response.writeHead(200, {
    'cache-control': 'no-store',
    'content-type': mime[path.extname(file)] ?? 'application/octet-stream',
  });
  fs.createReadStream(file).pipe(response);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Serving ${outDir} at http://127.0.0.1:${port}/blocks/`);
});
