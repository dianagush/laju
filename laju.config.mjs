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
  ],

  // Judul yang memuat kata ini dianggap di luar topik lajurnya lalu dibuang.
  // Contoh: kanal Teknologi CNN juga memuat berita cuaca BMKG.
  saring: {
    tekno: [
      'bmkg', 'cuaca', 'hujan', 'gempa', 'kemarau', 'banjir', 'longsor', 'karhutla', 'el nino',
      'kapal induk', 'ubur-ubur', 'badak', 'harimau', 'gajah', 'buaya', 'paus', 'kucing', 'spesies',
    ],
    olahraga: [],
  },
  // …kecuali judulnya juga memuat salah satu kata ini (mis. "drone untuk deteksi api karhutla").
  tetapSimpan: {
    tekno: ['teknologi', 'drone', 'satelit', 'robot', 'aplikasi', 'ai', 'chip', 'sensor', 'digital'],
    olahraga: [],
  },
};
