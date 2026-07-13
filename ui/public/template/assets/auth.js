/* =========================================================================
   PropertiKu Agent — Template UI · auth.js
   Auth state stored in localStorage key `propertiku-auth`.
   Theme stored in localStorage key `propertiku-theme`.
   ========================================================================= */

const AUTH_KEY  = "propertiku-auth";
const THEME_KEY = "propertiku-theme";

/* ---------- Helpers ---------- */
function escapeHtml(s){ return String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function initials(name){ return (name||"?").trim().charAt(0).toUpperCase(); }
function nowTime(){ const d=new Date(); return String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0"); }
function todayStr(){ return new Date().toISOString().slice(0,10); }

/* ---------- Theme ---------- */
function applyTheme(){
  const t = localStorage.getItem(THEME_KEY) || "light";
  if(t==="dark") document.documentElement.classList.add("dark");
  else document.documentElement.classList.remove("dark");
}
function currentTheme(){ return localStorage.getItem(THEME_KEY) || "light"; }
function toggleTheme(){
  const next = currentTheme()==="dark" ? "light" : "dark";
  localStorage.setItem(THEME_KEY, next);
  applyTheme();
  document.dispatchEvent(new Event("themechange"));
  if(window.toast) toast(next==="dark"?"Mode gelap aktif":"Mode terang aktif","info");
  // update any theme toggle icons present in DOM
  document.querySelectorAll('[data-theme-icon]').forEach(i=>{
    i.setAttribute("data-lucide", next==="dark"?"Sun":"Moon");
  });
  if(window.lucide) lucide.createIcons();
}

/* ---------- Toast ---------- */
function toast(msg, type="default"){
  const colors = {
    default:  "border-border bg-card text-foreground",
    success:  "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
    error:    "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200",
    warning:  "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200",
    info:     "border-teal-200 bg-teal-50 text-teal-800 dark:border-teal-900 dark:bg-teal-950 dark:text-teal-200",
  };
  const icons = { default:"Info", success:"CheckCircle2", error:"XCircle", warning:"AlertTriangle", info:"Bell" };
  let c = document.getElementById("toast-container");
  if(!c){
    c = document.createElement("div");
    c.id = "toast-container";
    c.className = "fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm";
    document.body.appendChild(c);
  }
  const node = document.createElement("div");
  node.className = `toast-in flex items-start gap-3 rounded-lg border px-4 py-3 shadow-lg ${colors[type]||colors.default}`;
  node.innerHTML = `<i data-lucide="${icons[type]||icons.default}" class="w-4 h-4 mt-0.5 shrink-0"></i><p class="text-sm font-medium leading-snug">${escapeHtml(msg)}</p>`;
  c.appendChild(node);
  if(window.lucide) lucide.createIcons();
  setTimeout(()=>{ node.style.transition="all .3s"; node.style.opacity="0"; node.style.transform="translateY(8px)"; setTimeout(()=>node.remove(),300); }, 3200);
}

/* ---------- Auth state ---------- */
function getCurrentUser(){
  try { const raw = localStorage.getItem(AUTH_KEY); return raw ? JSON.parse(raw) : null; }
  catch(e){ return null; }
}
function setCurrentUser(user){ localStorage.setItem(AUTH_KEY, JSON.stringify(user)); }

function login(email, password){
  if(!email || !password){ toast("Email & password wajib diisi","error"); return {ok:false}; }
  if(password.length < 4){ toast("Password minimal 4 karakter","error"); return {ok:false}; }
  const acc = DEMO_ACCOUNTS.find(a=>a.email.toLowerCase()===email.toLowerCase() && a.password===password);
  let user;
  if(acc){
    user = { id:"demo-"+acc.role, name:acc.name, email:acc.email, phone:"0812-0000-"+acc.role.slice(0,3), role:acc.role, status:"active", createdAt:"2024-01-01", lastLogin: nowTime() };
  } else {
    user = { id:"u-"+Date.now(), name: (email.split("@")[0].replace(/[._-]/g," ").replace(/\b\w/g,c=>c.toUpperCase())||"Pengguna"), email, phone:"0812-0000-0000", role:"operator", status:"active", createdAt:"2024-01-01", lastLogin: nowTime() };
  }
  setCurrentUser(user);
  toast("Berhasil masuk sebagai "+ROLE_LABELS[user.role],"success");
  return {ok:true, user};
}

function register(name, email, phone, password, confirm){
  if(!name||!email||!phone||!password){ toast("Lengkapi semua field","error"); return {ok:false}; }
  if(password.length<6){ toast("Password minimal 6 karakter","error"); return {ok:false}; }
  if(password!==confirm){ toast("Konfirmasi password tidak cocok","error"); return {ok:false}; }
  const user = { id:"u-"+Date.now(), name, email, phone, role:"operator", status:"active", createdAt: todayStr(), lastLogin: nowTime() };
  setCurrentUser(user);
  toast("Pendaftaran berhasil! Selamat datang "+name,"success");
  return {ok:true, user};
}

function loginAs(role){
  const acc = DEMO_ACCOUNTS.find(a=>a.role===role);
  if(!acc){ toast("Role tidak ditemukan","error"); return; }
  const user = { id:"demo-"+acc.role, name:acc.name, email:acc.email, phone:"0812-0000-"+acc.role.slice(0,3), role:acc.role, status:"active", createdAt:"2024-01-01", lastLogin: nowTime() };
  setCurrentUser(user);
  toast("Login sebagai "+ROLE_LABELS[role],"success");
  return user;
}

function logout(){
  localStorage.removeItem(AUTH_KEY);
  toast("Anda telah keluar","info");
  setTimeout(()=>{ window.location.href = "login.html"; }, 200);
}

/* ---------- Page-load guards ---------- */
function requireAuth(){
  const u = getCurrentUser();
  if(!u){
    window.location.href = "login.html";
    return null;
  }
  return u;
}

function requireAccess(view){
  const u = getCurrentUser();
  if(!u){ window.location.href = "login.html"; return false; }
  if(!canAccess(u.role, view)){
    toast("Anda tidak memiliki akses ke halaman ini","error");
    setTimeout(()=>{ window.location.href = "dashboard.html"; }, 600);
    return false;
  }
  return true;
}

/* Apply theme immediately on script load (avoid flash) */
applyTheme();

Object.assign(window, {
  AUTH_KEY, THEME_KEY,
  applyTheme, currentTheme, toggleTheme,
  toast, escapeHtml, initials, nowTime, todayStr,
  getCurrentUser, setCurrentUser, login, register, loginAs, logout,
  requireAuth, requireAccess,
});
