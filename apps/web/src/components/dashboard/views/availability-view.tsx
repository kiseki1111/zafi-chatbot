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
  Plus, Search, Edit3, Trash2, CheckCircle2, Clock, XCircle, Wrench, Layers, RefreshCw, Upload, Image, FileVideo, ExternalLink, Play, Copy, Check, Film, BookOpen, Sparkles, FileText,
} from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { useToast } from "@/hooks/use-toast";
import type { ResourceGroup, ResourceItem, ResourceStatus } from "@/lib/types";

/**
 * Membersihkan format harga (menerima "3500000", "3.500.000", maupun "Rp 3.500.000") menjadi angka murni
 */
export function parseIdrPrice(value: string | number | undefined | null): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "number") return isNaN(value) ? undefined : value;
  const cleaned = value.toString().replace(/[^0-9]/g, "");
  if (!cleaned) return undefined;
  const parsed = parseInt(cleaned, 10);
  return isNaN(parsed) ? undefined : parsed;
}

/**
 * Memformat angka ke pemisah ribuan standar Indonesia (contoh: 3500000 -> "3.500.000")
 */
export function formatIdr(value: number | string | undefined | null): string {
  const num = typeof value === "number" ? value : parseIdrPrice(value);
  if (num === undefined) return "0";
  return num.toLocaleString("id-ID");
}

export interface SiteplanMedia {
  id: string;
  name: string;
  url: string;
  type: "image" | "video";
  description?: string;
  createdAt?: string;
}

export interface ClusterKnowledgeItem {
  id: string;
  title: string;
  category: string;
  content: string;
  updatedAt?: string;
}

function parseClusterKnowledge(raw?: string | null): ClusterKnowledgeItem[] {
  if (!raw || !raw.trim()) return [];
  const trimmed = raw.trim();
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {}
  }
  return [
    {
      id: "k-legacy",
      title: "Informasi & Ketentuan Cluster",
      category: "Umum",
      content: trimmed,
      updatedAt: new Date().toISOString().slice(0, 10),
    },
  ];
}

function parseGroupMedia(raw?: string | null): SiteplanMedia[] {
  if (!raw || !raw.trim()) return [];
  const trimmed = raw.trim();
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {}
  }
  return [
    {
      id: "legacy-1",
      name: "Denah Siteplan Utama",
      url: trimmed,
      type: /\.(mp4|webm|ogg|mov|mkv)$/i.test(trimmed) ? "video" : "image",
      description: "Denah perumahan / cluster",
      createdAt: new Date().toISOString().slice(0, 10),
    },
  ];
}

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
    const parsedPrice = parseIdrPrice(itemForm.price);
    if (itemForm.price && parsedPrice === undefined) { setItemError("Harga harus angka valid"); return; }
    if (parsedPrice !== undefined && parsedPrice < 0) { setItemError("Harga tidak boleh negatif"); return; }
    setItemError("");
    if (isSaving) return;
    setIsSaving(true);
    try {
      const payload = {
        code,
        name: itemForm.name.trim() || undefined,
        houseType: itemForm.houseType.trim() || undefined,
        status: itemForm.status,
        price: parsedPrice,
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
    const parsedBatchPrice = parseIdrPrice(batchForm.price);
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
          price: parsedBatchPrice,
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

  const handleItemPriceChange = (val: string) => {
    const raw = val.replace(/[^0-9]/g, "");
    if (!raw) {
      setItemForm({ ...itemForm, price: "" });
      return;
    }
    const formatted = parseInt(raw, 10).toLocaleString("id-ID");
    setItemForm({ ...itemForm, price: formatted });
  };

  const handleBatchPriceChange = (val: string) => {
    const raw = val.replace(/[^0-9]/g, "");
    if (!raw) {
      setBatchForm({ ...batchForm, price: "" });
      return;
    }
    const formatted = parseInt(raw, 10).toLocaleString("id-ID");
    setBatchForm({ ...batchForm, price: formatted });
  };

  // Knowledge Modular Khusus Cluster
  const clusterKnowledgeList = useMemo(() => {
    return parseClusterKnowledge(activeGroup?.description);
  }, [activeGroup?.description]);

  const [isKnowledgeModalOpen, setIsKnowledgeModalOpen] = useState(false);
  const [editingKnowledgeId, setEditingKnowledgeId] = useState<string | null>(null);
  const [knowledgeForm, setKnowledgeForm] = useState({
    title: "",
    category: "Spesifikasi Bangunan",
    content: "",
  });
  const [isSavingKnowledge, setIsSavingKnowledge] = useState(false);

  const openCreateKnowledgeModal = (defaultCat?: string) => {
    setEditingKnowledgeId(null);
    setKnowledgeForm({
      title: "",
      category: defaultCat || "Spesifikasi Bangunan",
      content: "",
    });
    setIsKnowledgeModalOpen(true);
  };

  const openEditKnowledgeModal = (item: ClusterKnowledgeItem) => {
    setEditingKnowledgeId(item.id);
    setKnowledgeForm({
      title: item.title,
      category: item.category || "Umum",
      content: item.content,
    });
    setIsKnowledgeModalOpen(true);
  };

  const handleSaveKnowledgeItem = async () => {
    if (!activeGroup) return;
    if (!knowledgeForm.title.trim() || !knowledgeForm.content.trim()) {
      toast({ title: "Lengkapi data", description: "Judul dan isi knowledge wajib diisi", variant: "destructive" });
      return;
    }

    setIsSavingKnowledge(true);
    try {
      let updated: ClusterKnowledgeItem[];
      if (editingKnowledgeId) {
        updated = clusterKnowledgeList.map((k) =>
          k.id === editingKnowledgeId
            ? {
                ...k,
                title: knowledgeForm.title.trim(),
                category: knowledgeForm.category,
                content: knowledgeForm.content.trim(),
                updatedAt: new Date().toISOString().slice(0, 10),
              }
            : k
        );
      } else {
        const newItem: ClusterKnowledgeItem = {
          id: "k-" + Date.now(),
          title: knowledgeForm.title.trim(),
          category: knowledgeForm.category,
          content: knowledgeForm.content.trim(),
          updatedAt: new Date().toISOString().slice(0, 10),
        };
        updated = [...clusterKnowledgeList, newItem];
      }

      await saveClusterKnowledgeList(updated);
      setIsKnowledgeModalOpen(false);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setIsSavingKnowledge(false);
    }
  };

  const handleDeleteKnowledgeItem = async (id: string, title: string) => {
    if (!activeGroup) return;
    if (!confirm(`Hapus knowledge "${title}"?`)) return;

    try {
      const updated = clusterKnowledgeList.filter((k) => k.id !== id);
      await saveClusterKnowledgeList(updated);
      toast({ title: "Dihapus", description: "Knowledge cluster berhasil dihapus" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const saveClusterKnowledgeList = async (list: ClusterKnowledgeItem[]) => {
    if (!activeGroup) return;
    const payload = JSON.stringify(list);
    const res = await fetch(`/api/v1/availability/groups/${activeGroup.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: payload }),
    });
    if (res.ok) {
      toast({ title: "Berhasil", description: "Knowledge cluster berhasil disimpan untuk bot AI" });
      fetchGroups();
    } else {
      throw new Error("Gagal menyimpan ke server");
    }
  };

  // Galeri Foto & Video Properti
  const mediaList = useMemo(() => {
    return parseGroupMedia(activeGroup?.siteplanImage);
  }, [activeGroup?.siteplanImage]);

  // Upload Modal State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState("");
  const [uploadDesc, setUploadDesc] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // Detail & Edit Media Modal State
  const [selectedMedia, setSelectedMedia] = useState<SiteplanMedia | null>(null);
  const [editMediaName, setEditMediaName] = useState("");
  const [editMediaDesc, setEditMediaDesc] = useState("");
  const [isSavingMedia, setIsSavingMedia] = useState(false);

  const handleSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
      if (!uploadName.trim()) {
        const clean = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
        setUploadName(clean);
      }
    }
  };

  const handleUploadNewMedia = async () => {
    if (!uploadFile || !activeGroup) {
      toast({ title: "Pilih file", description: "Silakan pilih file gambar atau video terlebih dahulu", variant: "destructive" });
      return;
    }
    if (!uploadName.trim()) {
      toast({ title: "Nama file wajib", description: "Beri nama file agar dikenali oleh bot AI", variant: "destructive" });
      return;
    }

    const formData = new FormData();
    formData.append("file", uploadFile);

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

      const newMedia: SiteplanMedia = {
        id: "m-" + Date.now(),
        name: uploadName.trim(),
        url: resData.url,
        type: resData.mediaType || (uploadFile.type.startsWith("video/") ? "video" : "image"),
        description: uploadDesc.trim() || undefined,
        createdAt: new Date().toISOString().slice(0, 10),
      };

      const updated = [...mediaList, newMedia];
      await saveMediaList(updated);

      setIsUploadModalOpen(false);
      setUploadFile(null);
      setUploadName("");
      setUploadDesc("");
    } catch (err: any) {
      toast({ title: "Gagal Upload", description: err.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const openMediaDetail = (m: SiteplanMedia) => {
    setSelectedMedia(m);
    setEditMediaName(m.name);
    setEditMediaDesc(m.description || "");
  };

  const handleUpdateMedia = async () => {
    if (!selectedMedia || !activeGroup) return;
    if (!editMediaName.trim()) {
      toast({ title: "Nama wajib", description: "Nama file tidak boleh kosong", variant: "destructive" });
      return;
    }

    setIsSavingMedia(true);
    try {
      const updated = mediaList.map((m) =>
        m.id === selectedMedia.id
          ? { ...m, name: editMediaName.trim(), description: editMediaDesc.trim() || undefined }
          : m
      );
      await saveMediaList(updated);
      setSelectedMedia(null);
    } catch (err: any) {
      toast({ title: "Gagal Menyimpan", description: err.message, variant: "destructive" });
    } finally {
      setIsSavingMedia(false);
    }
  };

  const handleDeleteMedia = async () => {
    if (!selectedMedia || !activeGroup) return;
    if (!confirm(`Hapus media "${selectedMedia.name}" dari cluster ini?`)) return;

    setIsSavingMedia(true);
    try {
      const updated = mediaList.filter((m) => m.id !== selectedMedia.id);
      await saveMediaList(updated);
      setSelectedMedia(null);
    } catch (err: any) {
      toast({ title: "Gagal Menghapus", description: err.message, variant: "destructive" });
    } finally {
      setIsSavingMedia(false);
    }
  };

  const saveMediaList = async (list: SiteplanMedia[]) => {
    if (!activeGroup) return;
    const payload = JSON.stringify(list);
    const res = await fetch(`/api/v1/availability/groups/${activeGroup.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ siteplanImage: payload }),
    });
    if (res.ok) {
      toast({ title: "Tersimpan", description: "Galeri media berhasil diperbarui" });
      fetchGroups();
    } else {
      throw new Error("Gagal menyimpan ke server");
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
      price: item.price ? formatIdr(item.price) : "",
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

      {/* Modular Knowledge Khusus Cluster */}
      {activeGroup && (
        <Card className="p-4 border bg-gradient-to-br from-background via-muted/10 to-background shadow-2xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2.5 border-b">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 shrink-0">
                <BookOpen className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-sm text-foreground">
                    Knowledge Khusus Cluster: {activeGroup.name}
                  </h4>
                  <Badge variant="secondary" className="text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                    {clusterKnowledgeList.length} Topik Tersimpan
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Informasi mendalam spesifikasi rumah, fasilitas lingkungan, dan promo cluster. Digunakan otomatis oleh bot AI WhatsApp saat menjawab pembeli.
                </p>
              </div>
            </div>

            <Button
              size="sm"
              onClick={() => openCreateKnowledgeModal()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 px-3.5 gap-1.5 font-semibold shrink-0 shadow-2xs"
            >
              <Plus className="h-3.5 w-3.5" /> Tambah Topik Knowledge
            </Button>
          </div>

          {clusterKnowledgeList.length === 0 ? (
            <div className="py-6 px-4 border border-dashed rounded-xl bg-muted/20 text-center space-y-2">
              <p className="text-xs text-muted-foreground">
                Belum ada topik knowledge khusus untuk cluster <strong>{activeGroup.name}</strong>. Pilih topik awal untuk ditambahkan:
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-7 gap-1 border-blue-200 text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                  onClick={() => openCreateKnowledgeModal("Spesifikasi Bangunan")}
                >
                  + Spesifikasi Bangunan
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-7 gap-1 border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                  onClick={() => openCreateKnowledgeModal("Fasilitas & Lingkungan")}
                >
                  + Fasilitas &amp; Lingkungan
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-7 gap-1 border-purple-200 text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950/40"
                  onClick={() => openCreateKnowledgeModal("Promo & Ketentuan KPR")}
                >
                  + Promo &amp; KPR
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
              {clusterKnowledgeList.map((item) => {
                const categoryColor =
                  item.category?.toLowerCase().includes("spesifikasi")
                    ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800"
                    : item.category?.toLowerCase().includes("fasilitas") || item.category?.toLowerCase().includes("lingkungan")
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                    : item.category?.toLowerCase().includes("promo") || item.category?.toLowerCase().includes("kpr")
                    ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800"
                    : "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/40 dark:text-slate-300 dark:border-slate-800";

                return (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl border bg-card hover:border-emerald-500/60 hover:shadow-2xs transition-all flex flex-col justify-between gap-2.5"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <Badge variant="outline" className={`text-[10px] font-semibold py-0 px-2 border ${categoryColor}`}>
                          {item.category || "Umum"}
                        </Badge>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-foreground"
                            onClick={() => openEditKnowledgeModal(item)}
                            title="Edit Topik"
                          >
                            <Edit3 className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                            onClick={() => handleDeleteKnowledgeItem(item.id, item.title)}
                            title="Hapus Topik"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      <h5 className="font-bold text-xs text-foreground line-clamp-1">{item.title}</h5>
                      <p className="text-[11px] text-muted-foreground line-clamp-3 mt-1 font-sans leading-relaxed whitespace-pre-wrap">
                        {item.content}
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-muted-foreground/80 pt-1.5 border-t">
                      <span className="flex items-center gap-1">
                        <Sparkles className="h-3 w-3 text-emerald-600" /> Aktif di AI Bot
                      </span>
                      <button
                        type="button"
                        onClick={() => openEditKnowledgeModal(item)}
                        className="text-emerald-600 hover:underline font-medium"
                      >
                        Buka / Edit
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
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

      {/* Galeri Foto & Video Properti (Di Bawah List Siteplan) */}
      {activeGroup && (
        <Card className="p-5 border shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                  <Image className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    Galeri Foto &amp; Video Properti ({mediaList.length})
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Koleksi media siteplan, foto rumah, dan video virtual tour. Beri nama pada tiap file agar bot AI WhatsApp dapat mengirimkan foto/video yang tepat saat diminta oleh calon pembeli.
                  </p>
                </div>
              </div>
            </div>

            <Button
              size="sm"
              onClick={() => {
                setUploadFile(null);
                setUploadName("");
                setUploadDesc("");
                setIsUploadModalOpen(true);
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 font-semibold h-9 px-4 shrink-0 shadow-2xs"
            >
              <Upload className="h-4 w-4" /> Upload Foto / Video
            </Button>
          </div>

          {mediaList.length === 0 ? (
            <div className="py-14 border border-dashed rounded-2xl text-center text-xs text-muted-foreground bg-muted/20">
              Belum ada foto atau video properti untuk cluster ini. Klik tombol di atas untuk mengunggah media baru.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {mediaList.map((m) => (
                <div
                  key={m.id}
                  onClick={() => openMediaDetail(m)}
                  className="group rounded-2xl border bg-card overflow-hidden cursor-pointer hover:border-emerald-500 hover:shadow-xs transition-all flex flex-col"
                >
                  {/* Thumbnail */}
                  <div className="h-28 w-full bg-muted relative overflow-hidden flex items-center justify-center">
                    {m.type === "video" ? (
                      <>
                        <video src={m.url} className="w-full h-full object-cover" preload="metadata" />
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/40 transition-colors">
                          <div className="h-8 w-8 rounded-full bg-white/95 text-blue-600 flex items-center justify-center shadow-xs">
                            <Play className="h-3.5 w-3.5 fill-current ml-0.5" />
                          </div>
                        </div>
                      </>
                    ) : (
                      <img
                        src={m.url}
                        alt={m.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                    )}

                    {/* Badge Tipe */}
                    <div className="absolute top-1.5 right-1.5">
                      <Badge
                        variant="secondary"
                        className={`text-[9px] font-bold px-1.5 py-0 shadow-2xs backdrop-blur-sm ${
                          m.type === "video"
                            ? "bg-blue-600/90 text-white"
                            : "bg-emerald-600/90 text-white"
                        }`}
                      >
                        {m.type === "video" ? "VIDEO" : "FOTO"}
                      </Badge>
                    </div>
                  </div>

                  {/* Keterangan Singkat */}
                  <div className="p-2.5 flex-1 flex flex-col justify-between">
                    <p className="font-semibold text-xs text-foreground truncate group-hover:text-emerald-600 transition-colors" title={m.name}>
                      {m.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                      {m.description || "Klik untuk detail & kelola"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* DIALOG: UPLOAD MEDIA BARU */}
      <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-emerald-600" />
              Upload Foto / Video Properti
            </DialogTitle>
            <DialogDescription>
              File akan disimpan ke storage VPS dan dapat diakses oleh bot AI WhatsApp.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-xs py-1">
            <div>
              <Label>Pilih File Foto atau Video (Wajib)</Label>
              <Input
                type="file"
                accept="image/*,video/*"
                onChange={handleSelectFile}
                className="mt-1 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 file:border-0 file:rounded-md file:mr-2"
              />
              {uploadFile && (
                <p className="text-[11px] text-emerald-600 font-medium mt-1">
                  ✓ File terpilih: {uploadFile.name} ({(uploadFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>

            <div>
              <Label>Nama File / Judul Media (Wajib)</Label>
              <Input
                value={uploadName}
                onChange={(e) => setUploadName(e.target.value)}
                placeholder="Contoh: Foto Fasad Tipe 36, Denah Siteplan Blok A, Video Virtual Tour"
                className="h-8 mt-1"
              />
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Beri nama yang jelas karena bot AI akan mencocokkan nama ini dengan permintaan pelanggan di WhatsApp.
              </p>
            </div>

            <div>
              <Label>Deskripsi / Keterangan untuk Bot AI (Opsional)</Label>
              <Textarea
                value={uploadDesc}
                onChange={(e) => setUploadDesc(e.target.value)}
                placeholder="Contoh: Tampilan tampak depan rumah minimalis 2 kamar tidur dengan carport luas."
                rows={3}
                className="mt-1 text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsUploadModalOpen(false)}>
              Batal
            </Button>
            <Button
              size="sm"
              onClick={handleUploadNewMedia}
              disabled={isUploading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              {isUploading ? "Mengunggah..." : "Unggah & Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: DETAIL & EDIT MEDIA (CRUD) */}
      <Dialog open={!!selectedMedia} onOpenChange={(open) => { if (!open) setSelectedMedia(null); }}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedMedia?.type === "video" ? <FileVideo className="h-5 w-5 text-blue-600" /> : <Image className="h-5 w-5 text-emerald-600" />}
              Detail &amp; Pengaturan Media
            </DialogTitle>
            <DialogDescription>
              Lihat pratinjau media, edit nama file untuk bot AI, atau hapus media ini.
            </DialogDescription>
          </DialogHeader>

          {selectedMedia && (
            <div className="space-y-4 text-xs">
              {/* Preview Media */}
              <div className="rounded-2xl border bg-black/5 dark:bg-black/30 overflow-hidden flex items-center justify-center p-2">
                {selectedMedia.type === "video" ? (
                  <video controls src={selectedMedia.url} className="w-full max-h-72 rounded-xl bg-black" />
                ) : (
                  <img src={selectedMedia.url} alt={selectedMedia.name} className="w-full max-h-72 object-contain rounded-xl" />
                )}
              </div>

              {/* Form Edit */}
              <div className="space-y-3">
                <div>
                  <Label>Nama File / Judul Media</Label>
                  <Input
                    value={editMediaName}
                    onChange={(e) => setEditMediaName(e.target.value)}
                    className="h-8 mt-1"
                  />
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Nama yang digunakan oleh bot AI untuk mencocokkan pertanyaan customer di WhatsApp.
                  </p>
                </div>

                <div>
                  <Label>Deskripsi / Kata Kunci untuk Bot AI</Label>
                  <Textarea
                    value={editMediaDesc}
                    onChange={(e) => setEditMediaDesc(e.target.value)}
                    rows={2}
                    className="mt-1 text-xs"
                    placeholder="Keterangan gambar atau spesifikasi unit terkait..."
                  />
                </div>

                <div>
                  <Label>URL File di VPS Storage</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      readOnly
                      value={selectedMedia.url}
                      className="h-8 font-mono text-[11px] bg-muted/40"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs shrink-0 gap-1"
                      onClick={() => {
                        navigator.clipboard.writeText(window.location.origin + selectedMedia.url);
                        toast({ title: "Disalin!", description: "Link URL media disalin ke clipboard" });
                      }}
                    >
                      <Copy className="h-3.5 w-3.5" /> Salin URL
                    </Button>
                    <a
                      href={selectedMedia.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center h-8 px-2.5 rounded-md border text-xs text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 shrink-0 gap-1"
                    >
                      Buka <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex items-center justify-between sm:justify-between w-full pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isSavingMedia}
              onClick={handleDeleteMedia}
              className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Hapus Media
            </Button>

            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setSelectedMedia(null)}>
                Tutup
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={isSavingMedia}
                onClick={handleUpdateMedia}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              >
                {isSavingMedia ? "Menyimpan..." : "Simpan Perubahan"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">Rp</span>
                  <Input
                    id="unitPrice"
                    type="text"
                    placeholder="misal: 350.000.000"
                    value={itemForm.price}
                    onChange={(e) => handleItemPriceChange(e.target.value)}
                    className="pl-9 font-mono"
                  />
                </div>
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
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">Rp</span>
                  <Input
                    id="batchPrice"
                    type="text"
                    placeholder="misal: 350.000.000"
                    value={batchForm.price}
                    onChange={(e) => handleBatchPriceChange(e.target.value)}
                    className="pl-9 font-mono"
                  />
                </div>
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

      {/* DIALOG: TAMBAH / EDIT KNOWLEDGE KHUSUS CLUSTER */}
      <Dialog open={isKnowledgeModalOpen} onOpenChange={setIsKnowledgeModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-emerald-600" />
              {editingKnowledgeId ? "Edit Topik Knowledge Cluster" : "Tambah Topik Knowledge Cluster"}
            </DialogTitle>
            <DialogDescription>
              Tuliskan informasi spesifik cluster <strong>{activeGroup?.name}</strong>. Bot AI WhatsApp otomatis memprioritaskan informasi ini saat calon pembeli bertanya.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 text-xs py-1">
            <div className="space-y-1">
              <Label>Judul Topik (Wajib)</Label>
              <Input
                value={knowledgeForm.title}
                onChange={(e) => setKnowledgeForm({ ...knowledgeForm, title: e.target.value })}
                placeholder="Contoh: Detail Spesifikasi Rumah Tipe 36, Fasilitas & Lingkungan Cluster"
                className="h-8 mt-1"
              />
            </div>

            <div className="space-y-1">
              <Label>Kategori Topik</Label>
              <select
                value={knowledgeForm.category}
                onChange={(e) => setKnowledgeForm({ ...knowledgeForm, category: e.target.value })}
                className="w-full h-8 mt-1 rounded-md border bg-background px-2 text-xs"
              >
                <option value="Spesifikasi Bangunan">Spesifikasi Bangunan (Material, Pondasi, Listrik, Air)</option>
                <option value="Fasilitas & Lingkungan">Fasilitas &amp; Lingkungan (Keamanan, Taman, One Gate)</option>
                <option value="Akses & Lokasi">Akses &amp; Lokasi (Dekat Tol, Stasiun, Sekolah)</option>
                <option value="Promo & Ketentuan KPR">Promo &amp; Ketentuan KPR (DP 0%, Subsidi, Akad)</option>
                <option value="Umum / Lainnya">Umum / Lainnya</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label>Isi Penjelasan Knowledge (Wajib)</Label>
              <Textarea
                rows={7}
                value={knowledgeForm.content}
                onChange={(e) => setKnowledgeForm({ ...knowledgeForm, content: e.target.value })}
                placeholder="Tuliskan poin-poin informasi lengkap yang perlu diketahui calon pembeli..."
                className="font-sans leading-relaxed text-xs"
              />
            </div>

            <div className="p-3 bg-muted/40 rounded-xl border space-y-1 text-[11px] text-muted-foreground">
              <span className="font-semibold text-foreground flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5 text-emerald-600" /> Tips untuk AI yang Akurat:
              </span>
              <p>Tuliskan sedetail mungkin merek atau ukuran (misal: "Lantai granit 60x60, listrik 1300 Watt, air sumur bor jetpump dengan toren 500L").</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsKnowledgeModalOpen(false)}>
              Batal
            </Button>
            <Button
              size="sm"
              disabled={isSavingKnowledge}
              onClick={handleSaveKnowledgeItem}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              {isSavingKnowledge ? "Menyimpan..." : "Simpan Topik Knowledge"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
