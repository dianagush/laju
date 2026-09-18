// Periksa hasil penggabungan berita duplikat dengan pengaturan `duplikat` di laju.config.mjs.
// Tidak mengubah data atau situs; hanya menampilkan laporan.
// Jalankan: npm run cek-duplikat                    (2 hari terakhir)
//           npm run cek-duplikat -- 2026-09-18      (tanggal itu dan sehari sebelumnya)
//           npm run cek-duplikat -- --semua         (tampilkan semua cerita gabungan dan pasangan mirip)

import config from '../laju.config.mjs';
import { FOLDER_BERITA, beritaHari, daftarTanggal } from './lib/data.mjs';
import { periksaDuplikat } from './lib/olah.mjs';
import { geserHari } from './lib/waktu.mjs';

const semua = process.argv.includes('--semua');
const tanggalArg = process.argv.find((a) => /^\d{4}-\d{2}-\d{2}$/.test(a));
const tersedia = daftarTanggal(FOLDER_BERITA);
if (!tersedia.length) {
  console.error('Belum ada data berita. Jalankan dulu: npm run ambil');
  process.exit(1);
}
const akhir = tanggalArg ?? tersedia[0];
const tanggal = [geserHari(akhir, -1), akhir].filter((t) => tersedia.includes(t));
if (!tanggal.length) {
  console.error(`Tidak ada data untuk ${akhir}. Tanggal yang tersedia: ${tersedia.slice(0, 7).join(', ')}…`);
  process.exit(1);
}

const berita = tanggal.flatMap(beritaHari);
const { pengaturan: p, cerita, hampir } = periksaDuplikat(berita, config.duplikat);
const gabungan = cerita.filter((c) => c.lain.length).sort((a, b) => b.lain.length - a.lain.length || b.jumlahSumber - a.jumlahSumber);
const batas = (n) => (semua ? Infinity : n);
const pendek = (s, n = 72) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

console.log(`Pengaturan duplikat: ${p.aktif ? 'aktif' : 'NONAKTIF'} · ambang ${p.ambang} · rata-rata ${p.ambangRataRata} · jendela ${p.jendelaJam} jam · ${p.sinonim.length} kelompok sinonim`);
console.log(`Pisahkan pra-laga/hasil: ${p.pisahkanPraDanHasil ? 'ya' : 'tidak'} · pisahkan lawan berbeda: ${p.pisahkanLawanBerbeda ? 'ya' : 'tidak'}`);
console.log(`\nDiperiksa: ${tanggal.join(' dan ')} · ${berita.length} berita → ${cerita.length} cerita (${berita.length - cerita.length} berita digabung)`);
for (const [id, l] of Object.entries(config.lajur)) {
  const b = berita.filter((x) => x.lajur === id).length;
  const c = cerita.filter((x) => x.lajur === id).length;
  console.log(`  ${l.nama}: ${b} berita → ${c} cerita`);
}

console.log(`\nCERITA GABUNGAN (${Math.min(gabungan.length, batas(15))} dari ${gabungan.length}, terbesar dulu)`);
for (const c of gabungan.slice(0, batas(15))) {
  console.log(`\n  [${c.lain.length + 1} berita · ${c.jumlahSumber} media] ${pendek(c.utama.judul)}`);
  console.log(`      ${c.utama.sumber} (utama)`);
  for (const b of c.lain) console.log(`      ${b.sumber}: ${pendek(b.judul, 64)}`);
}

console.log(`\nMIRIP TAPI TIDAK DIGABUNG (${Math.min(hampir.length, batas(20))} dari ${hampir.length}, kemiripan ≥ 0.35)`);
for (const h of hampir.slice(0, batas(20))) {
  console.log(`\n  ${h.skor.toFixed(2)}  ${h.alasan}`);
  console.log(`      ${h.a.sumber}: ${pendek(h.a.judul, 64)}`);
  console.log(`      ${h.b.sumber}: ${pendek(h.b.judul, 64)}`);
}

console.log(`
Cara membaca:
- Cerita gabungan yang isinya ternyata berbeda → naikkan "ambang" atau "ambangRataRata".
- Berita yang sama tetapi "di bawah ambang" karena beda istilah → tambahkan ke "sinonim",
  atau turunkan "ambang" sedikit (mis. 0.45).
- "pra-laga vs hasil" dan "lawan tanding berbeda" sengaja dipisah; matikan lewat
  "pisahkanPraDanHasil" / "pisahkanLawanBerbeda" bila tidak diinginkan.
Semua pengaturan ada di laju.config.mjs bagian "duplikat".`);
