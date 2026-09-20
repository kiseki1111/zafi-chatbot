"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Building2, Loader2, Mail, Lock } from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import type { Role } from "@/lib/types";
import { AuthShell, PasswordInput } from "./auth-shell";


export function LoginForm() {
  const { login, loginAsPreset } = useAuthStore();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await login(email, password);
    setLoading(false);
    if (!res.ok) {
      toast({ title: "Login gagal", description: res.message, variant: "destructive" });
    } else {
      toast({ title: "Selamat datang!", description: "Anda berhasil masuk." });
    }
  };

  const quickPreset = async (preset: "superadmin" | "zafi" | "bus") => {
    setLoading(true);
    let targetEmail = "";
    let targetPassword = "";

    if (preset === "superadmin") {
      targetEmail = "superadmin@propertiku.id";
      targetPassword = "SuperAdmin@123";
    } else if (preset === "zafi") {
      targetEmail = "zafi@properti.com";
      targetPassword = "Manager@123";
    } else {
      targetEmail = "manager@nusantarabus.com";
      targetPassword = "Manager@123";
    }

    setEmail(targetEmail);
    setPassword(targetPassword);

    const res = await login(targetEmail, targetPassword);
    setLoading(false);

    if (res.ok) {
      const label =
        preset === "superadmin"
          ? "Superadmin Platform"
          : preset === "zafi"
          ? "Zafi (Properti)"
          : "PO Nusantara (Bus)";
      toast({ title: "Login Berhasil", description: `Masuk sebagai ${label}` });
    } else {
      // Fallback jika database belum ada user
      loginAsPreset(preset);
      toast({ title: "Login Cepat", description: `Masuk sebagai mode demo` });
    }
  };

  return (
    <AuthShell
      title="Masuk ke akun Anda"
      subtitle="Kelola asisten AI, data pelanggan, dan pantau percakapan Anda."
      footer={
        <span className="text-xs text-muted-foreground">
          Akun dibuatkan oleh administrator sistem / manajemen perusahaan.
        </span>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@perusahaan.id"
              className="pl-9"
              autoComplete="email"
              required
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <button type="button" onClick={() => setAuthView("forgot")} className="text-xs text-emerald-600 hover:underline">
              Lupa password?
            </button>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10 pointer-events-none" />
            <PasswordInput id="password" value={password} onChange={setPassword} placeholder="••••••••" autoComplete="current-password" className="pl-9" />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input id="remember" type="checkbox" className="h-4 w-4 rounded border-input accent-emerald-600" defaultChecked />
          <Label htmlFor="remember" className="text-sm font-normal cursor-pointer">Ingat saya selama 30 hari</Label>
        </div>

        <Button type="submit" disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-10">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Masuk"}
        </Button>
      </form>



      <div className="mt-8">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Login cepat (Demo)</span>
          </div>
        </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => quickPreset("superadmin")}
              disabled={loading}
              className="w-full rounded-lg border p-2 text-center transition-all hover:shadow-sm hover:-translate-y-0.5 disabled:opacity-50 bg-rose-50 text-rose-800 ring-rose-200 ring-1"
            >
              <div className="text-xs font-bold">1. Super Admin</div>
              <div className="text-[9px] text-muted-foreground">Kelola Semua Klien</div>
            </button>
            <button
              type="button"
              onClick={() => quickPreset("zafi")}
              disabled={loading}
              className="w-full rounded-lg border p-2 text-center transition-all hover:shadow-sm hover:-translate-y-0.5 disabled:opacity-50 bg-emerald-50 text-emerald-800 ring-emerald-200 ring-1"
            >
              <div className="text-xs font-bold">2. Zafi (Properti)</div>
              <div className="text-[9px] text-muted-foreground">Siteplan Kaveling</div>
            </button>
            <button
              type="button"
              onClick={() => quickPreset("bus")}
              disabled={loading}
              className="w-full rounded-lg border p-2 text-center transition-all hover:shadow-sm hover:-translate-y-0.5 disabled:opacity-50 bg-blue-50 text-blue-800 ring-blue-200 ring-1"
            >
              <div className="text-xs font-bold">3. Nusantara Bus</div>
              <div className="text-[9px] text-muted-foreground">Denah 17 Kursi</div>
            </button>
          </div>
      </div>
    </AuthShell>
  );
}
