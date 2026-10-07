// Penghubung ke AI untuk dua fitur ringkasan LAJU: Ringkasan Pagi (scripts/ringkasan.mjs) dan
// ringkasan satu paragraf berita utama (scripts/ringkas-berita.mjs).
// Penyedia dan modelnya diatur sekali saja di laju.config.mjs bagian `ai`:
//   penyedia 'gemini' -> kunci GEMINI_API_KEY (gratis, ada batas harian)
//   penyedia 'claude' -> kunci ANTHROPIC_API_KEY (berbayar, butuh paket @anthropic-ai/sdk)

export class KuotaHabis extends Error {}
export class KunciDitolak extends Error {}

const NAMA_KUNCI = { gemini: 'GEMINI_API_KEY', claude: 'ANTHROPIC_API_KEY' };

export const namaKunci = (penyedia) => NAMA_KUNCI[penyedia] ?? NAMA_KUNCI.gemini;
export const kunciAI = (penyedia) => process.env[namaKunci(penyedia)] ?? '';
export const namaPenyedia = (penyedia) => (penyedia === 'claude' ? 'Claude' : 'Gemini');
export const tunggu = (ms) => new Promise((r) => setTimeout(r, ms));

// Jawaban JSON dari AI kadang terbungkus blok kode atau diapit kalimat lain.
export function uraikanJson(teks) {
  const bersih = String(teks ?? '').replace(/^\s*```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  try {
    return JSON.parse(bersih);
  } catch {
    const awal = bersih.indexOf('{');
    const akhir = bersih.lastIndexOf('}');
    if (awal >= 0 && akhir > awal) {
      try {
        return JSON.parse(bersih.slice(awal, akhir + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

// Skema JSON gaya Claude -> subset OpenAPI yang diterima Gemini (tanpa `additionalProperties`).
function skemaGemini(s) {
  if (Array.isArray(s)) return s.map(skemaGemini);
  if (!s || typeof s !== 'object') return s;
  const keluar = {};
  for (const [k, v] of Object.entries(s)) {
    if (k === 'additionalProperties') continue;
    keluar[k] = skemaGemini(v);
  }
  if (keluar.properties) keluar.propertyOrdering = Object.keys(keluar.properties);
  return keluar;
}

// Satu penulis AI untuk satu tugas. `tulis(perintah)` membalas teks, atau null bila AI menolak
// atau jawabannya terpotong. Galat kuota dan kunci dilempar sebagai KuotaHabis / KunciDitolak.
export function penulisAI(opsi) {
  const {
    penyedia = 'gemini',
    sistem = '',
    skema = null,
    maksToken = 2048,
    usaha = 'low',
    suhu = 0.3,
    peringatan = () => {},
  } = opsi;
  const kunci = opsi.kunci ?? kunciAI(penyedia);
  // Model pilihan; bisa berubah permanen ke cadangan kalau model utama hilang atau kuotanya habis.
  let model = penyedia === 'claude' ? opsi.modelClaude : opsi.modelGemini;
  let terpakai = model;
  let pakaiSkema = Boolean(skema);

  async function lewatGemini(perintah) {
    let modelKini = model;
    let sibuk = 0;
    for (;;) {
      const atur = { temperature: suhu, maxOutputTokens: maksToken };
      if (pakaiSkema) {
        atur.responseMimeType = 'application/json';
        atur.responseSchema = skemaGemini(skema);
      }
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelKini}:generateContent`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': kunci },
        body: JSON.stringify({
          ...(sistem ? { systemInstruction: { parts: [{ text: sistem }] } } : {}),
          contents: [{ role: 'user', parts: [{ text: perintah }] }],
          generationConfig: atur,
        }),
        signal: AbortSignal.timeout(120000),
      });
      // Server Gemini sibuk (500/503): coba lagi dua kali dengan jeda, lalu pindah ke model cadangan.
      if (res.status === 500 || res.status === 503) {
        sibuk += 1;
        if (sibuk <= 2) {
          await tunggu(sibuk * 8000);
          continue;
        }
        if (opsi.modelGeminiCadangan && modelKini !== opsi.modelGeminiCadangan) {
          peringatan(`Model ${modelKini} sedang sibuk; dicoba dengan ${opsi.modelGeminiCadangan}.`);
          modelKini = opsi.modelGeminiCadangan;
          sibuk = 0;
          continue;
        }
      }
      // Model tidak ada atau kuotanya habis: pindah ke cadangan untuk permintaan berikutnya juga.
      if ((res.status === 404 || res.status === 429) && opsi.modelGeminiCadangan && modelKini !== opsi.modelGeminiCadangan) {
        peringatan(`Model ${modelKini} ${res.status === 404 ? 'tidak tersedia' : 'kehabisan kuota'}; beralih ke ${opsi.modelGeminiCadangan}.`);
        model = opsi.modelGeminiCadangan;
        modelKini = model;
        continue;
      }
      if (res.status === 429) throw new KuotaHabis('Kuota Gemini habis');
      if (!res.ok) {
        const pesan = await res.text();
        if ([400, 401, 403].includes(res.status) && /API[_ ]?KEY|PERMISSION_DENIED|UNAUTHENTICATED/i.test(pesan)) {
          throw new KunciDitolak('GEMINI_API_KEY ditolak Google. Periksa kembali kuncinya di GitHub secret.');
        }
        // Model ini tidak menerima skema JSON: minta JSON lewat perintahnya saja.
        if (res.status === 400 && pakaiSkema && /response_?schema|response_?mime|INVALID_ARGUMENT/i.test(pesan)) {
          peringatan(`Model ${modelKini} menolak skema JSON; dicoba tanpa skema.`);
          pakaiSkema = false;
          continue;
        }
        throw new Error(`Gemini membalas HTTP ${res.status}: ${pesan.slice(0, 200)}`);
      }
      const j = await res.json();
      terpakai = modelKini;
      if (j.promptFeedback?.blockReason) return null;
      const kandidat = j.candidates?.[0];
      if (!kandidat || kandidat.finishReason === 'MAX_TOKENS') return null;
      return (kandidat.content?.parts ?? []).filter((x) => !x.thought).map((x) => x.text ?? '').join('').trim();
    }
  }

  let Anthropic;
  let klien;
  async function lewatClaude(perintah) {
    if (!klien) {
      try {
        ({ default: Anthropic } = await import('@anthropic-ai/sdk'));
      } catch {
        throw new Error('Paket @anthropic-ai/sdk belum terpasang. Jalankan "npm install" lalu coba lagi.');
      }
      klien = new Anthropic(kunci ? { apiKey: kunci } : {});
    }
    try {
      const r = await klien.beta.messages.create({
        model,
        max_tokens: maksToken,
        // Jika model utama menolak permintaan, API otomatis mengulang di model cadangan yang direkomendasikan.
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        output_config: { effort: usaha, ...(skema ? { format: { type: 'json_schema', schema: skema } } : {}) },
        ...(sistem ? { system: sistem } : {}),
        messages: [{ role: 'user', content: perintah }],
      });
      terpakai = r.model ?? model;
      if (r.stop_reason === 'refusal' || r.stop_reason === 'max_tokens') return null;
      return r.content.filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
    } catch (err) {
      if (err instanceof Anthropic.RateLimitError) throw new KuotaHabis('Batas pemakaian Claude tercapai');
      if (err instanceof Anthropic.AuthenticationError) throw new KunciDitolak('ANTHROPIC_API_KEY ditolak. Periksa kembali kuncinya di GitHub secret.');
      throw err;
    }
  }

  return {
    penyedia,
    tulis: penyedia === 'claude' ? lewatClaude : lewatGemini,
    // Model yang benar-benar menjawab permintaan terakhir.
    model: () => terpakai,
  };
}
