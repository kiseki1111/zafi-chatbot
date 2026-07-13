/* =========================================================================
   PropertiKu Agent — Template UI · data.js
   All mock data + currency helpers. Verbatim from src/lib/mock-data.ts.
   Exposed on `window` for non-module browser scripts.
   ========================================================================= */

const DEMO_ACCOUNTS = [
  { email: "superadmin@propertiku.id", password: "demo1234", role: "superadmin", name: "Andi Pratama" },
  { email: "admin@propertiku.id",      password: "demo1234", role: "admin",      name: "Budi Santoso" },
  { email: "operator@propertiku.id",   password: "demo1234", role: "operator",   name: "Citra Lestari" },
  { email: "manager@propertiku.id",    password: "demo1234", role: "manager",    name: "Dewi Anggraini" },
  { email: "marketing@propertiku.id",  password: "demo1234", role: "marketing",  name: "Eka Wijaya" },
  { email: "keuangan@propertiku.id",   password: "demo1234", role: "keuangan",   name: "Fajar Nugroho" },
];

const ALL_USERS = [
  { id:"u1", name:"Andi Pratama",  email:"superadmin@propertiku.id", phone:"0812-1111-0001", role:"superadmin", status:"active",    createdAt:"2024-01-05", lastLogin:"2025-01-15 08:30" },
  { id:"u2", name:"Budi Santoso",  email:"admin@propertiku.id",      phone:"0812-1111-0002", role:"admin",     status:"active",    createdAt:"2024-02-10", lastLogin:"2025-01-15 07:45" },
  { id:"u3", name:"Citra Lestari", email:"operator@propertiku.id",   phone:"0812-1111-0003", role:"operator",  status:"active",    createdAt:"2024-03-12", lastLogin:"2025-01-14 16:20" },
  { id:"u4", name:"Dewi Anggraini",email:"manager@propertiku.id",    phone:"0812-1111-0004", role:"manager",   status:"active",    createdAt:"2024-01-20", lastLogin:"2025-01-15 09:10" },
  { id:"u5", name:"Eka Wijaya",    email:"marketing@propertiku.id",  phone:"0812-1111-0005", role:"marketing", status:"active",    createdAt:"2024-04-01", lastLogin:"2025-01-14 18:00" },
  { id:"u6", name:"Fajar Nugroho", email:"keuangan@propertiku.id",   phone:"0812-1111-0006", role:"keuangan",  status:"active",    createdAt:"2024-02-15", lastLogin:"2025-01-15 06:30" },
  { id:"u7", name:"Gita Permata",  email:"gita@propertiku.id",       phone:"0812-1111-0007", role:"operator",  status:"active",    createdAt:"2024-05-08", lastLogin:"2025-01-13 14:00" },
  { id:"u8", name:"Hadi Kusuma",   email:"hadi@propertiku.id",       phone:"0812-1111-0008", role:"marketing", status:"suspended", createdAt:"2024-06-01", lastLogin:"2025-01-02 11:25" },
  { id:"u9", name:"Indah Sari",    email:"indah@propertiku.id",      phone:"0812-1111-0009", role:"operator",  status:"active",    createdAt:"2024-07-19", lastLogin:"2025-01-14 20:15" },
];

const WA_SESSIONS = [
  { id:"s1", name:"Agent Sales 1",  phone:"6281234567001", status:"connected",    battery:82, lastSeen:"online" },
  { id:"s2", name:"Agent CS",       phone:"6281234567002", status:"connected",    battery:64, lastSeen:"online" },
  { id:"s3", name:"Broadcast Resmi",phone:"6281234567003", status:"disconnected", battery:0,  lastSeen:"2 jam lalu" },
];

const CONTACTS = [
  { id:"c1", name:"Rina Marlina",   phone:"6285212345001", tags:["VIP","Cash"],     lastMessage:"Bisa kirim detail rumah di Bandung?", lastMessageAt:"10:24",        unread:2, stage:"prospect",    assignedTo:"Citra Lestari", propertyInterest:"Rumah Cibaduyut" },
  { id:"c2", name:"Joko Susilo",    phone:"6285212345002", tags:["KPR"],            lastMessage:"Terima kasih infonya",                lastMessageAt:"09:50",        unread:0, stage:"negotiation",  assignedTo:"Gita Permata",  propertyInterest:"Apartemen Dago" },
  { id:"c3", name:"Siti Aminah",    phone:"6285212345003", tags:["Investor"],       lastMessage:"Berapa DP ruko ini?",                 lastMessageAt:"Kemarin",      unread:5, stage:"lead",         assignedTo:"Citra Lestari", propertyInterest:"Ruko Setiabudi" },
  { id:"c4", name:"Agus Setiawan",  phone:"6285212345004", tags:["Cash"],           lastMessage:"Saya minat tanahnya",                 lastMessageAt:"Kemarin",      unread:0, stage:"customer",     assignedTo:"Gita Permata",  propertyInterest:"Tanah Padalarang" },
  { id:"c5", name:"Maya Putri",     phone:"6285212345005", tags:["KPR","VIP"],      lastMessage:"Jadwal survey kapan?",                lastMessageAt:"2 hari lalu",  unread:0, stage:"prospect",     assignedTo:"Indah Sari",    propertyInterest:"Rumah Lembang" },
  { id:"c6", name:"Bayu Prakoso",   phone:"6285212345006", tags:["Sewa"],           lastMessage:"Apakah bisa nego harga sewa?",        lastMessageAt:"2 hari lalu",  unread:1, stage:"negotiation",  assignedTo:"Indah Sari",    propertyInterest:"Apartemen Ciumbuleuit" },
  { id:"c7", name:"Lia Ramadhani",  phone:"6285212345007", tags:["Investor"],       lastMessage:"Ada listing gudang baru?",            lastMessageAt:"3 hari lalu",  unread:0, stage:"lead",         assignedTo:"Citra Lestari", propertyInterest:"Gudang Cimahi" },
  { id:"c8", name:"Tono Wibowo",    phone:"6285212345008", tags:["KPR"],            lastMessage:"Sudah saya kirim berkas KPR",         lastMessageAt:"4 hari lalu",  unread:0, stage:"customer",     assignedTo:"Gita Permata",  propertyInterest:"Rumah Cibaduyut" },
  { id:"c9", name:"Dewi Saraswati", phone:"6285212345009", tags:["Cash","VIP"],     lastMessage:"Mau kunjungi besok sore",             lastMessageAt:"5 hari lalu",  unread:0, stage:"prospect",     assignedTo:"Indah Sari",    propertyInterest:"Rumah Lembang" },
  { id:"c10",name:"Rudi Hartono",   phone:"6285212345010", tags:["Sewa"],           lastMessage:"Boleh lihat foto rukonya?",           lastMessageAt:"1 minggu lalu",unread:0, stage:"lead",         assignedTo:"Citra Lestari", propertyInterest:"Ruko Setiabudi" },
];

const CHAT_MESSAGES = [
  { id:"m1",  contactId:"c1", direction:"in",  text:"Halo, saya lihat iklan rumah di Cibaduyut. Masih tersedia?", status:"read",      timestamp:"10:20",          isAI:false },
  { id:"m2",  contactId:"c1", direction:"out", text:"Halo Bu Rina! Ya, rumah Cibaduyut masih tersedia. Luas tanah 120m², luas bangunan 90m², harga Rp 850 juta. Saya kirimkan detail & fotonya ya 🏡", status:"read", timestamp:"10:21", isAI:true },
  { id:"m3",  contactId:"c1", direction:"in",  text:"Bisa kirim detail rumah di Bandung?", status:"read",      timestamp:"10:24",          isAI:false },
  { id:"m4",  contactId:"c1", direction:"in",  text:"Dan foto-fotonya juga dong",          status:"delivered", timestamp:"10:24",          isAI:false },
  { id:"m5",  contactId:"c3", direction:"in",  text:"Berapa DP ruko ini?",                 status:"read",      timestamp:"Kemarin 14:10",  isAI:false },
  { id:"m6",  contactId:"c3", direction:"out", text:"Untuk ruko Setiabudi, DP 20% dari harga Rp 2,5 M. Bisa dicicil DP 3x. Mau saya buatkan simulasi cicilannya, Bu Siti?", status:"read", timestamp:"Kemarin 14:12", isAI:true },
  { id:"m7",  contactId:"c3", direction:"in",  text:"Boleh, kirim simulasinya",            status:"read",      timestamp:"Kemarin 14:15",  isAI:false },
  { id:"m8",  contactId:"c3", direction:"in",  text:"Dan info lokasi pastinya",            status:"delivered", timestamp:"Kemarin 14:15",  isAI:false },
  { id:"m9",  contactId:"c3", direction:"in",  text:"Saya juga mau tanya kelengkapan surat",status:"delivered",timestamp:"Kemarin 14:16",  isAI:false },
  { id:"m10", contactId:"c3", direction:"in",  text:"Apakah SHM sudah lengkap?",           status:"delivered", timestamp:"Kemarin 14:16",  isAI:false },
  { id:"m11", contactId:"c3", direction:"in",  text:"Berapa estimasi waktu closing?",      status:"delivered", timestamp:"Kemarin 14:17",  isAI:false },
];

const PROPERTIES = [
  { id:"p1", title:"Rumah Modern Cibaduyut",        type:"rumah",     price:850000000,  location:"Cibaduyut, Bandung",      bedrooms:3, bathrooms:2, area:120, status:"tersedia", agent:"Citra Lestari", createdAt:"2024-12-01", image:"https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800" },
  { id:"p2", title:"Apartemen Mewah Dago",          type:"apartemen", price:1200000000, location:"Dago, Bandung",           bedrooms:2, bathrooms:2, area:75,  status:"tersedia", agent:"Gita Permata",  createdAt:"2024-12-05", image:"https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800" },
  { id:"p3", title:"Ruko Strategis Setiabudi",      type:"ruko",      price:2500000000, location:"Setiabudi, Bandung",      area:200, status:"tersedia", agent:"Citra Lestari", createdAt:"2024-11-20", image:"https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=800" },
  { id:"p4", title:"Tanah Kavling Padalarang",      type:"tanah",     price:450000000,  location:"Padalarang, Bandung Barat",area:300, status:"terjual",  agent:"Gita Permata",  createdAt:"2024-10-15", image:"https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800" },
  { id:"p5", title:"Rumah Nyaman Lembang",          type:"rumah",     price:1500000000, location:"Lembang, Bandung",        bedrooms:4, bathrooms:3, area:180, status:"tersedia", agent:"Indah Sari",    createdAt:"2024-12-10", image:"https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800" },
  { id:"p6", title:"Gudang Industri Cimahi",        type:"gudang",    price:1800000000, location:"Cimahi",                  area:500, status:"tersewa",  agent:"Citra Lestari", createdAt:"2024-09-30", image:"https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800" },
  { id:"p7", title:"Apartemen City View Ciumbuleuit",type:"apartemen",price:950000000,  location:"Ciumbuleuit, Bandung",    bedrooms:1, bathrooms:1, area:45,  status:"tersedia", agent:"Indah Sari",    createdAt:"2024-12-18", image:"https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800" },
  { id:"p8", title:"Rumah Minimalis Cibaduyut 2",   type:"rumah",     price:720000000,  location:"Cibaduyut, Bandung",      bedrooms:2, bathrooms:1, area:90,  status:"tersedia", agent:"Gita Permata",  createdAt:"2024-12-22", image:"https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800" },
];

const ORDERS = [
  { id:"o1", code:"ORD-2025-0001", contactId:"c4", contactName:"Agus Setiawan", propertyId:"p4", propertyTitle:"Tanah Kavling Padalarang",        type:"jual", amount:450000000,  status:"deal",       agent:"Gita Permata",  createdAt:"2024-12-20", updatedAt:"2025-01-05" },
  { id:"o2", code:"ORD-2025-0002", contactId:"c2", contactName:"Joko Susilo",   propertyId:"p2", propertyTitle:"Apartemen Mewah Dago",            type:"jual", amount:1200000000, status:"negosiasi",  agent:"Gita Permata",  createdAt:"2025-01-02", updatedAt:"2025-01-12" },
  { id:"o3", code:"ORD-2025-0003", contactId:"c8", contactName:"Tono Wibowo",   propertyId:"p1", propertyTitle:"Rumah Modern Cibaduyut",          type:"jual", amount:850000000,  status:"diproses",   agent:"Gita Permata",  createdAt:"2025-01-08", updatedAt:"2025-01-13" },
  { id:"o4", code:"ORD-2025-0004", contactId:"c6", contactName:"Bayu Prakoso",  propertyId:"p7", propertyTitle:"Apartemen City View Ciumbuleuit", type:"sewa", amount:36000000,   status:"negosiasi",  agent:"Indah Sari",    createdAt:"2025-01-10", updatedAt:"2025-01-14" },
  { id:"o5", code:"ORD-2025-0005", contactId:"c3", contactName:"Siti Aminah",   propertyId:"p3", propertyTitle:"Ruko Strategis Setiabudi",        type:"jual", amount:2500000000, status:"baru",       agent:"Citra Lestari", createdAt:"2025-01-13", updatedAt:"2025-01-14" },
  { id:"o6", code:"ORD-2025-0006", contactId:"c5", contactName:"Maya Putri",    propertyId:"p5", propertyTitle:"Rumah Nyaman Lembang",            type:"jual", amount:1500000000, status:"diproses",   agent:"Indah Sari",    createdAt:"2025-01-11", updatedAt:"2025-01-14" },
  { id:"o7", code:"ORD-2024-0098", contactId:"c1", contactName:"Rina Marlina",  propertyId:"p8", propertyTitle:"Rumah Minimalis Cibaduyut 2",     type:"jual", amount:720000000,  status:"gagal",      agent:"Citra Lestari", createdAt:"2024-11-15", updatedAt:"2024-12-01" },
  { id:"o8", code:"ORD-2024-0095", contactId:"c4", contactName:"Agus Setiawan", propertyId:"p6", propertyTitle:"Gudang Industri Cimahi",          type:"sewa", amount:120000000,  status:"deal",       agent:"Citra Lestari", createdAt:"2024-10-20", updatedAt:"2024-11-10" },
];

const CAMPAIGNS = [
  { id:"cmp1", name:"Promo Rumah Cibaduyut Januari",    channel:"whatsapp", status:"aktif",       audience:320,  sent:320,  delivered:305, read:248, replied:42, createdAt:"2025-01-10", message:"🏠 Promo Awal Tahun! Rumah Cibaduyut 3KT hanya Rp 850jt. DP ringan, KPR approval cepat. Reply INFO untuk detail." },
  { id:"cmp2", name:"Broadcast Listing Baru Lembang",   channel:"whatsapp", status:"selesai",     audience:180,  sent:180,  delivered:178, read:156, replied:28, createdAt:"2025-01-05", message:"✨ Listing Baru! Rumah Nyaman Lembang 4KT, view pegunungan. Rp 1,5 M. Hubungi kami untuk survey." },
  { id:"cmp3", name:"Reminder DP Apartemen Dago",       channel:"whatsapp", status:"dijadwalkan", audience:45,   sent:0,    delivered:0,   read:0,   replied:0,  scheduledAt:"2025-01-18 09:00", createdAt:"2025-01-14", message:"Pengingat: Pembayaran DP Apartemen Dago jatuh tempo 20 Januari. Mohon segera dilunasi ya 🙏" },
  { id:"cmp4", name:"Investasi Ruko Setiabudi",         channel:"whatsapp", status:"draft",       audience:95,   sent:0,    delivered:0,   read:0,   replied:0,  createdAt:"2025-01-13", message:"🏪 Peluang Investasi Ruko Setiabudi. Lokasi strategis, harga Rp 2,5 M. ROI tinggi. Konsultasi gratis!" },
  { id:"cmp5", name:"Newsletter Properti Q4",           channel:"email",    status:"selesai",     audience:1240, sent:1240, delivered:1198, read:642, replied:18, createdAt:"2024-12-28", message:"Ringkasan properti terbaik Q4 2024. Lihat penawaran eksklusif untuk pelanggan setia." },
  { id:"cmp6", name:"Flash Sale Tanah Padalarang",      channel:"whatsapp", status:"gagal",       audience:210,  sent:0,    delivered:0,   read:0,   replied:0,  createdAt:"2025-01-08", message:"Flash Sale! Tanah Padalarang 300m². Harga spesial terbatas." },
];

const MESSAGE_TEMPLATES = [
  { id:"t1", name:"Sapaan Awal",          category:"Opening",   body:"Halo {nama}, terima kasih sudah menghubungi PropertiKu. Ada yang bisa saya bantu terkait kebutuhan properti Anda? 🏡", createdAt:"2024-12-01" },
  { id:"t2", name:"Kirim Detail Properti",category:"Listing",   body:"Berikut detail properti yang Bap/Ibu tanyakan:\n\n🏠 {nama_properti}\n📍 Lokasi: {lokasi}\n💰 Harga: {harga}\n📐 Luas: {luas}\n\nMau dijadwalkan survey?", createdAt:"2024-12-02" },
  { id:"t3", name:"Simulasi KPR",         category:"Financing", body:"Simulasi KPR {nama_properti}:\n- DP 20%: {dp}\n- Tenor 15 thn: cicilan ± {cicilan}/bln\n- Tenor 20 thn: cicilan ± {cicilan2}/bln\n\nBerminat lanjutkan prosesnya?", createdAt:"2024-12-03" },
  { id:"t4", name:"Follow Up Negosiasi",  category:"Follow Up", body:"Halo {nama}, menindaklanjuti obrolan kita soal {nama_properti}. Apakah ada keputusan yang sudah diambil? Saya siap membantu negosiasi terbaik 🙏", createdAt:"2024-12-04" },
  { id:"t5", name:"Reminder DP",          category:"Financing", body:"Pengingat: Pembayaran DP {nama_properti} akan jatuh tempo pada {tanggal}. Mohon segera dilunasi ya 🙏", createdAt:"2024-12-05" },
  { id:"t6", name:"Terima Kasih Closing", category:"Closing",   body:"Selamat dan terima kasih {nama} telah mempercayakan transaksi properti Anda kepada kami. Semoga {nama_properti} membawa keberkahan 🎉", createdAt:"2024-12-06" },
];

const INVOICES = [
  { id:"inv1", number:"INV-2025-0001", orderId:"o1", contactName:"Agus Setiawan", amount:450000000, status:"lunas",       method:"transfer", issuedAt:"2024-12-20", dueAt:"2025-01-05", paidAt:"2025-01-04" },
  { id:"inv2", number:"INV-2025-0002", orderId:"o3", contactName:"Tono Wibowo",   amount:85000000,  status:"belum-bayar", method:"cicilan",  issuedAt:"2025-01-08", dueAt:"2025-01-23" },
  { id:"inv3", number:"INV-2025-0003", orderId:"o4", contactName:"Bayu Prakoso",  amount:36000000,  status:"belum-bayar", method:"transfer", issuedAt:"2025-01-10", dueAt:"2025-01-25" },
  { id:"inv4", number:"INV-2025-0004", orderId:"o6", contactName:"Maya Putri",    amount:150000000, status:"belum-bayar", method:"cicilan",  issuedAt:"2025-01-11", dueAt:"2025-01-26" },
  { id:"inv5", number:"INV-2024-0098", orderId:"o8", contactName:"Agus Setiawan", amount:120000000, status:"lunas",       method:"transfer", issuedAt:"2024-10-20", dueAt:"2024-11-10", paidAt:"2024-11-08" },
  { id:"inv6", number:"INV-2025-0005", orderId:"o2", contactName:"Joko Susilo",   amount:120000000, status:"jatuh-tempo", method:"transfer", issuedAt:"2025-01-02", dueAt:"2025-01-12" },
  { id:"inv7", number:"INV-2025-0006", orderId:"o5", contactName:"Siti Aminah",   amount:250000000, status:"belum-bayar", method:"transfer", issuedAt:"2025-01-13", dueAt:"2025-01-28" },
];

const REVENUE_TREND = [
  { label:"Jul", value:420, value2:280 },
  { label:"Agu", value:510, value2:320 },
  { label:"Sep", value:480, value2:360 },
  { label:"Okt", value:620, value2:410 },
  { label:"Nov", value:580, value2:390 },
  { label:"Des", value:720, value2:480 },
  { label:"Jan", value:645, value2:430 },
];

const LEAD_SOURCE = [
  { label:"WhatsApp", value:42 },
  { label:"Website",  value:23 },
  { label:"Referensi",value:18 },
  { label:"Iklan",    value:12 },
  { label:"Lainnya",  value:5 },
];

const FUNNEL_DATA = [
  { label:"Lead Masuk", value:420 },
  { label:"Prospek",    value:240 },
  { label:"Negosiasi",  value:110 },
  { label:"Deal",       value:48 },
];

function formatCurrency(n){
  if(n>=1e9) return "Rp "+(n/1e9).toFixed(1).replace(".",",")+" M";
  if(n>=1e6) return "Rp "+(n/1e6).toFixed(0)+" jt";
  if(n>=1e3) return "Rp "+(n/1e3).toFixed(0)+" rb";
  return "Rp "+n;
}
function formatFullCurrency(n){ return "Rp "+n.toLocaleString("id-ID"); }

/* Expose on window */
Object.assign(window, {
  DEMO_ACCOUNTS, ALL_USERS, WA_SESSIONS, CONTACTS, CHAT_MESSAGES,
  PROPERTIES, ORDERS, CAMPAIGNS, MESSAGE_TEMPLATES, INVOICES,
  REVENUE_TREND, LEAD_SOURCE, FUNNEL_DATA,
  formatCurrency, formatFullCurrency,
});
