"use client";

import { useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  BellRing, Clock, Users, Send, Loader2, RefreshCw, History,
  Settings, Zap, User, Sun, Sunset, Sunrise, Moon, Sparkles, Check, Trash2, Plus, Save, AlertTriangle,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface FollowUpConfig {
  isEnabled: boolean;
  scheduleTime: string;
  inactivityHours: number;
  followUpPrompt: string | null;
}

interface FollowUpStats {
  totalFollowedUp: number;
  pendingCount: number;
  isEnabled: boolean;
}

interface InactiveContact {
  contactId: string;
  contactName: string;
  contactPhone: string;
  instanceName: string;
  lastMessageAt: string;
}

interface HistoryEntry {
  id: string;
  contactPhone: string;
  contactName: string;
  instanceName: string;
  followedUpAt: string;
}

export function FollowupPage() {
  const [config, setConfig] = useState<FollowUpConfig>({
    isEnabled: false,
    scheduleTime: "09:00",
    inactivityHours: 24,
    followUpPrompt: null,
  });
  const [stats, setStats] = useState<FollowUpStats>({
    totalFollowedUp: 0,
    pendingCount: 0,
    isEnabled: false,
  });
  const [inactiveContacts, setInactiveContacts] = useState<InactiveContact[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [isConfirmTriggerOpen, setIsConfirmTriggerOpen] = useState(false);

  // Modal Tambah Antrean Follow-Up (CRUD)
  const [isAddQueueOpen, setIsAddQueueOpen] = useState(false);
  const [addingQueue, setAddingQueue] = useState(false);
  const [instances, setInstances] = useState<string[]>([]);
  const [queueForm, setQueueForm] = useState({
    phone: "",
    name: "",
    instanceName: "",
  });

  useEffect(() => {
    fetch("/api/v1/waha/instances/db")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.data || [];
        const names = list.map((i: any) => i.instanceName).filter(Boolean);
        if (names.length > 0) {
          setInstances(names);
          setQueueForm((prev) => ({ ...prev, instanceName: names[0] }));
        }
      })
      .catch(() => {});
  }, []);

  const handleClearPending = async () => {
    try {
      const res = await fetch("/api/v1/followup/clear-pending", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        toast.success("Semua antrean lama berhasil dibatalkan (abort)!");
        loadAll();
      }
    } catch {
      toast.error("Gagal membersihkan antrean");
    }
  };

  const handleAddToQueue = async () => {
    if (!queueForm.phone.trim()) {
      toast.error("Nomor WhatsApp wajib diisi");
      return;
    }
    setAddingQueue(true);
    try {
      const res = await fetch("/api/v1/followup/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: queueForm.phone,
          name: queueForm.name,
          instanceName: queueForm.instanceName || instances[0] || "default",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Gagal menambahkan ke antrean");
      toast.success(data.message || "Kontak berhasil ditambahkan ke antrean follow-up!");
      setIsAddQueueOpen(false);
      setQueueForm({ phone: "", name: "", instanceName: instances[0] || "" });
      await loadAll();
    } catch (e: any) {
      toast.error(e.message || "Gagal menambahkan ke antrean");
    } finally {
      setAddingQueue(false);
    }
  };

  const handleRemoveFromQueue = async (contactId: string, instanceName: string, name?: string) => {
    try {
      const res = await fetch(`/api/v1/followup/queue/${contactId}/${instanceName}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success(`Kontak ${name || ""} berhasil dihapus dari antrean!`);
        await loadAll();
      } else {
        toast.error("Gagal menghapus kontak dari antrean");
      }
    } catch {
      toast.error("Gagal menghapus kontak dari antrean");
    }
  };

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [configRes, statsRes, listRes, historyRes] = await Promise.all([
        fetch("/api/v1/followup/config"),
        fetch("/api/v1/followup/stats"),
        fetch("/api/v1/followup/list"),
        fetch("/api/v1/followup/history?take=20"),
      ]);

      if (configRes.ok) {
        const c = await configRes.json();
        setConfig(c.data ?? c);
      }
      if (statsRes.ok) {
        const s = await statsRes.json();
        setStats(s.data ?? s);
      }
      if (listRes.ok) {
        const l = await listRes.json();
        setInactiveContacts(Array.isArray(l.data) ? l.data : Array.isArray(l) ? l : []);
      }
      if (historyRes.ok) {
        const h = await historyRes.json();
        const d = h.data ?? h;
        setHistory(d.data ?? (Array.isArray(d) ? d : []));
        setHistoryTotal(d.total ?? 0);
      }
    } catch {
      toast.error("Gagal memuat data follow-up");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  async function saveConfig() {
    setSaving(true);
    try {
      const res = await fetch("/api/v1/followup/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!res.ok) throw new Error("Gagal menyimpan");
      toast.success("Konfigurasi tersimpan");
      loadAll();
    } catch {
      toast.error("Gagal menyimpan konfigurasi");
    } finally {
      setSaving(false);
    }
  }

  async function triggerFollowUp() {
    setIsConfirmTriggerOpen(false);
    setTriggering(true);
    try {
      const res = await fetch("/api/v1/followup/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error("Gagal trigger");
      const r = await res.json();
      const d = r.data ?? r;
      toast.success(`Follow-up selesai: ${d.sent ?? 0} terkirim, ${d.errors ?? 0} gagal`);
      loadAll();
    } catch {
      toast.error("Gagal menjalankan follow-up");
    } finally {
      setTriggering(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-7 w-36" />
            <Skeleton className="h-4 w-72" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 w-24 rounded-md" />
            <Skeleton className="h-8 w-32 rounded-md" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-8 w-8 rounded-lg" />
              </div>
              <Skeleton className="h-7 w-16" />
              <Skeleton className="h-3 w-32" />
            </Card>
          ))}
        </div>

        <Card className="p-5 space-y-4">
          <div className="space-y-2 border-b pb-3">
            <Skeleton className="h-4 w-44" />
            <Skeleton className="h-3 w-64" />
          </div>
          <div className="space-y-3 pt-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-3.5 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header - Compact & Responsive (No bloated explanation) */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground truncate">
            Follow-Up
          </h2>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={loadAll} className="h-8 text-xs gap-1.5 px-2.5">
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <Button
            size="sm"
            onClick={() => setIsConfirmTriggerOpen(true)}
            disabled={triggering || !config.isEnabled}
            className="h-8 text-xs gap-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs font-semibold"
          >
            {triggering ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Zap className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline">Trigger Sekarang</span>
            <span className="sm:hidden">Trigger</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards - Centered & Proportional (Zero empty space) */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <Card className="p-3 sm:p-4 flex flex-col items-center justify-center text-center shadow-xs">
          <div className="h-8 w-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 grid place-items-center mb-1.5 shrink-0">
            <Send className="h-4 w-4" />
          </div>
          <p className="text-xl sm:text-2xl font-bold tracking-tight text-foreground leading-tight">
            {stats.totalFollowedUp}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Terkirim</p>
        </Card>
        <Card className="p-3 sm:p-4 flex flex-col items-center justify-center text-center shadow-xs">
          <div className="h-8 w-8 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 grid place-items-center mb-1.5 shrink-0">
            <Users className="h-4 w-4" />
          </div>
          <p className="text-xl sm:text-2xl font-bold tracking-tight text-foreground leading-tight">
            {stats.pendingCount}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Menunggu</p>
        </Card>
        <Card className="p-3 sm:p-4 flex flex-col items-center justify-center text-center shadow-xs">
          <div className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 grid place-items-center mb-1.5 shrink-0">
            <BellRing className="h-4 w-4" />
          </div>
          <p className="text-base sm:text-xl font-bold tracking-tight text-foreground leading-tight truncate max-w-full">
            {config.isEnabled ? "Aktif" : "Nonaktif"}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Status</p>
        </Card>
      </div>

      {/* Config + Pending Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Config - Clean & Un-crowded */}
        <Card className="shadow-xs">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Settings className="h-4.5 w-4.5 text-muted-foreground" />
              Pengaturan Jadwal
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 space-y-4">
            {/* Toggle Row */}
            <div className="flex items-center justify-between p-3 sm:p-3 rounded-xl border bg-muted/20">
              <div>
                <Label htmlFor="enabled" className="text-sm font-semibold cursor-pointer">
                  Follow-Up Otomatis
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Kirim pesan pengingat ke prospek yang belum merespons
                </p>
              </div>
              <Switch
                id="enabled"
                checked={config.isEnabled}
                onCheckedChange={(v) => setConfig({ ...config, isEnabled: v })}
                className="scale-110"
              />
            </div>

            {/* Jam Pengiriman */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-emerald-600" />
                Waktu Kirim ({config.scheduleTime || "09:00"} WIB)
              </Label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { label: "Pagi", time: "09:00", icon: Sunrise },
                  { label: "Siang", time: "13:00", icon: Sun },
                  { label: "Sore", time: "16:30", icon: Sunset },
                  { label: "Malam", time: "19:30", icon: Moon },
                ].map((preset) => {
                  const Icon = preset.icon;
                  const isSelected = config.scheduleTime === preset.time;
                  return (
                    <button
                      key={preset.time}
                      type="button"
                      onClick={() => setConfig({ ...config, scheduleTime: preset.time })}
                      className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all min-h-[44px] ${
                        isSelected
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-xs font-bold"
                          : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border-border/50"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5 mb-0.5 shrink-0" />
                      <span className="text-xs leading-tight">{preset.label}</span>
                      <span className={`text-[10px] ${isSelected ? "text-emerald-100" : "text-muted-foreground"}`}>{preset.time}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Kriteria Tidak Merespons */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-foreground">
                Kirim jika tidak merespons selama:
              </Label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { label: "12 Jam", hours: 12 },
                  { label: "1 Hari", hours: 24 },
                  { label: "2 Hari", hours: 48 },
                  { label: "3 Hari", hours: 72 },
                ].map((dur) => {
                  const isSelected = config.inactivityHours === dur.hours;
                  return (
                    <button
                      key={dur.hours}
                      type="button"
                      onClick={() => setConfig({ ...config, inactivityHours: dur.hours })}
                      className={`py-2.5 px-1 rounded-xl border text-xs font-semibold transition-all text-center min-h-[44px] ${
                        isSelected
                          ? "bg-foreground text-background border-foreground shadow-xs"
                          : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border-border/50"
                      }`}
                    >
                      {dur.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Prompt AI */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Instruksi Pesan AI (Opsional)</Label>
              <Textarea
                placeholder="Buat pesan follow-up ramah dan tanyakan apakah ada hal yang perlu dibantu..."
                value={config.followUpPrompt ?? ""}
                onChange={(e) => setConfig({ ...config, followUpPrompt: e.target.value || null })}
                rows={2}
                className="text-xs resize-none rounded-xl"
              />
            </div>

            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold h-9.5 rounded-xl shadow-xs"
              onClick={saveConfig}
              disabled={saving}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Save className="h-4 w-4 mr-1.5" />}
              Simpan Pengaturan
            </Button>
          </CardContent>
        </Card>

        {/* Pending Contacts */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="h-4 w-4" />
                  Menunggu Follow-Up
                  {inactiveContacts.length > 0 && (
                    <Badge variant="secondary" className="font-mono text-xs ml-1.5">
                      {inactiveContacts.length}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>Daftar pelanggan yang siap menerima follow-up AI</CardDescription>
              </div>
              <div className="flex items-center gap-1.5 self-end sm:self-auto">
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7 gap-1 font-semibold"
                  onClick={() => {
                    setQueueForm({ phone: "", name: "", instanceName: instances[0] || "" });
                    setIsAddQueueOpen(true);
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Tambah Antrean
                </Button>
                {inactiveContacts.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 border-rose-200 dark:border-rose-900 font-medium"
                    onClick={handleClearPending}
                    title="Kosongkan semua kontak yang sedang menunggu follow-up"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    Abort Semua
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {!config.isEnabled ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <BellRing className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">
                  Aktifkan follow-up untuk melihat daftar pelanggan
                </p>
              </div>
            ) : inactiveContacts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Users className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">
                  Tidak ada pelanggan yang perlu di-follow-up saat ini
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[360px] overflow-y-auto">
                {inactiveContacts.map((c) => (
                  <div
                    key={`${c.contactId}-${c.instanceName}`}
                    className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/30 transition-colors min-h-[48px]"
                  >
                    <div className="grid place-items-center h-8 w-8 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-xs font-bold shrink-0">
                      {(c.contactName ?? c.contactPhone ?? "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate">
                        {c.contactName || "Tanpa Nama"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate font-mono">
                        +{c.contactPhone} · <span className="font-sans font-medium text-foreground">{c.instanceName}</span>
                      </p>
                    </div>
                    <Badge variant="outline" className="shrink-0 text-[10px]">
                      {c.lastMessageAt
                        ? formatRelativeTime(new Date(c.lastMessageAt))
                        : "-"}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 shrink-0"
                      onClick={() => handleRemoveFromQueue(c.contactId, c.instanceName, c.contactName || c.contactPhone)}
                      title="Hapus kontak ini dari antrean follow-up"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4" />
            Riwayat Follow-Up
          </CardTitle>
          <CardDescription>{historyTotal} follow-up sudah dikirim</CardDescription>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <History className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">Belum ada riwayat follow-up</p>
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden overflow-x-auto -mx-2 sm:mx-0">
              <Table className="min-w-[500px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Pelanggan</TableHead>
                    <TableHead>Instance</TableHead>
                    <TableHead>Waktu</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((h) => (
                    <TableRow key={h.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="grid place-items-center h-6 w-6 rounded-full bg-muted text-[10px] font-bold">
                            <User className="h-3 w-3" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">
                              {h.contactName || "Tanpa Nama"}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {h.contactPhone}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[10px]">
                          {h.instanceName}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(h.followedUpAt).toLocaleString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      {/* Modal Konfirmasi Trigger Manual */}
      <Dialog open={isConfirmTriggerOpen} onOpenChange={setIsConfirmTriggerOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" /> Konfirmasi Trigger Follow-Up
            </DialogTitle>
            <DialogDescription className="pt-2 text-sm text-foreground/80 leading-relaxed">
              Anda akan mengirim pesan follow-up otomatis berbasis AI kepada <strong>{inactiveContacts.length} kontak</strong> yang telah melewati batas inaktif <strong>{config.inactivityHours} jam</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-amber-50 dark:bg-amber-950/40 p-3 rounded-lg border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <span>Pastikan nomor WhatsApp instans aktif dan konfigurasi AI sudah tersimpan sebelum melanjutkan.</span>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsConfirmTriggerOpen(false)}>Batal</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={triggerFollowUp}
              disabled={triggering}
            >
              {triggering ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Send className="h-4 w-4 mr-1.5" />}
              Ya, Kirim Sekarang
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Modal Tambah Antrean Follow-Up (CRUD) */}
      <Dialog open={isAddQueueOpen} onOpenChange={setIsAddQueueOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-emerald-600" /> Tambah Antrean Follow-Up
            </DialogTitle>
            <DialogDescription className="pt-1 text-xs text-foreground/80">
              Tambahkan kontak WhatsApp secara manual ke daftar <strong>Menunggu Follow-Up</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 text-xs py-2">
            <div>
              <Label className="font-semibold">Nomor WhatsApp Tujuan (Wajib)</Label>
              <Input
                value={queueForm.phone}
                onChange={(e) => setQueueForm({ ...queueForm, phone: e.target.value })}
                placeholder="6281234567890"
                className="h-8 mt-1 font-mono"
              />
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Nomor pelanggan yang akan menerima pesan follow-up otomatis.
              </p>
            </div>

            <div>
              <Label className="font-semibold">Nama Pelanggan (Opsional)</Label>
              <Input
                value={queueForm.name}
                onChange={(e) => setQueueForm({ ...queueForm, name: e.target.value })}
                placeholder="Contoh: Budi Santoso"
                className="h-8 mt-1"
              />
            </div>

            <div>
              <Label className="font-semibold">Sesi WhatsApp Bot Pengirim</Label>
              {instances.length > 0 ? (
                <Select
                  value={queueForm.instanceName}
                  onValueChange={(v) => setQueueForm({ ...queueForm, instanceName: v })}
                >
                  <SelectTrigger className="h-8 mt-1 text-xs">
                    <SelectValue placeholder="Pilih sesi bot" />
                  </SelectTrigger>
                  <SelectContent>
                    {instances.map((name) => (
                      <SelectItem key={name} value={name}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={queueForm.instanceName}
                  onChange={(e) => setQueueForm({ ...queueForm, instanceName: e.target.value })}
                  placeholder="Zafi-CS"
                  className="h-8 mt-1 font-mono"
                />
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setIsAddQueueOpen(false)}>Batal</Button>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              onClick={handleAddToQueue}
              disabled={addingQueue}
            >
              {addingQueue ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Plus className="h-4 w-4 mr-1.5" />}
              Tambahkan ke Antrean
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMin / 60);
  const diffD = Math.floor(diffH / 24);
  if (diffD > 0) return `${diffD} hari lalu`;
  if (diffH > 0) return `${diffH} jam lalu`;
  if (diffMin > 0) return `${diffMin} menit lalu`;
  return "Baru saja";
}
