"use client";

import React from "react";
import {
  useBackgroundTasksStore,
  BackgroundTask,
} from "@/lib/background-tasks-store";
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  X,
  FileText,
  MapPin,
  Sparkles,
  Layers,
} from "lucide-react";

export function BackgroundTaskCenter() {
  const { tasks, isOpen, setIsOpen, removeTask, clearCompleted } =
    useBackgroundTasksStore();

  if (tasks.length === 0) return null;

  const runningTasks = tasks.filter(
    (t) => t.status === "running" || t.status === "pending",
  );
  const completedTasks = tasks.filter(
    (t) => t.status === "success" || t.status === "error",
  );

  return (
    <div
      aria-live="polite"
      className="fixed bottom-20 sm:bottom-4 right-4 z-50 flex flex-col items-end gap-2 pointer-events-auto max-w-[calc(100vw-32px)]"
    >
      {/* Minimized Pill Widget */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2.5 px-3.5 py-2 rounded-full bg-card/95 text-foreground border border-border shadow-xl backdrop-blur-md hover:bg-accent/80 transition-all duration-200 group animate-in slide-in-from-bottom-2"
        >
          {runningTasks.length > 0 ? (
            <div className="relative flex items-center justify-center">
              <Loader2 className="h-4 w-4 text-emerald-600 animate-spin" />
              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>
          ) : (
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          )}

          <span className="text-xs font-semibold">
            {runningTasks.length > 0
              ? `${runningTasks.length} Proses Berjalan`
              : "Semua Proses Selesai"}
          </span>

          <ChevronUp className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
        </button>
      )}

      {/* Expanded Task Card Panel */}
      {isOpen && (
        <div className="w-84 sm:w-96 rounded-2xl bg-card/95 backdrop-blur-md border border-border shadow-2xl overflow-hidden flex flex-col transition-all duration-300 animate-in slide-in-from-bottom-3">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-muted/40 border-b border-border/60">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-600 grid place-items-center">
                {runningTasks.length > 0 ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Layers className="h-3.5 w-3.5" />
                )}
              </div>
              <div>
                <h4 className="text-xs font-bold text-foreground">
                  Aktivitas Background
                </h4>
                <p className="text-[10px] text-muted-foreground">
                  {runningTasks.length > 0
                    ? `${runningTasks.length} proses sedang berjalan`
                    : "Semua proses telah selesai"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {completedTasks.length > 0 && (
                <button
                  onClick={clearCompleted}
                  className="px-2 py-1 text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition"
                  title="Bersihkan yang selesai"
                >
                  Bersihkan
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition"
                title="Sembunyikan"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Task List */}
          <div className="max-h-72 overflow-y-auto divide-y divide-border/40 p-2 space-y-1.5">
            {tasks.map((task) => (
              <TaskItem key={task.id} task={task} onDismiss={() => removeTask(task.id)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TaskItem({
  task,
  onDismiss,
}: {
  task: BackgroundTask;
  onDismiss: () => void;
}) {
  const isRunning = task.status === "running" || task.status === "pending";
  const isSuccess = task.status === "success";
  const isError = task.status === "error";

  return (
    <div
      className={`rounded-xl p-3 transition-all ${
        isRunning
          ? "bg-accent/40 border border-emerald-500/20"
          : isSuccess
          ? "bg-emerald-500/5 border border-emerald-500/10"
          : "bg-destructive/5 border border-destructive/20"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5 min-w-0">
          {/* Status Icon */}
          <div className="mt-0.5 shrink-0">
            {isRunning && (
              <div className="relative grid place-items-center">
                <Loader2 className="h-4 w-4 text-emerald-600 animate-spin" />
              </div>
            )}
            {isSuccess && (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            )}
            {isError && (
              <AlertCircle className="h-4 w-4 text-destructive" />
            )}
          </div>

          {/* Task Info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-foreground truncate">
                {task.title}
              </span>
              <span
                className={`text-[9px] px-1.5 py-0.2 rounded-full font-medium shrink-0 ${
                  task.category === "knowledge"
                    ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                    : task.category === "siteplan"
                    ? "bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {task.category === "knowledge"
                  ? "Knowledge"
                  : task.category === "siteplan"
                  ? "Siteplan"
                  : "General"}
              </span>
            </div>

            {/* Stage text / description */}
            <p
              className={`text-[11px] mt-1 leading-snug ${
                isError
                  ? "text-destructive font-medium"
                  : isSuccess
                  ? "text-emerald-700 dark:text-emerald-300 font-medium"
                  : "text-muted-foreground"
              }`}
            >
              {task.statusText}
            </p>

            {/* Running Animation Bar */}
            {isRunning && (
              <div className="mt-2 w-full h-1 bg-emerald-100 dark:bg-emerald-950/50 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full animate-indeterminate-bar" />
              </div>
            )}
          </div>
        </div>

        {/* Dismiss Button */}
        <button
          onClick={onDismiss}
          className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-accent transition"
          title="Tutup notifikasi ini"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
