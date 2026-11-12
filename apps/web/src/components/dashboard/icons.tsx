"use client";

import {
  LayoutDashboard, MessageCircle, MessageSquareText, Users, Building2, ShoppingBag,
  Megaphone, Wallet, ShieldCheck, Settings, Package, Brain, Receipt,
  Bookmark, Calculator, Layers, Smartphone, BarChart, LineChart, Book, Grid3X3, BellRing, Bus, Activity,
  Blocks, FileText, UserCheck, ShieldAlert, Bot,
  type LucideIcon,
} from "lucide-react";
import type { ViewKey } from "@/lib/types";

const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard, MessageCircle, MessageSquareText, Users, Building2, ShoppingBag, Package, Brain, Receipt,
  Megaphone, Wallet, ShieldCheck, Settings, Grid3X3, BellRing, Bus, Activity,
  Bookmark, UsersGroup: Users, Calculator, LayersLinked: Layers, 
  DeviceMobile: Smartphone, Smartphone, ChartBar: BarChart, LineChart, Book, BarChart,
  Blocks, FileText, UserCheck, ShieldAlert, Bot,
};

export function ViewIcon({ name, className }: { name: string; className?: string }) {
  const Cmp = ICONS[name] ?? LayoutDashboard;
  return <Cmp className={className} />;
}

export const VIEW_TITLES: Record<ViewKey, { title: string; desc: string }> = {
  // 1. Dashboard Utama
  overview: { title: "Dashboard", desc: "Ringkasan performa Customer Service AI & Asisten Internal" },

  // 2. Customer Service & CRM (Original)
  chatbot: { title: "Bot WhatsApp", desc: "Live chat pelanggan WhatsApp dan koneksi sesi WhatsApp" },
  crm: { title: "Data Pelanggan (CRM)", desc: "Kelola kontak pelanggan, status prospek, dan riwayat interaksi" },
  availability: { title: "Siteplan", desc: "Kelola denah blok, tipe rumah, dan status ketersediaan unit perumahan" },
  followup: { title: "Follow-Up", desc: "Monitor & kelola auto follow-up pelanggan yang tidak aktif" },
  products: { title: "Katalog Produk", desc: "Kelola master data produk, variasi, harga, dan stok untuk asisten AI" },
  bus_layout: { title: "Visualisasi Kursi Bus (17 Seats)", desc: "Denah ketersediaan kursi & reservasi tiket armada 17 seat" },

  // 3. Asisten AI HR & Accounting (Penambahan Baru)
  assistant_chat: { title: "Chat Asisten (Internal)", desc: "Simulasi & uji coba interaksi asisten internal untuk query HRIS dan Akuntansi" },
  wa_whitelist: { title: "Whitelist Nomor WhatsApp", desc: "Kelola daftar nomor staf yang berhak mengakses asisten & tool cek status WA aktif" },
  integrations: { title: "Integrasi Sistem (HRIS & Accounting)", desc: "Pintu koneksi API dan katalog tool calling data HR & Finansial" },
  employees: { title: "Karyawan & Hak Akses", desc: "Kelola direktori staf terdaftar, nomor WhatsApp, dan batasan akses data" },
  audit_logs: { title: "Riwayat & Audit Log", desc: "Audit trail interaksi query staf, pelacakan pemanggilan tool, dan kepatuhan privasi" },

  // 4. Konfigurasi Bersama
  knowledge: { title: "Knowledge Base", desc: "Kelola dokumen pengetahuan bot (SOP, regulasi perusahaan, brosur & katalog)" },
  settings: { title: "Pengaturan", desc: "Konfigurasi akun, identitas bot, fallback contact, dan kanal koneksi" },

  // 5. Superadmin
  platform_overview: { title: "Ringkasan Platform", desc: "Metrik agregat seluruh klien, sesi WhatsApp, dan infrastruktur sistem" },
  clients: { title: "Kelola Klien & Bisnis", desc: "Buat akun perusahaan klien baru dan atur hak menu/fitur yang aktif" },
  waha_monitor: { title: "Semua Sesi WhatsApp", desc: "Pantau dan kontrol sesi WhatsApp seluruh klien dari satu dashboard terpusat" },
  quota_monitor: { title: "Monitor Kuota", desc: "Pemantauan batas MAU dan respons AI setiap perusahaan klien" },
  pricing_plans: { title: "Paket & Harga", desc: "Pengaturan paket langganan, batasan kuota, dan harga platform SaaS" },
  ai_config: { title: "Model AI & Sistem", desc: "Konfigurasi engine AI, default model, dan parameter kecerdasan buatan" },
  system_logs: { title: "Log Sistem & Webhook", desc: "Riwayat event webhook WhatsApp dan audit log sistem real-time" },
};
