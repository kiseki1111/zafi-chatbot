"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sheet, SheetContent, SheetTrigger, SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Menu, Bell, Sun, Moon, LogOut, User as UserIcon,
  Settings as SettingsIcon, ChevronDown, AlertTriangle, QrCode,
} from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { useAppStore } from "@/lib/app-store";
import { ROLE_LABELS, ROLE_THEME } from "@/lib/rbac";
import { cn } from "@/lib/utils";
import { Sidebar } from "./sidebar";

export function Topbar() {
  const { user, logout } = useAuthStore();
  const { view, setView, sidebarOpen, setSidebarOpen, theme, toggleTheme } = useAppStore();
  const [offlineInstances, setOfflineInstances] = useState<{ instanceName: string; status: string }[]>([]);

  useEffect(() => {
    if (!user?.tenantId) return;
    const checkInstances = async () => {
      try {
        const res = await fetch(`/api/v1/waha/instances/db?tenantId=${user.tenantId}`);
        if (res.ok) {
          const data = await res.json();
          const items = Array.isArray(data) ? data : data?.data || [];
          const disconnected = items.filter((i: any) => i.status !== "WORKING");
          setOfflineInstances(disconnected);
        }
      } catch (err) {
        // silent fail on network
      }
    };
    checkInstances();
    const interval = setInterval(checkInstances, 15000);
    return () => clearInterval(interval);
  }, [user?.tenantId]);

  if (!user) return null;
  const safeRole = (user.role || "operator").toLowerCase() as any;
  const themeColors = ROLE_THEME[safeRole] || { bg: "bg-muted", color: "text-foreground", ring: "ring-muted" };

  return (
    <>
      {offlineInstances.length > 0 && (
        <div className="bg-amber-500 text-amber-950 px-4 py-2 text-xs font-medium flex items-center justify-between border-b border-amber-600/20 shadow-sm transition-all animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-950 animate-pulse" />
            <span>
              Perhatian: Ada <strong>{offlineInstances.length} nomor WhatsApp</strong> (<em>{offlineInstances.map(i => i.instanceName).join(', ')}</em>) yang terputus atau perlu login / scan QR ulang agar fitur bot & follow-up berjalan normal.
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-[11px] bg-white hover:bg-amber-50 border-amber-600/30 text-amber-950 font-semibold shrink-0 ml-4 gap-1.5 shadow-none"
            onClick={() => {
              window.history.pushState({}, '', '?view=settings&tab=koneksi');
              setView("settings");
            }}
          >
            <QrCode className="h-3 w-3" /> Hubungkan Sekarang
          </Button>
        </div>
      )}
      <header className="sticky top-0 z-30 h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-3 h-full px-4 lg:px-6">
        {/* Mobile menu */}
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden h-9 w-9" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72">
            <SheetTitle className="sr-only">Navigasi</SheetTitle>
            <Sidebar />
          </SheetContent>
        </Sheet>

        {/* Title removed per user request */}

        {/* Theme toggle */}
        <Button variant="ghost" size="icon" className="h-9 w-9 ml-auto md:ml-0" onClick={toggleTheme} title="Ganti tema">
          {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </Button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-full pl-1 pr-2 py-1 hover:bg-muted transition-colors">
              <Avatar className={cn("h-8 w-8 ring-1", themeColors.ring)}>
                <AvatarFallback className={cn("text-xs font-bold", themeColors.bg, themeColors.color)}>
                  {user.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="hidden lg:block text-left">
                <p className="text-xs font-semibold leading-tight max-w-[120px] truncate">{user.name}</p>
                <p className="text-[10px] text-muted-foreground">{ROLE_LABELS[safeRole] || "Pengguna"}</p>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden lg:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5">
              <p className="text-sm font-semibold">{user.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              <Badge variant="outline" className={cn("mt-1.5 text-[10px]", themeColors.color, themeColors.bg)}>{ROLE_LABELS[safeRole] || "Pengguna"}</Badge>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setView("settings")}>
              <UserIcon className="h-4 w-4" /> Profil Saya
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setView("settings")}>
              <SettingsIcon className="h-4 w-4" /> Pengaturan
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={logout}>
              <LogOut className="h-4 w-4" /> Keluar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
    </>
  );
}
