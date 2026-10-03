"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/lib/auth-store";
import { useAppStore } from "@/lib/app-store";
import { MOCK_TENANT, MOCK_METRICS, MOCK_SESSIONS } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import {
  Bot, Brain, MessageCircle, Phone, Smartphone,
  Settings, ArrowRight, CheckCircle2, XCircle,
  Loader2, RefreshCw, BookOpen, Zap, Activity, Sparkles,
} from "lucide-react";

interface TenantData {
  name: string;
  agentName: string;
  agentTone: string;
  phone: string;
  category: string;
}

interface Metrics {
  knowledgeCount: number;
  totalChats: number;
  botSuccessRate: number;
}

interface WaSession {
  id: string;
  name: string;
  status: string;
}

export function OverviewPage() {
  const { user } = useAuthStore();
  const { setView } = useAppStore();

  const [tenant, setTenant] = useState<TenantData | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [sessions, setSessions] = useState<WaSession[]>([]);
  const [knowledgeCount, setKnowledgeCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAll();
  }, [user?.id, user?.tenantId]);

  async function loadAll() {
    setLoading(true);
    let loadedTenant: TenantData | null = null;
    let loadedMetrics: Metrics | null = null;
    let loadedSessions: WaSession[] = [];
    let loadedKbCount = 0;

    try {
      // 1. Tenant dashboard
      const dashRes = await fetch(`/api/v1/tenant/${user?.tenantId || user?.id || "demo"}/dashboard`);
      if (dashRes.ok) {
        const dash = await dashRes.json();
        if (dash?.tenant) loadedTenant = dash.tenant;
        if (dash?.metrics) loadedMetrics = dash.metrics;
      }
    } catch {}

    try {
      // 2. WhatsApp sessions (terisolasi per tenant)
      const waQuery = user?.tenantId && user.role !== 'superadmin' ? `?tenantId=${user.tenantId}` : '';
      const waRes = await fetch(`/api/v1/waha/instances${waQuery}`);
      if (waRes.ok) {
        const waData = await waRes.json();
        const list = Array.isArray(waData) ? waData : (waData?.data ?? []);
        if (list.length > 0) {
          loadedSessions = list.map((s: any) => ({
            id: s.name,
            name: s.name,
            status: s.status?.toLowerCase() ?? "stopped",
          }));
        }
      }
    } catch {}

    try {
      // 3. Knowledge count (tenantId from auth)
      if (user?.tenantId) {
        const kbRes = await fetch(`/api/v1/knowledge?tenantId=${user.tenantId}`);
        if (kbRes.ok) {
          const kb = await kbRes.json();
          const data = kb?.data?.data ?? kb?.data ?? kb;
          loadedKbCount = Array.isArray(data) ? data.length : 0;
        }
      }
    } catch {}

    const isDemo =
      user?.id?.startsWith("u-") ||
      user?.email?.includes("demo") ||
      (process.env.NODE_ENV !== "production" && !user?.tenantId);

    const defaultEmptyMetrics: Metrics = {
      activeSessions: 0,
      totalSessions: 0,
      knowledgeCount: 0,
      totalChats: 0,
      botSuccessRate: 100,
    };

    setTenant(loadedTenant || (isDemo ? MOCK_TENANT : { id: user?.tenantId || "", name: user?.name || "Toko Saya" }));
    setMetrics(loadedMetrics || (isDemo ? MOCK_METRICS : defaultEmptyMetrics));
    setSessions(loadedSessions.length > 0 ? loadedSessions : (isDemo ? MOCK_SESSIONS : []));
    setKnowledgeCount(loadedKbCount || (isDemo ? MOCK_METRICS.knowledgeCount : 0));
    setLoading(false);
  }

  const activeSessions = sessions.filter(s => s.status === "working" || s.status === "connected");
  const totalSessions = sessions.length;

  if (loading) {
    return (
      <div className="space-y-5">
        {/* Banner Skeleton */}
        <div className="rounded-xl border p-5 bg-card flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3.5 w-64" />
            </div>
          </div>
          <Skeleton className="h-8 w-20 rounded-md" />
        </div>

        {/* 4 KPI Cards Skeleton */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-8 w-8 rounded-lg" />
              </div>
              <Skeleton className="h-7 w-16" />
              <Skeleton className="h-3 w-28" />
            </Card>
          ))}
        </div>

        {/* Main Content Skeleton */}
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2 p-5 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-8 w-24" />
            </div>
            <div className="space-y-3 pt-2">
              {[1, 2].map((i) => (
                <div key={i} className="p-4 rounded-xl border flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-xl" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                  <Skeleton className="h-8 w-24 rounded-md" />
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5 space-y-4">
            <div className="space-y-1.5 border-b pb-3">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-40" />
            </div>
            <div className="space-y-3 pt-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-3 rounded-lg border space-y-2">
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="h-3 w-full" />
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      {/* Welcome Banner - Compact & Clean */}
      <div className="rounded-xl border bg-card p-4 sm:p-5 shadow-xs">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="rounded-lg bg-emerald-100 dark:bg-emerald-950/40 p-2.5 text-emerald-600 shrink-0">
              <Activity className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground truncate flex items-center gap-1.5">
                <span>Halo, {user?.name?.split(" ")[0]}</span>
                <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              </h1>
              <p className="text-xs text-muted-foreground truncate">
                {tenant?.name || "Dasbor Asisten AI"}
              </p>
            </div>
          </div>
          <Button
            onClick={loadAll}
            variant="outline"
            className="shrink-0 h-8 text-xs gap-1.5 px-2.5"
            size="sm"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {/* Empty State Banner jika belum ada bot WA */}
      {totalSessions === 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/90 dark:border-amber-900/50 dark:bg-amber-950/20 p-4 text-amber-900 dark:text-amber-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-amber-100 dark:bg-amber-900/50 p-2 shrink-0 text-amber-700 dark:text-amber-300">
              <Smartphone className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-sm">Nomor WhatsApp Belum Terhubung</p>
              <p className="text-xs text-amber-700/80 dark:text-amber-300/80 mt-0.5">
                Hubungkan nomor WhatsApp toko Anda agar AI dapat mulai melayani pesan pelanggan otomatis 24/7.
              </p>
            </div>
          </div>
          <Button
            onClick={() => setView("settings")}
            className="bg-amber-600 hover:bg-amber-700 text-white shrink-0 h-8 text-xs gap-1.5"
            size="sm"
          >
            Hubungkan WhatsApp Sekarang
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="group hover:-translate-y-1 hover:shadow-md hover:border-emerald-500/40 transition-all duration-200 ease-out cursor-default">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs">Sesi WhatsApp Aktif</CardDescription>
              <div className="h-10 w-10 sm:h-8 sm:w-8 rounded-lg grid place-items-center bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 group-hover:scale-110 transition-transform duration-200 ease-out">
                <Phone className="h-5 w-5 sm:h-4 sm:w-4" />
              </div>
            </div>
            <CardTitle className="text-3xl sm:text-2xl font-bold tracking-tight mt-1">
              {activeSessions.length}
              <span className="text-sm font-normal text-muted-foreground ml-1">/ {totalSessions}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">
              {activeSessions.length > 0 ? (
                <span className="text-emerald-600 font-medium">● Online</span>
              ) : (
                <span className="text-rose-500 font-medium">● Tidak ada sesi aktif</span>
              )}
            </p>
            <p className="text-[11px] text-muted-foreground/70 mt-0.5">bulan ini</p>
          </CardContent>
        </Card>

        <Card className="group hover:-translate-y-1 hover:shadow-md hover:border-teal-500/40 transition-all duration-200 ease-out cursor-default">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs">Knowledge Base</CardDescription>
              <div className="h-10 w-10 sm:h-8 sm:w-8 rounded-lg grid place-items-center bg-teal-100 dark:bg-teal-950/40 text-teal-600 group-hover:scale-110 transition-transform duration-200 ease-out">
                <Brain className="h-5 w-5 sm:h-4 sm:w-4" />
              </div>
            </div>
            <CardTitle className="text-3xl sm:text-2xl font-bold tracking-tight mt-1">{knowledgeCount}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">item tersimpan untuk AI</p>
            <p className="text-[11px] text-muted-foreground/70 mt-0.5">bulan ini</p>
          </CardContent>
        </Card>

        <Card className="group hover:-translate-y-1 hover:shadow-md hover:border-amber-500/40 transition-all duration-200 ease-out cursor-default">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs">Total Pesan</CardDescription>
              <div className="h-10 w-10 sm:h-8 sm:w-8 rounded-lg grid place-items-center bg-amber-100 dark:bg-amber-950/40 text-amber-600 group-hover:scale-110 transition-transform duration-200 ease-out">
                <MessageCircle className="h-5 w-5 sm:h-4 sm:w-4" />
              </div>
            </div>
            <CardTitle className="text-3xl sm:text-2xl font-bold tracking-tight mt-1">
              {metrics?.totalChats != null ? metrics.totalChats : 0}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">pesan masuk tercatat</p>
            <p className="text-[11px] text-muted-foreground/70 mt-0.5">bulan ini</p>
          </CardContent>
        </Card>

        <Card className="group hover:-translate-y-1 hover:shadow-md hover:border-violet-500/40 transition-all duration-200 ease-out cursor-default">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs">AI Success Rate</CardDescription>
              <div className="h-10 w-10 sm:h-8 sm:w-8 rounded-lg grid place-items-center bg-violet-100 dark:bg-violet-950/40 text-violet-600 group-hover:scale-110 transition-transform duration-200 ease-out">
                <Zap className="h-5 w-5 sm:h-4 sm:w-4" />
              </div>
            </div>
            <CardTitle className="text-3xl sm:text-2xl font-bold tracking-tight mt-1">
              {metrics?.botSuccessRate != null ? (
                <>
                  {metrics.botSuccessRate}
                  <span className="text-sm font-normal text-muted-foreground ml-0.5">%</span>
                </>
              ) : (
                <span className="text-base font-medium text-muted-foreground">100%</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">akurasi jawaban otomatis</p>
            <p className="text-[11px] text-muted-foreground/70 mt-0.5">bulan ini</p>
          </CardContent>
        </Card>
      </div>

      {/* Main content */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* WhatsApp Sessions */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Sesi WhatsApp</CardTitle>
                <CardDescription>Status koneksi channel bot Anda</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-emerald-600 hover:text-emerald-700"
                onClick={() => setView("settings")}
              >
                Kelola <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {sessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <div className="h-12 w-12 rounded-full bg-muted grid place-items-center">
                  <Smartphone className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  Belum ada sesi WhatsApp terdaftar.<br />
                  <button
                    onClick={() => setView("settings")}
                    className="text-emerald-600 hover:underline font-medium"
                  >
                    Tambah sesi sekarang →
                  </button>
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {sessions.map((s) => {
                  const isOnline = s.status === "working" || s.status === "connected";
                  const isStarting = s.status === "starting";
                  return (
                    <div
                      key={s.id}
                      className="flex items-center justify-between rounded-lg border p-3 min-h-[56px]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="h-9 w-9 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 grid place-items-center">
                            <Smartphone className="h-4 w-4 text-emerald-600" />
                          </div>
                          <span
                            className={cn(
                              "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-background",
                              isOnline ? "bg-emerald-500" : isStarting ? "bg-amber-500" : "bg-rose-400"
                            )}
                          />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{s.name}</p>
                          <p className="text-xs text-muted-foreground capitalize">{s.status}</p>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs sm:text-[11px] px-2.5 py-0.5 sm:px-2 sm:py-0",
                          isOnline
                            ? "text-emerald-600 border-emerald-200 dark:border-emerald-800"
                            : isStarting
                            ? "text-amber-600 border-amber-200"
                            : "text-rose-500 border-rose-200"
                        )}
                      >
                        {isOnline ? "Online" : isStarting ? "Menghubungkan..." : "Offline"}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right column */}
        <div className="space-y-4">
          {/* Profil Asisten */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 grid place-items-center">
                  <Bot className="h-4 w-4 text-emerald-600" />
                </div>
                <CardTitle className="text-base">Profil Asisten</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {tenant ? (
                <>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Nama Bot</span>
                    <span className="font-medium">{tenant.agentName || "–"}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Nama Toko</span>
                    <span className="font-medium truncate max-w-[140px]">{tenant.name || "–"}</span>
                  </div>
                  {tenant.phone && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">No. Admin</span>
                      <span className="font-medium">{tenant.phone}</span>
                    </div>
                  )}
                  {tenant.agentTone && (
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground mb-1">Gaya Bahasa</p>
                      <p className="text-xs text-foreground leading-relaxed line-clamp-2">{tenant.agentTone}</p>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Data belum tersedia.</p>
              )}
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2"
                onClick={() => setView("settings")}
              >
                <Settings className="h-3.5 w-3.5" />
                Edit Pengaturan
              </Button>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Aksi Cepat</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {/* Prominent "Mulai Chat" CTA for mobile */}
              <button
                onClick={() => setView("chatbot")}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white p-3 min-h-[56px] text-sm font-semibold transition-colors sm:hidden"
              >
                <MessageCircle className="h-5 w-5" />
                Mulai Chat
              </button>

              <button
                onClick={() => setView("chatbot")}
                className="w-full flex items-center justify-between rounded-lg border p-3 min-h-[56px] text-sm hover:bg-muted/50 transition-colors text-left"
              >
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-md bg-emerald-100 dark:bg-emerald-950/40 grid place-items-center">
                    <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
                  </div>
                  <span className="font-medium">Buka Bot WhatsApp</span>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </button>

              <button
                onClick={() => setView("knowledge")}
                className="w-full flex items-center justify-between rounded-lg border p-3 min-h-[56px] text-sm hover:bg-muted/50 transition-colors text-left"
              >
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-md bg-teal-100 dark:bg-teal-950/40 grid place-items-center">
                    <BookOpen className="h-3.5 w-3.5 text-teal-600" />
                  </div>
                  <span className="font-medium">Tambah Knowledge</span>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </button>

              <button
                onClick={() => setView("settings")}
                className="w-full flex items-center justify-between rounded-lg border p-3 min-h-[56px] text-sm hover:bg-muted/50 transition-colors text-left"
              >
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-md bg-amber-100 dark:bg-amber-950/40 grid place-items-center">
                    <Settings className="h-3.5 w-3.5 text-amber-600" />
                  </div>
                  <span className="font-medium">Pengaturan Asisten</span>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Status ringkas bot */}
      <Card>
        <CardContent className="py-4 px-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2 text-sm sm:text-sm">
              <Bot className="h-4 w-4 text-emerald-600" />
              <span className="font-medium">Status Sistem</span>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 sm:ml-auto text-sm sm:text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                {activeSessions.length > 0 ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 text-rose-400" />
                )}
                WhatsApp {activeSessions.length > 0 ? "terhubung" : "terputus"}
              </span>
              <span className="flex items-center gap-1.5">
                {knowledgeCount > 0 ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 text-amber-400" />
                )}
                Knowledge Base {knowledgeCount > 0 ? `${knowledgeCount} item` : "kosong"}
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                AI Engine aktif
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
