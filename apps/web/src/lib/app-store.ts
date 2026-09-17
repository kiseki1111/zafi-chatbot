"use client";

import { create } from "zustand";
import type { ViewKey } from "./types";
import { canAccess, defaultViewForRole } from "./rbac";

interface AppState {
  view: ViewKey;
  activeContactId: string | null;
  activeSessionId: string | null;
  activeOrderId: string | null;
  sidebarOpen: boolean;
  theme: "light" | "dark";
  enabledMenus: string[] | undefined;
  setView: (v: ViewKey) => void;
  setEnabledMenus: (menus: string[] | undefined) => void;
  setActiveContactId: (id: string | null) => void;
  setActiveSessionId: (id: string | null) => void;
  setActiveOrderId: (id: string | null) => void;
  setSidebarOpen: (open: boolean) => void;
  toggleTheme: () => void;
  resetForRole: (role: Parameters<typeof canAccess>[0]) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  view: "overview",
  activeContactId: null,
  activeSessionId: null,
  activeOrderId: null,
  sidebarOpen: false,
  theme: "light",
  enabledMenus: undefined,
  setView: (v) => set({ view: v, sidebarOpen: false }),
  setEnabledMenus: (menus) => set({ enabledMenus: menus }),
  setActiveContactId: (id) => set({ activeContactId: id }),
  setActiveSessionId: (id) => set({ activeSessionId: id }),
  setActiveOrderId: (id) => set({ activeOrderId: id }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleTheme: () => set({ theme: get().theme === "light" ? "dark" : "light" }),
  resetForRole: (role) => {
    const v = canAccess(role, get().view, get().enabledMenus) ? get().view : defaultViewForRole(role);
    set({ view: v, activeContactId: null, activeOrderId: null });
  },
}));
