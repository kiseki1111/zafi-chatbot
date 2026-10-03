"use client";

import * as React from "react";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Bot, Save, Smartphone, ShieldCheck, Loader2, Plus, Trash2, QrCode, Palette, Wrench, Settings, Users, Sparkles, CheckCircle2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/lib/auth-store";
import { cn } from "@/lib/utils";
import { WarnaWebsiteTab } from "./color-tab";

export function SettingsPage({ defaultTab = "bot" }: { defaultTab?: string }) {
  const [activeTab, setActiveTab] = React.useState(defaultTab);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get("tab");
      if (tabParam === "koneksi" || tabParam === "bot") {
        setActiveTab(tabParam);
      }
    }
  }, []);

  return (
    <div className="space-y-4">
      {/* Header - Compact & Clean */}
      <div className="flex items-center gap-2.5 pb-1">
        <div className="h-8.5 w-8.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 grid place-items-center shrink-0">
          <Settings className="h-4.5 w-4.5" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Pengaturan</h1>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 h-10 p-1 bg-muted/60 rounded-xl border border-border/50 max-w-lg overflow-x-auto">
          <TabsTrigger value="bot" className="text-xs font-semibold gap-1.5 rounded-lg py-1.5 data-[state=active]:bg-card data-[state=active]:shadow-xs whitespace-nowrap">
            <Bot className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
            <span>Bot AI</span>
          </TabsTrigger>
          <TabsTrigger value="koneksi" className="text-xs font-semibold gap-1.5 rounded-lg py-1.5 data-[state=active]:bg-card data-[state=active]:shadow-xs whitespace-nowrap">
            <Smartphone className="h-3.5 w-3.5 shrink-0 text-blue-600" />
            <span>Koneksi WA</span>
          </TabsTrigger>
          <TabsTrigger value="warna" className="text-xs font-semibold gap-1.5 rounded-lg py-1.5 data-[state=active]:bg-card data-[state=active]:shadow-xs whitespace-nowrap">
            <Palette className="h-3.5 w-3.5 shrink-0 text-amber-600" />
            <span>Tampilan</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bot">
          <BotSettingsTab />
        </TabsContent>
        <TabsContent value="koneksi">
          <KoneksiWATab />
        </TabsContent>
        <TabsContent value="warna">
          <WarnaWebsiteTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function BotSettingsTab() {
  const { user } = useAuthStore();
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [showPrompt, setShowPrompt] = React.useState(false);

  // Quota & Billing state
  const [quota, setQuota] = React.useState<{
    plan: string;
    planName: string;
    planPrice: number;
    priceLabel: string;
    maxMau: number;
    mauUsed: number;
    mauPercent: number;
    isMauExceeded: boolean;
    maxAiResponses: number;
    aiResponsesUsed: number;
    aiResponsesPercent: number;
    isAiResponsesExceeded: boolean;
  } | null>(null);

  React.useEffect(() => {
    const fetchId =
      user?.tenantId ||
      (user?.id && !user.id.startsWith("u-") && user.role !== "superadmin"
        ? user.id
        : "demo");
    if (!fetchId) return;
    fetch(`/api/v1/tenant/clients/${fetchId}/quota`)
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => {
        const data = res?.data || res;
        if (data && data.plan) setQuota(data);
      })
      .catch(() => {});
  }, [user?.tenantId, user?.id, user?.role]);

  
  const [settings, setSettings] = React.useState({
    agentName: "Luna",
    phone: "",
    agentTone: "ramah dan profesional",
    operatingHours: "",
    address: "",
    greetingMsg: "",
    systemPrompt: "",
  });

  React.useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/v1/tenant/${user?.tenantId || user?.id || 'demo'}/dashboard`);
        const data = await res.json();
        if (data && data.tenant) {
          setSettings({
            agentName: data.tenant.agentName || "Luna",
            phone: data.tenant.phone || "",
            agentTone: data.tenant.agentTone || "ramah dan profesional",
            operatingHours: data.tenant.operatingHours || "",
            address: data.tenant.address || "",
            greetingMsg: data.tenant.greetingMsg || "",
            systemPrompt: data.tenant.systemPrompt || "",
          });
        }
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    }
    load();
  }, [user?.id]);

  async function handleSave() {
    setSaving(true);
    try {
      const targetId = user?.tenantId || user?.id || 'demo';
      await fetch(`/api/v1/tenant/${targetId}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings)
      });
      toast.success("Pengaturan asisten berhasil disimpan!");
    } catch(e) {
      toast.error("Gagal menyimpan pengaturan");
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <Card className="p-6 space-y-6">
        <div className="space-y-2 border-b pb-4">
          <Skeleton className="h-5 w-64" />
          <Skeleton className="h-3.5 w-96" />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-9 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-44" />
              <Skeleton className="h-9 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-9 w-full" />
            </div>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-48" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-5 w-24 rounded-full" />
              </div>
              <Skeleton className="h-24 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">

      {quota && (
        <Card className="p-3 bg-muted/20 border shadow-2xs">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-foreground">Paket Chatbot:</span>
                  <div className="inline-flex items-center rounded-md border px-2.5 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300">
                    {quota.planName}
                  </div>
                  <span className="text-muted-foreground text-[11px]">({quota.priceLabel})</span>
                </div>
                <p className="text-[10px] text-muted-foreground">Kuota nomor aktif (MAU) dan bubble respons AI WhatsApp</p>
              </div>
            </div>

            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full md:w-auto">
              {/* Kontak Unik MAU */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-medium text-muted-foreground flex items-center gap-1">
                    <Users className="h-3 w-3 text-blue-600" />
                    Kontak Unik (MAU)
                  </span>
                  <span className="font-semibold font-mono text-foreground">
                    {quota.mauUsed.toLocaleString()} / {quota.maxMau.toLocaleString()} ({quota.mauPercent}%)
                  </span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full transition-all duration-500 rounded-full",
                      quota.isMauExceeded
                        ? "bg-rose-600"
                        : quota.mauPercent >= 80
                          ? "bg-amber-500"
                          : "bg-blue-600"
                    )}
                    style={{ width: `${quota.mauPercent}%` }}
                  />
                </div>
              </div>

              {/* Respons AI */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-medium text-muted-foreground flex items-center gap-1">
                    <Bot className="h-3 w-3 text-emerald-600" />
                    Respons AI (Bubble Chat)
                  </span>
                  <span className="font-semibold font-mono text-foreground">
                    {quota.aiResponsesUsed.toLocaleString()} / {quota.maxAiResponses.toLocaleString()} ({quota.aiResponsesPercent}%)
                  </span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full transition-all duration-500 rounded-full",
                      quota.isAiResponsesExceeded
                        ? "bg-rose-600"
                        : quota.aiResponsesPercent >= 80
                          ? "bg-amber-500"
                          : "bg-emerald-600"
                    )}
                    style={{ width: `${quota.aiResponsesPercent}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      <Card>

          <CardHeader className="pb-3 border-b mb-4">
            <div>
              <CardTitle className="text-lg">Identitas Asisten Bot (Menjawab Pesan)</CardTitle>
              <CardDescription>Atur nama, gaya bahasa, dan perilaku asisten saat membalas pesan masuk.</CardDescription>
            </div>
          </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="agentName">Nama Panggilan Asisten</Label>
                <Input 
                  id="agentName"
                  value={settings.agentName} 
                  onChange={e => setSettings({...settings, agentName: e.target.value})} 
                />
                <p className="text-[10px] text-muted-foreground">Pengguna akan disapa oleh nama ini.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="agentPhone">Nomor WA Cadangan / Pengalihan (Admin)</Label>
                <Input 
                  id="agentPhone"
                  value={settings.phone} 
                  onChange={e => setSettings({...settings, phone: e.target.value})} 
                />
                <p className="text-[10px] text-muted-foreground">Jika asisten kebingungan, nomor ini akan diberikan ke pengguna.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="operatingHours">Jam Operasional</Label>
                <Input 
                  id="operatingHours"
                  placeholder="Contoh: Senin-Jumat 09:00-17:00"
                  value={settings.operatingHours} 
                  onChange={e => setSettings({...settings, operatingHours: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="storeAddress">Alamat Toko</Label>
                <Input 
                  id="storeAddress"
                  value={settings.address} 
                  onChange={e => setSettings({...settings, address: e.target.value})} 
                />
              </div>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="agentTone">Gaya Bahasa / Karakter Asisten</Label>
                  <span className="text-[10px] text-muted-foreground">Pilih cepat:</span>
                </div>
                {/* Preset Chips Gaya Bahasa untuk Admin Awam */}
                <div className="flex flex-wrap gap-1.5 pb-1">
                  {[
                    { label: "Sopan & Ramah", tone: "Sopan, ramah, hangat, menggunakan emotikon senyum dan bahasa Indonesia yang santun." },
                    { label: "Kasual & Santai", tone: "Kasual, santai, asik diajak ngobrol, seperti teman akrab tapi tetap menghargai pembeli." },
                    { label: "Formal Profesional", tone: "Formal, lugas, profesional, presisi, minim emotikon, cocok untuk institusi/korporat." },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setSettings({ ...settings, agentTone: preset.tone })}
                      className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full border transition-all",
                        settings.agentTone === preset.tone
                          ? "bg-emerald-50 border-emerald-500 text-emerald-700 font-medium dark:bg-emerald-950/40 dark:text-emerald-300"
                          : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground"
                      )}
                    >
                      + {preset.label}
                    </button>
                  ))}
                </div>
                <Textarea 
                  id="agentTone"
                  className="min-h-[100px] sm:min-h-[90px] text-sm" 
                  value={settings.agentTone} 
                  onChange={e => setSettings({...settings, agentTone: e.target.value})}
                />
                <p className="text-[10px] text-muted-foreground">Petunjuk cara asisten berbicara ke pengguna.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="greetingMsg">Sapaan Awal (Greeting)</Label>
                <Textarea 
                  id="greetingMsg"
                  className="min-h-[80px] sm:min-h-[60px] text-sm" 
                  placeholder="Contoh: Halo! Selamat datang di toko kami. Ada yang bisa dibantu?"
                  value={settings.greetingMsg} 
                  onChange={e => setSettings({...settings, greetingMsg: e.target.value})}
                />
                <p className="text-[10px] text-muted-foreground">Pesan sapaan pertama saat pelanggan menghubungi.</p>
              </div>
            </div>
          </div>

          {/* System Prompt Editor */}
          <div className="border-t pt-5 mt-2" />
          <div className="border rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowPrompt(!showPrompt)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/50 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Wrench className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>System Prompt Asisten</span>
              </span>
              <span className="text-xs text-muted-foreground">{showPrompt ? "Sembunyikan" : "Klik untuk edit"}</span>
            </button>
            {showPrompt && (
              <div className="px-4 pb-4 space-y-2 border-t">
                <p className="text-[11px] text-muted-foreground pt-3">
                  Ini adalah instruksi utama yang menentukan bagaimana AI berperilaku. Variabel otomatis: {"{agentName}"}, {"{tenantName}"}, {"{botTone}"}, {"{currentTime}"}, {"{operatingHours}"}, {"{storeAddress}"}, {"{fallbackContact}"}
                </p>
                <Textarea
                  className="min-h-[300px] text-xs font-mono leading-relaxed"
                  value={settings.systemPrompt}
                  onChange={e => setSettings({...settings, systemPrompt: e.target.value})}
                  placeholder="Kosongkan untuk menggunakan prompt default sistem..."
                />
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSettings({...settings, systemPrompt: ""})}
                  >
                    Reset ke Default
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-5 border-t mt-2">
            <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />} 
              {saving ? 'Menyimpan...' : 'Simpan Pengaturan Asisten'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function KoneksiWATab() {
  const { user } = useAuthStore();
  const [instances, setInstances] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [qrCodeData, setQrCodeData] = React.useState<{id: string, url: string} | null>(null);
  const [connectingSession, setConnectingSession] = React.useState<string | null>(null);
  const [connectedSession, setConnectedSession] = React.useState<{id: string, phone?: string, name?: string} | null>(null);

  // Add chatbot dialog
  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const [isAddLoading, setIsAddLoading] = React.useState(false);

  // Delete confirmation dialog
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [nameToDelete, setNameToDelete] = React.useState<string | null>(null);
  const [isDeleteLoading, setIsDeleteLoading] = React.useState(false);

  const fetchInstances = async () => {
    setLoading(true);
    try {
      // Filter per tenant untuk isolasi sesi antar akun
      const query = user?.tenantId && user.role !== 'superadmin' ? `?tenantId=${user.tenantId}` : '';
      const res = await fetch(`/api/v1/waha/instances/db${query}`);
      const data = await res.json();
      const list = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
      setInstances(list);
    } catch (e) {
      console.error(e);
      toast.error("Gagal mengambil data chatbot");
    }
    setLoading(false);
  };

  React.useEffect(() => {
    fetchInstances();
  }, [user?.tenantId, user?.role]);

  // Polling status koneksi WhatsApp saat QR aktif atau saat modal ditutup di latar belakang
  React.useEffect(() => {
    if (!connectingSession) return;

    let isMounted = true;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/v1/waha/instances/${connectingSession}/status`);
        if (!res.ok) return;
        const data = await res.json();
        const status = (data?.status || "").toUpperCase();

        if (status === "WORKING" || status === "CONNECTED") {
          clearInterval(interval);
          if (!isMounted) return;

          const phone = (data?.me?.id || data?.phone || "").replace(/@(c\.us|s\.whatsapp\.net)$/i, "");
          const profileName = data?.me?.pushName || data?.profileName || "";

          // Simpan data sesi yang berhasil connect
          setConnectedSession({
            id: connectingSession,
            phone,
            name: profileName,
          });

          // Jika modal SUDAH DITUTUP oleh user saat proses scan berlangsung:
          // Munculkan toast notifikasi keberhasilan di layar
          if (!qrCodeData) {
            toast.success("WhatsApp Berhasil Terhubung", {
              description: `Nomor WhatsApp ${phone ? "(+" + phone + ")" : ""} pada sesi "${connectingSession}" sudah aktif dan siap melayani pelanggan.`,
              duration: 7000,
            });
          }

          setConnectingSession(null);
          fetchInstances();
        }
      } catch (err) {
        // silent polling catch
      }
    }, 2500);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [connectingSession, qrCodeData]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setIsAddLoading(true);
    try {
      const res = await fetch('/api/v1/waha/instances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim().replace(/\s+/g, '-'),
          tenantId: user?.tenantId,
        })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Gagal');
      }
      toast.success("Chatbot baru berhasil dibuat!", {
        description: "Silakan klik Scan QR untuk menghubungkan nomor WhatsApp."
      });
      setIsAddOpen(false);
      setNewName("");
      fetchInstances();
    } catch (err: any) {
      toast.error("Gagal membuat chatbot: " + (err.message || 'Unknown error'));
    } finally {
      setIsAddLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!nameToDelete) return;
    setIsDeleteLoading(true);
    try {
      await fetch(`/api/v1/waha/instances/${nameToDelete}/logout`, { method: 'POST' }).catch(() => {});
      const query = user?.tenantId && user.role !== 'superadmin' ? `?tenantId=${user.tenantId}` : '';
      await fetch(`/api/v1/waha/instances/${nameToDelete}${query}`, { method: 'DELETE' });
      toast.success("Chatbot berhasil dihapus");
      setIsDeleteOpen(false);
      setNameToDelete(null);
      fetchInstances();
    } catch (e) {
      toast.error("Gagal menghapus chatbot");
    } finally {
      setIsDeleteLoading(false);
    }
  };

  const handleScanQR = async (sessionName: string) => {
    try {
      setConnectingSession(sessionName);
      setConnectedSession(null);
      const res = await fetch(`/api/v1/waha/instances/${sessionName}/qr`);
      if (res.ok) {
        const blob = await res.blob();
        setQrCodeData({ id: sessionName, url: URL.createObjectURL(blob) });
      } else {
        toast.info("QR Code belum tersedia. Sesi sedang dimulai, coba lagi dalam beberapa detik.");
      }
    } catch (e) {
      toast.error("Gagal mengambil QR Code");
    }
  };

  if (loading) {
    return (
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-4 border-b mb-4">
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-56" />
          </div>
          <Skeleton className="h-9 w-36" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="flex items-center justify-between p-4 border rounded-xl bg-white dark:bg-card">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-xl" />
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-4 w-16 rounded-full" />
                  </div>
                  <Skeleton className="h-3 w-36" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-20 rounded-md" />
                <Skeleton className="h-8 w-8 rounded-md" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="shadow-sm">

        <CardHeader className="flex flex-row items-center justify-between pb-4 border-b mb-4">
          <div>
            <CardTitle className="text-base">Chatbot WhatsApp</CardTitle>
            <CardDescription className="text-xs">Kelola nomor WhatsApp yang terhubung ke asisten Anda</CardDescription>
          </div>
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setIsAddOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Tambah Chatbot Baru
          </Button>
        </CardHeader>

        <CardContent className="space-y-3">
          {instances.length === 0 ? (
            <div className="text-center py-12 flex flex-col items-center gap-3">
              <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center">
                <Smartphone className="h-7 w-7 text-slate-400" />
              </div>
              <div>
                <p className="font-medium text-slate-700">Belum ada chatbot terdaftar</p>
                <p className="text-sm text-muted-foreground mt-1">Klik "Tambah Chatbot Baru" untuk menghubungkan nomor WhatsApp</p>
              </div>
            </div>
          ) : (
            instances.map((instance) => (
              <div key={instance.id} className="flex items-center justify-between p-4 border rounded-xl bg-white hover:bg-slate-50/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                      <Smartphone className="h-5 w-5" />
                    </div>
                    <div className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${instance.status === 'WORKING' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{instance.instanceName}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                        instance.status === 'WORKING'
                          ? 'bg-emerald-100 text-emerald-700'
                          : instance.status === 'STOPPED'
                          ? 'bg-slate-100 text-slate-600'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {instance.status === 'WORKING' ? 'Online' : instance.status === 'STOPPED' ? 'Offline' : (instance.status || 'Offline')}
                      </span>
                    </div>
                    {instance.phone && <p className="text-xs text-muted-foreground mt-0.5">{instance.phone}</p>}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {instance.status !== 'WORKING' && (
                    <Button
                      onClick={() => handleScanQR(instance.instanceName)}
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs border-slate-200 hover:bg-slate-50 font-medium"
                    >
                      <QrCode className="h-3 w-3 mr-1.5" /> Scan QR
                    </Button>
                  )}
                  <Button
                    onClick={() => { setNameToDelete(instance.instanceName); setIsDeleteOpen(true); }}
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 text-rose-500 border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Dialog: Tambah Chatbot */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleAdd}>
            <DialogHeader>
              <DialogTitle>Tambah Chatbot Baru</DialogTitle>
              <DialogDescription>
                Buat sesi chatbot baru. Setelah dibuat, scan QR Code menggunakan WhatsApp Anda.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="botName">Nama Chatbot (tanpa spasi)</Label>
                <Input
                  id="botName"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value.replace(/\s+/g, '-'))}
                  placeholder="Contoh: zafi-cs-1"
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">Nama ini digunakan sebagai ID sesi, tidak bisa diubah setelah dibuat.</p>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setIsAddOpen(false); setNewName(""); }} disabled={isAddLoading}>
                Batal
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={!newName.trim() || isAddLoading}>
                {isAddLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Buat Chatbot
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Hapus Chatbot */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Hapus Chatbot</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus chatbot <strong className="text-slate-800">{nameToDelete}</strong>?
              <br /><br />
              <span className="text-rose-600 font-medium">Bot ini akan berhenti membalas pesan secara permanen.</span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)} disabled={isDeleteLoading}>
              Batal
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleteLoading}>
              {isDeleteLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Ya, Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Scan QR Code & Status Terhubung */}
      <Dialog
        open={!!qrCodeData || !!connectedSession}
        onOpenChange={(open) => {
          if (!open) {
            setQrCodeData(null);
            setConnectedSession(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[400px]">
          {connectedSession ? (
            <div className="flex flex-col items-center justify-center py-5 text-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center animate-in zoom-in-75 duration-300">
                <CheckCircle2 className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="space-y-1.5">
                <DialogTitle className="text-lg font-bold text-foreground">WhatsApp Berhasil Terhubung!</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Nomor WhatsApp pada chatbot <span className="font-semibold text-emerald-600 dark:text-emerald-400">"{connectedSession.id}"</span> kini telah aktif.
                </DialogDescription>
                {connectedSession.phone && (
                  <div className="pt-1">
                    <span className="text-xs font-mono font-medium text-foreground bg-muted py-1 px-3 rounded-full border">
                      +{connectedSession.phone} {connectedSession.name ? `(${connectedSession.name})` : ''}
                    </span>
                  </div>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground/80 max-w-xs">
                Asisten bot AI Anda sudah siap membalas pertanyaan dan pesanan pelanggan secara otomatis 24/7.
              </p>
              <DialogFooter className="w-full sm:justify-center">
                <Button
                  onClick={() => {
                    setQrCodeData(null);
                    setConnectedSession(null);
                  }}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                >
                  Selesai &amp; Mulai Gunakan
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5 text-emerald-600" />
                  Scan QR Code WhatsApp
                </DialogTitle>
                <DialogDescription>
                  Hubungkan sesi <span className="font-semibold text-foreground">{qrCodeData?.id}</span> ke WhatsApp Anda.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col items-center justify-center py-4">
                {qrCodeData && (
                  <div className="relative p-2 bg-white rounded-xl shadow-md border-2 border-emerald-500">
                    <img src={qrCodeData.url} alt="QR Code" className="w-48 h-48 rounded-lg" />
                  </div>
                )}
                <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600" />
                  <span>Menunggu pemindaian ponsel...</span>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground text-center">
                Buka WhatsApp di ponsel &gt; Ketuk Perangkat Tertaut &gt; Tautkan Perangkat, lalu arahkan kamera ke kode QR di atas.
              </p>
              <DialogFooter className="flex-col sm:flex-col gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setQrCodeData(null);
                    toast.info("Pemindaian ditutup. Notifikasi akan muncul otomatis saat nomor terhubung.");
                  }}
                  className="w-full text-xs"
                >
                  Tutup Sementara (Cek di Latar Belakang)
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

