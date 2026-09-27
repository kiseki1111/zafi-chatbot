"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Activity, RefreshCw, Search, Code, Terminal, Clock } from "lucide-react";

interface WebhookLogItem {
  id: string;
  instanceName: string;
  event: string;
  payload: any;
  createdAt: string;
}

export function SystemLogsPage() {
  const [logs, setLogs] = useState<WebhookLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedLog, setSelectedLog] = useState<WebhookLogItem | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/platform/webhook-logs");
      const json = await res.json();
      const list = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
      setLogs(list);
    } catch {
      toast.error("Gagal mengambil webhook log");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filtered = logs.filter((l) => {
    const s = search.toLowerCase();
    return (
      l.instanceName.toLowerCase().includes(s) ||
      l.event.toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Log Sistem & Webhook WAHA</h2>
          <p className="text-xs text-muted-foreground">
            Riwayat event incoming webhook (pesan, status sesi, ACK) real-time dari seluruh WhatsApp instance
          </p>
        </div>
        <Button onClick={fetchLogs} variant="outline" size="sm" className="h-8 text-xs gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari event (message, session.status) / instance..."
            className="w-full h-8 pl-8 pr-3 text-xs rounded-md border bg-background"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Menampilkan <strong>{filtered.length}</strong> log terbaru
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Left: Log list */}
        <Card className="lg:col-span-2 overflow-hidden flex flex-col max-h-[680px]">
          <div className="p-3 border-b bg-muted/40 text-xs font-semibold flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Terminal className="h-3.5 w-3.5 text-emerald-600" /> Incoming Webhook Stream
            </span>
          </div>

          <div className="flex-1 overflow-auto divide-y divide-border/40 text-xs font-mono">
            {loading ? (
              <div className="p-4 space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground text-xs font-sans">
                Belum ada webhook log yang terekam. Log akan masuk saat ada aktivitas pesan/event WAHA.
              </div>
            ) : (
              filtered.map((l) => {
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

        {/* Right: Payload viewer */}
        <Card className="flex flex-col max-h-[680px]">
          <div className="p-3 border-b bg-muted/40 text-xs font-semibold flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Code className="h-3.5 w-3.5 text-indigo-600" /> Detail JSON Payload
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
    </div>
  );
}
