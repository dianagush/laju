// Langkah 6: bangun situs statis dari data/ ke dist/.
// Jalankan: node scripts/bangun.mjs

import fs from 'node:fs';
import path from 'node:path';
import config from '../laju.config.mjs';
import { AKAR, BERKAS_STATUS, FOLDER_BERITA, FOLDER_RINGKASAN, bacaJson, beritaHari, daftarTanggal, ringkasanHari } from './lib/data.mjs';
import { kelompokkan, topikHangat, urutPenting } from './lib/olah.mjs';
import { hariPendek, labelWaktu, pukul, tanggalPanjang, tanggalRingkas, tanggalWIB } from './lib/waktu.mjs';
import { barisCerita, blokSkor, esc, halaman, halamanSkorIsi, itemTumpuk, kartuUtama, kepalaLajur, tautanSumberPoin } from './lib/tampilan.mjs';

const DIST = path.join(AKAR, 'dist');
// LAJUR = lajur yang tampil di beranda, Terbaru, Ringkasan, arsip, dan feed.
// Lajur `terpisah` (mis. Teknologi Global) hanya punya halamannya sendiri dan ikut pencarian.
const SEMUA_LAJUR = Object.keys(config.lajur);
const LAJUR = SEMUA_LAJUR.filter((l) => !config.lajur[l].terpisah);
const JAM = 3600000;

fs.rmSync(DIST, { recursive: true, force: true });

function tulis(rel, isi) {
  const berkas = path.join(DIST, rel);
  fs.mkdirSync(path.dirname(berkas), { recursive: true });
  fs.writeFileSync(berkas, isi);
}

// ---------- Data ----------

const tanggalBerita = daftarTanggal(FOLDER_BERITA);
if (!tanggalBerita.length) {
  console.error('Belum ada data berita. Jalankan dulu: node scripts/ambil-berita.mjs');
  process.exit(1);
}
const status = bacaJson(BERKAS_STATUS, { diperbarui: null, sumber: [] });
// Skor sepak bola (scripts/ambil-skor.mjs); tidak wajib ada.
const skor = config.skor?.aktif ? bacaJson(path.join(AKAR, 'data', 'skor.json')) : null;
const hariIni = tanggalWIB(status.diperbarui ?? new Date());

// Jendela beranda dihitung dari berita paling baru, jadi situs tidak kosong walau pembaruan sempat berhenti.
const beritaBaru = tanggalBerita.slice(0, 3).flatMap(beritaHari);
const acuan = Math.max(...beritaBaru.map((b) => Date.parse(b.terbit)));
const jendela = beritaBaru.filter((b) => LAJUR.includes(b.lajur) && Date.parse(b.terbit) >= acuan - config.jendelaBerandaJam * JAM);
const topik = topikHangat(jendela.filter((b) => Date.parse(b.terbit) >= acuan - 24 * JAM));
const ctx = { config, status, hariIni, topik };

const urutWaktu = (a, b) => b.terbit.localeCompare(a.terbit);
const urutCerita = (a, b) => b.utama.terbit.localeCompare(a.utama.terbit);
// Cerita (berita sama dari media berbeda digabung) per lajur, terbaru dulu.
const ceritaDari = (berita, lajur) => kelompokkan(berita.filter((b) => b.lajur === lajur), config.duplikat).sort(urutCerita);

// Penggabungan dihitung sekali untuk beberapa hari terakhir (duplikat.hariDiperiksa di laju.config.mjs)
// dan dipakai di semua halaman, supaya cerita yang melintasi tengah malam tidak muncul dua kali.
// Tiap cerita ditampilkan pada hari terbit berita utamanya.
const HARI_CERITA = config.duplikat?.hariDiperiksa ?? 14;
const tanggalTerkini = tanggalBerita.slice(0, HARI_CERITA);
const beritaTerkini = tanggalTerkini.flatMap(beritaHari);
const ceritaTerkini = Object.fromEntries(SEMUA_LAJUR.map((l) => [l, ceritaDari(beritaTerkini, l)]));
const hariCerita = (k) => tanggalWIB(k.utama.terbit);
const ceritaPadaHari = (tgl, l) => (tanggalTerkini.includes(tgl) ? ceritaTerkini[l].filter((k) => hariCerita(k) === tgl) : ceritaDari(beritaHari(tgl), l));

const kelompokLajur = Object.fromEntries(SEMUA_LAJUR.map((l) => [l, urutPenting(ceritaTerkini[l].filter((k) => Date.parse(k.terbaru) >= acuan - config.jendelaBerandaJam * JAM), acuan)]));
const infoSumber = (b) => ({ judul: b.judul, tautan: b.tautan, sumber: b.sumber, terbit: b.terbit });

// Ringkasan Pagi dari AI, atau "Sorotan" (cerita paling banyak diliput) bila belum ada.
function sorotan(tanggal) {
  return {
    tanggal,
    ai: false,
    dibuat: status.diperbarui,
    ...Object.fromEntries(LAJUR.map((l) => [l, kelompokLajur[l].slice(0, 5).map((k) => ({ teks: k.utama.judul, sumber: [infoSumber(k.utama)] }))])),
  };
}
const tanggalRingkasanAi = daftarTanggal(FOLDER_RINGKASAN);
const ringkasanAiHariIni = ringkasanHari(hariIni);
const ringkasanKini = ringkasanAiHariIni ? { ...ringkasanAiHariIni, ai: true } : sorotan(hariIni);

// ---------- Beranda ----------

const ceritaDiLajur = new Set();
const blokLajur = LAJUR.map((l) => {
  const [utama, ...sisa] = kelompokLajur[l];
  const tumpuk = sisa.slice(0, 3);
  if (utama) ceritaDiLajur.add(utama);
  tumpuk.forEach((k) => ceritaDiLajur.add(k));
  return `<section class="lajur l-${l}" aria-label="${esc(config.lajur[l].nama)}">
${kepalaLajur(l, ctx)}
${utama ? kartuUtama(utama, ctx) : '<p class="kosong">Belum ada berita di lajur ini.</p>'}
${tumpuk.length ? `<div class="tumpuk">${tumpuk.map((k) => itemTumpuk(k, ctx)).join('')}</div>` : ''}
</section>`;
}).join('\n');

function poinBeranda(r) {
  return LAJUR.map((l) => `<div class="kolom-poin l-${l}">
<span class="kolom-poin-judul">${esc(config.lajur[l].nama)}</span>
${(r[l] ?? []).slice(0, 3).map((p, i) => `<div class="poin"><span class="poin-no">${i + 1}</span><p>${r.ai ? esc(p.teks) : `<a href="${esc(p.sumber[0].tautan)}" target="_blank" rel="noopener">${esc(p.teks)}</a>`}</p></div>`).join('') || '<p class="kosong">Belum ada.</p>'}
</div>`).join('\n');
}

const jumlahPoin = (r) => LAJUR.reduce((n, l) => n + (r[l]?.length ?? 0), 0);
const jamRingkasan = `${String(config.jamRingkasan).padStart(2, '0')}.00`;
const pitaRingkasan = `<section class="pita-ringkasan" aria-labelledby="judul-ringkasan">
<div class="pita-ringkasan-intro">
<span class="label">${ringkasanKini.ai ? `Setiap hari · ${jamRingkasan} WIB` : 'Ringkasan AI belum tersedia'}</span>
<h2 id="judul-ringkasan">${ringkasanKini.ai ? 'Ringkasan Pagi' : 'Sorotan'}</h2>
<p>${ringkasanKini.ai
    ? 'Lima hal terpenting dari tiap lajur, dirangkum otomatis oleh AI. Setiap poin menaut ke artikel aslinya.'
    : `Ringkasan AI terbit tiap pukul ${jamRingkasan} WIB setelah kunci API dipasang. Sementara itu, ini cerita yang paling banyak diliput.`}</p>
<a class="tombol" href="ringkasan.html">${ringkasanKini.ai ? `Baca ${jumlahPoin(ringkasanKini)} poin lengkap →` : 'Lihat semua sorotan →'}</a>
</div>
${poinBeranda(ringkasanKini)}
</section>`;

// Daftar "Terbaru": "Semua" berisi 40 cerita terbaru gabungan, dan tiap lajur punya 40 cerita
// terbarunya sendiri. Tanpa ini, lajur yang beritanya sedikit (teknologi) hanya kebagian beberapa baris.
const PER_DAFTAR = 40;
const ceritaTerbaru = LAJUR.flatMap((l) => kelompokLajur[l]).filter((k) => !ceritaDiLajur.has(k)).sort(urutCerita);
const diSemua = new Set(ceritaTerbaru.slice(0, PER_DAFTAR));
const diLajur = new Set(LAJUR.flatMap((l) => ceritaTerbaru.filter((k) => k.lajur === l).slice(0, PER_DAFTAR)));
const terbaru = ceritaTerbaru.filter((k) => diSemua.has(k) || diLajur.has(k));

const kotakTopik = topik.length
  ? `<section class="kotak" aria-labelledby="judul-topik">
<h2 id="judul-topik">Topik hangat</h2>
<p>Dihitung otomatis dari frasa yang paling sering muncul di judul semua sumber dalam 24 jam terakhir.</p>
<div class="awan-topik">${topik.map((t) => `<a class="l-${t.lajur}" href="cari.html?q=${encodeURIComponent(t.teks)}">${esc(t.teks)}</a>`).join('')}</div>
</section>`
  : '';

// Satu baris per media (bukan per kanal) supaya daftarnya ringkas.
const perMedia = new Map();
for (const s of status.sumber.filter((x) => LAJUR.includes(x.lajur))) {
  const m = perMedia.get(s.nama) ?? { nama: s.nama, kanal: 0, gagal: 0, diterima: 0 };
  m.kanal += 1;
  m.diterima += s.diterima ?? 0;
  if (!s.ok) m.gagal += 1;
  perMedia.set(s.nama, m);
}
const kotakSumber = `<section class="kotak" aria-labelledby="judul-sumber">
<h2 id="judul-sumber">Sumber hari ini</h2>
<div class="daftar-sumber">${[...perMedia.values()].sort((a, b) => b.diterima - a.diterima).map((m) => `<div><span>${esc(m.nama)}${m.kanal > 1 ? ` <span class="data">· ${m.kanal} kanal</span>` : ''}</span>${m.gagal === m.kanal ? '<span class="data galat">gagal diambil</span>' : `<span class="data">${m.diterima} berita${m.gagal ? ` · ${m.gagal} kanal gagal` : ''}</span>`}</div>`).join('')}</div>
<p><a href="tentang.html">Lihat status tiap kanal →</a></p>
<p class="catatan">${esc(config.nama)} hanya menampilkan judul, cuplikan, dan gambar mini. Artikel lengkap selalu dibaca di situs aslinya.</p>
</section>`;

tulis('index.html', halaman(ctx, {
  aktif: 'beranda',
  isi: `<div class="bungkus isi">
<div class="dua-lajur">
${blokLajur}
</div>
${pitaRingkasan}
${skor ? blokSkor(skor, ctx) : ''}
<div class="terbaru-grid">
<section class="terbaru" aria-labelledby="judul-terbaru">
<div class="terbaru-kepala">
<div class="terbaru-judul"><h2 id="judul-terbaru">Terbaru</h2><span class="data" data-hitung="daftar-terbaru">${diSemua.size} berita</span></div>
<div class="saring" role="group" aria-label="Saring berita terbaru" data-saring="daftar-terbaru">
<button type="button" value="semua" aria-pressed="true">Semua</button>${LAJUR.map((l) => `<button type="button" value="${l}" aria-pressed="false">${esc(config.lajur[l].nama)}</button>`).join('')}
</div>
</div>
<div id="daftar-terbaru">${terbaru.map((k) => barisCerita(k, ctx, { diSemua: diSemua.has(k) })).join('\n') || '<p class="kosong">Belum ada berita lain.</p>'}</div>
</section>
<aside class="samping">
${kotakTopik}
${kotakSumber}
</aside>
</div>
</div>`,
}));

// ---------- Halaman lajur ----------

const tigaHari = tanggalBerita.slice(0, 3);
for (const l of SEMUA_LAJUR) {
  const [utama] = kelompokLajur[l];
  const lj = config.lajur[l];
  const namaMedia = [...new Set(config.sumber.filter((s) => s.lajur === l).map((s) => s.nama))];
  const perHari = tigaHari
    .map((tgl) => {
      const daftar = ceritaPadaHari(tgl, l).filter((k) => k !== utama);
      if (!daftar.length) return '';
      const judulHari = tgl === hariIni ? `Hari ini · ${tanggalPanjang(tgl)}` : tanggalPanjang(tgl);
      return `<h2 class="label judul-hari">${esc(judulHari)}</h2>
<div>${daftar.map((k) => barisCerita(k, ctx)).join('\n')}</div>`;
    })
    .join('\n');
  const topikLajur = topik.filter((t) => t.lajur === l);
  const pengantar = lj.terpisah
    ? `<p class="dek">Berita terbaru dari ${esc(namaMedia.slice(0, -1).join(', '))}, dan ${esc(namaMedia.at(-1))}. Judul dan cuplikan ditampilkan dalam bahasa aslinya${lj.bahasa === 'en' ? ' (Inggris)' : ''}; berita yang sama dari beberapa media digabung menjadi satu.</p>`
    : '';
  tulis(lj.halaman, halaman(ctx, {
    judul: lj.nama,
    deskripsi: lj.terpisah
      ? `Berita ${lj.nama.toLowerCase()} terbaru dari ${namaMedia.join(', ')}, diperbarui tiap hari.`
      : `Berita ${lj.nama.toLowerCase()} terbaru dari media Indonesia, diperbarui tiap hari.`,
    aktif: l,
    isi: `<div class="bungkus isi">
${l === 'olahraga' && skor ? blokSkor(skor, ctx) : ''}
<div class="terbaru-grid">
<section class="lajur l-${l}">
${kepalaLajur(l, ctx, { tingkat: 'h1', tautan: false })}
${pengantar}
${utama ? kartuUtama(utama, ctx) : ''}
<div>${perHari}</div>
</section>
<aside class="samping">
${topikLajur.length ? `<section class="kotak"><h2>Topik hangat</h2><div class="awan-topik">${topikLajur.map((t) => `<a class="l-${t.lajur}" href="cari.html?q=${encodeURIComponent(t.teks)}">${esc(t.teks)}</a>`).join('')}</div></section>` : ''}
<section class="kotak"><h2>Sumber lajur ini</h2><div class="daftar-sumber">${status.sumber.filter((s) => s.lajur === l).map((s) => `<div><span>${esc(s.nama)} · ${esc(s.kanal)}</span>${s.ok ? `<span class="data">${s.diterima} berita</span>` : '<span class="data galat">gagal diambil</span>'}</div>`).join('')}</div></section>
</aside>
</div>
</div>`,
  }));
}

// ---------- Ringkasan Pagi ----------

function halamanRingkasan(r, akar) {
  const edisi = [...new Set([hariIni, ...tanggalRingkasanAi])].slice(0, 5);
  const alamatEdisi = (tgl) => (tgl === hariIni ? `${akar}ringkasan.html` : `${akar}ringkasan/${tgl}.html`);
  const n = jumlahPoin(r);
  const label = r.ai
    ? `Ringkasan Pagi · ${tanggalPanjang(r.tanggal)} · dibuat ${pukul(r.dibuat)} WIB`
    : `Sorotan · ${tanggalPanjang(r.tanggal)}`;
  const judul = r.ai ? `${n} hal yang perlu kamu tahu pagi ini` : 'Cerita yang paling banyak diliput hari ini';
  const dek = r.ai
    ? 'Kabar teknologi dan olahraga dari 24 jam terakhir, dirangkum otomatis oleh AI dari judul dan cuplikan media sumber. Klik nama sumber untuk membaca artikel lengkap.'
    : `Ringkasan AI untuk hari ini belum ada; biasanya terbit pukul ${jamRingkasan} WIB setelah kunci API Claude dipasang. Sementara itu, berikut cerita yang paling banyak diberitakan.`;
  return halaman(ctx, {
    judul: r.ai ? `Ringkasan Pagi ${tanggalRingkas(r.tanggal)}` : 'Sorotan',
    deskripsi: judul,
    aktif: 'ringkasan',
    akar,
    isi: `<div class="bungkus isi">
<div class="kepala-halaman">
<div class="kepala-halaman-teks">
<span class="label">${esc(label)}</span>
<h1>${esc(judul)}</h1>
<p class="dek">${esc(dek)}</p>
</div>
<nav class="edisi" aria-label="Edisi lain">
<span class="label">Edisi</span>
<div class="edisi-grid">${edisi.map((tgl) => `<a href="${alamatEdisi(tgl)}"${tgl === r.tanggal ? ' aria-current="page"' : ''}><small>${hariPendek(tgl)}</small><strong>${Number(tgl.slice(8))}</strong></a>`).join('')}</div>
</nav>
</div>
<div class="dua-lajur">
${LAJUR.map((l) => `<section class="lajur l-${l}">
${kepalaLajur(l, ctx, { tautan: false })}
<ol class="daftar-poin">${(r[l] ?? []).map((p, i) => `<li><span class="nomor">${i + 1}</span><div><p>${esc(p.teks)}</p><div class="sumber-poin">${tautanSumberPoin(p, ctx)}</div></div></li>`).join('') || '<li><span></span><p class="kosong">Belum ada.</p></li>'}</ol>
</section>`).join('\n')}
</div>
<div class="catatan-kaki">
<p>${r.ai ? 'Ditulis otomatis oleh AI dari judul dan cuplikan sumber, tanpa menyalin artikel. Poin tanpa tautan sumber ditolak otomatis sebelum terbit.' : 'Sorotan disusun otomatis: cerita yang dimuat paling banyak berita dan media dalam 36 jam terakhir.'}</p>
<a href="${akar}tentang.html">Cara kerja ${esc(config.nama)}</a>
</div>
</div>`,
  });
}

tulis('ringkasan.html', halamanRingkasan(ringkasanKini, ''));
for (const tgl of tanggalRingkasanAi) {
  if (tgl === hariIni) continue;
  tulis(`ringkasan/${tgl}.html`, halamanRingkasan({ ...ringkasanHari(tgl), ai: true }, '../'));
}

// ---------- Arsip ----------

const ringkasHari = tanggalBerita.map((tgl) => {
  const daftar = beritaHari(tgl);
  const cerita = Object.fromEntries(LAJUR.map((l) => [l, ceritaPadaHari(tgl, l)]));
  return { tgl, cerita, jumlah: Object.fromEntries(LAJUR.map((l) => [l, cerita[l].length])) };
});

tulis('arsip.html', halaman(ctx, {
  judul: 'Arsip',
  aktif: 'arsip',
  isi: `<div class="bungkus isi">
<div class="kepala-halaman-teks"><span class="label">Arsip harian</span><h1 class="judul-halaman">Semua berita, per hari</h1></div>
<div class="daftar-arsip">${ringkasHari.map(({ tgl, jumlah }) => `<a href="arsip/${tgl}.html"><span class="label">${esc(tanggalPanjang(tgl).split(',')[0])}</span><strong>${esc(tanggalRingkas(tgl))}</strong><span class="data">${LAJUR.map((l) => `${jumlah[l]} ${config.lajur[l].nama.toLowerCase()}`).join(' · ')}</span></a>`).join('')}</div>
</div>`,
}));

for (const { tgl, cerita } of ringkasHari) {
  tulis(`arsip/${tgl}.html`, halaman(ctx, {
    judul: `Arsip ${tanggalRingkas(tgl)}`,
    aktif: 'arsip',
    akar: '../',
    isi: `<div class="bungkus isi">
<div class="kepala-halaman-teks"><span class="label"><a href="../arsip.html">← Semua arsip</a></span><h1 class="judul-halaman">${esc(tanggalPanjang(tgl))}</h1></div>
<div class="dua-lajur">
${LAJUR.map((l) => `<section class="lajur l-${l}">
${kepalaLajur(l, ctx, { tautan: false })}
<div>${cerita[l].map((k) => barisCerita(k, { ...ctx, hariIni: tgl })).join('\n') || '<p class="kosong">Tidak ada berita.</p>'}</div>
</section>`).join('\n')}
</div>
</div>`,
  }));
}

// ---------- Skor ----------

if (skor) {
  tulis('skor.html', halaman(ctx, {
    judul: 'Skor sepak bola Eropa',
    deskripsi: 'Skor matchday terakhir Liga Inggris, LaLiga, Serie A, Bundesliga, dan Ligue 1.',
    aktif: 'skor',
    isi: `<div class="bungkus isi isi--rapat l-olahraga">
<div class="kepala-halaman-teks"><span class="label">5 liga teratas Eropa</span><h1 class="judul-halaman">Skor sepak bola</h1></div>
${halamanSkorIsi(skor, ctx)}
</div>`,
  }));
}

// ---------- Cari ----------

// Satu entri per cerita; media lain yang memberitakannya ikut tercantum di "juga".
const dataCari = SEMUA_LAJUR.flatMap((l) => ceritaTerkini[l])
  .sort(urutCerita)
  .map((k) => ({ judul: k.utama.judul, tautan: k.utama.tautan, sumber: k.utama.sumber, juga: k.sumberLain, lajur: k.lajur, label: config.lajur[k.lajur].nama, waktu: labelWaktu(k.utama.terbit, hariIni) }));
tulis('cari.json', JSON.stringify(dataCari));

tulis('cari.html', halaman(ctx, {
  judul: 'Cari',
  aktif: 'cari',
  isi: `<div class="bungkus isi isi--rapat">
<div class="kepala-halaman-teks"><span class="label">14 hari terakhir</span><h1 class="judul-halaman">Cari berita</h1></div>
<form id="form-cari" class="form-cari" role="search">
<label class="tersembunyi" for="kata-cari">Kata kunci</label>
<input id="kata-cari" name="q" type="search" placeholder="Misalnya: Jay Idzes, iPhone, Komdigi" autocomplete="off">
<button type="submit">Cari</button>
</form>
<p id="keterangan-cari" class="dek" aria-live="polite"></p>
<div id="hasil-cari" data-sumber="cari.json"></div>
</div>`,
}));

// ---------- Tentang & sumber ----------

tulis('tentang.html', halaman(ctx, {
  judul: 'Tentang & sumber',
  aktif: 'tentang',
  isi: `<div class="bungkus bungkus--sempit isi">
<div class="kepala-halaman-teks">
<span class="label">Tentang ${esc(config.nama)}</span>
<h1 class="judul-halaman">Portal yang memperbarui dirinya sendiri</h1>
<p class="dek">${esc(config.nama)} mengumpulkan berita teknologi dan olahraga dari kanal RSS resmi media Indonesia. Setiap hari pukul ${config.jamPembaruan.map((j) => `${String(j).padStart(2, '0')}.00`).join(', ')} WIB, sebuah jadwal otomatis mengambil berita baru, membuang yang di luar topik atau diterbitkan ulang, mengelompokkan berita yang membahas cerita yang sama, lalu menerbitkan ulang situs ini.</p>
<p class="dek">Yang tampil hanya judul, cuplikan 1–2 kalimat, gambar mini, nama sumber, dan waktu terbit. Artikel lengkap selalu dibaca di situs aslinya.</p>
</div>
<section class="kotak">
<h2>Status sumber</h2>
<p>Diperiksa ${status.diperbarui ? `${esc(tanggalPanjang(tanggalWIB(status.diperbarui)))}, ${pukul(status.diperbarui)} WIB` : '—'}.</p>
<div class="gulir-x">
<table class="tabel">
<thead><tr><th>Kanal RSS</th><th>Lajur</th><th>Diterima</th><th>Dibuang</th><th>Berita terbaru</th><th>Status</th></tr></thead>
<tbody>${status.sumber.map((s) => `<tr class="l-${s.lajur}"><td>${esc(s.nama)} · ${esc(s.kanal)}</td><td class="teks-lajur">${esc(config.lajur[s.lajur].nama)}</td><td class="angka">${s.diterima}</td><td class="angka">${s.dibuang ? s.dibuang.luarTopik + s.dibuang.terbitUlang + s.dibuang.terlaluLama : 0}</td><td class="data">${s.terbaru ? esc(labelWaktu(s.terbaru, hariIni)) : '—'}</td><td>${s.ok ? '<span class="status status--ok">Aktif</span>' : `<span class="status status--galat">${esc(s.galat)}</span>`}</td></tr>`).join('')}</tbody>
</table>
</div>
</section>
</div>`,
}));

// ---------- Feed RSS LAJU ----------

const alamat = config.alamatSitus.replace(/\/?$/, '/');
const rfc822 = (iso) => new Date(iso).toUTCString();
const itemFeed = LAJUR.flatMap((l) => kelompokLajur[l]).sort(urutCerita).slice(0, 60).map(({ utama: b }) => `<item>
<title>${esc(b.judul)}</title>
<link>${esc(b.tautan)}</link>
<guid isPermaLink="false">laju-${b.id}</guid>
<pubDate>${rfc822(b.terbit)}</pubDate>
<category>${esc(config.lajur[b.lajur].nama)}</category>
<source url="${esc(b.tautan)}">${esc(b.sumber)}</source>
${b.cuplikan ? `<description>${esc(b.cuplikan)}</description>` : ''}
</item>`).join('\n');
tulis('feed.xml', `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
<title>${esc(config.nama)}</title>
<link>${esc(alamat === '/' ? '' : alamat)}</link>
<description>${esc(config.slogan)}</description>
<language>id</language>
<lastBuildDate>${rfc822(status.diperbarui ?? new Date().toISOString())}</lastBuildDate>
${itemFeed}
</channel>
</rss>
`);

// ---------- Berkas statis ----------

fs.cpSync(path.join(AKAR, 'public'), DIST, { recursive: true });
tulis('.nojekyll', '');

const jumlahHalaman = 7 + tanggalBerita.length + Math.max(0, tanggalRingkasanAi.filter((t) => t !== hariIni).length);
console.log(`Situs dibangun di dist/ (${jumlahHalaman} halaman, ${jendela.length} berita di beranda, ${ringkasanKini.ai ? 'Ringkasan Pagi AI' : 'Sorotan tanpa AI'}).`);
