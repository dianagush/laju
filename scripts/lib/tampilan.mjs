// Potongan HTML untuk semua halaman LAJU.

import { labelWaktu, pembaruanBerikutnya, pukul, tanggalPanjang } from './waktu.mjs';
import { topikUntuk } from './olah.mjs';

export function esc(s = '') {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

const IKON = {
  cari: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
  bulan: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
  rumah: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/></svg>',
  matahari: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  kalender: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="1"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
};

function gambar(url, { segera = false } = {}) {
  if (!url) return '';
  return `<img src="${esc(url)}" alt="" ${segera ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" referrerpolicy="no-referrer" onerror="this.remove()">`;
}

function kicker(berita, ctx) {
  return topikUntuk(berita, ctx.topik)?.teks ?? ctx.config.lajur[berita.lajur].nama;
}

// ---------- Kerangka halaman ----------

export function halaman(ctx, { judul, deskripsi, aktif, isi, akar = '' }) {
  const { config, status, hariIni } = ctx;
  const judulPenuh = judul ? `${judul} · ${config.nama}` : `${config.nama}: ${config.slogan}`;
  const diperbarui = status.diperbarui ? pukul(status.diperbarui) : null;
  const berikut = status.diperbarui ? pembaruanBerikutnya(config.jamPembaruan, new Date(status.diperbarui)) : null;
  const nav = [
    ['beranda', 'index.html', 'Beranda', ''],
    ['tekno', config.lajur.tekno.halaman, config.lajur.tekno.nama, 'l-tekno'],
    ['olahraga', config.lajur.olahraga.halaman, config.lajur.olahraga.nama, 'l-olahraga'],
    ['ringkasan', 'ringkasan.html', 'Ringkasan Pagi', ''],
    ['arsip', 'arsip.html', 'Arsip', ''],
  ];
  const navBawah = [
    ['beranda', 'index.html', 'Beranda', IKON.rumah],
    ['ringkasan', 'ringkasan.html', 'Ringkasan', IKON.matahari],
    ['arsip', 'arsip.html', 'Arsip', IKON.kalender],
    ['cari', 'cari.html', 'Cari', IKON.cari],
  ];
  const kini = (id) => (id === aktif ? ' aria-current="page"' : '');
  const bilahTopik = ctx.topik.length
    ? `<div class="bilah-topik"><div class="bungkus"><span class="label">Topik hangat</span>${ctx.topik
        .map((t) => `<a class="l-${t.lajur}" href="${akar}cari.html?q=${encodeURIComponent(t.teks)}">${esc(t.teks)}</a>`)
        .join('')}</div></div>`
    : '';

  return `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(judulPenuh)}</title>
<meta name="description" content="${esc(deskripsi ?? config.slogan)}">
<meta property="og:title" content="${esc(judulPenuh)}">
<meta property="og:description" content="${esc(deskripsi ?? config.slogan)}">
<meta name="theme-color" content="#101318">
<link rel="icon" href="${akar}ikon.ico" sizes="any">
<link rel="icon" href="${akar}ikon.svg" type="image/svg+xml">
<link rel="alternate" type="application/rss+xml" title="${esc(config.nama)}" href="${akar}feed.xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..900&family=IBM+Plex+Mono:wght@400;500;600&family=Source+Serif+4:ital,opsz,wght@0,8..60,400..700;1,8..60,400&display=swap">
<link rel="stylesheet" href="${akar}gaya.css">
<script>try{var t=localStorage.getItem('laju-tema');if(t==='dark'||t==='light')document.documentElement.dataset.theme=t}catch(e){}</script>
</head>
<body>
<a class="lompat" href="#isi">Langsung ke berita</a>
<div class="pita"><div class="bungkus">
<span>${esc(tanggalPanjang(hariIni).toUpperCase())}</span>
<div class="pita-kanan">
${diperbarui ? `<span class="pita-status"><span class="titik-hidup"></span>Diperbarui ${diperbarui} WIB${berikut ? `<span class="pita-berikut">&nbsp;· berikutnya ${berikut}</span>` : ''}</span>` : ''}
<button type="button" class="tombol-tema" data-tema aria-pressed="false">${IKON.bulan}<span data-tema-teks>Mode gelap</span></button>
</div>
</div></div>
<header class="kepala"><div class="bungkus">
<div class="merek">
<a class="logo" href="${akar}index.html" aria-label="${esc(config.nama)}, ke beranda"><span class="logo-kata">${esc(config.nama)}</span><span class="logo-lajur"><span></span><span></span></span></a>
<p class="slogan">${esc(config.slogan)}</p>
</div>
<div class="kepala-kanan">
<form class="cari" action="${akar}cari.html" method="get" role="search">
<label class="tersembunyi" for="cari-atas">Cari berita</label>
<input id="cari-atas" name="q" type="search" placeholder="Cari berita, tim, atau gawai…">
<button type="submit" aria-label="Cari">${IKON.cari}</button>
</form>
<nav class="nav-utama" aria-label="Utama">${nav.map(([id, href, teks, kelas]) => `<a${kelas ? ` class="${kelas}"` : ''} href="${akar}${href}"${kini(id)}>${esc(teks)}</a>`).join('')}</nav>
</div>
</div></header>
${bilahTopik}
<main id="isi">
${isi}
</main>
<footer class="kaki"><div class="bungkus">
<div class="kaki-merek">
<span class="logo-kata">${esc(config.nama)}</span>
<span class="logo-lajur"><span></span><span></span></span>
<p>Portal agregator: judul dan cuplikan dikumpulkan otomatis dari media resmi, lalu ditautkan kembali ke artikel aslinya.</p>
</div>
<nav aria-label="Kaki halaman"><a href="${akar}tentang.html">Tentang &amp; sumber</a><a href="${akar}arsip.html">Arsip</a><a href="${akar}feed.xml">RSS ${esc(config.nama)}</a></nav>
</div></footer>
<nav class="nav-bawah" aria-label="Navigasi bawah">${navBawah.map(([id, href, teks, ikon]) => `<a href="${akar}${href}"${kini(id)}>${ikon}${esc(teks)}</a>`).join('')}</nav>
<script src="${akar}laju.js" defer></script>
</body>
</html>
`;
}

// ---------- Komponen berita ----------

// Berita lain dalam cerita yang sama, media berbeda didahulukan.
function beritaSerupa(k, maks) {
  const media = new Set([k.utama.sumber]);
  const dulu = [];
  const nanti = [];
  for (const x of k.lain) {
    if (media.has(x.sumber)) nanti.push(x);
    else {
      media.add(x.sumber);
      dulu.push(x);
    }
  }
  return [...dulu, ...nanti].slice(0, maks);
}

export function kartuUtama(k, ctx) {
  const b = k.utama;
  const pil = k.jumlahSumber > 1 ? `<span class="pil">Diberitakan ${k.jumlahSumber} media</span>` : '';
  const serupa = beritaSerupa(k, 3);
  const terkait = serupa.length
    ? `<ul class="terkait"><li class="terkait-judul">Juga diberitakan:</li>${serupa
        .map((x) => `<li><a href="${esc(x.tautan)}" target="_blank" rel="noopener">${esc(x.judul)}</a> · ${esc(x.sumber)}</li>`)
        .join('')}</ul>`
    : '';
  return `<article class="utama">
<a class="foto foto--besar" href="${esc(b.tautan)}" target="_blank" rel="noopener" tabindex="-1" aria-hidden="true">${gambar(b.gambar, { segera: true })}</a>
<div class="kicker"><b>${esc(kicker(b, ctx))}</b><span>${labelWaktu(b.terbit, ctx.hariIni)} WIB</span></div>
<h3><a href="${esc(b.tautan)}" target="_blank" rel="noopener">${esc(b.judul)}</a></h3>
${b.cuplikan ? `<p class="dek">${esc(b.cuplikan)}</p>` : ''}
<div class="asal"><strong>${esc(b.sumber)}</strong>${pil}</div>
${terkait}
</article>`;
}

export function itemTumpuk(k, ctx) {
  const b = k.utama;
  return `<a class="tumpuk-item" href="${esc(b.tautan)}" target="_blank" rel="noopener">
<span class="foto foto--kecil">${gambar(b.gambar)}</span>
<span class="tumpuk-teks"><span class="label">${esc(kicker(b, ctx))}</span><span class="judul-kecil">${esc(b.judul)}</span><span class="data">${asalCerita(k)} · ${labelWaktu(b.terbit, ctx.hariIni)}</span></span>
</a>`;
}

// "VIVA · juga di Liputan6, ANTARA"
function asalCerita(k) {
  return `${esc(k.utama.sumber)}${k.sumberLain.length ? ` · juga di ${esc(k.sumberLain.join(', '))}` : ''}`;
}

// Satu baris per cerita: berita yang sama dari media lain tidak ditampilkan lagi.
export function barisCerita(k, ctx) {
  const b = k.utama;
  return `<a class="baris l-${b.lajur}" data-lajur="${b.lajur}" href="${esc(b.tautan)}" target="_blank" rel="noopener">
<span class="baris-waktu">${labelWaktu(b.terbit, ctx.hariIni)}</span>
<span class="chip">${esc(ctx.config.lajur[b.lajur].nama)}</span>
<span class="baris-teks"><span class="baris-judul">${esc(b.judul)}</span><span class="baris-asal">${asalCerita(k)}</span></span>
</a>`;
}

export function kepalaLajur(lajur, ctx, { tingkat = 'h2', tautan = true, akar = '' } = {}) {
  const l = ctx.config.lajur[lajur];
  return `<div class="lajur-kepala">
<div class="lajur-nama"><span class="label">Lajur ${l.nomor}</span><${tingkat}>${esc(l.nama)}</${tingkat}></div>
${tautan ? `<a class="tautan-lajur" href="${akar}${l.halaman}">Semua ${esc(l.nama.toLowerCase())} →</a>` : ''}
</div>`;
}

// Poin ringkasan: teks + tautan sumber.
export function tautanSumberPoin(p, ctx) {
  return p.sumber
    .map((s) => `<a href="${esc(s.tautan)}" target="_blank" rel="noopener">${esc(s.sumber)} · ${labelWaktu(s.terbit, ctx.hariIni)}</a>`)
    .join('');
}
