// Semua tanggal dan jam ditampilkan dalam WIB (Asia/Jakarta).

const ZONA = 'Asia/Jakarta';

function bagian(tanggal, opsi) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: ZONA, hourCycle: 'h23', ...opsi }).formatToParts(tanggal);
  return Object.fromEntries(parts.map((p) => [p.type, p.value]));
}

// 'YYYY-MM-DD' menurut kalender WIB.
export function tanggalWIB(tanggal = new Date()) {
  const p = bagian(new Date(tanggal), { year: 'numeric', month: '2-digit', day: '2-digit' });
  return `${p.year}-${p.month}-${p.day}`;
}

// Jam dalam WIB sebagai angka 0–23.
export function jamWIB(tanggal = new Date()) {
  return Number(bagian(new Date(tanggal), { hour: '2-digit' }).hour);
}

// '14.30'
export function pukul(tanggal) {
  const p = bagian(new Date(tanggal), { hour: '2-digit', minute: '2-digit' });
  return `${p.hour}.${p.minute}`;
}

const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

// Hari dalam minggu untuk tanggal 'YYYY-MM-DD' (tanpa terpengaruh zona waktu mesin).
function hariKe(ymd) {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

// 'Jumat, 18 September 2026'
export function tanggalPanjang(ymd) {
  const [y, m, d] = ymd.split('-').map(Number);
  return `${HARI[hariKe(ymd)]}, ${d} ${BULAN[m - 1]} ${y}`;
}

// '18 Sep 2026'
export function tanggalRingkas(ymd) {
  const [y, m, d] = ymd.split('-').map(Number);
  return `${d} ${BULAN[m - 1].slice(0, 3)} ${y}`;
}

// 'Jum'
export function hariPendek(ymd) {
  return HARI[hariKe(ymd)].slice(0, 3);
}

// Label waktu untuk sebuah berita, relatif terhadap hari ini: '14.30', 'Kemarin 21.00', '15 Sep 16.10'.
export function labelWaktu(iso, hariIni = tanggalWIB()) {
  const tgl = tanggalWIB(iso);
  if (tgl === hariIni) return pukul(iso);
  if (tgl === geserHari(hariIni, -1)) return `Kemarin ${pukul(iso)}`;
  const [, m, d] = tgl.split('-').map(Number);
  return `${d} ${BULAN[m - 1].slice(0, 3)} ${pukul(iso)}`;
}

// Tambah/kurangi hari pada 'YYYY-MM-DD'.
export function geserHari(ymd, n) {
  const [y, m, d] = ymd.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}

// Jam pembaruan berikutnya dari daftar jam (WIB); null jika hari ini sudah lewat semua.
export function pembaruanBerikutnya(jamDaftar, sekarang = new Date()) {
  const jam = jamWIB(sekarang);
  const berikut = jamDaftar.find((j) => j > jam);
  return berikut === undefined ? null : `${String(berikut).padStart(2, '0')}.00`;
}
