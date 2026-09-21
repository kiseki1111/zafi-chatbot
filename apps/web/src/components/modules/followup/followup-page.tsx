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
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  BellRing, Clock, Users, Send, Loader2, RefreshCw, History,
  Settings, Zap, User, Sun, Sunset, Sunrise, Moon, Sparkles, Check, Trash2, Plus,
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
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 bg-muted rounded" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-muted rounded-xl" />
          ))}
        </div>
        <div className="h-64 bg-muted rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Follow-Up</h2>
          <p className="text-sm text-muted-foreground">
            Auto follow-up pelanggan yang tidak aktif lebih dari {config.inactivityHours} jam
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadAll}>
            <RefreshCw className="h-4 w-4 mr-1.5" />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => setIsConfirmTriggerOpen(true)}
            disabled={triggering || !config.isEnabled}
          >
            {triggering ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <Zap className="h-4 w-4 mr-1.5" />
            )}
            Trigger Sekarang
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="grid place-items-center h-10 w-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/40">
                <Send className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalFollowedUp}</p>
                <p className="text-xs text-muted-foreground">Total Terkirim</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="grid place-items-center h-10 w-10 rounded-lg bg-amber-50 dark:bg-amber-950/40">
                <Users className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.pendingCount}</p>
                <p className="text-xs text-muted-foreground">Menunggu Follow-Up</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="grid place-items-center h-10 w-10 rounded-lg bg-blue-50 dark:bg-blue-950/40">
                <BellRing className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {config.isEnabled ? "Aktif" : "Nonaktif"}
                </p>
                <p className="text-xs text-muted-foreground">Status Schedule</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Config + Pending Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Config */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Settings className="h-4 w-4" />
              Konfigurasi
            </CardTitle>
            <CardDescription>Atur jadwal dan perilaku auto follow-up</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="enabled">Aktifkan Follow-Up</Label>
              <Switch
                id="enabled"
                checked={config.isEnabled}
                onCheckedChange={(v) => setConfig({ ...config, isEnabled: v })}
              />
            </div>
            <div className="space-y-4 pt-1">
              {/* Jadwal Waktu Eksekusi */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-emerald-600" />
                    Jadwal Pengiriman Otomatis (WIB)
                  </Label>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                    Pukul {config.scheduleTime || "09:00"} WIB
                  </span>
                </div>

                {/* Preset Cepat Waktu Indonesia */}
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { label: "Pagi", time: "09:00", desc: "09:00 WIB", icon: Sunrise },
                    { label: "Siang", time: "13:00", desc: "13:00 WIB", icon: Sun },
                    { label: "Sore", time: "16:30", desc: "16:30 WIB", icon: Sunset },
                    { label: "Malam", time: "19:30", desc: "19:30 WIB", icon: Moon },
                  ].map((preset) => {
                    const Icon = preset.icon;
                    const isSelected = config.scheduleTime === preset.time;
                    return (
                      <button
                        key={preset.time}
                        type="button"
                        onClick={() => setConfig({ ...config, scheduleTime: preset.time })}
                        className={`flex flex-col items-center justify-center p-2 rounded-lg border text-center transition-all ${
                          isSelected
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-sm ring-2 ring-emerald-500/20"
                            : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border-transparent hover:border-border"
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5 mb-1 shrink-0" />
                        <span className="text-xs font-bold leading-none">{preset.label}</span>
                        <span className={`text-[10px] mt-0.5 ${isSelected ? "text-emerald-100" : "text-muted-foreground"}`}>{preset.time}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Dropdown Jam & Menit Presisi */}
                <div className="flex items-center gap-2 pt-1">
                  <div className="flex-1 space-y-1">
                    <span className="text-[11px] text-muted-foreground">Jam:</span>
                    <Select
                      value={config.scheduleTime?.split(":")[0] || "09"}
                      onValueChange={(val) => {
                        const mins = config.scheduleTime?.split(":")[1] || "00";
                        setConfig({ ...config, scheduleTime: `${val}:${mins}` });
                      }}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Jam" />
                      </SelectTrigger>
                      <SelectContent className="max-h-56">
                        {Array.from({ length: 24 }).map((_, i) => {
                          const h = String(i).padStart(2, "0");
                          return (
                            <SelectItem key={h} value={h} className="text-xs">
                              Jam {h}:00
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex-1 space-y-1">
                    <span className="text-[11px] text-muted-foreground">Menit:</span>
                    <Select
                      value={config.scheduleTime?.split(":")[1] || "00"}
                      onValueChange={(val) => {
                        const hrs = config.scheduleTime?.split(":")[0] || "09";
                        setConfig({ ...config, scheduleTime: `${hrs}:${val}` });
                      }}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Menit" />
                      </SelectTrigger>
                      <SelectContent>
                        {["00", "15", "30", "45"].map((m) => (
                          <SelectItem key={m} value={m} className="text-xs">
                            {m} Menit
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Batas Inaktif Pelanggan */}
              <div className="space-y-2 pt-1 border-t">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                    Kriteria Tidak Merespons
                  </Label>
                  <span className="text-xs font-medium text-muted-foreground">
                    {config.inactivityHours >= 24
                      ? `${Math.round(config.inactivityHours / 24)} hari (${config.inactivityHours} jam)`
                      : `${config.inactivityHours} jam`}
                  </span>
                </div>

                {/* Preset Durasi Inaktif */}
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
                        className={`py-1.5 px-2 rounded-lg border text-xs font-semibold transition-all ${
                          isSelected
                            ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-transparent shadow-sm"
                            : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border-transparent"
                        }`}
                      >
                        {dur.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Prompt AI (opsional)</Label>
              <Textarea
                placeholder="Prompt default: buat pesan follow-up singkat untuk pelanggan yang tidak merespons..."
                value={config.followUpPrompt ?? ""}
                onChange={(e) => setConfig({ ...config, followUpPrompt: e.target.value || null })}
                rows={3}
              />
              <p className="text-[11px] text-muted-foreground">
                Kosongkan untuk menggunakan prompt bawaan sistem
              </p>
            </div>
            <Button onClick={saveConfig} disabled={saving} className="w-full">
              {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : null}
              Simpan Konfigurasi
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
                    className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/30 transition-colors"
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
            <div className="rounded-lg border overflow-hidden">
              <Table>
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
          <div className="bg-amber-50 dark:bg-amber-950/40 p-3 rounded-lg border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300">
            ⚠️ Pastikan nomor WhatsApp instans aktif dan konfigurasi AI sudah tersimpan sebelum melanjutkan.
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
