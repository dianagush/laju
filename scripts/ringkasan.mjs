// Langkah 5: Ringkasan Pagi. AI menulis 5 poin per lajur dari berita 24 jam terakhir.
// Butuh ANTHROPIC_API_KEY dan paket @anthropic-ai/sdk (npm install).
// Tanpa kunci, langkah ini dilewati dan situs menampilkan "Sorotan": berita yang paling banyak diliput.
// Jalankan: node scripts/ringkasan.mjs          (sekali sehari, setelah jamRingkasan)
//           node scripts/ringkasan.mjs --paksa  (buat ulang sekarang juga)

import path from 'node:path';
import config from '../laju.config.mjs';
import { FOLDER_RINGKASAN, beritaHari, ringkasanHari, tulisJson } from './lib/data.mjs';
import { kelompokkan, urutPenting } from './lib/olah.mjs';
import { geserHari, jamWIB, labelWaktu, tanggalPanjang, tanggalWIB } from './lib/waktu.mjs';

const MODEL = 'claude-opus-5';
const POIN_PER_LAJUR = 5;
const KANDIDAT_PER_LAJUR = 30;

const paksa = process.argv.includes('--paksa');
const sekarang = new Date();
const hariIni = tanggalWIB(sekarang);

function peringatan(pesan) {
  console.log(process.env.GITHUB_ACTIONS ? `::warning::${pesan}` : `! ${pesan}`);
}

if (!paksa && ringkasanHari(hariIni)) {
  console.log(`Ringkasan Pagi ${hariIni} sudah ada. Dilewati (pakai --paksa untuk membuat ulang).`);
  process.exit(0);
}
if (!paksa && jamWIB(sekarang) < config.jamRingkasan) {
  console.log(`Belum pukul ${String(config.jamRingkasan).padStart(2, '0')}.00 WIB. Ringkasan Pagi dilewati.`);
  process.exit(0);
}
if (!process.env.ANTHROPIC_API_KEY) {
  console.log('ANTHROPIC_API_KEY belum diatur. Ringkasan Pagi dilewati; situs menampilkan Sorotan (tanpa AI).');
  process.exit(0);
}

let Anthropic;
try {
  ({ default: Anthropic } = await import('@anthropic-ai/sdk'));
} catch {
  peringatan('Paket @anthropic-ai/sdk belum terpasang. Jalankan "npm install" lalu coba lagi.');
  process.exit(0);
}

// Kandidat: kelompok cerita dari 24 jam terakhir, yang paling banyak diliput lebih dulu.
const batas = sekarang.getTime() - 24 * 3600000;
const berita24Jam = [hariIni, geserHari(hariIni, -1)]
  .flatMap(beritaHari)
  .filter((b) => new Date(b.terbit).getTime() >= batas);

const kandidat = new Map();
const blokTeks = {};
for (const lajur of Object.keys(config.lajur)) {
  const kelompok = urutPenting(kelompokkan(berita24Jam.filter((b) => b.lajur === lajur)), sekarang.getTime()).slice(0, KANDIDAT_PER_LAJUR);
  blokTeks[lajur] = kelompok
    .map((k, i) => {
      const kode = `${lajur === 'tekno' ? 't' : 'o'}${i + 1}`;
      kandidat.set(kode, { lajur, kelompok: k });
      const lain = k.lain.slice(0, 3).map((b) => `  - judul terkait: ${b.judul} (${b.sumber})`).join('\n');
      return [
        `[${kode}] ${1 + k.lain.length} berita, ${k.jumlahSumber} media · ${labelWaktu(k.utama.terbit, hariIni)} WIB · ${k.utama.sumber}`,
        `  judul: ${k.utama.judul}`,
        k.utama.cuplikan ? `  cuplikan: ${k.utama.cuplikan}` : '',
        lain,
      ].filter(Boolean).join('\n');
    })
    .join('\n');
}

if (kandidat.size === 0) {
  peringatan('Tidak ada berita 24 jam terakhir untuk dirangkum. Jalankan ambil-berita.mjs dulu.');
  process.exit(0);
}

const SKEMA_POIN = {
  type: 'object',
  properties: {
    teks: { type: 'string' },
    sumber: { type: 'array', items: { type: 'string' } },
  },
  required: ['teks', 'sumber'],
  additionalProperties: false,
};
const SKEMA = {
  type: 'object',
  properties: {
    tekno: { type: 'array', items: SKEMA_POIN },
    olahraga: { type: 'array', items: SKEMA_POIN },
  },
  required: ['tekno', 'olahraga'],
  additionalProperties: false,
};

const perintah = `Tulis Ringkasan Pagi LAJU untuk ${tanggalPanjang(hariIni)}: ${POIN_PER_LAJUR} poin untuk lajur Teknologi (field "tekno") dan ${POIN_PER_LAJUR} poin untuk lajur Olahraga (field "olahraga"), dari berita 24 jam terakhir di bawah.

Aturan:
- Urutkan dari yang paling penting bagi pembaca Indonesia. Cerita yang diliput banyak berita dan banyak media biasanya lebih penting.
- Satu poin = satu cerita, 1–2 kalimat, paling banyak 35 kata, dengan kalimatmu sendiri (jangan menyalin judul).
- Pakai hanya fakta yang tertulis pada judul dan cuplikan. Jangan menambah angka, nama, skor, atau dugaan. Kalau judulnya ambigu, tulis secara umum saja.
- Setiap poin wajib mencantumkan 1–3 kode berita (misalnya "t3") di field "sumber", hanya dari lajur yang sama.
- Hindari gaya clickbait, tanda seru, dan emoji.
- Jika cerita di sebuah lajur kurang dari ${POIN_PER_LAJUR}, tulis sebanyak yang ada.

<berita_teknologi>
${blokTeks.tekno || '(kosong)'}
</berita_teknologi>

<berita_olahraga>
${blokTeks.olahraga || '(kosong)'}
</berita_olahraga>`;

const client = new Anthropic();
let response;
try {
  response = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 16000,
    // Jika model utama menolak permintaan, API otomatis mengulang di model cadangan yang direkomendasikan.
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: {
      effort: 'medium',
      format: { type: 'json_schema', schema: SKEMA },
    },
    system: 'Kamu editor pagi LAJU, portal berita teknologi dan olahraga berbahasa Indonesia. Tulisanmu ringkas, netral, dan setia pada sumber.',
    messages: [{ role: 'user', content: perintah }],
  });
} catch (err) {
  if (err instanceof Anthropic.AuthenticationError) peringatan('ANTHROPIC_API_KEY ditolak. Periksa kembali kuncinya.');
  else if (err instanceof Anthropic.RateLimitError) peringatan('Batas pemakaian API Claude tercapai. Ringkasan dicoba lagi pada pembaruan berikutnya.');
  else if (err instanceof Anthropic.APIError) peringatan(`API Claude membalas galat ${err.status}: ${err.message}`);
  else peringatan(`Gagal menghubungi API Claude: ${err.message}`);
  process.exit(0);
}

if (response.stop_reason === 'refusal') {
  peringatan(`Permintaan Ringkasan Pagi ditolak model (${response.stop_details?.category ?? 'tanpa kategori'}). Dicoba lagi pada pembaruan berikutnya.`);
  process.exit(0);
}
if (response.stop_reason === 'max_tokens') {
  peringatan('Jawaban AI terpotong (max_tokens). Ringkasan tidak disimpan.');
  process.exit(0);
}

const teks = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
let hasil;
try {
  hasil = JSON.parse(teks);
} catch {
  peringatan('Jawaban AI bukan JSON yang sah. Ringkasan tidak disimpan.');
  process.exit(0);
}

// Poin tanpa sumber yang sah (kode tak dikenal atau dari lajur lain) dibuang.
function rapikan(poin, lajur) {
  return (Array.isArray(poin) ? poin : [])
    .map((p) => {
      const sumber = [...new Set(p.sumber)]
        .filter((kode) => kandidat.get(kode)?.lajur === lajur)
        .slice(0, 3)
        .map((kode) => {
          const b = kandidat.get(kode).kelompok.utama;
          return { judul: b.judul, tautan: b.tautan, sumber: b.sumber, terbit: b.terbit };
        });
      return { teks: String(p.teks ?? '').trim(), sumber };
    })
    .filter((p) => p.teks && p.sumber.length)
    .slice(0, POIN_PER_LAJUR);
}

const ringkasan = {
  tanggal: hariIni,
  dibuat: sekarang.toISOString(),
  model: response.model,
  tekno: rapikan(hasil.tekno, 'tekno'),
  olahraga: rapikan(hasil.olahraga, 'olahraga'),
};

if (!ringkasan.tekno.length && !ringkasan.olahraga.length) {
  peringatan('Semua poin ringkasan ditolak karena tidak punya sumber yang sah. Tidak disimpan.');
  process.exit(0);
}

tulisJson(path.join(FOLDER_RINGKASAN, `${hariIni}.json`), ringkasan);
console.log(`Ringkasan Pagi ${hariIni} disimpan: ${ringkasan.tekno.length} poin teknologi, ${ringkasan.olahraga.length} poin olahraga (model ${response.model}, ${response.usage.input_tokens} token masuk, ${response.usage.output_tokens} token keluar).`);
