"use client";

import { useAuthStore } from "@/lib/auth-store";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck,
  Lock,
  Mail,
  LogOut,
  Eye,
  ArrowUpRight,
} from "lucide-react";

export function NoSubscriptionModal() {
  const { user, logout, updateUser } = useAuthStore();

  const isLocal =
    typeof window !== "undefined" &&
    (window.location.hostname.includes("localhost") ||
      window.location.hostname.includes("127.0.0.1"));
  const consolePortalUrl = isLocal
    ? "http://localhost:17341/akun/langganan"
    : "https://console.zafii.tech/akun/langganan";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="no-sub-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/75 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        {/* Top Accent Strip */}
        <div className="h-1.5 w-full bg-gradient-to-r from-emerald-600 via-teal-500 to-[#0663B9]" />

        <div className="p-6 sm:p-7 space-y-5">
          {/* Brand & Vector Lock Emblem */}
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="relative flex items-center justify-center">
              <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-xs">
                <img
                  src="/logo-icon.svg"
                  alt="ZAF SAPA"
                  className="h-7 w-7 object-contain dark:brightness-0 dark:invert"
                />
              </div>
              <span className="absolute -bottom-1.5 -right-1.5 h-6 w-6 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-xs backdrop-blur-sm">
                <Lock className="h-3.5 w-3.5" />
              </span>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span>SSO ZAF Console Terverifikasi</span>
            </div>

            <div className="space-y-1.5">
              <h2
                id="no-sub-title"
                className="text-xl font-bold tracking-tight text-foreground"
              >
                Langganan ZAF Chatbot Belum Aktif
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Halo{" "}
                <span className="font-semibold text-foreground">
                  {user?.name || user?.email}
                </span>
                , akun Console Anda sudah terhubung via SSO, namun perusahaan
                Anda belum memiliki paket aktif untuk aplikasi{" "}
                <span className="font-semibold text-foreground">
                  ZAF Chatbot
                </span>
                .
              </p>
            </div>
          </div>

          {/* Account Status Card */}
          <div className="rounded-xl border border-border/80 bg-muted/40 p-4 space-y-2.5 text-xs">
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-border/60">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Akun Console</span>
              </span>
              <span className="inline-flex items-center rounded-md bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-400 border border-amber-500/20">
                Belum Berlangganan
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 text-muted-foreground">
              <span>Email</span>
              <span className="font-mono text-foreground truncate max-w-[230px]">
                {user?.email}
              </span>
            </div>
            <p className="text-muted-foreground leading-relaxed pt-0.5">
              Aktifkan langganan melalui portal ZAF Console untuk membuka akses
              penuh ke dashboard, knowledge base, dan otomasi WhatsApp.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2.5">
            <Button
              asChild
              className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all font-medium"
            >
              <a
                href={consolePortalUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span>Buka Portal Langganan ZAF Console</span>
                <ArrowUpRight className="ml-1.5 w-4 h-4" />
              </a>
            </Button>

            <Button
              variant="outline"
              onClick={logout}
              className="w-full h-10 text-muted-foreground hover:text-foreground"
            >
              <LogOut className="mr-2 w-4 h-4" />
              <span>Keluar (Logout)</span>
            </Button>

            <div className="pt-1 text-center">
              <button
                type="button"
                onClick={() => updateUser({ hasSubscription: true })}
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground/70 hover:text-foreground underline underline-offset-4 transition-colors cursor-pointer"
              >
                <Eye className="h-3.5 w-3.5" />
                <span>Mode Pengujian: Pratinjau Antarmuka</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
