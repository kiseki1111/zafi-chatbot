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
  badge?: string;
}

export const MENU_ITEMS: MenuItem[] = [
  // Superadmin exclusive
  { key: "platform_overview", label: "Ringkasan Platform", icon: "Activity" },
  { key: "clients",           label: "Kelola Klien",       icon: "Building2" },
  { key: "waha_monitor",      label: "Semua Sesi WAHA",    icon: "Smartphone" },
  { key: "quota_monitor",     label: "Monitor Kuota",      icon: "BarChart" },
  { key: "pricing_plans",     label: "Paket & Harga",      icon: "Wallet" },
  { key: "ai_config",         label: "Model AI & Sistem",  icon: "Brain" },
  { key: "system_logs",       label: "Log Sistem",         icon: "Receipt" },

  // General & Tenant
  { key: "overview",      label: "Dashboard",        icon: "LayoutDashboard" },
  { key: "chatbot",       label: "Bot WhatsApp",     icon: "MessageCircle" },
  { key: "crm",           label: "Pelanggan",        icon: "Users" },
  { key: "bus_layout",    label: "Denah Kursi Bus",  icon: "Bus" },
  { key: "availability",  label: "Siteplan",         icon: "Grid3X3" },
  { key: "knowledge",     label: "Knowledge Base",   icon: "Book" },
  { key: "followup",      label: "Follow-Up",        icon: "BellRing" },
  { key: "settings",      label: "Pengaturan",       icon: "Settings" },
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

  // Jika enabledMenus belum di-load (undefined), tampilkan semua menu tenant bawaan
  if (enabledMenus === undefined) {
    return tenantCandidateMenus;
  }

  // Jika sudah di-load dari server (array terisi): filter sesuai enabledMenus
  if (Array.isArray(enabledMenus) && enabledMenus.length > 0) {
    return tenantCandidateMenus.filter(
      (m) => m.key === "overview" || m.key === "settings" || enabledMenus.includes(m.key),
    );
  }

  // Jika eksplisit array kosong []: hanya menu wajib
  return tenantCandidateMenus.filter((m) => m.key === "overview" || m.key === "settings");
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
