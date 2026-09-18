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

function mirip(a, b) {
  let sama = 0;
  for (const t of a) if (b.has(t)) sama += 1;
  return sama >= 3 && sama / Math.min(a.size, b.size) >= 0.5;
}

// Kelompokkan berita yang membahas cerita yang sama (dalam satu lajur).
// Tiap kelompok: { utama, lain, lajur, terbaru, jumlahSumber }. `utama` = laporan paling baru.
export function kelompokkan(berita) {
  const urut = [...berita].sort((a, b) => a.terbit.localeCompare(b.terbit));
  const tokenOf = new Map();
  const kelompok = [];
  for (const b of urut) {
    const tb = new Set(token(b.judul));
    tokenOf.set(b, tb);
    const cocok = kelompok.find((k) => k.lajur === b.lajur && k.anggota.some((a) => mirip(tokenOf.get(a), tb)));
    if (cocok) cocok.anggota.push(b);
    else kelompok.push({ lajur: b.lajur, anggota: [b] });
  }
  return kelompok.map((k) => {
    const baruDulu = [...k.anggota].reverse();
    return {
      lajur: k.lajur,
      utama: baruDulu[0],
      lain: baruDulu.slice(1),
      terbaru: baruDulu[0].terbit,
      jumlahSumber: new Set(k.anggota.map((a) => a.sumber)).size,
    };
  });
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
