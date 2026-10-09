"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/auth-store";
import { useBackgroundTasksStore } from "@/lib/background-tasks-store";
import { toast } from "sonner";
import {
  Loader2, Plus, Trash2, Pencil, FileText, AlignLeft,
  BookOpen, Upload, X, Check, Brain, AlertTriangle, ImageIcon
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const API_BASE = "/api/v1";

interface KnowledgeItem {
  id: string;
  title: string;
  content: string;
  metadata: { type?: string; filename?: string };
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

type ModalMode = "create-text" | "create-file" | "edit" | null;

export function KnowledgePage() {
  const { user } = useAuthStore();
  const tenantId = user?.tenantId;
  const { runKnowledgeFileUpload, runKnowledgeTextCreate } =
    useBackgroundTasksStore();

  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editingItem, setEditingItem] = useState<KnowledgeItem | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);

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

  const openCreate = (mode: "create-text" | "create-file") => {
    setEditingItem(null);
    setTitle("");
    setContent("");
    setFile(null);
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
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => openCreate("create-file")}
              className="h-7.5 text-xs gap-1 px-2 border-border"
              title="Unggah Dokumen PDF, Word, Excel, atau Foto/Gambar"
            >
              <Upload className="h-3 w-3" />
              <span>Dokumen / Gambar</span>
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
        <div className="flex items-center gap-3 text-xs sm:text-sm text-muted-foreground pt-1.5 border-t border-border/50">
          <span className="font-semibold text-foreground text-sm sm:text-base">{items.length}</span> Total
          <span>·</span>
          <span>{items.filter(i => i.metadata?.type !== 'file').length} Teks</span>
          <span>·</span>
          <span>{items.filter(i => i.metadata?.type === 'file' && !/\.(jpe?g|png|webp|bmp|gif)$/i.test(i.metadata?.filename || i.title || '')).length} Dokumen</span>
          <span>·</span>
          <span>{items.filter(i => i.metadata?.type === 'file' && /\.(jpe?g|png|webp|bmp|gif)$/i.test(i.metadata?.filename || i.title || '')).length} Gambar</span>
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
            const isFile = item.metadata?.type === 'file';
            const isImage = isFile && /\.(jpe?g|png|webp|bmp|gif)$/i.test(item.metadata?.filename || item.title || '');
            return (
              <div
                key={item.id}
                className={`group relative overflow-hidden rounded-2xl border bg-gradient-to-br ${color} p-4 sm:p-5 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5`}
              >
                {/* Icon badge */}
                <div className="flex items-start justify-between mb-4">
                  <div className="rounded-xl bg-white/70 dark:bg-black/20 p-2.5 backdrop-blur-sm">
                    {isFile ? (
                      isImage ? (
                        <ImageIcon className="h-5 w-5 text-emerald-600" />
                      ) : (
                        <FileText className="h-5 w-5 text-emerald-600" />
                      )
                    ) : (
                      <AlignLeft className="h-5 w-5 text-emerald-600" />
                    )}
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${isFile ? (isImage ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300' : 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300') : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'}`}>
                    {isFile ? (isImage ? 'Gambar' : 'Dokumen') : 'Teks'}
                  </span>
                </div>

                {/* Title */}
                <h3 className="font-semibold text-sm sm:text-base text-foreground truncate mb-1" title={item.title}>
                  {item.title}
                </h3>

                {/* Content preview */}
                <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed mb-4">
                  {item.content}
                </p>

                {/* Footer */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {new Date(item.createdAt).toLocaleDateString("id-ID", {
                      day: "numeric", month: "short", year: "numeric"
                    })}
                  </span>
                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEdit(item)}
                      className="rounded-lg bg-white/80 dark:bg-black/30 p-2 text-foreground hover:bg-white hover:text-emerald-600 transition backdrop-blur-sm"
                      title="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setItemToDelete({ id: item.id, title: item.title })}
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
                    {modalMode === "create-file" ? (
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
                       modalMode === "create-file" ? "Unggah Dokumen / Gambar" :
                       "Tambah Teks Knowledge"}
                    </h2>
                    <p className="text-xs text-emerald-100">
                      {modalMode === "edit" ? "Perbarui judul dan konten knowledge" :
                       modalMode === "create-file" ? "Upload file PDF, Word, Excel, atau Foto/Gambar" :
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
                      <><Upload className="h-4 w-4" /> Unggah & Simpan Dokumen</>
                    )}
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
    </div>
  );
}
