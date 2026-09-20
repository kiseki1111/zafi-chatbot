"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Plus, Search, Edit3, Trash2, CheckCircle2, Clock, XCircle, Wrench, Layers, RefreshCw, Upload, Image, FileVideo, ExternalLink,
} from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { useToast } from "@/hooks/use-toast";
import type { ResourceGroup, ResourceItem, ResourceStatus } from "@/lib/types";

const STATUS_CONFIG: Record<ResourceStatus, { label: string; bg: string; border: string; text: string; icon: any }> = {
  AVAILABLE: {
    label: "Unit Ready",
    bg: "bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50",
    border: "border-emerald-400 dark:border-emerald-700",
    text: "text-emerald-700 dark:text-emerald-300",
    icon: CheckCircle2,
  },
  BOOKED: {
    label: "Proses Bank",
    bg: "bg-orange-50 dark:bg-orange-950/40 hover:bg-orange-100 dark:hover:bg-orange-900/50",
    border: "border-orange-400 dark:border-orange-700",
    text: "text-orange-700 dark:text-orange-300",
    icon: Clock,
  },
  OCCUPIED: {
    label: "Sudah Terjual",
    bg: "bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/50",
    border: "border-red-500 dark:border-red-700",
    text: "text-red-700 dark:text-red-300",
    icon: XCircle,
  },
  MAINTENANCE: {
    label: "Rumah Contoh",
    bg: "bg-zinc-800 dark:bg-zinc-800 hover:bg-zinc-700 dark:hover:bg-zinc-700 text-white",
    border: "border-zinc-900 dark:border-zinc-700",
    text: "text-zinc-100 dark:text-zinc-100",
    icon: Wrench,
  },
};

export function AvailabilityView() {
  const { user } = useAuthStore();
  const { toast } = useToast();

  const tenantId = user?.tenantId || "t-123";

  const [groups, setGroups] = useState<ResourceGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  // Modal State
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [groupForm, setGroupForm] = useState({ name: "", category: "properti", description: "" });

  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ResourceItem | null>(null);
  const [itemForm, setItemForm] = useState({
    code: "",
    name: "",
    houseType: "",
    status: "AVAILABLE" as ResourceStatus,
    price: "",
    customerName: "",
    customerPhone: "",
    notes: "",
  });

  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchForm, setBatchForm] = useState({ prefix: "A-", startNumber: "1", endNumber: "10", houseType: "", price: "" });

  // Validation & loading states — Sprint 0 UX fixes
  const [groupError, setGroupError] = useState("");
  const [itemError, setItemError] = useState("");
  const [batchError, setBatchError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Fetch groups
  const fetchGroups = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/availability/groups?tenantId=${tenantId}`);
      if (res.ok) {
        const json = await res.json();
        // NestJS TransformInterceptor membungkus response di dalam properti `data`
        const groupList = Array.isArray(json) ? json : (Array.isArray(json?.data) ? json.data : []);
        setGroups(groupList);
        if (groupList.length > 0 && !selectedGroupId) {
          setSelectedGroupId(groupList[0].id);
        }
      }
    } catch (e) {
      console.error(e);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, [tenantId]);

  const activeGroup = useMemo(() => {
    const safeGroups = Array.isArray(groups) ? groups : [];
    return safeGroups.find((g) => g.id === selectedGroupId) || safeGroups[0] || null;
  }, [groups, selectedGroupId]);

  // Filtered items
  const filteredItems = useMemo(() => {
    if (!activeGroup || !activeGroup.items) return [];
    const q = searchQuery.toLowerCase();
    return activeGroup.items.filter((item) => {
      const matchSearch =
        item.code.toLowerCase().includes(q) ||
        (item.houseType && item.houseType.toLowerCase().includes(q)) ||
        (item.customerName && item.customerName.toLowerCase().includes(q)) ||
        (item.name && item.name.toLowerCase().includes(q));
      const matchStatus = filterStatus === "ALL" || item.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [activeGroup, searchQuery, filterStatus]);

  // Statistics
  const stats = useMemo(() => {
    const items = activeGroup?.items || [];
    const available = items.filter((i) => i.status === "AVAILABLE").length;
    const booked = items.filter((i) => i.status === "BOOKED").length;
    const occupied = items.filter((i) => i.status === "OCCUPIED").length;
    return { total: items.length, available, booked, occupied };
  }, [activeGroup]);

  // Handlers — with inline validation (F1) + anti-double-submit (F2)
  const handleSaveGroup = async () => {
    const trimmed = groupForm.name.trim();
    if (!trimmed) { setGroupError("Nama perumahan wajib diisi"); return; }
    if (trimmed.length < 3) { setGroupError("Minimal 3 karakter"); return; }
    setGroupError("");
    if (isSaving) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/v1/availability/groups?tenantId=${tenantId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...groupForm, name: trimmed }),
      });
      if (res.ok) {
        toast({ title: "Berhasil", description: "Perumahan baru telah ditambahkan" });
        setIsGroupModalOpen(false);
        setGroupForm({ name: "", category: "properti", description: "" });
        fetchGroups();
      } else {
        const j = await res.json().catch(() => ({}));
        const msg = j.message || j.data?.message || "Gagal menyimpan";
        setGroupError(msg);
        toast({ title: "Gagal", description: msg, variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setIsSaving(false); }
  };

  const handleSaveItem = async () => {
    const code = itemForm.code.trim();
    if (!activeGroup || !code) { setItemError("Nama blok / kode wajib diisi"); return; }
    if (itemForm.price && isNaN(parseFloat(itemForm.price))) { setItemError("Harga harus angka valid"); return; }
    if (itemForm.price && parseFloat(itemForm.price) < 0) { setItemError("Harga tidak boleh negatif"); return; }
    setItemError("");
    if (isSaving) return;
    setIsSaving(true);
    try {
      const payload = {
        code,
        name: itemForm.name.trim() || undefined,
        houseType: itemForm.houseType.trim() || undefined,
        status: itemForm.status,
        price: itemForm.price ? parseFloat(itemForm.price) : undefined,
        customerName: itemForm.customerName.trim() || undefined,
        customerPhone: itemForm.customerPhone.trim() || undefined,
        notes: itemForm.notes.trim() || undefined,
      };

      let res;
      if (editingItem) {
        res = await fetch(`/api/v1/availability/items/${editingItem.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`/api/v1/availability/groups/${activeGroup.id}/items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (res.ok) {
        toast({ title: "Berhasil", description: editingItem ? "Data unit diperbarui" : "Unit baru ditambahkan" });
        setIsItemModalOpen(false);
        setEditingItem(null);
        setItemError("");
        fetchGroups();
      } else {
        const j = await res.json().catch(() => ({}));
        const msg = j.message || j.data?.message || "Gagal menyimpan unit";
        setItemError(msg);
        toast({ title: "Gagal", description: msg, variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setIsSaving(false); }
  };

  const handleBatchGenerate = async () => {
    if (!activeGroup) return;
    const prefix = batchForm.prefix.trim();
    if (!prefix) { setBatchError("Prefix blok wajib diisi"); return; }
    
    const startNum = parseInt(batchForm.startNumber, 10);
    const endNum = parseInt(batchForm.endNumber, 10);

    if (isNaN(startNum) || startNum < 1) { setBatchError("Nomor awal harus berupa angka minimal 1"); return; }
    if (isNaN(endNum) || endNum < 1) { setBatchError("Nomor akhir harus berupa angka minimal 1"); return; }
    if (endNum < startNum) { setBatchError("Nomor akhir harus ≥ nomor awal"); return; }
    if (endNum - startNum > 200) { setBatchError("Maksimal 200 unit per batch"); return; }
    setBatchError("");
    if (isSaving) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/v1/availability/groups/${activeGroup.id}/batch-items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prefix,
          startNumber: startNum,
          endNumber: endNum,
          houseType: batchForm.houseType.trim() || undefined,
          price: batchForm.price ? parseFloat(batchForm.price) : undefined,
        }),
      });
      if (res.ok) {
        toast({ title: "Berhasil", description: "Batch unit berhasil digenerate" });
        setIsBatchModalOpen(false);
        setBatchError("");
        fetchGroups();
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setIsSaving(false); }
  };

  const [isUploading, setIsUploading] = useState(false);

  const handleUploadMedia = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeGroup) return;

    const formData = new FormData();
    formData.append("file", file);

    setIsUploading(true);
    try {
      const res = await fetch("/api/v1/availability/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      const resData = data.data || data;

      if (!res.ok || !resData.url) {
        throw new Error(resData.message || "Gagal upload media");
      }

      // Simpan URL media ke siteplanImage di ResourceGroup
      const updateRes = await fetch(`/api/v1/availability/groups/${activeGroup.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteplanImage: resData.url }),
      });

      if (updateRes.ok) {
        toast({
          title: "Media Tersimpan",
          description: `File berhasil disimpan ke local storage VPS: ${resData.url}`,
        });
        fetchGroups();
      }
    } catch (err: any) {
      toast({
        title: "Gagal Upload",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleRemoveMedia = async () => {
    if (!activeGroup || !confirm("Hapus foto/video siteplan ini?")) return;
    try {
      const res = await fetch(`/api/v1/availability/groups/${activeGroup.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteplanImage: "" }),
      });
      if (res.ok) {
        toast({ title: "Media Dihapus", description: "Foto/video denah telah dilepas" });
        fetchGroups();
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm("Hapus unit/slot ini?")) return;
    try {
      const res = await fetch(`/api/v1/availability/items/${itemId}`, { method: "DELETE" });
      if (res.ok) {
        toast({ title: "Dihapus", description: "Unit/slot berhasil dihapus" });
        fetchGroups();
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const openEditModal = (item: ResourceItem) => {
    setEditingItem(item);
    setItemForm({
      code: item.code,
      name: item.name || "",
      houseType: item.houseType || "",
      status: item.status,
      price: item.price ? String(item.price) : "",
      customerName: item.customerName || "",
      customerPhone: item.customerPhone || "",
      notes: item.notes || "",
    });
    setIsItemModalOpen(true);
  };

  const openCreateModal = () => {
    setEditingItem(null);
    setItemForm({
      code: "",
      name: "",
      houseType: "",
      status: "AVAILABLE",
      price: "",
      customerName: "",
      customerPhone: "",
      notes: "",
    });
    setIsItemModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Siteplan</h2>
          <p className="text-sm text-muted-foreground">
            Kelola denah blok, tipe rumah, dan status ketersediaan unit perumahan.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchGroups} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setIsGroupModalOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" /> Tambah Perumahan
          </Button>
        </div>
      </div>

      {/* Tabs / Grup Selector & Actions */}
      {groups.length > 0 && (
        <div className="flex items-center justify-between gap-4 overflow-x-auto pb-2 border-b">
          <div className="flex items-center gap-2">
            {groups.map((g) => {
              const isSelected = (activeGroup?.id === g.id);
              return (
                <button
                  key={g.id}
                  onClick={() => setSelectedGroupId(g.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex items-center gap-2 ${
                    isSelected
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "bg-secondary/60 hover:bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Layers className="h-4 w-4" />
                  {g.name}
                  <Badge variant={isSelected ? "outline" : "secondary"} className={`ml-1 text-[11px] ${isSelected ? "text-white border-white/40" : ""}`}>
                    {g.items?.length || 0}
                  </Badge>
                </button>
              );
            })}
          </div>

          {activeGroup && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 shrink-0"
              onClick={async () => {
                if (!confirm(`Hapus seluruh grup/proyek "${activeGroup.name}" beserta semua unit di dalamnya?`)) return;
                try {
                  const res = await fetch(`/api/v1/availability/groups/${activeGroup.id}`, { method: "DELETE" });
                  if (res.ok) {
                    toast({ title: "Dihapus", description: "Proyek/Grup berhasil dihapus" });
                    setSelectedGroupId(null);
                    fetchGroups();
                  }
                } catch (e: any) {
                  toast({ title: "Error", description: e.message, variant: "destructive" });
                }
              }}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Hapus Grup Aktif
            </Button>
          )}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 flex flex-col justify-between">
          <span className="text-xs text-muted-foreground font-medium">Total Unit</span>
          <span className="text-2xl font-bold mt-2">{stats.total}</span>
        </Card>
        <Card className="p-4 flex flex-col justify-between border-emerald-200 bg-emerald-50/40 dark:bg-emerald-950/20">
          <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">Unit Ready (Hijau)</span>
          <span className="text-2xl font-bold text-emerald-600 mt-2">{stats.available}</span>
        </Card>
        <Card className="p-4 flex flex-col justify-between border-orange-200 bg-orange-50/40 dark:bg-orange-950/20">
          <span className="text-xs text-orange-700 dark:text-orange-400 font-medium">Proses Bank (Orange)</span>
          <span className="text-2xl font-bold text-orange-600 mt-2">{stats.booked}</span>
        </Card>
        <Card className="p-4 flex flex-col justify-between border-red-200 bg-red-50/40 dark:bg-red-950/20">
          <span className="text-xs text-red-700 dark:text-red-400 font-medium">Sudah Terjual (Merah)</span>
          <span className="text-2xl font-bold text-red-600 mt-2">{stats.occupied}</span>
        </Card>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari blok, tipe, atau pembeli..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua Status</SelectItem>
              <SelectItem value="AVAILABLE">🟢 Unit Ready (Hijau)</SelectItem>
              <SelectItem value="BOOKED">🟠 Proses Bank (Orange)</SelectItem>
              <SelectItem value="OCCUPIED">🔴 Sudah Terjual (Merah)</SelectItem>
              <SelectItem value="MAINTENANCE">⚫ Rumah Contoh (Abu Hitam)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {activeGroup && (
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button variant="outline" size="sm" onClick={() => setIsBatchModalOpen(true)}>
              + Generate Batch
            </Button>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={openCreateModal}>
              <Plus className="h-4 w-4 mr-1" /> Tambah Unit
            </Button>
        </div>
      )}

      {/* Media Siteplan Showcase (Foto / Video) */}
      {activeGroup && (
        <Card className="p-4 border-dashed bg-muted/20">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                <Image className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">Media Denah Siteplan &amp; Video Showcase</h3>
                <p className="text-xs text-muted-foreground">
                  Foto denah atau video cluster perumahan. Tersimpan langsung di storage VPS dan dapat dikirim otomatis oleh bot WAHA.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={handleUploadMedia}
                  disabled={isUploading}
                />
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  disabled={isUploading}
                  className="text-xs gap-1.5 cursor-pointer"
                >
                  <span>
                    <Upload className={`h-3.5 w-3.5 ${isUploading ? "animate-bounce" : ""}`} />
                    {isUploading ? "Mengunggah..." : activeGroup.siteplanImage ? "Ganti Foto/Video" : "Upload Foto / Video"}
                  </span>
                </Button>
              </label>

              {activeGroup.siteplanImage && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveMedia}
                  className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Hapus
                </Button>
              )}
            </div>
          </div>

          {activeGroup.siteplanImage ? (
            <div className="mt-2 rounded-xl overflow-hidden border bg-background/50 flex flex-col items-center justify-center p-2">
              {/\.(mp4|webm|ogg|mov|mkv)$/i.test(activeGroup.siteplanImage) ? (
                <div className="w-full max-w-2xl space-y-2">
                  <video
                    controls
                    src={activeGroup.siteplanImage}
                    className="w-full max-h-80 rounded-lg bg-black"
                  />
                  <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                    <span className="flex items-center gap-1 font-mono text-[11px] truncate max-w-md">
                      <FileVideo className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                      {activeGroup.siteplanImage}
                    </span>
                    <a
                      href={activeGroup.siteplanImage}
                      target="_blank"
                      rel="noreferrer"
                      className="text-emerald-600 hover:underline flex items-center gap-1 shrink-0"
                    >
                      Buka URL <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              ) : (
                <div className="w-full max-w-2xl space-y-2">
                  <img
                    src={activeGroup.siteplanImage}
                    alt="Denah Siteplan"
                    className="w-full max-h-80 object-contain rounded-lg bg-muted/40"
                  />
                  <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                    <span className="flex items-center gap-1 font-mono text-[11px] truncate max-w-md">
                      <Image className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      {activeGroup.siteplanImage}
                    </span>
                    <a
                      href={activeGroup.siteplanImage}
                      target="_blank"
                      rel="noreferrer"
                      className="text-emerald-600 hover:underline flex items-center gap-1 shrink-0"
                    >
                      Buka URL <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground">
              Belum ada foto denah siteplan atau video properti untuk cluster ini. Klik tombol di atas untuk mengunggah.
            </div>
          )}
        </Card>
      )}
      </div>

      {/* Grid Matrix View */}
      {filteredItems.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">
            {!activeGroup
              ? "Belum ada perumahan. Klik 'Tambah Perumahan' di atas untuk memulai."
              : "Belum ada unit yang cocok dengan pencarian Anda."}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {filteredItems.map((item) => {
            const conf = STATUS_CONFIG[item.status as ResourceStatus] || STATUS_CONFIG.AVAILABLE;
            const Icon = conf.icon;

            return (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                aria-label={`Edit unit ${item.code} tipe ${item.houseType || "-"} status ${conf.label}`}
                onClick={() => openEditModal(item)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openEditModal(item); }}}
                className={`cursor-pointer rounded-xl border p-3.5 transition-colors relative flex flex-col justify-between gap-3 hover:bg-opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ${conf.bg} ${conf.border}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-extrabold text-base tracking-tight">{item.code}</span>
                    {item.houseType ? (
                      <p className="text-xs font-semibold text-muted-foreground">Tipe {item.houseType}</p>
                    ) : item.name ? (
                      <p className="text-xs text-muted-foreground truncate max-w-[100px]">{item.name}</p>
                    ) : null}
                  </div>
                  <Icon aria-hidden="true" className={`h-4 w-4 shrink-0 ${conf.text}`} />
                </div>

                <div>
                  {item.customerName ? (
                    <div className="text-xs font-medium truncate" title={item.customerName}>
                      👤 {item.customerName}
                    </div>
                  ) : item.price ? (
                    <div className="text-xs font-semibold text-muted-foreground tabular-nums">
                      Rp {Number(item.price).toLocaleString("id-ID")}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">
                      {item.houseType ? `Tipe ${item.houseType}` : "Siap Dipilih"}
                    </div>
                  )}

                  <div className="mt-2 flex items-center justify-between gap-1 overflow-hidden">
                    <span className={`inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-normal px-1.5 py-0.5 rounded-md bg-background/80 truncate ${conf.text}`}>
                      <Icon aria-hidden="true" className="h-3 w-3 shrink-0" /> <span className="truncate">{conf.label}</span>
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Hapus unit ${item.code}`}
                      title={`Hapus ${item.code}`}
                      className="h-8 w-8 min-h-[36px] min-w-[36px] p-0 shrink-0 text-muted-foreground hover:text-destructive touch-manipulation hover:bg-black/5 dark:hover:bg-white/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteItem(item.id);
                      }}
                    >
                      <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Tambah Perumahan */}
      <Dialog open={isGroupModalOpen} onOpenChange={setIsGroupModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Perumahan Baru</DialogTitle>
            <DialogDescription>
              Buat nama perumahan atau cluster proyek untuk denah siteplan.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="groupName">Nama Perumahan</Label>
              <Input
                id="groupName"
                placeholder="misal: Cluster Grand Harmoni, Griya Amanah 2"
                value={groupForm.name}
                onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="category">Kategori</Label>
              <Select
                value={groupForm.category}
                onValueChange={(val) => setGroupForm({ ...groupForm, category: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="properti">Properti / Perumahan</SelectItem>
                  <SelectItem value="lainnya">Lainnya</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="desc">Deskripsi Singkat</Label>
              <Textarea
                id="desc"
                placeholder="Catatan informasi seputar proyek atau area ini..."
                value={groupForm.description}
                onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })}
              />
            </div>
            {groupError && <p role="alert" className="text-xs text-destructive">{groupError}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsGroupModalOpen(false); setGroupError(""); }}>Batal</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleSaveGroup} disabled={isSaving}>{isSaving ? "Menyimpan..." : "Simpan"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Tambah / Edit Unit Siteplan */}
      <Dialog open={isItemModalOpen} onOpenChange={setIsItemModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? `Edit Unit (${editingItem.code})` : "Tambah Unit Baru"}</DialogTitle>
            <DialogDescription>
              Atur nama blok, tipe rumah, harga, dan status ketersediaan unit.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="unitCode">Nama Blok / Kode *</Label>
                <Input
                  id="unitCode"
                  placeholder="misal: Blok A-01, B-12"
                  value={itemForm.code}
                  aria-invalid={!!itemError}
                  onChange={(e) => { setItemForm({ ...itemForm, code: e.target.value }); if (itemError) setItemError(""); }}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={itemForm.status}
                  onValueChange={(val: ResourceStatus) => setItemForm({ ...itemForm, status: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AVAILABLE">🟢 Unit Ready</SelectItem>
                    <SelectItem value="BOOKED">🟠 Proses Bank</SelectItem>
                    <SelectItem value="OCCUPIED">🔴 Sudah Terjual</SelectItem>
                    <SelectItem value="MAINTENANCE">⚫ Rumah Contoh</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="houseType">Tipe Rumah</Label>
                <Input
                  id="houseType"
                  placeholder="misal: 36/72, 45/90"
                  value={itemForm.houseType}
                  onChange={(e) => setItemForm({ ...itemForm, houseType: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="unitPrice">Harga (Opsional)</Label>
                <Input
                  id="unitPrice"
                  type="number"
                  placeholder="misal: 350000000"
                  value={itemForm.price}
                  onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="unitName">Nama Perumahan (Opsional)</Label>
              <Input
                id="unitName"
                placeholder="misal: Grand Harmoni, Griya Amanah"
                value={itemForm.name}
                onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
              />
            </div>

            {/* Jika Status Booking / Occupied */}
            {(itemForm.status === "BOOKED" || itemForm.status === "OCCUPIED") && (
              <div className="p-3 bg-secondary/50 rounded-lg space-y-3 border">
                <span className="text-xs font-bold text-muted-foreground uppercase">Informasi Pemesan / Penghuni</span>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="custName" className="text-xs">Nama Pembeli</Label>
                    <Input
                      id="custName"
                      placeholder="Bpk. Budi Santoso"
                      value={itemForm.customerName}
                      onChange={(e) => setItemForm({ ...itemForm, customerName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="custPhone" className="text-xs">Nomor WhatsApp</Label>
                    <Input
                      id="custPhone"
                      placeholder="08123456789"
                      value={itemForm.customerPhone}
                      onChange={(e) => setItemForm({ ...itemForm, customerPhone: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="notes">Catatan Tambahan</Label>
              <Textarea
                id="notes"
                placeholder="Catatan DP, progress bangunan, dll..."
                value={itemForm.notes}
                onChange={(e) => setItemForm({ ...itemForm, notes: e.target.value })}
              />
            </div>
            {itemError && <p role="alert" aria-live="polite" className="text-xs text-destructive">{itemError}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsItemModalOpen(false); setItemError(""); }}>Batal</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleSaveItem} disabled={isSaving}>{isSaving ? "Menyimpan..." : "Simpan Unit"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Batch Generator Siteplan */}
      <Dialog open={isBatchModalOpen} onOpenChange={(open) => { setIsBatchModalOpen(open); if (!open) setBatchError(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Batch Unit Siteplan</DialogTitle>
            <DialogDescription>
              Buat banyak blok sekaligus dengan urutan nomor otomatis (misal Blok A-01 s/d A-20).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={(e) => { e.preventDefault(); handleBatchGenerate(); }} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="prefix">Prefix Blok</Label>
              <Input
                id="prefix"
                placeholder="misal: Blok A-, Blok B-"
                value={batchForm.prefix}
                onChange={(e) => { setBatchForm({ ...batchForm, prefix: e.target.value }); if (batchError) setBatchError(""); }}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="startNum">Nomor Awal</Label>
                <Input
                  id="startNum"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="1"
                  value={batchForm.startNumber}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    setBatchForm({ ...batchForm, startNumber: val });
                    if (batchError) setBatchError("");
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="endNum">Nomor Akhir</Label>
                <Input
                  id="endNum"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="10"
                  value={batchForm.endNumber}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    setBatchForm({ ...batchForm, endNumber: val });
                    if (batchError) setBatchError("");
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="batchHouseType">Tipe Rumah Default</Label>
                <Input
                  id="batchHouseType"
                  placeholder="misal: 36/72"
                  value={batchForm.houseType}
                  onChange={(e) => setBatchForm({ ...batchForm, houseType: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="batchPrice">Harga Default (Opsional)</Label>
                <Input
                  id="batchPrice"
                  type="number"
                  placeholder="350000000"
                  value={batchForm.price}
                  onChange={(e) => setBatchForm({ ...batchForm, price: e.target.value })}
                />
              </div>
            </div>
            {batchError && <p role="alert" className="text-xs text-destructive font-medium">{batchError}</p>}

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => { setIsBatchModalOpen(false); setBatchError(""); }}>Batal</Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={isSaving}>
                {isSaving ? "Memproses..." : "Generate Sekarang"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
