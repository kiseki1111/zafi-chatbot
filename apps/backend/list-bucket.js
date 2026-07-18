const axios = require('axios');

async function listBucket() {
  const folders = ['Griya Amanah 2', 'Kahyana Residence', 'Seven Residence', 'Taman Green Light', 'Zafi Residence'];
  const base = 'https://bzexgkcgpzxqtbfixatj.supabase.co/storage/v1/object/list/gambar_produk_zafi';

  for (const f of folders) {
    try {
      const res = await axios.post(base, { prefix: f + '/', limit: 50 });
      console.log(`\n=== ${f} ===`);
      res.data.forEach(file => {
        if (file.name) {
          const sizeMB = file.metadata?.size ? (file.metadata.size / 1024 / 1024).toFixed(1) : '?';
          console.log(`  ${file.name} (${sizeMB} MB)`);
        }
      });
    } catch (e) {
      console.log(`${f}: ERROR ${e.response?.status || e.message}`);
    }
  }

  // Also test a direct download
  const testUrl = 'https://bzexgkcgpzxqtbfixatj.supabase.co/storage/v1/object/public/gambar_produk_zafi/Griya%20Amanah%202/Rumah%20Type%2036%20Griya2.png';
  try {
    const res = await axios.head(testUrl);
    console.log(`\n=== Direct URL Test ===`);
    console.log(`URL: ${testUrl}`);
    console.log(`Status: ${res.status}`);
    console.log(`Content-Type: ${res.headers['content-type']}`);
    console.log(`Content-Length: ${(parseInt(res.headers['content-length'] || '0') / 1024 / 1024).toFixed(1)} MB`);
  } catch (e) {
    console.log(`\nDirect URL Test FAILED: ${e.response?.status || e.message}`);
  }
}

listBucket();
