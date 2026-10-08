// Logika murni untuk pemicu lokal (scripts/pemicu-lokal.mjs), dipisah supaya bisa diuji
// tanpa git dan tanpa jam sistem.

import { pukul, tanggalWIB } from './waktu.mjs';

// Teks galat git yang berarti login GitHub ditolak (kedaluwarsa, dicabut, atau tidak ada).
// Contoh nyata: "Invalid username or token", "Authentication failed",
// "could not read Username ... terminal prompts disabled".
const POLA_LOGIN = /Authentication failed|Invalid username or token|could not read (Username|Password)|terminal prompts disabled|Permission to .+ denied|returned error: 40[13]/i;

// Galat jaringan: jangan diperlakukan sebagai login kedaluwarsa. Cukup dicoba lagi nanti.
const POLA_JARINGAN = /Could not resolve host|Failed to connect|Connection (timed out|reset|refused)|timed out|unable to access|early EOF|Network is unreachable|SSL|schannel/i;

// 'login' | 'jaringan' | 'lain'. Login diperiksa lebih dulu karena "unable to access ... error: 403"
// memuat kedua jenis kata.
export function jenisGalat(teks) {
  const t = String(teks ?? '');
  if (POLA_LOGIN.test(t)) return 'login';
  if (POLA_JARINGAN.test(t)) return 'jaringan';
  return 'lain';
}

// Apakah pembaruan perlu dipicu sekarang? Sebuah jam pembaruan (mis. 11.00) dianggap "tertinggal"
// bila sudah lewat dan belum ada pembaruan sesudahnya. Pembaruan dari mana pun dihitung
// (jadwal GitHub, pemicu eksternal, atau pemicu lokal), jadi tidak pernah ada pembaruan ganda.
export function keputusan({ sekarang, terakhirDiperbarui, terakhirDipicu, jamSlot, paksa = false, jedaPicuMenit = 90 }) {
  if (paksa) return { picu: true, alasan: 'dipaksa lewat --paksa' };

  const now = sekarang.getTime();
  const hari = tanggalWIB(sekarang);
  const slot = [...jamSlot]
    .sort((a, b) => a - b)
    .map((jam) => ({ jam, waktu: Date.parse(`${hari}T${String(jam).padStart(2, '0')}:00:00+07:00`) }))
    .filter((s) => s.waktu <= now)
    .at(-1);
  if (!slot) return { picu: false, alasan: 'belum ada jam pembaruan yang lewat hari ini' };

  const namaSlot = `${String(slot.jam).padStart(2, '0')}.00`;
  if (terakhirDiperbarui >= slot.waktu) {
    return { picu: false, alasan: `jam ${namaSlot} sudah terpenuhi (pembaruan terakhir ${pukul(terakhirDiperbarui)} WIB)` };
  }
  if (terakhirDipicu && now - terakhirDipicu < jedaPicuMenit * 60000) {
    const menit = Math.round((now - terakhirDipicu) / 60000);
    return { picu: false, alasan: `jam ${namaSlot} belum terpenuhi, tetapi baru dipicu ${menit} menit lalu; menunggu workflow selesai` };
  }
  const terakhir = terakhirDiperbarui ? `pembaruan terakhir ${pukul(terakhirDiperbarui)} WIB` : 'belum ada pembaruan';
  return { picu: true, alasan: `jam ${namaSlot} belum terpenuhi (${terakhir})`, slot: namaSlot };
}
