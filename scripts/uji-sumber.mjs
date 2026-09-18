// Uji apakah kanal RSS bisa dibaca dari mesin ini. Paling berguna dijalankan di server GitHub
// (Actions → Uji sumber → Run workflow), karena sebagian media memblokir server GitHub
// walau lancar dibuka dari komputer biasa.
// Jalankan: node scripts/uji-sumber.mjs                 (menguji semua sumber di laju.config.mjs)
//           node scripts/uji-sumber.mjs URL [URL ...]   (menguji URL tertentu)
// Hasil disimpan ke data/uji-sumber.json.

import fs from 'node:fs';
import path from 'node:path';
import config from '../laju.config.mjs';
import { ambilFeed } from './lib/rss.mjs';
import { AKAR, tulisJson } from './lib/data.mjs';

const urlArgumen = process.argv.slice(2).flatMap((a) => a.split(/[\s,]+/)).filter((u) => /^https?:\/\//.test(u));
const daftar = urlArgumen.length ? urlArgumen.map((url) => ({ url })) : config.sumber;
const sekarang = Date.now();

const hasil = await Promise.all(
  daftar.map(async (s) => {
    const mulai = Date.now();
    try {
      const item = await ambilFeed(s.url);
      const waktu = item.map((i) => Date.parse(i.terbit)).sort((a, b) => b - a);
      return {
        url: s.url,
        ok: true,
        jumlah: item.length,
        dalam24Jam: waktu.filter((t) => sekarang - t < 86400000 && t - sekarang < 3600000).length,
        terbaru: waktu[0] ? new Date(waktu[0]).toISOString() : null,
        denganGambar: item.filter((i) => i.gambar).length,
        contoh: item[0]?.judul ?? null,
        ms: Date.now() - mulai,
      };
    } catch (err) {
      return { url: s.url, ok: false, galat: err.message, ms: Date.now() - mulai };
    }
  }),
);

tulisJson(path.join(AKAR, 'data', 'uji-sumber.json'), {
  diuji: new Date().toISOString(),
  dari: process.env.GITHUB_ACTIONS ? 'server GitHub Actions' : 'komputer lokal',
  hasil,
});

const baris = hasil.map((h) => (h.ok ? `✓ ${h.url} · ${h.jumlah} item, ${h.dalam24Jam} dalam 24 jam` : `✗ ${h.url} · ${h.galat}`));
console.log(baris.join('\n'));

if (process.env.GITHUB_STEP_SUMMARY) {
  const tabel = [
    '| Kanal | Hasil | Item | Dalam 24 jam |',
    '|---|---|---|---|',
    ...hasil.map((h) => `| ${h.url} | ${h.ok ? 'bisa dibaca' : `gagal: ${h.galat}`} | ${h.jumlah ?? '–'} | ${h.dalam24Jam ?? '–'} |`),
  ];
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${tabel.join('\n')}\n`);
}
