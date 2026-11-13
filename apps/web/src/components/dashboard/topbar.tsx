"use client";

import { useState, useEffect, useRef } from "react";
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
  Settings as SettingsIcon, ChevronDown, AlertTriangle, QrCode, X, Search,
  Flame, MessageCircle,
} from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { useAppStore } from "@/lib/app-store";
import { ROLE_LABELS, ROLE_THEME } from "@/lib/rbac";
import { cn } from "@/lib/utils";
import { Sidebar } from "./sidebar";
import { GlobalSearchDialog, useGlobalSearchShortcut } from "./global-search-dialog";

export function Topbar() {
  const { user, logout } = useAuthStore();
  const { view, setView, sidebarOpen, setSidebarOpen, theme, toggleTheme, setActiveContactId } = useAppStore();
  const [offlineInstances, setOfflineInstances] = useState<{ instanceName: string; status: string }[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [hotLeads, setHotLeads] = useState<any[]>([]);
  const [newHotLead, setNewHotLead] = useState<any | null>(null);
  const [newHotCount, setNewHotCount] = useState(0);
  const seenHotIds = useRef<Set<string>>(new Set());
  const hasLoadedHot = useRef(false);

  useGlobalSearchShortcut(searchOpen, setSearchOpen);

  useEffect(() => {
    if (!user?.tenantId) return;
    const hotKey = (lead: any) =>
      `${lead.id}:${lead.hotEpisodeStartedAt || ""}`;
    const loadHotLeads = async () => {
      try {
        const res = await fetch(`/api/v1/contacts/hot-leads?unread=true`);
        if (res.ok) {
          const json = await res.json();
          const items: any[] = Array.isArray(json) ? json : json?.data || [];
          setHotLeads(items);

          if (!hasLoadedHot.current) {
            // baseline: jangan munculkan card untuk data yang sudah ada saat halaman dibuka
            items.forEach((l) => seenHotIds.current.add(hotKey(l)));
            hasLoadedHot.current = true;
          } else {
            const fresh = items.filter(
              (l) => !seenHotIds.current.has(hotKey(l)),
            );
            items.forEach((l) => seenHotIds.current.add(hotKey(l)));
            if (fresh.length > 0) {
              setNewHotLead(fresh[0]);
              setNewHotCount(fresh.length);
            }
          }
        }
      } catch {
        // silent fail on network
      }
    };
    loadHotLeads();
    const interval = setInterval(loadHotLeads, 20000);
    return () => clearInterval(interval);
  }, [user?.tenantId]);

  const openHotLead = (lead: any) => {
    const conversationId = lead.conversationId;
    if (conversationId) setActiveContactId(conversationId);
    setView("chatbot");
    setHotLeads((prev) => prev.filter((l) => l.id !== lead.id));
    setNewHotLead(null);
    // tandai sudah dibuka agar tidak muncul lagi di notifikasi
    fetch(`/api/v1/contacts/${lead.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ metadata: { hotAcknowledged: true } }),
    }).catch(() => null);
  };

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
      {offlineInstances.length > 0 && !dismissed && (
        <div className="bg-amber-500 text-amber-950 px-4 py-2 text-xs font-medium flex items-center justify-between border-b border-amber-600/20 shadow-xs shrink-0 transition-all animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-950 animate-pulse" />
            <span>
              Perhatian: Ada <strong>{offlineInstances.length} nomor WhatsApp</strong> (<em>{Array.from(new Set(offlineInstances.map(i => i.instanceName))).join(', ')}</em>) yang terputus atau perlu scan QR ulang.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-4">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-[11px] bg-white hover:bg-amber-50 border-amber-600/30 text-amber-950 font-semibold gap-1.5 shadow-none"
              onClick={() => {
                const onlyAssistant = offlineInstances.length > 0 && offlineInstances.every(i => i.instanceName.startsWith('asisten-'));
                window.history.pushState({}, '', `?view=settings&tab=${onlyAssistant ? 'bot_asisten' : 'bot_cs'}`);
                setView("settings");
              }}
            >
              <QrCode className="h-3 w-3" /> Hubungkan
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-amber-950 hover:bg-amber-600/30 hover:text-amber-950 rounded-full"
              onClick={() => setDismissed(true)}
              title="Tutup notifikasi"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
      <header className="sticky top-0 z-30 h-14 lg:h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shrink-0">
      <div className="flex items-center justify-between gap-3 h-full px-4 lg:px-6">
        {/* Compact Mobile Brand (Hanya tampil di layar HP/Tablet, di desktop sudah ada di Sidebar) */}
        <div className="flex lg:hidden items-center gap-2">
          <img
            src="/logo-icon.svg"
            alt="ZAF SAPA"
            className="h-6 w-6 shrink-0 object-contain dark:brightness-0 dark:invert"
          />
          <div className="min-w-0">
            <span className="font-bold text-sm tracking-tight text-foreground truncate block leading-tight">
              ZAF SAPA
            </span>
            <span className="text-[10px] text-muted-foreground block leading-none">
              CS & Asisten AI
            </span>
          </div>
        </div>

        {/* Global Omnisearch Trigger (Desktop) */}
        <button
          onClick={() => setSearchOpen(true)}
          className="hidden md:flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground bg-muted/60 hover:bg-muted border border-border/50 hover:border-border rounded-xl transition-all cursor-pointer w-64 lg:w-80"
        >
          <Search className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1 text-left truncate">Cari kontak, chat, unit...</span>
          <kbd className="inline-flex items-center gap-0.5 rounded border border-border/60 bg-background px-1.5 font-mono text-[10px] text-muted-foreground">
            Ctrl K
          </kbd>
        </button>

        {/* Right side controls */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Mobile Search Button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 md:hidden"
            onClick={() => setSearchOpen(true)}
            title="Cari (Ctrl+K)"
          >
            <Search className="h-4 w-4" />
          </Button>
          {/* Hot Lead Notification */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 relative"
                title="Notifikasi Hot Lead"
              >
                <Bell className="h-4 w-4" />
                {hotLeads.length > 0 && (
                  <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {hotLeads.length > 9 ? "9+" : hotLeads.length}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel className="flex items-center gap-1.5">
                <Flame className="h-3.5 w-3.5 text-red-500" />
                <span>Hot Lead</span>
                <span className="text-[10px] font-normal text-muted-foreground">
                  Tinjau chat sebelum follow-up
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {hotLeads.length === 0 ? (
                <div className="px-2 py-6 text-center text-xs text-muted-foreground">
                  Belum ada hot lead baru.
                </div>
              ) : (
                hotLeads.map((lead) => (
                  <DropdownMenuItem
                    key={lead.id}
                    onClick={() => openHotLead(lead)}
                    className="flex flex-col items-start gap-0.5 cursor-pointer"
                  >
                    <div className="flex w-full items-center justify-between gap-2">
                      <span className="text-sm font-semibold truncate">{lead.name}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0">{lead.phone}</span>
                    </div>
                    <span className="text-[11px] text-red-600 dark:text-red-400 truncate w-full">
                      {lead.hotTriggerReason || "Minat kuat"}
                    </span>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Theme toggle */}
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={toggleTheme} title="Ganti tema">
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
      </div>
    </header>

    {newHotLead && (
      <div className="fixed bottom-20 sm:bottom-4 right-4 z-[60] w-[min(92vw,360px)] animate-in fade-in slide-in-from-bottom-4">
        <div className="rounded-xl border border-red-200 dark:border-red-900 bg-card shadow-2xl overflow-hidden">
          <div className="flex items-start gap-3 p-3.5 bg-red-600 text-white">
            <div className="h-9 w-9 rounded-full bg-white/15 grid place-items-center shrink-0">
              <Flame className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-tight">
                {newHotCount > 1
                  ? `${newHotCount} Hot Lead baru`
                  : "Hot Lead baru"}
              </p>
              <p className="text-[11px] text-white/85 truncate mt-0.5">
                {newHotLead.name}
                {newHotLead.hotTriggerReason
                  ? ` — ${newHotLead.hotTriggerReason}`
                  : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setNewHotLead(null)}
              className="shrink-0 rounded-full p-1 text-white/80 hover:text-white hover:bg-white/15 transition-colors"
              title="Tutup notifikasi"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="p-3 flex items-center gap-2">
            <Button
              size="sm"
              className="flex-1 h-8 text-xs gap-1.5 bg-red-600 hover:bg-red-700 text-white font-semibold"
              onClick={() => openHotLead(newHotLead)}
            >
              <MessageCircle className="h-3.5 w-3.5" /> Buka Chat
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={() => {
                setView("crm");
                setNewHotLead(null);
              }}
            >
              Lihat Pelanggan
            </Button>
          </div>
        </div>
      </div>
    )}

    {/* Global Omnisearch Dialog */}
    <GlobalSearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
