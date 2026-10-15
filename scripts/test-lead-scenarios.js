const fs = require('fs');
const path = require('path');
const OpenAI = require(path.join(__dirname, '../apps/backend/node_modules/openai'));

// Parse .env manually
const envPath = path.join(__dirname, '../apps/backend/.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        process.env[key] = val;
      }
    }
  });
}

const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENROUTER_API_KEY ? 'https://openrouter.ai/api/v1' : undefined,
});

const DEFAULT_SYSTEM_PROMPT = `Anda adalah Customer Service bernama Luna dari toko Zafi Properti Land. Tugas Anda adalah melayani pelanggan terkait produk dan layanan kami.
Gaya bahasa Anda: ramah, sopan, dan profesional.
Waktu saat ini: 15/10/2026, 14:00. Jam Operasional Toko: Setiap Hari 08:00 - 20:00. Alamat Toko: Jl. Ahmad Yani No. 12, Pontianak.
Berikan jawaban yang natural seperti CS manusia sungguhan. Jangan menggunakan bahasa kaku atau gaya bahasa AI.

=== DATABASE PERUMAHAN & UNIT TERSEDIA (REAL-TIME) ===
* Griya Amanah 2:
  - Tipe 40/84: Harga Rp 295.000.000 [Status: UNIT READY (Tersedia)]
  - Tipe 36/72: Harga Rp 192.800.000 [Status: UNIT READY (Tersedia)]
* Zafi Residence:
  - Tipe 36/72: Harga Rp 192.800.000 [Status: UNIT READY (Tersedia)]
  - Tipe 45/90: Harga Rp 260.000.000 [Status: UNIT READY (Tersedia)]
* Kahyana Residence:
  - Tipe 36/72: Harga Rp 187.800.000 [Status: UNIT READY (Tersedia)]
  - Tipe 40/80: Harga Rp 245.000.000 [Status: UNIT READY (Tersedia)]
======================================================

ATURAN IDENTIFIKASI PROSPEK (LEAD PROFILING BERTAHAP):
Pelanggan biasanya mengobrol santai dan informasi mereka terungkap bertahap di sepanjang percakapan.
Anda WAJIB menganalisis SELURUH riwayat chat + pesan saat ini untuk mengekstrak data prospek pada property "lead".

Aturan Akurasi Ekstraksi:
1. customerName:
   - Jika pelanggan pernah menyebutkan nama mereka di percakapan (contoh: "saya Budi", "nama saya Hendra Wijaya", "dengan Ibu Rini", "panggil saya Joko"), ekstrak nama tersebut.
   - JIKA PELANGGAN BELUM MENYEBUTKAN NAMA di sepanjang percakapan, ISI "Anonim".
   - DILARANG menggunakan nama Anda ('Luna') atau nomor telepon.
2. perumahan:
   - Nama cluster/perumahan dari database yang diminati/dibahas pelanggan (contoh: 'Griya Amanah 2', 'Zafi Residence', 'Kahyana Residence').
   - Jika sudah pernah dibahas di riwayat pesan sebelumnya, TETAP PERTAHANKAN nama perumahan tersebut meskipun pesan terbaru sedang membahas hal lain. Jika belum dibahas sama sekali, isi null.
3. tipeUnit:
   - Tipe unit yang diminati (contoh: 'Tipe 36', 'Tipe 40', 'Tipe 45'). Pertahankan dari riwayat jika sudah pernah ditentukan. Jika belum ada, isi null.
4. hargaUnit:
   - Angka nominal rupiah harga unit yang sedang dibahas berdasarkan database (contoh: 192800000, 295000000). Jika belum ada harga pasti, isi null.
5. status (Fase Prospek Saat Ini):
   - 'Follow-Up': Customer masih bertanya-tanya santai, konsultasi lokasi, minta brosur, atau cek perbandingan tipe rumah.
   - 'SLIK': Customer mulai membahas kelayakan finansial, syarat pengajuan KPR, BI Checking / SLIK OJK, slip gaji, kemampuan angsuran, atau tenor cicilan bank.
   - 'Survey': Customer menyatakan ingin cek fisik ke lapangan, tanya jadwal lihat unit, minta diantar marketing ke perumahan, atau atur janji survey.
   - 'Booking': Customer ingin mengunci kavling/nomor unit tertentu, menanyakan nomor rekening transfer DP/tanda jadi, atau menyatakan fix pesan unit.
   - 'Closing': Customer sudah mengonfirmasi transfer pembayaran DP / lunas / tanda tangan akad jual beli.
   - 'Batal': Customer menyatakan batal, tidak jadi ambil, atau merasa tidak cocok.
6. notes:
   - Rangkuman padat 1-2 kalimat berisi poin-poin penting kebutuhan pelanggan yang terungkap selama ini (pekerjaan/penghasilan, preferensi cara bayar KPR/tempo, kondisi keluarga, kendala SLIK, atau tanggal rencana survey).

Format property "lead":
{
  "customerName": "Anonim", // atau nama asli jika sudah disebutkan
  "perumahan": "Griya Amanah 2",
  "tipeUnit": "Tipe 40",
  "hargaUnit": 295000000,
  "status": "Follow-Up",
  "notes": "Rangkuman padat preferensi dan kebutuhan customer"
}

WAJIB MERESPON DALAM FORMAT JSON BERIKUT:
{
  "text": "Balasan teks untuk pelanggan",
  "lead": {
    "customerName": "Anonim",
    "perumahan": "Griya Amanah 2",
    "tipeUnit": "Tipe 40",
    "hargaUnit": 295000000,
    "status": "Follow-Up",
    "notes": "Rangkuman preferensi prospek"
  }
}`;

// Simulasi Alur Percakapan Bertahap (Multi-Turn Conversational Meandering)
const multiTurnStory = [
  {
    turn: 1,
    desc: "Customer tanya santai pembuka (Belum sebut nama, baru tanya area)",
    userMsg: "Halo selamat siang kak, mau tanya-tanya dulu dong tentang rumah yang lokasinya asri di daerah Kubu Raya",
    expectedName: "Anonim",
    expectedStatus: "Follow-Up",
  },
  {
    turn: 2,
    desc: "Customer mulai mengerucut ke perumahan Griya Amanah 2",
    userMsg: "Kalau yang Griya Amanah 2 itu lokasinya sebelah mana ya kak? Dekat fasilitas umum nggak?",
    expectedName: "Anonim",
    expectedPerumahan: "Griya Amanah 2",
    expectedStatus: "Follow-Up",
  },
  {
    turn: 3,
    desc: "Customer menanyakan tipe unit dan harga spesifik",
    userMsg: "Di Griya Amanah 2 yang tipe 40 harganya berapaan ya kak? Sama ada sisa tanah belakangnya nggak?",
    expectedName: "Anonim",
    expectedPerumahan: "Griya Amanah 2",
    expectedType: "Tipe 40",
    expectedStatus: "Follow-Up",
  },
  {
    turn: 4,
    desc: "Customer merambat curhat soal pekerjaan & kendala KPR bank (Status harus switch ke SLIK)",
    userMsg: "Saya kerja wirausaha jualan baju online kak, belum ada PT/CV atau slip gaji formal tapi tabungan ada. Kira-kira kalau mau KPR bank apakah dibantu proses berkas dan cek SLIK OJK-nya?",
    expectedName: "Anonim",
    expectedPerumahan: "Griya Amanah 2",
    expectedType: "Tipe 40",
    expectedStatus: "SLIK",
  },
  {
    turn: 5,
    desc: "Customer ingin cek fisik ke lokasi (Status harus switch ke Survey)",
    userMsg: "Boleh deh kak saya mau survey lokasi langsung, hari Sabtu besok jam 10 pagi ada orang di kantor pemasaran perumahannya?",
    expectedName: "Anonim",
    expectedPerumahan: "Griya Amanah 2",
    expectedType: "Tipe 40",
    expectedStatus: "Survey",
  },
  {
    turn: 6,
    desc: "Customer baru memperkenalkan namanya di turn terakhir (Nama harus update dari Anonim ke nama asli)",
    userMsg: "Oh ya hampir lupa, kenalkan nama saya Dimas Prakoso ya kak. Nanti pas sampai di lokasi saya kabari lagi.",
    expectedName: "Dimas Prakoso",
    expectedPerumahan: "Griya Amanah 2",
    expectedType: "Tipe 40",
    expectedStatus: "Survey",
  },
];

async function runMultiTurnSimulation() {
  console.log("======================================================================");
  console.log("SIMULASI MULTI-TURN: PERCAKAPAN MERAMBAT SECARA REALISTIS (6 TURNS)");
  console.log("Memverifikasi: Nama Anonim diawal -> Ekstraksi Intent & Status -> Nama Terupdate di Akhir");
  console.log("======================================================================\n");

  const conversationHistory = [];
  let allPassed = true;

  for (const step of multiTurnStory) {
    console.log(`----------------------------------------------------------------------`);
    console.log(`👉 [TURN ${step.turn}] ${step.desc}`);
    console.log(`💬 Customer: "${step.userMsg}"`);

    const fullPrompt = `Riwayat Chat Sebelumnya:\n${conversationHistory.join("\n") || "(Belum ada riwayat)"}\n\nPesan Masuk Customer Saat Ini:\n"${step.userMsg}"\n\nBalas dalam format JSON yang diminta.`;

    try {
      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "deepseek/deepseek-v4-flash-0731",
        messages: [
          { role: "system", content: DEFAULT_SYSTEM_PROMPT },
          { role: "user", content: fullPrompt },
        ],
        temperature: 0.2,
        response_format: { type: "json_object" },
      });

      const raw = completion.choices[0]?.message?.content;
      const parsed = JSON.parse(raw);
      const lead = parsed.lead;
      const botReply = parsed.text;

      // Simpan percakapan ke riwayat untuk turn berikutnya
      conversationHistory.push(`Customer: ${step.userMsg}`);
      conversationHistory.push(`CS: ${botReply}`);

      console.log(`🤖 CS: "${botReply}"`);
      console.log(`\n📋 Lead Ter-ekstrak:`, JSON.stringify(lead, null, 2));

      // Verifikasi kriteria tiap turn
      let turnPassed = true;
      const issues = [];

      if (step.expectedName && (!lead || !lead.customerName || !lead.customerName.toLowerCase().includes(step.expectedName.toLowerCase()))) {
        turnPassed = false;
        issues.push(`Nama salah: diharapkan '${step.expectedName}', didapat '${lead?.customerName}'`);
      }

      if (step.expectedStatus && (!lead || lead.status !== step.expectedStatus)) {
        turnPassed = false;
        issues.push(`Status salah: diharapkan '${step.expectedStatus}', didapat '${lead?.status}'`);
      }

      if (step.expectedPerumahan && (!lead || !lead.perumahan || !lead.perumahan.toLowerCase().includes(step.expectedPerumahan.toLowerCase()))) {
        turnPassed = false;
        issues.push(`Perumahan salah: diharapkan '${step.expectedPerumahan}', didapat '${lead?.perumahan}'`);
      }

      if (step.expectedType && (!lead || !lead.tipeUnit || !lead.tipeUnit.toLowerCase().includes(step.expectedType.toLowerCase()))) {
        turnPassed = false;
        issues.push(`Tipe unit salah: diharapkan '${step.expectedType}', didapat '${lead?.tipeUnit}'`);
      }

      if (turnPassed) {
        console.log(`✅ HASIL TURN ${step.turn}: PASSED`);
      } else {
        console.log(`❌ HASIL TURN ${step.turn}: FAILED -> ${issues.join(", ")}`);
        allPassed = false;
      }
    } catch (e) {
      console.error(`Error turn ${step.turn}:`, e.message);
      allPassed = false;
    }
  }

  console.log("\n======================================================================");
  if (allPassed) {
    console.log("🎉 SEMUA TURN BERHASIL SEMPURNA (100% ACCURACY)!");
    console.log("- Turn 1-5 nama tetap 'Anonim'");
    console.log("- Status bertransisi presisi: Follow-Up -> SLIK -> Survey");
    console.log("- Perumahan & Tipe Unit (Griya Amanah 2, Tipe 40) terakumulasi terus tanpa hilang");
    console.log("- Turn 6 nama otomatis terisi 'Dimas Prakoso'");
  } else {
    console.log("Ada turn yang belum sesuai target.");
  }
  console.log("======================================================================");
  process.exit(0);
}

runMultiTurnSimulation();
