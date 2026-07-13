"use client";

import { useState, type ReactNode } from "react";
import { Building2, MessageCircle, ShieldCheck, TrendingUp, Users } from "lucide-react";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="min-h-screen w-full grid lg:grid-cols-2 bg-background">
      {/* Branding panel */}
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-gradient-to-br from-emerald-700 via-teal-700 to-emerald-900 p-12 text-white">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 20% 30%, white 1px, transparent 1px), radial-gradient(circle at 70% 60%, white 1px, transparent 1px)", backgroundSize: "48px 48px" }} />
        <div className="relative z-10 flex items-center gap-3">
          <div className="grid place-items-center h-11 w-11 rounded-xl bg-white/15 backdrop-blur ring-1 ring-white/25">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-lg font-bold leading-tight">PropertiKu Agent</p>
            <p className="text-xs text-emerald-100/80">AI Assistant · WhatsApp Waha</p>
          </div>
        </div>

        <div className="relative z-10 space-y-6 max-w-md">
          <h2 className="text-3xl font-bold leading-tight">
            Otomatiskan penjualan properti Anda lewat WhatsApp
          </h2>
          <p className="text-emerald-50/90 text-sm leading-relaxed">
            Chatbot cerdas yang membalas calon pembeli 24/7, mengelola leads, kampanye
            marketing, hingga closing — semua dalam satu dasbor.
          </p>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Feature icon={<MessageCircle className="h-4 w-4" />} title="Chatbot AI" desc="Auto-reply 24/7" />
            <Feature icon={<Users className="h-4 w-4" />} title="CRM Leads" desc="Kelola prospek" />
            <Feature icon={<TrendingUp className="h-4 w-4" />} title="Marketing" desc="Broadcast WA" />
            <Feature icon={<ShieldCheck className="h-4 w-4" />} title="RBAC" desc="6 level akses" />
          </div>
        </div>

        <p className="relative z-10 text-xs text-emerald-100/70">
          © 2025 PropertiKu Agent. Ditenagai oleh Waha WhatsApp API.
        </p>
      </div>

      {/* Form panel */}
      <div className="flex flex-col min-h-screen">
        <div className="lg:hidden flex items-center gap-2 p-6 border-b">
          <div className="grid place-items-center h-9 w-9 rounded-lg bg-emerald-600 text-white">
            <Building2 className="h-5 w-5" />
          </div>
          <p className="font-bold">PropertiKu Agent</p>
        </div>
        <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-md">
            <div className="mb-7">
              <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
              <p className="text-sm text-muted-foreground mt-1.5">{subtitle}</p>
            </div>
            {children}
            {footer && <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: ReactNode; title: string; desc: string }) {
  return (
    <div className="rounded-lg bg-white/10 backdrop-blur ring-1 ring-white/15 p-3">
      <div className="h-8 w-8 rounded-md bg-white/15 grid place-items-center mb-2">{icon}</div>
      <p className="text-sm font-semibold">{title}</p>
      <p className="text-xs text-emerald-100/70">{desc}</p>
    </div>
  );
}

export function PasswordInput({
  value,
  onChange,
  placeholder,
  id,
  autoComplete,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  id?: string;
  autoComplete?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 pr-10 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        tabIndex={-1}
        aria-label="Toggle password visibility"
      >
        {show ? "🙈" : "👁️"}
      </button>
    </div>
  );
}
