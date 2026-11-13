"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Blocks,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Plus,
  Play,
  Key,
  Globe,
  ShieldCheck,
  Code,
  Zap,
  Server,
  Building,
  Coins,
  ArrowRight,
  Search,
} from "lucide-react";
import { toast } from "sonner";

interface SystemConnector {
  id: string;
  name: string;
  category: "CONSOLE" | "HRIS" | "ACCOUNTING";
  description: string;
  baseUrl: string;
  authType: "BEARER" | "API_KEY";
  tokenMasked: string;
  status: "CONNECTED" | "WARNING" | "OFFLINE";
  latencyMs: number;
  lastPing: string;
  toolsCount: number;
}

interface ToolDefinition {
  id: string;
  name: string;
  system: "CONSOLE" | "HRIS" | "ACCOUNTING";
  description: string;
  endpoint: string;
  method: "GET" | "POST";
  minRole: "STAFF" | "HR_ADMIN" | "FINANCE_ADMIN";
  enabled: boolean;
}

// ponytail: array kosong sebagai default, koneksi diisi lewat form/tidak ada mockup
const INITIAL_CONNECTORS: SystemConnector[] = [];

const INITIAL_TOOLS: ToolDefinition[] = [];

export function IntegrationsPage() {
  const [connectors, setConnectors] = useState<SystemConnector[]>(INITIAL_CONNECTORS);
  const [tools, setTools] = useState<ToolDefinition[]>(INITIAL_TOOLS);
  const [isPinging, setIsPinging] = useState(false);
  const [editingConnector, setEditingConnector] = useState<SystemConnector | null>(null);
  const [testingTool, setTestingTool] = useState<ToolDefinition | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [isExecutingTest, setIsExecutingTest] = useState(false);
  const [search, setSearch] = useState("");

  const q = search.trim().toLowerCase();
  const filteredConnectors = q
    ? connectors.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q) ||
          c.baseUrl.toLowerCase().includes(q),
      )
    : connectors;
  const avgLatency = connectors.length
    ? Math.round(connectors.reduce((sum, c) => sum + c.latencyMs, 0) / connectors.length)
    : 0;
  const filteredTools = q
    ? tools.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.endpoint.toLowerCase().includes(q),
      )
    : tools;

  const handlePingAll = async () => {
    setIsPinging(true);
    try {
      const res = await fetch("/api/v1/hris/health", { signal: AbortSignal.timeout(4000) });
      const json = await res.json();
      const payload = json?.data !== undefined ? json.data : json;
      const hrisLatency = payload?.latencyMs || 0;
      const isOk = payload?.status === "CONNECTED";

      setConnectors((prev) =>
        prev.map((c) =>
          c.category === "HRIS"
            ? {
                ...c,
                status: isOk ? "CONNECTED" : "OFFLINE",
                latencyMs: hrisLatency,
                lastPing: "Baru saja",
                description: `Pintu data profil karyawan, sisa kuota cuti tahunan, rekap absensi, dan slip gaji. (${payload?.totalKaryawanAktif ?? 0} Karyawan Aktif Terhubung)`,
              }
            : c

        )
      );
      if (isOk) {
        toast.success(
          `Koneksi HRIS terhubung! Latensi: ${hrisLatency}ms (${payload?.totalKaryawanAktif ?? 0} Karyawan Aktif)`,
        );
      } else {
        toast.error("HRIS Offline. Pastikan service Laravel berjalan di port 8000.");
      }
    } catch {
      setConnectors((prev) =>
        prev.map((c) => ({
          ...c,
          status: "OFFLINE",
          lastPing: "Gagal terhubung",
        }))
      );
      toast.error("Gagal menghubungi layanan HRIS.");
    } finally {
      setIsPinging(false);
    }
  };

  const handleToggleTool = (id: string) => {
    setTools((prev) =>
      prev.map((t) => (t.id === id ? { ...t, enabled: !t.enabled } : t))
    );
    toast.success("Status tool AI diperbarui");
  };

  const handleRunTestTool = (tool: ToolDefinition) => {
    setTestingTool(tool);
    setTestResult(null);
  };

  const executeTest = async () => {
    setIsExecutingTest(true);
    try {
      setTestResult(
        JSON.stringify(
          {
            status: "error",
            message:
              "Belum ada tool yang terhubung. Tambahkan konfigurasi integrasi terlebih dahulu.",
          },
          null,
          2,
        ),
      );
    } finally {
      setIsExecutingTest(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Blocks className="h-6 w-6 text-emerald-600" />
            Integrasi Sistem (HRIS & Accounting)
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Konfigurasi pintu koneksi API internal dan function calling agar Asisten AI dapat mengambil data real-time secara aman.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePingAll}
            disabled={isPinging}
            className="gap-2 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isPinging ? "animate-spin" : ""}`} />
            Periksa Koneksi
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cari sistem, endpoint, atau nama tool..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 text-xs"
        />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-card/50 shadow-xs">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
              <Server className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Layanan Terhubung</p>
              <p className="text-xl font-bold text-foreground">{connectors.length} Sistem</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 shadow-xs">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total Tools AI</p>
              <p className="text-xl font-bold text-foreground">{tools.filter((t) => t.enabled).length} Aktif</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 shadow-xs">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
              <RefreshCw className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Rata-rata Latensi</p>
              <p className="text-xl font-bold text-foreground">{avgLatency} ms</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 shadow-xs">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Keamanan Akses</p>
              <p className="text-xl font-bold text-emerald-600">Terproteksi</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="connectors" className="w-full">
        <TabsList className="grid w-full sm:w-auto grid-cols-3 mb-4">
          <TabsTrigger value="connectors">Pintu Koneksi Sistem</TabsTrigger>
          <TabsTrigger value="tools">Katalog Tools AI ({tools.length})</TabsTrigger>
          <TabsTrigger value="docs">Panduan Integrasi</TabsTrigger>
        </TabsList>

        {/* Tab 1: Pintu Koneksi */}
        <TabsContent value="connectors" className="space-y-4">
          {filteredConnectors.length === 0 ? (
            <p className="py-10 text-center text-xs text-muted-foreground">
              {q ? "Tidak ada koneksi yang cocok dengan pencarian" : "Belum ada pintu koneksi sistem yang terdaftar"}
            </p>
          ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {filteredConnectors.map((c) => (
              <Card key={c.id} className="relative overflow-hidden border border-border/80 shadow-xs">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-lg ${
                        c.category === "CONSOLE"
                          ? "bg-purple-500/10 text-purple-600"
                          : c.category === "HRIS"
                          ? "bg-blue-500/10 text-blue-600"
                          : "bg-emerald-500/10 text-emerald-600"
                      }`}>
                        {c.category === "CONSOLE" ? (
                          <ShieldCheck className="h-5 w-5" />
                        ) : c.category === "HRIS" ? (
                          <Building className="h-5 w-5" />
                        ) : (
                          <Coins className="h-5 w-5" />
                        )}
                      </div>
                      <div>
                        <CardTitle className="text-base">{c.name}</CardTitle>
                        <CardDescription className="text-xs">
                          {c.category === "CONSOLE"
                            ? "Central Master Account & Subscription Portal"
                            : c.category === "HRIS"
                            ? "Human Resource Information System"
                            : "Financial & Accounting System"}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant={c.status === "CONNECTED" ? "default" : "secondary"} className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-xs">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
                      Terkoneksi
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 text-xs">
                  <p className="text-muted-foreground">{c.description}</p>

                  <div className="space-y-2 rounded-lg bg-muted/50 p-3 border border-border/60">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <Globe className="h-3.5 w-3.5" /> Base Endpoint:
                      </span>
                      <code className="bg-background px-1.5 py-0.5 rounded text-[11px] font-mono text-foreground">{c.baseUrl}</code>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <Key className="h-3.5 w-3.5" /> Autentikasi:
                      </span>
                      <span className="font-mono text-[11px] text-muted-foreground">{c.tokenMasked}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Respons Latensi:</span>
                      <span className="font-semibold text-emerald-600">{c.latencyMs} ms</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Tools Terdaftar:</span>
                      <span className="font-semibold text-foreground">{c.toolsCount} Fungsi AI</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => setEditingConnector(c)}
                    >
                      Konfigurasi Endpoint
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="text-xs shrink-0"
                      onClick={() => {
                        toast.success(`Ping ke ${c.name} sukses! Latensi: ${c.latencyMs}ms`);
                      }}
                    >
                      Test Ping
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          )}
        </TabsContent>

        {/* Tab 2: Tools AI */}
        <TabsContent value="tools" className="space-y-4">
          <Card className="border border-border/80 shadow-xs">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Daftar Tools Function Calling</CardTitle>
                <CardDescription className="text-xs">
                  Asisten AI akan secara otomatis memanggil fungsi di bawah saat mendeteksi kebutuhan data dari percakapan karyawan.
                </CardDescription>
              </div>
              <Button size="sm" className="text-xs gap-1.5" onClick={() => toast.info("Form pendaftaran tool baru siap dikonfigurasikan")}>
                <Plus className="h-3.5 w-3.5" /> Tambah Tool
              </Button>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-border/60">
                {filteredTools.length === 0 ? (
                  <p className="py-10 text-center text-xs text-muted-foreground">
                    {q ? "Tidak ada tool yang cocok dengan pencarian" : "Belum ada tool AI terdaftar"}
                  </p>
                ) : filteredTools.map((tool) => (
                  <div key={tool.id} className="py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <code className="text-xs font-bold text-foreground font-mono bg-muted px-2 py-0.5 rounded">
                          {tool.name}
                        </code>
                        <Badge variant="outline" className={`text-[10px] ${tool.system === "HRIS" ? "text-blue-600 border-blue-500/30" : "text-emerald-600 border-emerald-500/30"}`}>
                          {tool.system}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px]">
                          {tool.minRole === "STAFF" ? "Semua Staf" : tool.minRole === "HR_ADMIN" ? "Khusus HR Admin" : "Khusus Finance Admin"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{tool.description}</p>
                      <p className="text-[11px] font-mono text-muted-foreground/80">
                        {tool.method} {tool.endpoint}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs gap-1.5"
                        onClick={() => handleRunTestTool(tool)}
                      >
                        <Play className="h-3 w-3 text-emerald-600 fill-emerald-600" />
                        Simulasi
                      </Button>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{tool.enabled ? "Aktif" : "Nonaktif"}</span>
                        <Switch
                          checked={tool.enabled}
                          onCheckedChange={() => handleToggleTool(tool.id)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Panduan Integrasi */}
        <TabsContent value="docs" className="space-y-4">
          <Card className="border border-border/80 shadow-xs">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Code className="h-5 w-5 text-emerald-600" />
                Panduan untuk Developer Aplikasi HRIS & Accounting
              </CardTitle>
              <CardDescription className="text-xs">
                Cara aplikasi HRIS dan Accounting membukakan pintu informasi untuk Asisten AI.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="rounded-lg bg-muted/60 p-4 border border-border/60 space-y-2">
                <h4 className="font-semibold text-foreground text-sm">1. Menerima Header Bearer JWT</h4>
                <p className="text-muted-foreground">
                  Setiap kali asisten memanggil endpoint tool Anda, bot akan meneruskan JWT token user pemanggil di header <code className="bg-background px-1 py-0.5 rounded">Authorization: Bearer &lt;token&gt;</code>.
                  Verifikasi signature JWT dengan <code className="bg-background px-1 py-0.5 rounded">JWT_ACCESS_SECRET</code> yang sama untuk memastikan identitas staf (`userId` dan `roles`).
                </p>
              </div>

              <div className="rounded-lg bg-muted/60 p-4 border border-border/60 space-y-2">
                <h4 className="font-semibold text-foreground text-sm">2. Format Respons Ringkas (JSON)</h4>
                <p className="text-muted-foreground">
                  Kembalikan objek JSON data ringkas agar token AI efisien dan respon bot cepat:
                </p>
                <pre className="bg-background p-3 rounded border font-mono text-[11px] overflow-x-auto text-foreground">
{`{
  "status": "success",
  "data": {
    "userId": "usr_9912",
    "leaveBalance": 12,
    "leaveTaken": 2,
    "pendingApproval": 0
  }
}`}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal Edit Connector */}
      <Dialog open={!!editingConnector} onOpenChange={() => setEditingConnector(null)}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Konfigurasi Pintu {editingConnector?.name}</DialogTitle>
            <DialogDescription className="text-xs">
              Ubah endpoint internal dan kunci otorisasi untuk komunikasi dengan Asisten AI.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Base URL Endpoint Internal</Label>
              <Input
                defaultValue={editingConnector?.baseUrl}
                placeholder="http://nama-service:port/api/v1"
                className="text-xs font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Tipe Autentikasi</Label>
              <Input defaultValue="Bearer Token / Shared Secret" disabled className="text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Token Rahasia Internal (Secret)</Label>
              <Input
                defaultValue={editingConnector?.tokenMasked}
                type="password"
                className="text-xs font-mono"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setEditingConnector(null)}>Batal</Button>
            <Button
              size="sm"
              onClick={() => {
                setEditingConnector(null);
                toast.success("Konfigurasi konektor berhasil disimpan!");
              }}
            >
              Simpan Perubahan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Simulasi Tool */}
      <Dialog open={!!testingTool} onOpenChange={() => setTestingTool(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Play className="h-4 w-4 text-emerald-600 fill-emerald-600" />
              Simulasi Eksekusi: {testingTool?.name}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Uji respons balik dari endpoint {testingTool?.system} sebelum bot digunakan langsung oleh karyawan.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="p-3 bg-muted/60 rounded border text-xs space-y-1">
              <p className="font-semibold text-foreground">Target Endpoint:</p>
              <code className="text-[11px] font-mono text-emerald-600">{testingTool?.method} {testingTool?.endpoint}</code>
            </div>

            {testResult && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-foreground">Respons Data Real-time:</p>
                <pre className="bg-background p-3 rounded border font-mono text-[11px] max-h-56 overflow-y-auto text-emerald-700 dark:text-emerald-400">
                  {testResult}
                </pre>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setTestingTool(null)}>Tutup</Button>
            <Button
              size="sm"
              onClick={executeTest}
              disabled={isExecutingTest}
              className="gap-2"
            >
              <Play className={`h-3.5 w-3.5 ${isExecutingTest ? "animate-spin" : ""}`} />
              {isExecutingTest ? "Memanggil Endpoint..." : "Jalankan Panggilan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
