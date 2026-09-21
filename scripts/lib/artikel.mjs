// Mengambil teks isi artikel dari halaman berita, sebagai bahan ringkasan AI.
// Urutan: `articleBody` di data terstruktur JSON-LD (banyak media menyertakannya untuk mesin pencari),
// lalu paragraf <p> di dalam <article> atau <body>. Teks ini hanya dikirim ke AI dan tidak ditampilkan.

import { dekodeEntitas, teksPolos } from './rss.mjs';

// Paragraf yang bukan isi berita (tautan "baca juga", ajakan berlangganan, dsb.).
const BUKAN_ISI = /^(baca juga|simak juga|lihat juga|baca selengkapnya|advertisement|iklan|follow|ikuti|sign up|subscribe|read more|related|copyright|©)/i;

function cariArticleBody(nilai) {
  if (!nilai || typeof nilai !== 'object') return '';
  if (Array.isArray(nilai)) {
    for (const v of nilai) {
      const t = cariArticleBody(v);
      if (t) return t;
    }
    return '';
  }
  if (typeof nilai.articleBody === 'string' && nilai.articleBody.trim()) return nilai.articleBody;
  for (const v of Object.values(nilai)) {
    const t = cariArticleBody(v);
    if (t) return t;
  }
  return '';
}

function dariJsonLd(html) {
  for (const m of html.matchAll(/<script[^>]+type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const body = cariArticleBody(JSON.parse(m[1].trim()));
      if (body) return teksPolos(dekodeEntitas(body));
    } catch {
      // JSON-LD rusak di sebagian situs; lewati.
    }
  }
  return '';
}

function dariParagraf(html) {
  const bersih = html.replace(/<(script|style|noscript|figure|aside|nav|footer|header|form|svg)\b[\s\S]*?<\/\1>/gi, ' ');
  const artikel = bersih.match(/<article\b[\s\S]*?<\/article>/i)?.[0] ?? bersih;
  return [...artikel.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((m) => teksPolos(m[1]))
    .filter((p) => p.split(' ').length >= 12 && !BUKAN_ISI.test(p))
    .join(' ');
}

function potongKata(teks, maks) {
  const kata = teks.split(/\s+/).filter(Boolean);
  return { teks: kata.slice(0, maks).join(' '), kata: Math.min(kata.length, maks) };
}

// Hasil: { teks, kata, cara } atau null bila halaman tidak bisa dibaca.
export async function ambilTeksArtikel(url, { batasWaktuMs = 20000, maksKata = 1200, userAgent = 'LAJU/1.0' } = {}) {
  let res;
  try {
    res = await fetch(url, { headers: { 'user-agent': userAgent, accept: 'text/html' }, redirect: 'follow', signal: AbortSignal.timeout(batasWaktuMs) });
  } catch {
    return null;
  }
  if (!res.ok) return null;
  const html = await res.text();
  const jsonLd = dariJsonLd(html);
  if (jsonLd.split(' ').length >= 60) return { ...potongKata(jsonLd, maksKata), cara: 'json-ld' };
  const paragraf = dariParagraf(html);
  if (paragraf.split(' ').length >= 60) return { ...potongKata(paragraf, maksKata), cara: 'paragraf' };
  return null;
}
