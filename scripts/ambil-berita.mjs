// Langkah 1–3: ambil RSS dari semua sumber, saring, lalu gabungkan ke berkas harian di data/berita/.
// Jalankan: node scripts/ambil-berita.mjs

import crypto from 'node:crypto';
import path from 'node:path';
import config from '../laju.config.mjs';
import { ambilFeed } from './lib/rss.mjs';
import { memuatKata, terbitUlang } from './lib/olah.mjs';
import { tanggalWIB } from './lib/waktu.mjs';
import { BERKAS_STATUS, FOLDER_BERITA, bacaJson, tulisJson } from './lib/data.mjs';

const sekarang = new Date();
const batasSimpan = sekarang.getTime() - config.simpanMaksHari * 86400000;

function idBerita(tautan) {
  return crypto.createHash('sha1').update(tautan.replace(/[?#].*$/, '')).digest('hex').slice(0, 12);
}

const hasilPerSumber = await Promise.all(
  config.sumber.map(async (s) => {
    try {
      const item = await ambilFeed(s.url);
      return { sumber: s, item };
    } catch (err) {
      return { sumber: s, item: [], galat: err.name === 'TimeoutError' ? 'Tidak merespons (batas waktu habis)' : err.message };
    }
  }),
);

const perHari = new Map();
const status = { diperbarui: sekarang.toISOString(), sumber: [] };

for (const { sumber: s, item, galat } of hasilPerSumber) {
  let diterima = 0;
  const dibuang = { luarTopik: 0, terbitUlang: 0, terlaluLama: 0, masaDepan: 0 };
  for (const it of item) {
    const waktu = new Date(it.terbit).getTime();
    if (waktu < batasSimpan) { dibuang.terlaluLama += 1; continue; }
    if (waktu > sekarang.getTime() + 3600000) { dibuang.masaDepan += 1; continue; }
    if (memuatKata(it.judul, config.saring[s.lajur]) && !memuatKata(it.judul, config.tetapSimpan[s.lajur])) {
      dibuang.luarTopik += 1;
      continue;
    }
    if (terbitUlang(it, config.batasTerbitUlangHari)) { dibuang.terbitUlang += 1; continue; }

    const berita = {
      id: idBerita(it.tautan),
      judul: it.judul,
      tautan: it.tautan,
      sumber: s.nama,
      kanal: s.id,
      lajur: s.lajur,
      terbit: it.terbit,
      cuplikan: it.cuplikan,
      gambar: it.gambar,
    };
    const hari = tanggalWIB(it.terbit);
    if (!perHari.has(hari)) perHari.set(hari, []);
    perHari.get(hari).push(berita);
    diterima += 1;
  }
  const terbaru = item.map((i) => i.terbit).sort().at(-1) ?? null;
  status.sumber.push({ id: s.id, nama: s.nama, kanal: s.kanal, lajur: s.lajur, ok: !galat, galat: galat ?? null, jumlahFeed: item.length, diterima, dibuang, terbaru });

  const ket = galat ? `GAGAL: ${galat}` : `${diterima}/${item.length} diterima (luar topik ${dibuang.luarTopik}, terbit ulang ${dibuang.terbitUlang}, lama ${dibuang.terlaluLama})`;
  console.log(`${galat ? '✗' : '✓'} ${s.nama} · ${s.kanal}: ${ket}`);
}

// Gabungkan ke berkas harian; berita yang sudah ada diperbarui, bukan diduplikasi.
let baru = 0;
for (const [hari, daftar] of perHari) {
  const berkas = path.join(FOLDER_BERITA, `${hari}.json`);
  const lama = bacaJson(berkas, { tanggal: hari, berita: [] });
  const peta = new Map(lama.berita.map((b) => [b.id, b]));
  for (const b of daftar) {
    if (!peta.has(b.id)) baru += 1;
    peta.set(b.id, { ...peta.get(b.id), ...b });
  }
  const berita = [...peta.values()].sort((a, b) => b.terbit.localeCompare(a.terbit));
  tulisJson(berkas, { tanggal: hari, diperbarui: sekarang.toISOString(), berita });
}

tulisJson(BERKAS_STATUS, status);

const gagal = status.sumber.filter((s) => !s.ok);
console.log(`\n${baru} berita baru disimpan ke data/berita/.`);
if (gagal.length === config.sumber.length) {
  console.error('Semua sumber gagal diambil. Periksa koneksi internet.');
  process.exit(1);
}
if (gagal.length && process.env.GITHUB_ACTIONS) {
  console.log(`::warning::${gagal.length} sumber gagal: ${gagal.map((s) => `${s.nama} ${s.kanal}`).join(', ')}`);
}
