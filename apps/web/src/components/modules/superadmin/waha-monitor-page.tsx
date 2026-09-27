"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Smartphone, RefreshCw, QrCode, LogOut, CheckCircle2,
  XCircle, AlertTriangle, ShieldCheck, Power, Search,
} from "lucide-react";

interface InstanceItem {
  id?: string;
  name?: string;
  instanceName?: string;
  status: string;
  phone?: string;
  profileName?: string;
  tenantId?: string | null;
  dbStats?: any;
}

export function WahaMonitorPage() {
  const [instances, setInstances] = useState<InstanceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [qrCodeData, setQrCodeData] = useState<{ id: string; url: string } | null>(null);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  const fetchInstances = async () => {
    setLoading(true);
    try {
      // Superadmin request tanpa filter tenantId mengambil semua sesi
      const res = await fetch("/api/v1/waha/instances");
      const json = await res.json();
      const list = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
      setInstances(list);
    } catch {
      toast.error("Gagal mengambil daftar sesi WAHA");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInstances();
  }, []);

  const handleScanQR = async (sessionName: string) => {
    try {
      const res = await fetch(`/api/v1/waha/instances/${sessionName}/qr?t=${Date.now()}`);
      if (res.ok) {
        const blob = await res.blob();
        setQrCodeData({ id: sessionName, url: URL.createObjectURL(blob) });
      } else {
        toast.info("QR Code belum siap. Coba klik Restart Sesi terlebih dahulu.");
      }
    } catch {
      toast.error("Gagal mengambil QR Code");
    }
  };

  const handleRestart = async (sessionName: string) => {
    setActionLoading((prev) => ({ ...prev, [sessionName]: true }));
    try {
      const res = await fetch(`/api/v1/waha/instances/${sessionName}/restart`, { method: "POST" });
      if (res.ok) {
        toast.success(`Sesi ${sessionName} berhasil di-restart`);
        setTimeout(fetchInstances, 2000);
      } else {
        toast.error("Gagal me-restart sesi");
      }
    } catch {
      toast.error("Kesalahan jaringan");
    } finally {
      setActionLoading((prev) => ({ ...prev, [sessionName]: false }));
    }
  };

  const handleLogout = async (sessionName: string) => {
    if (!confirm(`Yakin ingin memutuskan koneksi sesi ${sessionName}?`)) return;
    setActionLoading((prev) => ({ ...prev, [sessionName]: true }));
    try {
      await fetch(`/api/v1/waha/instances/${sessionName}/logout`, { method: "POST" });
      toast.success(`Sesi ${sessionName} berhasil diputuskan`);
      fetchInstances();
    } catch {
      toast.error("Gagal memutuskan sesi");
    } finally {
      setActionLoading((prev) => ({ ...prev, [sessionName]: false }));
    }
  };

  const filtered = instances.filter((inst) => {
    const name = inst.name || inst.instanceName || "";
    const phone = inst.phone || "";
    return name.toLowerCase().includes(search.toLowerCase()) || phone.includes(search);
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Kelola Sesi WAHA Terpusat</h2>
          <p className="text-xs text-muted-foreground">
            Monitoring, scan QR pairing, dan kontrol koneksi WhatsApp seluruh klien platform
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={fetchInstances} variant="outline" size="sm" className="h-8 text-xs gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari sesi / nomor telepon..."
            className="w-full h-8 pl-8 pr-3 text-xs rounded-md border bg-background"
          />
        </div>
        <div className="flex gap-2 text-xs text-muted-foreground">
          <span>Total: <strong>{instances.length}</strong></span>
          <span>·</span>
          <span className="text-emerald-600">Online: <strong>{instances.filter(i => i.status === 'WORKING' || i.status === 'CONNECTED').length}</strong></span>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-xl" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
              <Skeleton className="h-8 w-24" />
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground text-xs">
          Tidak ada sesi WhatsApp yang ditemukan.
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((inst) => {
            const sName = inst.name || inst.instanceName || "unknown";
            const isWorking = inst.status === "WORKING" || inst.status === "CONNECTED";
            const isLoading = !!actionLoading[sName];

            return (
              <div
                key={sName}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-xl bg-card hover:bg-accent/30 transition-colors gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center border border-indigo-200 dark:border-indigo-800">
                      <Smartphone className="h-5 w-5" />
                    </div>
                    <div
                      className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background ${
                        isWorking ? "bg-emerald-500" : "bg-slate-400"
                      }`}
                    />
                  </div>

                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{sName}</span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          isWorking
                            ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                            : "bg-slate-100 text-slate-700 border-slate-300"
                        }`}
                      >
                        {inst.status}
                      </Badge>
                      {inst.tenantId && (
                        <span className="text-[10px] text-muted-foreground font-mono">
                          Tenant: {inst.tenantId.slice(0, 8)}...
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {inst.phone ? `+${inst.phone}` : "Belum ada nomor tertaut"}
                      {inst.profileName ? ` · ${inst.profileName}` : ""}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {!isWorking && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleScanQR(sName)}
                      className="h-8 text-xs gap-1 border-indigo-300 text-indigo-700 hover:bg-indigo-50"
                    >
                      <QrCode className="h-3.5 w-3.5" /> Scan QR
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isLoading}
                    onClick={() => handleRestart(sName)}
                    className="h-8 text-xs gap-1"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} /> Restart
                  </Button>
                  {isWorking && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isLoading}
                      onClick={() => handleLogout(sName)}
                      className="h-8 text-xs gap-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
                    >
                      <LogOut className="h-3.5 w-3.5" /> Putuskan
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dialog QR Code Modal */}
      <Dialog open={!!qrCodeData} onOpenChange={(open) => !open && setQrCodeData(null)}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle>Scan QR Code WAHA</DialogTitle>
            <DialogDescription>
              Sesi: <span className="font-semibold text-foreground">{qrCodeData?.id}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-4">
            {qrCodeData && (
              <img
                src={qrCodeData.url}
                alt="QR Code"
                className="w-48 h-48 border-4 border-indigo-500 rounded-lg shadow-lg"
              />
            )}
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Buka WhatsApp &gt; Perangkat Tertaut, lalu scan QR code ini.
          </p>
          <DialogFooter>
            <Button onClick={() => setQrCodeData(null)} className="w-full">
              Selesai
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
