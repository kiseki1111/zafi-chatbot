"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Menu, Search, Bell, Sun, Moon, LogOut, User as UserIcon,
  Settings as SettingsIcon, HelpCircle, ChevronDown, Download,
} from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { useAppStore } from "@/lib/app-store";
import { ROLE_LABELS, ROLE_THEME } from "@/lib/rbac";
import { VIEW_TITLES } from "./icons";
import { cn } from "@/lib/utils";
import { Sidebar } from "./sidebar";

export function Topbar() {
  const { user, logout } = useAuthStore();
  const { view, setView, sidebarOpen, setSidebarOpen, theme, toggleTheme } = useAppStore();
  const [notifOpen, setNotifOpen] = useState(false);

  if (!user) return null;
  const safeRole = (user.role || "operator").toLowerCase() as any;
  const themeColors = ROLE_THEME[safeRole] || { bg: "bg-muted", color: "text-foreground", ring: "ring-muted" };
  const meta = VIEW_TITLES[view];

  const notifications = [
    { id: 1, title: "5 pesan baru dari Siti Aminah", time: "2 mnt lalu", type: "chat" },
    { id: 2, title: "Pesanan ORD-2025-0005 butuh tindak lanjut", time: "15 mnt lalu", type: "order" },
    { id: 3, title: "Kampanye 'Promo Rumah Cibaduyut' aktif", time: "1 jam lalu", type: "marketing" },
    { id: 4, title: "Tagihan INV-2025-0006 jatuh tempo", time: "3 jam lalu", type: "finance" },
  ];

  return (
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

        {/* Search */}
        <div className="relative ml-auto hidden md:block w-64 lg:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cari kontak, produk, pesanan..." className="pl-9 h-9 bg-muted/50 border-transparent focus-visible:bg-background" />
        </div>

        {/* Theme toggle */}
        <Button variant="ghost" size="icon" className="h-9 w-9 ml-auto md:ml-0" onClick={toggleTheme} title="Ganti tema">
          {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </Button>

        {/* Download buttons removed per user request */}

        {/* Notifications */}
        <DropdownMenu open={notifOpen} onOpenChange={setNotifOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 relative" title="Notifikasi">
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-background" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              <span>Notifikasi</span>
              <Badge variant="secondary" className="text-[10px]">{notifications.length} baru</Badge>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="max-h-80 overflow-y-auto">
              {notifications.map((n) => (
                <DropdownMenuItem key={n.id} className="flex-col items-start py-2.5 cursor-pointer">
                  <p className="text-sm font-medium leading-snug">{n.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{n.time}</p>
                </DropdownMenuItem>
              ))}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="justify-center text-sm text-emerald-600 cursor-pointer">
              Lihat semua notifikasi
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

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
            <DropdownMenuItem>
              <HelpCircle className="h-4 w-4" /> Bantuan
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={logout}>
              <LogOut className="h-4 w-4" /> Keluar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
