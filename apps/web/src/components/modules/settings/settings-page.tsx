"use client";

import * as React from "react";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Bot, Save, Smartphone, User, ShieldCheck, Loader2, Plug, Wifi, Plus, Trash2, Power, MoreVertical, QrCode } from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";

export function SettingsPage() {
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

      <Tabs defaultValue="bot" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 md:w-[400px]">
          <TabsTrigger value="bot">
            <Bot className="h-4 w-4 mr-1.5" /> Identitas Asisten
          </TabsTrigger>
          <TabsTrigger value="koneksi">
            <Smartphone className="h-4 w-4 mr-1.5" /> Koneksi WA
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bot">
          <BotSettingsTab />
        </TabsContent>
        <TabsContent value="koneksi">
          <KoneksiWATab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function BotSettingsTab() {
  const { user } = useAuthStore();
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  
  const [settings, setSettings] = React.useState({
    agentName: "Luna",
    phone: "",
    agentTone: "ramah dan profesional",
  });

  React.useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/v1/tenant/${user?.id || 'demo'}/dashboard`);
        const data = await res.json();
        if (data && data.tenant) {
          setSettings({
            agentName: data.tenant.agentName || "Luna",
            phone: data.tenant.phone || "",
            agentTone: data.tenant.agentTone || "ramah dan profesional",
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
      await fetch(`/api/v1/tenant/${user?.id || 'demo'}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings)
      });
      alert("Pengaturan asisten berhasil disimpan!");
    } catch(e) {
      alert("Gagal menyimpan pengaturan");
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
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-lg">Identitas Asisten Bot (Menjawab Pesan)</CardTitle>
              <CardDescription>Atur nama, gaya bahasa, dan perilaku asisten saat membalas pesan masuk.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="bot-active" className="text-sm font-medium text-emerald-700">Aktifkan Asisten</Label>
              <Switch id="bot-active" defaultChecked />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Nama Panggilan Asisten</Label>
                <Input 
                  value={settings.agentName} 
                  onChange={e => setSettings({...settings, agentName: e.target.value})} 
                />
                <p className="text-[10px] text-muted-foreground">Pengguna akan disapa oleh nama ini.</p>
              </div>
              <div className="space-y-1.5">
                <Label>Nomor WA Cadangan / Pengalihan (Admin)</Label>
                <Input 
                  value={settings.phone} 
                  onChange={e => setSettings({...settings, phone: e.target.value})} 
                />
                <p className="text-[10px] text-muted-foreground">Jika asisten kebingungan, nomor ini akan diberikan ke pengguna.</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Gaya Bahasa / Karakter Asisten</Label>
                <Textarea 
                  className="min-h-[100px] text-sm" 
                  value={settings.agentTone} 
                  onChange={e => setSettings({...settings, agentTone: e.target.value})}
                />
                <p className="text-[10px] text-muted-foreground">Petunjuk cara asisten berbicara ke pengguna.</p>
              </div>
            </div>
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

  const fetchInstances = async () => {
    setLoading(true);
    try {
      // Ambil langsung dari database (bukan dari WAHA API yang bisa offline)
      const res = await fetch('/api/v1/waha/instances/db');
      const data = await res.json();
      setInstances(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      toast.error("Gagal mengambil data chatbot");
    }
    setLoading(false);
  };

  React.useEffect(() => {
    fetchInstances();
  }, []);

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
      await fetch(`/api/v1/waha/instances/${nameToDelete}`, { method: 'DELETE' });
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
      <Card className="shadow-sm relative">
        {/* QR Code overlay */}
        {qrCodeData && (
          <div className="absolute inset-0 bg-white/95 z-10 flex flex-col items-center justify-center rounded-xl backdrop-blur-sm">
            <h3 className="font-bold text-lg mb-1">Scan QR Code</h3>
            <p className="text-sm text-muted-foreground mb-4">Chatbot: <span className="font-medium text-slate-700">{qrCodeData.id}</span></p>
            <img src={qrCodeData.url} alt="QR Code" className="w-64 h-64 border-4 border-emerald-500 rounded-xl shadow-lg" />
            <Button onClick={() => setQrCodeData(null)} className="mt-6 bg-slate-800 text-white">Tutup</Button>
          </div>
        )}

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
    </>
  );
}

