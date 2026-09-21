// Potongan HTML untuk semua halaman LAJU.

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { geserHari, hariPendek, labelWaktu, pembaruanBerikutnya, pukul, tanggalPanjang, tanggalRingkas, tanggalWIB } from './waktu.mjs';
import { topikUntuk } from './olah.mjs';
import { AKAR } from './data.mjs';

// Kode versi dari isi berkas, dipasang sebagai ?v=… supaya browser langsung memakai
// CSS/JS terbaru setelah berubah, bukan salinan lama dari cache.
function versi(berkas) {
  return crypto.createHash('sha1').update(fs.readFileSync(path.join(AKAR, 'public', berkas))).digest('hex').slice(0, 8);
}
const VERSI = { css: versi('gaya.css'), js: versi('laju.js') };

export function esc(s = '') {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

const IKON = {
  cari: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
  bulan: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
  rumah: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/></svg>',
  matahari: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  kalender: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="1"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  bola: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7l4 3-1.5 4.5h-5L8 10z"/><path d="M12 3v4M16 10l4.5-1.5M14.5 14.5l2.5 4M9.5 14.5l-2.5 4M8 10L3.5 8.5"/></svg>',
};

function gambar(url, { segera = false } = {}) {
  if (!url) return '';
  return `<img src="${esc(url)}" alt="" ${segera ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" referrerpolicy="no-referrer" onerror="this.remove()">`;
}

// lang="en" untuk berita berbahasa asing, supaya pembaca layar melafalkannya dengan benar.
function atributBahasa(berita, ctx) {
  const bahasa = ctx.config.lajur[berita.lajur]?.bahasa;
  return bahasa ? ` lang="${bahasa}"` : '';
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
    ...(config.skor?.aktif ? [['skor', 'skor.html', 'Skor', '']] : []),
    ...Object.entries(config.lajur)
      .filter(([, l]) => l.terpisah)
      .map(([id, l]) => [id, l.halaman, l.namaPendek ?? l.nama, `l-${id}`]),
    ['ringkasan', 'ringkasan.html', 'Ringkasan Pagi', ''],
    ['arsip', 'arsip.html', 'Arsip', ''],
  ];
  const navBawah = [
    ['beranda', 'index.html', 'Beranda', IKON.rumah],
    ...(config.skor?.aktif ? [['skor', 'skor.html', 'Skor', IKON.bola]] : []),
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
<link rel="stylesheet" href="${akar}gaya.css?v=${VERSI.css}">
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
<script src="${akar}laju.js?v=${VERSI.js}" defer></script>
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

// `label` menggantikan label kecil di atas judul (mis. nama kategori).
export function kartuUtama(k, ctx, { label } = {}) {
  const b = k.utama;
  const pil = k.jumlahSumber > 1 ? `<span class="pil">Diberitakan ${k.jumlahSumber} media</span>` : '';
  const serupa = beritaSerupa(k, 3);
  const terkait = serupa.length
    ? `<ul class="terkait"><li class="terkait-judul">Juga diberitakan:</li>${serupa
        .map((x) => `<li><a href="${esc(x.tautan)}" target="_blank" rel="noopener">${esc(x.judul)}</a> · ${esc(x.sumber)}</li>`)
        .join('')}</ul>`
    : '';
  return `<article class="utama"${atributBahasa(b, ctx)}>
<a class="foto foto--besar" href="${esc(b.tautan)}" target="_blank" rel="noopener" tabindex="-1" aria-hidden="true">${gambar(b.gambar, { segera: true })}</a>
<div class="kicker"><b>${esc(label ?? kicker(b, ctx))}</b><span>${labelWaktu(b.terbit, ctx.hariIni)} WIB</span></div>
<h3><a href="${esc(b.tautan)}" target="_blank" rel="noopener">${esc(b.judul)}</a></h3>
${ringkasanUntuk(k, ctx) ? paragrafRingkasan(ringkasanUntuk(k, ctx)) : b.cuplikan ? `<p class="dek">${esc(b.cuplikan)}</p>` : ''}
<div class="asal"><strong>${esc(b.sumber)}</strong>${pil}</div>
${terkait}
</article>`;
}

// Ringkasan AI sebuah cerita (dari berita mana pun di cerita itu), atau null.
function ringkasanUntuk(k, ctx) {
  for (const b of [k.utama, ...k.lain]) {
    const r = ctx.ringkasanBerita?.[b.id];
    if (r?.teks) return r;
  }
  return null;
}

// Paragraf ringkasan berlabel "Ringkasan AI". `tag` = 'p' (kartu utama) atau 'span' (di dalam tautan).
function paragrafRingkasan(r, tag = 'p') {
  const penulis = r.penyedia === 'claude' ? 'Claude' : 'Gemini';
  return `<${tag} class="ringkasan-ai" lang="id"><span class="label-ai" title="Ditulis otomatis oleh AI (${penulis}) dari isi artikel. Baca artikel aslinya untuk detail.">Ringkasan AI</span>${esc(r.teks)}</${tag}>`;
}

export function itemTumpuk(k, ctx, { label } = {}) {
  const b = k.utama;
  const r = ringkasanUntuk(k, ctx);
  return `<a class="tumpuk-item" href="${esc(b.tautan)}" target="_blank" rel="noopener">
<span class="foto foto--kecil">${gambar(b.gambar)}</span>
<span class="tumpuk-teks"><span class="label">${esc(label ?? kicker(b, ctx))}</span><span class="judul-kecil"${atributBahasa(b, ctx)}>${esc(b.judul)}</span>${r ? paragrafRingkasan(r, 'span') : ''}<span class="data">${asalCerita(k)} · ${labelWaktu(b.terbit, ctx.hariIni)}</span></span>
</a>`;
}

// "VIVA · juga di Liputan6, ANTARA"
function asalCerita(k) {
  return `${esc(k.utama.sumber)}${k.sumberLain.length ? ` · juga di ${esc(k.sumberLain.join(', '))}` : ''}`;
}

// Satu baris per cerita: berita yang sama dari media lain tidak ditampilkan lagi.
// `diSemua: false` = baris hanya muncul saat penyaring lajurnya dipilih, bukan di "Semua".
// `kategori` ({id, nama}): baris ikut penyaring kategori dan labelnya menampilkan nama kategori.
export function barisCerita(k, ctx, { diSemua = true, kategori = null } = {}) {
  const b = k.utama;
  const saring = `${diSemua ? '' : ' data-semua="tidak" hidden'}${kategori ? ` data-kategori="${esc(kategori.id)}"` : ''}`;
  return `<a class="baris l-${b.lajur}" data-lajur="${b.lajur}"${saring}${atributBahasa(b, ctx)} href="${esc(b.tautan)}" target="_blank" rel="noopener">
<span class="baris-waktu">${labelWaktu(b.terbit, ctx.hariIni)}</span>
<span class="chip">${esc(kategori?.nama ?? ctx.config.lajur[b.lajur].nama)}</span>
<span class="baris-teks"><span class="baris-judul">${esc(b.judul)}</span><span class="baris-asal">${asalCerita(k)}</span></span>
</a>`;
}

export function kepalaLajur(lajur, ctx, { tingkat = 'h2', tautan = true, akar = '' } = {}) {
  const l = ctx.config.lajur[lajur];
  return `<div class="lajur-kepala">
<div class="lajur-nama"><span class="label">${esc(l.label ?? `Lajur ${l.nomor}`)}</span><${tingkat}>${esc(l.nama)}</${tingkat}></div>
${tautan ? `<a class="tautan-lajur" href="${akar}${l.halaman}">Semua ${esc(l.nama.toLowerCase())} →</a>` : ''}
</div>`;
}

// Poin ringkasan: teks + tautan sumber.
export function tautanSumberPoin(p, ctx) {
  return p.sumber
    .map((s) => `<a href="${esc(s.tautan)}" target="_blank" rel="noopener">${esc(s.sumber)} · ${labelWaktu(s.terbit, ctx.hariIni)}</a>`)
    .join('');
}

// ---------- Skor sepak bola ----------

// "Kemarin 20.00", "Hari ini 21.00", "Besok 02.00", "Sab, 26 Sep 21.00" (WIB).
function waktuLaga(l, hariIni) {
  const tgl = tanggalWIB(l.mulai);
  if (tgl === hariIni) return `Hari ini ${pukul(l.mulai)}`;
  if (tgl === geserHari(hariIni, 1)) return `Besok ${pukul(l.mulai)}`;
  if (tgl === geserHari(hariIni, -1)) return labelWaktu(l.mulai, hariIni);
  return `${hariPendek(tgl)}, ${labelWaktu(l.mulai, hariIni)}`;
}

const STATUS_LAGA = { selesai: 'Selesai', berlangsung: 'Berlangsung', ditunda: 'Ditunda', batal: 'Batal', pra: '' };

function kartuLaga(l, ctx) {
  const status =
    l.status === 'pra'
      ? `${waktuLaga(l, ctx.hariIni)} WIB`
      : l.status === 'berlangsung'
        ? `Berlangsung · ${esc(l.detail)}`
        : `${STATUS_LAGA[l.status] ?? esc(l.detail)} · ${waktuLaga(l, ctx.hariIni)}`;
  const adaSkor = l.status === 'selesai' || l.status === 'berlangsung';
  const tim = (t) => `<span class="laga-tim${l.status === 'selesai' && t.menang ? ' menang' : ''}">
<span class="laga-logo">${t.logo ? `<img src="${esc(t.logo)}" alt="" width="22" height="22" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}</span>
<span class="laga-nama" title="${esc(t.namaLengkap)}">${esc(t.nama)}</span><b>${adaSkor && t.skor != null ? t.skor : ''}</b></span>`;
  const isi = `<span class="laga-status laga-status--${l.status}">${status}</span>${tim(l.tuanRumah)}${tim(l.tamu)}`;
  const label = `${l.tuanRumah.namaLengkap} ${adaSkor ? `${l.tuanRumah.skor}–${l.tamu.skor}` : 'vs'} ${l.tamu.namaLengkap}`;
  return l.tautan
    ? `<a class="laga" href="${esc(l.tautan)}" target="_blank" rel="noopener" aria-label="${esc(label)}, ${esc(status)}">${isi}</a>`
    : `<div class="laga">${isi}</div>`;
}

// Matchday terakhir sebuah liga. ESPN tidak menyertakan nomor pekan, jadi pekan disusun dari jadwal:
// mulai dari pertandingan terakhir yang sudah dimainkan, ambil sisa jadwal pekan itu ke depan, lalu
// mundur. Berhenti bila ada tim yang sudah bermain di pekan itu, ada jeda lebih dari 60 jam, atau
// pekan sudah penuh (jumlah tim ÷ 2). Cara ini juga memisahkan pekan tengah minggu dari akhir pekan.
const JEDA_PEKAN = 60 * 3600000;
export function matchdayTerakhir(laga) {
  const urut = laga.filter((l) => l.status !== 'batal').sort((a, b) => a.mulai.localeCompare(b.mulai));
  const dimulai = (l) => l.status === 'selesai' || l.status === 'berlangsung';
  const penuh = Math.floor(new Set(urut.flatMap((l) => [l.tuanRumah.namaLengkap, l.tamu.namaLengkap])).size / 2);

  const pekanDari = (jangkar) => {
    const tim = new Set();
    const catat = (l) => tim.add(l.tuanRumah.namaLengkap).add(l.tamu.namaLengkap);
    const bentrok = (l) => tim.has(l.tuanRumah.namaLengkap) || tim.has(l.tamu.namaLengkap);
    let awal = jangkar;
    let akhir = jangkar;
    catat(urut[jangkar]);
    while (akhir + 1 < urut.length && akhir - awal + 1 < penuh) {
      const l = urut[akhir + 1];
      if (Date.parse(l.mulai) - Date.parse(urut[akhir].mulai) > JEDA_PEKAN || bentrok(l)) break;
      akhir += 1;
      catat(l);
    }
    while (awal > 0 && akhir - awal + 1 < penuh) {
      const l = urut[awal - 1];
      if (Date.parse(urut[awal].mulai) - Date.parse(l.mulai) > JEDA_PEKAN || bentrok(l)) break;
      awal -= 1;
      catat(l);
    }
    return { awal, pekan: urut.slice(awal, akhir + 1) };
  };

  const jangkar = urut.findLastIndex(dimulai);
  if (jangkar < 0) return [];
  const pertama = pekanDari(jangkar);
  // Laga susulan (tunda) yang dimainkan sendirian di tengah minggu bukan matchday:
  // bila kelompoknya kecil dan sudah selesai semua, cari pekan sebelumnya yang lebih lengkap.
  let kini = pertama;
  for (let coba = 0; coba < 5 && kini.pekan.length < Math.max(2, penuh / 2) && kini.pekan.every(dimulai); coba += 1) {
    const sebelumnya = urut.slice(0, kini.awal).findLastIndex(dimulai);
    if (sebelumnya < 0) return pertama.pekan;
    kini = pekanDari(sebelumnya);
  }
  return kini.pekan.length >= Math.max(2, penuh / 2) ? kini.pekan : pertama.pekan;
}

// "Sab 19 – Sen 21 Sep" (tanggal WIB).
function rentangTanggal(pekan) {
  const label = (tgl) => `${hariPendek(tgl)} ${Number(tgl.slice(8))}`;
  const bulan = (tgl) => tanggalRingkas(tgl).split(' ')[1];
  const awal = tanggalWIB(pekan[0].mulai);
  const akhir = tanggalWIB(pekan[pekan.length - 1].mulai);
  if (awal === akhir) return `${label(awal)} ${bulan(awal)}`;
  return `${label(awal)}${bulan(awal) === bulan(akhir) ? '' : ` ${bulan(awal)}`} – ${label(akhir)} ${bulan(akhir)}`;
}

// Isi satu liga: hanya matchday terakhir, urut waktu (yang belum dimainkan ikut tampil dengan jam mulainya).
function isiLiga(laga, ctx) {
  const pekan = matchdayTerakhir(laga);
  if (!pekan.length) return '<p class="kosong">Belum ada pertandingan dalam sepekan terakhir.</p>';
  const selesai = pekan.filter((l) => l.status === 'selesai').length;
  const sisa = pekan.length - selesai;
  const ket = `${pekan.length} laga · ${selesai} selesai${sisa ? ` · ${sisa} belum selesai` : ''}`;
  return `<h3 class="skor-sub">Matchday terakhir · ${esc(rentangTanggal(pekan))} <span class="skor-ket">${ket}</span></h3>
<div class="grid-laga">${pekan.map((l) => kartuLaga(l, ctx)).join('')}</div>`;
}

// Blok "Skor terbaru" dengan tombol per liga. Dipakai di beranda dan halaman Olahraga.
export function blokSkor(skor, ctx, { akar = '', tingkat = 'h2' } = {}) {
  const liga = (ctx.config.skor?.liga ?? []).filter((l) => skor?.liga?.[l.id]);
  if (!ctx.config.skor?.aktif || !liga.length) return '';
  return `<section class="skor l-olahraga" aria-labelledby="judul-skor">
<div class="skor-kepala">
<div class="skor-judul"><span class="label">Sepak bola Eropa</span><${tingkat} id="judul-skor">Skor terbaru</${tingkat}></div>
<div class="saring" role="group" aria-label="Pilih liga" data-tab-skor>${liga
    .map((l, i) => `<button type="button" value="${l.id}" aria-controls="skor-${l.id}" aria-pressed="${i === 0}">${esc(l.nama)}</button>`)
    .join('')}</div>
</div>
${liga.map((l, i) => `<div class="skor-panel" id="skor-${l.id}"${i ? ' hidden' : ''}>${isiLiga(skor.liga[l.id].laga, ctx)}</div>`).join('\n')}
<p class="skor-catatan">Data: ${esc(skor.sumber ?? 'ESPN')} · diperbarui ${pukul(skor.diperbarui)} WIB. Skor pertandingan yang sedang berlangsung tidak real-time. <a href="${akar}skor.html">Lihat kelima liga sekaligus →</a></p>
</section>`;
}

// Isi halaman skor.html: matchday terakhir kelima liga sekaligus.
export function halamanSkorIsi(skor, ctx) {
  const liga = (ctx.config.skor?.liga ?? []).filter((l) => skor?.liga?.[l.id]);
  if (!liga.length) return '<p class="kosong">Data skor belum tersedia. Jalankan npm run skor.</p>';
  return `<nav class="lompat-liga" aria-label="Lompat ke liga">${liga.map((l) => `<a href="#liga-${l.id}">${esc(l.nama)}</a>`).join('')}</nav>
${liga
    .map((l) => `<section class="skor-liga" id="liga-${l.id}" aria-labelledby="judul-${l.id}">
<h2 id="judul-${l.id}">${esc(l.nama)}</h2>
${isiLiga(skor.liga[l.id].laga, ctx)}
</section>`)
    .join('\n')}
<p class="skor-catatan">Data: ${esc(skor.sumber ?? 'ESPN')} · diperbarui ${esc(tanggalPanjang(tanggalWIB(skor.diperbarui)))}, ${pukul(skor.diperbarui)} WIB. Semua jam dalam WIB. Klik pertandingan untuk detailnya di ESPN.</p>`;
}
