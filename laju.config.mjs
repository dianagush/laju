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

  // Kanal RSS yang dipakai. Diuji aktif pada 18 September 2026.
  sumber: [
    { id: 'cnn-tekno', nama: 'CNN Indonesia', kanal: 'Teknologi', lajur: 'tekno', url: 'https://www.cnnindonesia.com/teknologi/rss' },
    { id: 'cnbc-tech', nama: 'CNBC Indonesia', kanal: 'Tech', lajur: 'tekno', url: 'https://www.cnbcindonesia.com/tech/rss' },
    { id: 'antara-tekno', nama: 'ANTARA', kanal: 'Tekno', lajur: 'tekno', url: 'https://www.antaranews.com/rss/tekno.xml' },
    { id: 'cnn-olahraga', nama: 'CNN Indonesia', kanal: 'Olahraga', lajur: 'olahraga', url: 'https://www.cnnindonesia.com/olahraga/rss' },
    { id: 'antara-bola', nama: 'ANTARA', kanal: 'Sepak Bola', lajur: 'olahraga', url: 'https://www.antaranews.com/rss/sepakbola.xml' },
    { id: 'antara-bulutangkis', nama: 'ANTARA', kanal: 'Bulu Tangkis', lajur: 'olahraga', url: 'https://www.antaranews.com/rss/olahraga-bulutangkis.xml' },
  ],

  // Judul yang memuat kata ini dianggap di luar topik lajurnya lalu dibuang.
  // Contoh: kanal Teknologi CNN juga memuat berita cuaca BMKG.
  saring: {
    tekno: [
      'bmkg', 'cuaca', 'hujan', 'gempa', 'kemarau', 'banjir', 'longsor', 'karhutla', 'el nino',
      'kapal induk', 'ubur-ubur', 'badak', 'harimau', 'gajah', 'buaya', 'paus',
    ],
    olahraga: [],
  },
  // …kecuali judulnya juga memuat salah satu kata ini (mis. "drone untuk deteksi api karhutla").
  tetapSimpan: {
    tekno: ['teknologi', 'drone', 'satelit', 'robot', 'aplikasi', 'ai', 'chip', 'sensor', 'digital'],
    olahraga: [],
  },
};
