const axios = require('axios');

const base = 'https://bzexgkcgpzxqtbfixatj.supabase.co/storage/v1/object/public/gambar_produk_zafi';

// Berdasarkan screenshot: file di dalam subfolder
const candidates = [
  // Griya Amanah 2
  'Griya Amanah 2/Griya Amanah Type 40 & 45.png',
  'Griya Amanah 2/Griya Amanah Type 40 & 45.jpg',
  'Griya Amanah 2/Rumah Type 36 Griya2.png',
  // Zafi Residence
  'Zafi Residence/Zafi Residence.png',
  'Zafi Residence/Zafi Residence.jpg',
  'Zafi Residence/Rumah Type 36.png',
  'Zafi Residence/Zafi Residence Tipe 36.png',
  'Zafi Residence/Zafi Residence - Tipe 36 Subsidi.png',
  // Kahyana Residence
  'Kahyana Residence/Kahyana Residence.png',
  'Kahyana Residence/Kahyana Residence.jpg',
  'Kahyana Residence/Kahyana Residence Tipe 36.png',
  'Kahyana Residence/Rumah Type 36.png',
  // Seven Residence
  'Seven Residence/Seven Residence.png',
  'Seven Residence/Seven Residence.jpg',
  'Seven Residence/Seven Residence Tipe 45.png',
  // Taman Green Light
  'Taman Green Light/Taman Green Light.png',
  'Taman Green Light/Taman Green Light.jpg',
];

async function probe() {
  for (const path of candidates) {
    const url = `${base}/${encodeURI(path)}`;
    try {
      const res = await axios.head(url, { timeout: 5000 });
      const sizeMB = (parseInt(res.headers['content-length'] || '0') / 1024 / 1024).toFixed(1);
      console.log(`[OK] ${path}  (${sizeMB} MB)`);
    } catch {
      // silent
    }
  }
  console.log('\nDone probing.');
}

probe();
