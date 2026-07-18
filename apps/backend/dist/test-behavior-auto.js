"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const WEBHOOK_URL = 'http://localhost:3000/api/v1/waha/webhook';
const POLL_URL = 'http://localhost:3000/api/v1/waha/cli-poll';
const MOCK_SESSION = 'CLI_TEST_SESSION';
let senderCounter = 0;
const TEST_CASES = [
    { category: 'Typo', id: '1.1', question: 'rmah tipe 36 hrganya brp ya', behavior: 'Huruf vokal dihilangkan' },
    { category: 'Typo', id: '1.3', question: 'brp cicilannya perbulan utk rmh yg palig murah', behavior: 'Typo "palig" → "paling"' },
    { category: 'Typo', id: '1.5', question: 'rumha tipe 45 masih ada stok gak?', behavior: 'Huruf terbalik "rumha"' },
    { category: 'Singkatan', id: '2.3', question: 'gmn cranya klo mw ambil KPR?', behavior: '"gmn" "cranya" "klo" "mw"' },
    { category: 'Singkatan', id: '2.9', question: 'lok nya dmn ya', behavior: '"lok" = lokasi, "dmn" = dimana' },
    { category: 'Singkatan', id: '2.6', question: 'tnp DP bs gk ya', behavior: '"tnp" = tanpa' },
    { category: 'Ambigu', id: '3.1', question: 'yang murah ada gak?', behavior: 'Tidak jelas merujuk ke apa' },
    { category: 'Ambigu', id: '3.2', question: 'masih ada?', behavior: 'Tidak ada konteks sama sekali' },
    { category: 'Ambigu', id: '3.7', question: 'yang kemarin itu lho, masih ada?', behavior: 'Referensi tidak ada' },
    { category: 'Alay/Capslock', id: '4.1', question: 'RuMaH tIpE 36 hArGaNyA bErApA?', behavior: 'Huruf besar-kecil bergantian' },
    { category: 'Alay/Capslock', id: '4.2', question: 'RUMAH MURAH ADA GAK????', behavior: 'Full capslock + tanda seru berlebih' },
    { category: 'Alay/Capslock', id: '4.4', question: 'ruuuumaaaah tipe 36 ada gaaaaak??', behavior: 'Huruf dipanjangkan' },
    { category: 'Campur Kode', id: '5.1', question: 'price list nya dong kak', behavior: 'Indonesia-Inggris' },
    { category: 'Campur Kode', id: '5.5', question: 'down payment nya minimal berapa percent?', behavior: 'DP Inggris + persen Inggris' },
    { category: 'Campur Kode', id: '5.10', question: 'floor plan nya ada gak?', behavior: '"floor plan" bukan "denah"' },
    { category: 'Multi-Intent', id: '6.1', question: 'harga berapa, cicilan berapa, dp berapa, lokasi dimana?', behavior: '4 pertanyaan sekaligus' },
    { category: 'Multi-Intent', id: '6.2', question: 'ada tipe 36 gak? kalo ada harganya berapa? bisa KPR? bank apa aja?', behavior: '4 pertanyaan beruntun' },
    { category: 'Emosional', id: '7.1', question: 'halo? ada orang gak?', behavior: 'Tidak sabar' },
    { category: 'Emosional', id: '7.4', question: 'ini bot apa manusia sih?', behavior: 'Mempertanyakan identitas' },
    { category: 'Emosional', id: '7.6', question: 'gak niat jualan ya?', behavior: 'Sarkasme' },
    { category: 'Non-Teks', id: '8.7', question: 'p', behavior: '"ping" klasik WhatsApp' },
    { category: 'Non-Teks', id: '8.8', question: 'assalamualaikum', behavior: 'Salam tanpa pertanyaan' },
    { category: 'Non-Teks', id: '8.9', question: 'selamat malam kak, maaf ganggu', behavior: 'Basa-basi tanpa pertanyaan' },
    { category: 'Off-Topic', id: '9.1', question: 'eh kak, tau gak cuaca besok gimana?', behavior: 'Pertanyaan cuaca' },
    { category: 'Off-Topic', id: '9.3', question: 'siapa presiden Indonesia sekarang?', behavior: 'Pertanyaan umum' },
    { category: 'Off-Topic', id: '9.7', question: 'bisa hack wifi gak?', behavior: 'Permintaan ilegal' },
    { category: 'Bahasa Daerah', id: '11.1', question: 'nanya dong, omah tipe 36 piro regine?', behavior: 'Bahasa Jawa' },
    { category: 'Bahasa Daerah', id: '11.6', question: 'kumaha harga rumah tipe 36 teh?', behavior: 'Bahasa Sunda' },
    { category: 'Bahasa Daerah', id: '11.5', question: 'bang, nak tanyo rumah subsidi', behavior: 'Dialek Minang/Melayu' },
    { category: 'Luar KB', id: '13.1', question: 'ada rumah tipe 120 gak?', behavior: 'Tipe yang tidak ada' },
    { category: 'Luar KB', id: '13.2', question: 'bisa bayar pakai crypto gak?', behavior: 'Metode pembayaran tidak umum' },
    { category: 'Luar KB', id: '13.8', question: 'bisa KPR tanpa BI checking gak?', behavior: 'Permintaan tidak mungkin' },
    { category: 'Pesan Panjang', id: '14.1', question: 'Kak saya mau cerita dulu ya, jadi saya ini kerja di pabrik gaji UMR sekitar 4.5jt, istri saya juga kerja gaji sekitar 3jt, kita punya anak 2 masih kecil2, nah kita pengen banget punya rumah sendiri soalnya udah cape ngontrak terus, kira2 ada gak rumah yang cocok buat kita yang cicilannya ringan?', behavior: 'Pesan panjang + konteks personal' },
    { category: 'Pesan Panjang', id: '14.3', question: 'Assalamualaikum kak, perkenalkan nama saya Budi dari Bandung, saya dan istri sudah menikah 5 tahun dan Alhamdulillah sudah punya tabungan sekitar 50jt, kami ingin membeli rumah pertama kami, bisa dibantu informasi rumah yang sesuai dengan budget kami?', behavior: 'Formal + informatif' },
];
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
async function flushPoll() {
    try {
        const res = await axios_1.default.get(POLL_URL);
        const messages = res.data?.data || res.data;
        if (messages && Array.isArray(messages) && messages.length > 0) {
            return messages.map((m) => m.text);
        }
    }
    catch (e) { }
    return [];
}
async function sendAndWait(question) {
    await flushPoll();
    senderCounter++;
    const sender = `test-user-${senderCounter}@c.us`;
    const payload = {
        event: 'message',
        session: MOCK_SESSION,
        payload: {
            from: sender,
            body: question,
            timestamp: Math.floor(Date.now() / 1000),
            id: { _serialized: `test_${Date.now()}_${senderCounter}` }
        }
    };
    await axios_1.default.post(WEBHOOK_URL, payload);
    const maxWait = 30000;
    const pollInterval = 1000;
    let elapsed = 0;
    while (elapsed < maxWait) {
        await sleep(pollInterval);
        elapsed += pollInterval;
        const responses = await flushPoll();
        if (responses.length > 0) {
            return responses.join('\n---\n');
        }
    }
    return '[TIMEOUT - Tidak ada respons dalam 30 detik]';
}
function evaluateResponse(tc, response) {
    if (response.includes('TIMEOUT')) {
        return { status: 'TIMEOUT', reason: 'Bot tidak merespons dalam waktu yang ditentukan' };
    }
    const lower = response.toLowerCase();
    if (tc.category === 'Off-Topic') {
        if (lower.includes('rumah') || lower.includes('properti') || lower.includes('bantu') || lower.includes('maaf') || lower.includes('tidak bisa') || lower.includes('saya hanya')) {
            return { status: 'LULUS', reason: 'Bot menolak / mengarahkan ke topik yang benar' };
        }
        if (tc.id === '9.1' && (lower.includes('cuaca') || lower.includes('hujan') || lower.includes('cerah'))) {
            return { status: 'GAGAL', reason: 'Bot menjawab pertanyaan di luar domain' };
        }
        return { status: 'PERLU_PERBAIKAN', reason: 'Respons ambigu untuk pertanyaan off-topic' };
    }
    if (tc.category === 'Non-Teks') {
        if (response.length > 10) {
            return { status: 'LULUS', reason: 'Bot merespons dengan sopan' };
        }
        return { status: 'PERLU_PERBAIKAN', reason: 'Respons terlalu singkat' };
    }
    if (tc.category === 'Emosional') {
        if (lower.includes('maaf') || lower.includes('bantu') || lower.includes('silakan') || lower.includes('luna') || lower.includes('rumah') || lower.includes('halo')) {
            return { status: 'LULUS', reason: 'Bot tetap sopan dan profesional' };
        }
        return { status: 'PERLU_PERBAIKAN', reason: 'Bot kurang empati dalam merespons' };
    }
    if (tc.category === 'Ambigu') {
        if (lower.includes('rumah') || lower.includes('tipe') || lower.includes('tersedia') || lower.includes('bisa') || lower.includes('maksud') || lower.includes('bantu')) {
            return { status: 'LULUS', reason: 'Bot merespons relevan / meminta klarifikasi' };
        }
        return { status: 'PERLU_PERBAIKAN', reason: 'Bot kurang jelas dalam merespons ambigu' };
    }
    if (tc.category === 'Luar KB') {
        if (lower.includes('tidak') || lower.includes('belum') || lower.includes('maaf') || lower.includes('saat ini') || lower.includes('tidak tersedia') || lower.includes('hubungi')) {
            return { status: 'LULUS', reason: 'Bot jujur bahwa informasi tidak tersedia' };
        }
        if (lower.includes('rumah') || lower.includes('tipe')) {
            return { status: 'PERLU_PERBAIKAN', reason: 'Bot menjawab tapi mungkin meng-hallusinasi' };
        }
        return { status: 'GAGAL', reason: 'Bot memberikan info yang mungkin salah' };
    }
    if (lower.includes('rumah') || lower.includes('tipe') || lower.includes('harga') || lower.includes('kpr') ||
        lower.includes('cicilan') || lower.includes('subsidi') || lower.includes('dp') || lower.includes('lokasi') ||
        lower.includes('rp') || lower.includes('bantu') || lower.includes('tersedia') || lower.includes('perumahan')) {
        return { status: 'LULUS', reason: 'Bot memahami pertanyaan dan menjawab relevan' };
    }
    if (response.length > 50) {
        return { status: 'PERLU_PERBAIKAN', reason: 'Bot merespons tapi relevansi tidak jelas' };
    }
    return { status: 'GAGAL', reason: 'Bot tidak memahami pertanyaan' };
}
async function main() {
    console.log('='.repeat(60));
    console.log('🧪 AUTOMATED BOT BEHAVIOR TEST (FAST MODE)');
    console.log(`Total pertanyaan: ${TEST_CASES.length}`);
    console.log(`Debounce: 0ms | Estimasi: ~${Math.ceil(TEST_CASES.length * 8 / 60)} menit`);
    console.log('='.repeat(60));
    const results = [];
    const startTime = Date.now();
    for (let i = 0; i < TEST_CASES.length; i++) {
        const tc = TEST_CASES[i];
        const qStart = Date.now();
        console.log(`\n[${i + 1}/${TEST_CASES.length}] ${tc.category} | ${tc.id}`);
        console.log(`  📤 "${tc.question}"`);
        const response = await sendAndWait(tc.question);
        const evaluation = evaluateResponse(tc, response);
        const elapsed = ((Date.now() - qStart) / 1000).toFixed(1);
        const emoji = evaluation.status === 'LULUS' ? '✅' : evaluation.status === 'PERLU_PERBAIKAN' ? '⚠️' : evaluation.status === 'TIMEOUT' ? '⏰' : '❌';
        console.log(`  📥 "${response.substring(0, 150)}${response.length > 150 ? '...' : ''}"`);
        console.log(`  ${emoji} ${evaluation.status} (${elapsed}s) — ${evaluation.reason}`);
        results.push({
            id: tc.id,
            category: tc.category,
            question: tc.question,
            behavior: tc.behavior,
            response,
            status: evaluation.status,
            reason: evaluation.reason
        });
    }
    const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
    console.log('\n\n' + '='.repeat(60));
    console.log('📊 RINGKASAN HASIL TEST');
    console.log('='.repeat(60));
    const lulus = results.filter(r => r.status === 'LULUS').length;
    const perlu = results.filter(r => r.status === 'PERLU_PERBAIKAN').length;
    const gagal = results.filter(r => r.status === 'GAGAL').length;
    const timeout = results.filter(r => r.status === 'TIMEOUT').length;
    console.log(`⏱️  Total waktu:       ${totalTime} menit`);
    console.log(`✅ LULUS:             ${lulus}/${results.length}`);
    console.log(`⚠️  PERLU PERBAIKAN:  ${perlu}/${results.length}`);
    console.log(`❌ GAGAL:             ${gagal}/${results.length}`);
    console.log(`⏰ TIMEOUT:           ${timeout}/${results.length}`);
    console.log(`📈 Skor Kelulusan:    ${Math.round((lulus / results.length) * 100)}%`);
    const categories = [...new Set(results.map(r => r.category))];
    console.log('\n--- Per Kategori ---');
    for (const cat of categories) {
        const catResults = results.filter(r => r.category === cat);
        const catLulus = catResults.filter(r => r.status === 'LULUS').length;
        const emoji = catLulus === catResults.length ? '✅' : catLulus > 0 ? '⚠️' : '❌';
        console.log(`  ${emoji} ${cat}: ${catLulus}/${catResults.length} lulus`);
    }
    const failures = results.filter(r => r.status === 'GAGAL' || r.status === 'TIMEOUT');
    if (failures.length > 0) {
        console.log('\n--- ❌ Detail Kegagalan ---');
        for (const f of failures) {
            console.log(`  [${f.id}] "${f.question}"`);
            console.log(`    Respons: "${f.response.substring(0, 120)}..."`);
            console.log(`    Alasan: ${f.reason}`);
        }
    }
    const needsFix = results.filter(r => r.status === 'PERLU_PERBAIKAN');
    if (needsFix.length > 0) {
        console.log('\n--- ⚠️ Detail Perlu Perbaikan ---');
        for (const f of needsFix) {
            console.log(`  [${f.id}] "${f.question}"`);
            console.log(`    Respons: "${f.response.substring(0, 120)}..."`);
            console.log(`    Alasan: ${f.reason}`);
        }
    }
    const fs = require('fs');
    fs.writeFileSync('test-results-behavior.json', JSON.stringify(results, null, 2));
    console.log('\n💾 Hasil lengkap: test-results-behavior.json');
}
main().catch(console.error);
//# sourceMappingURL=test-behavior-auto.js.map