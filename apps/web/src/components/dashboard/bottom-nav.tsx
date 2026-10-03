"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/lib/auth-store";
import { useAppStore } from "@/lib/app-store";
import { ROLE_LABELS, ROLE_THEME, menuForRole } from "@/lib/rbac";
import type { ViewKey } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  MessageCircle,
  Users,
  BookOpen,
  MoreHorizontal,
  Settings,
  BellRing,
  Building2,
  Smartphone,
  BarChart,
  LogOut,
  Moon,
  Sun,
  Download,
  Grid3X3,
  Bus,
  ShieldCheck,
  ChevronRight,
  User as UserIcon,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface NavItem {
  key: ViewKey;
  label: string;
  icon: React.ElementType;
}

export function BottomNav() {
  const { user, logout } = useAuthStore();
  const { view, setView, theme, toggleTheme, enabledMenus } = useAppStore();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") setInstallPrompt(null);
  };

  if (!user) return null;

  const isSuperadmin = user.role === "superadmin";

  const primaryItems: NavItem[] = isSuperadmin
    ? [
        { key: "platform_overview", label: "Ringkasan", icon: LayoutDashboard },
        { key: "clients", label: "Klien", icon: Building2 },
        { key: "waha_monitor", label: "Sesi WA", icon: Smartphone },
        { key: "quota_monitor", label: "Kuota", icon: BarChart },
      ]
    : [
        { key: "overview", label: "Beranda", icon: LayoutDashboard },
        { key: "chatbot", label: "Chat Bot", icon: MessageCircle },
        { key: "crm", label: "Pelanggan", icon: Users },
        { key: "knowledge", label: "Knowledge", icon: BookOpen },
      ];

  const safeRole = (user.role || "operator").toLowerCase() as any;
  const themeColors = ROLE_THEME[safeRole] || {
    bg: "bg-muted",
    color: "text-foreground",
    ring: "ring-muted",
  };

  // Additional menus for the sheet
  const allRoleMenus = menuForRole(safeRole, enabledMenus, user) || [];
  const primaryKeys = primaryItems.map((i) => i.key);
  const extraMenus = allRoleMenus.filter((m) => !primaryKeys.includes(m.key));

  // Icon helper – always renders an icon, falls back to ChevronRight for unknown keys
  const iconMap: Record<string, React.ElementType> = {
    settings: Settings,
    followup: BellRing,
    availability: Grid3X3,
    bus_layout: Bus,
    pricing_plans: ShieldCheck,
    ai_config: Settings,
    system_logs: Smartphone,
  };

  const getMenuIcon = (key: string) => {
    const Icon = iconMap[key] || ChevronRight;
    return <Icon className="h-4 w-4" />;
  };

  return (
    <nav
      aria-label="Navigasi Bawah Mobile"
      className="fixed bottom-0 inset-x-0 z-40 lg:hidden border-t border-border/80 bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80 transition-all"
      style={{ paddingBottom: "max(0.35rem, env(safe-area-inset-bottom))" }}
    >
      <div className="flex items-center justify-around h-15 px-2">
        {primaryItems.map((item) => {
          const Icon = item.icon;
          const isActive = view === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setView(item.key)}
              className={cn(
                "relative flex-1 min-h-[48px] flex flex-col items-center justify-center py-1 transition-all select-none active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-xl",
                isActive
                  ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div
                className={cn(
                  "flex items-center justify-center h-7 w-12 rounded-full transition-all duration-200",
                  isActive
                    ? "bg-emerald-500/15 dark:bg-emerald-500/20"
                    : "bg-transparent"
                )}
              >
                <Icon className={cn("h-5 w-5", isActive ? "stroke-[2.25]" : "stroke-[1.75]")} />
              </div>
              <span className="text-[10px] tracking-tight mt-0.5 leading-none">
                {item.label}
              </span>
            </button>
          );
        })}

        {/* More Actions Drawer (Replaces duplicate hamburger with standard mobile More dots) */}
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              className={cn(
                "relative flex-1 min-h-[48px] flex flex-col items-center justify-center py-1 transition-all select-none active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-xl",
                sheetOpen || (!primaryKeys.includes(view) && view !== "overview")
                  ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div
                className={cn(
                  "flex items-center justify-center h-7 w-12 rounded-full transition-all duration-200",
                  sheetOpen || (!primaryKeys.includes(view) && view !== "overview")
                    ? "bg-emerald-500/15 dark:bg-emerald-500/20"
                    : "bg-transparent"
                )}
              >
                <MoreHorizontal className="h-5 w-5 stroke-[2]" />
              </div>
              <span className="text-[10px] tracking-tight mt-0.5 leading-none">
                Lainnya
              </span>
            </button>
          </SheetTrigger>

          <SheetContent side="bottom" className="p-0 rounded-t-2xl max-h-[85vh] flex flex-col">
            <SheetHeader className="px-5 pt-4 pb-3 border-b border-border/60 text-left">
              <div className="flex items-center gap-3">
                <Avatar className={cn("h-10 w-10 ring-1", themeColors.ring)}>
                  <AvatarFallback className={cn("font-bold text-sm", themeColors.bg, themeColors.color)}>
                    {user.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <SheetTitle className="text-sm font-semibold truncate leading-tight">
                    {user.name}
                  </SheetTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-4.5", themeColors.color, themeColors.bg)}>
                      {ROLE_LABELS[safeRole] || "Pengguna"}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground truncate">{user.email}</span>
                  </div>
                </div>
              </div>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
              {/* PWA Install Quick Action if Available */}
              {installPrompt && (
                <div className="p-3 rounded-xl border-2 border-transparent bg-emerald-500/10 flex items-center justify-between" style={{ borderImage: "linear-gradient(135deg, #10b981, #14b8a6, #059669) 1", borderImageSlice: 1, borderRadius: "0.75rem", backgroundClip: "padding-box" }}>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 grid place-items-center flex-shrink-0">
                      <Download className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground">Pasang Aplikasi PWA</p>
                      <p className="text-[11px] text-muted-foreground">Akses cepat seperti aplikasi native</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={handleInstallClick}
                    className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    Pasang
                  </Button>
                </div>
              )}

              {/* Extra Navigation Items */}
              {extraMenus.length > 0 && (
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2 px-1">
                    Fitur Lainnya
                  </p>
                  <div className="space-y-1">
                    {extraMenus.map((m) => {
                      const isSelected = view === m.key;
                      return (
                        <button
                          key={m.key}
                          type="button"
                          onClick={() => {
                            setView(m.key);
                            setSheetOpen(false);
                          }}
                          className={cn(
                            "w-full flex items-center justify-between px-3 py-3 min-h-[48px] rounded-xl text-sm font-medium transition-colors text-left",
                            isSelected
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                              : "hover:bg-muted text-foreground"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg grid place-items-center bg-muted/60 text-muted-foreground">
                              {getMenuIcon(m.key)}
                            </div>
                            <span>{m.label}</span>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Settings & Theme */}
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2 px-1">
                  Preferensi & Pengaturan
                </p>
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      setView("settings");
                      setSheetOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-3 min-h-[48px] rounded-xl text-sm font-medium transition-colors text-left",
                      view === "settings"
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                        : "hover:bg-muted text-foreground"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg grid place-items-center bg-muted/60 text-muted-foreground">
                        <Settings className="h-4 w-4" />
                      </div>
                      <span>Pengaturan Akun & Bot</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>

                  <button
                    type="button"
                    onClick={toggleTheme}
                    className="w-full flex items-center justify-between px-3 py-3 min-h-[48px] rounded-xl text-sm font-medium transition-colors text-left hover:bg-muted text-foreground"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg grid place-items-center bg-muted/60 text-muted-foreground">
                        {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                      </div>
                      <span>Tema Tampilan ({theme === "light" ? "Terang" : "Gelap"})</span>
                    </div>
                    <span className="text-xs text-muted-foreground">Ganti</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Logout Footer */}
            <div className="p-4 border-t border-border/60 bg-muted/20">
              <Button
                variant="outline"
                onClick={() => {
                  setSheetOpen(false);
                  logout();
                }}
                className="w-full h-10 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive gap-2 font-medium"
              >
                <LogOut className="h-4 w-4" /> Keluar dari Akun
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
