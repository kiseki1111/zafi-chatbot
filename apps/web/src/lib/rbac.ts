import type { Role, ViewKey } from "./types";

export type { Role };

export const ROLES: Role[] = ["owner", "manager", "cs"];

export const ROLE_LABELS: Record<Role, string> = {
  owner: "Admin Sistem",
  manager: "Manajer Operasional",
  cs: "Customer Service",
};

export interface MenuItem {
  key: ViewKey;
  label: string;
  icon: string;
  roles: Role[];
  badge?: string;
}

export const MENU_ITEMS: MenuItem[] = [
  { key: "overview", label: "Dashboard", icon: "LayoutDashboard", roles: ["owner"] },
  { key: "chatbot", label: "Bot WhatsApp", icon: "MessageCircle", roles: ["owner"] },
  { key: "knowledge", label: "Knowledge Base", icon: "Book", roles: ["owner"] },
  { key: "settings", label: "Pengaturan", icon: "Settings", roles: ["owner"] },
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
};
