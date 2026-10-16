"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/auth-store";
import { useBackgroundTasksStore } from "@/lib/background-tasks-store";
import { toast } from "sonner";
import {
  Loader2, Plus, Trash2, Pencil, FileText, AlignLeft,
  BookOpen, Upload, X, Check, Brain, AlertTriangle, ImageIcon,
  Video, Paperclip, ExternalLink, Copy, Eye, Download
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const API_BASE = "/api/v1";

interface KnowledgeItem {
  id: string;
  title: string;
  content: string;
  metadata?: {
    type?: string;
    mediaType?: 'image' | 'video' | 'pdf' | 'document';
    url?: string;
    filename?: string;
    description?: string;
    name?: string;
  };
  createdAt: string;
}

const MOCK_KNOWLEDGE_ITEMS: KnowledgeItem[] = [
  {
    id: "kb-1",
    title: "Pricelist & Spesifikasi Rumah Tipe 45/90",
    content: "Rumah 1 lantai dengan luas bangunan 45 m2, luas tanah 90 m2. Dilengkapi 2 kamar tidur, 1 kamar mandi, carport 1 mobil, listrik 1300 VA, air PDAM. Harga mulai Rp 650.000.000.",
    metadata: { type: "text" },
    createdAt: "2025-05-01T08:00:00Z",
  },
  {
    id: "kb-2",
    title: "Syarat & Berkas Pengajuan KPR",
    content: "1. KTP Pemohon & Pasangan (jika menikah)\n2. Kartu Keluarga & NPWP\n3. Slip Gaji 3 bulan terakhir\n4. Rekening Koran 3 bulan terakhir\n5. Surat Keterangan Kerja aktif.",
    metadata: { type: "text" },
    createdAt: "2025-05-02T10:30:00Z",
  },
  {
    id: "kb-3",
    title: "Brosur Digital Zafi Royal Residence (PDF)",
    content: "Brosur digital memuat masterplan kawasan 5 hektar, denah tipe 36, 45, dan 60, serta fasilitas club house & one gate system.",
    metadata: { type: "file", filename: "Brosur-Zafi-Residence-2025.pdf" },
    createdAt: "2025-05-05T14:20:00Z",
  },
];

type ModalMode = "create-text" | "create-file" | "create-media" | "edit" | null;

export function KnowledgePage() {
  const { user } = useAuthStore();
  const tenantId = user?.tenantId;
  const {
    runKnowledgeFileUpload,
    runKnowledgeTextCreate,
    runKnowledgeMediaUpload,
  } = useBackgroundTasksStore();

  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editingItem, setEditingItem] = useState<KnowledgeItem | null>(null);
  const [previewItem, setPreviewItem] = useState<KnowledgeItem | null>(null);

  // Form state untuk teks & dokumen OCR
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);

  // Form state untuk file media perusahaan (seperti fitur siteplan)
  const [mediaName, setMediaName] = useState("");
  const [mediaDesc, setMediaDesc] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);

  const fetchKnowledge = async () => {
    const isDemo =
      user?.id?.startsWith("u-") ||
      user?.email?.includes("demo") ||
      (process.env.NODE_ENV !== "production" && !tenantId);

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/knowledge?tenantId=${tenantId}`);
      if (!res.ok) throw new Error();
      const json = await res.json();
      const data = json.data?.data || json.data || json;
      if (Array.isArray(data)) {
        if (data.length > 0) {
          setItems(data);
        } else {
          setItems(isDemo ? MOCK_KNOWLEDGE_ITEMS : []);
        }
      } else {
        setItems(isDemo ? MOCK_KNOWLEDGE_ITEMS : []);
      }
    } catch {
      setItems(isDemo ? MOCK_KNOWLEDGE_ITEMS : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tenantId) fetchKnowledge();
    const handleUpdate = () => {
      fetchKnowledge();
    };
    window.addEventListener("knowledge-updated", handleUpdate);
    return () => {
      window.removeEventListener("knowledge-updated", handleUpdate);
    };
  }, [tenantId]);

  const openCreate = (mode: ModalMode) => {
    setEditingItem(null);
    setTitle("");
    setContent("");
    setFile(null);
    setMediaName("");
    setMediaDesc("");
    setMediaFile(null);
    setModalMode(mode);
  };

  const openEdit = (item: KnowledgeItem) => {
    setEditingItem(item);
    setTitle(item.title);
    setContent(item.content);
    setFile(null);
    setModalMode("edit");
  };

  const closeModal = () => setModalMode(null);

  const handleSubmitText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim())
      return toast.error("Judul dan konten harus diisi");

    const taskTitle = title;
    const taskContent = content;
    closeModal();

    runKnowledgeTextCreate({
      title: taskTitle,
      content: taskContent,
      tenantId: tenantId as string,
      onSuccess: () => {
        fetchKnowledge();
      },
    });
  };

  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    if (!title.trim() || !content.trim()) return toast.error("Judul dan konten harus diisi");
    try {
      setSubmitting(true);
      const res = await fetch(`${API_BASE}/knowledge/${editingItem.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, tenantId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message?.[0] || "Gagal memperbarui");
      }
      toast.success("Knowledge berhasil diperbarui!");
      closeModal();
      fetchKnowledge();
    } catch (err: any) {
      toast.error(err.message || "Gagal memperbarui");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitFile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return toast.error("File harus diunggah");

    const taskFile = file;
    const taskTitle = title;
    closeModal();

    runKnowledgeFileUpload({
      file: taskFile,
      title: taskTitle,
      tenantId: tenantId as string,
      onSuccess: () => {
        fetchKnowledge();
      },
    });
  };

  const handleSelectMediaFile = (f: File | null) => {
    setMediaFile(f);
    if (f && !mediaName.trim()) {
      const clean = f.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
      setMediaName(clean);
    }
  };

  const handleSubmitMedia = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mediaFile) return toast.error("Silakan pilih file terlebih dahulu");
    if (!mediaName.trim()) return toast.error("Nama file wajib diisi");

    const taskFile = mediaFile;
    const taskName = mediaName.trim();
    const taskDesc = mediaDesc.trim();
    closeModal();

    runKnowledgeMediaUpload({
      file: taskFile,
      name: taskName,
      description: taskDesc,
      tenantId: tenantId as string,
      onSuccess: () => {
        fetchKnowledge();
      },
    });
  };

  const [itemToDelete, setItemToDelete] = useState<{ id: string; title: string } | null>(null);

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      const res = await fetch(`${API_BASE}/knowledge/${itemToDelete.id}?tenantId=${tenantId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      toast.success("Knowledge berhasil dihapus");
      setItems(prev => prev.filter(i => i.id !== itemToDelete.id));
      setItemToDelete(null);
    } catch {
      toast.error("Gagal menghapus knowledge");
    }
  };

  const cardColors = [
    "from-emerald-500/10 to-teal-500/5 border-emerald-500/20",
    "from-teal-500/10 to-cyan-500/5 border-teal-500/20",
    "from-green-500/10 to-emerald-500/5 border-green-500/20",
    "from-cyan-500/10 to-teal-500/5 border-cyan-500/20",
    "from-lime-500/10 to-green-500/5 border-lime-500/20",
  ];

  return (
    <div className="space-y-4 p-1">
      {/* Header - Minimalist & Compact (Zero Overlapping) */}
      <div className="rounded-xl border bg-card p-3 sm:p-4 shadow-xs space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 grid place-items-center shrink-0">
              <Brain className="h-4.5 w-4.5" />
            </div>
            <h1 className="text-sm sm:text-base font-bold tracking-tight text-foreground whitespace-nowrap">
              Knowledge Base
            </h1>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5 shrink-0 flex-wrap sm:flex-nowrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => openCreate("create-media")}
              className="h-7.5 text-xs gap-1 px-2 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-100"
              title="Unggah File / Media Perusahaan (Foto, Video, Brosur PDF tanpa OCR)"
            >
              <Paperclip className="h-3 w-3" />
              <span>Media / File</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => openCreate("create-file")}
              className="h-7.5 text-xs gap-1 px-2 border-border"
              title="Unggah Dokumen PDF, Word, Excel, atau Foto/Gambar untuk diekstrak teksnya via AI OCR ke RAG"
            >
              <Upload className="h-3 w-3" />
              <span>Ekstrak Dokumen AI</span>
            </Button>
            <Button
              size="sm"
              onClick={() => openCreate("create-text")}
              className="h-7.5 text-xs gap-1 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs font-semibold"
              title="Tambah Teks Manual"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Teks</span>
            </Button>
          </div>
        </div>

        {/* Dedicated stats row - cleanly underneath, zero collision */}
        <div className="flex items-center gap-3 text-xs sm:text-sm text-muted-foreground pt-1.5 border-t border-border/50 flex-wrap">
          <span className="font-semibold text-foreground text-sm sm:text-base">{items.length}</span> Total
          <span>·</span>
          <span>{items.filter(i => i.metadata?.type === 'media').length} File Media</span>
          <span>·</span>
          <span>{items.filter(i => i.metadata?.type === 'file').length} Dokumen OCR</span>
          <span>·</span>
          <span>{items.filter(i => !i.metadata?.type || i.metadata?.type === 'text').length} Teks</span>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="rounded-2xl border p-5 bg-card space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-xl" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
                <Skeleton className="h-7 w-14 rounded-md" />
              </div>
              <div className="space-y-2 pt-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-4/5" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50/50 dark:bg-emerald-900/10 dark:border-emerald-800 py-24 gap-4">
          <div className="rounded-full bg-emerald-100 dark:bg-emerald-900/40 p-5">
            <BookOpen className="h-10 w-10 text-emerald-600" />
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-foreground">Belum ada knowledge tersimpan</p>
            <p className="text-sm text-muted-foreground mt-1">Mulai tambahkan informasi agar AI Chatbot bisa menjawab dengan akurat.</p>
          </div>
          <button
            onClick={() => openCreate("create-text")}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition shadow-lg shadow-emerald-200"
          >
            <Plus className="h-4 w-4" />
            Tambah Knowledge Pertama
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map((item, idx) => {
            const color = cardColors[idx % cardColors.length];
            const isMedia = item.metadata?.type === 'media';
            const isFile = item.metadata?.type === 'file';
            const mediaType = item.metadata?.mediaType;
            const isVideo = isMedia && mediaType === 'video';
            const isPdf = isMedia && mediaType === 'pdf';
            const isMediaImage = isMedia && mediaType === 'image';
            const isOcrImage = isFile && /\.(jpe?g|png|webp|bmp|gif)$/i.test(item.metadata?.filename || item.title || '');

            const fileUrl = item.metadata?.url;

            let badgeText = "Teks";
            let badgeClass = "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300";
            if (isMedia) {
              if (isVideo) {
                badgeText = "Video";
                badgeClass = "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300";
              } else if (isMediaImage) {
                badgeText = "Foto";
                badgeClass = "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300";
              } else if (isPdf) {
                badgeText = "Brosur PDF";
                badgeClass = "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
              } else {
                badgeText = "File";
                badgeClass = "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300";
              }
            } else if (isFile) {
              if (isOcrImage) {
                badgeText = "Gambar (OCR)";
                badgeClass = "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300";
              } else {
                badgeText = "Dokumen (OCR)";
                badgeClass = "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300";
              }
            }

            return (
              <div
                key={item.id}
                onClick={() => setPreviewItem(item)}
                className={`group relative overflow-hidden rounded-2xl border bg-gradient-to-br ${color} p-4 sm:p-5 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer`}
              >
                {/* Icon badge */}
                <div className="flex items-start justify-between mb-3">
                  <div className="rounded-xl bg-white/70 dark:bg-black/20 p-2.5 backdrop-blur-sm">
                    {isVideo ? (
                      <Video className="h-5 w-5 text-purple-600" />
                    ) : isMediaImage || isOcrImage ? (
                      <ImageIcon className="h-5 w-5 text-sky-600" />
                    ) : isPdf ? (
                      <FileText className="h-5 w-5 text-amber-600" />
                    ) : isMedia ? (
                      <Paperclip className="h-5 w-5 text-teal-600" />
                    ) : isFile ? (
                      <FileText className="h-5 w-5 text-emerald-600" />
                    ) : (
                      <AlignLeft className="h-5 w-5 text-emerald-600" />
                    )}
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${badgeClass}`}>
                    {badgeText}
                  </span>
                </div>

                {/* Title */}
                <h3 className="font-semibold text-sm sm:text-base text-foreground truncate mb-1" title={item.title}>
                  {item.title}
                </h3>

                {/* Content preview */}
                <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed mb-3">
                  {item.metadata?.description || item.content}
                </p>

                {/* File Link / View */}
                {fileUrl && (
                  <div className="mb-3">
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewItem(item);
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-white/60 dark:bg-black/20 hover:bg-white dark:hover:bg-black/40 px-2.5 py-1 rounded-lg border border-border/60 transition"
                      title="Klik untuk melihat pratinjau file"
                    >
                      <Eye className="h-3 w-3" />
                      <span className="truncate max-w-[200px]">{item.metadata?.filename || item.metadata?.name || 'Lihat Pratinjau File'}</span>
                    </span>
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-1 border-t border-border/30">
                  <span className="text-xs text-muted-foreground">
                    {new Date(item.createdAt).toLocaleDateString("id-ID", {
                      day: "numeric", month: "short", year: "numeric"
                    })}
                  </span>
                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewItem(item);
                      }}
                      className="rounded-lg bg-white/80 dark:bg-black/30 p-2 text-foreground hover:bg-white hover:text-emerald-600 transition backdrop-blur-sm"
                      title="Pratinjau / Detail"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEdit(item);
                      }}
                      className="rounded-lg bg-white/80 dark:bg-black/30 p-2 text-foreground hover:bg-white hover:text-emerald-600 transition backdrop-blur-sm"
                      title="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setItemToDelete({ id: item.id, title: item.title });
                      }}
                      className="rounded-lg bg-white/80 dark:bg-black/30 p-2 text-foreground hover:bg-red-50 hover:text-red-600 transition backdrop-blur-sm"
                      title="Hapus"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Overlay */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-4" onClick={closeModal}>
          <div
            className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-background shadow-2xl border border-border overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-white/20 p-2">
                    {modalMode === "create-media" ? (
                      <Paperclip className="h-5 w-5 text-white" />
                    ) : modalMode === "create-file" ? (
                      <Upload className="h-5 w-5 text-white" />
                    ) : modalMode === "edit" ? (
                      <Pencil className="h-5 w-5 text-white" />
                    ) : (
                      <AlignLeft className="h-5 w-5 text-white" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">
                      {modalMode === "edit" ? "Edit Knowledge" :
                       modalMode === "create-media" ? "Unggah File / Media Perusahaan" :
                       modalMode === "create-file" ? "Ekstrak Dokumen / Gambar (OCR)" :
                       "Tambah Teks Knowledge"}
                    </h2>
                    <p className="text-xs text-emerald-100">
                      {modalMode === "edit" ? "Perbarui judul dan konten knowledge" :
                       modalMode === "create-media" ? "Simpan foto, video, atau brosur PDF agar bot WhatsApp bisa mengirimkannya ke pelanggan" :
                       modalMode === "create-file" ? "Upload file PDF, Word, Excel, atau Foto untuk diekstrak teksnya via AI OCR ke RAG" :
                       "Masukkan teks sebagai knowledge AI"}
                    </p>
                  </div>
                </div>
                <button onClick={closeModal} className="rounded-lg p-1.5 text-white/70 hover:bg-white/20 hover:text-white transition">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal body */}
            <div className="p-4 sm:p-6">
              {(modalMode === "create-text" || modalMode === "edit") && (
                <form onSubmit={modalMode === "edit" ? handleSubmitEdit : handleSubmitText} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Judul Topik</label>
                    <input
                      className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                      placeholder="Contoh: Info Promo Bulan Agustus"
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Isi Pengetahuan</label>
                    <textarea
                      className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition resize-none"
                      placeholder="Tuliskan informasi detail di sini..."
                      rows={7}
                      value={content}
                      onChange={e => setContent(e.target.value)}
                      required
                    />
                    <p className="text-xs text-muted-foreground">{content.length} karakter</p>
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-3 text-sm font-semibold text-white hover:opacity-90 transition disabled:opacity-60 shadow-lg shadow-emerald-200/50"
                  >
                    {submitting ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Menyimpan...</>
                    ) : (
                      <><Check className="h-4 w-4" /> {modalMode === "edit" ? "Simpan Perubahan" : "Simpan Knowledge"}</>
                    )}
                  </button>
                </form>
              )}

              {modalMode === "create-file" && (
                <form onSubmit={handleSubmitFile} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Judul (Opsional)</label>
                    <input
                      className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                      placeholder="Contoh: SOP Pengembalian Barang"
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">File Dokumen atau Gambar</label>
                    <label className="flex flex-col items-center justify-center w-full min-h-[144px] p-4 rounded-xl border-2 border-dashed border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-800 cursor-pointer hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition group">
                      {file ? (
                        <div className="flex flex-col items-center gap-2">
                          <div className="rounded-full bg-emerald-100 dark:bg-emerald-800 p-3">
                            {file.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|bmp)$/i.test(file.name) ? (
                              <ImageIcon className="h-6 w-6 text-emerald-600" />
                            ) : (
                              <FileText className="h-6 w-6 text-emerald-600" />
                            )}
                          </div>
                          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300 max-w-[280px] truncate text-center">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(file.size / 1024).toFixed(1)} KB {file.type.startsWith('image/') || /\.(jpe?g|png|webp)$/i.test(file.name) ? '(Vision AI OCR)' : ''}
                          </p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <div className="rounded-full bg-emerald-100 dark:bg-emerald-800 p-3 group-hover:scale-110 transition">
                            <Upload className="h-6 w-6 text-emerald-600" />
                          </div>
                          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Klik atau seret file ke sini</p>
                          <p className="text-xs text-muted-foreground text-center">PDF, DOCX, CSV, TXT, atau Foto/Gambar JPG/PNG/WEBP (maks 10MB)</p>
                        </div>
                      )}
                      <input
                        type="file"
                        accept=".pdf,.docx,.csv,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.webp,image/*"
                        className="hidden"
                        onChange={e => setFile(e.target.files?.[0] || null)}
                      />
                    </label>
                  </div>
                  <button
                    type="submit"
                    disabled={submitting || !file}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-3 text-sm font-semibold text-white hover:opacity-90 transition disabled:opacity-60 shadow-lg shadow-emerald-200/50"
                  >
                    {submitting ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Mengunggah & Memproses via AI...</>
                    ) : (
                      <><Upload className="h-4 w-4" /> Unggah & Ekstrak Teks</>
                    )}
                  </button>
                </form>
              )}

              {modalMode === "create-media" && (
                <form onSubmit={handleSubmitMedia} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">File Media Perusahaan</label>
                    <label className="flex flex-col items-center justify-center w-full min-h-[144px] p-4 rounded-xl border-2 border-dashed border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-800 cursor-pointer hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition group">
                      {mediaFile ? (
                        <div className="flex flex-col items-center gap-2">
                          <div className="rounded-full bg-emerald-100 dark:bg-emerald-800 p-3">
                            {mediaFile.type.startsWith('video/') || /\.(mov|mp4|mkv|webm|avi)$/i.test(mediaFile.name) ? (
                              <Video className="h-6 w-6 text-purple-600" />
                            ) : mediaFile.type.includes('pdf') || /\.pdf$/i.test(mediaFile.name) ? (
                              <FileText className="h-6 w-6 text-amber-600" />
                            ) : mediaFile.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|bmp)$/i.test(mediaFile.name) ? (
                              <ImageIcon className="h-6 w-6 text-sky-600" />
                            ) : (
                              <Paperclip className="h-6 w-6 text-emerald-600" />
                            )}
                          </div>
                          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300 max-w-[280px] truncate text-center">{mediaFile.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(mediaFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <div className="rounded-full bg-emerald-100 dark:bg-emerald-800 p-3 group-hover:scale-110 transition">
                            <Upload className="h-6 w-6 text-emerald-600" />
                          </div>
                          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Pilih file foto, video, atau brosur PDF</p>
                          <p className="text-xs text-muted-foreground text-center">JPG, PNG, MP4, MOV, PDF, DOCX (Maks 300MB)</p>
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.csv"
                        className="hidden"
                        onChange={e => handleSelectMediaFile(e.target.files?.[0] || null)}
                      />
                    </label>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">
                      Nama / Judul File <span className="text-destructive">*</span>
                    </label>
                    <input
                      className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                      placeholder="Contoh: Brosur Profil Perusahaan 2026 / Video Kantor Pusat"
                      value={mediaName}
                      onChange={e => setMediaName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Keterangan / Deskripsi (Opsional)</label>
                    <textarea
                      className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition resize-none"
                      placeholder="Jelaskan isi file ini agar bot AI mengerti kapan harus mengirimkannya ke pelanggan..."
                      rows={3}
                      value={mediaDesc}
                      onChange={e => setMediaDesc(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">Keterangan ini digunakan AI bot WhatsApp untuk mereferensikan file saat pelanggan bertanya.</p>
                  </div>

                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-950/20 p-3 text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed">
                    💡 <strong>Tips:</strong> File ini terikat dengan perusahaan (di luar produk). Bot WhatsApp dapat mengirimkannya langsung sebagai gambar/video/dokumen saat pelanggan meminta brosur atau profil perusahaan.
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || !mediaFile || !mediaName.trim()}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-3 text-sm font-semibold text-white hover:opacity-90 transition disabled:opacity-60 shadow-lg shadow-emerald-200/50"
                  >
                    <Check className="h-4 w-4" /> Simpan Media Perusahaan
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus Knowledge */}
      <Dialog open={!!itemToDelete} onOpenChange={(open) => { if (!open) setItemToDelete(null); }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" /> Hapus Data Knowledge
            </DialogTitle>
            <DialogDescription className="pt-2 text-sm text-foreground/80 leading-relaxed">
              Apakah Anda yakin ingin menghapus knowledge <strong>"{itemToDelete?.title}"</strong>? Referensi ini tidak akan digunakan lagi oleh AI Chatbot.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setItemToDelete(null)}>Batal</Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Ya, Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Preview File & Detail Knowledge */}
      <Dialog open={!!previewItem} onOpenChange={(open) => { if (!open) setPreviewItem(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="rounded-xl bg-emerald-100 dark:bg-emerald-950/40 p-2 text-emerald-600">
                  {previewItem?.metadata?.mediaType === "video" ? (
                    <Video className="h-5 w-5 text-purple-600" />
                  ) : previewItem?.metadata?.mediaType === "image" || /\.(jpe?g|png|webp|bmp|gif)$/i.test(previewItem?.metadata?.filename || previewItem?.title || '') ? (
                    <ImageIcon className="h-5 w-5 text-sky-600" />
                  ) : previewItem?.metadata?.mediaType === "pdf" || /\.pdf$/i.test(previewItem?.metadata?.filename || previewItem?.title || '') ? (
                    <FileText className="h-5 w-5 text-amber-600" />
                  ) : previewItem?.metadata?.type === "media" ? (
                    <Paperclip className="h-5 w-5 text-teal-600" />
                  ) : previewItem?.metadata?.type === "file" ? (
                    <FileText className="h-5 w-5 text-teal-600" />
                  ) : (
                    <AlignLeft className="h-5 w-5 text-emerald-600" />
                  )}
                </div>
                <div>
                  <DialogTitle className="text-base sm:text-lg font-bold leading-tight">
                    {previewItem?.title}
                  </DialogTitle>
                  <DialogDescription className="text-xs mt-0.5">
                    {new Date(previewItem?.createdAt || Date.now()).toLocaleDateString("id-ID", {
                      day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit"
                    })}
                  </DialogDescription>
                </div>
              </div>
            </div>
          </DialogHeader>

          {previewItem && (
            <div className="space-y-4 pt-2">
              {/* Media Preview Player / Image / PDF Embed */}
              {previewItem.metadata?.url && (
                <div className="space-y-2">
                  <div className="rounded-2xl border bg-black/5 dark:bg-black/30 overflow-hidden flex items-center justify-center p-2">
                    {previewItem.metadata.mediaType === "video" || /\.(mov|mp4|webm|mkv)$/i.test(previewItem.metadata.url) ? (
                      <video
                        controls
                        preload="metadata"
                        playsInline
                        src={previewItem.metadata.url}
                        className="w-full max-h-80 rounded-xl bg-black"
                      />
                    ) : previewItem.metadata.mediaType === "image" || /\.(jpe?g|png|webp|gif|bmp)$/i.test(previewItem.metadata.url) ? (
                      <img
                        src={previewItem.metadata.url}
                        alt={previewItem.title}
                        className="w-full max-h-80 object-contain rounded-xl"
                      />
                    ) : previewItem.metadata.mediaType === "pdf" || /\.pdf$/i.test(previewItem.metadata.url) ? (
                      <div className="w-full py-8 px-4 flex flex-col items-center justify-center text-center gap-3 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent rounded-xl">
                        <div className="h-14 w-14 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 grid place-items-center shadow-xs">
                          <FileText className="h-7 w-7" />
                        </div>
                        <div className="space-y-1 max-w-sm">
                          <p className="font-bold text-sm text-foreground truncate">{previewItem.metadata.filename || previewItem.title}</p>
                          <p className="text-xs text-muted-foreground">
                            Dokumen PDF resmi perusahaan. Klik tombol di bawah untuk membaca di viewer PDF browser atau mengunduh file.
                          </p>
                        </div>
                        <div className="flex items-center gap-2 pt-1">
                          <a
                            href={previewItem.metadata.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs transition"
                          >
                            <ExternalLink className="h-3.5 w-3.5" /> Buka / Baca PDF
                          </a>
                          <a
                            href={previewItem.metadata.url}
                            download={previewItem.metadata.filename || `${previewItem.title}.pdf`}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border bg-background hover:bg-muted text-foreground text-xs font-medium transition"
                          >
                            <Download className="h-3.5 w-3.5" /> Unduh PDF
                          </a>
                        </div>
                      </div>
                    ) : (
                      <div className="py-8 flex flex-col items-center gap-2 text-muted-foreground">
                        <Paperclip className="h-10 w-10 text-emerald-600" />
                        <p className="text-xs font-medium">{previewItem.metadata.filename || 'File Dokumen'}</p>
                      </div>
                    )}
                  </div>

                  {/* Action buttons for media file */}
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs gap-1.5 h-8 flex-1"
                      onClick={() => {
                        const fullUrl = window.location.origin + previewItem.metadata?.url;
                        navigator.clipboard.writeText(fullUrl);
                        toast.success("Link URL file berhasil disalin ke clipboard!");
                      }}
                    >
                      <Copy className="h-3.5 w-3.5" /> Salin Link File
                    </Button>
                    <a
                      href={previewItem.metadata.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white h-8 px-3 rounded-lg transition shrink-0"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> Buka di Tab Baru
                    </a>
                  </div>
                </div>
              )}

              {/* Isi Konten / Pengetahuan Teks */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  {previewItem.metadata?.type === "file" ? "Hasil Ekstrak Dokumen (RAG Knowledge)" : "Isi Pengetahuan / Deskripsi"}
                </label>
                <div className="rounded-xl border bg-muted/30 p-3.5 max-h-60 overflow-y-auto text-xs sm:text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed font-mono">
                  {previewItem.content}
                </div>
              </div>

              {/* Metadata details */}
              <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground border-t border-border/50 pt-2.5">
                <div>
                  <span className="font-semibold text-foreground">Tipe: </span>
                  {previewItem.metadata?.type === 'media' ? `File Media (${previewItem.metadata.mediaType || 'file'})` : previewItem.metadata?.type === 'file' ? 'Dokumen OCR' : 'Teks Manual'}
                </div>
                {previewItem.metadata?.filename && (
                  <div className="truncate">
                    <span className="font-semibold text-foreground">File: </span>
                    {previewItem.metadata.filename}
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border/40">
            <Button variant="outline" size="sm" onClick={() => setPreviewItem(null)}>
              Tutup
            </Button>
            {previewItem && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const toEdit = previewItem;
                    setPreviewItem(null);
                    openEdit(toEdit);
                  }}
                  className="gap-1 text-xs"
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    const toDel = previewItem;
                    setPreviewItem(null);
                    setItemToDelete({ id: toDel.id, title: toDel.title });
                  }}
                  className="gap-1 text-xs"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Hapus
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
