"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, Smartphone, Package, Users, ArrowRight, X, ListChecks } from "lucide-react";
import { useAppStore } from "@/lib/app-store";
import { useAuthStore } from "@/lib/auth-store";
import { cn } from "@/lib/utils";

export interface SetupChecklistData {
  hasWhatsappConnected: boolean;
  hasProduct: boolean;
  hasTeamMember: boolean;
  checklistDismissed: boolean;
}

interface GettingStartedChecklistProps {
  data?: SetupChecklistData;
  onDismiss?: () => void;
  className?: string;
}

export function GettingStartedChecklist({
  data,
  onDismiss,
  className,
}: GettingStartedChecklistProps) {
  const { setView } = useAppStore();
  const { user } = useAuthStore();
  const [dismissed, setDismissed] = useState(false);

  if (!data) return null;

  // Auto-hide jika ketiga item sudah selesai atau sudah di-dismiss
  const allCompleted =
    data.hasWhatsappConnected && data.hasProduct && data.hasTeamMember;

  if (allCompleted || data.checklistDismissed || dismissed) {
    return null;
  }

  const completedCount =
    (data.hasWhatsappConnected ? 1 : 0) +
    (data.hasProduct ? 1 : 0) +
    (data.hasTeamMember ? 1 : 0);

  const progressPercent = Math.round((completedCount / 3) * 100);

  const handleDismiss = async () => {
    setDismissed(true);
    if (onDismiss) onDismiss();

    try {
      const targetId = user?.tenantId || user?.id || "demo";
      await fetch(`/api/v1/tenant/${targetId}/checklist/dismiss`, {
        method: "PATCH",
      });
    } catch {}
  };

  const items = [
    {
      id: "whatsapp",
      title: "Hubungkan WhatsApp Bisnis",
      desc: "Scan QR WhatsApp agar bot AI dapat membalas chat otomatis 24/7.",
      completed: data.hasWhatsappConnected,
      icon: Smartphone,
      action: () => setView("settings"),
      actionLabel: "Buka Pengaturan WA",
    },
    {
      id: "product",
      title: "Tambah Produk / Layanan Pertama",
      desc: "Masukkan produk agar asisten AI dapat memberi info harga dan cek stok.",
      completed: data.hasProduct,
      icon: Package,
      action: () => setView("products"),
      actionLabel: "Buka Katalog Produk",
    },
    {
      id: "team",
      title: "Undang Anggota Tim / Staf",
      desc: "Ajak staf atau admin CS untuk ikut memantau percakapan pelanggan.",
      completed: data.hasTeamMember,
      icon: Users,
      action: () => setView("settings"),
      actionLabel: "Kelola Tim",
    },
  ];

  return (
    <Card className={cn("border border-border/80 bg-card overflow-hidden shadow-xs mb-6", className)}>
      <CardHeader className="pb-3 pt-4 sm:pt-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <ListChecks className="h-3.5 w-3.5" />
              </div>
              <CardTitle className="text-sm sm:text-base font-bold text-foreground">
                Checklist Memulai (Getting Started)
              </CardTitle>
            </div>
            <CardDescription className="text-xs">
              Selesaikan 3 langkah penting ini agar platform Anda berjalan maksimal. ({completedCount}/3 selesai)
            </CardDescription>
          </div>

          <button
            onClick={handleDismiss}
            type="button"
            aria-label="Tutup checklist"
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-muted/60 h-2 rounded-full overflow-hidden mt-3">
          <div
            className="bg-emerald-600 h-full rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </CardHeader>

      <CardContent className="pt-1 pb-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                onClick={!item.completed ? item.action : undefined}
                className={cn(
                  "p-3 rounded-xl border transition-all duration-200 flex flex-col justify-between",
                  item.completed
                    ? "bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-500/20 opacity-80"
                    : "bg-muted/20 hover:bg-muted/50 border-border cursor-pointer hover:border-emerald-500/40 shadow-2xs",
                )}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-semibold text-xs text-foreground">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{item.title}</span>
                    </div>
                    {item.completed ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground/60 shrink-0" />
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    {item.desc}
                  </p>
                </div>

                {!item.completed && (
                  <div className="mt-3 pt-2 border-t border-border/40 flex items-center justify-between text-[11px] font-medium text-emerald-600 hover:text-emerald-700">
                    <span>{item.actionLabel}</span>
                    <ArrowRight className="h-3 w-3" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
