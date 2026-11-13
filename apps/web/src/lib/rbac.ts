import type { Role, ViewKey } from "./types";

export type { Role };

export const ROLES: Role[] = ["superadmin", "manager", "administrator", "operator", "marketing"];

export const ROLE_LABELS: Record<string, string> = {
  superadmin: "Super Admin (Owner Platform)",
  manager: "Manager",
  administrator: "Administrator",
  operator: "Operator / CS",
  marketing: "Marketing",
};

export interface MenuItem {
  key: ViewKey;
  label: string;
  icon: string;
  section?: "main" | "cs" | "assistant" | "config" | "admin";
  badge?: string;
}

export const MENU_ITEMS: MenuItem[] = [
  // Superadmin exclusive
  { key: "platform_overview", label: "Ringkasan Platform", icon: "Activity", section: "admin" },
  { key: "clients",           label: "Kelola Klien",       icon: "Building2", section: "admin" },
  { key: "waha_monitor",      label: "Semua Sesi WhatsApp",icon: "Smartphone", section: "admin" },
  { key: "quota_monitor",     label: "Monitor Kuota",      icon: "BarChart", section: "admin" },
  { key: "pricing_plans",     label: "Paket & Harga",      icon: "Wallet", section: "admin" },
  { key: "ai_config",         label: "Model AI & Sistem",  icon: "Brain", section: "admin" },
  { key: "system_logs",       label: "Log Sistem",         icon: "Receipt", section: "admin" },

  // Utama
  { key: "overview",      label: "Dashboard",              icon: "LayoutDashboard", section: "main" },

  // 1. Modul Chatbot Customer Service (CS & CRM) - ASLI & TETAP ADA
  { key: "chatbot",       label: "Bot WhatsApp",           icon: "MessageCircle", section: "cs" },
  { key: "crm",           label: "Pelanggan",              icon: "Users", section: "cs" },
  { key: "availability",  label: "Siteplan",               icon: "Grid3X3", section: "cs" },
  { key: "followup",      label: "Follow-Up",              icon: "BellRing", section: "cs" },
  { key: "products",      label: "Katalog Produk",         icon: "Package", section: "cs" },
  { key: "bus_layout",    label: "Denah Kursi Bus",        icon: "Bus", section: "cs" },

  // 2. Modul Chatbot Asisten Internal (HRIS & Accounting) - PENAMBAHAN BARU
  { key: "assistant_chat",label: "Chat Asisten",           icon: "Bot", section: "assistant" },
  { key: "wa_whitelist",  label: "Whitelist Nomor WA",     icon: "ShieldCheck", section: "assistant" },
  { key: "integrations",  label: "Integrasi Sistem",       icon: "Blocks", section: "assistant" },
  { key: "employees",     label: "Karyawan & Akses",       icon: "UserCheck", section: "assistant" },
  { key: "audit_logs",    label: "Riwayat & Audit",        icon: "FileText", section: "assistant" },

  // 3. Modul Konfigurasi Bersama
  { key: "knowledge",     label: "Knowledge Base",         icon: "Book", section: "config" },
  { key: "settings",      label: "Pengaturan",             icon: "Settings", section: "config" },
];

const SUPERADMIN_KEYS: ViewKey[] = [
  "platform_overview",
  "clients",
  "waha_monitor",
  "quota_monitor",
  "pricing_plans",
  "ai_config",
  "system_logs",
  "settings",
];

export function menuForRole(
  role: Role,
  enabledMenus?: string[],
  userContext?: { email?: string; name?: string; tenantId?: string | null },
): MenuItem[] {
  // Superadmin melihat menu operasional platform + klien + setting
  if (role === "superadmin") {
    return MENU_ITEMS.filter((m) => SUPERADMIN_KEYS.includes(m.key));
  }

  // Tenant role tidak boleh melihat menu superadmin
  const tenantCandidateMenus = MENU_ITEMS.filter(
    (m) => !SUPERADMIN_KEYS.includes(m.key) || m.key === "settings"
  );

  // Jika enabledMenus belum di-load (undefined), tampilkan menu tenant bawaan
  if (enabledMenus === undefined) {
    return tenantCandidateMenus;
  }

  // Jika sudah di-load dari server (array terisi):
  // ponytail: Pertahankan menu dasar operasional + menu yang aktif di tenant
  if (Array.isArray(enabledMenus) && enabledMenus.length > 0) {
    const alwaysIncluded: ViewKey[] = [
      "overview",
      "chatbot",
      "crm",
      "followup",
      "assistant_chat",
      "wa_whitelist",
      "integrations",
      "employees",
      "audit_logs",
      "knowledge",
      "settings",
    ];
    return tenantCandidateMenus.filter(
      (m) => alwaysIncluded.includes(m.key) || enabledMenus.includes(m.key),
    );
  }

  return tenantCandidateMenus;
}

export function canAccess(role: Role, view: ViewKey, enabledMenus?: string[], userContext?: { email?: string; name?: string; tenantId?: string | null }): boolean {
  return menuForRole(role, enabledMenus, userContext).some((m) => m.key === view);
}

export function defaultViewForRole(role: Role): ViewKey {
  return role === "superadmin" ? "platform_overview" : "overview";
}

export const ROLE_THEME: Record<string, { color: string; bg: string; ring: string }> = {
  superadmin:    { color: "text-rose-600",   bg: "bg-rose-50 dark:bg-rose-950/40",    ring: "ring-rose-200 dark:ring-rose-900" },
  manager:       { color: "text-amber-600",  bg: "bg-amber-50 dark:bg-amber-950/40",  ring: "ring-amber-200 dark:ring-amber-900" },
  administrator: { color: "text-blue-600",   bg: "bg-blue-50 dark:bg-blue-950/40",    ring: "ring-blue-200 dark:ring-blue-900" },
  operator:      { color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/40", ring: "ring-emerald-200 dark:ring-emerald-900" },
  marketing:     { color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-950/40", ring: "ring-purple-200 dark:ring-purple-900" },
};
