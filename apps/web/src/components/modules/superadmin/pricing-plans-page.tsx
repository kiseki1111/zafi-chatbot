"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Zap, Check, Pencil, Plus, RefreshCw, Save } from "lucide-react";

interface PlanTier {
  key: string;
  name: string;
  price: number;
  priceLabel: string;
  maxMau: number;
  maxAiResponses: number;
  desc?: string;
}

const DEFAULT_PLANS: PlanTier[] = [
  { key: "trial", name: "Free Trial", price: 0, priceLabel: "Gratis", maxMau: 10, maxAiResponses: 50, desc: "Evaluasi awal 14 hari" },
  { key: "pro", name: "Pro", price: 1500000, priceLabel: "Rp 1.500k/bln", maxMau: 2000, maxAiResponses: 15000, desc: "UMKM & Bisnis Berkembang" },
  { key: "business", name: "Business", price: 2500000, priceLabel: "Rp 2.500k/bln", maxMau: 8000, maxAiResponses: 50000, desc: "Perusahaan Menengah" },
  { key: "enterprise", name: "Enterprise", price: 5799000, priceLabel: "Rp 5.799k/bln", maxMau: 30000, maxAiResponses: 150000, desc: "Skala Korporat & Volume Tinggi" },
  { key: "custom", name: "Custom", price: 0, priceLabel: "Kustom", maxMau: 1000, maxAiResponses: 10000, desc: "Kustomisasi kuota khusus" },
];

export function PricingPlansPage() {
  const [plans, setPlans] = useState<PlanTier[]>(DEFAULT_PLANS);
  const [loading, setLoading] = useState(true);
  const [editingPlan, setEditingPlan] = useState<PlanTier | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/platform/config/pricing");
      const json = await res.json();
      const val = json?.data || json;
      if (Array.isArray(val) && val.length > 0) {
        setPlans(val);
      }
    } catch {
      // fallback to default
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;
    setSaving(true);
    try {
      const updated = plans.map((p) => (p.key === editingPlan.key ? editingPlan : p));
      await fetch("/api/v1/platform/config/pricing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: updated }),
      });
      setPlans(updated);
      toast.success(`Paket ${editingPlan.name} berhasil diperbarui`);
      setEditingPlan(null);
    } catch {
      toast.error("Gagal menyimpan perubahan paket");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Kelola Paket & Harga SaaS</h2>
          <p className="text-xs text-muted-foreground">
            Konfigurasi batas kuota MAU, kuota respons AI, dan harga langganan tiap paket
          </p>
        </div>
        <Button onClick={fetchPlans} variant="outline" size="sm" className="h-8 text-xs gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {plans.map((p) => (
          <Card key={p.key} className="p-5 flex flex-col justify-between hover:border-emerald-500 transition-colors">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base">{p.name}</h3>
                  <p className="text-[11px] text-muted-foreground">{p.desc || `Key: ${p.key}`}</p>
                </div>
                <Badge variant="outline" className="uppercase text-[10px] font-mono">
                  {p.key}
                </Badge>
              </div>

              <div className="pt-2 border-t space-y-1.5">
                <p className="text-2xl font-bold tracking-tight text-emerald-600">
                  {p.price > 0 ? `Rp ${p.price.toLocaleString("id-ID")}` : "Gratis / Kustom"}
                  <span className="text-xs font-normal text-muted-foreground">/bulan</span>
                </p>
              </div>

              <div className="space-y-1 text-xs pt-1">
                <div className="flex items-center justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">Maks. Pengguna (MAU)</span>
                  <span className="font-mono font-semibold">{p.maxMau.toLocaleString("id-ID")} kontak</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">Maks. Respons AI</span>
                  <span className="font-mono font-semibold">{p.maxAiResponses.toLocaleString("id-ID")} pesan</span>
                </div>
              </div>
            </div>

            <div className="pt-4 mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingPlan({ ...p })}
                className="w-full text-xs gap-1.5"
              >
                <Pencil className="h-3.5 w-3.5" /> Edit Paket
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Dialog Edit Paket */}
      <Dialog open={!!editingPlan} onOpenChange={(open) => !open && setEditingPlan(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <form onSubmit={handleSavePlan}>
            <DialogHeader>
              <DialogTitle>Edit Paket: {editingPlan?.name}</DialogTitle>
              <DialogDescription className="text-xs">
                Ubah batasan kuota dan harga untuk paket langganan ini.
              </DialogDescription>
            </DialogHeader>

            {editingPlan && (
              <div className="space-y-3 py-3 text-xs">
                <div className="space-y-1">
                  <Label>Nama Paket</Label>
                  <Input
                    value={editingPlan.name}
                    onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                    className="h-8 text-xs"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label>Harga (IDR per bulan)</Label>
                  <Input
                    type="number"
                    value={editingPlan.price}
                    onChange={(e) => setEditingPlan({ ...editingPlan, price: parseInt(e.target.value) || 0 })}
                    className="h-8 text-xs font-mono"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label>Maksimal MAU (Kontak Aktif)</Label>
                  <Input
                    type="number"
                    value={editingPlan.maxMau}
                    onChange={(e) => setEditingPlan({ ...editingPlan, maxMau: parseInt(e.target.value) || 0 })}
                    className="h-8 text-xs font-mono"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label>Maksimal Respons AI (Pesan)</Label>
                  <Input
                    type="number"
                    value={editingPlan.maxAiResponses}
                    onChange={(e) => setEditingPlan({ ...editingPlan, maxAiResponses: parseInt(e.target.value) || 0 })}
                    className="h-8 text-xs font-mono"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label>Deskripsi / Keterangan</Label>
                  <Input
                    value={editingPlan.desc || ""}
                    onChange={(e) => setEditingPlan({ ...editingPlan, desc: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" size="sm" onClick={() => setEditingPlan(null)}>
                Batal
              </Button>
              <Button type="submit" size="sm" disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <Save className="h-3.5 w-3.5 mr-1.5" /> {saving ? "Menyimpan..." : "Simpan Perubahan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
