"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/auth-store";
import { toast } from "sonner";
import {
  Loader2, Plus, Trash2, Pencil, FileText, AlignLeft,
  BookOpen, Upload, X, Check, Brain
} from "lucide-react";

const API_BASE = "/api/v1";

interface KnowledgeItem {
  id: string;
  title: string;
  content: string;
  metadata: { type?: string; filename?: string };
  createdAt: string;
}

type ModalMode = "create-text" | "create-file" | "edit" | null;

export function KnowledgePage() {
  const { user } = useAuthStore();
  const tenantId = user?.tenantId;

  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editingItem, setEditingItem] = useState<KnowledgeItem | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (tenantId) fetchKnowledge();
  }, [tenantId]);

  const fetchKnowledge = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/knowledge?tenantId=${tenantId}`);
      if (!res.ok) throw new Error();
      const json = await res.json();
      const data = json.data?.data || json.data || json;
      setItems(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Gagal mengambil data knowledge");
    } finally {
      setLoading(false);
    }
  };

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

  const handleSubmitText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return toast.error("Judul dan konten harus diisi");
    try {
      setSubmitting(true);
      const res = await fetch(`${API_BASE}/knowledge/text`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, tenantId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message?.[0] || "Gagal menyimpan");
      }
      toast.success("Knowledge berhasil ditambahkan!");
      closeModal();
      fetchKnowledge();
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan");
    } finally {
      setSubmitting(false);
    }
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

  const handleSubmitFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return toast.error("File harus diunggah");
    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append("file", file);
      if (title) formData.append("title", title);
      formData.append("tenantId", tenantId as string);
      const res = await fetch(`${API_BASE}/knowledge/file`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message?.[0] || "Gagal mengunggah");
      }
      toast.success("Dokumen berhasil diunggah!");
      closeModal();
      fetchKnowledge();
    } catch (err: any) {
      toast.error(err.message || "Gagal mengunggah");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus knowledge ini? Data tidak bisa dikembalikan.")) return;
    try {
      const res = await fetch(`${API_BASE}/knowledge/${id}?tenantId=${tenantId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      toast.success("Knowledge berhasil dihapus");
      setItems(prev => prev.filter(i => i.id !== id));
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
    <div className="space-y-8 p-1">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-green-700 p-8 text-white shadow-2xl">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%23ffffff%22 fill-opacity=%220.05%22%3E%3Cpath d=%22M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]" />
        <div className="relative flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-white/20 p-3 backdrop-blur-sm">
              <Brain className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Knowledge Base</h1>
              <p className="mt-1 text-emerald-100">
                Kelola informasi &amp; dokumen yang akan digunakan AI Chatbot sebagai referensi jawaban.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => openCreate("create-file")}
              className="flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2.5 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-white/25 border border-white/20"
            >
              <Upload className="h-4 w-4" />
              Unggah Dokumen
            </button>
            <button
              onClick={() => openCreate("create-text")}
              className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 shadow-lg"
            >
              <Plus className="h-4 w-4" />
              Tambah Teks
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className="relative mt-6 grid grid-cols-3 gap-4">
          <div className="rounded-xl bg-white/10 backdrop-blur-sm px-4 py-3 border border-white/15">
            <p className="text-xs text-emerald-200">Total Knowledge</p>
            <p className="text-2xl font-bold">{items.length}</p>
          </div>
          <div className="rounded-xl bg-white/10 backdrop-blur-sm px-4 py-3 border border-white/15">
            <p className="text-xs text-emerald-200">Dari Teks</p>
            <p className="text-2xl font-bold">{items.filter(i => i.metadata?.type !== 'file').length}</p>
          </div>
          <div className="rounded-xl bg-white/10 backdrop-blur-sm px-4 py-3 border border-white/15">
            <p className="text-xs text-emerald-200">Dari Dokumen</p>
            <p className="text-2xl font-bold">{items.filter(i => i.metadata?.type === 'file').length}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
          <p className="text-sm text-muted-foreground">Memuat data knowledge...</p>
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
            return (
              <div
                key={item.id}
                className={`group relative overflow-hidden rounded-2xl border bg-gradient-to-br ${color} p-5 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5`}
              >
                {/* Icon badge */}
                <div className="flex items-start justify-between mb-4">
                  <div className="rounded-xl bg-white/70 dark:bg-black/20 p-2.5 backdrop-blur-sm">
                    {isFile ? (
                      <FileText className="h-5 w-5 text-emerald-600" />
                    ) : (
                      <AlignLeft className="h-5 w-5 text-emerald-600" />
                    )}
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${isFile ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'}`}>
                    {isFile ? 'Dokumen' : 'Teks'}
                  </span>
                </div>

                {/* Title */}
                <h3 className="font-semibold text-foreground truncate mb-1" title={item.title}>
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
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEdit(item)}
                      className="rounded-lg bg-white/80 dark:bg-black/30 p-2 text-foreground hover:bg-white hover:text-emerald-600 transition backdrop-blur-sm"
                      title="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={closeModal}>
          <div
            className="relative w-full max-w-lg rounded-2xl bg-background shadow-2xl border border-border overflow-hidden"
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
                       modalMode === "create-file" ? "Unggah Dokumen" :
                       "Tambah Teks Knowledge"}
                    </h2>
                    <p className="text-xs text-emerald-100">
                      {modalMode === "edit" ? "Perbarui judul dan konten knowledge" :
                       modalMode === "create-file" ? "Upload file PDF atau Word" :
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
            <div className="p-6">
              {(modalMode === "create-text" || modalMode === "edit") && (
                <form onSubmit={modalMode === "edit" ? handleSubmitEdit : handleSubmitText} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Judul Topik</label>
                    <input
                      className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                      placeholder="Contoh: Info Promo Bulan Agustus"
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Isi Pengetahuan</label>
                    <textarea
                      className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition resize-none"
                      placeholder="Tuliskan informasi detail di sini..."
                      rows={6}
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
                      className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                      placeholder="Contoh: SOP Pengembalian Barang"
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">File Dokumen</label>
                    <label className="flex flex-col items-center justify-center w-full h-36 rounded-xl border-2 border-dashed border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-800 cursor-pointer hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition group">
                      {file ? (
                        <div className="flex flex-col items-center gap-2">
                          <div className="rounded-full bg-emerald-100 dark:bg-emerald-800 p-3">
                            <FileText className="h-6 w-6 text-emerald-600" />
                          </div>
                          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">{file.name}</p>
                          <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <div className="rounded-full bg-emerald-100 dark:bg-emerald-800 p-3 group-hover:scale-110 transition">
                            <Upload className="h-6 w-6 text-emerald-600" />
                          </div>
                          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Klik atau seret file ke sini</p>
                          <p className="text-xs text-muted-foreground">PDF, DOCX, atau TXT (maks 10MB)</p>
                        </div>
                      )}
                      <input
                        type="file"
                        accept=".pdf,.docx,.txt"
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
                      <><Loader2 className="h-4 w-4 animate-spin" /> Mengunggah & Memproses...</>
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
    </div>
  );
}
