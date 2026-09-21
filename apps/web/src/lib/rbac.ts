import type { Role, ViewKey } from "./types";

export type { Role };

export const ROLES: Role[] = ["superadmin", "manager", "administrator"];

export const ROLE_LABELS: Record<Role, string> = {
  superadmin: "Super Admin (Owner Platform)",
  manager: "Manajer Perusahaan",
  administrator: "Administrator / Staf CS",
};

export interface MenuItem {
  key: ViewKey;
  label: string;
  icon: string;
  roles: Role[];
  badge?: string;
}

export const MENU_ITEMS: MenuItem[] = [
  { key: "clients",       label: "Kelola Klien",     icon: "Building2",       roles: ["superadmin"] },
  { key: "overview",      label: "Dashboard",        icon: "LayoutDashboard", roles: ["superadmin", "manager", "administrator"] },
  { key: "chatbot",       label: "Bot WhatsApp",     icon: "MessageCircle",   roles: ["manager", "administrator"] },
  { key: "crm",           label: "Pelanggan",        icon: "Users",           roles: ["manager", "administrator"] },
  { key: "bus_layout",    label: "Denah Kursi Bus",  icon: "Bus",             roles: ["manager", "administrator"] },
  { key: "availability",  label: "Siteplan",         icon: "Grid3X3",         roles: ["manager"] },
  { key: "knowledge",     label: "Knowledge Base",   icon: "Book",            roles: ["manager"] },
  { key: "followup",      label: "Follow-Up",        icon: "BellRing",        roles: ["manager"] },
  { key: "settings",      label: "Pengaturan",       icon: "Settings",        roles: ["superadmin", "manager"] },
];

export function menuForRole(
  role: Role,
  enabledMenus?: string[],
  userContext?: { email?: string; name?: string; tenantId?: string | null },
): MenuItem[] {
  // Superadmin melihat menu kelola klien, dashboard, pengaturan
  if (role === "superadmin") {
    return MENU_ITEMS.filter((m) => m.roles.includes("superadmin"));
  }

  const roleAllowed = MENU_ITEMS.filter((m) => m.roles.includes(role));

  // Jika enabledMenus belum di-load (undefined), tampilkan menu bawaan role
  // agar tidak kosong / freeze saat awal halaman dibuka
  if (enabledMenus === undefined) {
    return roleAllowed;
  }

  // Jika sudah di-load dari server (array terisi): filter ketat sesuai database
  if (Array.isArray(enabledMenus) && enabledMenus.length > 0) {
    return roleAllowed.filter(
      (m) => m.key === "overview" || m.key === "settings" || enabledMenus.includes(m.key),
    );
  }

  // Jika eksplisit array kosong []: hanya menu wajib
  return roleAllowed.filter((m) => m.key === "overview" || m.key === "settings");
}

export function canAccess(role: Role, view: ViewKey, enabledMenus?: string[], userContext?: { email?: string; name?: string; tenantId?: string | null }): boolean {
  return menuForRole(role, enabledMenus, userContext).some((m) => m.key === view);
}

export function defaultViewForRole(role: Role): ViewKey {
  return role === "superadmin" ? "clients" : "overview";
}

export const ROLE_THEME: Record<Role, { color: string; bg: string; ring: string }> = {
  superadmin:    { color: "text-rose-600",   bg: "bg-rose-50 dark:bg-rose-950/40",    ring: "ring-rose-200 dark:ring-rose-900" },
  manager:       { color: "text-amber-600",  bg: "bg-amber-50 dark:bg-amber-950/40",  ring: "ring-amber-200 dark:ring-amber-900" },
  administrator: { color: "text-blue-600",   bg: "bg-blue-50 dark:bg-blue-950/40",    ring: "ring-blue-200 dark:ring-blue-900" },
};
