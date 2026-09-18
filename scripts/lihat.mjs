// Pratinjau lokal: sajikan dist/ di http://localhost:4321
// Jalankan: node scripts/lihat.mjs

import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { AKAR } from './lib/data.mjs';

const DIST = path.join(AKAR, 'dist');
const PORT = Number(process.env.PORT) || 4321;
const JENIS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.svg': 'image/svg+xml',
};

if (!fs.existsSync(path.join(DIST, 'index.html'))) {
  console.error('Folder dist/ belum ada. Jalankan dulu: npm run bangun');
  process.exit(1);
}

http
  .createServer((req, res) => {
    const alamat = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let berkas = path.normalize(path.join(DIST, alamat));
    if (!berkas.startsWith(DIST)) {
      res.writeHead(403).end();
      return;
    }
    if (fs.existsSync(berkas) && fs.statSync(berkas).isDirectory()) berkas = path.join(berkas, 'index.html');
    fs.readFile(berkas, (err, isi) => {
      if (err) {
        res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('Halaman tidak ditemukan.');
        return;
      }
      res.writeHead(200, { 'content-type': JENIS[path.extname(berkas)] ?? 'application/octet-stream', 'cache-control': 'no-store' }).end(isi);
    });
  })
  .listen(PORT, () => console.log(`Pratinjau LAJU: http://localhost:${PORT}`));
