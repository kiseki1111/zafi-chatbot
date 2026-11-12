import { evaluateLeadScore } from './lead-intent.evaluator';

describe('Matriks Evaluasi Lead Intent (Agent Thinking Standards)', () => {
  describe('A. Normalisasi Teks', () => {
    it('A1 - Huruf berulang: "bookinggg unit A" -> HOT_BOOKING, keyword "booking"', () => {
      const res = evaluateLeadScore({
        messageCount: 1,
        userMessage: 'bookinggg unit A',
      });
      expect(res.score).toBe('HOT');
      expect(res.code).toBe('HOT_BOOKING');
      expect(res.matchedKeyword).toBe('booking');
    });

    it('A2 - Slang negasi: "ga jadi deh" -> COLD_EXPLICIT_REJECT', () => {
      const res = evaluateLeadScore({
        messageCount: 1,
        userMessage: 'ga jadi deh',
      });
      expect(res.score).toBe('COLD');
      expect(res.code).toBe('COLD_EXPLICIT_REJECT');
    });

    it('A3 - Slang "gak": "gak jadi, makasih" -> COLD_EXPLICIT_REJECT', () => {
      const res = evaluateLeadScore({
        messageCount: 1,
        userMessage: 'gak jadi, makasih',
      });
      expect(res.score).toBe('COLD');
      expect(res.code).toBe('COLD_EXPLICIT_REJECT');
    });

    it('A4 - Slang "bokingg": "bokingg unit A" -> HOT_BOOKING', () => {
      const res = evaluateLeadScore({
        messageCount: 1,
        userMessage: 'bokingg unit A',
      });
      expect(res.score).toBe('HOT');
      expect(res.code).toBe('HOT_BOOKING');
    });

    it('A5 - Slang "kmahalan": "kmahalan euy" -> COLD_EXPLICIT_REJECT', () => {
      const res = evaluateLeadScore({
        messageCount: 1,
        userMessage: 'kmahalan euy',
      });
      expect(res.score).toBe('COLD');
      expect(res.code).toBe('COLD_EXPLICIT_REJECT');
    });

    it('A6 - Slang "brp": "brp harganya?" -> WARM_CATALOG', () => {
      const res = evaluateLeadScore({
        messageCount: 1,
        userMessage: 'brp harganya?',
      });
      expect(res.score).toBe('WARM');
      expect(res.code).toBe('WARM_CATALOG');
    });

    it('A7 - Huruf besar: "BOOKING UNIT A" -> HOT_BOOKING', () => {
      const res = evaluateLeadScore({
        messageCount: 1,
        userMessage: 'BOOKING UNIT A',
      });
      expect(res.score).toBe('HOT');
      expect(res.code).toBe('HOT_BOOKING');
    });

    it('A8 - Spasi berlebih: "   booking   unit A   " -> HOT_BOOKING', () => {
      const res = evaluateLeadScore({
        messageCount: 1,
        userMessage: '   booking   unit A   ',
      });
      expect(res.score).toBe('HOT');
      expect(res.code).toBe('HOT_BOOKING');
    });

    it('A9 - Frasa aman: "tidak jadi masalah, boleh survey sabtu?" -> HOT_SURVEY', () => {
      const res = evaluateLeadScore({
        messageCount: 1,
        userMessage: 'tidak jadi masalah, boleh survey sabtu?',
      });
      expect(res.score).toBe('HOT');
      expect(res.code).toBe('HOT_SURVEY');
    });

    it('A10 - Frasa aman "salah satu": "salah satu unit yang bagus, ada brosur?" -> WARM_CATALOG', () => {
      const res = evaluateLeadScore({
        messageCount: 1,
        userMessage: 'salah satu unit yang bagus, ada brosur?',
      });
      expect(res.score).toBe('WARM');
      expect(res.code).toBe('WARM_CATALOG');
    });

    it('A11 - Emoji saja: "😍😍" -> COLD_INQUIRY, tanpa error', () => {
      const res = evaluateLeadScore({ messageCount: 1, userMessage: '😍😍' });
      expect(res.score).toBe('COLD');
      expect(res.code).toBe('COLD_INQUIRY');
    });

    it('A12 - Pesan kosong: userMessage = "" -> COLD_INQUIRY', () => {
      const res = evaluateLeadScore({ messageCount: 1, userMessage: '' });
      expect(res.score).toBe('COLD');
      expect(res.code).toBe('COLD_INQUIRY');
    });

    it('A13 - Null: userMessage = null -> COLD_INQUIRY', () => {
      const res = evaluateLeadScore({ messageCount: 1, userMessage: null });
      expect(res.score).toBe('COLD');
      expect(res.code).toBe('COLD_INQUIRY');
    });
  });

  describe('B. Word Boundary', () => {
    it('B1 - Substring dp: "dpt info dong" -> bukan HOT_KPR', () => {
      const res = evaluateLeadScore({
        messageCount: 1,
        userMessage: 'dpt info dong',
      });
      expect(res.code).not.toBe('HOT_KPR');
    });

    it('B2 - Substring kpr: "kpreview gratis dong" -> bukan HOT_KPR', () => {
      const res = evaluateLeadScore({
        messageCount: 1,
        userMessage: 'kpreview gratis dong',
      });
      expect(res.code).not.toBe('HOT_KPR');
    });

    it('B3 - Kata utuh dp: "dp berapa?" -> HOT_KPR, keyword "dp"', () => {
      const res = evaluateLeadScore({
        messageCount: 1,
        userMessage: 'dp berapa?',
      });
      expect(res.score).toBe('HOT');
      expect(res.code).toBe('HOT_KPR');
      expect(res.matchedKeyword).toBe('dp');
    });

    it('B4 - Kata utuh kpr: "kpr bisa berapa tahun?" -> HOT_KPR, keyword "kpr"', () => {
      const res = evaluateLeadScore({
        messageCount: 1,
        userMessage: 'kpr bisa berapa tahun?',
      });
      expect(res.score).toBe('HOT');
      expect(res.code).toBe('HOT_KPR');
      expect(res.matchedKeyword).toBe('kpr');
    });

    it('B5 - Tanda baca: "booking!!!" -> HOT_BOOKING', () => {
      const res = evaluateLeadScore({
        messageCount: 1,
        userMessage: 'booking!!!',
      });
      expect(res.score).toBe('HOT');
      expect(res.code).toBe('HOT_BOOKING');
    });

    it('B6 - Kata menempel: "unitbooking" -> bukan HOT_BOOKING', () => {
      const res = evaluateLeadScore({
        messageCount: 1,
        userMessage: 'unitbooking',
      });
      expect(res.code).not.toBe('HOT_BOOKING');
    });
  });

  describe('C. Guard Negasi', () => {
    it('C1 - Negasi langsung: "tidak mau survey" -> bukan HOT_SURVEY', () => {
      const res = evaluateLeadScore({
        messageCount: 1,
        userMessage: 'tidak mau survey',
      });
      expect(res.code).not.toBe('HOT_SURVEY');
    });

    it('C2 - Negasi belum: "belum survey" -> bukan HOT_SURVEY', () => {
      const res = evaluateLeadScore({
        messageCount: 1,
        userMessage: 'belum survey',
      });
      expect(res.code).not.toBe('HOT_SURVEY');
    });

    it('C3 - Negasi bukan: "bukan survey, saya mau cek lokasi" -> HOT_SURVEY via "cek lokasi"', () => {
      const res = evaluateLeadScore({
        messageCount: 1,
        userMessage: 'bukan survey, saya mau cek lokasi',
      });
      expect(res.score).toBe('HOT');
      expect(res.code).toBe('HOT_SURVEY');
      expect(res.matchedKeyword).toBe('cek lokasi');
    });

    it('C4 - Negasi jangan: "jangan kirim brosur" -> bukan WARM_CATALOG', () => {
      const res = evaluateLeadScore({
        messageCount: 1,
        userMessage: 'jangan kirim brosur',
      });
      expect(res.code).not.toBe('WARM_CATALOG');
    });

    it('C5 - Negasi booking, keyword lain: "saya booking, tapi tidak mau survey" -> HOT_BOOKING', () => {
      const res = evaluateLeadScore({
        messageCount: 1,
        userMessage: 'saya booking, tapi tidak mau survey',
      });
      expect(res.score).toBe('HOT');
      expect(res.code).toBe('HOT_BOOKING');
      expect(res.matchedKeyword).toBe('booking');
    });

    it('C6 - Negasi booking: "tidak mau booking" -> COLD_INQUIRY', () => {
      const res = evaluateLeadScore({
        messageCount: 1,
        userMessage: 'tidak mau booking',
      });
      expect(res.score).toBe('COLD');
      expect(res.code).toBe('COLD_INQUIRY');
    });

    it('C7 - Di luar radius 20 karakter: "tidak, sebenarnya saya ingin sekali survey besok" -> HOT_SURVEY', () => {
      const res = evaluateLeadScore({
        messageCount: 1,
        userMessage: 'tidak, sebenarnya saya ingin sekali survey besok',
      });
      expect(res.score).toBe('HOT');
      expect(res.code).toBe('HOT_SURVEY');
    });

    it('C8 - Di dalam radius 20 karakter: "tidak survey" -> bukan HOT_SURVEY', () => {
      const res = evaluateLeadScore({
        messageCount: 1,
        userMessage: 'tidak survey',
      });
      expect(res.code).not.toBe('HOT_SURVEY');
    });

    it('C9 - Negasi di kalimat lain: "tidak apa-apa. Survey sabtu ya" -> HOT_SURVEY (diputus titik)', () => {
      const res = evaluateLeadScore({
        messageCount: 1,
        userMessage: 'tidak apa-apa. Survey sabtu ya',
      });
      expect(res.score).toBe('HOT');
      expect(res.code).toBe('HOT_SURVEY');
    });
  });

  describe('D. Urutan Prioritas', () => {
    it('D1 - COLD menang atas HOT: "kemahalan, mau booking" -> COLD_EXPLICIT_REJECT', () => {
      const res = evaluateLeadScore({
        messageCount: 1,
        userMessage: 'kemahalan, mau booking',
      });
      expect(res.score).toBe('COLD');
      expect(res.code).toBe('COLD_EXPLICIT_REJECT');
    });

    it('D2 - Booking menang atas survey: "booking dan survey" -> HOT_BOOKING', () => {
      const res = evaluateLeadScore({
        messageCount: 1,
        userMessage: 'booking dan survey',
      });
      expect(res.score).toBe('HOT');
      expect(res.code).toBe('HOT_BOOKING');
    });

    it('D3 - Survey menang atas KPR: "survey dan simulasi kpr" -> HOT_SURVEY', () => {
      const res = evaluateLeadScore({
        messageCount: 1,
        userMessage: 'survey dan simulasi kpr',
      });
      expect(res.score).toBe('HOT');
      expect(res.code).toBe('HOT_SURVEY');
    });

    it('D4 - KPR menang atas katalog: "simulasi kpr, harga berapa" -> HOT_KPR', () => {
      const res = evaluateLeadScore({
        messageCount: 1,
        userMessage: 'simulasi kpr, harga berapa',
      });
      expect(res.score).toBe('HOT');
      expect(res.code).toBe('HOT_KPR');
    });

    it('D5 - Katalog menang atas volume: "harga?" dengan 4 pesan -> WARM_CATALOG', () => {
      const res = evaluateLeadScore({
        messageCount: 4,
        userMessage: 'harga berapa kak?',
      });
      expect(res.score).toBe('WARM');
      expect(res.code).toBe('WARM_CATALOG');
    });

    it('D6 - CRM Batal menang atas chat: Status CRM "Batal", chat "saya booking" -> COLD_EXPLICIT_REJECT', () => {
      // Catatan: Pada prioritas deterministik, status Batal menutup deal kecuali di-override secara manual
      const res = evaluateLeadScore({
        status: 'Batal',
        messageCount: 1,
        userMessage: 'saya tidak jadi ambil unitnya',
      });
      expect(res.score).toBe('COLD');
      expect(res.code).toBe('COLD_EXPLICIT_REJECT');
    });

    it('D7 - CRM maju menang atas katalog: Status "Survey", chat "harga?" -> HOT_CRM_STAGE', () => {
      const res = evaluateLeadScore({
        status: 'Survey',
        messageCount: 1,
        userMessage: 'harga?',
      });
      expect(res.score).toBe('HOT');
      expect(res.code).toBe('HOT_CRM_STAGE');
    });

    it('D8 - CRM Follow-Up tidak memicu: Status "Follow-Up", chat "halo" -> COLD_INQUIRY', () => {
      const res = evaluateLeadScore({
        status: 'Follow-Up',
        messageCount: 1,
        userMessage: 'halo',
      });
      expect(res.score).toBe('COLD');
      expect(res.code).toBe('COLD_INQUIRY');
    });
  });

  describe('E. Volume Pesan', () => {
    it('E1 - Di bawah batas WARM: 3 pesan customer unik -> COLD_INQUIRY', () => {
      const res = evaluateLeadScore({
        messageCount: 3,
        userMessage: 'oke kak',
      });
      expect(res.score).toBe('COLD');
      expect(res.code).toBe('COLD_INQUIRY');
    });

    it('E2 - Batas bawah WARM: 4 pesan customer unik -> WARM_CHAT_VOLUME', () => {
      const res = evaluateLeadScore({
        messageCount: 4,
        userMessage: 'oke kak',
      });
      expect(res.score).toBe('WARM');
      expect(res.code).toBe('WARM_CHAT_VOLUME');
    });

    it('E3 - Batas atas WARM: 9 pesan customer unik -> WARM_CHAT_VOLUME', () => {
      const res = evaluateLeadScore({
        messageCount: 9,
        userMessage: 'oke kak',
      });
      expect(res.score).toBe('WARM');
      expect(res.code).toBe('WARM_CHAT_VOLUME');
    });

    it('E4 - Batas HOT: 10 pesan customer unik -> HOT_CHAT_VOLUME', () => {
      const res = evaluateLeadScore({
        messageCount: 10,
        userMessage: 'oke kak',
      });
      expect(res.score).toBe('HOT');
      expect(res.code).toBe('HOT_CHAT_VOLUME');
    });
  });
});
