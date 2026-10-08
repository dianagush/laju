// Menentukan apakah pembaruan perlu dijalankan, dipakai workflow "Perbarui berita".
// GitHub kerap melewati jadwal gratis, jadi workflow dijadwalkan tiap 30 menit; skrip ini yang
// menjaga agar pembaruan tetap sekitar jamPembaruan di laju.config.mjs.
// Jalankan: node scripts/perlu-perbarui.mjs           -> "perlu=true/false" ke GITHUB_OUTPUT
//           node scripts/perlu-perbarui.mjs --paksa   -> selalu true (dipakai Run workflow manual)

import fs from 'node:fs';
import config from '../laju.config.mjs';
import { BERKAS_STATUS, bacaJson } from './lib/data.mjs';
import { pukul } from './lib/waktu.mjs';

const paksa = process.argv.includes('--paksa');
const jeda = (config.jedaMinimalMenit ?? 150) * 60000;
const status = bacaJson(BERKAS_STATUS, { diperbarui: null });
const selisih = status.diperbarui ? Date.now() - Date.parse(status.diperbarui) : Infinity;
const menit = Math.round(selisih / 60000);

const perlu = paksa || selisih >= jeda;
if (paksa) console.log('Dijalankan manual: pembaruan dilanjutkan.');
else if (perlu) console.log(`Pembaruan terakhir ${status.diperbarui ? `${pukul(status.diperbarui)} WIB (${menit} menit lalu)` : 'belum ada'}; pembaruan dilanjutkan.`);
else console.log(`Pembaruan terakhir ${pukul(status.diperbarui)} WIB (${menit} menit lalu), belum ${Math.round(jeda / 60000)} menit. Dilewati.`);

if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `perlu=${perlu}\n`);
