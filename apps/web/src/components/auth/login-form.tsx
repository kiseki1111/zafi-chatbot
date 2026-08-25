"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Building2, Loader2, Mail, Lock } from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { ROLES, ROLE_THEME } from "@/lib/rbac";
import type { Role } from "@/lib/types";
import { AuthShell, PasswordInput } from "./auth-shell";
import { DEMO_ACCOUNTS } from "@/lib/mock-data";


export function LoginForm() {
  const { login, loginAs, setAuthView } = useAuthStore();
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

  const quick = (role: Role) => {
    setLoading(true);
    setTimeout(() => {
      loginAs(role);
      setLoading(false);
      toast({ title: "Login demo", description: `Masuk sebagai ${role}` });
    }, 300);
  };

  return (
    <AuthShell
      title="Masuk ke akun Anda"
      subtitle="Kelola asisten AI, knowledge base, dan pantau percakapan Anda."
      footer={
        <>
          Belum punya akun?{" "}
          <button onClick={() => setAuthView("register")} className="font-medium text-emerald-600 hover:underline">
            Daftar sekarang
          </button>
        </>
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
          <div className="mt-4">
            <button
              type="button"
              onClick={() => quick("owner")}
              disabled={loading}
              className="w-full rounded-lg border p-2.5 text-center transition-all hover:shadow-sm hover:-translate-y-0.5 disabled:opacity-50 bg-emerald-50 text-emerald-700 ring-emerald-200 ring-1"
            >
              <div className="text-sm font-bold capitalize">Login sebagai Admin</div>
            </button>
          </div>
      </div>
    </AuthShell>
  );
}
