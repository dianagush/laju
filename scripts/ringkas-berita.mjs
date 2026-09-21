// Ringkasan satu paragraf untuk berita utama (laju.config.mjs bagian `ringkasanBerita`).
// Daftar berita utama ditulis oleh bangun.mjs ke .laju/utama.json, jadi urutannya:
//   node scripts/bangun.mjs && node scripts/ringkas-berita.mjs && node scripts/bangun.mjs
// Hanya berita yang belum punya ringkasan yang dikirim ke AI; hasil disimpan di data/ringkasan-berita.json.

import path from 'node:path';
import config from '../laju.config.mjs';
import { AKAR, bacaJson, tulisJson } from './lib/data.mjs';
import { ambilTeksArtikel } from './lib/artikel.mjs';
import { ambilFeed } from './lib/rss.mjs';

const BERKAS = path.join(AKAR, 'data', 'ringkasan-berita.json');
const ANTRIAN = path.join(AKAR, '.laju', 'utama.json');
const SIMPAN_HARI = 14;
const p = config.ringkasanBerita ?? {};

function peringatan(pesan) {
  console.log(process.env.GITHUB_ACTIONS ? `::warning::${pesan}` : `! ${pesan}`);
}

class KuotaHabis extends Error {}
class KunciDitolak extends Error {}

if (!p.aktif) {
  console.log('Ringkasan berita dinonaktifkan di laju.config.mjs. Dilewati.');
  process.exit(0);
}
const KUNCI = p.penyedia === 'claude' ? process.env.ANTHROPIC_API_KEY : process.env.GEMINI_API_KEY;
if (!KUNCI) {
  console.log(`${p.penyedia === 'claude' ? 'ANTHROPIC_API_KEY' : 'GEMINI_API_KEY'} belum diatur. Ringkasan berita dilewati; berita utama tampil dengan cuplikan biasa.`);
  process.exit(0);
}

// ---------- Penyedia AI ----------

const SISTEM = 'Kamu penulis ringkasan berita untuk LAJU, portal berita berbahasa Indonesia. Tulisanmu ringkas, netral, dan setia pada teks sumber.';

let modelGemini = p.modelGemini;
const tunggu = (ms) => new Promise((r) => setTimeout(r, ms));
async function tulisDenganGemini(perintah) {
  let sibuk = 0;
  for (;;) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelGemini}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': KUNCI },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SISTEM }] },
        contents: [{ role: 'user', parts: [{ text: perintah }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 2048 },
      }),
      signal: AbortSignal.timeout(90000),
    });
    // Server Gemini sibuk (500/503): coba lagi dua kali dengan jeda, lalu pindah ke model cadangan.
    if (res.status === 500 || res.status === 503) {
      sibuk += 1;
      if (sibuk <= 2) {
        await tunggu(sibuk * 8000);
        continue;
      }
      if (p.modelGeminiCadangan && modelGemini !== p.modelGeminiCadangan) {
        peringatan(`Model ${modelGemini} sedang sibuk; berita ini dicoba dengan ${p.modelGeminiCadangan}.`);
        const utama = modelGemini;
        modelGemini = p.modelGeminiCadangan;
        try {
          return await tulisDenganGemini(perintah);
        } finally {
          modelGemini = utama;
        }
      }
    }
    // Model tidak ada atau kuotanya habis: coba sekali dengan model cadangan.
    if ((res.status === 404 || res.status === 429) && p.modelGeminiCadangan && modelGemini !== p.modelGeminiCadangan) {
      peringatan(`Model ${modelGemini} ${res.status === 404 ? 'tidak tersedia' : 'kehabisan kuota'}; beralih ke ${p.modelGeminiCadangan}.`);
      modelGemini = p.modelGeminiCadangan;
      continue;
    }
    if (res.status === 429) throw new KuotaHabis('Kuota Gemini habis');
    if (!res.ok) {
      const pesan = await res.text();
      if ([400, 401, 403].includes(res.status) && /API[_ ]?KEY|PERMISSION_DENIED|UNAUTHENTICATED/i.test(pesan)) {
        throw new KunciDitolak('GEMINI_API_KEY ditolak Google. Periksa kembali kuncinya di GitHub secret.');
      }
      throw new Error(`Gemini membalas HTTP ${res.status}: ${pesan.slice(0, 200)}`);
    }
    const j = await res.json();
    if (j.promptFeedback?.blockReason) return null;
    const kandidat = j.candidates?.[0];
    if (!kandidat || kandidat.finishReason === 'MAX_TOKENS') return null;
    return (kandidat.content?.parts ?? []).filter((x) => !x.thought).map((x) => x.text ?? '').join('').trim();
  }
}

let Anthropic;
let klienClaude;
async function tulisDenganClaude(perintah) {
  if (!klienClaude) {
    ({ default: Anthropic } = await import('@anthropic-ai/sdk'));
    klienClaude = new Anthropic();
  }
  try {
    const r = await klienClaude.beta.messages.create({
      model: p.modelClaude,
      max_tokens: 4000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low' },
      system: SISTEM,
      messages: [{ role: 'user', content: perintah }],
    });
    if (r.stop_reason === 'refusal' || r.stop_reason === 'max_tokens') return null;
    return r.content.filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) throw new KuotaHabis('Batas pemakaian Claude tercapai');
    if (err instanceof Anthropic.AuthenticationError) throw new KunciDitolak('ANTHROPIC_API_KEY ditolak. Periksa kembali kuncinya di GitHub secret.');
    throw err;
  }
}

const tulis = p.penyedia === 'claude' ? tulisDenganClaude : tulisDenganGemini;

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
console.log(`${antrian.length} berita utama, ${perlu.length} belum punya ringkasan (penyedia: ${p.penyedia}).`);

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
    const hasil = await tulis(perintahUntuk(c, bahan.teks));
    if (!hasil) {
      console.log(`- AI tidak memberi ringkasan: ${c.judul.slice(0, 70)}`);
      continue;
    }
    simpanan[c.id[0]] = {
      teks: rapikan(hasil),
      penyedia: p.penyedia,
      model: p.penyedia === 'claude' ? p.modelClaude : modelGemini,
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
