"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, Lock, User, Phone } from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { AuthShell, PasswordInput } from "./auth-shell";

export function RegisterForm() {
  const { register, setAuthView } = useAuthStore();
  const { toast } = useToast();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", confirm: "" });
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      toast({ title: "Password tidak cocok", description: "Konfirmasi password harus sama.", variant: "destructive" });
      return;
    }
    setLoading(true);
    setTimeout(() => {
      const res = register({ name: form.name, email: form.email, phone: form.phone, password: form.password });
      setLoading(false);
      if (!res.ok) toast({ title: "Pendaftaran gagal", description: res.message, variant: "destructive" });
      else toast({ title: "Akun dibuat!", description: "Selamat datang di PropertiKu Agent." });
    }, 700);
  };

  return (
    <AuthShell
      title="Buat akun baru"
      subtitle="Daftar untuk mulai mengelola asisten properti AI Anda."
      footer={
        <>
          Sudah punya akun?{" "}
          <button onClick={() => setAuthView("login")} className="font-medium text-emerald-600 hover:underline">
            Masuk di sini
          </button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Nama Lengkap</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input id="name" value={form.name} onChange={set("name")} placeholder="Nama Anda" className="pl-9" required />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input id="email" type="email" value={form.email} onChange={set("email")} placeholder="email@perusahaan.id" className="pl-9" required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">No. WhatsApp</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input id="phone" value={form.phone} onChange={set("phone")} placeholder="0812xxxx" className="pl-9" required />
            </div>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <div className="pl-9">
              <PasswordInput id="password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} placeholder="Min. 6 karakter" autoComplete="new-password" />
            </div>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirm">Konfirmasi Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <div className="pl-9">
              <PasswordInput id="confirm" value={form.confirm} onChange={(v) => setForm({ ...form, confirm: v })} placeholder="Ulangi password" autoComplete="new-password" />
            </div>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <input id="terms" type="checkbox" className="h-4 w-4 mt-0.5 rounded border-input accent-emerald-600" required />
          <Label htmlFor="terms" className="text-xs font-normal cursor-pointer leading-relaxed text-muted-foreground">
            Saya menyetujui <span className="text-emerald-600 hover:underline cursor-pointer">Syarat & Ketentuan</span> serta{" "}
            <span className="text-emerald-600 hover:underline cursor-pointer">Kebijakan Privasi</span> PropertiKu Agent.
          </Label>
        </div>

        <Button type="submit" disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-10">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Daftar Sekarang"}
        </Button>
        <p className="text-[11px] text-muted-foreground text-center">
          Akun baru terdaftar dengan role <span className="font-medium">Operator</span>. Admin dapat mengubah role Anda setelahnya.
        </p>
      </form>
    </AuthShell>
  );
}
