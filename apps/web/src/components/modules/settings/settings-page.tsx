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
import { Bot, Save, Smartphone, ShieldCheck, Loader2, Plus, Trash2, QrCode, Palette, Wrench, CheckCircle2, RefreshCw, LogOut, Lock } from "lucide-react";
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
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-green-700 p-7 text-white shadow-xl">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%23ffffff%22 fill-opacity=%220.05%22%3E%3Cpath d=%22M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]" />
        <div className="relative flex items-center gap-4">
          <div className="rounded-xl bg-white/20 p-3 backdrop-blur-sm">
            <ShieldCheck className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Pengaturan</h1>
            <p className="mt-0.5 text-sm text-emerald-100">
              Kelola identitas Asisten Otomatis dan koneksi WhatsApp.
            </p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 md:w-[600px]">
          <TabsTrigger value="bot">
            <Bot className="h-4 w-4 mr-1.5" /> Identitas Asisten
          </TabsTrigger>
          <TabsTrigger value="koneksi">
            <Smartphone className="h-4 w-4 mr-1.5" /> Koneksi WA
          </TabsTrigger>
          <TabsTrigger value="warna">
            <Palette className="h-4 w-4 mr-1.5" /> Warna Website
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
    return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-emerald-600" /></div>;
  }

  return (
    <div className="space-y-6">
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
              <div className="space-y-1.5">
                <Label htmlFor="agentName">Nama Panggilan Asisten</Label>
                <Input 
                  id="agentName"
                  value={settings.agentName} 
                  onChange={e => setSettings({...settings, agentName: e.target.value})} 
                />
                <p className="text-[10px] text-muted-foreground">Pengguna akan disapa oleh nama ini.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="agentPhone">Nomor WA Cadangan / Pengalihan (Admin)</Label>
                <Input 
                  id="agentPhone"
                  value={settings.phone} 
                  onChange={e => setSettings({...settings, phone: e.target.value})} 
                />
                <p className="text-[10px] text-muted-foreground">Jika asisten kebingungan, nomor ini akan diberikan ke pengguna.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="operatingHours">Jam Operasional</Label>
                <Input 
                  id="operatingHours"
                  placeholder="Contoh: Senin-Jumat 09:00-17:00"
                  value={settings.operatingHours} 
                  onChange={e => setSettings({...settings, operatingHours: e.target.value})} 
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="storeAddress">Alamat Toko</Label>
                <Input 
                  id="storeAddress"
                  value={settings.address} 
                  onChange={e => setSettings({...settings, address: e.target.value})} 
                />
              </div>
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5">
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
                  className="min-h-[90px] text-sm" 
                  value={settings.agentTone} 
                  onChange={e => setSettings({...settings, agentTone: e.target.value})}
                />
                <p className="text-[10px] text-muted-foreground">Petunjuk cara asisten berbicara ke pengguna.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="greetingMsg">Sapaan Awal (Greeting)</Label>
                <Textarea 
                  id="greetingMsg"
                  className="min-h-[60px] text-sm" 
                  placeholder="Contoh: Halo! Selamat datang di toko kami. Ada yang bisa dibantu?"
                  value={settings.greetingMsg} 
                  onChange={e => setSettings({...settings, greetingMsg: e.target.value})}
                />
                <p className="text-[10px] text-muted-foreground">Pesan sapaan pertama saat pelanggan menghubungi.</p>
              </div>
            </div>
          </div>

          {/* System Prompt Editor */}
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

          <div className="flex justify-end pt-4 border-t">
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

  // Add chatbot dialog
  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const [isAddLoading, setIsAddLoading] = React.useState(false);

  // Delete confirmation dialog
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [nameToDelete, setNameToDelete] = React.useState<string | null>(null);
  const [isDeleteLoading, setIsDeleteLoading] = React.useState(false);

  // Dedicated personal test session state
  const TEST_SESSION_NAME = "test-video-native";
  const [testSessionStatus, setTestSessionStatus] = React.useState<string>("STOPPED");
  const [testSessionQr, setTestSessionQr] = React.useState<string | null>(null);
  const [isTestSessionLoading, setIsTestSessionLoading] = React.useState(false);
  const [isRefreshingQr, setIsRefreshingQr] = React.useState(false);
  const [isPollingStatus, setIsPollingStatus] = React.useState(false);

  // Test video dialog
  const [isVideoModalOpen, setIsVideoModalOpen] = React.useState(false);
  const [videoUrlInput, setVideoUrlInput] = React.useState("");
  const [videoLoading, setVideoLoading] = React.useState(false);
  const [videoResult, setVideoResult] = React.useState<any>(null);

  const checkTestSessionStatus = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/waha/instances/${TEST_SESSION_NAME}/status`);
      if (res.ok) {
        const json = await res.json();
        const data = json?.data || json;
        const status = data?.status || "STOPPED";
        setTestSessionStatus(status);
        if (status === "WORKING") {
          setTestSessionQr(null);
        }
        return status;
      }
    } catch {
      // ignore
    }
    return "STOPPED";
  }, []);

  const fetchTestQr = async () => {
    try {
      const res = await fetch(`/api/v1/waha/instances/${TEST_SESSION_NAME}/qr?t=${Date.now()}`);
      if (res.ok) {
        const blob = await res.blob();
        setTestSessionQr(URL.createObjectURL(blob));
        return true;
      }
    } catch {
      // ignore
    }
    return false;
  };

  const handleRefreshQr = async () => {
    setIsRefreshingQr(true);
    try {
      toast.info("Membuat QR Code baru di WAHA...");
      await fetch(`/api/v1/waha/instances/${TEST_SESSION_NAME}/restart`, { method: "POST" });
      setTimeout(async () => {
        const ok = await fetchTestQr();
        if (ok) {
          toast.success("QR Code baru berhasil dibuat!");
        } else {
          toast.info("Sedang menyiapkan QR, silakan klik refresh sekali lagi.");
        }
        setIsRefreshingQr(false);
      }, 2500);
    } catch (e: any) {
      toast.error("Gagal refresh QR: " + e.message);
      setIsRefreshingQr(false);
    }
  };

  const handleStartPersonalWa = async () => {
    setIsTestSessionLoading(true);
    try {
      await fetch('/api/v1/waha/instances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: TEST_SESSION_NAME })
      });
      toast.info("Menyiapkan sesi login WhatsApp pribadi...");
      setTimeout(async () => {
        await fetchTestQr();
        setIsTestSessionLoading(false);
        setIsPollingStatus(true);
      }, 1500);
    } catch (e: any) {
      toast.error("Gagal memulai sesi pengujian: " + e.message);
      setIsTestSessionLoading(false);
    }
  };

  const handleLogoutPersonalWa = async () => {
    setIsTestSessionLoading(true);
    try {
      await fetch(`/api/v1/waha/instances/${TEST_SESSION_NAME}/logout`, { method: 'POST' });
      setTestSessionStatus("STOPPED");
      setTestSessionQr(null);
      setIsPollingStatus(false);
      toast.success("WhatsApp Pribadi berhasil diputuskan");
    } catch (e: any) {
      toast.error("Gagal memutuskan sesi: " + e.message);
    } finally {
      setIsTestSessionLoading(false);
    }
  };

  // Check status when modal is opened, and only poll when user is waiting for QR/connecting
  React.useEffect(() => {
    if (!isVideoModalOpen) {
      setIsPollingStatus(false);
      return;
    }

    checkTestSessionStatus();

    if (!isPollingStatus) return;

    const timer = setInterval(async () => {
      const st = await checkTestSessionStatus();
      if (st === "WORKING") {
        setIsPollingStatus(false);
        toast.success("WhatsApp Pribadi Terhubung!");
      } else if (st === "SCAN_QR_CODE" && !testSessionQr) {
        fetchTestQr();
      }
    }, 3000);

    return () => {
      clearInterval(timer);
    };
  }, [isVideoModalOpen, isPollingStatus, checkTestSessionStatus, testSessionQr]);

  const handleSendTestVideo = async () => {
    if (testSessionStatus !== "WORKING") {
      toast.error("Hubungkan akun WhatsApp pribadi Anda terlebih dahulu (Scan QR)");
      return;
    }
    setVideoLoading(true);
    setVideoResult(null);
    try {
      const res = await fetch(`/api/v1/waha/instances/${TEST_SESSION_NAME}/send-test-video`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetPhone: "6281257456315",
          videoUrl: videoUrlInput.trim() || undefined,
        }),
      });
      const data = await res.json();
      setVideoResult(data);
      if (data.success) {
        toast.success("Video native berhasil dikirim ke +62 812-5745-6315");
      } else {
        toast.error("Gagal mengirim video: " + (data.message || "Unknown error"));
      }
    } catch (e: any) {
      toast.error("Kesalahan jaringan: " + e.message);
    } finally {
      setVideoLoading(false);
    }
  };

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
    return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-emerald-600" /></div>;
  }

  return (
    <>
      <Card className="shadow-sm">

        <CardHeader className="flex flex-row items-center justify-between pb-4 border-b mb-4">
          <div>
            <CardTitle className="text-base">Chatbot WhatsApp</CardTitle>
            <CardDescription className="text-xs">Kelola nomor WhatsApp yang terhubung ke asisten Anda</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs gap-1.5 border-emerald-600 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
              onClick={() => setIsVideoModalOpen(true)}
            >
              🎬 Uji Kirim Video Native
            </Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setIsAddOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> Tambah Chatbot Baru
            </Button>
          </div>
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

      {/* Dialog: Scan QR Code */}
      <Dialog open={!!qrCodeData} onOpenChange={(open) => !open && setQrCodeData(null)}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle>Scan QR Code</DialogTitle>
            <DialogDescription>
              Chatbot: <span className="font-medium text-slate-700">{qrCodeData?.id}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-4">
            {qrCodeData && (
              <img src={qrCodeData.url} alt="QR Code" className="w-48 h-48 border-4 border-emerald-500 rounded-lg shadow-lg" />
            )}
          </div>
          <p className="text-xs text-muted-foreground text-center">Buka WhatsApp di ponsel Anda dan scan QR code ini</p>
          <DialogFooter>
            <Button onClick={() => setQrCodeData(null)} className="w-full bg-slate-800 text-white">
              Selesai
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Uji Coba Kirim Video Native (Akun Pribadi & No-Bot Response) */}
      <Dialog open={isVideoModalOpen} onOpenChange={setIsVideoModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>🎬 Uji Kirim Video Native WAHA</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Sesi terisolasi khusus akun WhatsApp pribadi Anda. <strong>100% Silent (tanpa bot AI, tanpa balas chat, tanpa simpan pesan)</strong>. Hanya dapat mengirim video ke nomor uji coba.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* 1. Status Login WA Pribadi */}
            <div className="rounded-lg border p-3 bg-slate-50 dark:bg-slate-900/50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs text-slate-700 dark:text-slate-200">
                  Akun WhatsApp Penguji
                </span>
                {testSessionStatus === "WORKING" ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                    <CheckCircle2 className="h-3 w-3" /> Terhubung
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                    Belum Terhubung
                  </span>
                )}
              </div>

              {testSessionStatus === "WORKING" ? (
                <div className="flex items-center justify-between pt-1">
                  <div className="text-[11px] text-muted-foreground space-y-0.5">
                    <p className="text-emerald-600 dark:text-emerald-400 font-medium">
                      ✓ Siap mengirim video native
                    </p>
                    <p className="text-[10px]">Sesi: <code>{TEST_SESSION_NAME}</code> (Protected & Silent)</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLogoutPersonalWa}
                    disabled={isTestSessionLoading}
                    className="h-7 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 gap-1"
                  >
                    <LogOut className="h-3 w-3" /> Putuskan
                  </Button>
                </div>
              ) : (
                <div className="space-y-3 pt-1">
                  {testSessionQr ? (
                    <div className="flex flex-col items-center justify-center p-3 bg-white dark:bg-slate-950 rounded-md border space-y-2">
                      <img
                        src={testSessionQr}
                        alt="Scan QR WhatsApp Pribadi"
                        className="w-40 h-40 border-2 border-emerald-500 rounded-lg shadow-sm"
                      />
                      <div className="text-center space-y-1">
                        <p className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
                          Buka WhatsApp &gt; Perangkat Tertaut, lalu scan QR ini
                        </p>
                        <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                          <Loader2 className="h-3 w-3 animate-spin text-emerald-600" />
                          Menunggu Anda melakukan scan...
                        </p>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleRefreshQr}
                          disabled={isRefreshingQr}
                          className="h-7 text-[11px] gap-1"
                        >
                          <RefreshCw className={cn("h-3 w-3", isRefreshingQr && "animate-spin")} />
                          {isRefreshingQr ? "Memperbarui QR..." : "Refresh QR"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
                      <p className="text-[11px] text-muted-foreground">
                        Login akun pribadi Anda untuk menguji coba native player video tanpa mengganggu chatbot operasional.
                      </p>
                      <Button
                        size="sm"
                        onClick={handleStartPersonalWa}
                        disabled={isTestSessionLoading}
                        className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 text-xs gap-1.5"
                      >
                        {isTestSessionLoading ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <QrCode className="h-3.5 w-3.5" />
                        )}
                        {isTestSessionLoading ? "Menyiapkan..." : "Scan QR WhatsApp"}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 2. Nomor WhatsApp Tujuan (Locked) */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="font-semibold text-xs">Nomor WhatsApp Tujuan</Label>
                <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                  <Lock className="h-2.5 w-2.5" /> Terkunci (+62 812-5745-6315)
                </span>
              </div>
              <Input
                value="+62 812-5745-6315"
                disabled
                className="h-8 text-xs font-mono bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 cursor-not-allowed font-semibold"
              />
              <p className="text-[10px] text-muted-foreground">
                Satu-satunya tindakan yang diizinkan pada sesi ini adalah mengirim uji video ke nomor Anda.
              </p>
            </div>

            {/* 3. URL Video Opsional */}
            <div className="space-y-1">
              <Label className="font-semibold text-xs">URL Video / File MP4 (Opsional)</Label>
              <Input
                value={videoUrlInput}
                onChange={(e) => setVideoUrlInput(e.target.value)}
                placeholder="Kosongkan untuk memakai video lokal VPS atau sample mp4"
                className="h-8 text-xs"
              />
              <p className="text-[10px] text-muted-foreground">
                Default: otomatis mencari file MP4 di folder <code>uploads/</code> atau sample video H.264 Google Cloud.
              </p>
            </div>

            {/* 4. Hasil Pengiriman */}
            {videoResult && (
              <div className={cn(
                "p-3 rounded-lg border text-[11px] font-mono space-y-1",
                videoResult.success
                  ? "bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200"
                  : "bg-rose-50 border-rose-200 text-rose-900 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-200"
              )}>
                <p className="font-bold">
                  {videoResult.success ? "✓ Video Berhasil Dikirim!" : "✗ Pengiriman Gagal"}
                </p>
                <p className="font-sans">{videoResult.message}</p>
                {videoResult.videoUrl && (
                  <p className="opacity-80 truncate">Source: {videoResult.videoUrl}</p>
                )}
                {videoResult.error && (
                  <p className="text-rose-600 dark:text-rose-400 font-sans">
                    Detail: {typeof videoResult.error === 'object' ? JSON.stringify(videoResult.error) : videoResult.error}
                  </p>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setIsVideoModalOpen(false)}>
              Tutup
            </Button>
            <Button
              size="sm"
              onClick={handleSendTestVideo}
              disabled={videoLoading || testSessionStatus !== "WORKING"}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
            >
              {videoLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              {videoLoading ? "Mengirim Video..." : "Kirim Video Native Sekarang"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

