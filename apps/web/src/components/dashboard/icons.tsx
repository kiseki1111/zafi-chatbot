"use client";

import {
  LayoutDashboard, MessageCircle, Users, Building2, ShoppingBag,
  Megaphone, Wallet, ShieldCheck, Settings,
  Bookmark, Calculator, Layers, Smartphone, BarChart, type LucideIcon,
} from "lucide-react";
import type { ViewKey } from "@/lib/types";

const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard, MessageCircle, Users, Building2, ShoppingBag,
  Megaphone, Wallet, ShieldCheck, Settings,
  Bookmark, UsersGroup: Users, Calculator, LayersLinked: Layers, 
  DeviceMobile: Smartphone, ChartBar: BarChart,
};

export function ViewIcon({ name, className }: { name: string; className?: string }) {
  const Cmp = ICONS[name] ?? LayoutDashboard;
  return <Cmp className={className} />;
}

export const VIEW_TITLES: Record<ViewKey, { title: string; desc: string }> = {
  overview: { title: "Dashboard", desc: "Ringkasan performa bisnis properti Anda" },
  chatbot: { title: "Chatbot WhatsApp", desc: "Kelola percakapan & sesi WhatsApp via Waha" },
  contacts: { title: "Kontak & Leads", desc: "CRM calon pembeli dan penjual properti" },
  properties: { title: "Properti", desc: "Daftar listing properti yang dikelola" },
  orders: { title: "Order", desc: "Transaksi jual-beli dan sewa properti" },
  marketing: { title: "Marketing", desc: "Kampanye broadcast & template pesan" },
  finance: { title: "Keuangan", desc: "Faktur, pembayaran, dan arus kas" },
  users: { title: "Manajemen Pengguna", desc: "Kelola pengguna & hak akses (RBAC)" },
  settings: { title: "Pengaturan", desc: "Konfigurasi akun, integrasi & preferensi" },
  booking: { title: "Data Booking", desc: "Kelola transaksi booking dan DP" },
  sales: { title: "Manajemen Tim Sales", desc: "Pantau performa tim sales" },
  kpr: { title: "Simulasi KPR", desc: "Hitung estimasi cicilan KPR" },
  listing: { title: "Listing Proyek & Produk", desc: "Katalog properti dan academy" },
  social: { title: "Media Sosial", desc: "Manajemen ads dan auto posting" },
  reports: { title: "Laporan & Analytics", desc: "Analisis performa bisnis" },
};
