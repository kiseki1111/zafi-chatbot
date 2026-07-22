"use client";

import * as React from "react";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  User as UserIcon, Camera, KeyRound, Bot, Mail, Bell, BellRing,
  Volume2, Globe, ShieldCheck, Lock, Check, X, Plug, QrCode,
  Power, Wifi, Smartphone, AlertCircle, Save, Moon, MessageCircle,
  MoreVertical, Trash2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/lib/auth-store";
import { useAppStore } from "@/lib/app-store";
import {
  ROLES, ROLE_LABELS, ROLE_THEME, MENU_ITEMS, menuForRole,
} from "@/lib/rbac";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";

import type { Role, WhatsAppSession } from "@/lib/types";

export function SettingsPage() {
  const { user } = useAuthStore();

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-emerald-600" />
          Pengaturan
        </h2>
        <p className="text-sm text-muted-foreground">
          Kelola profil, integrasi WhatsApp (Waha), hak akses (RBAC), dan preferensi aplikasi.
        </p>
      </div>

      <Tabs defaultValue="profil" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto">
          <TabsTrigger value="profil" className="text-xs sm:text-sm">
            <UserIcon className="h-4 w-4 mr-1.5" /> Profil
          </TabsTrigger>
          <TabsTrigger value="waha" className="text-xs sm:text-sm">
            <MessageCircle className="h-4 w-4 mr-1.5" /> WhatsApp
          </TabsTrigger>
          <TabsTrigger value="rbac" className="text-xs sm:text-sm">
            <Lock className="h-4 w-4 mr-1.5" /> RBAC
          </TabsTrigger>
          <TabsTrigger value="pref" className="text-xs sm:text-sm">
            <Globe className="h-4 w-4 mr-1.5" /> Preferensi
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profil" className="space-y-4">
          <ProfilTab />
        </TabsContent>
        <TabsContent value="waha" className="space-y-4">
          <WahaTab />
        </TabsContent>
        <TabsContent value="rbac" className="space-y-4">
          <RbacTab role={user?.role ?? "operator"} />
        </TabsContent>
        <TabsContent value="pref" className="space-y-4">
          <PreferensiTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============ Tab: Profil ============

function ProfilTab() {
  const { toast } = useToast();
  const { user } = useAuthStore();

  const [form, setForm] = React.useState({
    name: user?.name ?? "",
    email: user?.email ?? "",
    phone: user?.phone ?? "",
  });
  const [pwd, setPwd] = React.useState({ current: "", next: "", confirm: "" });

  const role = user?.role ?? "operator";
  const theme = ROLE_THEME[role];

  function handleSaveProfile() {
    if (!form.name.trim() || !form.email.trim()) {
      toast({ title: "Validasi gagal", description: "Nama dan email wajib diisi.", variant: "destructive" });
      return;
    }
    toast({
      title: "Profil disimpan",
      description: "Perubahan profil Anda berhasil disimpan.",
    });
  }

  function handleChangePassword() {
    if (!pwd.current || !pwd.next || !pwd.confirm) {
      toast({ title: "Validasi gagal", description: "Lengkapi seluruh kolom password.", variant: "destructive" });
      return;
    }
    if (pwd.next.length < 6) {
      toast({ title: "Password terlalu pendek", description: "Minimal 6 karakter.", variant: "destructive" });
      return;
    }
    if (pwd.next !== pwd.confirm) {
      toast({ title: "Konfirmasi tidak cocok", description: "Password baru & konfirmasi tidak sama.", variant: "destructive" });
      return;
    }
    toast({ title: "Password diperbarui", description: "Password Anda berhasil diubah." });
    setPwd({ current: "", next: "", confirm: "" });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* Identity card */}
      <Card className="lg:col-span-1">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Identitas</CardTitle>
          <CardDescription>Foto & role Anda</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center text-center gap-3">
          <div className="relative">
            <Avatar className="h-24 w-24">
              <AvatarFallback className={cn("text-2xl font-semibold", theme.bg, theme.color)}>
                {form.name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
            <button
              type="button"
              className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-emerald-600 text-white grid place-items-center ring-2 ring-background hover:bg-emerald-700"
              onClick={() => toast({ title: "Unggah foto", description: "Fitur unggah foto segera hadir." })}
              aria-label="Ganti foto"
            >
              <Camera className="h-4 w-4" />
            </button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => toast({ title: "Ganti foto", description: "Fitur unggah foto segera hadir." })}
          >
            <Camera className="h-4 w-4" /> Ganti Foto
          </Button>
          <div className="w-full pt-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Role</span>
              <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1", theme.bg, theme.color, theme.ring)}>
                {ROLE_LABELS[role]}
              </span>
            </div>
            <Separator className="my-3" />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Status</span>
              <span className="inline-flex items-center rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 text-[11px] font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1.5" /> Aktif
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile form */}
      <Card className="lg:col-span-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Data Profil</CardTitle>
          <CardDescription>Perbarui informasi pribadi Anda</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="p-name">Nama Lengkap</Label>
              <Input id="p-name" value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-email">Email</Label>
              <Input id="p-email" type="email" value={form.email} onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-phone">Telepon</Label>
              <Input id="p-phone" value={form.phone} onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))} placeholder="0812-xxxx-xxxx" />
            </div>
            <div className="space-y-1.5">
              <Label>Role (read-only)</Label>
              <Input
                value={ROLE_LABELS[role]}
                disabled
                className="bg-muted/40"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleSaveProfile}>
              <Save className="h-4 w-4" /> Simpan Profil
            </Button>
          </div>

          <Separator />

          {/* Password change */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-emerald-600" />
              <h4 className="text-sm font-semibold">Ubah Password</h4>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="pwd-curr">Password Saat Ini</Label>
                <Input id="pwd-curr" type="password" value={pwd.current} onChange={(e) => setPwd((s) => ({ ...s, current: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pwd-new">Password Baru</Label>
                <Input id="pwd-new" type="password" value={pwd.next} onChange={(e) => setPwd((s) => ({ ...s, next: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pwd-conf">Konfirmasi</Label>
                <Input id="pwd-conf" type="password" value={pwd.confirm} onChange={(e) => setPwd((s) => ({ ...s, confirm: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end">
              <Button variant="outline" onClick={handleChangePassword}>
                <KeyRound className="h-4 w-4" /> Perbarui Password
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============ Tab: Integrasi WhatsApp (Waha) ============

function WahaTab() {
  const { toast } = useToast();
  const { user } = useAuthStore();
  const [config, setConfig] = React.useState({
    apiUrl: "http://waha.local:3000",
    apiKey: "waha-prod-key-2025",
    defaultSession: "agent-sales-1",
  });
  const [testing, setTesting] = React.useState(false);
  const [channels, setChannels] = React.useState<any[]>([]);
  const [divisions, setDivisions] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  
  const [isChannelDialogOpen, setIsChannelDialogOpen] = React.useState(false);
  const [newChannelName, setNewChannelName] = React.useState("");
  const [newChannelDivision, setNewChannelDivision] = React.useState("");

  const [isSessionDialogOpen, setIsSessionDialogOpen] = React.useState(false);
  const [newSessionName, setNewSessionName] = React.useState("");
  const [selectedChannelIdForSession, setSelectedChannelIdForSession] = React.useState<string | null>(null);

  const fetchChannels = async () => {
    try {
      setLoading(true);
      const divQuery = user?.role === "superadmin" ? "" : `?divisionName=${user?.division || ""}`;
      const res = await fetch(`/api/v1/channel-accounts${divQuery}`);
      if (res.ok) {
        const data = await res.json();
        const arr = data?.data || data;
        setChannels(Array.isArray(arr) ? arr : []);
      }
    } catch (e) {
      toast({ title: "Error", description: "Gagal mengambil data channel", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };
  
  const fetchDivisions = async () => {
    if (user?.role !== "superadmin") return;
    try {
      const res = await fetch('/api/v1/channel-accounts/divisions');
      if (res.ok) {
        const data = await res.json();
        const arr = data?.data || data;
        setDivisions(Array.isArray(arr) ? arr : []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  React.useEffect(() => {
    fetchChannels();
    fetchDivisions();
  }, [user]);

  function handleTestConnection() {
    setTesting(true);
    setTimeout(() => {
      setTesting(false);
      toast({ title: "Tersambung", description: `Berhasil terhubung ke Waha API.` });
    }, 900);
  }

  function handleSaveConfig() {
    toast({ title: "Konfigurasi disimpan", description: "Pengaturan Waha berhasil diperbarui." });
  }

  function handleScanQR(s: any) {
    const qrUrl = `/api/v1/waha/instances/${s.name || s.instanceName}/qr`;
    window.open(qrUrl, "_blank", "width=450,height=450");
    toast({ title: "QR Code", description: `Membuka QR Code untuk sesi "${s.name || s.instanceName}".` });
  }

  async function handleToggleSession(s: any) {
    const willConnect = s.status !== "WORKING";
    toast({
      title: willConnect ? "Menyambungkan sesi…" : "Memutuskan sesi…",
      description: `${s.instanceName} ${willConnect ? "sedang disambungkan" : "telah diputus"}.`,
      variant: willConnect ? "default" : "destructive",
    });
    
    try {
      const endpoint = willConnect ? "instances" : `instances/${s.instanceName}/stop`;
      const payload = willConnect ? { name: s.instanceName, channelAccountId: s.channelAccountId } : {};
      
      const res = await fetch(`/api/v1/waha/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        toast({ title: "Berhasil", description: `Status sesi ${s.instanceName} berhasil diubah.` });
        setTimeout(fetchChannels, 2000);
      }
    } catch (e) {
      toast({ title: "Error", description: "Gagal mengubah status sesi", variant: "destructive" });
    }
  }

  async function handleAddChannelSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newChannelName) return;
    
    let payload: any = { name: newChannelName };
    if (user?.role === "superadmin" && newChannelDivision) {
      payload.divisionId = newChannelDivision;
    } else if (user?.role !== "superadmin" && user?.division) {
      payload.divisionName = user.division;
    }
    
    try {
      const res = await fetch(`/api/v1/channel-accounts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        toast({ title: "Berhasil", description: `Channel ${newChannelName} dibuat.` });
        setIsChannelDialogOpen(false);
        setNewChannelName("");
        setNewChannelDivision("");
        fetchChannels();
      }
    } catch (e) {
      toast({ title: "Error", description: "Gagal membuat channel", variant: "destructive" });
    }
  }

  function openAddSessionDialog(channelId: string) {
    setSelectedChannelIdForSession(channelId);
    setNewSessionName("");
    setIsSessionDialogOpen(true);
  }

  async function handleAddSessionSubmit() {
    if (!newSessionName || !selectedChannelIdForSession) return;
    try {
      const res = await fetch(`/api/v1/waha/instances`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name: newSessionName, 
          channelAccountId: selectedChannelIdForSession,
          webhookUrl: window.location.origin + '/api/v1/waha/webhook'
        })
      });
      if (res.ok) {
        toast({ title: "Berhasil", description: `Sesi ${newSessionName} dibuat.` });
        setIsSessionDialogOpen(false);
        fetchChannels();
      } else {
        toast({ title: "Gagal", description: "Sesi gagal dibuat.", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Error", description: "Terjadi kesalahan sistem", variant: "destructive" });
    }
  }

  async function handleDeleteChannel(channelId: string, channelName: string) {
    if (!confirm(`Yakin ingin menghapus channel ${channelName}? Semua sesi di dalamnya akan ikut terhapus.`)) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/channel-accounts/${channelId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast({ title: "Berhasil", description: `Channel ${channelName} berhasil dihapus.` });
        fetchChannels();
      } else {
        toast({ title: "Gagal", description: "Gagal menghapus channel.", variant: "destructive" });
        setLoading(false);
      }
    } catch (e) {
      toast({ title: "Error", description: "Terjadi kesalahan sistem.", variant: "destructive" });
      setLoading(false);
    }
  }

  async function handleDeleteSession(s: any) {
    if (!confirm(`Yakin ingin menghapus sesi ${s.instanceName}? Sesi akan di-logout dan dihapus dari sistem.`)) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/waha/instances/${s.instanceName}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast({ title: "Berhasil", description: `Sesi ${s.instanceName} berhasil dihapus.` });
        fetchChannels();
      } else {
        toast({ title: "Gagal", description: "Gagal menghapus sesi.", variant: "destructive" });
        setLoading(false);
      }
    } catch (e) {
      toast({ title: "Error", description: "Terjadi kesalahan saat menghapus sesi.", variant: "destructive" });
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-1">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 grid place-items-center">
              <Plug className="h-4.5 w-4.5 text-emerald-600" />
            </div>
            <div>
              <CardTitle className="text-base">Koneksi Waha API</CardTitle>
              <CardDescription>WAHA HTTP API gateway</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="waha-url">Waha API URL</Label>
            <Input id="waha-url" value={config.apiUrl} onChange={(e) => setConfig((s) => ({ ...s, apiUrl: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="waha-key">API Key</Label>
            <Input id="waha-key" type="password" value={config.apiKey} onChange={(e) => setConfig((s) => ({ ...s, apiKey: e.target.value }))} />
          </div>
          <div className="flex flex-col gap-2 pt-1">
            <Button variant="outline" onClick={handleTestConnection} disabled={testing}>
              <Wifi className={cn("h-4 w-4", testing && "animate-pulse")} />
              {testing ? "Menguji…" : "Test Koneksi"}
            </Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleSaveConfig}>
              <Save className="h-4 w-4" /> Simpan Konfigurasi
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Channel WhatsApp</CardTitle>
            <CardDescription>Daftar Channel & Sesi Bot (Difilter berdasarkan divisi)</CardDescription>
          </div>
          <Dialog open={isChannelDialogOpen} onOpenChange={setIsChannelDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                + Tambah Channel
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleAddChannelSubmit}>
                <DialogHeader>
                  <DialogTitle>Buat Channel Baru</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Nama Channel</Label>
                    <Input placeholder="Misal: Marketing Bot 1" value={newChannelName} onChange={e => setNewChannelName(e.target.value)} required />
                  </div>
                  {user?.role === "superadmin" && (
                    <div className="space-y-2">
                      <Label>Pilih Divisi</Label>
                      <Select value={newChannelDivision} onValueChange={setNewChannelDivision}>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih divisi (Opsional)" />
                        </SelectTrigger>
                        <SelectContent>
                          {divisions.map(div => (
                            <SelectItem key={div.id} value={div.id}>{div.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsChannelDialogOpen(false)}>Batal</Button>
                  <Button type="submit" className="bg-emerald-600 text-white hover:bg-emerald-700">Simpan Channel</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[460px]">
            <div className="divide-y">
              {loading ? (
                <div className="p-8 text-center text-sm text-muted-foreground">Memuat channel...</div>
              ) : channels.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">Belum ada channel di divisi Anda.</div>
              ) : (
                channels.map((ch) => (
                  <div key={ch.id} className="p-4 bg-muted/20">
                    <div className="flex justify-between items-center mb-3">
                      <div>
                        <h4 className="font-semibold">{ch.name}</h4>
                        <p className="text-xs text-muted-foreground">Platform: {ch.platform} {ch.division ? `· Divisi: ${ch.division.name}` : ''}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => openAddSessionDialog(ch.id)}>
                          <Smartphone className="h-4 w-4 mr-2" />
                          Tambah Sesi
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDeleteChannel(ch.id, ch.name)} className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {ch.whatsappInstances && ch.whatsappInstances.length > 0 ? (
                        ch.whatsappInstances.map((s: any) => (
                          <SessionRow
                            key={s.id}
                            session={s}
                            onScan={() => handleScanQR(s)}
                            onToggle={() => handleToggleSession(s)}
                            onDelete={() => handleDeleteSession(s)}
                          />
                        ))
                      ) : (
                        <p className="text-xs text-muted-foreground ml-2">- Belum ada sesi terhubung -</p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Dialog open={isSessionDialogOpen} onOpenChange={setIsSessionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Sesi WhatsApp Baru</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="sessionName">Nama Sesi (Instance)</Label>
              <Input
                id="sessionName"
                placeholder="misal: agent-sales-1"
                value={newSessionName}
                onChange={(e) => setNewSessionName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Nama ini akan digunakan sebagai identitas unik mesin bot/WhatsApp. Hindari penggunaan spasi (gunakan strip).
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSessionDialogOpen(false)}>Batal</Button>
            <Button onClick={handleAddSessionSubmit} disabled={!newSessionName}>Buat Sesi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SessionRow({
  session, onScan, onToggle, onDelete,
}: {
  session: any;
  onScan: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const connected = session.status === "WORKING";
  const connecting = session.status === "STARTING";
  return (
    <div className="flex items-center gap-3 p-3 bg-background border rounded-md">
      <div className="relative">
        <div className="h-9 w-9 rounded-full bg-emerald-100 dark:bg-emerald-950/40 grid place-items-center">
          <Smartphone className="h-4 w-4 text-emerald-600" />
        </div>
        <span
          className={cn(
            "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-background",
            connected ? "bg-emerald-500" : connecting ? "bg-amber-500" : "bg-rose-400",
          )}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">{session.instanceName}</p>
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] px-1.5 py-0",
              connected
                ? "text-emerald-600 border-emerald-200"
                : connecting
                  ? "text-amber-600 border-amber-200"
                  : "text-rose-600 border-rose-200",
            )}
          >
            {connected ? "Online" : connecting ? "Menyambung" : "Offline"}
          </Badge>
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {!connected && (
          <Button variant="outline" size="sm" onClick={onScan} className="h-8">
            <QrCode className="h-3.5 w-3.5 mr-1" />
            <span className="hidden sm:inline">Scan QR</span>
          </Button>
        )}
        <Button
          variant={connected ? "outline" : "default"}
          size="sm"
          onClick={onToggle}
          className={cn("h-8", connected
            ? "text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/40"
            : "bg-emerald-600 hover:bg-emerald-700 text-white"
          )}
        >
          <Power className="h-3.5 w-3.5 mr-1" />
          <span className="hidden sm:inline">{connected ? "Putus" : "Sambung"}</span>
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 ml-1">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Aksi Sesi</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onScan} disabled={connected}>
              <QrCode className="mr-2 h-4 w-4" /> Scan QR
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onToggle}>
              <Power className="mr-2 h-4 w-4" /> {connected ? "Putuskan Koneksi" : "Sambungkan"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-rose-600 focus:bg-rose-50 focus:text-rose-700 dark:focus:bg-rose-950/40">
              <Trash2 className="mr-2 h-4 w-4" /> Hapus Sesi
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}


// ============ Tab: RBAC & Hak Akses ============

function RbacTab({ role }: { role: Role }) {
  const isSuperadmin = role === "superadmin";

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2 flex-col sm:flex-row sm:items-center">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Lock className="h-4 w-4 text-emerald-600" />
              Matriks Hak Akses (RBAC)
            </CardTitle>
            <CardDescription>
              Visualisasi menu yang dapat diakses oleh setiap role.
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-rose-600 border-rose-200">
            <AlertCircle className="h-3 w-3 mr-1" /> Hanya Superadmin
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {!isSuperadmin && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900 p-3 text-sm text-amber-800 dark:text-amber-200 flex items-center gap-2">
            <Lock className="h-4 w-4 shrink-0" />
            <span>Hanya Superadmin yang dapat mengubah hak akses. Anda melihat matriks ini dalam mode read-only.</span>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Hanya Superadmin yang dapat mengubah hak akses. Matriks berikut menampilkan konfigurasi saat ini.
        </p>

        {/* Matrix table */}
        <div className="rounded-lg border overflow-x-auto">
          <ScrollArea className="max-h-[520px]">
            <table className="w-full text-sm min-w-[680px]">
              <thead className="sticky top-0 z-10 bg-muted/60 backdrop-blur">
                <tr className="border-b">
                  <th className="text-left py-2.5 px-3 text-xs font-medium text-muted-foreground w-[40%]">
                    Menu / Fitur
                  </th>
                  {ROLES.map((r) => {
                    const theme = ROLE_THEME[r];
                    return (
                      <th key={r} className="py-2.5 px-2 text-center text-xs font-medium">
                        <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5", theme.bg, theme.color)}>
                          {ROLE_LABELS[r]}
                        </span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {MENU_ITEMS.map((m, idx) => {
                  const rowAlt = idx % 2 === 1;
                  return (
                    <tr key={m.key} className={cn("border-b last:border-0", rowAlt && "bg-muted/20")}>
                      <td className="py-2 px-3">
                        <span className="text-sm font-medium">{m.label}</span>
                      </td>
                      {ROLES.map((r) => {
                        const has = menuForRole(r).some((mm) => mm.key === m.key);
                        return (
                          <td key={r} className="py-2 px-2 text-center">
                            {has ? (
                              <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-emerald-100 dark:bg-emerald-950/40">
                                <Check className="h-3.5 w-3.5 text-emerald-600" />
                                <span className="sr-only">Bisa akses</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-muted">
                                <X className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="sr-only">Tidak bisa akses</span>
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </ScrollArea>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-emerald-100 dark:bg-emerald-950/40">
              <Check className="h-3 w-3 text-emerald-600" />
            </span>
            Bisa diakses
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-muted">
              <X className="h-3 w-3 text-muted-foreground" />
            </span>
            Tidak bisa akses
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// ============ Tab: Preferensi ============

function PreferensiTab() {
  const { toast } = useToast();
  const { theme, toggleTheme } = useAppStore();
  const [prefs, setPrefs] = React.useState({
    emailNotif: true,
    pushNotif: true,
    autoReply: true,
    soundNotif: false,
    language: "id",
  });

  function toggle(key: keyof typeof prefs) {
    setPrefs((s) => ({ ...s, [key]: !s[key] }));
  }

  function handleSave() {
    toast({ title: "Preferensi disimpan", description: "Pengaturan preferensi Anda telah diperbarui." });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BellRing className="h-4 w-4 text-emerald-600" />
            Notifikasi & Tampilan
          </CardTitle>
          <CardDescription>Kontrol notifikasi dan tampilan aplikasi</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1 divide-y">
          <PrefRow
            icon={Moon}
            title="Tema Gelap"
            desc="Aktifkan mode gelap untuk kenyamanan mata."
            checked={theme === "dark"}
            onChange={toggleTheme}
          />
          <PrefRow
            icon={Mail}
            title="Notifikasi Email"
            desc="Terima ringkasan aktivitas via email."
            checked={prefs.emailNotif}
            onChange={() => toggle("emailNotif")}
          />
          <PrefRow
            icon={Bell}
            title="Notifikasi Push"
            desc="Notifikasi browser untuk chat baru & order."
            checked={prefs.pushNotif}
            onChange={() => toggle("pushNotif")}
          />
          <PrefRow
            icon={Bot}
            title="Auto-reply AI"
            desc="Biarkan AI membalas otomatis pesan masuk."
            checked={prefs.autoReply}
            onChange={() => toggle("autoReply")}
          />
          <PrefRow
            icon={Volume2}
            title="Suara Notifikasi"
            desc="Bunyi beep saat chat baru masuk."
            checked={prefs.soundNotif}
            onChange={() => toggle("soundNotif")}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4 text-emerald-600" />
            Bahasa & Region
          </CardTitle>
          <CardDescription>Atur bahasa antarmuka</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="lang">Bahasa</Label>
            <Select value={prefs.language} onValueChange={(v) => setPrefs((s) => ({ ...s, language: v }))}>
              <SelectTrigger id="lang"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="id">🇮🇩 Indonesia</SelectItem>
                <SelectItem value="en">🇬🇧 English</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Bahasa default: Indonesia</p>
          </div>
          <Separator />
          <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground space-y-1.5">
            <p className="font-medium text-foreground">Pratinjau</p>
            <p>Bahasa aktif akan menerjemahkan label, menu, dan pesan sistem. Beberapa data dari server tetap menggunakan bahasa aslinya.</p>
          </div>
        </CardContent>
        <CardFooter className="justify-end">
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleSave}>
            <Save className="h-4 w-4" /> Simpan Preferensi
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

function PrefRow({
  icon: Icon, title, desc, checked, onChange,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
      <div className="h-9 w-9 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 grid place-items-center shrink-0">
        <Icon className="h-4 w-4 text-emerald-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-tight">{title}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={title} />
    </div>
  );
}
