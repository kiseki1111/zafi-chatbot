"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useAppStore } from "@/lib/app-store";
import { toast } from "sonner";
import {
  Activity, RefreshCw, AlertTriangle, CheckCircle2,
  TrendingUp, Users, Zap, Building2, ArrowRight,
} from "lucide-react";

interface QuotaClient {
  id: string;
  name: string;
  plan: string;
  maxMau: number;
  maxAiResponses: number;
  mauUsed: number;
  aiUsed: number;
  mauPercent: number;
  aiPercent: number;
  instances: number;
}

export function QuotaMonitorPage() {
  const { setView } = useAppStore();
  const [clients, setClients] = useState<QuotaClient[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchQuotaOverview = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/platform/quota-overview");
      const json = await res.json();
      const list = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
      setClients(list);
    } catch {
      toast.error("Gagal mengambil data kuota platform");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotaOverview();
  }, []);

  // Filter klien yang hampir habis (>80%)
  const nearLimit = clients.filter(
    (c) => (c.maxMau > 0 && c.mauPercent >= 80) || (c.maxAiResponses > 0 && c.aiPercent >= 80)
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Pemantauan Kuota & Penggunaan</h2>
          <p className="text-xs text-muted-foreground">
            Monitor kapasitas Monthly Active Users (MAU) dan kuota respons AI per perusahaan klien
          </p>
        </div>
        <Button onClick={fetchQuotaOverview} variant="outline" size="sm" className="h-8 text-xs gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      {/* Warning banner jika ada klien hampir over-quota */}
      {nearLimit.length > 0 && (
        <div className="p-4 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-bold">
              Perhatian: {nearLimit.length} Klien Mendekati / Melebihi Batas Kuota (&gt;80%)
            </p>
            <p className="opacity-90">
              Klien ini berpotensi mengalami pemutusan auto-reply jika kuota habis. Pertimbangkan untuk upgrade paket langganan mereka.
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-5 space-y-3">
              <div className="flex justify-between items-center">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </Card>
          ))}
        </div>
      ) : clients.length === 0 ? (
        <Card className="p-12 text-center text-xs text-muted-foreground">
          Belum ada perusahaan klien yang terdaftar.
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {clients.map((c) => {
            const isNearMau = c.maxMau > 0 && c.mauPercent >= 80;
            const isNearAi = c.maxAiResponses > 0 && c.aiPercent >= 80;

            return (
              <Card key={c.id} className="p-5 space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <div className="space-y-0.5">
                    <p className="font-bold text-sm text-foreground flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-emerald-600" />
                      {c.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {c.instances} Sesi WhatsApp tertaut
                    </p>
                  </div>
                  <Badge variant="outline" className="uppercase text-[10px] font-bold bg-muted/40">
                    Paket: {c.plan}
                  </Badge>
                </div>

                {/* MAU Progress */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Users className="h-3 w-3" /> Pengguna Aktif (MAU)
                    </span>
                    <span className="font-mono text-[11px] font-semibold">
                      {c.mauUsed} / {c.maxMau > 0 ? c.maxMau : "Unlimited"} ({c.mauPercent}%)
                    </span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        isNearMau ? "bg-rose-500" : "bg-emerald-500"
                      }`}
                      style={{ width: `${Math.min(c.mauPercent, 100)}%` }}
                    />
                  </div>
                </div>

                {/* AI Responses Progress */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Zap className="h-3 w-3" /> Respons AI Bulanan
                    </span>
                    <span className="font-mono text-[11px] font-semibold">
                      {c.aiUsed} / {c.maxAiResponses > 0 ? c.maxAiResponses : "Unlimited"} ({c.aiPercent}%)
                    </span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        isNearAi ? "bg-rose-500" : "bg-indigo-500"
                      }`}
                      style={{ width: `${Math.min(c.aiPercent, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="pt-1 flex justify-end">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setView("clients")}
                    className="h-7 text-xs text-emerald-600 gap-1"
                  >
                    Kelola Kuota di Klien <ArrowRight className="h-3 w-3" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
