/* =========================================================================
   PropertiKu Agent — Template UI · ui-helpers.js
   Badge metadata maps + small rendering helpers shared across pages.
   Loaded after data.js + rbac.js.
   ========================================================================= */

const STAGE_META = {
  lead:        { label:"Lead",       color:"text-sky-700",     bg:"bg-sky-50 dark:bg-sky-950/40",     dot:"bg-sky-500"     },
  prospect:    { label:"Prospek",    color:"text-amber-700",   bg:"bg-amber-50 dark:bg-amber-950/40", dot:"bg-amber-500"   },
  negotiation: { label:"Negosiasi",  color:"text-violet-700",  bg:"bg-violet-50 dark:bg-violet-950/40",dot:"bg-violet-500" },
  customer:    { label:"Customer",   color:"text-emerald-700", bg:"bg-emerald-50 dark:bg-emerald-950/40",dot:"bg-emerald-500"},
};
const TAG_META = {
  VIP:      { color:"text-amber-700",   bg:"bg-amber-100 dark:bg-amber-950/50"   },
  Cash:     { color:"text-emerald-700", bg:"bg-emerald-100 dark:bg-emerald-950/50" },
  KPR:      { color:"text-teal-700",    bg:"bg-teal-100 dark:bg-teal-950/50"     },
  Investor: { color:"text-violet-700",  bg:"bg-violet-100 dark:bg-violet-950/50" },
  Sewa:     { color:"text-rose-700",    bg:"bg-rose-100 dark:bg-rose-950/50"     },
};
const ORDER_STATUS_META = {
  baru:        { label:"Baru",        color:"text-sky-700",     bg:"bg-sky-50 dark:bg-sky-950/40",     dot:"bg-sky-500"     },
  diproses:    { label:"Diproses",    color:"text-amber-700",   bg:"bg-amber-50 dark:bg-amber-950/40", dot:"bg-amber-500"   },
  negosiasi:   { label:"Negosiasi",   color:"text-violet-700",  bg:"bg-violet-50 dark:bg-violet-950/40",dot:"bg-violet-500" },
  deal:        { label:"Deal",        color:"text-emerald-700", bg:"bg-emerald-50 dark:bg-emerald-950/40",dot:"bg-emerald-500"},
  gagal:       { label:"Gagal",       color:"text-rose-700",    bg:"bg-rose-50 dark:bg-rose-950/40",   dot:"bg-rose-500"    },
  dibatalkan:  { label:"Dibatalkan",  color:"text-zinc-700",    bg:"bg-zinc-100 dark:bg-zinc-800/60",  dot:"bg-zinc-500"    },
};
const PROP_STATUS_META = {
  tersedia: { label:"Tersedia", color:"text-emerald-700", bg:"bg-emerald-50 dark:bg-emerald-950/40", dot:"bg-emerald-500" },
  terjual:  { label:"Terjual",  color:"text-rose-700",    bg:"bg-rose-50 dark:bg-rose-950/40",       dot:"bg-rose-500"    },
  tersewa:  { label:"Tersewa",  color:"text-amber-700",   bg:"bg-amber-50 dark:bg-amber-950/40",     dot:"bg-amber-500"   },
  draft:    { label:"Draft",    color:"text-zinc-700",    bg:"bg-zinc-100 dark:bg-zinc-800/60",      dot:"bg-zinc-500"    },
};
const PROP_TYPE_META = {
  rumah:     { label:"Rumah",     icon:"Home"     },
  apartemen: { label:"Apartemen", icon:"Building" },
  ruko:      { label:"Ruko",      icon:"Store"    },
  tanah:     { label:"Tanah",     icon:"Trees"    },
  gudang:    { label:"Gudang",    icon:"Warehouse"},
};
const INVOICE_STATUS_META = {
  lunas:        { label:"Lunas",        color:"text-emerald-700", bg:"bg-emerald-50 dark:bg-emerald-950/40", dot:"bg-emerald-500" },
  "belum-bayar":{ label:"Belum Bayar",  color:"text-amber-700",   bg:"bg-amber-50 dark:bg-amber-950/40",     dot:"bg-amber-500"   },
  "jatuh-tempo":{ label:"Jatuh Tempo",  color:"text-rose-700",    bg:"bg-rose-50 dark:bg-rose-950/40",       dot:"bg-rose-500"    },
  dibatalkan:   { label:"Dibatalkan",   color:"text-zinc-700",    bg:"bg-zinc-100 dark:bg-zinc-800/60",      dot:"bg-zinc-500"    },
};
const PAYMENT_META = {
  transfer:{ label:"Transfer", color:"text-teal-700",    bg:"bg-teal-50 dark:bg-teal-950/40",    icon:"ArrowLeftRight" },
  cash:    { label:"Cash",     color:"text-emerald-700", bg:"bg-emerald-50 dark:bg-emerald-950/40",icon:"Banknote"       },
  cicilan: { label:"Cicilan",  color:"text-amber-700",   bg:"bg-amber-50 dark:bg-amber-950/40",  icon:"CalendarClock"  },
  qris:    { label:"QRIS",     color:"text-violet-700",  bg:"bg-violet-50 dark:bg-violet-950/40",icon:"QrCode"         },
};
const CAMPAIGN_STATUS_META = {
  draft:       { label:"Draft",        color:"text-zinc-700",    bg:"bg-zinc-100 dark:bg-zinc-800/60"      },
  dijadwalkan: { label:"Dijadwalkan",  color:"text-sky-700",     bg:"bg-sky-50 dark:bg-sky-950/40"         },
  aktif:       { label:"Aktif",        color:"text-emerald-700", bg:"bg-emerald-50 dark:bg-emerald-950/40" },
  selesai:     { label:"Selesai",      color:"text-violet-700",  bg:"bg-violet-50 dark:bg-violet-950/40"   },
  gagal:       { label:"Gagal",        color:"text-rose-700",    bg:"bg-rose-50 dark:bg-rose-950/40"       },
};

const TONE_BG = {
  emerald:"bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600",
  amber:"bg-amber-50 dark:bg-amber-950/40 text-amber-600",
  violet:"bg-violet-50 dark:bg-violet-950/40 text-violet-600",
  sky:"bg-sky-50 dark:bg-sky-950/40 text-sky-600",
  rose:"bg-rose-50 dark:bg-rose-950/40 text-rose-600",
  teal:"bg-teal-50 dark:bg-teal-950/40 text-teal-600",
  pink:"bg-pink-50 dark:bg-pink-950/40 text-pink-600",
};

function stageBadge(stage){ const m=STAGE_META[stage]; return `<span class="badge ${m.color} ${m.bg}"><span class="w-1.5 h-1.5 rounded-full ${m.dot}"></span>${m.label}</span>`; }
function tagChips(tags){ return (tags||[]).map(t=>{ const m=TAG_META[t]||{color:"text-zinc-700",bg:"bg-zinc-100 dark:bg-zinc-800"}; return `<span class="badge ${m.color} ${m.bg}">${escapeHtml(t)}</span>`; }).join(""); }
function orderStatusBadge(s){ const m=ORDER_STATUS_META[s]; return `<span class="badge ${m.color} ${m.bg}"><span class="w-1.5 h-1.5 rounded-full ${m.dot}"></span>${m.label}</span>`; }
function propStatusBadge(s){ const m=PROP_STATUS_META[s]; return `<span class="badge ${m.color} ${m.bg}"><span class="w-1.5 h-1.5 rounded-full ${m.dot}"></span>${m.label}</span>`; }
function invoiceStatusBadge(s){ const m=INVOICE_STATUS_META[s]; return `<span class="badge ${m.color} ${m.bg}"><span class="w-1.5 h-1.5 rounded-full ${m.dot}"></span>${m.label}</span>`; }
function campaignStatusBadge(s){ const m=CAMPAIGN_STATUS_META[s]; return `<span class="badge ${m.color} ${m.bg}">${m.label}</span>`; }
function roleBadge(role){ const t=ROLE_THEME[role]; return `<span class="badge ${t.color} ${t.bg} ring-1 ${t.ring}">${ROLE_LABELS[role]}</span>`; }

Object.assign(window, {
  STAGE_META, TAG_META, ORDER_STATUS_META, PROP_STATUS_META, PROP_TYPE_META,
  INVOICE_STATUS_META, PAYMENT_META, CAMPAIGN_STATUS_META, TONE_BG,
  stageBadge, tagChips, orderStatusBadge, propStatusBadge, invoiceStatusBadge, campaignStatusBadge, roleBadge,
});
