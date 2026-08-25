"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, Role } from "./types";
import { DEMO_ACCOUNTS } from "./mock-data";

type AuthView = "login" | "register" | "forgot";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  authView: AuthView;
  setAuthView: (v: AuthView) => void;
  login: (email: string, password: string) => Promise<{ ok: boolean; message?: string }>;
  loginAs: (role: Role) => void;

  register: (data: { name: string; email: string; phone: string; password: string }) => Promise<{ ok: boolean; message?: string }>;
  updateUser: (data: Partial<User>) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      authView: "login",
      setAuthView: (v) => set({ authView: v }),
      login: async (email, password) => {
        try {
          const response = await fetch('/api/v1/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, passwordPlain: password }),
          });
          const result = await response.json();
          
          if (!response.ok) {
            return { ok: false, message: result.message || "Email atau password salah." };
          }
          
          const responseData = result.data || result;
          const user: User = {
            id: responseData.user.id,
            name: responseData.user.name || responseData.user.email.split("@")[0],
            email: responseData.user.email,
            role: responseData.user.roles?.[0] || "owner",
            status: "active",
            createdAt: new Date().toISOString().slice(0, 10),
            lastLogin: new Date().toISOString().slice(0, 16).replace("T", " "),
            tenantId: responseData.user.tenantId || null,
          };
          set({ user, isAuthenticated: true, authView: "login" });
          return { ok: true };
        } catch (error) {
          return { ok: false, message: "Terjadi kesalahan jaringan." };
        }
      },
      loginAs: (role: Role) => {
        const user: User = {
          id: "u-" + role,
          name: role === "superadmin" ? "Superadmin Global" : `Demo ${role}`,
          email: `${role}@umkm.id`,
          role,
          status: "active",
          createdAt: "2024-01-01",
          lastLogin: new Date().toISOString().slice(0, 16).replace("T", " "),
          tenantId: "t-123", // Dummy tenant
        };
        set({ user, isAuthenticated: true });
      },

      register: async (data) => {
        if (!data.email.includes("@")) return { ok: false, message: "Email tidak valid." };
        if (data.password.length < 6) return { ok: false, message: "Password minimal 6 karakter." };
        
        try {
          const response = await fetch('/api/v1/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: data.name,
              email: data.email,
              phone: data.phone,
              passwordPlain: data.password,
            }),
          });
          const result = await response.json();
          
          if (!response.ok) {
            return { ok: false, message: result.message || "Pendaftaran gagal." };
          }
          
          const responseData = result.data || result;
          const user: User = {
            id: responseData.user.id,
            name: responseData.user.name,
            email: responseData.user.email,
            phone: data.phone,
            role: responseData.user.roles?.[0] || "owner",
            status: "active",
            createdAt: new Date().toISOString().slice(0, 10),
            lastLogin: new Date().toISOString().slice(0, 16).replace("T", " "),
            tenantId: responseData.user.tenantId || null,
          };
          set({ user, isAuthenticated: true });
          return { ok: true };
        } catch (error) {
          return { ok: false, message: "Terjadi kesalahan jaringan." };
        }
      },
      updateUser: (data) => {
        const currentUser = get().user;
        if (currentUser) {
          set({ user: { ...currentUser, ...data } });
        }
      },
      logout: () => set({ user: null, isAuthenticated: false, authView: "login" }),
    }),
    { name: "umkm-auth" },
  ),
);
