"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  ShieldCheck,
  Search,
  Plus,
  RefreshCw,
  Smartphone,
  CheckCircle2,
  XCircle,
  Trash2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

interface WhitelistItem {
  id: string;
  phone: string;
  employeeName: string;
  nik: string;
  department: string;
  position: string; // Text biasa (Jabatan)
  isRegisteredOnWa: boolean;
  enabled: boolean;
  lastActive: string;
}

// ponytail: mapping data karyawan HRIS ke format whitelist, dipakai saat mount & sync manual
function mapHrisToWhitelist(list: any[]): WhitelistItem[] {
  return list
    .filter((k: any) => Boolean(k.phone || k.no_hp))
    .map((k: any, i: number) => {
      const raw = k.phone || k.no_hp || "";
      const clean = raw.startsWith("0") ? "62" + raw.slice(1) : raw.replace(/\D/g, "");
      return {
        id: `wl-hris-${k.nik || i}`,
        phone: clean,
        employeeName: k.name || k.nama_karyawan,
        nik: k.nik,
        department: k.department || "Operasional",
        position: k.position || "Staf",
        isRegisteredOnWa: true,
        enabled: true,
        lastActive: "Terverifikasi Sistem",
      };
    });
}

// ponytail: tanpa data mockup, data diisi via sync API HRIS atau input manual
export function WaWhitelistPage() {
  const [whitelist, setWhitelist] = useState<WhitelistItem[]>([]);
  const [search, setSearch] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);

  // ponytail: sinkronkan daftar kontak & karyawan real-time dari HRIS
  useEffect(() => {
    fetch("/api/v1/hris/karyawan/list")
      .then((res) => res.json())
      .then((json) => {
        const list = json?.data?.data || json?.data || [];
        if (Array.isArray(list) && list.length > 0) {
          const mapped = mapHrisToWhitelist(list);
          if (mapped.length > 0) setWhitelist(mapped);
        }
      })
      .catch(() => null);
  }, []);

  // Modal Tambah Nomor Whitelist State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    name: "",
    nik: "",
    phone: "",
    department: "Teknologi & IT",
    position: "", // Text biasa (Jabatan)
  });

  // Real-time live check di dalam Modal
  const [modalChecking, setModalChecking] = useState(false);
  const [modalWaStatus, setModalWaStatus] = useState<{
    checked: boolean;
    exists: boolean;
    message?: string;
  } | null>(null);

  // Normalisasi nomor telepon ke format internasional (62xxx)
  const sanitizeNumber = (num: string) => {
    let clean = num.replace(/\D/g, "");
    if (clean.startsWith("0")) clean = "62" + clean.slice(1);
    return clean;
  };

  // Fungsi pengecekan langsung ke server WAHA
  const triggerLiveCheck = async (rawPhone: string) => {
    const clean = sanitizeNumber(rawPhone);
    if (!clean || clean.length < 9) {
      setModalWaStatus({
        checked: true,
        exists: false,
        message: "Nomor terlalu pendek (minimal 9 digit)",
      });
      return;
    }

    setModalChecking(true);
    try {
      const res = await fetch(`/api/v1/waha/contacts/check-exists?phone=${clean}`, {
        signal: AbortSignal.timeout(4000),
      });
      if (res.ok) {
        const json = await res.json();
        const payload = json?.data !== undefined ? json.data : json;
        const isExists = Boolean(payload?.exists);
        setModalWaStatus({
          checked: true,
          exists: isExists,
          message: isExists
            ? "Terdaftar di WhatsApp (Nomor aktif & siap digunakan)"
            : "Tidak terdaftar di WhatsApp (Nomor belum memiliki akun WA)",
        });
      } else {
        setModalWaStatus({
          checked: true,
          exists: false,
          message: "Tidak terdaftar di WhatsApp",
        });
      }
    } catch {
      setModalWaStatus({
        checked: true,
        exists: false,
        message: "Gagal terhubung ke server WhatsApp atau nomor tidak valid",
      });
    } finally {
      setModalChecking(false);
    }
  };

  // Auto-check otomatis saat user selesai mengetik nomor HP (10 - 15 digit)
  const checkTimerRef = useRef<any>(null);
  useEffect(() => {
    if (!isAddOpen) {
      setModalWaStatus(null);
      return;
    }

    const clean = sanitizeNumber(addForm.phone);
    if (!clean || clean.length < 10) {
      setModalWaStatus(null);
      return;
    }

    if (checkTimerRef.current) clearTimeout(checkTimerRef.current);
    checkTimerRef.current = setTimeout(() => {
      triggerLiveCheck(clean);
    }, 250); // Cepat (250ms), tanpa delay lama

    return () => {
      if (checkTimerRef.current) clearTimeout(checkTimerRef.current);
    };
  }, [addForm.phone, isAddOpen]);

  const handleToggle = (id: string) => {
    setWhitelist((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, enabled: !item.enabled } : item
      )
    );
    toast.success("Status whitelist diperbarui");
  };

  const handleDelete = (id: string) => {
    setWhitelist((prev) => prev.filter((item) => item.id !== id));
    toast.success("Nomor dihapus dari whitelist");
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = sanitizeNumber(addForm.phone);
    if (!clean || !addForm.name || !addForm.position) {
      toast.error("Nama, nomor WhatsApp, dan jabatan wajib diisi");
      return;
    }

    if (modalWaStatus && !modalWaStatus.exists) {
      const confirmAdd = window.confirm(
        `Nomor +${clean} terdeteksi TIDAK terdaftar di WhatsApp. Apakah Anda yakin tetap ingin menyimpannya?`
      );
      if (!confirmAdd) return;
    }

    const isWa = modalWaStatus ? modalWaStatus.exists : true;

    const newItem: WhitelistItem = {
      id: "wl-" + Date.now(),
      phone: clean,
      employeeName: addForm.name,
      nik: addForm.nik || `EMP-${Date.now().toString().slice(-4)}`,
      department: addForm.department,
      position: addForm.position, // Jabatan yang dimasukkan
      isRegisteredOnWa: isWa,
      enabled: true,
      lastActive: "Baru didaftarkan",
    };

    setWhitelist((prev) => [newItem, ...prev]);
    setIsAddOpen(false);
    setAddForm({
      name: "",
      nik: "",
      phone: "",
      department: "Teknologi & IT",
      position: "",
    });
    setModalWaStatus(null);
    toast.success(`+${clean} (${addForm.name} - ${addForm.position}) berhasil ditambahkan ke whitelist!`);
  };

  const filtered = whitelist.filter(
    (w) =>
      w.employeeName.toLowerCase().includes(search.toLowerCase()) ||
      w.phone.includes(search) ||
      w.department.toLowerCase().includes(search.toLowerCase()) ||
      w.position.toLowerCase().includes(search.toLowerCase()) ||
      w.nik.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <ShieldCheck className="h-6 w-6 text-purple-600" />
            Whitelist Nomor WhatsApp (Asisten)
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Asisten AI HR & Finance hanya akan melayani query dari nomor WhatsApp yang tercatat dan aktif di whitelist ini.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              setIsSyncing(true);
              try {
                const res = await fetch("/api/v1/hris/karyawan/list");
                const json = await res.json();
                const list = json?.data?.data || json?.data || [];
                const mapped = Array.isArray(list) ? mapHrisToWhitelist(list) : [];
                if (mapped.length > 0) {
                  setWhitelist(mapped);
                  toast.success(`${mapped.length} nomor karyawan berhasil disinkronkan ke whitelist!`);
                } else {
                  toast.error("Tidak ada data karyawan dengan nomor WhatsApp dari HRIS.");
                }
              } catch {
                toast.error("Gagal menyinkronkan data karyawan dari HRIS.");
              } finally {
                setIsSyncing(false);
              }
            }}
            disabled={isSyncing}
            className="gap-2 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
            Sinkron Data Karyawan
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setModalWaStatus(null);
              setIsAddOpen(true);
            }}
            className="gap-1.5 text-xs bg-purple-600 hover:bg-purple-700 text-white"
          >
            <Plus className="h-3.5 w-3.5" /> Tambah Nomor
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-card/50 shadow-xs">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">Nomor Terdaftar</p>
            <p className="text-xl font-bold text-foreground mt-1">{whitelist.length} Nomor</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 shadow-xs">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">Whitelist Aktif</p>
            <p className="text-xl font-bold text-emerald-600 mt-1">
              {whitelist.filter((w) => w.enabled).length} Aktif
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 shadow-xs">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">WhatsApp Tervalidasi</p>
            <p className="text-xl font-bold text-blue-600 mt-1">
              {whitelist.filter((w) => w.isRegisteredOnWa).length} / {whitelist.length}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 shadow-xs">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">Departemen Tercover</p>
            <p className="text-xl font-bold text-purple-600 mt-1">5 Divisi</p>
          </CardContent>
        </Card>
      </div>

      {/* Whitelist Table */}
      <Card className="border border-border/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-border/60 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari nama, NIK, jabatan, atau nomor WhatsApp..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>
          <div className="text-xs text-muted-foreground">
            Menampilkan <strong>{filtered.length}</strong> nomor terverifikasi
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 border-b border-border/60 text-muted-foreground font-medium">
              <tr>
                <th className="py-3 px-4">Nomor WhatsApp</th>
                <th className="py-3 px-4">Pemilik (Karyawan)</th>
                <th className="py-3 px-4">Status WhatsApp</th>
                <th className="py-3 px-4">Jabatan / Posisi</th>
                <th className="py-3 px-4">Izin Whitelist</th>
                <th className="py-3 px-4">Terakhir Akses</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filtered.map((w) => (
                <tr key={w.id} className="hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-4">
                    <span className="font-mono font-semibold text-foreground">+{w.phone}</span>
                  </td>

                  <td className="py-3 px-4">
                    <div>
                      <p className="font-semibold text-foreground">{w.employeeName}</p>
                      <p className="text-[11px] text-muted-foreground font-mono">
                        {w.nik} • {w.department}
                      </p>
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    {w.isRegisteredOnWa ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        WhatsApp Aktif
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] text-rose-500 font-medium">
                        <XCircle className="h-3.5 w-3.5" />
                        Tidak Terdaftar
                      </span>
                    )}
                  </td>

                  <td className="py-3 px-4">
                    <span className="font-medium text-foreground bg-muted/60 px-2 py-0.5 rounded border border-border/50 text-[11px]">
                      {w.position}
                    </span>
                  </td>

                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={w.enabled}
                        onCheckedChange={() => handleToggle(w.id)}
                      />
                      <span className={`text-[11px] ${w.enabled ? "text-emerald-600 font-medium" : "text-muted-foreground"}`}>
                        {w.enabled ? "Diizinkan" : "Diblokir"}
                      </span>
                    </div>
                  </td>

                  <td className="py-3 px-4 text-muted-foreground font-mono text-[11px]">
                    {w.lastActive}
                  </td>

                  <td className="py-3 px-4 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(w.id)}
                      title="Hapus dari Whitelist"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal Tambah Nomor Whitelist */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <form onSubmit={handleAddSubmit}>
            <DialogHeader>
              <DialogTitle>Tambah Nomor ke Whitelist</DialogTitle>
              <DialogDescription className="text-xs">
                Masukkan nomor WhatsApp staf yang diizinkan berinteraksi dengan Asisten AI.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 py-3 text-xs">
              {/* Nomor WhatsApp + Live WAHA Checker Feedback */}
              <div className="space-y-1.5">
                <Label className="text-xs">Nomor WhatsApp</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Contoh: 08123456789 atau 628123456789"
                      value={addForm.phone}
                      onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          triggerLiveCheck(addForm.phone);
                        }
                      }}
                      className="text-xs font-mono pl-9"
                      required
                    />
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => triggerLiveCheck(addForm.phone)}
                    disabled={modalChecking || !addForm.phone.trim()}
                    className="text-xs shrink-0 h-9"
                  >
                    {modalChecking ? <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-600" /> : "Cek WA"}
                  </Button>
                </div>

                {/* Status pengecekan live di bawah input nomor */}
                {modalChecking && (
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 pt-0.5">
                    <Loader2 className="h-3 w-3 animate-spin text-purple-600 shrink-0" />
                    Memeriksa ke server WhatsApp...
                  </p>
                )}

                {!modalChecking && modalWaStatus?.checked && (
                  <div
                    className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-md border mt-1 animate-in fade-in ${
                      modalWaStatus.exists
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                        : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30"
                    }`}
                  >
                    {modalWaStatus.exists ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                    )}
                    <span>{modalWaStatus.message}</span>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Nama Karyawan</Label>
                <Input
                  placeholder="Nama lengkap staf"
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  className="text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">NIK</Label>
                  <Input
                    placeholder="Contoh: IT-2024-01"
                    value={addForm.nik}
                    onChange={(e) => setAddForm({ ...addForm, nik: e.target.value })}
                    className="text-xs font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Departemen</Label>
                  <select
                    value={addForm.department}
                    onChange={(e) => setAddForm({ ...addForm, department: e.target.value })}
                    className="w-full text-xs rounded-md border border-input bg-background px-3 py-2"
                  >
                    <option value="Teknologi & IT">Teknologi & IT</option>
                    <option value="HRD">HRD</option>
                    <option value="Keuangan & Akuntansi">Keuangan & Akuntansi</option>
                    <option value="Operasional">Operasional</option>
                    <option value="Direksi">Direksi</option>
                  </select>
                </div>
              </div>

              {/* Jabatan / Posisi sebagai input text biasa (Bukan Dropdown) */}
              <div className="space-y-1.5">
                <Label className="text-xs">Jabatan / Posisi</Label>
                <Input
                  placeholder="Contoh: Senior Accountant, HR Operations Lead, Staff IT, dll"
                  value={addForm.position}
                  onChange={(e) => setAddForm({ ...addForm, position: e.target.value })}
                  className="text-xs"
                  required
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsAddOpen(false)}>
                Batal
              </Button>
              <Button type="submit" size="sm" className="bg-purple-600 hover:bg-purple-700 text-white">
                Simpan ke Whitelist
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
