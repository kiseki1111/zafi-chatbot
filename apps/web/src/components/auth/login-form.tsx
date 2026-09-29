"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, Lock } from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { AuthShell, PasswordInput } from "./auth-shell";

export function LoginForm() {
  const { login } = useAuthStore();
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
            <PasswordInput id="password" value={password} onChange={setPassword} placeholder="Masukkan kata sandi..." autoComplete="current-password" className="pl-9" />
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
    </AuthShell>
  );
}
