# LAJU

Portal berita teknologi dan olahraga yang memperbarui dirinya sendiri. LAJU membaca RSS resmi media Indonesia enam kali sehari, membuang berita yang di luar topik, mengelompokkan berita yang membahas cerita yang sama, lalu menerbitkan situs statis. Setiap pagi, AI bisa menulis **Ringkasan Pagi**: 5 poin per lajur, masing-masing dengan tautan ke sumbernya.

LAJU hanya menampilkan judul, cuplikan, gambar mini, nama sumber, dan waktu. Artikel lengkap selalu dibaca di situs aslinya.

## Menjalankan di komputer sendiri

Butuh [Node.js](https://nodejs.org) versi 20 atau lebih baru. Tidak perlu `npm install` kecuali untuk Ringkasan Pagi.

```bash
npm run perbarui
```

```bash
npm run lihat
```

Lalu buka http://localhost:4321.

| Perintah | Fungsi |
|---|---|
| `npm run ambil` | Ambil berita dari semua sumber ke `data/berita/` |
| `npm run skor` | Ambil skor 5 liga Eropa ke `data/skor.json` |
| `npm run ringkasan` | Tulis Ringkasan Pagi dengan AI (butuh kunci API, lihat di bawah) |
| `npm run bangun` | Bangun situs ke `dist/` |
| `npm run perbarui` | Ketiganya sekaligus |
| `npm run lihat` | Pratinjau `dist/` di browser |
| `npm run cek-duplikat` | Laporan penggabungan berita duplikat (lihat di bawah) |
| `npm run uji-sumber` | Uji apakah kanal RSS bisa dibaca dari komputer ini |

## Menayangkan online (gratis, diperbarui otomatis)

LAJU memakai GitHub Actions untuk jadwal otomatis dan GitHub Pages untuk hosting.

1. Buat repositori **publik** baru di GitHub, misalnya `laju`.
2. Unggah isi folder ini ke repositori tersebut:
   ```bash
   git init -b main
   ```
   ```bash
   git add .
   ```
   ```bash
   git commit -m "LAJU pertama"
   ```
   ```bash
   git remote add origin https://github.com/NAMA-AKUNMU/laju.git
   ```
   ```bash
   git push -u origin main
   ```
3. Di repositori: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. Buka tab **Actions → Perbarui berita → Run workflow** untuk menjalankan pertama kali.
5. Situs tayang di `https://NAMA-AKUNMU.github.io/laju/`. Isi alamat ini ke `alamatSitus` di `laju.config.mjs` supaya feed RSS LAJU punya tautan yang benar.

Setelah itu, situs diperbarui sendiri pukul 06.00, 09.00, 12.00, 15.00, 18.00, dan 21.00 WIB. Jadwal GitHub kadang terlambat beberapa menit saat server sedang ramai.

Kalau langkah "Simpan data ke repositori" gagal karena izin, buka **Settings → Actions → General → Workflow permissions** dan pilih **Read and write permissions**.

## Mengaktifkan Ringkasan Pagi (AI)

Tanpa kunci API, situs tetap jalan dan menampilkan **Sorotan**, yaitu cerita yang paling banyak diliput. Untuk ringkasan tulisan AI:

1. Buat kunci API di [console.anthropic.com](https://console.anthropic.com).
2. Di repositori GitHub: **Settings → Secrets and variables → Actions → New repository secret**. Nama: `ANTHROPIC_API_KEY`, isi: kuncimu.

Ringkasan dibuat sekali sehari pada pembaruan pertama setelah pukul 06.00 WIB, memakai model Claude Opus 5. Satu ringkasan membaca sekitar 10 ribu token dan menulis beberapa ribu token. Perkiraan kasarnya US$0,10–0,20 per hari. Poin tanpa tautan sumber yang sah dibuang otomatis sebelum terbit.

Untuk mencoba di komputer sendiri (PowerShell):

```powershell
npm install; $env:ANTHROPIC_API_KEY="kunci-kamu"; npm run ringkasan -- --paksa; npm run bangun
```

## Mengubah sumber, jadwal, dan saringan

Semua pengaturan ada di `laju.config.mjs`:

- `sumber`: daftar kanal RSS dan lajurnya (`tekno` atau `olahraga`).
- `saring`: kata yang membuat berita dibuang dari lajurnya, misalnya berita cuaca BMKG yang ikut masuk kanal Teknologi CNN.
- `tetapSimpan`: pengecualian dari `saring`, misalnya "drone untuk deteksi karhutla" tetap dianggap teknologi.
- `jamPembaruan`: bila diubah, samakan juga jadwal `cron` di `.github/workflows/perbarui.yml`.

Status tiap sumber (berapa berita diterima atau dibuang, dan apakah gagal diambil) tampil di halaman **Tentang & sumber** di situs.

## Isi folder

```
laju.config.mjs          pengaturan
scripts/ambil-berita.mjs langkah 1–3: ambil RSS, saring, simpan per hari
scripts/ringkasan.mjs    langkah 5: Ringkasan Pagi dengan Claude API
scripts/bangun.mjs       langkah 6: bangun situs statis ke dist/
scripts/lihat.mjs        pratinjau lokal
scripts/lib/             pembaca RSS, pengelompokan berita, waktu WIB, template HTML
public/                  CSS, JavaScript, ikon
data/berita/             arsip berita per hari (diisi otomatis)
data/ringkasan/          Ringkasan Pagi per hari (diisi otomatis)
.github/workflows/       jadwal otomatis GitHub Actions
```

## Skor sepak bola

Hasil dan jadwal 5 liga teratas Eropa (Liga Inggris, LaLiga, Serie A, Bundesliga, Ligue 1) tampil di beranda, di halaman Olahraga, dan lengkap di halaman **Skor**. Datanya diambil `scripts/ambil-skor.mjs` dari papan skor ESPN pada jadwal pembaruan yang sama, lalu disimpan di `data/skor.json` (hasil sepekan terakhir, jadwal 4 hari ke depan).

- Tidak perlu kunci API. Papan skor ESPN ini tidak resmi, jadi formatnya bisa berubah; kalau gagal diambil, data terakhir tetap dipakai dan Actions menampilkan peringatan.
- Skor pertandingan yang sedang berlangsung tidak real-time: hanya seakurat pembaruan terakhir. Laga Eropa umumnya selesai sebelum pukul 06.00 WIB, jadi hasilnya lengkap pada pembaruan pagi.
- Liga, rentang hari, atau mematikan fitur ini: `laju.config.mjs` bagian `skor`. Kode liga ESPN lain misalnya `ned.1` (Belanda), `por.1` (Portugal), `idn.1` (Liga Indonesia).

## Berita yang sama dari beberapa media

Berita yang membahas kejadian yang sama digabung menjadi satu "cerita" di semua halaman: satu judul tampil, media lain dicantumkan sebagai "juga di VIVA, Liputan6". Caranya ada di `kelompokkan()` dalam `scripts/lib/olah.mjs`:

- Judul dan cuplikan dibandingkan dengan bobot TF-IDF: kata yang jarang muncul (nama pemain, skor, merek) menentukan, kata umum ("Timnas", "Asian Games") hampir tidak berpengaruh.
- Berita pra-laga (jadwal, live streaming) tidak digabung dengan hasil laga, dan "Indonesia vs Nepal" tidak digabung dengan "Indonesia vs Jepang".
- Penggabungan dihitung sekali untuk 14 hari terakhir, jadi cerita yang melintasi tengah malam tidak muncul dua kali.

Batasnya: cara ini membandingkan kata, bukan makna. Dua judul yang memakai istilah berbeda untuk kejadian yang sama bisa lolos; untuk itu ada daftar sinonim.

### Pengaturan

Semua pengaturan ada di `laju.config.mjs` bagian `duplikat`:

| Pengaturan | Bawaan | Fungsi |
|---|---|---|
| `aktif` | `true` | `false` = semua berita tampil apa adanya, tanpa digabung |
| `ambang` | `0.5` | Kemiripan minimum (0–1). Lebih tinggi = lebih jarang menggabung |
| `ambangRataRata` | `0.4` | Mencegah satu cerita melebar menjadi topik umum |
| `jendelaJam` | `48` | Hanya berita yang terbit berdekatan yang dibandingkan |
| `hariDiperiksa` | `14` | Rentang hari yang digabung untuk semua halaman |
| `bobotJudul`, `bobotCuplikan` | `2`, `1` | Seberapa menentukan judul dibanding cuplikan |
| `pisahkanPraDanHasil`, `kataPraLaga`, `kataHasilLaga` | aktif | Jadwal/siaran langsung tidak digabung dengan hasil laga |
| `pisahkanLawanBerbeda` | `true` | "Indonesia vs Nepal" tidak digabung dengan "vs Jepang" |
| `sinonim` | 7 kelompok | Istilah yang artinya sama, mis. `['buang air besar', 'cepirit']` |

### Memeriksa hasilnya

```bash
npm run cek-duplikat
```

Laporan ini tidak mengubah apa pun. Isinya: jumlah berita yang digabung, cerita gabungan terbesar beserta anggotanya, dan pasangan berita yang mirip tetapi tidak digabung beserta alasannya ("di bawah ambang", "pra-laga vs hasil", "lawan tanding berbeda"). Tambahkan tanggal untuk memeriksa hari tertentu (`npm run cek-duplikat -- 2026-09-18`), atau `--semua` untuk daftar lengkap.

- Cerita gabungan berisi berita yang ternyata berbeda: naikkan `ambang` atau `ambangRataRata`.
- Berita yang sama muncul "di bawah ambang" karena beda istilah: tambahkan ke `sinonim`.

## Catatan

- Folder ini ada di OneDrive. Menjalankan `npm install` membuat folder `node_modules` berisi ratusan berkas yang ikut disinkronkan. Folder itu hanya dibutuhkan untuk Ringkasan Pagi di komputer sendiri. Di GitHub, pemasangan terjadi otomatis.
- Sumber yang dipakai (18 September 2026): Liputan6, VIVA, Jawa Pos, Okezone, Republika, dan 8 kanal ANTARA, 17 kanal secara total.
- Tidak dipakai: CNN Indonesia, CNBC Indonesia, dan detik memblokir server GitHub walau lancar dibuka dari komputer biasa. RSS Tempo dan ANTARA Olahraga (umum) jarang diperbarui.
- Sebelum menambah sumber baru, uji dulu dari server GitHub: **Actions → Uji sumber → Run workflow**, isi URL RSS-nya (pisahkan dengan spasi). Hasilnya tersimpan di `data/uji-sumber.json`.
- Periksa ketentuan penggunaan tiap media sebelum situs dipromosikan untuk umum.
