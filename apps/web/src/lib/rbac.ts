import type { Role, ViewKey } from "./types";

export type { Role };

export const ROLES: Role[] = [
  "owner",
  "superadmin",
  "admin",
  "manager",
  "operator",
  "marketing",
  "keuangan",
];

export const ROLE_LABELS: Record<Role, string> = {
  owner: "Pemilik (Owner)",
  superadmin: "Super Admin",
  admin: "Admin",
  manager: "Manajer",
  operator: "Operator",
  marketing: "Marketing",
  keuangan: "Keuangan",
};

export interface MenuItem {
  key: ViewKey;
  label: string;
  icon: string;
  roles: Role[];
  badge?: string;
}

export const MENU_ITEMS: MenuItem[] = [
  { key: "overview", label: "Dashboard", icon: "LayoutDashboard", roles: ["owner", "superadmin", "admin", "manager", "operator", "marketing", "keuangan"] },
  { key: "availability", label: "Plansite", icon: "Grid3X3", roles: ["owner", "superadmin", "admin", "manager", "operator"] },
  { key: "chatbot", label: "Bot WhatsApp", icon: "MessageCircle", roles: ["owner", "superadmin", "admin", "manager", "operator"] },
  { key: "knowledge", label: "Knowledge Base", icon: "Book", roles: ["owner", "superadmin", "admin", "manager"] },
  { key: "followup", label: "Follow-Up", icon: "BellRing", roles: ["owner", "superadmin", "admin", "manager", "operator"] },
  { key: "settings", label: "Pengaturan", icon: "Settings", roles: ["owner", "superadmin", "admin"] },
];

export function menuForRole(role: Role): MenuItem[] {
  return MENU_ITEMS.filter((m) => m.roles.includes(role));
}

export function canAccess(role: Role, view: ViewKey): boolean {
  const menus = menuForRole(role);
  return menus.some((m) => m.key === view);
}

export function defaultViewForRole(role: Role): ViewKey {
  return "overview";
}

export const ROLE_THEME: Record<Role, { color: string; bg: string; ring: string }> = {
  owner: { color: "text-indigo-600", bg: "bg-indigo-50 dark:bg-indigo-950/40", ring: "ring-indigo-200 dark:ring-indigo-900" },
  superadmin: { color: "text-rose-600", bg: "bg-rose-50 dark:bg-rose-950/40", ring: "ring-rose-200 dark:ring-rose-900" },
  admin: { color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/40", ring: "ring-blue-200 dark:ring-blue-900" },
  manager: { color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/40", ring: "ring-amber-200 dark:ring-amber-900" },
  operator: { color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/40", ring: "ring-emerald-200 dark:ring-emerald-900" },
  marketing: { color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-950/40", ring: "ring-purple-200 dark:ring-purple-900" },
  keuangan: { color: "text-teal-600", bg: "bg-teal-50 dark:bg-teal-950/40", ring: "ring-teal-200 dark:ring-teal-900" },
};
