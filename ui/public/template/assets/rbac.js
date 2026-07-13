/* =========================================================================
   PropertiKu Agent — Template UI · rbac.js
   RBAC config + helpers. Verbatim from src/lib/rbac.ts.
   ========================================================================= */

const ROLES = [
  { value:"superadmin", label:"Superadmin", description:"Akses penuh seluruh sistem & pengaturan" },
  { value:"admin",      label:"Admin",      description:"Manajemen operasional & pengguna" },
  { value:"operator",   label:"Operator",   description:"Chatbot, kontak, dan order harian" },
  { value:"manager",    label:"Manager",    description:"Pantau laporan & performa tim" },
  { value:"marketing",  label:"Marketing",  description:"Kampanye, broadcast, dan konten" },
  { value:"keuangan",   label:"Keuangan",   description:"Faktur, pembayaran, dan pendapatan" },
];

const ROLE_LABELS = {
  superadmin:"Superadmin", admin:"Admin", operator:"Operator",
  manager:"Manager", marketing:"Marketing", keuangan:"Keuangan",
};

const MENU_ITEMS = [
  { key:"overview",  label:"Dashboard",         icon:"LayoutDashboard", roles:["superadmin","admin","operator","manager","marketing","keuangan"] },
  { key:"chatbot",   label:"Chatbot WhatsApp",  icon:"MessageCircle",   roles:["superadmin","admin","operator","marketing"] },
  { key:"contacts",  label:"Kontak & Leads",    icon:"Users",           roles:["superadmin","admin","operator","manager","marketing"] },
  { key:"properties",label:"Properti",          icon:"Building2",       roles:["superadmin","admin","operator","manager","marketing"] },
  { key:"orders",    label:"Order",             icon:"ShoppingBag",     roles:["superadmin","admin","operator","manager","keuangan"] },
  { key:"marketing", label:"Marketing",         icon:"Megaphone",       roles:["superadmin","admin","manager","marketing"] },
  { key:"finance",   label:"Keuangan",          icon:"Wallet",          roles:["superadmin","admin","manager","keuangan"] },
  { key:"users",     label:"Manajemen Pengguna",icon:"ShieldCheck",     roles:["superadmin","admin"] },
  { key:"settings",  label:"Pengaturan",        icon:"Settings",        roles:["superadmin","admin","operator","manager","marketing","keuangan"] },
];

const ROLE_THEME = {
  superadmin:{ color:"text-rose-600",    bg:"bg-rose-50 dark:bg-rose-950/40",    ring:"ring-rose-200 dark:ring-rose-900",    dot:"bg-rose-500"    },
  admin:     { color:"text-emerald-600", bg:"bg-emerald-50 dark:bg-emerald-950/40",ring:"ring-emerald-200 dark:ring-emerald-900",dot:"bg-emerald-500" },
  operator:  { color:"text-amber-600",   bg:"bg-amber-50 dark:bg-amber-950/40",  ring:"ring-amber-200 dark:ring-amber-900",  dot:"bg-amber-500"   },
  manager:   { color:"text-violet-600",  bg:"bg-violet-50 dark:bg-violet-950/40",ring:"ring-violet-200 dark:ring-violet-900",dot:"bg-violet-500"  },
  marketing: { color:"text-pink-600",    bg:"bg-pink-50 dark:bg-pink-950/40",    ring:"ring-pink-200 dark:ring-pink-900",    dot:"bg-pink-500"    },
  keuangan:  { color:"text-teal-600",    bg:"bg-teal-50 dark:bg-teal-950/40",    ring:"ring-teal-200 dark:ring-teal-900",    dot:"bg-teal-500"    },
};

/* ViewKey -> HTML file name */
const VIEW_FILE = {
  overview:"dashboard.html", chatbot:"chatbot.html", contacts:"contacts.html",
  properties:"properties.html", orders:"orders.html", marketing:"marketing.html",
  finance:"finance.html", users:"users.html", settings:"settings.html",
};

const VIEW_TITLES = {
  overview:  { title:"Dashboard",          desc:"Ringkasan performa penjualan & chatbot" },
  chatbot:   { title:"Chatbot WhatsApp",   desc:"Kelola percakapan & sesi Waha" },
  contacts:  { title:"Kontak & Leads",     desc:"CRM pipeline calon pembeli" },
  properties:{ title:"Daftar Properti",    desc:"Katalog listing properti" },
  orders:    { title:"Manajemen Order",    desc:"Transaksi jual & sewa properti" },
  marketing: { title:"Marketing",          desc:"Kampanye, template & broadcast WhatsApp" },
  finance:   { title:"Keuangan",           desc:"Faktur, pembayaran & pendapatan" },
  users:     { title:"Manajemen Pengguna", desc:"Kelola akun & hak akses (RBAC)" },
  settings:  { title:"Pengaturan",         desc:"Profil, integrasi & preferensi" },
};

function menuForRole(role){ return MENU_ITEMS.filter(m=>m.roles.includes(role)); }
function canAccess(role, view){ const m = MENU_ITEMS.find(x=>x.key===view); return m ? m.roles.includes(role) : false; }
function defaultViewForRole(role){ return "overview"; }

Object.assign(window, {
  ROLES, ROLE_LABELS, MENU_ITEMS, ROLE_THEME, VIEW_FILE, VIEW_TITLES,
  menuForRole, canAccess, defaultViewForRole,
});
