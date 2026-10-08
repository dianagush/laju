// Pemicu lokal: cadangan untuk jadwal GitHub yang sering dilewati.
// Dipanggil berkala oleh Penjadwal Tugas Windows (dipasang scripts/pasang-pemicu-lokal.ps1) dari
// SALINAN KHUSUS repositori, bukan dari folder kerja. Bila sebuah jam di `jamPembaruan` sudah lewat
// dan belum ada pembaruan sesudahnya, skrip ini mendorong satu commit kecil (mengubah pemicu.txt) ke GitHub. Push itu
// menjalankan workflow "Perbarui berita", yang untuk event push selalu memperbarui.
//
// Login GitHub kedaluwarsa: push dicoba tanpa jendela apa pun. Bila ditolak karena login (bukan karena
// jaringan), skrip menampilkan notifikasi Windows lalu membuka halaman masuk GitHub di browser lewat
// Git Credential Manager. Setelah kamu masuk, push diulang otomatis. Jendela masuk dibuka paling sering
// sekali per JEDA_LOGIN_JAM jam supaya tidak mengganggu.
//
// Jalankan: node scripts/pemicu-lokal.mjs --tarik   (yang dipakai tugas terjadwal: ambil data terbaru dulu)
//           node scripts/pemicu-lokal.mjs --uji     (tampilkan keputusan saja, tanpa mengubah apa pun)
//           node scripts/pemicu-lokal.mjs --paksa   (picu sekarang walau jadwal sudah terpenuhi)
//           node scripts/pemicu-lokal.mjs --login   (buka halaman masuk GitHub sekarang)
// Log: .laju/pemicu.log, keadaan terakhir: .laju/pemicu.json

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import config from '../laju.config.mjs';
import { AKAR, BERKAS_STATUS, bacaJson, tulisJson } from './lib/data.mjs';
import { jenisGalat, keputusan } from './lib/pemicu.mjs';
import { pukul, tanggalWIB } from './lib/waktu.mjs';

const BERKAS_LOG = path.join(AKAR, '.laju', 'pemicu.log');
const BERKAS_KEADAAN = path.join(AKAR, '.laju', 'pemicu.json');
const JEDA_PICU_MENIT = 90;
const JEDA_LOGIN_JAM = 4;
const BATAS_LOG = 300;
// Tanpa jendela dan tanpa pertanyaan di terminal: bila login ditolak, git langsung gagal.
const TANPA_TANYA = { GCM_INTERACTIVE: 'never', GIT_TERMINAL_PROMPT: '0' };

const arg = new Set(process.argv.slice(2));
const uji = arg.has('--uji');
const paksa = arg.has('--paksa');
const keadaan = bacaJson(BERKAS_KEADAAN, {});

function catat(pesan) {
  const baris = `[${tanggalWIB()} ${pukul(new Date())} WIB] ${pesan}`;
  console.log(baris);
  if (uji) return;
  let lama = '';
  try {
    lama = fs.readFileSync(BERKAS_LOG, 'utf8');
  } catch {
    // belum ada log
  }
  fs.mkdirSync(path.dirname(BERKAS_LOG), { recursive: true });
  fs.writeFileSync(BERKAS_LOG, `${(lama + baris).split('\n').filter(Boolean).slice(-BATAS_LOG).join('\n')}\n`);
}

function selesai(kode = 0) {
  if (!uji) {
    keadaan.terakhirCek = new Date().toISOString();
    tulisJson(BERKAS_KEADAAN, keadaan);
  }
  process.exit(kode);
}

function git(args, { env = {}, timeout = 120000 } = {}) {
  const r = spawnSync('git', args, { cwd: AKAR, encoding: 'utf8', timeout, windowsHide: true, env: { ...process.env, ...env } });
  return { ok: r.status === 0, keluar: `${r.stdout ?? ''}${r.stderr ?? ''}${r.error ? r.error.message : ''}`.trim() };
}

function notifikasi(judul, isi) {
  if (process.platform !== 'win32' || process.env.LAJU_TANPA_NOTIFIKASI) return;
  spawnSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(AKAR, 'scripts', 'notifikasi-windows.ps1'), '-Judul', judul, '-Isi', isi], {
    windowsHide: true,
    timeout: 20000,
  });
}

// ---------- Login GitHub ----------

function pemilikRepo() {
  const r = git(['remote', 'get-url', 'origin']);
  return r.keluar.match(/github\.com[/:]([^/]+)\//i)?.[1] ?? '';
}

// Membuka halaman masuk GitHub di browser lewat Git Credential Manager; setelah kamu masuk, token baru
// disimpan di Windows dan dipakai git. LAJU_PERINTAH_LOGIN menggantikan perintahnya (untuk pengujian).
function masukLagi() {
  let r;
  if (process.env.LAJU_PERINTAH_LOGIN) {
    r = spawnSync(process.env.LAJU_PERINTAH_LOGIN, { shell: true, encoding: 'utf8', windowsHide: true, timeout: 300000 });
  } else {
    const pemilik = pemilikRepo();
    r = spawnSync('git', ['credential-manager', 'github', 'login', '--browser', '--force', ...(pemilik ? ['--username', pemilik] : [])], {
      cwd: AKAR,
      encoding: 'utf8',
      windowsHide: true,
      timeout: 300000,
    });
  }
  if (r.status === 0) return true;
  catat(`Perintah masuk GitHub gagal atau dibatalkan (${(r.stderr || r.error?.message || `kode ${r.status}`).toString().trim().slice(0, 160)}).`);
  return false;
}

function mintaMasuk(alasan) {
  keadaan.loginDiminta = new Date().toISOString();
  notifikasi('LAJU: login GitHub perlu diperbarui', 'Halaman masuk GitHub dibuka di browser. Masuk di sana agar pembaruan portal bisa dipicu lagi.');
  catat(`${alasan} Membuka halaman masuk GitHub di browser…`);
  const berhasil = masukLagi();
  if (!berhasil && process.platform === 'win32' && !process.env.LAJU_PERINTAH_LOGIN) {
    // Cadangan: setidaknya buka web GitHub; setelah masuk, jalankan "git push" sekali dari klon khusus.
    spawnSync('cmd.exe', ['/c', 'start', '', 'https://github.com/login'], { windowsHide: true });
  }
  return berhasil;
}

if (arg.has('--login')) {
  const berhasil = mintaMasuk('Diminta lewat --login.');
  catat(berhasil ? 'Login GitHub diperbarui.' : 'Login GitHub belum diperbarui.');
  selesai(berhasil ? 0 : 1);
}

// ---------- Pengamanan folder kerja ----------

if (!uji) {
  const bersih = git(['status', '--porcelain']);
  const cabang = git(['rev-parse', '--abbrev-ref', 'HEAD']);
  if (!bersih.ok || bersih.keluar || cabang.keluar !== 'main') {
    catat('Folder ini bukan salinan khusus yang bersih di cabang main, jadi pemicu dihentikan agar pekerjaanmu tidak terganggu. Pasang lewat scripts/pasang-pemicu-lokal.ps1.');
    process.exit(1);
  }
}

if (arg.has('--tarik')) {
  const tarik = git(['pull', '--ff-only', '--quiet'], { env: TANPA_TANYA });
  if (!tarik.ok) {
    catat(`Gagal mengambil data terbaru (${jenisGalat(tarik.keluar)}): ${tarik.keluar.split('\n').pop().slice(0, 160)}`);
    selesai(jenisGalat(tarik.keluar) === 'jaringan' ? 0 : 1);
  }
}

// ---------- Keputusan ----------

const status = bacaJson(BERKAS_STATUS, { diperbarui: null });
const putusan = keputusan({
  sekarang: new Date(),
  terakhirDiperbarui: status.diperbarui ? Date.parse(status.diperbarui) : 0,
  terakhirDipicu: keadaan.dipicu ? Date.parse(keadaan.dipicu) : 0,
  jamSlot: config.jamPembaruan,
  paksa,
  jedaPicuMenit: JEDA_PICU_MENIT,
});

if (!putusan.picu) {
  console.log(`Tidak memicu: ${putusan.alasan}.`);
  selesai(0);
}
if (uji) {
  console.log(`Akan memicu: ${putusan.alasan}. (--uji: tidak ada yang dikirim)`);
  process.exit(0);
}

// ---------- Memicu ----------

// Commit KOSONG tidak memicu workflow: aturan paths-ignore di perbarui.yml menganggapnya "tidak ada berkas
// yang berubah" (terbukti 8 Oktober 2026). Karena itu yang dikirim adalah perubahan kecil pada pemicu.txt,
// berkas yang tidak termasuk daftar yang diabaikan.
const pesanCommit = `Pemicu lokal ${tanggalWIB()} ${pukul(new Date())} WIB`;
fs.writeFileSync(path.join(AKAR, 'pemicu.txt'), `Dipicu oleh pemicu lokal pada ${new Date().toISOString()}\n`);
const commit = git(['add', 'pemicu.txt']).ok ? git(['commit', '-q', '-m', pesanCommit]) : { ok: false, keluar: 'git add gagal' };
if (!commit.ok) {
  git(['reset', '--hard', '-q', 'HEAD']);
  git(['clean', '-fq', '--', 'pemicu.txt']);
  catat(`Gagal membuat commit pemicu: ${commit.keluar.slice(0, 200)}`);
  selesai(1);
}
const batalkanCommit = () => git(['reset', '--hard', 'HEAD~1', '-q']);
const dorong = () => git(['push', '--quiet', 'origin', 'HEAD:main'], { env: TANPA_TANYA });

let hasil = dorong();
let jenis = hasil.ok ? '' : jenisGalat(hasil.keluar);

// Pernah ada "Invalid username or token" sesaat yang hilang sendiri, jadi ulangi sekali sebelum dianggap kedaluwarsa.
if (jenis === 'login') {
  await new Promise((r) => setTimeout(r, 10000));
  hasil = dorong();
  jenis = hasil.ok ? '' : jenisGalat(hasil.keluar);
}

if (jenis === 'login') {
  const sejak = keadaan.loginDiminta ? (Date.now() - Date.parse(keadaan.loginDiminta)) / 3600000 : Infinity;
  if (sejak < JEDA_LOGIN_JAM) {
    batalkanCommit();
    catat(`Login GitHub masih kedaluwarsa; halaman masuk sudah dibuka ${Math.round(sejak * 60)} menit lalu, jadi tidak dibuka lagi dulu. Jalankan "node scripts/pemicu-lokal.mjs --login" untuk membukanya sekarang.`);
    selesai(1);
  }
  if (mintaMasuk('Login GitHub kedaluwarsa atau dicabut.')) {
    hasil = dorong();
    jenis = hasil.ok ? '' : jenisGalat(hasil.keluar);
  }
}

if (!hasil.ok) {
  batalkanCommit();
  const label = { login: 'login GitHub masih ditolak', jaringan: 'tidak ada jaringan', lain: 'galat lain' }[jenis];
  catat(`Gagal memicu (${label}): ${hasil.keluar.split('\n').pop().slice(0, 200)}`);
  selesai(jenis === 'jaringan' ? 0 : 1);
}

keadaan.dipicu = new Date().toISOString();
catat(`Dipicu: ${putusan.alasan}. Perubahan pemicu.txt terkirim; workflow "Perbarui berita" berjalan di GitHub.`);
selesai(0);
