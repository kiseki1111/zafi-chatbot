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
  login: (email: string, password: string) => { ok: boolean; message?: string };
  loginAs: (role: Role, division?: import("./types").Division | null) => void;
  googleLogin: (idToken: string) => Promise<{ ok: boolean; message?: string }>;
  register: (data: { name: string; email: string; phone: string; password: string }) => { ok: boolean; message?: string };
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      authView: "login",
      setAuthView: (v) => set({ authView: v }),
      login: (email, password) => {
        // Mock fallback login for development
        if (email && password.length >= 4) {
          const user: User = {
            id: "u-guest",
            name: email.split("@")[0] || "Pengguna",
            email,
            role: "superadmin",
            division: null,
            status: "active",
            createdAt: "2024-01-01",
            lastLogin: new Date().toISOString().slice(0, 16).replace("T", " "),
          };
          set({ user, isAuthenticated: true, authView: "login" });
          return { ok: true };
        }
        return { ok: false, message: "Email atau password salah." };
      },
      loginAs: (role: Role, division?: import("./types").Division | null) => {
        const user: User = {
          id: "u-" + role + (division ? "-" + division : ""),
          name: role === "superadmin" ? "Superadmin Global" : `Demo ${role}`,
          email: `${role}${division ? "." + division : ""}@propertiku.id`,
          role,
          division: division || null,
          status: "active",
          createdAt: "2024-01-01",
          lastLogin: new Date().toISOString().slice(0, 16).replace("T", " "),
        };
        set({ user, isAuthenticated: true });
      },
      googleLogin: async (idToken: string) => {
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/api/v1/auth/google`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken })
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            return { ok: false, message: err.message || "Gagal login dengan Google" };
          }
          const responseData = await res.json();
          const data = responseData.data || responseData; // Handle both wrapped and unwrapped just in case
          const user: User = {
            id: data.user.id,
            name: data.user.name,
            email: data.user.email,
            role: (data.user.roles && data.user.roles.length > 0) ? data.user.roles[0].toLowerCase() : "operator", 
            division: data.user.division ? data.user.division.toLowerCase() : null,
            status: "active",
            createdAt: new Date().toISOString().slice(0, 10),
            lastLogin: new Date().toISOString().slice(0, 16).replace("T", " ")
          };
          // Access tokens could be saved here in localStorage
          localStorage.setItem("access_token", data.accessToken);
          localStorage.setItem("refresh_token", data.refreshToken);
          set({ user, isAuthenticated: true, authView: "login" });
          return { ok: true };
        } catch (error) {
          console.error(error);
          return { ok: false, message: "Terjadi kesalahan jaringan." };
        }
      },
      register: (data) => {
        if (!data.email.includes("@")) return { ok: false, message: "Email tidak valid." };
        if (data.password.length < 6) return { ok: false, message: "Password minimal 6 karakter." };
        const user: User = {
          id: "u-" + Date.now(),
          name: data.name,
          email: data.email,
          phone: data.phone,
          role: "operator",
          status: "active",
          createdAt: new Date().toISOString().slice(0, 10),
          lastLogin: new Date().toISOString().slice(0, 16).replace("T", " "),
        };
        set({ user, isAuthenticated: true });
        return { ok: true };
      },
      logout: () => set({ user: null, isAuthenticated: false, authView: "login" }),
    }),
    { name: "propertiku-auth" },
  ),
);
