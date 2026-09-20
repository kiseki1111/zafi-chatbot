"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/auth-store";
import { useAppStore } from "@/lib/app-store";
import { cn } from "@/lib/utils";
import {
  Bot, Brain, MessageCircle, Phone, Smartphone,
  Settings, ArrowRight, CheckCircle2, XCircle,
  Loader2, RefreshCw, BookOpen, Zap, Activity,
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
    try {
      // 1. Tenant dashboard
      const dashRes = await fetch(`/api/v1/tenant/${user?.tenantId || user?.id || "demo"}/dashboard`);
      if (dashRes.ok) {
        const dash = await dashRes.json();
        if (dash?.tenant) setTenant(dash.tenant);
        if (dash?.metrics) setMetrics(dash.metrics);
      }

      // 2. WhatsApp sessions (terisolasi per tenant)
      const waQuery = user?.tenantId && user.role !== 'superadmin' ? `?tenantId=${user.tenantId}` : '';
      const waRes = await fetch(`/api/v1/waha/instances${waQuery}`);
      if (waRes.ok) {
        const waData = await waRes.json();
        const list = Array.isArray(waData) ? waData : (waData?.data ?? []);
        setSessions(list.map((s: any) => ({
          id: s.name,
          name: s.name,
          status: s.status?.toLowerCase() ?? "stopped",
        })));
      }

      // 3. Knowledge count (tenantId from auth)
      if (user?.tenantId) {
        const kbRes = await fetch(`/api/v1/knowledge?tenantId=${user.tenantId}`);
        if (kbRes.ok) {
          const kb = await kbRes.json();
          const data = kb?.data?.data ?? kb?.data ?? kb;
          setKnowledgeCount(Array.isArray(data) ? data.length : 0);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const activeSessions = sessions.filter(s => s.status === "working" || s.status === "connected");
  const totalSessions = sessions.length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        <p className="text-sm text-muted-foreground">Memuat dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-green-700 px-6 py-6 text-white shadow-xl">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%23ffffff%22 fill-opacity=%220.05%22%3E%3Cpath d=%22M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]" />
        <div className="relative flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-white/20 p-3 backdrop-blur-sm shrink-0">
              <Activity className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Halo, {user?.name?.split(" ")[0]} 👋
              </h1>
              <p className="mt-0.5 text-sm text-emerald-100">
                Berikut ringkasan sistem AI Chatbot{tenant?.name ? ` untuk ${tenant.name}` : ""}.
              </p>
            </div>
          </div>
          <Button
            onClick={loadAll}
            className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm shrink-0"
            size="sm"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs">Sesi WhatsApp Aktif</CardDescription>
              <div className="h-8 w-8 rounded-lg grid place-items-center bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600">
                <Phone className="h-4 w-4" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight mt-1">
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs">Knowledge Base</CardDescription>
              <div className="h-8 w-8 rounded-lg grid place-items-center bg-teal-100 dark:bg-teal-950/40 text-teal-600">
                <Brain className="h-4 w-4" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight mt-1">{knowledgeCount}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">item tersimpan untuk AI</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs">Total Pesan</CardDescription>
              <div className="h-8 w-8 rounded-lg grid place-items-center bg-amber-100 dark:bg-amber-950/40 text-amber-600">
                <MessageCircle className="h-4 w-4" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight mt-1">
              {metrics?.totalChats ?? "–"}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">pesan masuk tercatat</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs">AI Success Rate</CardDescription>
              <div className="h-8 w-8 rounded-lg grid place-items-center bg-violet-100 dark:bg-violet-950/40 text-violet-600">
                <Zap className="h-4 w-4" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight mt-1">
              {metrics?.botSuccessRate ?? "–"}
              {metrics?.botSuccessRate != null && <span className="text-sm font-normal">%</span>}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">pesan terselesaikan oleh bot</p>
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
                      className="flex items-center justify-between rounded-lg border p-3"
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
                          "text-[11px]",
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
              <button
                onClick={() => setView("chatbot")}
                className="w-full flex items-center justify-between rounded-lg border p-3 text-sm hover:bg-muted/50 transition-colors text-left"
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
                className="w-full flex items-center justify-between rounded-lg border p-3 text-sm hover:bg-muted/50 transition-colors text-left"
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
                className="w-full flex items-center justify-between rounded-lg border p-3 text-sm hover:bg-muted/50 transition-colors text-left"
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
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-sm">
              <Bot className="h-4 w-4 text-emerald-600" />
              <span className="font-medium">Status Sistem</span>
            </div>
            <div className="flex items-center gap-4 flex-wrap ml-auto text-xs text-muted-foreground">
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
