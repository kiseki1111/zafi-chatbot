import type { Role, Division, ViewKey } from "./types";

export type { Role, Division };

export const ROLES: Role[] = ["superadmin", "operator", "user"];

export const DIVISIONS: Division[] = ["marketing", "legal", "keuangan"];

export const ROLE_LABELS: Record<Role, string> = {
  superadmin: "Superadmin",
  operator: "Operator",
  user: "User",
};

export const DIVISION_LABELS: Record<Division, string> = {
  marketing: "Marketing",
  legal: "Legal",
  keuangan: "Keuangan",
};

export interface MenuItem {
  key: ViewKey;
  label: string;
  icon: string;
  roles: Role[];
  divisions?: Division[]; // jika undefined, berarti berlaku global untuk semua divisi
  badge?: string;
}

export const MENU_ITEMS: MenuItem[] = [
  // --- Global / Default ---
  { key: "overview", label: "Dashboard", icon: "LayoutDashboard", roles: ["superadmin", "operator", "user"] },
  { key: "chatbot", label: "Chatbot WhatsApp", icon: "MessageCircle", roles: ["superadmin", "operator"] },
  { key: "contacts", label: "Kontak & Leads", icon: "Users", roles: ["superadmin", "operator", "user"] },
  
  // --- Khusus Marketing ---
  { key: "booking", label: "Data Penjualan", icon: "Bookmark", roles: ["operator", "user"], divisions: ["marketing"] },
  { key: "sales", label: "Manajemen Tim Sales", icon: "UsersGroup", roles: ["operator", "user"], divisions: ["marketing"] },
  { key: "kpr", label: "Manajemen Berkas & KPR", icon: "Calculator", roles: ["operator", "user"], divisions: ["marketing"] },
  { key: "listing", label: "Listing Produk", icon: "LayersLinked", roles: ["operator", "user"], divisions: ["marketing"] },
  { key: "social", label: "Kreatif", icon: "DeviceMobile", roles: ["operator", "user"], divisions: ["marketing"] },
  { key: "reports", label: "Laporan & Autoposting", icon: "ChartBar", roles: ["operator", "user"], divisions: ["marketing"] },
  
  // --- Menu Lain (Sementara dibatasi untuk superadmin agar tidak bentrok) ---
  { key: "properties", label: "Properti", icon: "Building2", roles: ["superadmin"] },
  { key: "orders", label: "Order", icon: "ShoppingBag", roles: ["superadmin"] },
  { key: "marketing", label: "Marketing Campaign", icon: "Megaphone", roles: ["superadmin"] },
  { key: "finance", label: "Keuangan", icon: "Wallet", roles: ["superadmin"] },
  { key: "users", label: "Manajemen Pengguna", icon: "ShieldCheck", roles: ["superadmin"] },
  { key: "settings", label: "Pengaturan", icon: "Settings", roles: ["superadmin", "operator"] },
];

export function menuForRole(role: Role): MenuItem[] {
  return MENU_ITEMS.filter((m) => m.roles.includes(role));
}

export function menuForRoleAndDivision(role: Role, division: Division | null | undefined): MenuItem[] {
  return MENU_ITEMS.filter((m) => {
    // 1. Cek Role
    if (!m.roles.includes(role)) return false;
    // 2. Jika Superadmin, boleh akses menu tanpa divisions (global) atau menu superadmin
    if (role === "superadmin") {
       // Opsional: superadmin bisa melihat semua menu jika mau, tapi biasanya global
       return !m.divisions;
    }
    // 3. Jika Operator/User, harus cocok divisinya
    if (m.divisions) {
      return division && m.divisions.includes(division);
    }
    return true; // menu global
  });
}

export function canAccess(role: Role, division: Division | null | undefined, view: ViewKey): boolean {
  const menus = menuForRoleAndDivision(role, division);
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
