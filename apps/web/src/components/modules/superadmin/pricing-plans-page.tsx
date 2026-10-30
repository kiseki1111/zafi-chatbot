"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Zap,
  Check,
  Pencil,
  RefreshCw,
  Save,
  RotateCcw,
  Sparkles,
  Table as TableIcon,
  LayoutGrid,
  Building2,
  Users,
  Phone,
  ShieldCheck,
  CheckCircle2,
  SlidersHorizontal,
} from "lucide-react";

export interface PlanTier {
  key: string;
  name: string;
  price: number;
  priceLabel: string;
  yearlyPrice: number;
  yearlyPriceLabel: string;
  yearlySavings: string;
  maxAiResponses: number;
  maxMau: number;
  whatsappNumbers: number;
  maxProjects: number;
  maxUsers: number;
  setupFee: number;
  setupFeeLabel: string;
  yearlySetupDiscount: string;
  trialDays: string;
  support: string;
  onboarding: string;
  avgAiResponsePerMau: string;
  desc?: string;
}

export const OFFICIAL_DEFAULT_PLANS: PlanTier[] = [
  {
    key: "lite",
    name: "Lite - UMKM",
    price: 249000,
    priceLabel: "Rp 249.000",
    yearlyPrice: 209000,
    yearlyPriceLabel: "Rp 209.000",
    yearlySavings: "16.1%",
    maxAiResponses: 1000,
    maxMau: 300,
    whatsappNumbers: 1,
    maxProjects: 1,
    maxUsers: 1,
    setupFee: 0,
    setupFeeLabel: "Rp 0",
    yearlySetupDiscount: "Tidak ada setup",
    trialDays: "14 hari",
    support: "Panduan & email",
    onboarding: "Self-service",
    avgAiResponsePerMau: "3.3 respons/kontak",
    desc: "Cocok untuk UMKM pemula dengan 1 nomor WhatsApp & 1 proyek",
  },
  {
    key: "bronze",
    name: "Bronze - Starter",
    price: 499000,
    priceLabel: "Rp 499.000",
    yearlyPrice: 429000,
    yearlyPriceLabel: "Rp 429.000",
    yearlySavings: "14.0%",
    maxAiResponses: 4000,
    maxMau: 1000,
    whatsappNumbers: 1,
    maxProjects: 1,
    maxUsers: 3,
    setupFee: 500000,
    setupFeeLabel: "Rp 500.000",
    yearlySetupDiscount: "Gratis",
    trialDays: "14 hari",
    support: "WhatsApp, 2x24 jam",
    onboarding: "Self-service + video",
    avgAiResponsePerMau: "4.0 respons/kontak",
    desc: "Starter pack tim berkembang dengan hingga 3 pengguna & support WhatsApp",
  },
  {
    key: "silver",
    name: "Silver - Pro",
    price: 999000,
    priceLabel: "Rp 999.000",
    yearlyPrice: 849000,
    yearlyPriceLabel: "Rp 849.000",
    yearlySavings: "15.0%",
    maxAiResponses: 10000,
    maxMau: 2500,
    whatsappNumbers: 2,
    maxProjects: 3,
    maxUsers: 6,
    setupFee: 500000,
    setupFeeLabel: "Rp 500.000",
    yearlySetupDiscount: "Gratis",
    trialDays: "14 hari",
    support: "WhatsApp, 1x24 jam",
    onboarding: "1x sesi online",
    avgAiResponsePerMau: "4.0 respons/kontak",
    desc: "Paling populer untuk bisnis properti multi-proyek (3 siteplan), 2 nomor WA & 6 pengguna",
  },
  {
    key: "gold",
    name: "Gold - Business",
    price: 1999000,
    priceLabel: "Rp 1.999.000",
    yearlyPrice: 1699000,
    yearlyPriceLabel: "Rp 1.699.000",
    yearlySavings: "15%",
    maxAiResponses: 24000,
    maxMau: 6000,
    whatsappNumbers: 4,
    maxProjects: 8,
    maxUsers: 12,
    setupFee: 0,
    setupFeeLabel: "Rp 0",
    yearlySetupDiscount: "Gratis",
    trialDays: "14 hari",
    support: "Dedicated PIC + SLA 4 jam",
    onboarding: "3x sesi online",
    avgAiResponsePerMau: "4 respons/kontak",
    desc: "Skala korporat & bisnis besar dengan 4 nomor WA, 8 proyek & Dedicated PIC SLA 4 jam",
  },
  {
    key: "enterprise",
    name: "Enterprise - Corporate",
    price: 0,
    priceLabel: "Kustom",
    yearlyPrice: 0,
    yearlyPriceLabel: "Kustom",
    yearlySavings: "Sesuai Kontrak",
    maxAiResponses: 100000,
    maxMau: 25000,
    whatsappNumbers: 10,
    maxProjects: 25,
    maxUsers: 50,
    setupFee: 0,
    setupFeeLabel: "Custom",
    yearlySetupDiscount: "Custom",
    trialDays: "POC 30 hari",
    support: "Dedicated + SLA 2 jam",
    onboarding: "Full project",
    avgAiResponsePerMau: "5.0 respons/kontak",
    desc: "Solusi korporat enterprise dengan POC 30 hari & Dedicated SLA 2 jam",
  },
  // ponytail: sentinel high value for unlimited developer mode
  {
    key: "developer",
    name: "Developer Mode (Internal)",
    price: 0,
    priceLabel: "Unlimited / Internal",
    yearlyPrice: 0,
    yearlyPriceLabel: "Unlimited",
    yearlySavings: "100%",
    maxAiResponses: 999999999,
    maxMau: 999999999,
    whatsappNumbers: 999,
    maxProjects: 999,
    maxUsers: 999,
    setupFee: 0,
    setupFeeLabel: "Rp 0",
    yearlySetupDiscount: "Gratis",
    trialDays: "Selamanya",
    support: "Internal Root Access",
    onboarding: "All Features Unlocked",
    avgAiResponsePerMau: "Unlimited",
    desc: "Mode khusus perusahaan pemilik SaaS: seluruh fitur & kuota tanpa batas",
  },
];

const TIER_HEADER_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  lite: {
    bg: "bg-[#8C6239] text-white",
    text: "text-[#8C6239] dark:text-amber-400",
    border: "border-[#8C6239]/30",
  },
  bronze: {
    bg: "bg-[#5C6B73] text-white",
    text: "text-[#5C6B73] dark:text-slate-300",
    border: "border-[#5C6B73]/30",
  },
  silver: {
    bg: "bg-[#C5832B] text-white",
    text: "text-[#C5832B] dark:text-amber-300",
    border: "border-[#C5832B]/30",
  },
  gold: {
    bg: "bg-[#1B263B] text-white",
    text: "text-[#1B263B] dark:text-blue-300",
    border: "border-[#1B263B]/30",
  },
  enterprise: {
    bg: "bg-[#0F172A] text-white",
    text: "text-[#0F172A] dark:text-cyan-300",
    border: "border-[#0F172A]/40",
  },
  developer: {
    bg: "bg-emerald-950 text-emerald-200",
    text: "text-emerald-400 dark:text-emerald-300",
    border: "border-emerald-600/50",
  },
};

export function PricingPlansPage() {
  const [plans, setPlans] = useState<PlanTier[]>(OFFICIAL_DEFAULT_PLANS);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [editingPlan, setEditingPlan] = useState<PlanTier | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/platform/config/pricing");
      const json = await res.json();
      const val = json?.data || json;
      if (Array.isArray(val) && val.length > 0) {
        // Merge with official structure to guarantee all fields exist
        const merged = OFFICIAL_DEFAULT_PLANS.map((def) => {
          const found = val.find((v: any) => v.key === def.key);
          return found ? { ...def, ...found } : def;
        });
        setPlans(merged);
      } else {
        setPlans(OFFICIAL_DEFAULT_PLANS);
      }
    } catch {
      setPlans(OFFICIAL_DEFAULT_PLANS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;
    setSaving(true);
    try {
      const updated = plans.map((p) => (p.key === editingPlan.key ? editingPlan : p));
      await fetch("/api/v1/platform/config/pricing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: updated }),
      });
      setPlans(updated);
      toast.success(`Paket ${editingPlan.name} berhasil diperbarui`);
      setEditingPlan(null);
    } catch {
      toast.error("Gagal menyimpan perubahan paket");
    } finally {
      setSaving(false);
    }
  };

  const handleResetToOfficialDefaults = async () => {
    if (!confirm("Kembalikan paket & harga ke skema standar resmi?")) return;
    setSaving(true);
    try {
      await fetch("/api/v1/platform/config/pricing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: OFFICIAL_DEFAULT_PLANS }),
      });
      setPlans(OFFICIAL_DEFAULT_PLANS);
      toast.success("Skema paket berhasil dikembalikan ke standar resmi");
    } catch {
      toast.error("Gagal mereset skema paket");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight">Kelola Paket &amp; Benefit SaaS</h2>
            <Badge variant="outline" className="text-xs font-semibold bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300">
              4 Tier Resmi
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Konfigurasi tier resmi: Lite (UMKM), Bronze (Starter), Silver (Pro), dan Gold (Business).
            Akun tenant yang belum diatur akan berstatus <em>Tanpa Paket</em> sampai Anda tetapkan secara mandiri.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center rounded-lg border bg-muted/40 p-1">
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-all ${
                viewMode === "table"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <TableIcon className="h-3.5 w-3.5" /> Matriks
            </button>
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-all ${
                viewMode === "cards"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" /> Kartu
            </button>
          </div>

          <Button onClick={fetchPlans} variant="outline" size="sm" className="h-8 text-xs gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>

          <Button
            onClick={handleResetToOfficialDefaults}
            variant="ghost"
            size="sm"
            className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
            title="Kembalikan ke standar resmi"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset Default
          </Button>
        </div>
      </div>

      {/* TABLE VIEW (Matrix matching the provided image) */}
      {viewMode === "table" ? (
        <Card className="overflow-hidden border shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr>
                  <th className="w-1/5 p-3.5 text-left font-bold bg-slate-800 text-white border-b border-r border-slate-700">
                    Komponen
                  </th>
                  {plans.map((p) => {
                    const style = TIER_HEADER_STYLES[p.key] || {
                      bg: "bg-slate-700 text-white",
                    };
                    return (
                      <th
                        key={p.key}
                        className={`w-1/5 p-3.5 text-center font-extrabold uppercase tracking-wider ${style.bg} border-b border-r border-white/20 last:border-r-0`}
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          <span>{p.key.toUpperCase()}</span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {/* 1. Nama paket */}
                <tr className="hover:bg-muted/40 transition-colors">
                  <td className="p-3 font-semibold text-foreground bg-muted/20 border-r">Nama paket</td>
                  {plans.map((p) => (
                    <td key={p.key} className="p-3 text-center font-bold text-foreground border-r last:border-r-0">
                      {p.name}
                    </td>
                  ))}
                </tr>

                {/* 2. Harga bulanan */}
                <tr className="hover:bg-muted/40 transition-colors">
                  <td className="p-3 font-semibold text-emerald-800 dark:text-emerald-400 bg-muted/20 border-r">
                    Harga bulanan
                  </td>
                  {plans.map((p) => (
                    <td
                      key={p.key}
                      className="p-3 text-center font-bold text-emerald-700 dark:text-emerald-400 font-mono border-r last:border-r-0"
                    >
                      Rp {p.price.toLocaleString("id-ID")}
                    </td>
                  ))}
                </tr>

                {/* 3. Harga tahunan (per bulan) */}
                <tr className="hover:bg-muted/40 transition-colors">
                  <td className="p-3 font-semibold text-emerald-800 dark:text-emerald-400 bg-muted/20 border-r">
                    Harga tahunan (per bulan)
                  </td>
                  {plans.map((p) => (
                    <td
                      key={p.key}
                      className="p-3 text-center font-semibold text-emerald-700 dark:text-emerald-400 font-mono border-r last:border-r-0"
                    >
                      Rp {p.yearlyPrice.toLocaleString("id-ID")}
                    </td>
                  ))}
                </tr>

                {/* 4. Hemat bila tahunan */}
                <tr className="bg-amber-50/70 dark:bg-amber-950/20 hover:bg-amber-100/70 dark:hover:bg-amber-950/30 transition-colors font-medium">
                  <td className="p-3 font-bold text-amber-900 dark:text-amber-300 bg-amber-100/40 dark:bg-amber-950/40 border-r">
                    Hemat bila tahunan
                  </td>
                  {plans.map((p) => (
                    <td
                      key={p.key}
                      className="p-3 text-center font-bold text-amber-800 dark:text-amber-300 font-mono border-r last:border-r-0"
                    >
                      {p.yearlySavings}
                    </td>
                  ))}
                </tr>

                {/* 5. Kuota respons AI / bulan */}
                <tr className="hover:bg-muted/40 transition-colors">
                  <td className="p-3 font-semibold text-foreground bg-muted/20 border-r">
                    Kuota respons AI / bulan
                  </td>
                  {plans.map((p) => (
                    <td key={p.key} className="p-3 text-center font-mono font-bold border-r last:border-r-0">
                      {p.maxAiResponses.toLocaleString("id-ID")}
                    </td>
                  ))}
                </tr>

                {/* 6. MAU — kontak unik aktif / bulan */}
                <tr className="bg-amber-50/60 dark:bg-amber-950/20 hover:bg-amber-100/60 transition-colors">
                  <td className="p-3 font-bold text-foreground bg-amber-100/30 dark:bg-amber-950/40 border-r">
                    MAU — kontak unik aktif / bulan
                  </td>
                  {plans.map((p) => (
                    <td key={p.key} className="p-3 text-center font-mono font-bold border-r last:border-r-0">
                      {p.maxMau.toLocaleString("id-ID")}
                    </td>
                  ))}
                </tr>

                {/* 7. Nomor WhatsApp */}
                <tr className="hover:bg-muted/40 transition-colors">
                  <td className="p-3 font-semibold text-foreground bg-muted/20 border-r">Nomor WhatsApp</td>
                  {plans.map((p) => (
                    <td key={p.key} className="p-3 text-center font-mono font-bold border-r last:border-r-0">
                      {p.whatsappNumbers}
                    </td>
                  ))}
                </tr>

                {/* 8. Perumahan / proyek (siteplan) */}
                <tr className="hover:bg-muted/40 transition-colors">
                  <td className="p-3 font-semibold text-foreground bg-muted/20 border-r">
                    Perumahan / proyek (siteplan)
                  </td>
                  {plans.map((p) => (
                    <td key={p.key} className="p-3 text-center font-mono font-bold border-r last:border-r-0">
                      {p.maxProjects}
                    </td>
                  ))}
                </tr>

                {/* 9. Jumlah user (admin / sales) */}
                <tr className="hover:bg-muted/40 transition-colors">
                  <td className="p-3 font-semibold text-foreground bg-muted/20 border-r">
                    Jumlah user (admin / sales)
                  </td>
                  {plans.map((p) => (
                    <td key={p.key} className="p-3 text-center font-mono font-bold border-r last:border-r-0">
                      {p.maxUsers}
                    </td>
                  ))}
                </tr>

                {/* 10. Biaya setup per proyek */}
                <tr className="hover:bg-muted/40 transition-colors">
                  <td className="p-3 font-semibold text-foreground bg-muted/20 border-r">Biaya setup per proyek</td>
                  {plans.map((p) => (
                    <td key={p.key} className="p-3 text-center font-mono border-r last:border-r-0">
                      {p.setupFee === 0 ? "Rp 0" : `Rp ${p.setupFee.toLocaleString("id-ID")}`}
                    </td>
                  ))}
                </tr>

                {/* 11. Setup bila bayar tahunan */}
                <tr className="hover:bg-muted/40 transition-colors">
                  <td className="p-3 font-semibold text-foreground bg-muted/20 border-r">Setup bila bayar tahunan</td>
                  {plans.map((p) => (
                    <td key={p.key} className="p-3 text-center font-medium border-r last:border-r-0">
                      {p.yearlySetupDiscount}
                    </td>
                  ))}
                </tr>

                {/* 12. Trial gratis */}
                <tr className="hover:bg-muted/40 transition-colors">
                  <td className="p-3 font-semibold text-foreground bg-muted/20 border-r">Trial gratis</td>
                  {plans.map((p) => (
                    <td key={p.key} className="p-3 text-center border-r last:border-r-0">
                      {p.trialDays}
                    </td>
                  ))}
                </tr>

                {/* 13. Support */}
                <tr className="hover:bg-muted/40 transition-colors">
                  <td className="p-3 font-semibold text-foreground bg-muted/20 border-r">Support</td>
                  {plans.map((p) => (
                    <td key={p.key} className="p-3 text-center text-[11px] border-r last:border-r-0">
                      {p.support}
                    </td>
                  ))}
                </tr>

                {/* 14. Onboarding */}
                <tr className="hover:bg-muted/40 transition-colors">
                  <td className="p-3 font-semibold text-foreground bg-muted/20 border-r">Onboarding</td>
                  {plans.map((p) => (
                    <td key={p.key} className="p-3 text-center text-[11px] border-r last:border-r-0">
                      {p.onboarding}
                    </td>
                  ))}
                </tr>

                {/* 15. Rata-rata respons AI per MAU */}
                <tr className="hover:bg-muted/40 transition-colors">
                  <td className="p-3 font-semibold text-foreground bg-muted/20 border-r">
                    Rata-rata respons AI per MAU
                  </td>
                  {plans.map((p) => (
                    <td key={p.key} className="p-3 text-center font-mono border-r last:border-r-0">
                      {p.avgAiResponsePerMau}
                    </td>
                  ))}
                </tr>

                {/* Baris Tombol Aksi Edit */}
                <tr className="bg-muted/30">
                  <td className="p-3 font-bold text-foreground bg-muted/40 border-r">Aksi Konfigurasi</td>
                  {plans.map((p) => (
                    <td key={p.key} className="p-3 text-center border-r last:border-r-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingPlan({ ...p })}
                        className="h-8 text-xs gap-1.5 font-medium border-emerald-600/40 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                      >
                        <Pencil className="h-3 w-3 text-emerald-600" /> Edit {p.name.split("-")[0]}
                      </Button>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        /* CARDS VIEW */
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {plans.map((p) => {
            const style = TIER_HEADER_STYLES[p.key] || {
              bg: "bg-slate-700 text-white",
              text: "text-foreground",
              border: "border-border",
            };

            return (
              <Card
                key={p.key}
                className="flex flex-col justify-between hover:shadow-md transition-all border overflow-hidden"
              >
                <div>
                  <div className={`p-4 ${style.bg}`}>
                    <div className="flex items-center justify-between">
                      <h3 className="font-extrabold text-base tracking-wide uppercase">{p.key}</h3>
                      <Badge variant="secondary" className="text-[10px] uppercase font-mono">
                        {p.trialDays} trial
                      </Badge>
                    </div>
                    <p className="text-xs font-medium text-white/90 mt-1">{p.name}</p>
                  </div>

                  <div className="p-4 space-y-4">
                    {/* Harga */}
                    <div className="space-y-1 pb-3 border-b">
                      <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                        Rp {p.price.toLocaleString("id-ID")}
                        <span className="text-xs font-normal text-muted-foreground">/bln</span>
                      </p>
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>Tahunan (per bln):</span>
                        <span className="font-mono font-semibold text-foreground">
                          Rp {p.yearlyPrice.toLocaleString("id-ID")}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-amber-700 dark:text-amber-400 font-semibold">
                        <span>Hemat Tahunan:</span>
                        <span>{p.yearlySavings}</span>
                      </div>
                    </div>

                    {/* Kuota Utama */}
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between py-1 border-b border-border/40">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-blue-600" /> Kuota MAU
                        </span>
                        <span className="font-mono font-bold">{p.maxMau.toLocaleString("id-ID")} kontak</span>
                      </div>

                      <div className="flex items-center justify-between py-1 border-b border-border/40">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          <Zap className="h-3.5 w-3.5 text-emerald-600" /> Respons AI
                        </span>
                        <span className="font-mono font-bold">
                          {p.maxAiResponses.toLocaleString("id-ID")} pesan
                        </span>
                      </div>

                      <div className="flex items-center justify-between py-1 border-b border-border/40">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 text-indigo-600" /> Nomor WhatsApp
                        </span>
                        <span className="font-mono font-bold">{p.whatsappNumbers} nomor</span>
                      </div>

                      <div className="flex items-center justify-between py-1 border-b border-border/40">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-amber-600" /> Proyek / Siteplan
                        </span>
                        <span className="font-mono font-bold">{p.maxProjects} proyek</span>
                      </div>

                      <div className="flex items-center justify-between py-1 border-b border-border/40">
                        <span className="text-muted-foreground">Admin / Sales</span>
                        <span className="font-mono font-bold">{p.maxUsers} user</span>
                      </div>

                      <div className="flex items-center justify-between py-1 border-b border-border/40">
                        <span className="text-muted-foreground">Biaya Setup</span>
                        <span className="font-mono font-semibold">
                          {p.setupFee === 0 ? "Rp 0" : `Rp ${p.setupFee.toLocaleString("id-ID")}`}
                        </span>
                      </div>

                      <div className="flex items-center justify-between py-1 border-b border-border/40">
                        <span className="text-muted-foreground">Support</span>
                        <span className="text-[11px] font-medium text-right">{p.support}</span>
                      </div>

                      <div className="flex items-center justify-between py-1">
                        <span className="text-muted-foreground">Onboarding</span>
                        <span className="text-[11px] font-medium text-right">{p.onboarding}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 pt-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingPlan({ ...p })}
                    className="w-full text-xs gap-1.5 font-semibold border-emerald-600/40 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit Paket
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* DIALOG EDIT PAKET */}
      <Dialog open={!!editingPlan} onOpenChange={(open) => !open && setEditingPlan(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <form onSubmit={handleSavePlan}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <SlidersHorizontal className="h-5 w-5 text-emerald-600" />
                Edit Paket: {editingPlan?.name} ({editingPlan?.key.toUpperCase()})
              </DialogTitle>
              <DialogDescription className="text-xs">
                Sesuaikan batas kuota, benefit, dan penetapan harga paket SaaS.
              </DialogDescription>
            </DialogHeader>

            {editingPlan && (
              <div className="space-y-4 py-3 text-xs">
                {/* Bagian 1: Identitas & Harga */}
                <div className="p-3 rounded-xl border bg-muted/20 space-y-3">
                  <h4 className="font-bold text-xs uppercase tracking-wide text-foreground">
                    1. Identitas &amp; Harga Langganan
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>Nama Paket</Label>
                      <Input
                        value={editingPlan.name}
                        onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                        className="h-8 text-xs font-semibold"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Deskripsi Singkat</Label>
                      <Input
                        value={editingPlan.desc || ""}
                        onChange={(e) => setEditingPlan({ ...editingPlan, desc: e.target.value })}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Harga Bulanan (Rp)</Label>
                      <Input
                        type="number"
                        value={editingPlan.price}
                        onChange={(e) => {
                          const p = parseInt(e.target.value) || 0;
                          setEditingPlan({
                            ...editingPlan,
                            price: p,
                            priceLabel: `Rp ${p.toLocaleString("id-ID")}`,
                          });
                        }}
                        className="h-8 text-xs font-mono"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Harga Tahunan (per bulan, Rp)</Label>
                      <Input
                        type="number"
                        value={editingPlan.yearlyPrice}
                        onChange={(e) => {
                          const yp = parseInt(e.target.value) || 0;
                          setEditingPlan({
                            ...editingPlan,
                            yearlyPrice: yp,
                            yearlyPriceLabel: `Rp ${yp.toLocaleString("id-ID")}`,
                          });
                        }}
                        className="h-8 text-xs font-mono"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Hemat bila tahunan (%)</Label>
                      <Input
                        value={editingPlan.yearlySavings}
                        onChange={(e) => setEditingPlan({ ...editingPlan, yearlySavings: e.target.value })}
                        className="h-8 text-xs font-mono"
                        placeholder="15.0%"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Biaya Setup per Proyek (Rp)</Label>
                      <Input
                        type="number"
                        value={editingPlan.setupFee}
                        onChange={(e) => {
                          const fee = parseInt(e.target.value) || 0;
                          setEditingPlan({
                            ...editingPlan,
                            setupFee: fee,
                            setupFeeLabel: fee === 0 ? "Rp 0" : `Rp ${fee.toLocaleString("id-ID")}`,
                          });
                        }}
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Bagian 2: Kuota & Kapasitas */}
                <div className="p-3 rounded-xl border bg-muted/20 space-y-3">
                  <h4 className="font-bold text-xs uppercase tracking-wide text-foreground">
                    2. Kapasitas &amp; Kuota Penggunaan
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label>Maks. MAU (Kontak Unik)</Label>
                      <Input
                        type="number"
                        value={editingPlan.maxMau}
                        onChange={(e) =>
                          setEditingPlan({ ...editingPlan, maxMau: parseInt(e.target.value) || 0 })
                        }
                        className="h-8 text-xs font-mono"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Maks. Respons AI (Pesan)</Label>
                      <Input
                        type="number"
                        value={editingPlan.maxAiResponses}
                        onChange={(e) =>
                          setEditingPlan({ ...editingPlan, maxAiResponses: parseInt(e.target.value) || 0 })
                        }
                        className="h-8 text-xs font-mono"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Rata-rata respons/MAU</Label>
                      <Input
                        value={editingPlan.avgAiResponsePerMau}
                        onChange={(e) =>
                          setEditingPlan({ ...editingPlan, avgAiResponsePerMau: e.target.value })
                        }
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Nomor WhatsApp</Label>
                      <Input
                        type="number"
                        value={editingPlan.whatsappNumbers}
                        onChange={(e) =>
                          setEditingPlan({ ...editingPlan, whatsappNumbers: parseInt(e.target.value) || 1 })
                        }
                        className="h-8 text-xs font-mono"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Perumahan / Proyek (Siteplan)</Label>
                      <Input
                        type="number"
                        value={editingPlan.maxProjects}
                        onChange={(e) =>
                          setEditingPlan({ ...editingPlan, maxProjects: parseInt(e.target.value) || 1 })
                        }
                        className="h-8 text-xs font-mono"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Jumlah User (Admin / Sales)</Label>
                      <Input
                        type="number"
                        value={editingPlan.maxUsers}
                        onChange={(e) =>
                          setEditingPlan({ ...editingPlan, maxUsers: parseInt(e.target.value) || 1 })
                        }
                        className="h-8 text-xs font-mono"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Bagian 3: Layanan & Ketentuan */}
                <div className="p-3 rounded-xl border bg-muted/20 space-y-3">
                  <h4 className="font-bold text-xs uppercase tracking-wide text-foreground">
                    3. Layanan, Onboarding &amp; Dukungan
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>Support</Label>
                      <Input
                        value={editingPlan.support}
                        onChange={(e) => setEditingPlan({ ...editingPlan, support: e.target.value })}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Onboarding</Label>
                      <Input
                        value={editingPlan.onboarding}
                        onChange={(e) => setEditingPlan({ ...editingPlan, onboarding: e.target.value })}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Setup Bila Bayar Tahunan</Label>
                      <Input
                        value={editingPlan.yearlySetupDiscount}
                        onChange={(e) =>
                          setEditingPlan({ ...editingPlan, yearlySetupDiscount: e.target.value })
                        }
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Trial Gratis</Label>
                      <Input
                        value={editingPlan.trialDays}
                        onChange={(e) => setEditingPlan({ ...editingPlan, trialDays: e.target.value })}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" size="sm" onClick={() => setEditingPlan(null)}>
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Save className="h-3.5 w-3.5 mr-1.5" /> {saving ? "Menyimpan..." : "Simpan Perubahan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
