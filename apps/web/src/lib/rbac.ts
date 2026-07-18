import type { Role, ViewKey } from "./types";

export type { Role };

export const ROLES: Role[] = ["superadmin", "operator", "user"];

export const ROLE_LABELS: Record<Role, string> = {
  superadmin: "Superadmin",
  operator: "Operator",
  user: "User",
};

export interface MenuItem {
  key: ViewKey;
  label: string;
  icon: string;
  roles: Role[];
  badge?: string;
}

export const MENU_ITEMS: MenuItem[] = [
  { key: "overview", label: "Dashboard", icon: "LayoutDashboard", roles: ["superadmin", "operator", "user"] },
  { key: "chatbot", label: "Bot WhatsApp", icon: "MessageCircle", roles: ["superadmin", "operator", "user"] },
  { key: "settings", label: "Pengaturan", icon: "Settings", roles: ["superadmin"] },
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
  superadmin: { color: "text-rose-600", bg: "bg-rose-50 dark:bg-rose-950/40", ring: "ring-rose-200 dark:ring-rose-900" },
  operator: { color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/40", ring: "ring-amber-200 dark:ring-amber-900" },
  user: { color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/40", ring: "ring-emerald-200 dark:ring-emerald-900" },
};
