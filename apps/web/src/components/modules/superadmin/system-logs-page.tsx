"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Activity,
  RefreshCw,
  Search,
  Code,
  Terminal,
  Clock,
  Brain,
  Zap,
  Coins,
  CheckCircle2,
  XCircle,
  ExternalLink,
} from "lucide-react";

interface WebhookLogItem {
  id: string;
  instanceName: string;
  event: string;
  payload: any;
  createdAt: string;
}

interface AiLogItem {
  id: string;
  model: string;
  durationMs: number;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  status: "SUCCESS" | "FAILED";
  error?: string;
  timestamp: string;
}

interface OpenRouterStats {
  configured: boolean;
  label?: string;
  totalCredits?: number;
  totalUsage?: number;
  remainingCredits?: number;
  dailyUsage?: number;
  weeklyUsage?: number;
  monthlyUsage?: number;
  freeModelRemaining?: number;
  recentLogs?: AiLogItem[];
  error?: string;
}

export function SystemLogsPage() {
  const [activeTab, setActiveTab] = useState<"webhook" | "openrouter">("openrouter");

  // Webhook State
  const [logs, setLogs] = useState<WebhookLogItem[]>([]);
  const [loadingWebhook, setLoadingWebhook] = useState(true);
  const [searchWebhook, setSearchWebhook] = useState("");
  const [selectedLog, setSelectedLog] = useState<WebhookLogItem | null>(null);

  // OpenRouter State
  const [aiStats, setAiStats] = useState<OpenRouterStats | null>(null);
  const [loadingAi, setLoadingAi] = useState(true);
  const [searchAi, setSearchAi] = useState("");
  const [selectedAiLog, setSelectedAiLog] = useState<AiLogItem | null>(null);
  const [rawGenDetail, setRawGenDetail] = useState<any>(null);
  const [loadingGenDetail, setLoadingGenDetail] = useState(false);

  const fetchWebhookLogs = async () => {
    setLoadingWebhook(true);
    try {
      const res = await fetch("/api/v1/platform/webhook-logs");
      const json = await res.json();
      const list = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
      setLogs(list);
    } catch {
      toast.error("Gagal mengambil webhook log");
    } finally {
      setLoadingWebhook(false);
    }
  };

  const fetchOpenRouterStats = async () => {
    setLoadingAi(true);
    try {
      const res = await fetch("/api/v1/platform/openrouter/stats");
      const json = await res.json();
      const data = json?.data || json;
      if (data) {
        setAiStats(data);
      }
    } catch {
      toast.error("Gagal mengambil log & statistik OpenRouter");
    } finally {
      setLoadingAi(false);
    }
  };

  useEffect(() => {
    fetchWebhookLogs();
    fetchOpenRouterStats();
  }, []);

  const fetchGenerationDetail = async (id: string) => {
    setLoadingGenDetail(true);
    setRawGenDetail(null);
    try {
      const res = await fetch(`/api/v1/platform/openrouter/generation/${encodeURIComponent(id)}`);
      const json = await res.json();
      setRawGenDetail(json?.data || json);
    } catch (e: any) {
      setRawGenDetail({ error: e.message || "Gagal memuat detail dari OpenRouter" });
    } finally {
      setLoadingGenDetail(false);
    }
  };

  const filteredWebhook = logs.filter((l) => {
    const s = searchWebhook.toLowerCase();
    return (
      l.instanceName.toLowerCase().includes(s) ||
      l.event.toLowerCase().includes(s)
    );
  });

  const recentAiLogs = aiStats?.recentLogs || [];
  const filteredAiLogs = recentAiLogs.filter((l) => {
    const s = searchAi.toLowerCase();
    return (
      l.model.toLowerCase().includes(s) ||
      l.id.toLowerCase().includes(s) ||
      l.status.toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Log & Diagnostik Sistem</h2>
          <p className="text-xs text-muted-foreground">
            Pantau aktivitas real-time panggilan AI OpenRouter serta incoming event webhook WhatsApp
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              if (activeTab === "openrouter") fetchOpenRouterStats();
              else fetchWebhookLogs();
            }}
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 max-w-md h-10 p-1 bg-muted/60 rounded-xl border border-border/50">
          <TabsTrigger value="openrouter" className="text-xs font-semibold gap-1.5 rounded-lg">
            <Brain className="h-3.5 w-3.5 text-indigo-600" />
            <span>OpenRouter & AI Log</span>
          </TabsTrigger>
          <TabsTrigger value="webhook" className="text-xs font-semibold gap-1.5 rounded-lg">
            <Terminal className="h-3.5 w-3.5 text-emerald-600" />
            <span>Webhook WAHA</span>
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: OPENROUTER AI LOG */}
        <TabsContent value="openrouter" className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card className="p-3.5">
              <div className="flex items-center justify-between text-muted-foreground text-xs">
                <span>Saldo Kredit Tersisa</span>
                <Coins className="h-3.5 w-3.5 text-amber-500" />
              </div>
              <div className="mt-1.5 text-xl font-bold text-foreground">
                {loadingAi ? (
                  <Skeleton className="h-7 w-24" />
                ) : (
                  `$${aiStats?.remainingCredits ?? "0.00"}`
                )}
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Total Plafon: ${aiStats?.totalCredits ?? "0.00"}
              </p>
            </Card>

            <Card className="p-3.5">
              <div className="flex items-center justify-between text-muted-foreground text-xs">
                <span>Total Penggunaan</span>
                <Zap className="h-3.5 w-3.5 text-blue-500" />
              </div>
              <div className="mt-1.5 text-xl font-bold text-foreground">
                {loadingAi ? (
                  <Skeleton className="h-7 w-24" />
                ) : (
                  `$${aiStats?.totalUsage ?? "0.00"}`
                )}
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Bulan Ini: ${aiStats?.monthlyUsage ?? "0.00"}
              </p>
            </Card>

            <Card className="p-3.5">
              <div className="flex items-center justify-between text-muted-foreground text-xs">
                <span>Pemakaian Hari Ini</span>
                <Activity className="h-3.5 w-3.5 text-emerald-500" />
              </div>
              <div className="mt-1.5 text-xl font-bold text-foreground">
                {loadingAi ? (
                  <Skeleton className="h-7 w-24" />
                ) : (
                  `$${aiStats?.dailyUsage ?? "0.00"}`
                )}
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Minggu Ini: ${aiStats?.weeklyUsage ?? "0.00"}
              </p>
            </Card>

            <Card className="p-3.5">
              <div className="flex items-center justify-between text-muted-foreground text-xs">
                <span>Model Gratis Hari Ini</span>
                <Brain className="h-3.5 w-3.5 text-purple-500" />
              </div>
              <div className="mt-1.5 text-xl font-bold text-foreground">
                {loadingAi ? (
                  <Skeleton className="h-7 w-24" />
                ) : (
                  `${aiStats?.freeModelRemaining ?? 50} / 50`
                )}
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Sisa kuota model :free</p>
            </Card>
          </div>

          {/* Search bar */}
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                value={searchAi}
                onChange={(e) => setSearchAi(e.target.value)}
                placeholder="Cari model / ID generasi / status..."
                className="w-full h-8 pl-8 pr-3 text-xs rounded-md border bg-background"
              />
            </div>
            <a
              href="https://openrouter.ai/activity"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-indigo-600 hover:underline inline-flex items-center gap-1 font-medium"
            >
              Buka Dashboard OpenRouter.ai <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          {/* Table & Detail */}
          <div className="grid lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2 overflow-hidden flex flex-col max-h-[640px]">
              <div className="p-3 border-b bg-muted/40 text-xs font-semibold flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Brain className="h-3.5 w-3.5 text-indigo-600" /> Riwayat Permintaan AI Terbaru
                </span>
                <span className="text-[10px] text-muted-foreground font-normal">
                  {filteredAiLogs.length} request terekam
                </span>
              </div>

              <div className="flex-1 overflow-auto divide-y divide-border/40 text-xs">
                {loadingAi ? (
                  <div className="p-4 space-y-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Skeleton key={i} className="h-11 w-full" />
                    ))}
                  </div>
                ) : filteredAiLogs.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground text-xs">
                    Belum ada log AI terekam. Panggilan chat dari WhatsApp / Simulator akan otomatis tercatat di sini.
                  </div>
                ) : (
                  filteredAiLogs.map((log) => {
                    const isSelected = selectedAiLog?.id === log.id;
                    return (
                      <div
                        key={log.id}
                        onClick={() => {
                          setSelectedAiLog(log);
                          if (log.id && !log.id.startsWith("err-") && !log.id.startsWith("stream-")) {
                            fetchGenerationDetail(log.id);
                          } else {
                            setRawGenDetail(null);
                          }
                        }}
                        className={`p-3 cursor-pointer hover:bg-muted/50 transition-colors flex items-center justify-between gap-3 ${
                          isSelected ? "bg-indigo-50 dark:bg-indigo-950/40 border-l-2 border-indigo-600" : ""
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {log.status === "SUCCESS" ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                          ) : (
                            <XCircle className="h-4 w-4 text-rose-600 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground truncate">{log.model}</p>
                            <p className="text-[10px] text-muted-foreground font-mono truncate">
                              ID: {log.id}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0 text-right font-mono text-[11px]">
                          <div>
                            <span className="font-semibold">{log.durationMs.toLocaleString()}ms</span>
                            <p className="text-[10px] text-muted-foreground font-sans">
                              {log.totalTokens} tokens
                            </p>
                          </div>
                          <div className="text-[10px] text-muted-foreground font-sans flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(log.timestamp).toLocaleTimeString("id-ID")}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>

            {/* Right: Detail Card */}
            <Card className="flex flex-col max-h-[640px]">
              <div className="p-3 border-b bg-muted/40 text-xs font-semibold flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Code className="h-3.5 w-3.5 text-indigo-600" /> Detail Generasi AI
                </span>
              </div>

              <div className="flex-1 overflow-auto p-3 text-xs space-y-3">
                {selectedAiLog ? (
                  <>
                    <div className="space-y-1.5 bg-muted/40 p-2.5 rounded-lg border">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground text-[10px] uppercase font-semibold">Model</span>
                        <Badge variant="outline" className="text-[10px]">
                          {selectedAiLog.model}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">Status</span>
                        <span className={selectedAiLog.status === "SUCCESS" ? "text-emerald-600 font-bold" : "text-rose-600 font-bold"}>
                          {selectedAiLog.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">Durasi Latensi</span>
                        <span className="font-mono font-semibold">{selectedAiLog.durationMs}ms</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">Total Token</span>
                        <span className="font-mono font-semibold">{selectedAiLog.totalTokens} (Prompt: {selectedAiLog.promptTokens}, Jawaban: {selectedAiLog.completionTokens})</span>
                      </div>
                    </div>

                    {selectedAiLog.error && (
                      <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-[11px]">
                        <p className="font-bold">Error:</p>
                        <p className="font-mono break-all">{selectedAiLog.error}</p>
                      </div>
                    )}

                    <div className="space-y-1">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase">Raw OpenRouter API Response</p>
                      <div className="p-2.5 rounded-lg bg-slate-950 text-slate-200 font-mono text-[10px] max-h-60 overflow-auto">
                        {loadingGenDetail ? (
                          <div className="text-slate-400 py-4 text-center">Memuat data dari OpenRouter...</div>
                        ) : rawGenDetail ? (
                          <pre className="whitespace-pre-wrap break-all">{JSON.stringify(rawGenDetail, null, 2)}</pre>
                        ) : (
                          <pre className="whitespace-pre-wrap break-all">{JSON.stringify(selectedAiLog, null, 2)}</pre>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-xs text-center p-6">
                    Pilih salah satu log di sebelah kiri untuk melihat detail performa AI & statistik token.
                  </div>
                )}
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 2: WEBHOOK WAHA LOG */}
        <TabsContent value="webhook" className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                value={searchWebhook}
                onChange={(e) => setSearchWebhook(e.target.value)}
                placeholder="Cari event (message, session.status) / instance..."
                className="w-full h-8 pl-8 pr-3 text-xs rounded-md border bg-background"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Menampilkan <strong>{filteredWebhook.length}</strong> log webhook terbaru
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2 overflow-hidden flex flex-col max-h-[640px]">
              <div className="p-3 border-b bg-muted/40 text-xs font-semibold flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Terminal className="h-3.5 w-3.5 text-emerald-600" /> Incoming Webhook Stream
                </span>
              </div>

              <div className="flex-1 overflow-auto divide-y divide-border/40 text-xs font-mono">
                {loadingWebhook ? (
                  <div className="p-4 space-y-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                ) : filteredWebhook.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground text-xs font-sans">
                    Belum ada webhook log yang terekam.
                  </div>
                ) : (
                  filteredWebhook.map((l) => {
                    const isSelected = selectedLog?.id === l.id;
                    return (
                      <div
                        key={l.id}
                        onClick={() => setSelectedLog(l)}
                        className={`p-3 cursor-pointer hover:bg-muted/50 transition-colors flex items-center justify-between gap-3 ${
                          isSelected ? "bg-emerald-50 dark:bg-emerald-950/40 border-l-2 border-emerald-600" : ""
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Badge
                            variant="outline"
                            className={`text-[10px] uppercase font-mono ${
                              l.event.startsWith("message")
                                ? "bg-blue-50 text-blue-700 border-blue-300"
                                : l.event.startsWith("session")
                                ? "bg-purple-50 text-purple-700 border-purple-300"
                                : "bg-slate-100 text-slate-700 border-slate-300"
                            }`}
                          >
                            {l.event}
                          </Badge>
                          <span className="font-semibold text-foreground truncate">{l.instanceName}</span>
                        </div>

                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground shrink-0 font-sans">
                          <Clock className="h-3 w-3" />
                          {new Date(l.createdAt).toLocaleTimeString("id-ID")}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>

            <Card className="flex flex-col max-h-[640px]">
              <div className="p-3 border-b bg-muted/40 text-xs font-semibold flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Code className="h-3.5 w-3.5 text-indigo-600" /> Detail JSON Webhook
                </span>
              </div>

              <div className="flex-1 overflow-auto p-3 text-[11px] font-mono bg-slate-950 text-slate-200">
                {selectedLog ? (
                  <pre className="whitespace-pre-wrap break-all">
                    {JSON.stringify(selectedLog.payload, null, 2)}
                  </pre>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-500 font-sans text-xs text-center p-6">
                    Klik salah satu log di sebelah kiri untuk melihat raw payload event.
                  </div>
                )}
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
