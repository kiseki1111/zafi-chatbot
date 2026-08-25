"use client";

import { Building2, LogOut, ChevronLeft } from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { useAppStore } from "@/lib/app-store";
import { menuForRole, ROLE_LABELS, ROLE_THEME } from "@/lib/rbac";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ViewIcon } from "./icons";
import type { ViewKey } from "@/lib/types";

export function Sidebar() {
  const { user, logout } = useAuthStore();
  const { view, setView, setSidebarOpen } = useAppStore();

  if (!user) return null;
  const safeRole = (user.role || "operator").toLowerCase() as any;
  const items = menuForRole(safeRole) || [];
  const theme = ROLE_THEME[safeRole] || { bg: "bg-muted", color: "text-foreground", ring: "ring-muted" };

  const go = (v: ViewKey) => setView(v);

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-sidebar-border shrink-0">
        <div className="grid place-items-center h-9 w-9 rounded-lg bg-emerald-600 text-white shadow-sm shrink-0">
          <Building2 className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-sm leading-tight truncate">Chatbot Manager</p>
          <p className="text-[10px] text-muted-foreground truncate">Asisten AI WhatsApp</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto lg:hidden h-8 w-8"
          onClick={() => setSidebarOpen(false)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      {/* Nav */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Menu Utama
          </p>
          {items.map((item) => {
            const active = view === item.key;
            return (
              <button
                key={item.key}
                onClick={() => go(item.key)}
                className={cn(
                  "w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all group",
                  active
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                )}
              >
                <ViewIcon name={item.icon} className={cn("h-4 w-4 shrink-0", active ? "text-white" : "text-muted-foreground group-hover:text-foreground")} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </ScrollArea>

      {/* User card */}
      <div className="border-t border-sidebar-border p-3 shrink-0">
        <div className="rounded-lg bg-sidebar-accent/60 p-3 flex items-center gap-3">
          <div className={cn("h-9 w-9 rounded-full grid place-items-center text-sm font-bold ring-1", theme.bg, theme.color, theme.ring)}>
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate leading-tight">{user.name}</p>
            <p className={cn("text-[10px] font-medium uppercase", theme.color)}>
              {ROLE_LABELS[safeRole] || "Pengguna"}
            </p>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={logout} title="Keluar">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
