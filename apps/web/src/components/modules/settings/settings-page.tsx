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
  const [channels, setChannels] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [qrCodeData, setQrCodeData] = React.useState<{id: string, url: string} | null>(null);

  // Form states
  const [isAddChannelOpen, setIsAddChannelOpen] = React.useState(false);
  const [newChannelName, setNewChannelName] = React.useState("");
  const [isAddChannelLoading, setIsAddChannelLoading] = React.useState(false);

  const [isAddSessionOpen, setIsAddSessionOpen] = React.useState(false);
  const [newSessionName, setNewSessionName] = React.useState("");
  const [channelIdToAddSession, setChannelIdToAddSession] = React.useState<string | null>(null);
  const [isAddSessionLoading, setIsAddSessionLoading] = React.useState(false);

  const [isDeleteChannelOpen, setIsDeleteChannelOpen] = React.useState(false);
  const [channelIdToDelete, setChannelIdToDelete] = React.useState<string | null>(null);
  const [isDeleteChannelLoading, setIsDeleteChannelLoading] = React.useState(false);

  const [isStopSessionOpen, setIsStopSessionOpen] = React.useState(false);
  const [sessionNameToStop, setSessionNameToStop] = React.useState<string | null>(null);
  const [isStopSessionLoading, setIsStopSessionLoading] = React.useState(false);

  const fetchChannels = async () => {
    try {
      const res = await fetch('/api/v1/channel-accounts');
      const data = await res.json();
      setChannels(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  React.useEffect(() => {
    fetchChannels();
  }, []);

  const handleStartSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSessionName.trim() || !channelIdToAddSession) return;
    setIsAddSessionLoading(true);
    try {
      await fetch('/api/v1/waha/instances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newSessionName.replace(/\s+/g, '-'), channelAccountId: channelIdToAddSession, tenantId: user?.tenantId })
      });
      toast.success("Sesi berhasil dibuat!", { description: "Silakan Scan QR setelah status berubah menjadi Offline" });
      setIsAddSessionOpen(false);
      setNewSessionName("");
      fetchChannels();
    } catch (e) {
      toast.error("Gagal membuat sesi");
    } finally {
      setIsAddSessionLoading(false);
    }
  };

  const handleStopSession = async () => {
    if (!sessionNameToStop) return;
    setIsStopSessionLoading(true);
    try {
      await fetch(`/api/v1/waha/instances/${sessionNameToStop}/logout`, { method: 'POST' });
      await fetch(`/api/v1/waha/instances/${sessionNameToStop}`, { method: 'DELETE' });
      toast.success("Sesi berhasil dihapus");
      setIsStopSessionOpen(false);
      fetchChannels();
    } catch (e) {
      toast.error("Gagal menghapus sesi");
    } finally {
      setIsStopSessionLoading(false);
    }
  };

  const handleAddChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName.trim()) return;
    setIsAddChannelLoading(true);
    try {
      await fetch('/api/v1/channel-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newChannelName })
      });
      toast.success("Channel berhasil ditambahkan!");
      setIsAddChannelOpen(false);
      setNewChannelName("");
      fetchChannels();
    } catch (e) {
      toast.error("Gagal menambahkan channel");
    } finally {
      setIsAddChannelLoading(false);
    }
  };

  const handleDeleteChannel = async () => {
    if (!channelIdToDelete) return;
    setIsDeleteChannelLoading(true);
    try {
      await fetch(`/api/v1/channel-accounts/${channelIdToDelete}`, { method: 'DELETE' });
      toast.success("Channel berhasil dihapus!");
      setIsDeleteChannelOpen(false);
      fetchChannels();
    } catch (e) {
      toast.error("Gagal menghapus channel");
    } finally {
      setIsDeleteChannelLoading(false);
    }
  };

  const handleScanQR = async (sessionName: string) => {
    try {
      const res = await fetch(`/api/v1/waha/instances/${sessionName}/qr`);
      if (res.ok) {
        const blob = await res.blob();
        setQrCodeData({ id: sessionName, url: URL.createObjectURL(blob) });
      } else {
        // If QR is not ready, start the session first
        await fetch(`/api/v1/waha/instances`, {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ name: sessionName, tenantId: user?.tenantId })
        });
        toast.info("Sesi sedang dimulai, silakan tunggu beberapa detik lalu klik Scan QR lagi.");
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
          {qrCodeData && (
            <div className="absolute inset-0 bg-white/90 z-10 flex flex-col items-center justify-center rounded-xl backdrop-blur-sm">
              <h3 className="font-bold text-lg mb-4">Scan QR Code untuk {qrCodeData.id}</h3>
              <img src={qrCodeData.url} alt="QR Code" className="w-64 h-64 border-4 border-emerald-500 rounded-xl shadow-lg" />
              <Button onClick={() => setQrCodeData(null)} className="mt-6 bg-slate-800 text-white">Tutup</Button>
            </div>
          )}
          <CardHeader className="flex flex-row items-center justify-between pb-4 border-b mb-4">
            <div>
              <CardTitle className="text-base">Channel WhatsApp</CardTitle>
              <CardDescription className="text-xs">Daftar Channel & Sesi Bot (Difilter berdasarkan divisi)</CardDescription>
            </div>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setIsAddChannelOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> Tambah Channel
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            {channels.map((channel, i) => (
              <div key={channel.id} className="space-y-4">
                {i > 0 && <div className="border-t border-slate-100 my-4" />}
                <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <div>
                    <h3 className="font-semibold text-sm">{channel.name}</h3>
                    <p className="text-xs text-muted-foreground">Platform: {channel.platform || 'WHATSAPP'}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => { setChannelIdToAddSession(channel.id); setIsAddSessionOpen(true); }} variant="outline" size="sm" className="h-8 text-xs font-medium border-slate-200 text-slate-700">
                      <Smartphone className="h-3 w-3 mr-1.5" /> Tambah Sesi
                    </Button>
                    <Button onClick={() => { setChannelIdToDelete(channel.id); setIsDeleteChannelOpen(true); }} variant="outline" size="icon" className="h-8 w-8 text-rose-500 border-rose-200 hover:bg-rose-50 hover:text-rose-600">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                {/* Nested Sessions */}
                {channel.whatsappInstances && channel.whatsappInstances.length > 0 ? (
                  <div className="pl-4 space-y-3">
                    {channel.whatsappInstances.map((instance: any) => (
                      <div key={instance.id} className="flex justify-between items-center p-3 border rounded-lg bg-white shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                            <Smartphone className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{instance.instanceName}</span>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${instance.status === 'WORKING' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                {instance.status || 'Offline'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {instance.status !== 'WORKING' && (
                            <Button onClick={() => handleScanQR(instance.instanceName)} variant="outline" size="sm" className="h-8 text-xs border-slate-200 text-slate-700 hover:bg-slate-50 font-medium">
                              <QrCode className="h-3 w-3 mr-1.5" /> Scan QR
                            </Button>
                          )}
                          <Button onClick={() => { setSessionNameToStop(instance.instanceName); setIsStopSessionOpen(true); }} variant="outline" size="sm" className="h-8 text-xs text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700 font-medium">
                            <Power className="h-3 w-3 mr-1.5" /> Putus
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="pl-4">
                    <div className="text-xs text-muted-foreground text-center py-4 bg-slate-50/50 rounded-lg border border-dashed">Belum ada sesi di channel ini</div>
                  </div>
                )}
              </div>
            ))}
            
            {channels.length === 0 && (
              <div className="text-center py-10 text-muted-foreground text-sm">
                Belum ada channel terdaftar.
              </div>
            )}
          </CardContent>
        </Card>

      {/* DIALOGS */}
      
      {/* Tambah Channel */}
      <Dialog open={isAddChannelOpen} onOpenChange={setIsAddChannelOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleAddChannel}>
            <DialogHeader>
              <DialogTitle>Tambah Channel Baru</DialogTitle>
              <DialogDescription>
                Buat channel baru untuk mengelompokkan sesi chatbot Anda (misal: Customer Service, Sales).
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="channelName">Nama Channel</Label>
                <Input
                  id="channelName"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  placeholder="Contoh: Customer Service"
                  autoFocus
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddChannelOpen(false)} disabled={isAddChannelLoading}>
                Batal
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={!newChannelName.trim() || isAddChannelLoading}>
                {isAddChannelLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Simpan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Tambah Sesi */}
      <Dialog open={isAddSessionOpen} onOpenChange={setIsAddSessionOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleStartSession}>
            <DialogHeader>
              <DialogTitle>Tambah Sesi Chatbot</DialogTitle>
              <DialogDescription>
                Buat sesi WhatsApp baru untuk disambungkan ke channel ini.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="sessionName">ID Sesi (Tanpa Spasi)</Label>
                <Input
                  id="sessionName"
                  value={newSessionName}
                  onChange={(e) => setNewSessionName(e.target.value.replace(/\s+/g, '-'))}
                  placeholder="Contoh: zafi-cs-1"
                  autoFocus
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddSessionOpen(false)} disabled={isAddSessionLoading}>
                Batal
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={!newSessionName.trim() || isAddSessionLoading}>
                {isAddSessionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Tambah Sesi
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Hapus Channel */}
      <Dialog open={isDeleteChannelOpen} onOpenChange={setIsDeleteChannelOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Hapus Channel</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus channel ini secara permanen? 
              <br/><br/>
              <span className="font-semibold text-rose-600">Perhatian: Semua sesi chatbot di dalam channel ini akan ikut terhapus!</span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsDeleteChannelOpen(false)} disabled={isDeleteChannelLoading}>
              Batal
            </Button>
            <Button variant="destructive" onClick={handleDeleteChannel} disabled={isDeleteChannelLoading}>
              {isDeleteChannelLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Ya, Hapus Channel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Putus Sesi */}
      <Dialog open={isStopSessionOpen} onOpenChange={setIsStopSessionOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Putus Sesi</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin memutuskan koneksi dan menghapus sesi ini? Bot tidak akan membalas pesan lagi untuk nomor ini.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsStopSessionOpen(false)} disabled={isStopSessionLoading}>
              Batal
            </Button>
            <Button variant="destructive" onClick={handleStopSession} disabled={isStopSessionLoading}>
              {isStopSessionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Ya, Putus Sesi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

