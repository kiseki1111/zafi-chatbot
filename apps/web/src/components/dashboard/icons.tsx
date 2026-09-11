"use client";

import {
  LayoutDashboard, MessageCircle, Users, Building2, ShoppingBag,
  Megaphone, Wallet, ShieldCheck, Settings, Package, Brain, Receipt,
  Bookmark, Calculator, Layers, Smartphone, BarChart, LineChart, Book, Grid3X3, BellRing, type LucideIcon,
} from "lucide-react";
import type { ViewKey } from "@/lib/types";

const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard, MessageCircle, Users, Building2, ShoppingBag, Package, Brain, Receipt,
  Megaphone, Wallet, ShieldCheck, Settings, Grid3X3, BellRing,
  Bookmark, UsersGroup: Users, Calculator, LayersLinked: Layers, 
  DeviceMobile: Smartphone, Smartphone, ChartBar: BarChart, LineChart, Book,
};

export function ViewIcon({ name, className }: { name: string; className?: string }) {
  const Cmp = ICONS[name] ?? LayoutDashboard;
  return <Cmp className={className} />;
}

export const VIEW_TITLES: Record<ViewKey, { title: string; desc: string }> = {
  overview: { title: "Dashboard", desc: "Ringkasan performa asisten AI Anda" },
  availability: { title: "Plansite", desc: "Kelola denah blok, tipe rumah, dan status ketersediaan unit perumahan" },
  chatbot: { title: "Bot WhatsApp", desc: "Koneksi & sesi WhatsApp" },
  knowledge: { title: "Knowledge Base", desc: "Kelola informasi yang diketahui oleh bot" },
  followup: { title: "Follow-Up", desc: "Monitor & kelola auto follow-up pelanggan yang tidak aktif" },
  settings: { title: "Pengaturan", desc: "Konfigurasi akun, identitas bot, dan fallback contact" },
};
