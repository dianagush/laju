// Membaca dan menulis data berita di folder data/.
// data/berita/YYYY-MM-DD.json   berita per hari (WIB), menjadi arsip
// data/ringkasan/YYYY-MM-DD.json Ringkasan Pagi per hari
// data/status.json              hasil pengambilan terakhir per sumber

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const AKAR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const FOLDER_BERITA = path.join(AKAR, 'data', 'berita');
export const FOLDER_RINGKASAN = path.join(AKAR, 'data', 'ringkasan');
export const BERKAS_STATUS = path.join(AKAR, 'data', 'status.json');

export function bacaJson(berkas, bawaan = null) {
  try {
    return JSON.parse(fs.readFileSync(berkas, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return bawaan;
    throw new Error(`Gagal membaca ${path.relative(AKAR, berkas)}: ${err.message}`);
  }
}

export function tulisJson(berkas, isi) {
  fs.mkdirSync(path.dirname(berkas), { recursive: true });
  fs.writeFileSync(berkas, `${JSON.stringify(isi, null, 2)}\n`);
}

// Tanggal-tanggal yang punya berkas di sebuah folder, terbaru dulu.
export function daftarTanggal(folder) {
  if (!fs.existsSync(folder)) return [];
  return fs
    .readdirSync(folder)
    .filter((n) => /^\d{4}-\d{2}-\d{2}\.json$/.test(n))
    .map((n) => n.slice(0, 10))
    .sort()
    .reverse();
}

export function beritaHari(tanggal) {
  return bacaJson(path.join(FOLDER_BERITA, `${tanggal}.json`), { tanggal, berita: [] }).berita;
}

export function ringkasanHari(tanggal) {
  return bacaJson(path.join(FOLDER_RINGKASAN, `${tanggal}.json`));
}
