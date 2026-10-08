# LAJU

Portal berita teknologi dan olahraga yang memperbarui dirinya sendiri. LAJU membaca RSS resmi media Indonesia tiga kali sehari, membuang berita yang di luar topik, mengelompokkan berita yang membahas cerita yang sama, lalu menerbitkan situs statis. Setiap pagi, AI bisa menulis **Ringkasan Pagi**: 5 poin per lajur, masing-masing dengan tautan ke sumbernya.

LAJU hanya menampilkan judul, cuplikan, gambar mini, nama sumber, dan waktu. Artikel lengkap selalu dibaca di situs aslinya.

## Menjalankan di komputer sendiri

Butuh [Node.js](https://nodejs.org) versi 20 atau lebih baru. Tidak perlu `npm install` kecuali kalau penyedia AI-nya diubah ke Claude.

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

Setelah itu, situs diperbarui sendiri pukul 08.00, 11.00, dan 15.00 WIB.

Jadwal gratis GitHub berprioritas rendah: pembaruan sering tertunda (pengamatan 25 September–8 Oktober 2026: kerap telat berjam-jam) dan sebagian dilewati sama sekali. Mencoba tiap jam tidak menolong: dari sekitar 13 jadwal sejak 7 Oktober siang hanya satu yang jalan (dan telat 5 jam). Jadwal bawaan GitHub hanya cocok sebagai jaring pengaman.

Jaring pengamannya: workflow dijadwalkan **tiap 30 menit** pukul 08.07–16.37 WIB, lalu langkah pertamanya (`scripts/perlu-perbarui.mjs`) memutuskan: pembaruan hanya dijalankan bila jarak dari pembaruan terakhir sudah melewati `jedaMinimalMenit` (bawaan 150 menit). Menjalankan lewat **Run workflow** selalu memperbarui tanpa menunggu jeda.

### Pemicu eksternal (yang andal)

Supaya pembaruan benar-benar pukul 08.00, 11.00, dan 15.00 WIB, minta layanan cron gratis di luar GitHub (mis. [cron-job.org](https://cron-job.org)) memanggil workflow tepat waktu. Layanan itu cukup mengirim satu permintaan HTTP:

1. Di GitHub: **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**. Pilih hanya repositori `laju`, izin **Actions: Read and write**, lalu salin tokennya. Token ini hanya bisa menjalankan workflow di repositori ini.
2. Di layanan cron, buat tiga jadwal (zona waktu Asia/Jakarta: 08.00, 11.00, 15.00) dengan isi:
   - URL: `https://api.github.com/repos/dianagush/laju/actions/workflows/perbarui.yml/dispatches`
   - Metode: `POST`
   - Header: `Accept: application/vnd.github+json`, `Authorization: Bearer TOKEN-KAMU`, `X-GitHub-Api-Version: 2022-11-28`
   - Isi (body): `{"ref":"main"}`
3. Balasan sukses adalah HTTP 204 tanpa isi. Pemicu ini diperlakukan seperti **Run workflow**, jadi selalu memperbarui tanpa menunggu jeda.

Jangan menaruh token itu di repositori atau di chat. Jadwal bawaan GitHub boleh dibiarkan: bila pemicu eksternal sudah memperbarui, jadwal GitHub otomatis dilewati oleh jeda minimal.

### Pemicu lokal (tugas terjadwal Windows)

Alternatif tanpa akun dan tanpa token baru, tetapi hanya jalan saat PC menyala dan kamu login. Tugas terjadwal mengecek tiap 30 menit (08.00–23.00) dan saat login: bila sebuah jam di `jamPembaruan` sudah lewat dan belum ada pembaruan sesudahnya (dari mana pun), ia mendorong satu commit kecil yang mengubah `pemicu.txt` ke GitHub. Push itu menjalankan workflow seperti **Run workflow**. (Commit yang benar-benar kosong tidak dipakai karena tidak memicu workflow: aturan `paths-ignore` menganggapnya tanpa berkas yang berubah.) Karena yang dihitung adalah pembaruan terakhir di `data/status.json`, pemicu ini tidak pernah menghasilkan pembaruan ganda bersama jadwal GitHub atau pemicu eksternal.

```powershell
powershell -ExecutionPolicy Bypass -File scripts\pasang-pemicu-lokal.ps1
```

Pemasang membuat salinan khusus repositori di `%USERPROFILE%\laju-pemicu` (di luar OneDrive dan di luar folder kerja) dan tugas **LAJU pemicu pembaruan**. Folder itu sengaja bukan di `AppData`: aplikasi berpaket seperti aplikasi desktop Claude mengalihkan penulisan `AppData` ke folder paketnya, sehingga Penjadwal Tugas tidak melihat berkasnya. Skripnya menolak berjalan di folder yang kotor, jadi folder kerjamu aman. Mencopot: tambahkan `-Copot`.

Bila login GitHub kedaluwarsa atau dicabut, push ditolak. Skrip lalu menampilkan notifikasi Windows dan membuka halaman masuk GitHub di browser lewat Git Credential Manager; setelah kamu masuk, push diulang otomatis. Halaman masuk dibuka paling sering sekali per 4 jam. Putusnya jaringan tidak dianggap login kedaluwarsa: skrip cukup mencoba lagi 30 menit kemudian.

```bash
node scripts/pemicu-lokal.mjs --uji      # tampilkan keputusan saja
node scripts/pemicu-lokal.mjs --paksa    # picu sekarang
node scripts/pemicu-lokal.mjs --login    # buka halaman masuk GitHub sekarang
```

Log dan keadaan terakhir ada di `.laju/pemicu.log` dan `.laju/pemicu.json` pada salinan khusus itu. Skrip ini tidak memanggil Claude atau AI mana pun.

Kalau langkah "Simpan data ke repositori" gagal karena izin, buka **Settings → Actions → General → Workflow permissions** dan pilih **Read and write permissions**.

## Mengaktifkan Ringkasan Pagi (AI)

Tanpa kunci API, situs tetap jalan dan menampilkan **Sorotan**, yaitu cerita yang paling banyak diliput. Untuk ringkasan tulisan AI cukup satu kunci: kunci yang sama dipakai Ringkasan Pagi dan [ringkasan AI berita utama](#ringkasan-ai-berita-utama).

Gratis, dengan Gemini (bawaan):

1. Buka [Google AI Studio](https://aistudio.google.com/apikey), masuk dengan akun Google, lalu **Create API key**.
2. Di repositori GitHub: **Settings → Secrets and variables → Actions → New repository secret**. Nama: `GEMINI_API_KEY`, isi: kuncinya.

Ringkasan dibuat sekali sehari pada pembaruan pertama setelah pukul 08.00 WIB (`jamRingkasan`). Poin tanpa tautan sumber yang sah dibuang otomatis sebelum terbit.

Pindah ke Claude (berbayar): ubah `penyedia` menjadi `'claude'` di bagian `ai` pada `laju.config.mjs`, buat kunci di [console.anthropic.com](https://console.anthropic.com), lalu isi secret `ANTHROPIC_API_KEY`. Satu Ringkasan Pagi membaca sekitar 10 ribu token dan menulis beberapa ribu token; perkiraan kasarnya US$0,10–0,20 per hari.

Untuk mencoba di komputer sendiri (PowerShell):

```powershell
$env:GEMINI_API_KEY="kunci-kamu"; npm run ringkasan -- --paksa; npm run bangun
```

Pengaturan Ringkasan Pagi ada di `laju.config.mjs` bagian `ringkasanPagi`: `aktif`, `poinPerLajur` (bawaan 5), dan `kandidatPerLajur` (berapa cerita teratas per lajur yang disodorkan ke AI).

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
scripts/ringkasan.mjs    langkah 5: Ringkasan Pagi dengan AI (Gemini atau Claude)
scripts/bangun.mjs       langkah 6: bangun situs statis ke dist/
scripts/ringkas-berita.mjs ringkasan AI satu paragraf untuk berita utama
scripts/lihat.mjs        pratinjau lokal
scripts/lib/             pembaca RSS, pengelompokan berita, waktu WIB, template HTML, penghubung AI
public/                  CSS, JavaScript, ikon
data/berita/             arsip berita per hari (diisi otomatis)
data/ringkasan/          Ringkasan Pagi per hari (diisi otomatis)
.github/workflows/       jadwal otomatis GitHub Actions
```

## Ringkasan AI berita utama

Kartu utama dan tiga berita di bawahnya (tiap lajur, termasuk Global) bisa diberi **satu paragraf ringkasan** yang ditulis AI dari isi artikel, berlabel "Ringkasan AI". Berita Global diringkas dalam bahasa Indonesia. Hanya berita yang belum punya ringkasan yang dikirim ke AI; hasilnya disimpan di `data/ringkasan-berita.json`.

Kuncinya sama dengan Ringkasan Pagi (`GEMINI_API_KEY`, atau `ANTHROPIC_API_KEY` bila `ai.penyedia` diubah ke `'claude'`), jadi sekali dipasang, kedua fitur langsung jalan.

Catatan:

- Kuota gratis Gemini dibatasi per hari; setiap pembaruan paling banyak meminta 12 ringkasan (`maksPerPembaruan`). Bila kuota habis, sisa berita diringkas pada pembaruan berikutnya dan sementara tampil dengan cuplikan biasa.
- Di kuota gratis, teks yang dikirim dipakai Google untuk mengembangkan produknya. Yang dikirim hanya teks artikel berita publik.
- Teks artikel diambil dari halaman berita (atau dari RSS bila halaman tidak terbaca, mis. Ars Technica). Berita berbayar seperti The New York Times dilewati.
- Penyedia dan modelnya diatur di bagian `ai`; sisa pengaturan fitur ini (`beritaPerLajur`, `maksPerPembaruan`, `jedaDetik`, `maksKata`) di bagian `ringkasanBerita`.

## Kategori berita

Halaman **Global** punya tombol kategori: AI, Keamanan & Privasi, Kebijakan & Hukum, Kendaraan & Transportasi, Sains & Antariksa, Game & Hiburan, Bisnis & Startup, Gawai & Ulasan, dan Lainnya. Setiap berita masuk satu kategori, ditentukan dari kata di judul (bobot 3), label kategori yang diberikan media di RSS-nya (bobot 2, mis. "AI" dari The Guardian atau "Gear / Reviews" dari WIRED), dan cuplikan (bobot 1).

- Daftar kategori dan kata kuncinya ada di `laju.config.mjs` bagian `kategori`. Urutan menentukan pemenang bila skornya sama.
- Berita yang salah kategori: tambahkan kata khasnya ke kategori yang benar. Berita di "Lainnya": tambahkan kata yang sering muncul di judulnya.
- Lajur lain juga bisa diberi kategori dengan menambahkan daftar untuk lajur itu (mis. `kategori.olahraga`).

## Skor sepak bola

Skor **matchday terakhir** 5 liga teratas Eropa (Liga Inggris, LaLiga, Serie A, Bundesliga, Ligue 1) tampil di beranda, di halaman Olahraga, dan kelimanya sekaligus di halaman **Skor**. Bila matchday itu belum selesai, laga yang belum dimainkan ikut tampil dengan jam mulainya. Datanya diambil `scripts/ambil-skor.mjs` dari papan skor ESPN pada jadwal pembaruan yang sama dan disimpan di `data/skor.json`.

- ESPN tidak menyertakan nomor pekan, jadi matchday disusun dari jadwal: dimulai dari laga terakhir yang sudah dimainkan, lalu diperluas selama tidak ada tim yang bermain dua kali dan tidak ada jeda lebih dari 60 jam. Laga susulan yang dimainkan sendirian di tengah minggu tidak dianggap matchday baru.

- Tidak perlu kunci API. Papan skor ESPN ini tidak resmi, jadi formatnya bisa berubah; kalau gagal diambil, data terakhir tetap dipakai dan Actions menampilkan peringatan.
- Skor pertandingan yang sedang berlangsung tidak real-time: hanya seakurat pembaruan terakhir. Laga Eropa umumnya selesai sebelum pagi WIB, jadi hasil lengkapnya tampil pada pembaruan pukul 08.00.
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

- Folder ini ada di OneDrive. Menjalankan `npm install` membuat folder `node_modules` berisi ratusan berkas yang ikut disinkronkan. Folder itu hanya dibutuhkan bila penyedia AI-nya Claude (paket `@anthropic-ai/sdk`); dengan Gemini, LAJU jalan tanpa paket tambahan. Di GitHub, pemasangan terjadi otomatis.
- Sumber yang dipakai: Liputan6, VIVA, Jawa Pos, Okezone, Republika, dan 8 kanal ANTARA (17 kanal) untuk lajur Teknologi dan Olahraga.
- Halaman **Global** (`global.html`) berisi berita teknologi dari media luar negeri: BBC News, The Guardian, The New York Times, Ars Technica, The Verge, TechCrunch, WIRED, MIT Technology Review, dan Engadget, dalam bahasa aslinya (Inggris). Lajur ini ditandai `terpisah: true` di `laju.config.mjs`, jadi tidak ikut beranda, daftar Terbaru, topik hangat, Ringkasan Pagi, maupun arsip; beritanya tetap bisa dicari. Iklan dan kupon di feed mereka ("Promo Codes", "Deals") dibuang lewat `saring.global`.
- Tidak dipakai: CNN Indonesia, CNBC Indonesia, dan detik memblokir server GitHub walau lancar dibuka dari komputer biasa. RSS Tempo dan ANTARA Olahraga (umum) jarang diperbarui.
- Sebelum menambah sumber baru, uji dulu dari server GitHub: **Actions → Uji sumber → Run workflow**, isi URL RSS-nya (pisahkan dengan spasi). Hasilnya tersimpan di `data/uji-sumber.json`.
- Periksa ketentuan penggunaan tiap media sebelum situs dipromosikan untuk umum.
