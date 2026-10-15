import type { Contact, ChatMessage, WhatsAppSession, ChartPoint, Role, User } from "./types";

export interface TenantMock {
  name: string;
  agentName: string;
  agentTone: string;
  phone: string;
  category: string;
}

export const MOCK_TENANT: TenantMock = {
  name: "Zafi Royal Residence",
  agentName: "Aria AI",
  agentTone: "Ramah, responsif, profesional",
  phone: "+62 812-3456-7890",
  category: "Properti & Real Estate",
};

export const MOCK_METRICS = {
  knowledgeCount: 42,
  totalChats: 1284,
  botSuccessRate: 96.5,
};

export const MOCK_SESSIONS = [
  { id: "cs-utama", name: "CS Utama (+62 812-3456-7890)", status: "working" },
  { id: "sales-hotline", name: "Sales Hotline (+62 813-9876-5432)", status: "working" },
];

export const MOCK_CRM_CONTACTS = [
  {
    id: "crm-1",
    name: "Ummi Ruhama",
    phone: "081255443322",
    email: "ummi.ruhama@gmail.com",
    company: "Wiraswasta",
    address: "Pontianak",
    notes: "Minta SLIK Data sudah verifikasi oke Tinggal memfollow up untuk memastikan booking",
    status: "Follow-Up",
    metadata: {
      perumahan: "Griya Amanah 2",
      tipeUnit: "Tipe 40",
      hargaUnit: 295000000,
    },
    source: "WhatsApp Bot",
    createdAt: "2026-10-01T08:30:00Z",
    updatedAt: "2026-10-15T10:00:00Z",
  },
  {
    id: "crm-2",
    name: "Hamdiko Cikal Juliandi",
    phone: "081399881122",
    email: "hamdiko.c@gmail.com",
    company: "Karyawan Swasta",
    address: "Kubu Raya",
    notes: "Sudah SLIK dan bagus, namun karna pembangunan masih lama dia juga banyak mengulur waktu pembookingan",
    status: "Follow-Up",
    metadata: {
      perumahan: "Zafi Residence",
      tipeUnit: "Tipe 36",
      hargaUnit: 192800000,
    },
    source: "WhatsApp Bot",
    createdAt: "2026-10-02T09:15:00Z",
    updatedAt: "2026-10-14T11:20:00Z",
  },
  {
    id: "crm-3",
    name: "Ari Putra",
    phone: "085277884411",
    email: "ari.putra@gmail.com",
    company: "BUMN",
    address: "Pontianak Kota",
    notes: "Masih bimbang pengajuan untuk cash tempo atau KPR. Dia siap kalo cash tempo setahun.",
    status: "Follow-Up",
    metadata: {
      perumahan: "Kahyana Residence",
      tipeUnit: "Tipe 36",
      hargaUnit: 192800000,
    },
    source: "WhatsApp Bot",
    createdAt: "2026-10-03T10:00:00Z",
    updatedAt: "2026-10-13T14:40:00Z",
  },
  {
    id: "crm-4",
    name: "Rusdi",
    phone: "087811229988",
    email: null,
    company: "Swasta",
    address: "Kubu Raya",
    notes: "Sudah survey, namun data nasabah sulit. umur 38 tahun (perkiraan) namun anak 6, istri tidak kerja. penghasilan UMK (dibawah 4 juta)",
    status: "Follow-Up",
    metadata: {
      perumahan: "Kahyana Residence",
      tipeUnit: "Tipe 36",
      hargaUnit: 187800000,
    },
    source: "WhatsApp Bot",
    createdAt: "2026-10-04T11:00:00Z",
    updatedAt: "2026-10-12T16:00:00Z",
  },
  {
    id: "crm-5",
    name: "Eri Rudiansyah",
    phone: "0821-5737-6662",
    email: "eri.rudiansyah@gmail.com",
    company: "PNS Kapuas Hulu",
    address: "Kapuas Hulu",
    notes: "Menunggu konfirmasi beliau. PNS kapuas hulu. tertarik akad murabahah. masih menunggu keputusan istri karna biaya...",
    status: "Follow-Up",
    metadata: {
      perumahan: "Griya Amanah 2",
      tipeUnit: "Tipe 40",
      hargaUnit: 295000000,
    },
    source: "WhatsApp Bot",
    createdAt: "2026-10-05T13:20:00Z",
    updatedAt: "2026-10-15T09:00:00Z",
  },
];

export const MOCK_CHATS: Contact[] = [
  {
    id: "chat-1",
    name: "Budi Santoso",
    phone: "6281299887711",
    about: "Minat Tipe 45 Cluster Sakura",
    tags: ["Hot Lead", "KPR Mandiri"],
    stage: "lead",
    unread: 1,
    lastMessage: "Apakah besok Sabtu bisa survey lokasi jam 10 pagi?",
    lastMessageAt: "10:45",
    mode: "bot",
  },
  {
    id: "chat-2",
    name: "Diana Permata",
    phone: "6287844556677",
    about: "Tanya promo DP 0%",
    tags: ["New Lead", "Promo"],
    stage: "prospect",
    unread: 2,
    lastMessage: "Bisa minta brosur tipe 45/90 beserta pricelist terbarunya kak?",
    lastMessageAt: "09:20",
    mode: "bot",
  },
  {
    id: "chat-3",
    name: "Siti Rahmawati",
    phone: "6281311223344",
    about: "Booking Kavling Blok B-07",
    tags: ["Booking", "Pemberkasan"],
    stage: "negotiation",
    unread: 0,
    lastMessage: "Baik kak, bukti transfer tanda jadi sudah saya kirim ya.",
    lastMessageAt: "Kemarin",
    mode: "human",
  },
  {
    id: "chat-4",
    name: "Hendra Wijaya",
    phone: "6285677889900",
    about: "Closing Blok A-03",
    tags: ["Closing", "Customer"],
    stage: "customer",
    unread: 0,
    lastMessage: "Terima kasih banyak atas pelayanannya yang cepat dan ramah!",
    lastMessageAt: "12 Mei",
    mode: "bot",
  },
];

export const MOCK_CHAT_MESSAGES: Record<string, ChatMessage[]> = {
  "chat-1": [
    {
      id: "m-1-1",
      contactId: "chat-1",
      direction: "in",
      text: "Halo kak, saya mau tanya rumah tipe 45 di Cluster Sakura masih tersedia?",
      status: "read",
      timestamp: "10:40",
    },
    {
      id: "m-1-2",
      contactId: "chat-1",
      direction: "out",
      text: "Halo Bapak Budi! Selamat pagi. Tipe 45/90 di Cluster Sakura saat ini masih tersedia 3 unit terbaik (Blok A-05, A-08, dan B-12). Harga mulai Rp 650 Juta dengan promo Free BPHTB & Biaya KPR.",
      status: "read",
      timestamp: "10:41",
      isAI: true,
    },
    {
      id: "m-1-3",
      contactId: "chat-1",
      direction: "in",
      text: "Apakah besok Sabtu bisa survey lokasi jam 10 pagi?",
      status: "read",
      timestamp: "10:45",
    },
  ],
  "chat-2": [
    {
      id: "m-2-1",
      contactId: "chat-2",
      direction: "in",
      text: "Selamat pagi kak, saya lihat promo rumah di Instagram.",
      status: "read",
      timestamp: "09:18",
    },
    {
      id: "m-2-2",
      contactId: "chat-2",
      direction: "in",
      text: "Bisa minta brosur tipe 45/90 beserta pricelist terbarunya kak?",
      status: "read",
      timestamp: "09:20",
    },
    {
      id: "m-2-3",
      contactId: "chat-2",
      direction: "out",
      text: "Halo Ibu Diana! Tentu saja, berikut kami lampirkan brosur digital serta pricelist resmi Zafi Royal Residence untuk Tipe 45/90. Ada promo subsidi cicilan Rp 1 Juta/bln selama setahun pertama jika booking bulan ini!",
      status: "sent",
      timestamp: "09:21",
      isAI: true,
    },
  ],
  "chat-3": [
    {
      id: "m-3-1",
      contactId: "chat-3",
      direction: "out",
      text: "Halo Ibu Siti, konfirmasi nomor rekening resmi developer untuk UTJ Kavling B-07 adalah BCA 8820-123-456 a.n. PT Zafi Properti.",
      status: "read",
      timestamp: "Kemarin",
      isAI: false,
    },
    {
      id: "m-3-2",
      contactId: "chat-3",
      direction: "in",
      text: "Baik kak, bukti transfer tanda jadi sudah saya kirim ya.",
      status: "read",
      timestamp: "Kemarin",
    },
  ],
  "chat-4": [
    {
      id: "m-4-1",
      contactId: "chat-4",
      direction: "in",
      text: "Terima kasih banyak atas pelayanannya yang cepat dan ramah!",
      status: "read",
      timestamp: "12 Mei",
    },
    {
      id: "m-4-2",
      contactId: "chat-4",
      direction: "out",
      text: "Sama-sama Bapak Hendra, selamat menempati hunian baru di Cluster Lotus! Bila ada hal yang membutuhkan bantuan kami, tim support kami siap melayani Anda 24/7.",
      status: "read",
      timestamp: "12 Mei",
      isAI: true,
    },
  ],
};

export const DEFAULT_MOCK_MESSAGES: ChatMessage[] = [
  {
    id: "def-1",
    contactId: "default",
    direction: "in",
    text: "Halo kak, apakah unit ini masih tersedia?",
    status: "read",
    timestamp: "10:00",
  },
  {
    id: "def-2",
    contactId: "default",
    direction: "out",
    text: "Halo! Ya masih tersedia. Apakah ada yang bisa kami bantu jelaskan lebih lanjut mengenai spesifikasi atau jadwal survey lokasi?",
    status: "read",
    timestamp: "10:01",
    isAI: true,
  },
];

export const DEMO_ACCOUNTS: { email: string; password: string; role: Role; name: string }[] = [
  { email: "zafi@properti.com", password: "demo", role: "manager", name: "Zafi Property Manager" },
  { email: "superadmin@propertiku.id", password: "demo", role: "superadmin", name: "Super Admin Master" },
];
export const ALL_USERS: User[] = [];
export const WA_SESSIONS: WhatsAppSession[] = [];
export const CONTACTS: Contact[] = MOCK_CHATS;
export const CHAT_MESSAGES: ChatMessage[] = [];
export const PROPERTIES: any[] = [];
export const ORDERS: any[] = [];
export const CAMPAIGNS: any[] = [];
export const MESSAGE_TEMPLATES: any[] = [];
export const INVOICES: any[] = [];
export const REVENUE_TREND: ChartPoint[] = [];
export const LEAD_SOURCE: ChartPoint[] = [];
export const FUNNEL_DATA: ChartPoint[] = [];

export function formatCurrency(n: number): string {
  if (!n) return "Rp 0";
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1).replace(".", ",")} M`;
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(0)} jt`;
  if (n >= 1_000) return `Rp ${(n / 1_000).toFixed(0)} rb`;
  return `Rp ${n}`;
}

export function formatFullCurrency(n: number): string {
  if (!n) return "Rp 0";
  return "Rp " + n.toLocaleString("id-ID");
}
