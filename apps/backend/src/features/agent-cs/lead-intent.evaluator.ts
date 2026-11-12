export type LeadScore = 'HOT' | 'WARM' | 'COLD';

export type LeadScoreCode =
  | 'COLD_EXPLICIT_REJECT'
  | 'HOT_BOOKING'
  | 'HOT_SURVEY'
  | 'HOT_KPR'
  | 'HOT_CRM_STAGE'
  | 'HOT_CHAT_VOLUME'
  | 'WARM_CATALOG'
  | 'WARM_CHAT_VOLUME'
  | 'COLD_INQUIRY';

export type LeadTriggerType =
  | 'KEYWORD'
  | 'STATUS'
  | 'MESSAGE_COUNT'
  | 'DEFAULT';

export interface LeadScoreResult {
  score: LeadScore;
  code: LeadScoreCode;
  reason: string;
  triggerType: LeadTriggerType;
  matchedKeyword?: string;
}

// ponytail: ambang sementara (provisional) — akan ditentukan ulang dari label marketing.
const HOT_MESSAGE_THRESHOLD = Number(process.env.HOT_MESSAGE_THRESHOLD) || 10;
const WARM_MESSAGE_THRESHOLD = Number(process.env.WARM_MESSAGE_THRESHOLD) || 4;

// ponytail: kamus slang/typo WhatsApp yang paling umum, bukan NLP penuh.
const SLANG_MAP: Array<[RegExp, string]> = [
  [/\b(ga|gak|gk|ngga|nggak|engga|enggak|tdk)\b/g, 'tidak'],
  [/\bbrp\b/g, 'berapa'],
  [/\b(boking|bokingg|bookingg)\b/g, 'booking'],
  [/\bkmahalan\b/g, 'kemahalan'],
];

function normalizeText(raw?: string | null): string {
  let text = (raw || '').toLowerCase();

  // Frasa aman yang mirip sinyal batal, buang dulu agar tidak salah tangkap.
  text = text.replace(
    /\b(tidak|tdk|gak|ga|gk|ngga|nggak)\s+jadi\s+masalah\b/g,
    '',
  );
  text = text.replace(/\bsalah\s+satu\b/g, '');

  // Rapikan huruf berulang berlebihan: "bookinggg" -> "booking"
  text = text.replace(/([a-z])\1{2,}/g, '$1');
  for (const [re, replacement] of SLANG_MAP) {
    text = text.replace(re, replacement);
  }
  return text.replace(/\s+/g, ' ').trim();
}

function isNegatedAt(text: string, index: number): boolean {
  // Ambil potongan teks sebelum index match (maks 25 karakter)
  const windowSlice = text.slice(Math.max(0, index - 25), index);
  // ponytail: tanda baca pemisah kalimat (. ! ? \n ;) memutus radius negasi
  const parts = windowSlice.split(/[.!?\n;]/);
  const before = parts[parts.length - 1]; // hanya klausa di kalimat yang sama
  return /\b(tidak|tdk|gak|ga|gk|ngga|nggak|belum|bukan|jangan)\b[\s\w]{0,12}$/.test(
    before,
  );
}

/** Cari match pertama yang tidak dinegasikan. */
function findAffirmedMatch(text: string, pattern: RegExp): string | undefined {
  const re = new RegExp(
    pattern.source,
    pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g',
  );
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    if (!isNegatedAt(text, match.index)) {
      return match[0];
    }
  }
  return undefined;
}

/**
 * Evaluasi status prospek Hot/Warm/Cold secara deterministik.
 * Hanya memeriksa pesan customer (userMessage) — bukan balasan bot.
 * `messageCount` harus berisi jumlah pesan CUSTOMER yang unik.
 */
export function evaluateLeadScore(params: {
  status?: string | null;
  messageCount: number;
  userMessage?: string | null;
}): LeadScoreResult {
  const { status, messageCount, userMessage } = params;
  const normalizedStatus = (status || '').toUpperCase().trim();
  const text = normalizeText(userMessage);

  // 1. Prioritas 1: Batal / menolak (harus paling awal).
  const rejectKeyword = findAffirmedMatch(
    text,
    /\b(batal|dibatalkan|kemahalan|terlalu mahal|salah (nomor|sambung|orang|kontak|kirim)|uang muka.*berat)\b/,
  );
  const jadiNegated = findAffirmedMatch(
    text,
    /\b(tidak|tdk|gak|ga|gk|ngga|nggak)\s+jadi\b/,
  );
  const tidakMinat = findAffirmedMatch(
    text,
    /\b(tidak|tdk|gak|ga|gk|ngga|nggak)\s+(minat|berminat|mau (beli|ambil))\b/,
  );
  const budgetKurang = findAffirmedMatch(
    text,
    /\bbudget\b[\s\w]{0,15}\b(kurang|tidak cukup|tipis|me pet|meff)\b/,
  );
  const rejectMatch =
    rejectKeyword || jadiNegated || tidakMinat || budgetKurang;
  if (rejectMatch) {
    return {
      score: 'COLD',
      code: 'COLD_EXPLICIT_REJECT',
      reason: 'Batal / Kendala Budget / Tidak Cocok',
      triggerType: 'KEYWORD',
      matchedKeyword: rejectMatch,
    };
  }

  // 2. Booking / DP / rekening.
  const booking = findAffirmedMatch(
    text,
    /\b(booking|tanda jadi|kunci unit|pesan unit|transfer dp|rek(ening)? pt|siap dp)\b/,
  );
  if (booking) {
    return {
      score: 'HOT',
      code: 'HOT_BOOKING',
      reason: 'Minat Booking & DP Unit',
      triggerType: 'KEYWORD',
      matchedKeyword: booking,
    };
  }

  // 3. Survey / kunjungan lokasi.
  const survey = findAffirmedMatch(
    text,
    /\b(survey|cek lokasi|lihat unit|kunjungan|share ?loc|mau ke (lokasi|kantor)|bisa diantar|kapan bisa ke lokasi)\b/,
  );
  if (survey) {
    return {
      score: 'HOT',
      code: 'HOT_SURVEY',
      reason: 'Permintaan Survey Lokasi Fisik',
      triggerType: 'KEYWORD',
      matchedKeyword: survey,
    };
  }

  // 4. Finansial / KPR.
  const kpr = findAffirmedMatch(
    text,
    /\b(simulasi kpr|kpr|angsuran|cicilan|dp|uang muka|biaya all-in|slik|bi checking|slip gaji)\b/,
  );
  if (kpr) {
    return {
      score: 'HOT',
      code: 'HOT_KPR',
      reason: 'Konsultasi Finansial & KPR Bank',
      triggerType: 'KEYWORD',
      matchedKeyword: kpr,
    };
  }

  // 5. CRM Batal tanpa sinyal HOT di chat tetap COLD.
  if (normalizedStatus === 'BATAL') {
    return {
      score: 'COLD',
      code: 'COLD_EXPLICIT_REJECT',
      reason: 'Status CRM: Batal',
      triggerType: 'STATUS',
    };
  }

  // 6. Status CRM sudah maju.
  if (['SURVEY', 'BOOKING', 'CLOSING', 'SLIK'].includes(normalizedStatus)) {
    return {
      score: 'HOT',
      code: 'HOT_CRM_STAGE',
      reason: `Fase CRM Prospek: ${status}`,
      triggerType: 'STATUS',
    };
  }

  // 6. Volume chat customer yang unik.
  if (messageCount >= HOT_MESSAGE_THRESHOLD) {
    return {
      score: 'HOT',
      code: 'HOT_CHAT_VOLUME',
      reason: `${messageCount} Pesan Customer Aktif`,
      triggerType: 'MESSAGE_COUNT',
    };
  }

  // 7. Warm: volume chat menengah atau menanyakan katalog.
  const catalogKeyword = findAffirmedMatch(
    text,
    /\b(harga(nya)?|brosur|price ?list|pr icelist|tipe|spek|spesifikasi|promo|diskon|unit apa|stok unit|unit tersedia|masih ada unit|ketersediaan)\b/,
  );
  if (catalogKeyword) {
    return {
      score: 'WARM',
      code: 'WARM_CATALOG',
      reason: 'Konsultasi Harga & Katalog',
      triggerType: 'DEFAULT',
      matchedKeyword: catalogKeyword,
    };
  }

  if (messageCount >= WARM_MESSAGE_THRESHOLD) {
    return {
      score: 'WARM',
      code: 'WARM_CHAT_VOLUME',
      reason: `${messageCount} Pesan Customer (Mendalami Info)`,
      triggerType: 'MESSAGE_COUNT',
    };
  }

  // 8. Default: inquiry awal.
  return {
    score: 'COLD',
    code: 'COLD_INQUIRY',
    reason: `Inquiry Awal (${messageCount} chat)`,
    triggerType: 'DEFAULT',
  };
}
