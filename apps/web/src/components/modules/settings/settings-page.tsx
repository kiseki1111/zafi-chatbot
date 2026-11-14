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
import { Bot, Save, Smartphone, ShieldCheck, ShieldAlert, Loader2, Plus, Trash2, QrCode, Palette, Wrench, Settings, Users, Sparkles, CheckCircle2, Compass, RefreshCw, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/lib/auth-store";
import { cn } from "@/lib/utils";
import { WarnaWebsiteTab } from "./color-tab";
import { OnboardingWizardDialog } from "@/components/modules/onboarding/onboarding-wizard-dialog";
import { useMenuGuide } from "@/lib/use-menu-guide";
import { MenuGuideBanner } from "@/components/dashboard/menu-guide-banner";

export function SettingsPage({ defaultTab = "bot_cs" }: { defaultTab?: string }) {
  const [activeTab, setActiveTab] = React.useState(defaultTab);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get("tab");
      // ponytail: terima juga tab lama (bot/koneksi/asisten_wa) agar link lama tetap valid
      const legacy: Record<string, string> = {
        bot: "bot_cs",
        koneksi: "bot_cs",
        asisten_wa: "bot_asisten",
      };
      const resolved = tabParam ? legacy[tabParam] || tabParam : null;
      if (resolved === "bot_cs" || resolved === "bot_asisten" || resolved === "warna") {
        setActiveTab(resolved);
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
        <TabsList className="grid w-full grid-cols-3 h-10 p-1 bg-muted/60 rounded-xl border border-border/50 max-w-2xl overflow-x-auto">
          <TabsTrigger value="bot_cs" className="text-xs font-semibold gap-1.5 rounded-lg py-1.5 data-[state=active]:bg-card data-[state=active]:shadow-xs whitespace-nowrap">
            <Bot className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
            <span>Bot CS</span>
          </TabsTrigger>
          <TabsTrigger value="bot_asisten" className="text-xs font-semibold gap-1.5 rounded-lg py-1.5 data-[state=active]:bg-card data-[state=active]:shadow-xs whitespace-nowrap">
            <QrCode className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
            <span>Bot Asisten</span>
          </TabsTrigger>
          <TabsTrigger value="warna" className="text-xs font-semibold gap-1.5 rounded-lg py-1.5 data-[state=active]:bg-card data-[state=active]:shadow-xs whitespace-nowrap">
            <Palette className="h-3.5 w-3.5 shrink-0 text-amber-600" />
            <span>Tampilan</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bot_cs" className="space-y-6">
          <BotSettingsTab />
          <KoneksiWATab />
        </TabsContent>
        <TabsContent value="bot_asisten">
          <KoneksiAsistenWATab />
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
  const [onboardingOpen, setOnboardingOpen] = React.useState(false);
  const [tenantInfo, setTenantInfo] = React.useState<any>(null);

  const { seen, markSeen, reset } = useMenuGuide("settings");

  // Quota & Billing state
  const [quota, setQuota] = React.useState<{
    plan: string;
    planName: string;
    planPrice: number;
    priceLabel: string;
    maxMau: number;
    mauUsed: number;
    mauPercent: number;
    softLimitMau?: number;
    isGracePeriod?: boolean;
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
        if (data && (data.plan !== undefined || data.planName)) setQuota(data);
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
        const fetchId = user?.tenantId || (user?.id?.startsWith('u-') ? 'demo' : user?.id) || 'demo';
        const res = await fetch(`/api/v1/tenant/${fetchId}/dashboard`);
        if (res.ok) {
          const json = await res.json();
          const data = json?.data || json;
          const tenant = data?.tenant;
          if (tenant) {
            setTenantInfo(tenant);
            setSettings({
              agentName: tenant.agentName || "Luna",
              phone: tenant.phone || "",
              agentTone: tenant.agentTone || "ramah dan profesional",
              operatingHours: tenant.operatingHours || "",
              address: tenant.address || "",
              greetingMsg: tenant.greetingMsg || "",
              systemPrompt: tenant.systemPrompt || "",
            });
          }
        }
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    }
    load();
  }, [user?.id, user?.tenantId]);

  async function handleSave() {
    setSaving(true);
    try {
      const targetId = user?.tenantId || (user?.id?.startsWith('u-') ? 'demo' : user?.id) || 'demo';
      const res = await fetch(`/api/v1/tenant/${targetId}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings)
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.message || "Gagal menyimpan pengaturan ke server");
      }
      toast.success("Pengaturan asisten berhasil disimpan!");
    } catch(e: any) {
      toast.error(e?.message || "Gagal menyimpan pengaturan");
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
      {!seen && (
        <MenuGuideBanner
          title="Pengaturan Bisnis & Asisten AI"
          description="Sesuaikan profil perusahaan, jam operasional, warna tema, serta gaya bahasa asisten AI saat membalas pesan WhatsApp pelanggan."
          actionLabel="Jalankan Panduan Onboarding"
          onAction={() => setOnboardingOpen(true)}
          onClose={markSeen}
        />
      )}

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
                  <div className="flex items-center gap-1.5 font-mono text-foreground font-semibold">
                    {quota.isGracePeriod && (
                      <span className="text-[9px] font-sans font-bold text-amber-700 bg-amber-100 dark:bg-amber-950 px-1 rounded border border-amber-300">
                        Tenggang 110%
                      </span>
                    )}
                    <span>
                      {quota.mauUsed.toLocaleString()} / {quota.maxMau.toLocaleString()} ({quota.mauPercent}%)
                    </span>
                  </div>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full transition-all duration-500 rounded-full",
                      quota.isMauExceeded
                        ? "bg-rose-600"
                        : quota.isGracePeriod
                          ? "bg-amber-500"
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
        <CardHeader className="pb-3 border-b mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-lg">Identitas Asisten Bot (Menjawab Pesan)</CardTitle>
            <CardDescription>Atur nama, gaya bahasa, dan perilaku asisten saat membalas pesan masuk.</CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setOnboardingOpen(true)}
            className="text-xs h-8 gap-1.5 self-start sm:self-auto border-emerald-600/30 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
          >
            <Compass className="h-3.5 w-3.5 text-emerald-600" /> Jalankan Panduan Onboarding
          </Button>
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

      <OnboardingWizardDialog
        open={onboardingOpen}
        onOpenChange={setOnboardingOpen}
        initialData={{
          storeName: tenantInfo?.name || "",
          category: tenantInfo?.category || "general",
          phone: settings.phone,
          address: settings.address,
          agentName: settings.agentName,
          agentTone: settings.agentTone,
          instructions: tenantInfo?.extraInfo || "",
        }}
        onSuccess={() => {
          // Refresh settings dari server
          const targetId = user?.tenantId || (user?.id?.startsWith('u-') ? 'demo' : user?.id) || 'demo';
          fetch(`/api/v1/tenant/${targetId}/dashboard`)
            .then(r => r.ok ? r.json() : null)
            .then(d => {
              const t = d?.data?.tenant || d?.tenant;
              if (t) {
                setTenantInfo(t);
                setSettings({
                  agentName: t.agentName || "Luna",
                  phone: t.phone || "",
                  agentTone: t.agentTone || "ramah dan profesional",
                  operatingHours: t.operatingHours || "",
                  address: t.address || "",
                  greetingMsg: t.greetingMsg || "",
                  systemPrompt: t.systemPrompt || "",
                });
              }
            });
        }}
      />
    </div>
  );
}

function KoneksiWATab() {
  const { user } = useAuthStore();
  const [instances, setInstances] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [qrCodeData, setQrCodeData] = React.useState<{id: string, url: string} | null>(null);
  const [qrSession, setQrSession] = React.useState<string | null>(null);
  const [qrLoading, setQrLoading] = React.useState(false);
  const [qrError, setQrError] = React.useState<string | null>(null);
  const [qrExpiresAt, setQrExpiresAt] = React.useState<number | null>(null);
  const [qrCountdown, setQrCountdown] = React.useState(0);
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
        if (res.status === 403) { clearInterval(interval); return; }
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

  // ponytail: QR WAHA butuh waktu boot, jadi poll beberapa kali hingga siap (bukan minta user klik 2x)
  const fetchQrWithRetry = async (sessionName: string, attempts = 15, delayMs = 1500) => {
    setQrLoading(true);
    setQrError(null);
    for (let i = 0; i < attempts; i++) {
      try {
        const res = await fetch(`/api/v1/waha/instances/${sessionName}/qr`);
        if (res.ok) {
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          setQrCodeData((prev) => {
            if (prev?.url) URL.revokeObjectURL(prev.url);
            return { id: sessionName, url };
          });
          setQrExpiresAt(Date.now() + 60_000);
          setQrLoading(false);
          return;
        }
      } catch {
        // teruskan retry
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    setQrLoading(false);
    setQrError("QR belum tersedia. Pastikan server WAHA aktif, lalu coba muat ulang.");
  };

  // ponytail: countdown QR 60 detik, otomatis minta QR baru saat kedaluwarsa
  React.useEffect(() => {
    if (!qrExpiresAt || !qrSession) return;
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((qrExpiresAt - Date.now()) / 1000));
      setQrCountdown(remaining);
      if (remaining === 0) {
        setQrExpiresAt(null);
        fetchQrWithRetry(qrSession, 5, 1200);
      }
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [qrExpiresAt, qrSession]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setIsAddLoading(true);
    try {
      const sessionName = newName.trim().replace(/\s+/g, '-').toLowerCase();
      const res = await fetch('/api/v1/waha/instances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: sessionName,
          tenantId: user?.tenantId,
        })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Gagal');
      }
      setIsAddOpen(false);
      setNewName("");
      fetchInstances();
      // ponytail: langsung buka modal QR dalam mode loading, QR diisi otomatis saat ready
      setConnectedSession(null);
      setQrCodeData(null);
      setQrExpiresAt(null);
      setQrError(null);
      setQrSession(sessionName);
      setConnectingSession(sessionName);
      fetchQrWithRetry(sessionName);
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

  const handleScanQR = (sessionName: string) => {
    setConnectingSession(sessionName);
    setConnectedSession(null);
    setQrCodeData(null);
    setQrExpiresAt(null);
    setQrError(null);
    setQrSession(sessionName);
    fetchQrWithRetry(sessionName);
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
        open={!!qrSession || !!connectedSession}
        onOpenChange={(open) => {
          if (!open) {
            setQrSession(null);
            setQrCodeData(null);
            setQrExpiresAt(null);
            setQrError(null);
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
                  Hubungkan sesi <span className="font-semibold text-foreground">{qrSession}</span> ke WhatsApp Anda.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col items-center justify-center py-4">
                {qrCodeData ? (
                  <div className="relative p-2 bg-white rounded-xl shadow-md border-2 border-emerald-500">
                    <img src={qrCodeData.url} alt="QR Code" className="w-48 h-48 rounded-lg" />
                  </div>
                ) : (
                  <div className="w-48 h-48 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 text-center px-3">
                    {qrLoading ? (
                      <>
                        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                        <span className="text-[11px] text-muted-foreground">Menyiapkan QR Code...</span>
                      </>
                    ) : (
                      <>
                        <QrCode className="h-6 w-6 text-muted-foreground/50" />
                        <span className="text-[11px] text-muted-foreground">{qrError || "QR belum tersedia"}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[11px]"
                          onClick={() => qrSession && fetchQrWithRetry(qrSession)}
                        >
                          Muat Ulang QR
                        </Button>
                      </>
                    )}
                  </div>
                )}
                <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
                  {qrCodeData && qrCountdown > 0 ? (
                    <>
                      <Clock className="h-3.5 w-3.5 text-emerald-600" />
                      <span>QR berlaku <strong className="text-foreground">{qrCountdown} detik</strong> lagi</span>
                    </>
                  ) : (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600" />
                      <span>{qrCodeData ? "Memuat ulang QR..." : "Menunggu QR siap..."}</span>
                    </>
                  )}
                </div>
                {qrCodeData && (
                  <p className="mt-1 text-[11px] text-muted-foreground">Sudah discan? Menunggu konfirmasi dari WhatsApp...</p>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground text-center">
                Buka WhatsApp di ponsel &gt; Ketuk Perangkat Tertaut &gt; Tautkan Perangkat, lalu arahkan kamera ke kode QR di atas.
              </p>
              <DialogFooter className="flex-col sm:flex-col gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setQrSession(null);
                    setQrCodeData(null);
                    setQrExpiresAt(null);
                    setQrError(null);
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

function KoneksiAsistenWATab() {
  const { user } = useAuthStore();
  const [instances, setInstances] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [qrCodeData, setQrCodeData] = React.useState<{ id: string; url: string } | null>(null);
  const [connectingSession, setConnectingSession] = React.useState<string | null>(null);
  const [connectedSession, setConnectedSession] = React.useState<{ id: string; phone?: string; name?: string } | null>(null);
  const [isCreating, setIsCreating] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const tenantShort = (user?.tenantId || user?.id || "demo").slice(0, 8);
  const assistantSessionName = `asisten-${tenantShort}`;

  const fetchInstances = async () => {
    setLoading(true);
    try {
      const query = user?.tenantId && user.role !== "superadmin" ? `?tenantId=${user.tenantId}` : "";
      const res = await fetch(`/api/v1/waha/instances/db${query}`);
      const data = await res.json();
      const list = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
      setInstances(list);
    } catch {
      toast.error("Gagal mengambil data sesi WhatsApp Asisten");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchInstances();
  }, [user?.tenantId, user?.role]);

  // Polling status saat QR discan
  React.useEffect(() => {
    if (!connectingSession) return;
    let isMounted = true;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/v1/waha/instances/${connectingSession}/status`);
        if (res.status === 403) { clearInterval(interval); return; }
        if (!res.ok) return;
        const data = await res.json();
        const status = (data?.status || "").toUpperCase();

        if (status === "WORKING" || status === "CONNECTED") {
          clearInterval(interval);
          if (!isMounted) return;

          const phone = (data?.me?.id || data?.phone || "").replace(/@(c\.us|s\.whatsapp\.net)$/i, "");
          const profileName = data?.me?.pushName || data?.profileName || "";

          setConnectedSession({
            id: connectingSession,
            phone,
            name: profileName,
          });

          if (!qrCodeData) {
            toast.success("WhatsApp Asisten Berhasil Terhubung!", {
              description: `Nomor +${phone} siap melayani pertanyaan internal staf (cuti, slip gaji, kas & invoice).`,
              duration: 7000,
            });
          }

          setConnectingSession(null);
          fetchInstances();
        }
      } catch {}
    }, 2500);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [connectingSession, qrCodeData]);

  // Sesi asisten yang sudah ada
  const assistantInstance = instances.find(
    (i) => i.instanceName === assistantSessionName || i.instanceName.startsWith("asisten-")
  );

  const handleStartConnect = async () => {
    setIsCreating(true);
    try {
      // 1. Buat sesi jika belum ada (backend memakai field `name`)
      if (!assistantInstance) {
        await fetch("/api/v1/waha/instances", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: assistantSessionName,
            tenantId: user?.tenantId,
          }),
        });
      }

      // 2. Minta QR code (endpoint mengembalikan PNG, bukan JSON)
      const targetName = assistantInstance ? assistantInstance.instanceName : assistantSessionName;
      const qrRes = await fetch(`/api/v1/waha/instances/${targetName}/qr`);

      if (qrRes.ok) {
        const blob = await qrRes.blob();
        setQrCodeData({ id: targetName, url: URL.createObjectURL(blob) });
        setConnectingSession(targetName);
      } else {
        toast.info("Sesi sedang booting, silakan klik scan ulang dalam beberapa detik.");
      }
      fetchInstances();
    } catch {
      toast.error("Gagal memulai koneksi WhatsApp Asisten");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDisconnect = async () => {
    if (!assistantInstance) return;
    setIsDeleting(true);
    try {
      await fetch(`/api/v1/waha/instances/${assistantInstance.instanceName}/logout`, { method: "POST" }).catch(() => {});
      const query = user?.tenantId ? `?tenantId=${user.tenantId}` : "";
      await fetch(`/api/v1/waha/instances/${assistantInstance.instanceName}${query}`, { method: "DELETE" });
      toast.success("Nomor WhatsApp Asisten berhasil diputuskan.");
      fetchInstances();
    } catch {
      toast.error("Gagal memutuskan sesi WhatsApp");
    } finally {
      setIsDeleting(false);
    }
  };

  const isOnline = assistantInstance && (assistantInstance.status === "WORKING" || assistantInstance.status === "CONNECTED");

  return (
    <div className="space-y-4">
      <Card className="border border-border/80 shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-base flex items-center gap-2">
                <QrCode className="h-5 w-5 text-emerald-600" />
                Nomor WhatsApp Khusus Asisten HR & Accounting
              </CardTitle>
              <CardDescription className="text-xs">
                Hubungkan nomor WhatsApp khusus helpdesk internal. Karyawan dapat bertanya langsung via chat WhatsApp pribadi mereka.
              </CardDescription>
            </div>
            {isOnline ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Asisten Online
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-muted text-muted-foreground border border-border">
                Belum Terhubung
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-xs">
          {loading ? (
            <div className="py-6 flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
              <span>Memeriksa status sesi WhatsApp...</span>
            </div>
          ) : isOnline ? (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-muted-foreground">Nomor WhatsApp Terhubung:</p>
                  <p className="text-base font-bold font-mono text-foreground mt-0.5">
                    +{assistantInstance.phone || "Nomor Aktif"} {assistantInstance.profileName ? `(${assistantInstance.profileName})` : ""}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Nama Sesi: <code className="font-mono bg-muted px-1 rounded">{assistantInstance.instanceName}</code>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
                    onClick={handleDisconnect}
                    disabled={isDeleting}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    Putuskan Nomor
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border/80 p-6 flex flex-col items-center justify-center text-center space-y-3 bg-muted/20">
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <QrCode className="h-6 w-6" />
              </div>
              <div className="max-w-md space-y-1">
                <p className="font-semibold text-foreground text-sm">Nomor WhatsApp Asisten Belum Dihubungkan</p>
                <p className="text-xs text-muted-foreground">
                  Klik tombol di bawah untuk menampilkan QR Code WhatsApp, lalu scan menggunakan ponsel WhatsApp resmi asisten internal kantor.
                </p>
              </div>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-medium"
                onClick={handleStartConnect}
                disabled={isCreating}
              >
                {isCreating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <QrCode className="h-3.5 w-3.5" />}
                Tampilkan QR Code WhatsApp Asisten
              </Button>
            </div>
          )}

          {/* Info Keamanan & Proteksi Whitelist Karyawan */}
          <div className="rounded-lg bg-blue-500/5 border border-blue-500/20 p-3.5 space-y-1.5">
            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 font-semibold text-xs">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              Proteksi Whitelist Nomor Karyawan
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Asisten AI hanya akan melayani query dari nomor ponsel yang sudah terdaftar di menu{" "}
              <strong className="text-foreground">Karyawan & Akses</strong>. Pesan dari nomor yang tidak terdaftar akan otomatis ditolak demi keamanan data gaji dan finansial perusahaan.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Dialog QR Code Asisten */}
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
                <DialogTitle className="text-lg font-bold text-foreground">WhatsApp Asisten Terhubung!</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Nomor WhatsApp asisten kini telah aktif dan siap melayani karyawan.
                </DialogDescription>
                {connectedSession.phone && (
                  <div className="pt-1">
                    <span className="text-xs font-mono font-medium text-foreground bg-muted py-1 px-3 rounded-full border">
                      +{connectedSession.phone} {connectedSession.name ? `(${connectedSession.name})` : ""}
                    </span>
                  </div>
                )}
              </div>
              <DialogFooter className="w-full sm:justify-center">
                <Button
                  onClick={() => {
                    setQrCodeData(null);
                    setConnectedSession(null);
                  }}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                >
                  Selesai
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <QrCode className="h-5 w-5 text-emerald-600" />
                  Scan QR Code WhatsApp Asisten
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Buka WhatsApp di ponsel &gt; Ketuk Perangkat Tertaut &gt; Tautkan Perangkat.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col items-center justify-center py-4">
                {qrCodeData && (
                  <div className="relative p-2 bg-white rounded-xl shadow-md border-2 border-emerald-500">
                    <img src={qrCodeData.url} alt="QR Code Asisten" className="w-48 h-48 rounded-lg" />
                  </div>
                )}
                <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600" />
                  <span>Menunggu pemindaian ponsel...</span>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setQrCodeData(null)}
                  className="w-full text-xs"
                >
                  Tutup
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

