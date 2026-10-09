"use client";

import { create } from "zustand";
import { toast } from "sonner";

export type TaskStatus = "pending" | "running" | "success" | "error";

export interface BackgroundTask {
  id: string;
  title: string;
  category: "knowledge" | "siteplan" | "general";
  status: TaskStatus;
  statusText: string;
  progress?: number;
  error?: string;
  createdAt: number;
  completedAt?: number;
}

interface BackgroundTasksState {
  tasks: BackgroundTask[];
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  addTask: (
    task: Omit<BackgroundTask, "id" | "createdAt" | "status"> & {
      id?: string;
      status?: TaskStatus;
    },
  ) => string;
  updateTask: (id: string, updates: Partial<BackgroundTask>) => void;
  removeTask: (id: string) => void;
  clearCompleted: () => void;

  runKnowledgeFileUpload: (params: {
    file: File;
    title?: string;
    tenantId: string;
    onSuccess?: () => void;
    onError?: (err: Error) => void;
  }) => Promise<void>;

  runKnowledgeTextCreate: (params: {
    title: string;
    content: string;
    tenantId: string;
    onSuccess?: () => void;
    onError?: (err: Error) => void;
  }) => Promise<void>;

  runSiteplanMediaUpload: (params: {
    file: File;
    name: string;
    description?: string;
    groupId: string;
    currentMediaList: any[];
    onSuccess?: () => void;
    onError?: (err: Error) => void;
  }) => Promise<void>;
}

export const useBackgroundTasksStore = create<BackgroundTasksState>(
  (set, get) => ({
    tasks: [],
    isOpen: true,
    setIsOpen: (open) => set({ isOpen: open }),

    addTask: (taskData) => {
      const id = taskData.id || "task-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6);
      const newTask: BackgroundTask = {
        id,
        title: taskData.title,
        category: taskData.category,
        status: taskData.status || "running",
        statusText: taskData.statusText || "Memulai proses...",
        progress: taskData.progress,
        error: taskData.error,
        createdAt: Date.now(),
      };
      set((state) => ({
        tasks: [newTask, ...state.tasks],
        isOpen: true,
      }));
      return id;
    },

    updateTask: (id, updates) => {
      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
      }));
    },

    removeTask: (id) => {
      set((state) => ({
        tasks: state.tasks.filter((t) => t.id !== id),
      }));
    },

    clearCompleted: () => {
      set((state) => ({
        tasks: state.tasks.filter((t) => t.status === "running" || t.status === "pending"),
      }));
    },

    runKnowledgeFileUpload: async ({ file, title, tenantId, onSuccess, onError }) => {
      const isImage =
        file.type.startsWith("image/") ||
        /\.(jpe?g|png|webp|gif|bmp)$/i.test(file.name);
      const displayTitle = title || file.name;
      const taskId = get().addTask({
        title: displayTitle,
        category: "knowledge",
        status: "running",
        statusText: isImage
          ? "Mengunggah file & menyiapkan Vision AI..."
          : "Mengunggah & memproses dokumen...",
      });

      // Timer untuk memperbarui status proses secara informatif
      let timerStage2: NodeJS.Timeout | null = null;
      let timerStage3: NodeJS.Timeout | null = null;

      if (isImage) {
        timerStage2 = setTimeout(() => {
          const current = get().tasks.find((t) => t.id === taskId);
          if (current && current.status === "running") {
            get().updateTask(taskId, {
              statusText: "Mengekstrak teks dokumen via Vision AI OCR...",
            });
          }
        }, 1800);

        timerStage3 = setTimeout(() => {
          const current = get().tasks.find((t) => t.id === taskId);
          if (current && current.status === "running") {
            get().updateTask(taskId, {
              statusText: "Menyinkronkan knowledge ke Vector Database...",
            });
          }
        }, 6000);
      } else {
        timerStage2 = setTimeout(() => {
          const current = get().tasks.find((t) => t.id === taskId);
          if (current && current.status === "running") {
            get().updateTask(taskId, {
              statusText: "Mengekstrak isi & menyinkronkan ke Vector Database...",
            });
          }
        }, 2000);
      }

      try {
        const formData = new FormData();
        formData.append("file", file);
        if (title) formData.append("title", title);
        formData.append("tenantId", tenantId);

        const res = await fetch("/api/v1/knowledge/file", {
          method: "POST",
          body: formData,
        });

        if (timerStage2) clearTimeout(timerStage2);
        if (timerStage3) clearTimeout(timerStage3);

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          const errMsg =
            Array.isArray(errData.message)
              ? errData.message[0]
              : errData.message || "Gagal mengunggah dokumen";
          throw new Error(errMsg);
        }

        get().updateTask(taskId, {
          status: "success",
          statusText: "Berhasil diproses & disimpan!",
          completedAt: Date.now(),
        });

        toast.success(`Dokumen "${displayTitle}" berhasil disimpan!`);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("knowledge-updated"));
        }
        onSuccess?.();

        // Bersihkan otomatis setelah 10 detik jika sukses
        setTimeout(() => {
          get().removeTask(taskId);
        }, 10000);
      } catch (err: any) {
        if (timerStage2) clearTimeout(timerStage2);
        if (timerStage3) clearTimeout(timerStage3);

        const errorMsg = err.message || "Terjadi kesalahan saat upload";
        get().updateTask(taskId, {
          status: "error",
          statusText: "Gagal: " + errorMsg,
          error: errorMsg,
          completedAt: Date.now(),
        });
        toast.error(`Gagal upload "${displayTitle}": ${errorMsg}`);
        onError?.(err);
      }
    },

    runKnowledgeTextCreate: async ({ title, content, tenantId, onSuccess, onError }) => {
      const taskId = get().addTask({
        title,
        category: "knowledge",
        status: "running",
        statusText: "Menyimpan teks knowledge...",
      });

      const timerSync = setTimeout(() => {
        const current = get().tasks.find((t) => t.id === taskId);
        if (current && current.status === "running") {
          get().updateTask(taskId, {
            statusText: "Menyinkronkan ke Vector Database...",
          });
        }
      }, 1500);

      try {
        const res = await fetch("/api/v1/knowledge/text", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, content, tenantId }),
        });

        clearTimeout(timerSync);

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          const errMsg =
            Array.isArray(errData.message)
              ? errData.message[0]
              : errData.message || "Gagal menyimpan knowledge";
          throw new Error(errMsg);
        }

        get().updateTask(taskId, {
          status: "success",
          statusText: "Berhasil disimpan!",
          completedAt: Date.now(),
        });

        toast.success(`Knowledge "${title}" berhasil disimpan!`);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("knowledge-updated"));
        }
        onSuccess?.();

        setTimeout(() => {
          get().removeTask(taskId);
        }, 10000);
      } catch (err: any) {
        clearTimeout(timerSync);
        const errorMsg = err.message || "Gagal menyimpan knowledge";
        get().updateTask(taskId, {
          status: "error",
          statusText: "Gagal: " + errorMsg,
          error: errorMsg,
          completedAt: Date.now(),
        });
        toast.error(`Gagal menyimpan "${title}": ${errorMsg}`);
        onError?.(err);
      }
    },

    runSiteplanMediaUpload: async ({
      file,
      name,
      description,
      groupId,
      currentMediaList,
      onSuccess,
      onError,
    }) => {
      const taskId = get().addTask({
        title: name,
        category: "siteplan",
        status: "running",
        statusText: `Mengunggah media (${(file.size / 1024 / 1024).toFixed(1)} MB)...`,
      });

      try {
        const formData = new FormData();
        formData.append("file", file);

        const uploadRes = await fetch("/api/v1/availability/upload", {
          method: "POST",
          body: formData,
        });

        const uploadData = await uploadRes.json().catch(() => ({}));
        const resData = uploadData.data || uploadData;

        if (!uploadRes.ok || !resData.url) {
          throw new Error(resData.message || "Gagal mengunggah media ke server");
        }

        get().updateTask(taskId, {
          statusText: "Memperbarui data galeri media cluster...",
        });

        const newMedia = {
          id: "m-" + Date.now(),
          name: name.trim(),
          url: resData.url,
          type: resData.mediaType || (file.type.startsWith("video/") ? "video" : "image"),
          description: description?.trim() || undefined,
          createdAt: new Date().toISOString().slice(0, 10),
        };

        const updatedList = [...currentMediaList, newMedia];
        const updateRes = await fetch(`/api/v1/availability/groups/${groupId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ siteplanImage: JSON.stringify(updatedList) }),
        });

        if (!updateRes.ok) {
          throw new Error("Gagal menyimpan galeri ke server cluster");
        }

        get().updateTask(taskId, {
          status: "success",
          statusText: "Media siteplan berhasil disimpan!",
          completedAt: Date.now(),
        });

        toast.success(`Media siteplan "${name}" berhasil diunggah!`);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("siteplan-updated"));
        }
        onSuccess?.();

        setTimeout(() => {
          get().removeTask(taskId);
        }, 10000);
      } catch (err: any) {
        const errorMsg = err.message || "Gagal mengunggah media";
        get().updateTask(taskId, {
          status: "error",
          statusText: "Gagal: " + errorMsg,
          error: errorMsg,
          completedAt: Date.now(),
        });
        toast.error(`Gagal upload siteplan "${name}": ${errorMsg}`);
        onError?.(err);
      }
    },
  }),
);
