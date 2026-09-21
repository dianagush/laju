// Interaksi kecil di sisi pembaca: mode gelap, saring lajur, dan pencarian.

(function () {
  var akar = document.documentElement;

  // ---- Mode gelap / terang ----
  function temaSekarang() {
    if (akar.dataset.theme) return akar.dataset.theme;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  function perbaruiTombolTema() {
    var gelap = temaSekarang() === 'dark';
    document.querySelectorAll('[data-tema]').forEach(function (b) {
      b.setAttribute('aria-pressed', gelap ? 'true' : 'false');
      var teks = b.querySelector('[data-tema-teks]');
      if (teks) teks.textContent = gelap ? 'Mode terang' : 'Mode gelap';
    });
  }
  document.querySelectorAll('[data-tema]').forEach(function (b) {
    b.addEventListener('click', function () {
      var berikut = temaSekarang() === 'dark' ? 'light' : 'dark';
      akar.dataset.theme = berikut;
      try { localStorage.setItem('laju-tema', berikut); } catch (e) { /* penyimpanan diblokir: tema berlaku sampai halaman ditutup */ }
      perbaruiTombolTema();
    });
  });
  perbaruiTombolTema();

  // ---- Saring daftar "Terbaru" per lajur ----
  document.querySelectorAll('[data-saring]').forEach(function (grup) {
    var daftar = document.getElementById(grup.getAttribute('data-saring'));
    var hitung = document.querySelector('[data-hitung="' + grup.getAttribute('data-saring') + '"]');
    if (!daftar) return;
    grup.querySelectorAll('button').forEach(function (tombol) {
      tombol.addEventListener('click', function () {
        var pilih = tombol.value;
        grup.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', b === tombol ? 'true' : 'false'); });
        var tampil = 0;
        daftar.querySelectorAll('[data-lajur]').forEach(function (baris) {
          var cocok = pilih === 'semua'
            ? baris.getAttribute('data-semua') !== 'tidak'
            : baris.getAttribute('data-lajur') === pilih;
          baris.hidden = !cocok;
          if (cocok) tampil += 1;
        });
        if (hitung) hitung.textContent = tampil + ' berita';
      });
    });
  });

  // ---- Tombol liga di blok skor ----
  document.querySelectorAll('[data-tab-skor]').forEach(function (grup) {
    var tombol = grup.querySelectorAll('button');
    function pilih(t) {
      tombol.forEach(function (b) {
        var aktif = b === t;
        b.setAttribute('aria-pressed', aktif ? 'true' : 'false');
        var panel = document.getElementById(b.getAttribute('aria-controls'));
        if (panel) panel.hidden = !aktif;
      });
    }
    tombol.forEach(function (t) {
      t.addEventListener('click', function () {
        pilih(t);
        try { localStorage.setItem('laju-liga', t.value); } catch (e) { /* tanpa penyimpanan: pilihan tidak diingat */ }
      });
    });
    // Ingat liga terakhir yang dipilih pembaca.
    try {
      var simpan = localStorage.getItem('laju-liga');
      tombol.forEach(function (b) { if (b.value === simpan) pilih(b); });
    } catch (e) { /* abaikan */ }
  });

  // ---- Pencarian (halaman cari.html) ----
  var wadah = document.getElementById('hasil-cari');
  if (!wadah) return;
  var masukan = document.getElementById('kata-cari');
  var keterangan = document.getElementById('keterangan-cari');
  var q = new URLSearchParams(location.search).get('q') || '';
  masukan.value = q;

  function normal(s) {
    return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }
  function el(tag, kelas, teks) {
    var e = document.createElement(tag);
    if (kelas) e.className = kelas;
    if (teks != null) e.textContent = teks;
    return e;
  }

  fetch(wadah.getAttribute('data-sumber'))
    .then(function (r) { return r.json(); })
    .then(function (semua) {
      function jalankan() {
        var kata = normal(masukan.value).split(/\s+/).filter(Boolean);
        wadah.textContent = '';
        if (!kata.length) { keterangan.textContent = 'Ketik kata kunci, misalnya nama tim, pemain, atau merek gawai.'; return; }
        var hasil = semua.filter(function (b) {
          var t = normal(b.judul + ' ' + b.sumber + ' ' + (b.juga || []).join(' '));
          return kata.every(function (k) { return t.indexOf(k) !== -1; });
        });
        keterangan.textContent = hasil.length
          ? hasil.length + ' berita cocok dengan “' + masukan.value.trim() + '” dalam 14 hari terakhir.'
          : 'Tidak ada berita yang cocok dengan “' + masukan.value.trim() + '”. Coba kata yang lebih umum.';
        hasil.slice(0, 100).forEach(function (b) {
          var a = el('a', 'baris l-' + b.lajur);
          a.href = b.tautan;
          a.target = '_blank';
          a.rel = 'noopener';
          a.appendChild(el('span', 'baris-waktu', b.waktu));
          a.appendChild(el('span', 'chip', b.lajur === 'tekno' ? 'Teknologi' : 'Olahraga'));
          var teks = el('span', 'baris-teks');
          teks.appendChild(el('span', 'baris-judul', b.judul));
          teks.appendChild(el('span', 'baris-asal', b.sumber + (b.juga && b.juga.length ? ' · juga di ' + b.juga.join(', ') : '')));
          a.appendChild(teks);
          wadah.appendChild(a);
        });
      }
      document.getElementById('form-cari').addEventListener('submit', function (e) {
        e.preventDefault();
        history.replaceState(null, '', '?q=' + encodeURIComponent(masukan.value.trim()));
        jalankan();
      });
      jalankan();
    })
    .catch(function () {
      keterangan.textContent = 'Data pencarian gagal dimuat. Muat ulang halaman untuk mencoba lagi.';
    });
})();
