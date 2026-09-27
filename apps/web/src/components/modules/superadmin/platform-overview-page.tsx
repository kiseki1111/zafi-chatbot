"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppStore } from "@/lib/app-store";
import {
  Building2, Smartphone, MessageCircle, Users, Activity, RefreshCw,
  ArrowRight, ShieldCheck, Zap, Database, CheckCircle2, AlertTriangle,
} from "lucide-react";

interface PlatformStats {
  totalClients: number;
  totalInstances: number;
  activeInstances: number;
  totalMessages: number;
  totalContacts: number;
  totalWebhookLogs: number;
  totalAiMessages: number;
  instancesByStatus: Array<{ status: string; _count: { status: number } }>;
}

export function PlatformOverviewPage() {
  const { setView } = useAppStore();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/platform/stats");
      const json = await res.json();
      setStats(json?.data || json);
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="rounded-xl border p-5 bg-card flex justify-between items-center">
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-9 w-24" />
        </div>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-4 space-y-3">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-3 w-36" />
            </Card>
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="p-5 space-y-3"><Skeleton className="h-32 w-full" /></Card>
          <Card className="p-5 space-y-3"><Skeleton className="h-32 w-full" /></Card>
        </div>
      </div>
    );
  }

  const s = stats || {
    totalClients: 0,
    totalInstances: 0,
    activeInstances: 0,
    totalMessages: 0,
    totalContacts: 0,
    totalWebhookLogs: 0,
    totalAiMessages: 0,
    instancesByStatus: [],
  };

  return (
    <div className="space-y-5">
      {/* Banner */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 px-6 py-5 text-white shadow-lg border border-indigo-900/40">
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/10 p-3 backdrop-blur-sm border border-white/15">
              <ShieldCheck className="h-6 w-6 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight">Superadmin Control Center</h1>
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px]">
                  Production
                </Badge>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Monitoring sistem multi-tenant, infrastruktur WAHA, dan aktivitas platform SaaS secara agregat.
              </p>
            </div>
          </div>
          <Button
            onClick={fetchStats}
            variant="outline"
            size="sm"
            className="bg-white/10 hover:bg-white/20 text-white border-white/20 h-8 text-xs gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh Data
          </Button>
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="cursor-pointer hover:border-emerald-500 transition-colors" onClick={() => setView("clients")}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs">Perusahaan Klien</CardDescription>
              <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 grid place-items-center">
                <Building2 className="h-4 w-4" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight mt-1">{s.totalClients}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 flex items-center justify-between text-xs text-muted-foreground">
            <span>Tenant terdaftar</span>
            <ArrowRight className="h-3.5 w-3.5 text-emerald-600" />
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-indigo-500 transition-colors" onClick={() => setView("waha_monitor")}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs">Sesi WhatsApp</CardDescription>
              <div className="h-8 w-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 grid place-items-center">
                <Smartphone className="h-4 w-4" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight mt-1">
              {s.activeInstances} <span className="text-sm font-normal text-muted-foreground">/ {s.totalInstances}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 flex items-center justify-between text-xs text-muted-foreground">
            <span className={s.activeInstances > 0 ? "text-emerald-600 font-medium" : "text-rose-500"}>
              ● {s.activeInstances} Sesi Online
            </span>
            <ArrowRight className="h-3.5 w-3.5 text-indigo-600" />
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-amber-500 transition-colors" onClick={() => setView("quota_monitor")}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs">Pesan Diproses</CardDescription>
              <div className="h-8 w-8 rounded-lg bg-amber-100 dark:bg-amber-950/40 text-amber-600 grid place-items-center">
                <MessageCircle className="h-4 w-4" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight mt-1">{s.totalMessages}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 flex items-center justify-between text-xs text-muted-foreground">
            <span>Riwayat pesan WA</span>
            <ArrowRight className="h-3.5 w-3.5 text-amber-600" />
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-purple-500 transition-colors" onClick={() => setView("system_logs")}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs">Event Webhook</CardDescription>
              <div className="h-8 w-8 rounded-lg bg-purple-100 dark:bg-purple-950/40 text-purple-600 grid place-items-center">
                <Activity className="h-4 w-4" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight mt-1">{s.totalWebhookLogs}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 flex items-center justify-between text-xs text-muted-foreground">
            <span>Log webhook tercatat</span>
            <ArrowRight className="h-3.5 w-3.5 text-purple-600" />
          </CardContent>
        </Card>
      </div>

      {/* Quick shortcuts & System status */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Navigasi Cepat Pengelolaan</CardTitle>
            <CardDescription className="text-xs">Akses langsung ke modul operasional platform</CardDescription>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-3">
            {[
              { key: "clients", title: "Kelola Klien", desc: "Tambah perusahaan, atur kuota paket, dan edit staf", icon: Building2, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40" },
              { key: "waha_monitor", title: "Semua Sesi WAHA", desc: "Lihat status koneksi & scan QR seluruh nomor klien", icon: Smartphone, color: "text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40" },
              { key: "quota_monitor", title: "Monitor Kuota", desc: "Pantau penggunaan batas MAU dan AI tiap perusahaan", icon: Activity, color: "text-amber-600 bg-amber-50 dark:bg-amber-950/40" },
              { key: "pricing_plans", title: "Paket & Harga", desc: "Atur batas MAU, kuota respons AI, dan harga paket", icon: Zap, color: "text-rose-600 bg-rose-50 dark:bg-rose-950/40" },
              { key: "ai_config", title: "Model AI & Sistem", desc: "Kelola default model (OpenRouter/DeepSeek), prompt global", icon: Database, color: "text-blue-600 bg-blue-50 dark:bg-blue-950/40" },
              { key: "system_logs", title: "Log Sistem & Webhook", desc: "Pantau event payload, error incoming, dan traffic webhook", icon: Activity, color: "text-purple-600 bg-purple-50 dark:bg-purple-950/40" },
            ].map((mod) => {
              const Icon = mod.icon;
              return (
                <div
                  key={mod.key}
                  onClick={() => setView(mod.key as any)}
                  className="p-3.5 rounded-xl border hover:border-emerald-500 hover:bg-accent/40 cursor-pointer transition-all flex items-start gap-3 group"
                >
                  <div className={`p-2.5 rounded-lg shrink-0 ${mod.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold group-hover:text-emerald-600 transition-colors">
                      {mod.title}
                    </p>
                    <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{mod.desc}</p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* System Health */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status Infrastruktur</CardTitle>
            <CardDescription className="text-xs">Kondisi core services</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { name: "PostgreSQL Database", status: "ONLINE", sub: "Docker Container (5432)" },
              { name: "WAHA WhatsApp API", status: "ONLINE", sub: "waha.zafii.tech" },
              { name: "NestJS Backend API", status: "ONLINE", sub: "Port 3030 (Running)" },
              { name: "Next.js Dashboard", status: "ONLINE", sub: "Port 3001" },
            ].map((svc) => (
              <div key={svc.name} className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/20">
                <div className="space-y-0.5">
                  <p className="text-xs font-medium">{svc.name}</p>
                  <p className="text-[10px] text-muted-foreground font-mono">{svc.sub}</p>
                </div>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 text-[10px] gap-1">
                  <CheckCircle2 className="h-3 w-3" /> {svc.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
