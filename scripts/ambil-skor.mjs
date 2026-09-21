// Ambil skor sepak bola liga-liga di laju.config.mjs (bagian `skor`) dari papan skor ESPN,
// lalu simpan ke data/skor.json. Hasil lama digabung dengan yang baru, jadi satu pekan
// pertandingan (Jumat–Senin) tetap lengkap walau tiap kali hanya beberapa hari yang diambil.
// Jalankan: node scripts/ambil-skor.mjs

import path from 'node:path';
import config from '../laju.config.mjs';
import { AKAR, bacaJson, tulisJson } from './lib/data.mjs';

const BERKAS = path.join(AKAR, 'data', 'skor.json');
const DASAR = 'https://site.api.espn.com/apis/site/v2/sports/soccer';
const HARI = 86400000;

function peringatan(pesan) {
  console.log(process.env.GITHUB_ACTIONS ? `::warning::${pesan}` : `! ${pesan}`);
}

if (!config.skor?.aktif) {
  console.log('Skor dinonaktifkan di laju.config.mjs. Dilewati.');
  process.exit(0);
}

async function ambilJson(url) {
  const res = await fetch(url, {
    headers: { 'user-agent': `LAJU/1.0 (+${config.alamatSitus || 'https://github.com'})`, accept: 'application/json' },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function statusLaga(tipe) {
  if (/POSTPONED/.test(tipe.name)) return 'ditunda';
  if (/CANCEL|ABANDON/.test(tipe.name)) return 'batal';
  if (tipe.state === 'in') return 'berlangsung';
  if (tipe.state === 'post') return 'selesai';
  return 'pra';
}

// Logo tim dari ESPN berukuran 500 px; minta versi 48 px supaya halaman tetap ringan.
function logoKecil(url) {
  const m = url.match(/^https:\/\/a\.espncdn\.com(\/i\/teamlogos\/[^?]+)$/);
  return m ? `https://a.espncdn.com/combiner/i?img=${m[1]}&w=48&h=48` : url;
}

function bentukLaga(e, ligaId) {
  const c = e.competitions?.[0];
  if (!c) return null;
  const tim = (sisi) => {
    const t = c.competitors.find((x) => x.homeAway === sisi);
    if (!t) return null;
    return {
      nama: t.team.shortDisplayName || t.team.displayName,
      namaLengkap: t.team.displayName,
      logo: logoKecil(t.team.logo ?? ''),
      skor: t.score != null && t.score !== '' ? Number(t.score) : null,
      menang: t.winner === true,
    };
  };
  const tuanRumah = tim('home');
  const tamu = tim('away');
  if (!tuanRumah || !tamu) return null;
  return {
    id: e.id,
    liga: ligaId,
    mulai: new Date(e.date).toISOString(),
    status: statusLaga(c.status.type),
    detail: c.status.type.shortDetail ?? '',
    tuanRumah,
    tamu,
    tautan: (e.links ?? []).find((l) => l.rel?.includes('summary'))?.href ?? '',
  };
}

const ymd = (iso) => iso.slice(0, 10).replaceAll('-', '');

const sekarang = Date.now();
const lama = bacaJson(BERKAS, { liga: {} });
const hasil = { diperbarui: new Date(sekarang).toISOString(), sumber: 'ESPN', liga: {} };
let gagal = 0;

for (const liga of config.skor.liga) {
  const tersimpan = new Map((lama.liga?.[liga.id]?.laga ?? []).map((l) => [l.id, l]));
  // Pertama kali (belum ada data): ambil sepekan penuh ke belakang. Selanjutnya cukup 3 hari terakhir.
  const mundur = tersimpan.size ? 3 : config.skor.hariKeBelakang;
  try {
    const papan = await ambilJson(`${DASAR}/${liga.id}/scoreboard`);
    for (const e of papan.events ?? []) {
      const l = bentukLaga(e, liga.id);
      if (l) tersimpan.set(l.id, l);
    }
    // Kalender berisi tanggal-tanggal yang ada pertandingannya; ambil yang masuk rentang.
    const tanggal = (papan.leagues?.[0]?.calendar ?? [])
      .filter((t) => typeof t === 'string')
      .filter((t) => Date.parse(t) >= sekarang - mundur * HARI && Date.parse(t) <= sekarang + config.skor.hariKeDepan * HARI)
      .map(ymd);
    for (const tgl of [...new Set(tanggal)]) {
      const hari = await ambilJson(`${DASAR}/${liga.id}/scoreboard?dates=${tgl}`);
      for (const e of hari.events ?? []) {
        const l = bentukLaga(e, liga.id);
        if (l) tersimpan.set(l.id, l);
      }
    }
    const laga = [...tersimpan.values()]
      .filter((l) => Date.parse(l.mulai) >= sekarang - config.skor.hariKeBelakang * HARI && Date.parse(l.mulai) <= sekarang + config.skor.hariKeDepan * HARI)
      .sort((a, b) => a.mulai.localeCompare(b.mulai));
    hasil.liga[liga.id] = { nama: liga.nama, laga };
    const selesai = laga.filter((l) => l.status === 'selesai').length;
    console.log(`✓ ${liga.nama}: ${laga.length} pertandingan (${selesai} selesai, ${laga.length - selesai} lainnya)`);
  } catch (err) {
    gagal += 1;
    // Gagal mengambil: pakai data lama supaya skor di situs tidak hilang.
    hasil.liga[liga.id] = lama.liga?.[liga.id] ?? { nama: liga.nama, laga: [] };
    peringatan(`Skor ${liga.nama} gagal diambil (${err.name === 'TimeoutError' ? 'tidak merespons' : err.message}). Data lama dipakai.`);
  }
}

if (gagal === config.skor.liga.length && lama.diperbarui) hasil.diperbarui = lama.diperbarui;
tulisJson(BERKAS, hasil);
console.log(`Skor disimpan ke data/skor.json${gagal ? ` (${gagal} liga gagal)` : ''}.`);
