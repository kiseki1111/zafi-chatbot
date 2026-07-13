/* =========================================================================
   PropertiKu Agent — Template UI · layout.js
   Sidebar + topbar + modal + helpers shared across dashboard pages.
   ========================================================================= */

/* ---------- Generic helpers ---------- */
function refreshIcons(){ if(window.lucide) lucide.createIcons(); }
function $(sel,root=document){ return root.querySelector(sel); }
function $$(sel,root=document){ return Array.from(root.querySelectorAll(sel)); }

/* ---------- Sidebar ---------- */
function renderSidebar(user, activeView){
  const t = ROLE_THEME[user.role];
  const items = menuForRole(user.role);
  const totalUnread = CONTACTS.reduce((a,b)=>a+b.unread,0);
  return `
    <div class="flex items-center gap-2.5 px-5 h-16 border-b border-sidebar-border shrink-0">
      <div class="grid place-items-center h-9 w-9 rounded-lg bg-emerald-600 text-white shadow-sm"><i data-lucide="Building2" class="w-5 h-5"></i></div>
      <div class="min-w-0">
        <p class="font-bold text-sm leading-tight truncate">PropertiKu Agent</p>
        <p class="text-[10px] text-muted-foreground truncate">AI · WhatsApp Waha</p>
      </div>
      <button class="ml-auto lg:hidden btn h-8 w-8 p-0 text-muted-foreground hover:bg-sidebar-accent" onclick="closeSidebar()" aria-label="Tutup menu"><i data-lucide="X" class="w-4 h-4"></i></button>
    </div>
    <nav class="flex-1 overflow-y-auto scroll-thin px-3 py-4">
      <p class="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Menu Utama</p>
      <div class="space-y-1">
        ${items.map(item=>{
          const active = activeView===item.key;
          const href = VIEW_FILE[item.key] || "#";
          return `<a href="${href}" class="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all group ${active?'bg-emerald-600 text-white shadow-sm':'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'}">
            <i data-lucide="${item.icon}" class="w-4 h-4 shrink-0 ${active?'text-white':'text-muted-foreground group-hover:text-foreground'}"></i>
            <span class="truncate">${item.label}</span>
            ${item.key==='chatbot' && totalUnread>0 ?`<span class="ml-auto text-[10px] font-bold rounded-full px-1.5 py-0.5 bg-rose-500 text-white">${totalUnread}</span>`:''}
          </a>`;
        }).join("")}
      </div>
    </nav>
    <div class="border-t border-sidebar-border p-3 shrink-0">
      <div class="rounded-lg bg-sidebar-accent/60 p-3 flex items-center gap-3">
        <a href="settings.html" class="h-9 w-9 rounded-full grid place-items-center text-sm font-bold ring-1 ${t.bg} ${t.color} ${t.ring}">${initials(user.name)}</a>
        <div class="min-w-0 flex-1">
          <p class="text-sm font-semibold truncate leading-tight">${escapeHtml(user.name)}</p>
          <p class="text-[10px] font-medium ${t.color}">${ROLE_LABELS[user.role]}</p>
        </div>
        <button class="btn h-8 w-8 p-0 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40" onclick="logout()" title="Keluar" aria-label="Keluar"><i data-lucide="LogOut" class="w-4 h-4"></i></button>
      </div>
    </div>`;
}

/* ---------- Topbar ---------- */
function renderTopbar(user, activeView){
  const meta = VIEW_TITLES[activeView] || { title:"PropertiKu", desc:"" };
  const roleT = ROLE_THEME[user.role];
  const notifications = [
    { id:1, title:"5 pesan baru dari Siti Aminah",          time:"2 mnt lalu",  icon:"MessageCircle", color:"text-emerald-600" },
    { id:2, title:"Order ORD-2025-0005 butuh tindak lanjut", time:"15 mnt lalu", icon:"ShoppingBag",   color:"text-amber-600" },
    { id:3, title:"Kampanye 'Promo Rumah Cibaduyut' aktif",  time:"1 jam lalu",  icon:"Megaphone",     color:"text-pink-600" },
    { id:4, title:"Invoice INV-2025-0006 jatuh tempo",       time:"3 jam lalu",  icon:"Wallet",        color:"text-teal-600" },
  ];
  const themeIcon = currentTheme()==="light" ? "Moon" : "Sun";
  return `
    <div class="flex items-center gap-3 h-full px-4 lg:px-6">
      <button class="btn lg:hidden h-9 w-9 p-0 text-muted-foreground hover:bg-accent" onclick="openSidebar()" aria-label="Buka menu"><i data-lucide="Menu" class="w-5 h-5"></i></button>
      <div class="min-w-0 hidden sm:block">
        <h1 class="text-base font-semibold leading-tight truncate">${meta.title}</h1>
        <p class="text-xs text-muted-foreground truncate">${meta.desc}</p>
      </div>
      <div class="relative ml-auto hidden md:block w-64 lg:w-80">
        <i data-lucide="Search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"></i>
        <input placeholder="Cari kontak, properti, order…" class="w-full h-9 pl-9 pr-3 rounded-md text-sm bg-muted/50 border border-transparent focus:bg-background" onkeydown="if(event.key==='Enter')toast('Pencarian: '+this.value,'info')" />
      </div>
      <button class="btn h-9 w-9 p-0 ml-auto md:ml-0 text-muted-foreground hover:bg-accent" onclick="toggleTheme()" title="Ganti tema" aria-label="Ganti tema"><i data-lucide="${themeIcon}" data-theme-icon class="w-4 h-4"></i></button>
      <div class="relative">
        <button class="btn h-9 w-9 p-0 text-muted-foreground hover:bg-accent relative" onclick="toggleDropdown('notif')" aria-label="Notifikasi"><i data-lucide="Bell" class="w-4 h-4"></i><span class="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-background"></span></button>
        <div id="dd-notif" class="dropdown hidden absolute right-0 mt-2 w-80 rounded-lg border border-border bg-popover shadow-lg z-40">
          <div class="flex items-center justify-between px-3 py-2.5 border-b border-border"><span class="text-sm font-semibold">Notifikasi</span><span class="badge bg-secondary text-secondary-foreground">4 baru</span></div>
          <div class="max-h-80 overflow-y-auto scroll-thin">
            ${notifications.map(n=>`<div class="flex items-start gap-3 px-3 py-2.5 hover:bg-accent cursor-pointer border-b border-border/60">
              <div class="w-8 h-8 rounded-lg bg-accent grid place-items-center ${n.color}"><i data-lucide="${n.icon}" class="w-4 h-4"></i></div>
              <div class="min-w-0"><p class="text-sm font-medium leading-snug">${n.title}</p><p class="text-xs text-muted-foreground mt-0.5">${n.time}</p></div>
            </div>`).join("")}
          </div>
          <button class="w-full px-3 py-2 text-sm text-emerald-600 hover:bg-accent font-medium" onclick="toast('Membuka pusat notifikasi','info')">Lihat semua notifikasi</button>
        </div>
      </div>
      <div class="relative">
        <button class="flex items-center gap-2 rounded-full pl-1 pr-2 py-1 hover:bg-accent" onclick="toggleDropdown('user')" aria-label="Menu pengguna">
          <div class="h-8 w-8 rounded-full grid place-items-center text-xs font-bold ring-1 ${roleT.bg} ${roleT.color} ${roleT.ring}">${initials(user.name)}</div>
          <div class="hidden lg:block text-left"><p class="text-xs font-semibold leading-tight max-w-[120px] truncate">${escapeHtml(user.name)}</p><p class="text-[10px] text-muted-foreground">${ROLE_LABELS[user.role]}</p></div>
          <i data-lucide="ChevronDown" class="w-3.5 h-3.5 text-muted-foreground hidden lg:block"></i>
        </button>
        <div id="dd-user" class="dropdown hidden absolute right-0 mt-2 w-56 rounded-lg border border-border bg-popover shadow-lg z-40">
          <div class="px-3 py-2 border-b border-border">
            <p class="text-sm font-semibold">${escapeHtml(user.name)}</p>
            <p class="text-xs text-muted-foreground truncate">${escapeHtml(user.email)}</p>
            <div class="mt-1.5"><span class="badge ${roleT.color} ${roleT.bg} ring-1 ${roleT.ring}">${ROLE_LABELS[user.role]}</span></div>
          </div>
          <a href="settings.html" class="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent"><i data-lucide="User" class="w-4 h-4"></i>Profil Saya</a>
          <a href="settings.html" class="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent"><i data-lucide="Settings" class="w-4 h-4"></i>Pengaturan</a>
          <button class="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent" onclick="toast('Pusat bantuan dibuka','info')"><i data-lucide="HelpCircle" class="w-4 h-4"></i>Bantuan</button>
          <div class="border-t border-border"></div>
          <button class="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600" onclick="logout()"><i data-lucide="LogOut" class="w-4 h-4"></i>Keluar</button>
        </div>
      </div>
    </div>`;
}

/* ---------- Layout shell ---------- */
function renderLayoutShell(activeView, contentHtml){
  const user = getCurrentUser();
  if(!user) return "";
  return `
    <div class="min-h-screen flex flex-col bg-background">
      <div class="flex flex-1 overflow-hidden">
        <aside class="hidden lg:flex w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground" id="sidebar-desktop">${renderSidebar(user, activeView)}</aside>
        <div id="sidebar-mobile-wrap" class="fixed inset-0 z-50 lg:hidden hidden">
          <div class="absolute inset-0 modal-backdrop" onclick="closeSidebar()"></div>
          <aside class="absolute left-0 top-0 bottom-0 w-72 max-w-[85vw] flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground animate-slide-in" id="sidebar-mobile">${renderSidebar(user, activeView)}</aside>
        </div>
        <div class="flex-1 flex flex-col min-w-0">
          <header id="topbar" class="sticky top-0 z-30 h-16 border-b border-border bg-background/95 backdrop-blur">${renderTopbar(user, activeView)}</header>
          <main id="content" class="flex-1 overflow-x-hidden p-4 lg:p-6">${contentHtml||""}</main>
        </div>
      </div>
    </div>
    <div id="modal-root"></div>`;
}

/* ---------- Init layout (call after innerHTML) ---------- */
function initLayout(){
  refreshIcons();
  // close dropdowns on outside click
  if(!window._ddListener){
    window._ddListener = (e)=>{ if(!e.target.closest(".relative")) { $$(".dropdown").forEach(d=>d.classList.add("hidden")); } };
    document.addEventListener("click", window._ddListener);
  }
  // ESC closes dropdowns + modal
  if(!window._escListener){
    window._escListener = (e)=>{ if(e.key==="Escape"){ $$(".dropdown").forEach(d=>d.classList.add("hidden")); closeModal(); } };
    document.addEventListener("keydown", window._escListener);
  }
}

/* ---------- Mobile sidebar ---------- */
function openSidebar(){ const w=document.getElementById("sidebar-mobile-wrap"); if(w) w.classList.remove("hidden"); }
function closeSidebar(){ const w=document.getElementById("sidebar-mobile-wrap"); if(w) w.classList.add("hidden"); }

/* ---------- Dropdown ---------- */
function toggleDropdown(name){
  const dd = document.getElementById("dd-"+name);
  if(!dd) return;
  const isHidden = dd.classList.contains("hidden");
  $$(".dropdown").forEach(d=>d.classList.add("hidden"));
  if(isHidden) dd.classList.remove("hidden");
}

/* ---------- Modal ---------- */
function openModal({title, body, footer}){
  const root = document.getElementById("modal-root");
  if(!root) return;
  root.innerHTML = `<div class="fixed inset-0 z-[90] flex items-center justify-center p-4 modal-backdrop" onclick="if(event.target===this)closeModal()">
    <div class="card w-full max-w-lg max-h-[90vh] flex flex-col animate-fade-in">
      <div class="flex items-center justify-between p-5 border-b border-border">
        <h3 class="font-semibold text-lg">${escapeHtml(title||"")}</h3>
        <button onclick="closeModal()" class="btn h-8 w-8 p-0 text-muted-foreground hover:bg-accent" aria-label="Tutup"><i data-lucide="X" class="w-4 h-4"></i></button>
      </div>
      <div class="flex-1 overflow-y-auto scroll-thin p-5">${body||""}</div>
      ${footer?`<div class="flex flex-wrap gap-2 justify-end p-5 border-t border-border">${footer}</div>`:''}
    </div>
  </div>`;
  refreshIcons();
}
function closeModal(){ const r=document.getElementById("modal-root"); if(r) r.innerHTML=""; }

Object.assign(window, {
  $, $$, refreshIcons,
  renderSidebar, renderTopbar, renderLayoutShell, initLayout,
  openSidebar, closeSidebar, toggleDropdown,
  openModal, closeModal,
});
