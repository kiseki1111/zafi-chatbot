"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, CheckCircle2, Loader2, Mail } from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { AuthShell } from "./auth-shell";

export function ForgotPasswordForm() {
  const { setAuthView } = useAuthStore();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSent(true);
      toast({ title: "Tautan reset terkirim", description: `Periksa email ${email} untuk instruksi lebih lanjut.` });
    }, 800);
  };

  return (
    <AuthShell
      title={sent ? "Cek email Anda" : "Lupa password?"}
      subtitle={sent ? "Tautan reset password telah dikirim ke alamat email Anda." : "Masukkan email terdaftar, kami akan kirim tautan reset password."}
      footer={
        <>
          Ingat password Anda?{" "}
          <button onClick={() => setAuthView("login")} className="font-medium text-emerald-600 hover:underline">
            Kembali ke login
          </button>
        </>
      }
    >
      {sent ? (
        <div className="space-y-5">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-900 p-4 flex gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-emerald-800 dark:text-emerald-300">Email terkirim</p>
              <p className="text-emerald-700 dark:text-emerald-400/80 mt-1">
                Kami telah mengirim tautan reset ke <span className="font-medium">{email}</span>. Tautan berlaku 30 menit.
              </p>
            </div>
          </div>
          <Button onClick={() => setAuthView("login")} variant="outline" className="w-full h-10">
            <ArrowLeft className="h-4 w-4" /> Kembali ke login
          </Button>
          <button
            onClick={() => setSent(false)}
            className="w-full text-xs text-muted-foreground hover:text-foreground hover:underline"
          >
            Tidak menerima email? Kirim ulang
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email Terdaftar</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@perusahaan.id"
                className="pl-9"
                required
              />
            </div>
          </div>
          <Button type="submit" disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-10">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Kirim Tautan Reset"}
          </Button>
          <button
            type="button"
            onClick={() => setAuthView("login")}
            className="w-full flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Kembali ke halaman login
          </button>
        </form>
      )}
    </AuthShell>
  );
}
