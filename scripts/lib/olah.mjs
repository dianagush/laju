// Menyaring, mengelompokkan, dan mencari topik hangat dari kumpulan berita.

// Kata yang terlalu umum untuk dipakai membandingkan judul atau menjadi topik.
const KATA_UMUM = new Set(`
yang di ke dari dan untuk dengan ini itu ada akan jadi pada dalam atau tak tidak bisa usai saat soal cara simak begini
berikut hasil link foto video live streaming siaran langsung daftar jelang resmi baru terbaru lebih masih sudah bakal kata
ungkap sebut minta bikin buat lewat hingga sejak kenapa apa siapa bagaimana alasan penyebab harga spek cek intip jadwal
hari the of a an and to in on for vs bagi oleh jika kalau agar karena tapi namun juga lagi sang para telah belum pun mau
ingin punya kini tiap setiap kembali bukan jangan hanya pasti tetap mulai dapat tersebut paling banyak sejumlah beberapa
semua dua tiga satu hal ri indonesia pemain laga menang kalah tim klub pelatih gol pertandingan aplikasi pengguna ponsel hp
fitur layanan perusahaan teknologi olahraga atlet jawab respons tanggapi sorot sorotan momen fakta wajib diketahui tahun
besar kecil lengkap terkini update tetap langsung ternyata begitu makin usai rilis luncurkan meluncur hadir
`.trim().split(/\s+/));

// Pecah judul menjadi kata, simpan bentuk aslinya (untuk tampilan) dan huruf kecilnya (untuk dibandingkan).
function pecah(judul) {
  return judul
    .normalize('NFC')
    .replace(/[“”"‘’'`()[\]{}:;,.!?|/\\–—]+/g, ' ')
    .split(/\s+/)
    .flatMap((w) => (/^([A-Za-z]+)-\1$/i.test(w) ? [w] : w.split('-')))
    .map((w) => w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''))
    .filter(Boolean)
    .map((asli) => ({ asli, kecil: asli.toLowerCase() }));
}

export function token(judul) {
  return pecah(judul).map((t) => t.kecil).filter((k) => !KATA_UMUM.has(k));
}

// Judul memuat salah satu kata/frasa ini (utuh, bukan potongan kata)?
export function memuatKata(judul, daftarKata = []) {
  const kecil = ` ${judul.toLowerCase().replace(/[^\p{L}\p{N}-]+/gu, ' ')} `;
  return daftarKata.some((k) => kecil.includes(` ${k.toLowerCase()} `));
}

// Artikel lama yang diterbitkan ulang: tanggal di URL (…/20260820104741-…) jauh lebih tua dari tanggal terbit.
export function terbitUlang(berita, batasHari) {
  const m = berita.tautan.match(/\/(20\d{2})(\d{2})(\d{2})\d{6}-/);
  if (!m) return false;
  const tanggalUrl = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return new Date(berita.terbit).getTime() - tanggalUrl > batasHari * 86400000;
}

// ---------- Menggabungkan berita yang sama dari sumber berbeda ----------
//
// Tiap berita diubah menjadi vektor TF-IDF dari judul dan cuplikan. Kata yang jarang muncul
// (nama pemain, skor, merek) berbobot besar; kata umum ("Timnas", "Asian Games") berbobot kecil.
// Berita masuk ke sebuah cerita bila kemiripan kosinusnya dengan pusat cerita ≥ ambang, terbit
// berdekatan, dan tidak bertentangan (pra-laga vs hasil laga, lawan tanding berbeda).
// Semua angka dan daftar kata diatur di laju.config.mjs bagian `duplikat`;
// nilai di bawah hanya dipakai bila bagian itu tidak ada.

const DUPLIKAT_BAWAAN = {
  aktif: true,
  ambang: 0.5,
  ambangRataRata: 0.4,
  jendelaJam: 48,
  bobotJudul: 2,
  bobotCuplikan: 1,
  pisahkanPraDanHasil: true,
  kataPraLaga: [],
  kataHasilLaga: [],
  pisahkanLawanBerbeda: true,
  sinonim: [],
};

function pengaturanDuplikat(pengaturan = {}) {
  const p = { ...DUPLIKAT_BAWAAN, ...pengaturan };
  // Tiap variasi sinonim diganti satu kata baku, mis. "man city" → "manchester_city".
  p.aturanSinonim = p.sinonim
    .flatMap((kelompok) => {
      const baku = kelompok[0].toLowerCase().split(/\s+/).join('_');
      return kelompok.map((v) => ({ kata: v.toLowerCase().split(/\s+/), baku }));
    })
    .sort((a, b) => b.kata.length - a.kata.length);
  return p;
}

// Pemotong imbuhan sederhana supaya "diblokir" dan "blokir" dianggap sama.
function akarKata(w) {
  if (w.length <= 5 || /\d/.test(w)) return w;
  let s = w.replace(/(nya|lah|kah)$/, '');
  if (s.length > 6) s = s.replace(/(kan|an)$/, '');
  const p = s.match(/^(di|ter|ber|meng|meny|mem|men|me|peng|peny|pem|pen)(.{4,})$/);
  return p ? p[2] : s;
}

// Kata-kata penting sebuah teks: sinonim diseragamkan, kata umum dibuang, imbuhan dipotong.
function kataPenting(teks, p) {
  const kata = pecah(teks).map((t) => t.kecil);
  const hasil = [];
  for (let i = 0; i < kata.length; ) {
    const cocok = p.aturanSinonim.find((a) => a.kata.every((k, j) => kata[i + j] === k));
    if (cocok) {
      hasil.push(cocok.baku);
      i += cocok.kata.length;
    } else {
      if (!KATA_UMUM.has(kata[i])) hasil.push(akarKata(kata[i]));
      i += 1;
    }
  }
  return hasil;
}

function jenisLaga(judul, p) {
  if (!p.pisahkanPraDanHasil) return null;
  if (memuatKata(judul, p.kataHasilLaga)) return 'hasil';
  if (memuatKata(judul, p.kataPraLaga)) return 'pra';
  return null;
}

// Kata sesudah "vs" (lawan tanding), mis. "nepal" dari "Indonesia vs Nepal".
function lawanTanding(judul) {
  const m = judul.toLowerCase().match(/\bvs\.?\s+([\p{L}\d]+)/u);
  return m ? m[1] : null;
}

function lawanBerbeda(a, b, p) {
  if (!p.pisahkanLawanBerbeda) return false;
  const la = lawanTanding(a.judul);
  const lb = lawanTanding(b.judul);
  return Boolean(la && lb && la !== lb && !a.judul.toLowerCase().includes(lb) && !b.judul.toLowerCase().includes(la));
}

function vektorTfIdf(berita, p) {
  const mentah = berita.map((b) => {
    const m = new Map();
    for (const t of kataPenting(b.judul, p)) m.set(t, (m.get(t) ?? 0) + p.bobotJudul);
    for (const t of kataPenting(b.cuplikan ?? '', p)) m.set(t, (m.get(t) ?? 0) + p.bobotCuplikan);
    return m;
  });
  const df = new Map();
  for (const v of mentah) for (const t of v.keys()) df.set(t, (df.get(t) ?? 0) + 1);
  const n = berita.length;
  return mentah.map((v) => {
    const w = new Map();
    let panjang = 0;
    for (const [t, f] of v) {
      const x = f * Math.log((n + 1) / (df.get(t) + 1));
      w.set(t, x);
      panjang += x * x;
    }
    panjang = Math.sqrt(panjang) || 1;
    for (const [t, x] of w) w.set(t, x / panjang);
    return w;
  });
}

function kaliTitik(a, b) {
  let s = 0;
  for (const [t, x] of a) {
    const y = b.get(t);
    if (y) s += x * y;
  }
  return s;
}

function bertentangan(berita, cerita, p) {
  const jenis = jenisLaga(berita.judul, p);
  if (jenis && cerita.jenis && jenis !== cerita.jenis) return true;
  return cerita.anggota.some((a) => lawanBerbeda(berita, a, p));
}

// Inti penggabungan; mengembalikan cerita beserta vektor tiap berita (dipakai juga oleh cek-duplikat).
function susunCerita(berita, p) {
  const urut = [...berita].sort((a, b) => a.terbit.localeCompare(b.terbit));
  const vektor = vektorTfIdf(urut, p);
  const jendela = p.jendelaJam * 3600000;
  const cerita = [];

  urut.forEach((b, i) => {
    const v = vektor[i];
    const waktu = Date.parse(b.terbit);
    let terbaik = null;
    let skorTerbaik = 0;
    if (p.aktif) {
      for (const c of cerita) {
        if (c.lajur !== b.lajur || waktu - c.terakhir > jendela) continue;
        const titik = kaliTitik(v, c.pusat);
        const skor = titik / Math.sqrt(c.panjang2);
        if (skor > skorTerbaik && titik / c.anggota.length >= p.ambangRataRata && !bertentangan(b, c, p)) {
          skorTerbaik = skor;
          terbaik = c;
        }
      }
    }
    if (terbaik && skorTerbaik >= p.ambang) {
      terbaik.panjang2 += 2 * kaliTitik(v, terbaik.pusat) + 1;
      for (const [t, x] of v) terbaik.pusat.set(t, (terbaik.pusat.get(t) ?? 0) + x);
      terbaik.anggota.push(b);
      terbaik.vektor.push(v);
      terbaik.terakhir = waktu;
      terbaik.jenis ??= jenisLaga(b.judul, p);
    } else {
      cerita.push({ lajur: b.lajur, anggota: [b], vektor: [v], pusat: new Map(v), panjang2: 1, awal: waktu, terakhir: waktu, jenis: jenisLaga(b.judul, p) });
    }
  });

  // Tahap 2: urutan masuk kadang memecah satu cerita menjadi beberapa kelompok
  // (mis. hasil laga yang sama dari CNN dan dari Liputan6). Gabungkan kelompok yang pusatnya mirip.
  for (let ada = p.aktif; ada; ) {
    ada = false;
    for (let i = 0; i < cerita.length; i += 1) {
      const a = cerita[i];
      for (let j = i + 1; j < cerita.length; j += 1) {
        const c = cerita[j];
        if (c.lajur !== a.lajur || c.awal - a.terakhir > jendela || a.awal - c.terakhir > jendela) continue;
        if (a.jenis && c.jenis && a.jenis !== c.jenis) continue;
        const titik = kaliTitik(a.pusat, c.pusat);
        if (titik / Math.sqrt(a.panjang2 * c.panjang2) < p.ambang) continue;
        if (titik / (a.anggota.length * c.anggota.length) < p.ambangRataRata) continue;
        if (c.anggota.some((b) => bertentangan(b, a, p))) continue;
        a.panjang2 += c.panjang2 + 2 * titik;
        for (const [t, x] of c.pusat) a.pusat.set(t, (a.pusat.get(t) ?? 0) + x);
        a.anggota.push(...c.anggota);
        a.vektor.push(...c.vektor);
        a.awal = Math.min(a.awal, c.awal);
        a.terakhir = Math.max(a.terakhir, c.terakhir);
        a.jenis ??= c.jenis;
        cerita.splice(j, 1);
        j -= 1;
        ada = true;
      }
    }
  }
  return { cerita, urut, vektor };
}

function bentukCerita(c) {
  // Wakil cerita dipilih dari berita 24 jam terakhir cerita itu (bukan artikel lama yang
  // kebetulan paling "tengah"), lalu yang paling dekat dengan pusat cerita, diutamakan yang bergambar.
  const terakhir = Math.max(...c.anggota.map((b) => Date.parse(b.terbit)));
  const skor = c.anggota.map((b, i) =>
    Date.parse(b.terbit) < terakhir - 24 * 3600000 ? -Infinity : kaliTitik(c.vektor[i], c.pusat) + (b.gambar ? 0.05 : 0),
  );
  const iUtama = skor.indexOf(Math.max(...skor));
  const utama = c.anggota[iUtama];
  const lain = c.anggota.filter((_, i) => i !== iUtama).sort((a, b) => b.terbit.localeCompare(a.terbit));
  const sumberLain = [...new Set(lain.map((b) => b.sumber))].filter((s) => s !== utama.sumber);
  return {
    lajur: c.lajur,
    utama,
    lain,
    terbaru: c.anggota.reduce((t, b) => (b.terbit > t ? b.terbit : t), ''),
    jumlahSumber: sumberLain.length + 1,
    sumberLain,
  };
}

// Gabungkan berita yang membahas cerita yang sama (dalam satu lajur), dari sumber mana pun.
// Tiap cerita: { lajur, utama, lain, terbaru, jumlahSumber, sumberLain }.
// `utama` = berita yang paling mewakili cerita (paling dekat dengan pusatnya), diutamakan yang bergambar.
export function kelompokkan(berita, pengaturan) {
  const p = pengaturanDuplikat(pengaturan);
  return susunCerita(berita, p).cerita.map(bentukCerita);
}

// Untuk npm run cek-duplikat: cerita hasil gabungan, plus pasangan berita yang mirip
// (kemiripan ≥ batasBawah) tetapi tidak digabung, beserta alasannya.
export function periksaDuplikat(berita, pengaturan, { batasBawah = 0.35 } = {}) {
  const p = pengaturanDuplikat(pengaturan);
  const { cerita, urut, vektor } = susunCerita(berita, p);
  const ceritaDari = new Map();
  cerita.forEach((c, i) => c.anggota.forEach((b) => ceritaDari.set(b, i)));
  const jendela = p.jendelaJam * 3600000;
  const hampir = [];
  for (let i = 0; i < urut.length; i += 1) {
    for (let j = i + 1; j < urut.length; j += 1) {
      const a = urut[i];
      const b = urut[j];
      if (a.lajur !== b.lajur || ceritaDari.get(a) === ceritaDari.get(b)) continue;
      if (Date.parse(b.terbit) - Date.parse(a.terbit) > jendela) continue;
      const skor = kaliTitik(vektor[i], vektor[j]);
      if (skor < batasBawah) continue;
      const ja = jenisLaga(a.judul, p);
      const jb = jenisLaga(b.judul, p);
      let alasan;
      if (!p.aktif) alasan = 'penggabungan nonaktif';
      else if (ja && jb && ja !== jb) alasan = 'pra-laga vs hasil';
      else if (lawanBerbeda(a, b, p)) alasan = 'lawan tanding berbeda';
      else if (skor < p.ambang) alasan = 'di bawah ambang';
      else alasan = 'masuk cerita lain';
      hampir.push({ skor, a, b, alasan });
    }
  }
  hampir.sort((x, y) => y.skor - x.skor);
  return { pengaturan: p, cerita: cerita.map(bentukCerita), hampir };
}

// Skor: makin banyak berita dan media yang meliput, makin penting; makin lama, makin turun.
export function skorLiputan(k, acuan = Date.now()) {
  const liputan = 1 + k.lain.length + 0.5 * (k.jumlahSumber - 1);
  const usiaJam = Math.max(0, (acuan - Date.parse(k.terbaru)) / 3600000);
  return liputan / (1 + usiaJam / 12);
}

// Urutkan kelompok dari yang paling penting.
export function urutPenting(kelompok, acuan = Date.now()) {
  return [...kelompok].sort((a, b) => skorLiputan(b, acuan) - skorLiputan(a, acuan) || b.terbaru.localeCompare(a.terbaru));
}

function jumlahHurufBesar(s) {
  return (s.match(/\p{Lu}/gu) || []).length;
}

// Frasa (1–3 kata) yang muncul di banyak judul sekaligus.
export function topikHangat(berita, { maks = 8, minBerita = 3 } = {}) {
  const hitung = new Map();
  for (const b of berita) {
    const rantai = [];
    let sekarang = [];
    for (const t of pecah(b.judul)) {
      if (KATA_UMUM.has(t.kecil)) {
        if (sekarang.length) rantai.push(sekarang);
        sekarang = [];
      } else sekarang.push(t);
    }
    if (sekarang.length) rantai.push(sekarang);

    const sudah = new Set();
    for (const r of rantai) {
      for (let n = 1; n <= 3; n += 1) {
        for (let i = 0; i + n <= r.length; i += 1) {
          const g = r.slice(i, i + n);
          if (/^\d/.test(g[0].kecil)) continue;
          if (!g.some((x) => /\p{L}{2,}/u.test(x.asli))) continue;
          if (n === 1) {
            const w = g[0].asli;
            const akronim = w.length >= 2 && w === w.toUpperCase() && /\p{L}/u.test(w);
            if (!akronim && w.length < 5) continue;
          }
          const kunci = g.map((x) => x.kecil).join(' ');
          if (sudah.has(kunci)) continue;
          sudah.add(kunci);
          const tampil = g.map((x) => x.asli).join(' ');
          let e = hitung.get(kunci);
          if (!e) {
            e = { kunci, tampil, n, id: new Set(), lajur: { tekno: 0, olahraga: 0 } };
            hitung.set(kunci, e);
          } else if (jumlahHurufBesar(tampil) > jumlahHurufBesar(e.tampil)) {
            e.tampil = tampil;
          }
          e.id.add(b.id);
          e.lajur[b.lajur] += 1;
        }
      }
    }
  }

  const bobot = (e) => e.id.size * (1 + 0.35 * (e.n - 1));
  const calon = [...hitung.values()].filter((e) => e.id.size >= minBerita).sort((a, b) => bobot(b) - bobot(a));
  const terpilih = [];
  for (const e of calon) {
    const kata = e.kunci.split(' ');
    if (terpilih.some((p) => p.kunci.split(' ').some((k) => kata.includes(k)))) continue;
    terpilih.push(e);
    if (terpilih.length >= maks) break;
  }
  return terpilih.map((e) => ({
    teks: e.tampil,
    kata: e.kunci.split(' '),
    jumlah: e.id.size,
    lajur: e.lajur.tekno >= e.lajur.olahraga ? 'tekno' : 'olahraga',
  }));
}

// Topik hangat pertama yang muncul di judul berita ini (untuk label kecil di atas judul).
export function topikUntuk(berita, topik) {
  const t = new Set(pecah(berita.judul).map((x) => x.kecil));
  return topik.find((p) => p.kata.every((k) => t.has(k))) || null;
}
