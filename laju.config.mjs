// Pengaturan utama LAJU. Ubah file ini untuk menambah sumber, mengganti jadwal, atau menyaring kata.

export default {
  nama: 'LAJU',
  slogan: 'Kabar teknologi & olahraga, dua lajur, diperbarui tiap hari.',
  // Alamat situs setelah online, mis. 'https://namamu.github.io/laju/'. Dipakai untuk feed RSS LAJU.
  alamatSitus: 'https://dianagush.github.io/laju/',

  // Jam pembaruan (WIB). Harus sama dengan jadwal cron di .github/workflows/perbarui.yml.
  jamPembaruan: [6, 9, 12, 15, 18, 21],
  // Ringkasan Pagi dibuat pada pembaruan pertama setelah jam ini (WIB).
  jamRingkasan: 6,

  // Berita di beranda: hanya yang terbit dalam jendela ini.
  jendelaBerandaJam: 36,
  // Berita yang lebih tua dari ini tidak disimpan sama sekali.
  simpanMaksHari: 7,
  // Artikel lama yang diterbitkan ulang: dibuang jika tanggal di URL lebih tua sekian hari dari tanggal terbit.
  batasTerbitUlangHari: 3,

  lajur: {
    tekno: { nama: 'Teknologi', nomor: 1, halaman: 'teknologi.html' },
    olahraga: { nama: 'Olahraga', nomor: 2, halaman: 'olahraga.html' },
    // Halaman khusus berita teknologi dari media luar negeri (bahasa Inggris).
    // `terpisah: true` = tidak ikut beranda, daftar Terbaru, topik hangat, Ringkasan Pagi, dan arsip.
    global: {
      nama: 'Teknologi Global',
      namaPendek: 'Global',
      nomor: 3,
      halaman: 'global.html',
      terpisah: true,
      label: 'Media luar negeri',
      bahasa: 'en',
    },
  },

  // Kanal RSS yang dipakai. Semua diuji bisa dibaca dari server GitHub pada 18 September 2026
  // (Actions → Uji sumber). Tidak dipakai karena memblokir server GitHub walau lancar dari komputer biasa:
  // CNN Indonesia, CNBC Indonesia, dan detik (HTTP 403 / tidak merespons).
  // geserJam: koreksi untuk feed yang menulis jam WIB tetapi memberi label GMT.
  sumber: [
    { id: 'liputan6-tekno', nama: 'Liputan6', kanal: 'Tekno', lajur: 'tekno', url: 'https://feed.liputan6.com/rss/tekno' },
    { id: 'viva-digital', nama: 'VIVA', kanal: 'Digital', lajur: 'tekno', url: 'https://www.viva.co.id/get/digital' },
    { id: 'jawapos-tekno', nama: 'Jawa Pos', kanal: 'Teknologi', lajur: 'tekno', url: 'https://www.jawapos.com/rss/teknologi', geserJam: -7 },
    { id: 'okezone-techno', nama: 'Okezone', kanal: 'Techno', lajur: 'tekno', url: 'https://sindikasi.okezone.com/index.php/rss/16/RSS2.0' },
    { id: 'republika-tekno', nama: 'Republika', kanal: 'Tekno', lajur: 'tekno', url: 'https://www.republika.co.id/rss/tekno' },
    { id: 'antara-tekno', nama: 'ANTARA', kanal: 'Tekno', lajur: 'tekno', url: 'https://www.antaranews.com/rss/tekno.xml' },

    { id: 'liputan6-bola', nama: 'Liputan6', kanal: 'Bola', lajur: 'olahraga', url: 'https://feed.liputan6.com/rss/bola' },
    { id: 'viva-bola', nama: 'VIVA', kanal: 'Bola', lajur: 'olahraga', url: 'https://www.viva.co.id/get/bola' },
    { id: 'viva-sport', nama: 'VIVA', kanal: 'Sport', lajur: 'olahraga', url: 'https://www.viva.co.id/get/sport' },
    { id: 'okezone-sports', nama: 'Okezone', kanal: 'Sports', lajur: 'olahraga', url: 'https://sindikasi.okezone.com/index.php/rss/2/RSS2.0' },
    { id: 'antara-bola', nama: 'ANTARA', kanal: 'Sepak Bola', lajur: 'olahraga', url: 'https://www.antaranews.com/rss/sepakbola.xml' },
    { id: 'antara-liga-indonesia', nama: 'ANTARA', kanal: 'Liga Indonesia', lajur: 'olahraga', url: 'https://www.antaranews.com/rss/sepakbola-liga-indonesia.xml' },
    { id: 'antara-bola-dunia', nama: 'ANTARA', kanal: 'Sepak Bola Internasional', lajur: 'olahraga', url: 'https://www.antaranews.com/rss/sepakbola-internasional.xml' },
    { id: 'antara-aneka', nama: 'ANTARA', kanal: 'Aneka Olahraga', lajur: 'olahraga', url: 'https://www.antaranews.com/rss/olahraga-all-sport.xml' },
    { id: 'antara-bulutangkis', nama: 'ANTARA', kanal: 'Bulu Tangkis', lajur: 'olahraga', url: 'https://www.antaranews.com/rss/olahraga-bulutangkis.xml' },
    { id: 'antara-tenis', nama: 'ANTARA', kanal: 'Tenis', lajur: 'olahraga', url: 'https://www.antaranews.com/rss/olahraga-tenis.xml' },
    { id: 'antara-balap', nama: 'ANTARA', kanal: 'Balap', lajur: 'olahraga', url: 'https://www.antaranews.com/rss/olahraga-balap.xml' },

    // Teknologi Global: media internasional yang kredibel (diuji 21 September 2026).
    { id: 'bbc-tech', nama: 'BBC News', kanal: 'Technology', lajur: 'global', url: 'https://feeds.bbci.co.uk/news/technology/rss.xml' },
    { id: 'guardian-tech', nama: 'The Guardian', kanal: 'Technology', lajur: 'global', url: 'https://www.theguardian.com/uk/technology/rss' },
    { id: 'nyt-tech', nama: 'The New York Times', kanal: 'Technology', lajur: 'global', url: 'https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml' },
    { id: 'ars', nama: 'Ars Technica', kanal: 'Semua', lajur: 'global', url: 'https://feeds.arstechnica.com/arstechnica/index' },
    { id: 'verge', nama: 'The Verge', kanal: 'Semua', lajur: 'global', url: 'https://www.theverge.com/rss/index.xml' },
    { id: 'techcrunch', nama: 'TechCrunch', kanal: 'Semua', lajur: 'global', url: 'https://techcrunch.com/feed/' },
    { id: 'wired', nama: 'WIRED', kanal: 'Semua', lajur: 'global', url: 'https://www.wired.com/feed/rss' },
    { id: 'mit-tr', nama: 'MIT Technology Review', kanal: 'Semua', lajur: 'global', url: 'https://www.technologyreview.com/feed/' },
    { id: 'engadget', nama: 'Engadget', kanal: 'Semua', lajur: 'global', url: 'https://www.engadget.com/rss.xml' },
  ],

  // Judul yang memuat kata ini dianggap di luar topik lajurnya lalu dibuang.
  // Contoh: kanal Teknologi CNN juga memuat berita cuaca BMKG.
  saring: {
    tekno: [
      'bmkg', 'cuaca', 'hujan', 'gempa', 'kemarau', 'banjir', 'longsor', 'karhutla', 'el nino',
      'kapal induk', 'ubur-ubur', 'badak', 'harimau', 'gajah', 'buaya', 'paus', 'kucing', 'spesies',
    ],
    olahraga: [],
    // Iklan dan promosi yang ikut masuk feed media luar negeri.
    global: ['deals', 'save up to', 'promo code', 'coupon', 'discount code', 'sponsored', 'days left'],
  },
  // …kecuali judulnya juga memuat salah satu kata ini (mis. "drone untuk deteksi api karhutla").
  tetapSimpan: {
    tekno: ['teknologi', 'drone', 'satelit', 'robot', 'aplikasi', 'ai', 'chip', 'sensor', 'digital'],
    olahraga: [],
    global: [],
  },

  // Skor sepak bola 5 liga teratas Eropa. Data dari papan skor ESPN (tanpa kunci API;
  // tidak resmi, jadi bisa berubah sewaktu-waktu). Skor ikut diperbarui pada jadwal
  // pembaruan di atas, jadi pertandingan yang sedang berlangsung tidak real-time.
  skor: {
    aktif: true,
    liga: [
      { id: 'eng.1', nama: 'Liga Inggris' },
      { id: 'esp.1', nama: 'LaLiga' },
      { id: 'ita.1', nama: 'Serie A' },
      { id: 'ger.1', nama: 'Bundesliga' },
      { id: 'fra.1', nama: 'Ligue 1' },
    ],
    // Hasil pertandingan disimpan sekian hari ke belakang, jadwal ditampilkan sekian hari ke depan.
    hariKeBelakang: 7,
    hariKeDepan: 4,
  },

  // Pemeriksaan berita duplikat: berita yang sama dari media berbeda digabung menjadi satu
  // cerita ("VIVA · juga di Liputan6, ANTARA"). Setelah mengubah bagian ini, lihat efeknya
  // dengan `npm run cek-duplikat` sebelum di-push.
  duplikat: {
    // false = semua berita tampil apa adanya, tanpa digabung.
    aktif: true,

    // Kemiripan minimum (0–1) agar dua berita dianggap sama. Lebih tinggi = lebih jarang menggabung.
    // 0.5 diuji pada 372 berita 17–18 September 2026: di atasnya hampir selalu berita yang sama.
    ambang: 0.5,
    // Kemiripan rata-rata dengan semua anggota cerita. Mencegah satu cerita melebar menjadi
    // topik umum (mis. semua berita Asian Games). Lebih tinggi = cerita lebih sempit.
    ambangRataRata: 0.4,

    // Hanya berita yang terbit berdekatan yang dibandingkan (jam).
    jendelaJam: 48,
    // Penggabungan dihitung untuk sekian hari terakhir (beranda, halaman lajur, arsip, cari).
    hariDiperiksa: 14,

    // Bobot judul dan cuplikan saat dibandingkan. Judul lebih menentukan.
    bobotJudul: 2,
    bobotCuplikan: 1,

    // Jangan gabungkan berita pra-laga (jadwal, siaran langsung) dengan hasil laga,
    // walau membahas pertandingan yang sama.
    pisahkanPraDanHasil: true,
    kataPraLaga: ['jadwal', 'link', 'live', 'streaming', 'siaran langsung', 'prediksi', 'jelang', 'sedang berlangsung'],
    kataHasilLaga: [
      'hasil', 'menang', 'kalah', 'gebuk', 'hajar', 'bungkam', 'lumat', 'libas', 'tekuk', 'tumbang', 'digebuk',
      'hancurkan', 'bantai', 'klasemen', 'skor', 'lolos', 'tersingkir', 'perempat final', 'semifinal', 'usai',
    ],

    // Jangan gabungkan "Indonesia vs Nepal" dengan "Indonesia vs Jepang".
    pisahkanLawanBerbeda: true,

    // Kata atau frasa yang artinya sama; satu baris satu kelompok. Tambahkan di sini bila
    // `npm run cek-duplikat` menunjukkan berita yang sama lolos karena media memakai istilah berbeda.
    sinonim: [
      ['buang air besar', 'cepirit'],
      ['manchester city', 'man city'],
      ['manchester united', 'man united', 'mu'],
      ['kementerian komunikasi dan digital', 'komdigi'],
      ['bulu tangkis', 'bulutangkis', 'badminton'],
      ['sepak bola', 'sepakbola'],
      ['kecerdasan buatan', 'ai'],
    ],
  },
};
