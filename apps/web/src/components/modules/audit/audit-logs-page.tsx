"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FileText,
  Search,
  Filter,
  Download,
  ShieldCheck,
  ShieldAlert,
  Zap,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Terminal,
  Database,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";

interface AuditLogEntry {
  id: string;
  timestamp: string;
  employeeName: string;
  employeeNik: string;
  department: string;
  userQuery: string;
  toolCalled: string | null;
  status: "SUCCESS" | "UNAUTHORIZED" | "ERROR";
  latencyMs: number;
  tokensUsed: number;
  toolInput?: Record<string, any>;
  toolOutput?: Record<string, any>;
  aiResponse: string;
}

const INITIAL_LOGS: AuditLogEntry[] = [
  {
    id: "log-1",
    timestamp: "10:42:15 WIB",
    employeeName: "Ahmad Fauzi",
    employeeNik: "IT-2024-12",
    department: "Teknologi & IT",
    userQuery: "Halo asisten, berapa sisa kuota cuti tahunan saya untuk tahun ini?",
    toolCalled: "hris.cek_sisa_cuti",
    status: "SUCCESS",
    latencyMs: 1120,
    tokensUsed: 384,
    toolInput: { userId: "emp-4", tahun: 2026 },
    toolOutput: { kuota: 12, terpakai: 3, sisa: 9 },
    aiResponse: "Halo Mas Ahmad Fauzi! Sisa kuota cuti tahunan Anda saat ini adalah 9 hari kerja (dari total hak cuti 12 hari, telah digunakan 3 hari).",
  },
  {
    id: "log-2",
    timestamp: "10:38:02 WIB",
    employeeName: "Dewi Lestari",
    employeeNik: "OPS-2024-08",
    department: "Operasional",
    userQuery: "Berapa gaji dan tunjangan yang diterima manajer saya bulan lalu?",
    toolCalled: "hris.info_slip_gaji",
    status: "UNAUTHORIZED",
    latencyMs: 410,
    tokensUsed: 210,
    toolInput: { targetUser: "mgr-ops", requestedBy: "emp-5" },
    toolOutput: { error: "FORBIDDEN: Scope level staf tidak diizinkan mengakses slip gaji pihak lain." },
    aiResponse: "Maaf Mbak Dewi, sesuai kebijakan privasi dan keamanan perusahaan, informasi kompensasi dan gaji hanya dapat diakses oleh karyawan bersangkutan dan manajemen yang berwenang.",
  },
  {
    id: "log-3",
    timestamp: "10:15:30 WIB",
    employeeName: "Budi Santoso",
    employeeNik: "FIN-2022-04",
    department: "Keuangan & Akuntansi",
    userQuery: "Tolong rangkum posisi saldo kas operasional dan rekening BCA utama kita hari ini.",
    toolCalled: "accounting.ringkasan_saldo_kas",
    status: "SUCCESS",
    latencyMs: 1450,
    tokensUsed: 512,
    toolInput: { accounts: ["KAS_OPERASIONAL", "BANK_BCA"] },
    toolOutput: { kas: 148500000, bca: 420000000, updated: "2026-03-07T10:00:00Z" },
    aiResponse: "Selamat pagi Pak Budi. Berikut ringkasan posisi kas per hari ini: Kas Operasional tercatat Rp 148.500.000 dan Rekening Bank BCA Utama tercatat Rp 420.000.000. Total likuiditas siap pakai: Rp 568.500.000.",
  },
  {
    id: "log-4",
    timestamp: "09:55:10 WIB",
    employeeName: "Siti Rahmawati",
    employeeNik: "HR-2023-01",
    department: "HRD",
    userQuery: "Bagaimana alur dan batas maksimal klaim kacamata sesuai peraturan perusahaan terbaru?",
    toolCalled: null, // Menggunakan RAG Dokumen Knowledge Base
    status: "SUCCESS",
    latencyMs: 890,
    tokensUsed: 420,
    toolInput: undefined,
    toolOutput: undefined,
    aiResponse: "Berdasarkan Dokumen Kebijakan Medis & Benefit Karyawan (SOP-HR-04 Pasal 7): Plafon penggantian kacamata staf adalah Rp 1.500.000 per 2 tahun sekali, dengan melampirkan resep dokter mata dan kuitansi optik resmi.",
  },
  {
    id: "log-5",
    timestamp: "09:20:44 WIB",
    employeeName: "Mega Pertiwi",
    employeeNik: "FIN-2025-02",
    department: "Keuangan & Akuntansi",
    userQuery: "Apakah invoice INV-2026-0089 dari Klien PT Cahaya sudah dilunasi?",
    toolCalled: "accounting.cek_status_invoice",
    status: "SUCCESS",
    latencyMs: 980,
    tokensUsed: 340,
    toolInput: { invoiceNo: "INV-2026-0089" },
    toolOutput: { status: "LUNAS", tanggalBayar: "2026-03-05", nominal: 45000000 },
    aiResponse: "Invoice INV-2026-0089 atas nama PT Cahaya sudah terkonfirmasi LUNAS pada tanggal 5 Maret 2026 sebesar Rp 45.000.000 via transfer Bank Mandiri.",
  },
];

export function AssistantAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>(INITIAL_LOGS);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [activeLogDetail, setActiveLogDetail] = useState<AuditLogEntry | null>(null);

  const filteredLogs = logs.filter((l) => {
    const matchSearch =
      l.employeeName.toLowerCase().includes(search.toLowerCase()) ||
      l.userQuery.toLowerCase().includes(search.toLowerCase()) ||
      (l.toolCalled && l.toolCalled.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = statusFilter === "ALL" || l.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <FileText className="h-6 w-6 text-emerald-600" />
            Riwayat & Audit Log Asisten
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Audit trail interaksi real-time staf dengan Asisten AI, pelacakan pemanggilan tool data, dan proteksi kebocoran data sensitif.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => toast.success("Data audit log berhasil diexport ke format CSV")}
            className="gap-2 text-xs"
          >
            <Download className="h-3.5 w-3.5" /> Export Log
          </Button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-card/50 shadow-xs">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">Total Query Hari Ini</p>
            <p className="text-xl font-bold text-foreground mt-1">142 Query</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 shadow-xs">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">Tool Calls Dijalankan</p>
            <p className="text-xl font-bold text-blue-600 mt-1">98 Eksekusi</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 shadow-xs">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">Percobaan Unauthorized</p>
            <p className="text-xl font-bold text-rose-600 mt-1">2 Dicegah</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 shadow-xs">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">Rata-rata Durasi AI</p>
            <p className="text-xl font-bold text-emerald-600 mt-1">1.1 detik</p>
          </CardContent>
        </Card>
      </div>

      {/* Search & Status Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari pertanyaan, nama staf, atau nama tool..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <Button
            variant={statusFilter === "ALL" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("ALL")}
            className="text-xs h-8 px-2.5 rounded-full"
          >
            Semua Log
          </Button>
          <Button
            variant={statusFilter === "SUCCESS" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("SUCCESS")}
            className="text-xs h-8 px-2.5 rounded-full"
          >
            Sukses (Normal)
          </Button>
          <Button
            variant={statusFilter === "UNAUTHORIZED" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("UNAUTHORIZED")}
            className="text-xs h-8 px-2.5 rounded-full"
          >
            Ditolak / Terproteksi
          </Button>
        </div>
      </div>

      {/* Audit Logs Table */}
      <Card className="border border-border/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 border-b border-border/60 text-muted-foreground font-medium">
              <tr>
                <th className="py-3 px-4">Waktu</th>
                <th className="py-3 px-4">Karyawan</th>
                <th className="py-3 px-4">Pertanyaan / Query</th>
                <th className="py-3 px-4">Tool Sistem</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Durasi</th>
                <th className="py-3 px-4 text-right">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className="font-mono text-[11px] text-muted-foreground">{log.timestamp}</span>
                  </td>

                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6 text-[10px]">
                        <AvatarFallback>{log.employeeName.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-foreground text-xs leading-none">{log.employeeName}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{log.department}</p>
                      </div>
                    </div>
                  </td>

                  <td className="py-3 px-4 max-w-xs truncate">
                    <span className="text-foreground text-xs">{log.userQuery}</span>
                  </td>

                  <td className="py-3 px-4 whitespace-nowrap">
                    {log.toolCalled ? (
                      <code className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded text-foreground font-semibold">
                        {log.toolCalled}
                      </code>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-muted-foreground font-normal">
                        RAG Knowledge
                      </Badge>
                    )}
                  </td>

                  <td className="py-3 px-4 whitespace-nowrap">
                    {log.status === "SUCCESS" && (
                      <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-[10px]">
                        <CheckCircle2 className="h-2.5 w-2.5 mr-1" /> Sukses
                      </Badge>
                    )}
                    {log.status === "UNAUTHORIZED" && (
                      <Badge variant="destructive" className="text-[10px]">
                        <ShieldAlert className="h-2.5 w-2.5 mr-1" /> Dicegah (Akses Ditolak)
                      </Badge>
                    )}
                    {log.status === "ERROR" && (
                      <Badge variant="destructive" className="text-[10px]">
                        <XCircle className="h-2.5 w-2.5 mr-1" /> Error
                      </Badge>
                    )}
                  </td>

                  <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-muted-foreground">
                    {log.latencyMs} ms
                  </td>

                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs px-2"
                      onClick={() => setActiveLogDetail(log)}
                    >
                      <Eye className="h-3.5 w-3.5 mr-1" /> Trace
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal Detail Tracing Interaksi */}
      <Dialog open={!!activeLogDetail} onOpenChange={() => setActiveLogDetail(null)}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-emerald-600" />
              Detail Tracing Interaksi AI
            </DialogTitle>
            <DialogDescription className="text-xs">
              Audit lengkap input user, eksekusi tool endpoint, dan jawaban yang dihasilkan bot.
            </DialogDescription>
          </DialogHeader>

          {activeLogDetail && (
            <div className="space-y-3.5 py-2 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-muted/50 p-2.5 rounded border border-border/60">
                <div>
                  <span className="text-muted-foreground">Karyawan:</span>
                  <p className="font-semibold text-foreground">{activeLogDetail.employeeName} ({activeLogDetail.department})</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Status & Waktu:</span>
                  <p className="font-semibold text-foreground">{activeLogDetail.status} • {activeLogDetail.timestamp}</p>
                </div>
              </div>

              <div className="space-y-1">
                <span className="font-semibold text-foreground">Pertanyaan Karyawan:</span>
                <p className="p-2.5 rounded bg-muted/40 border border-border/60 text-muted-foreground italic">
                  &ldquo;{activeLogDetail.userQuery}&rdquo;
                </p>
              </div>

              {activeLogDetail.toolCalled && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      <Database className="h-3.5 w-3.5 text-blue-600" /> Tool System Called:
                    </span>
                    <code className="bg-muted px-1.5 py-0.5 rounded text-[11px] font-mono font-bold text-foreground">
                      {activeLogDetail.toolCalled}
                    </code>
                  </div>

                  {activeLogDetail.toolOutput && (
                    <div className="space-y-1">
                      <span className="text-muted-foreground">Payload Hasil Eksekusi Tool:</span>
                      <pre className="bg-background p-2.5 rounded border font-mono text-[10px] text-foreground max-h-32 overflow-y-auto">
                        {JSON.stringify(activeLogDetail.toolOutput, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-1">
                <span className="font-semibold text-foreground">Jawaban Akhir Asisten AI:</span>
                <p className="p-2.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-foreground leading-relaxed">
                  {activeLogDetail.aiResponse}
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setActiveLogDetail(null)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
