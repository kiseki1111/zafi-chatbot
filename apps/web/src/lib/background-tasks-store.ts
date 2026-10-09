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

function uploadWithProgress(
  url: string,
  formData: FormData,
  onProgress: (percent: number, loaded: number, total: number) => void,
): Promise<any> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        const percent = Math.min(99, Math.round((event.loaded / event.total) * 100));
        onProgress(percent, event.loaded, event.total);
      }
    };

    xhr.onload = () => {
      let data: any = {};
      try {
        data = JSON.parse(xhr.responseText);
      } catch {}

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(data);
      } else {
        const errMsg =
          Array.isArray(data.message)
            ? data.message[0]
            : data.message || `Upload gagal (Status ${xhr.status})`;
        reject(new Error(errMsg));
      }
    };

    xhr.onerror = () => reject(new Error("Koneksi jaringan terputus saat upload"));
    xhr.ontimeout = () => reject(new Error("Waktu upload habis (timeout)"));
    xhr.timeout = 0; // 0 = tidak ada batas waktu browser; biarkan upload besar selesai alami
    xhr.send(formData);
  });
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
      const totalMb = (file.size / 1024 / 1024).toFixed(1);
      const taskId = get().addTask({
        title: displayTitle,
        category: "knowledge",
        status: "running",
        progress: 0,
        statusText: `Mengunggah (${totalMb} MB)`,
      });

      try {
        const formData = new FormData();
        formData.append("file", file);
        if (title) formData.append("title", title);
        formData.append("tenantId", tenantId);

        await uploadWithProgress(
          "/api/v1/knowledge/file",
          formData,
          (percent, loaded) => {
            const loadedMb = (loaded / 1024 / 1024).toFixed(1);
            if (percent >= 100) {
              get().updateTask(taskId, {
                progress: 100,
                statusText: isImage
                  ? "File terkirim. Sedang mengekstrak teks via Vision AI OCR..."
                  : "File terkirim. Menyinkronkan ke Vector Database...",
              });
            } else {
              get().updateTask(taskId, {
                progress: percent,
                statusText: `Mengunggah (${loadedMb} / ${totalMb} MB)`,
              });
            }
          },
        );

        get().updateTask(taskId, {
          progress: 100,
          statusText: isImage
            ? "Mengekstrak teks dokumen via Vision AI OCR..."
            : "Menyinkronkan ke Vector Database...",
        });

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

        setTimeout(() => {
          get().removeTask(taskId);
        }, 10000);
      } catch (err: any) {
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
      const totalMb = (file.size / 1024 / 1024).toFixed(1);
      const isVideo =
        file.type.startsWith("video/") ||
        /\.(mov|mp4|mkv|webm|avi)$/i.test(file.name);
      const taskId = get().addTask({
        title: name,
        category: "siteplan",
        status: "running",
        progress: 0,
        statusText: `Mengunggah media (${totalMb} MB)`,
      });

      try {
        const formData = new FormData();
        formData.append("file", file);

        const uploadData = await uploadWithProgress(
          "/api/v1/availability/upload",
          formData,
          (percent, loaded) => {
            const loadedMb = (loaded / 1024 / 1024).toFixed(1);
            if (percent >= 100) {
              get().updateTask(taskId, {
                progress: 100,
                statusText: isVideo
                  ? "File terkirim. Server sedang mengompres video via FFmpeg..."
                  : "File terkirim. Menyimpan ke galeri...",
              });
            } else {
              get().updateTask(taskId, {
                progress: percent,
                statusText: `Mengunggah (${loadedMb} / ${totalMb} MB)`,
              });
            }
          },
        );

        const resData = uploadData.data || uploadData;
        if (!resData.url) {
          throw new Error(resData.message || "Gagal mengunggah media ke server");
        }

        get().updateTask(taskId, {
          progress: 100,
          statusText: isVideo
            ? "Server sedang mengompresi video (FFmpeg 720p)..."
            : "Memperbarui galeri media cluster...",
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

        const isVideoRes = resData.mediaType === "video" || isVideo;
        const finalSizeMb = (resData.size ? resData.size / 1024 / 1024 : file.size / 1024 / 1024).toFixed(1);
        const canPlayNative = resData.canPlayNative ?? (resData.size ? resData.size <= 16 * 1024 * 1024 : false);

        let finalStatusText = "Media siteplan berhasil disimpan!";
        if (isVideoRes) {
          if (canPlayNative) {
            finalStatusText = `Video (${finalSizeMb} MB) siap diputar native di WhatsApp!`;
            toast.success(`Video "${name}" (${finalSizeMb} MB) berhasil dioptimasi & siap diputar langsung di WhatsApp.`);
          } else {
            finalStatusText = `Video (${finalSizeMb} MB > 16MB). Dikirim sebagai dokumen file (bukan native player).`;
            toast.warning(`Video "${name}" (${finalSizeMb} MB) melebihi batas native 16MB. WAHA akan mengirimkannya via dokumen file.`);
          }
        } else {
          toast.success(`Media siteplan "${name}" berhasil diunggah!`);
        }

        get().updateTask(taskId, {
          status: "success",
          statusText: finalStatusText,
          completedAt: Date.now(),
        });

        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("siteplan-updated"));
        }
        onSuccess?.();

        setTimeout(() => {
          get().removeTask(taskId);
        }, 12000);
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
