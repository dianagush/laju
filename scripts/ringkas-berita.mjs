// Ringkasan satu paragraf untuk berita utama (laju.config.mjs bagian `ringkasanBerita`).
// Penyedia dan modelnya diatur bersama Ringkasan Pagi di bagian `ai`.
// Daftar berita utama ditulis oleh bangun.mjs ke .laju/utama.json, jadi urutannya:
//   node scripts/bangun.mjs && node scripts/ringkas-berita.mjs && node scripts/bangun.mjs
// Hanya berita yang belum punya ringkasan yang dikirim ke AI; hasil disimpan di data/ringkasan-berita.json.

import path from 'node:path';
import config from '../laju.config.mjs';
import { KuotaHabis, KunciDitolak, kunciAI, namaKunci, penulisAI, tunggu } from './lib/ai.mjs';
import { AKAR, bacaJson, tulisJson } from './lib/data.mjs';
import { ambilTeksArtikel } from './lib/artikel.mjs';
import { ambilFeed } from './lib/rss.mjs';

const BERKAS = path.join(AKAR, 'data', 'ringkasan-berita.json');
const ANTRIAN = path.join(AKAR, '.laju', 'utama.json');
const SIMPAN_HARI = 14;
const ai = config.ai ?? {};
const p = config.ringkasanBerita ?? {};

function peringatan(pesan) {
  console.log(process.env.GITHUB_ACTIONS ? `::warning::${pesan}` : `! ${pesan}`);
}

if (!p.aktif) {
  console.log('Ringkasan berita dinonaktifkan di laju.config.mjs. Dilewati.');
  process.exit(0);
}
if (!kunciAI(ai.penyedia)) {
  console.log(`${namaKunci(ai.penyedia)} belum diatur. Ringkasan berita dilewati; berita utama tampil dengan cuplikan biasa.`);
  process.exit(0);
}

const penulis = penulisAI({
  penyedia: ai.penyedia,
  modelGemini: ai.modelGemini,
  modelGeminiCadangan: ai.modelGeminiCadangan,
  modelClaude: ai.modelClaude,
  sistem: 'Kamu penulis ringkasan berita untuk LAJU, portal berita berbahasa Indonesia. Tulisanmu ringkas, netral, dan setia pada teks sumber.',
  maksToken: 4000,
  peringatan,
});

// ---------- Bahan ringkasan ----------

// Teks RSS utuh untuk cadangan (Ars Technica, The Guardian, dsb. menyertakan beberapa paragraf).
const cacheFeed = new Map();
async function teksDariRss(kanal, tautan) {
  const sumber = config.sumber.find((s) => s.id === kanal);
  if (!sumber) return '';
  if (!cacheFeed.has(kanal)) cacheFeed.set(kanal, ambilFeed(sumber.url).catch(() => []));
  const item = (await cacheFeed.get(kanal)).find((i) => i.tautan === tautan);
  return item?.teksLengkap ?? '';
}

function perintahUntuk(c, teks) {
  return `Ringkas berita berikut dalam SATU paragraf bahasa Indonesia, 2–4 kalimat, paling banyak ${p.maksKata} kata.

Aturan:
- Tulis dengan kalimatmu sendiri; jangan menyalin kalimat dari teks.
- Pakai hanya fakta yang ada di teks. Jangan menambah angka, nama, atau dugaan.
- Jangan mengulang judul apa adanya, dan jangan membuka dengan "Berita ini" atau "Artikel ini".
- Abaikan bagian teks yang bukan isi berita (iklan, promosi acara, tautan "baca juga").
- Tanpa judul, poin, atau format markdown. Balas hanya paragrafnya.
- Nama produk dan istilah teknis boleh tetap dalam bahasa aslinya.

Judul: ${c.judul}
Sumber: ${c.sumber}

<teks_berita>
${teks}
</teks_berita>`;
}

// Rapikan jawaban AI: satu paragraf, tanpa markdown, dan tidak jauh melebihi batas kata.
function rapikan(teks) {
  let t = teks.replace(/[*_#`>]+/g, '').replace(/^\s*(ringkasan|summary)\s*:\s*/i, '').replace(/\s+/g, ' ').trim();
  const kata = t.split(' ');
  if (kata.length > p.maksKata + 20) {
    t = kata.slice(0, p.maksKata + 20).join(' ');
    const akhir = Math.max(t.lastIndexOf('. '), t.lastIndexOf('.'));
    t = akhir > t.length / 2 ? t.slice(0, akhir + 1) : `${t}…`;
  }
  return t;
}

// ---------- Proses ----------

const antrian = bacaJson(ANTRIAN, []);
const simpanan = bacaJson(BERKAS, {});
const batasLama = Date.now() - SIMPAN_HARI * 86400000;
for (const [id, r] of Object.entries(simpanan)) if (Date.parse(r.dibuat) < batasLama) delete simpanan[id];

const perlu = antrian.filter((c) => !c.id.some((id) => simpanan[id])).slice(0, p.maksPerPembaruan);
console.log(`${antrian.length} berita utama, ${perlu.length} belum punya ringkasan (penyedia: ${ai.penyedia}).`);

let dibuat = 0;
const agent = `LAJU/1.0 (+${config.alamatSitus || 'https://github.com'})`;
for (const c of perlu) {
  let bahan = await ambilTeksArtikel(c.tautan, { userAgent: agent });
  let dari = 'artikel';
  if (!bahan) {
    const rss = await teksDariRss(c.kanal, c.tautan);
    if (rss.split(' ').length >= 60) {
      bahan = { teks: rss.split(' ').slice(0, 1200).join(' ') };
      dari = 'rss';
    }
  }
  if (!bahan) {
    console.log(`- dilewati (teks tidak terbaca): ${c.sumber} · ${c.judul.slice(0, 70)}`);
    continue;
  }
  try {
    if (dibuat > 0 && p.jedaDetik) await tunggu(p.jedaDetik * 1000);
    const hasil = await penulis.tulis(perintahUntuk(c, bahan.teks));
    if (!hasil) {
      console.log(`- AI tidak memberi ringkasan: ${c.judul.slice(0, 70)}`);
      continue;
    }
    simpanan[c.id[0]] = {
      teks: rapikan(hasil),
      penyedia: ai.penyedia,
      model: penulis.model(),
      dari,
      dibuat: new Date().toISOString(),
    };
    dibuat += 1;
    console.log(`✓ ${c.sumber} · ${c.judul.slice(0, 70)}`);
  } catch (err) {
    if (err instanceof KuotaHabis) {
      peringatan(`${err.message}. Sisa berita diringkas pada pembaruan berikutnya.`);
      break;
    }
    if (err instanceof KunciDitolak) {
      peringatan(err.message);
      break;
    }
    peringatan(`Ringkasan gagal untuk "${c.judul.slice(0, 60)}": ${err.message}`);
  }
}

tulisJson(BERKAS, simpanan);
console.log(`${dibuat} ringkasan baru disimpan ke data/ringkasan-berita.json.`);
