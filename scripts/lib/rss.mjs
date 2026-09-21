// Mengambil dan membaca feed RSS 2.0 / Atom tanpa pustaka tambahan.

const ENTITAS = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…', ndash: '–', mdash: '—', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”' };

export function dekodeEntitas(teks) {
  return teks.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (asli, kode) => {
    if (kode[0] === '#') {
      const n = kode[1].toLowerCase() === 'x' ? parseInt(kode.slice(2), 16) : parseInt(kode.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : asli;
    }
    return ENTITAS[kode.toLowerCase()] ?? asli;
  });
}

function buangCdata(teks) {
  return teks.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
}

// Isi mentah sebuah tag pertama (tanpa CDATA), atau ''.
function isiTag(xml, tag) {
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'i');
  const m = xml.match(re);
  return m ? buangCdata(m[1]).trim() : '';
}

// Nilai atribut dari tag pertama yang cocok.
function atributTag(xml, tag, atribut, syarat = () => true) {
  const re = new RegExp(`<${tag}\\b([^>]*)>`, 'gi');
  for (const m of xml.matchAll(re)) {
    const attrs = Object.fromEntries([...m[1].matchAll(/([\w:-]+)\s*=\s*"([^"]*)"|([\w:-]+)\s*=\s*'([^']*)'/g)].map((a) => [a[1] ?? a[3], a[2] ?? a[4]]));
    if (attrs[atribut] && syarat(attrs)) return dekodeEntitas(attrs[atribut]);
  }
  return '';
}

export function teksPolos(html) {
  // Beberapa feed mengirim HTML yang di-escape (&lt;img …&gt;); buka dulu sebelum tag dibuang.
  const html2 = /&lt;\/?[a-z]/i.test(html) ? dekodeEntitas(html) : html;
  return dekodeEntitas(html2.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function potong(teks, maks) {
  if (teks.length <= maks) return teks;
  const t = teks.slice(0, maks);
  return `${t.slice(0, t.lastIndexOf(' ') > maks * 0.6 ? t.lastIndexOf(' ') : maks).replace(/[\s,.;:]+$/, '')}…`;
}

function cariGambar(potongan, deskripsiMentah) {
  const enclosure = atributTag(potongan, 'enclosure', 'url', (a) => !a.type || a.type.startsWith('image'));
  if (enclosure) return enclosure;
  const media = atributTag(potongan, 'media:content', 'url', (a) => !a.medium || a.medium === 'image') || atributTag(potongan, 'media:thumbnail', 'url');
  if (media) return media;
  const img = dekodeEntitas(deskripsiMentah).match(/<img[^>]+src\s*=\s*["']([^"']+)["']/i);
  return img ? img[1] : '';
}

// Label kategori dari media: <category>AI</category> (RSS) atau <category term="AI"/> (Atom).
function kategoriSumber(potongan) {
  const hasil = [];
  for (const m of potongan.matchAll(/<category\b([^>]*?)(?:\/>|>([\s\S]*?)<\/category>)/gi)) {
    const term = m[1].match(/term\s*=\s*"([^"]*)"/i)?.[1];
    const teks = teksPolos(buangCdata(term ?? m[2] ?? ''));
    if (teks && !hasil.includes(teks)) hasil.push(teks);
  }
  return hasil.slice(0, 10);
}

export function bacaFeed(xml) {
  const adalahAtom = /<feed[\s>]/i.test(xml) && !/<rss[\s>]/i.test(xml);
  const pola = adalahAtom ? /<entry[\s>][\s\S]*?<\/entry>/gi : /<item[\s>][\s\S]*?<\/item>/gi;
  const hasil = [];
  for (const [potongan] of xml.matchAll(pola)) {
    const judul = teksPolos(isiTag(potongan, 'title'));
    let tautan = adalahAtom
      ? atributTag(potongan, 'link', 'href', (a) => !a.rel || a.rel === 'alternate')
      : teksPolos(isiTag(potongan, 'link'));
    if (!tautan) tautan = teksPolos(isiTag(potongan, 'guid'));
    const waktuMentah = isiTag(potongan, 'pubDate') || isiTag(potongan, 'published') || isiTag(potongan, 'updated') || isiTag(potongan, 'dc:date');
    const terbit = new Date(waktuMentah);
    const deskripsiMentah = isiTag(potongan, 'description') || isiTag(potongan, 'summary') || isiTag(potongan, 'content:encoded') || isiTag(potongan, 'content');
    if (!judul || !/^https?:\/\//.test(tautan) || Number.isNaN(terbit.getTime())) continue;
    hasil.push({
      judul,
      tautan,
      terbit: terbit.toISOString(),
      // Buang dateline di awal cuplikan, mis. "REPUBLIKA.CO.ID, JAKARTA -- ".
      cuplikan: potong(teksPolos(deskripsiMentah).replace(/^[A-Z0-9.,()' ]{3,60}\s(?:--|—|–|-)\s+/, ''), 240),
      gambar: cariGambar(potongan, deskripsiMentah),
      kategori: kategoriSumber(potongan),
      // Teks RSS utuh (tidak disimpan); cadangan bahan ringkasan bila halaman artikel tak terbaca.
      teksLengkap: teksPolos(deskripsiMentah),
    });
  }
  return hasil;
}

function kenaliEncoding(contentType, awalBerkas) {
  const dariHeader = contentType.match(/charset=["']?([\w-]+)/i);
  if (dariHeader) return dariHeader[1].toLowerCase();
  const dariXml = awalBerkas.match(/encoding=["']([\w-]+)["']/i);
  return dariXml ? dariXml[1].toLowerCase() : 'utf-8';
}

export async function ambilFeed(url, { batasWaktuMs = 20000 } = {}) {
  let res;
  try {
    res = await fetch(url, {
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; LAJU-pembaca-RSS/1.0)',
        accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.5',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(batasWaktuMs),
    });
  } catch (err) {
    if (err.name === 'TimeoutError') throw new Error('Tidak merespons (batas waktu habis)');
    throw new Error(`Koneksi gagal${err.cause?.code ? ` (${err.cause.code})` : ''}`);
  }
  if (res.status === 403) throw new Error('HTTP 403 (akses ditolak media)');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  const encoding = kenaliEncoding(res.headers.get('content-type') || '', buffer.subarray(0, 300).toString('latin1'));
  let xml;
  try {
    xml = new TextDecoder(encoding).decode(buffer);
  } catch {
    xml = new TextDecoder('utf-8').decode(buffer);
  }
  return bacaFeed(xml);
}
