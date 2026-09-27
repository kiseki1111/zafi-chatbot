"use client";

import {
  LayoutDashboard, MessageCircle, Users, Building2, ShoppingBag,
  Megaphone, Wallet, ShieldCheck, Settings, Package, Brain, Receipt,
  Bookmark, Calculator, Layers, Smartphone, BarChart, LineChart, Book, Grid3X3, BellRing, Bus, Activity, type LucideIcon,
} from "lucide-react";
import type { ViewKey } from "@/lib/types";

const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard, MessageCircle, Users, Building2, ShoppingBag, Package, Brain, Receipt,
  Megaphone, Wallet, ShieldCheck, Settings, Grid3X3, BellRing, Bus, Activity,
  Bookmark, UsersGroup: Users, Calculator, LayersLinked: Layers, 
  DeviceMobile: Smartphone, Smartphone, ChartBar: BarChart, LineChart, Book, BarChart,
};

export function ViewIcon({ name, className }: { name: string; className?: string }) {
  const Cmp = ICONS[name] ?? LayoutDashboard;
  return <Cmp className={className} />;
}

export const VIEW_TITLES: Record<ViewKey, { title: string; desc: string }> = {
  platform_overview: { title: "Ringkasan Platform", desc: "Metrik agregat seluruh klien, sesi WhatsApp, dan infrastruktur sistem" },
  clients: { title: "Kelola Klien & Bisnis", desc: "Buat akun perusahaan klien baru dan atur hak menu/fitur yang aktif" },
  waha_monitor: { title: "Semua Sesi WAHA", desc: "Pantau dan kontrol sesi WhatsApp seluruh klien dari satu dashboard terpusat" },
  quota_monitor: { title: "Monitor Kuota", desc: "Pemantauan batas MAU dan respons AI setiap perusahaan klien" },
  pricing_plans: { title: "Paket & Harga", desc: "Pengaturan paket langganan, batasan kuota, dan harga platform SaaS" },
  ai_config: { title: "Model AI & Sistem", desc: "Konfigurasi engine AI, default model, dan parameter kecerdasan buatan" },
  system_logs: { title: "Log Sistem & Webhook", desc: "Riwayat event webhook WhatsApp dan audit log sistem real-time" },
  overview: { title: "Dashboard", desc: "Ringkasan performa asisten AI Anda" },
  bus_layout: { title: "Visualisasi Kursi Bus (17 Seats)", desc: "Denah ketersediaan kursi & reservasi tiket armada 17 seat" },
  availability: { title: "Siteplan", desc: "Kelola denah blok, tipe rumah, dan status ketersediaan unit perumahan" },
  chatbot: { title: "Bot WhatsApp", desc: "Koneksi & sesi WhatsApp" },
  knowledge: { title: "Knowledge Base", desc: "Kelola informasi yang diketahui oleh bot" },
  followup: { title: "Follow-Up", desc: "Monitor & kelola auto follow-up pelanggan yang tidak aktif" },
  settings: { title: "Pengaturan", desc: "Konfigurasi akun, identitas bot, dan fallback contact" },
  crm: { title: "Data Pelanggan (CRM)", desc: "Kelola kontak pelanggan, status prospek, dan riwayat interaksi" },
};
