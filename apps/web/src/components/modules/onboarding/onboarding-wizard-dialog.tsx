"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Store,
  Bot,
  Package,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Building2,
  Bus,
  ShoppingBag,
  Check,
} from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { useAppStore } from "@/lib/app-store";
import { toast } from "sonner";

interface OnboardingWizardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: {
    storeName?: string;
    category?: string;
    phone?: string;
    address?: string;
    agentName?: string;
    agentTone?: string;
    instructions?: string;
  };
  onSuccess?: () => void;
}

export function OnboardingWizardDialog({
  open,
  onOpenChange,
  initialData,
  onSuccess,
}: OnboardingWizardDialogProps) {
  const { user } = useAuthStore();
  const { setEnabledMenus, setView } = useAppStore();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    storeName: initialData?.storeName || "",
    category: initialData?.category || "general",
    phone: initialData?.phone || "",
    address: initialData?.address || "",
    agentName: initialData?.agentName || "Luna",
    agentTone: initialData?.agentTone || "Santai & Ramah (Kak, Sis, Bro)",
    instructions: initialData?.instructions || "",
  });

  const categories = [
    {
      id: "general",
      name: "UMKM / Ritel / Jasa",
      desc: "Toko baju, kuliner, online shop, retail, atau jasa profesional",
      icon: ShoppingBag,
      color: "emerald",
    },
    {
      id: "properti",
      name: "Developer Properti / Real Estate",
      desc: "Perumahan, kavling tanah, cluster, agen properti",
      icon: Building2,
      color: "blue",
    },
    {
      id: "transport",
      name: "Transportasi / Bus Pariwisata / Travel",
      desc: "PO Bus, agen travel, rental kendaraan, tiket perjalanan",
      icon: Bus,
      color: "purple",
    },
  ];

  const handleNext = () => {
    if (step === 1 && !form.storeName.trim()) {
      toast.error("Nama usaha/perusahaan wajib diisi");
      return;
    }
    setStep((s) => s + 1);
  };

  const handlePrev = () => setStep((s) => s - 1);

  const handleSubmit = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const res = await fetch(`/api/v1/tenant/${user.tenantId || user.id}/onboarding`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        const result = await res.json();
        const tenantData = result?.data || result;
        const newMenus = tenantData?.metadata?.enabledMenus || [
          "overview",
          "chatbot",
          "products",
          "knowledge",
          "crm",
          "followup",
          "settings",
        ];

        setEnabledMenus(newMenus);
        toast.success("Profil usaha dan asisten AI Anda berhasil disiapkan!");
        onOpenChange(false);
        if (onSuccess) onSuccess();
        setView("overview");
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.message || "Gagal menyimpan onboarding.");
      }
    } catch (e: any) {
      toast.error(e.message || "Terjadi kesalahan jaringan.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 gap-0 overflow-hidden rounded-2xl">
        {/* Header Visual */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-6 relative">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="secondary" className="bg-white/20 text-white border-0 text-[10px]">
                Langkah {step} dari 3
              </Badge>
              <Badge variant="outline" className="bg-emerald-500/30 text-emerald-100 border-emerald-400/40 text-[10px] gap-1">
                <Package className="h-3 w-3" /> Katalog Produk Siap Pakai
              </Badge>
            </div>
            <DialogTitle className="text-xl font-bold text-white tracking-tight">
              {step === 1 && "Profil & Bidang Perusahaan"}
              {step === 2 && "Karakter & Gaya Bicara Asisten AI"}
              {step === 3 && "Verifikasi & Konfirmasi Menu"}
            </DialogTitle>
            <DialogDescription className="text-emerald-100/90 text-xs">
              {step === 1 && "Pilih bidang usaha Anda. Menu Katalog Produk akan selalu otomatis disertakan."}
              {step === 2 && "Tentukan nama dan kepribadian bot WhatsApp Anda dalam menjawab pelanggan."}
              {step === 3 && "Tinjau ringkasan menu yang aktif sebelum masuk ke panel kerja utama."}
            </DialogDescription>
          </DialogHeader>

          {/* Step Indicator */}
          <div className="flex gap-1.5 mt-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                  step >= i ? "bg-white" : "bg-white/30"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Step Body */}
        <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
          {/* STEP 1: Profil & Bidang Bisnis */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Nama Usaha / Perusahaan <span className="text-rose-500">*</span></Label>
                <Input
                  placeholder="Contoh: CV Makmur Abadi / Zafi Property"
                  value={form.storeName}
                  onChange={(e) => setForm({ ...form, storeName: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Pilih Bidang Bisnis</Label>
                <div className="grid grid-cols-1 gap-2.5">
                  {categories.map((c) => {
                    const Icon = c.icon;
                    const isSelected = form.category === c.id;
                    return (
                      <div
                        key={c.id}
                        onClick={() => setForm({ ...form, category: c.id })}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition-all duration-200 flex items-start gap-3 ${
                          isSelected
                            ? "border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/30 ring-1 ring-emerald-500"
                            : "hover:bg-muted/50 border-border"
                        }`}
                      >
                        <div
                          className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                            isSelected
                              ? "bg-emerald-600 text-white"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-xs text-foreground">{c.name}</span>
                            {isSelected && <Check className="h-4 w-4 text-emerald-600" />}
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{c.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Notif Garansi Katalog Produk */}
              <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2 text-emerald-800 dark:text-emerald-300 text-xs">
                <Package className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>
                  <strong>Fitur bawaan:</strong> Menu <strong>Katalog Produk</strong> otomatis aktif untuk inventaris barang, kavling, maupun layanan Anda.
                </span>
              </div>
            </div>
          )}

          {/* STEP 2: Karakter Asisten AI */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Nama Asisten AI (Bot)</Label>
                  <Input
                    placeholder="Contoh: Luna, Dina, Maya"
                    value={form.agentName}
                    onChange={(e) => setForm({ ...form, agentName: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Gaya Bicara CS</Label>
                  <Select
                    value={form.agentTone}
                    onValueChange={(v) => setForm({ ...form, agentTone: v })}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="text-xs">
                      <SelectItem value="Santai & Ramah (Kak, Sis, Bro)">Santai & Ramah (Kak, Sis)</SelectItem>
                      <SelectItem value="Formal & Profesional (Bapak, Ibu)">Formal & Profesional (Bpk/Ibu)</SelectItem>
                      <SelectItem value="Ceria & Interaktif dengan Emoji 🤩">Ceria & Ber-Emoji 🤩</SelectItem>
                      <SelectItem value="Singkat, Padat & Solutif">Singkat, Padat & Solutif</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Nomor WhatsApp Operasional</Label>
                  <Input
                    placeholder="08123456789"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Alamat / Lokasi Kantor</Label>
                  <Input
                    placeholder="Kota / Alamat singkat usaha"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Instruksi Khusus untuk AI (Opsional)</Label>
                <Textarea
                  placeholder="Contoh: Selalu tawarkan jadwal survei lokasi / diskon promo di akhir percakapan."
                  value={form.instructions}
                  onChange={(e) => setForm({ ...form, instructions: e.target.value })}
                  className="text-xs min-h-[70px]"
                />
              </div>
            </div>
          )}

          {/* STEP 3: Konfirmasi Menu */}
          {step === 3 && (
            <div className="space-y-4 text-xs">
              <div className="p-3 rounded-xl border bg-muted/20 space-y-2">
                <div className="flex justify-between items-center py-1 border-b">
                  <span className="text-muted-foreground">Nama Usaha:</span>
                  <span className="font-semibold text-foreground">{form.storeName}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b">
                  <span className="text-muted-foreground">Kategori Usaha:</span>
                  <span className="font-semibold capitalize text-emerald-600">
                    {categories.find((c) => c.id === form.category)?.name}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-muted-foreground">Asisten AI:</span>
                  <span className="font-semibold text-foreground">{form.agentName} ({form.agentTone})</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="font-semibold text-foreground block">Daftar Modul & Fitur yang Diaktifkan:</span>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 text-[10px]">
                    ✓ Bot WhatsApp
                  </Badge>
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 text-[10px] font-bold">
                    ✓ Katalog Produk
                  </Badge>
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 text-[10px]">
                    ✓ Knowledge Base AI
                  </Badge>
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 text-[10px]">
                    ✓ Pelanggan (CRM)
                  </Badge>
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 text-[10px]">
                    ✓ Follow-Up Otomatis
                  </Badge>
                  {form.category === "properti" && (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 text-[10px]">
                      ✓ Siteplan & Kavling
                    </Badge>
                  )}
                  {form.category === "transport" && (
                    <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300 text-[10px]">
                      ✓ Denah Kursi Bus
                    </Badge>
                  )}
                  <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-300 text-[10px]">
                    ✓ Dashboard Analitik
                  </Badge>
                </div>
              </div>

              <div className="p-3 bg-muted/40 rounded-xl text-muted-foreground text-[11px] leading-relaxed">
                ℹ️ <strong>Catatan:</strong> Anda dapat menghubungkan nomor WhatsApp bot melalui menu <strong>Pengaturan</strong> atau memindai QR code kapan pun setelah masuk ke dashboard.
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <DialogFooter className="p-4 bg-muted/20 border-t flex items-center justify-between sm:justify-between">
          {step > 1 ? (
            <Button size="sm" variant="outline" onClick={handlePrev} disabled={loading} className="text-xs h-8">
              <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Kembali
            </Button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <Button size="sm" onClick={handleNext} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8">
              Lanjut <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 shadow-sm font-semibold"
            >
              {loading ? "Menyiapkan..." : "Selesai & Buka Dashboard"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
