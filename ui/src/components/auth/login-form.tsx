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
import { GoogleLogin } from '@react-oauth/google';

export function LoginForm() {
  const { login, loginAs, googleLogin, setAuthView } = useAuthStore();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      const res = login(email, password);
      setLoading(false);
      if (!res.ok) {
        toast({ title: "Login gagal", description: res.message, variant: "destructive" });
      } else {
        toast({ title: "Selamat datang!", description: "Anda berhasil masuk." });
      }
    }, 600);
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
      subtitle="Kelola chatbot, leads, dan transaksi properti Anda dalam satu tempat."
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
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <div className="pl-9">
              <PasswordInput id="password" value={password} onChange={setPassword} placeholder="••••••••" autoComplete="current-password" />
            </div>
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

      <div className="mt-6">
        <div className="relative mb-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Atau masuk dengan</span>
          </div>
        </div>

        <div className="flex justify-center">
          <GoogleLogin
            onSuccess={async (credentialResponse) => {
              if (credentialResponse.credential) {
                setLoading(true);
                const res = await googleLogin(credentialResponse.credential);
                setLoading(false);
                if (!res.ok) {
                  toast({ title: "Login Google gagal", description: res.message, variant: "destructive" });
                } else {
                  toast({ title: "Berhasil", description: "Login Google sukses!" });
                }
              }
            }}
            onError={() => {
              toast({ title: "Gagal", description: "Login Google dibatalkan atau gagal.", variant: "destructive" });
            }}
            useOneTap
            shape="rectangular"
            theme="outline"
            text="signin_with"
            size="large"
          />
        </div>
      </div>

      <div className="mt-8">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Login cepat (Demo)</span>
          </div>
        </div>
        
          <div className="grid grid-cols-3 gap-2 mt-4">
            {ROLES.map((r) => {
              const theme = ROLE_THEME[r] || { bg: "bg-muted", ring: "ring-muted", color: "text-foreground" };
              return (
                <button
                  key={r}
                  onClick={() => quick(r)}
                  disabled={loading}
                  className={`rounded-lg border p-2.5 text-center transition-all hover:shadow-sm hover:-translate-y-0.5 disabled:opacity-50 ${theme.bg} ${theme.ring} ring-1`}
                >
                  <div className={`text-xs font-bold capitalize ${theme.color}`}>{r}</div>
                </button>
              );
            })}
          </div>
        
        <p className="text-[11px] text-muted-foreground mt-4 text-center">
          Atau gunakan sembarang email & password untuk login sebagai Operator
        </p>
      </div>
    </AuthShell>
  );
}
