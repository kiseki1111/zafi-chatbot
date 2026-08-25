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
  return (
    <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-4 border-b mb-4">
          <div>
            <CardTitle className="text-base">Channel WhatsApp</CardTitle>
            <CardDescription className="text-xs">Daftar Channel & Sesi Bot (Difilter berdasarkan divisi)</CardDescription>
          </div>
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <Plus className="h-4 w-4 mr-2" /> Tambah Channel
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Telegram Div */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-sm">Telegram Development</h3>
                <p className="text-xs text-muted-foreground">Platform: TELEGRAM</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="h-8 text-xs font-medium border-rose-100 text-slate-700">
                  <Smartphone className="h-3 w-3 mr-1.5" /> Tambah Sesi
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8 text-rose-500 border-rose-200 hover:bg-rose-50">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="border rounded-lg p-3 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="h-10 w-10 bg-emerald-50 text-emerald-500 rounded-lg flex items-center justify-center border border-emerald-100">
                    <Smartphone className="h-5 w-5" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white"></div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">telegram-dev-bot</span>
                  <span className="px-2 py-0.5 rounded-full border border-emerald-200 text-emerald-600 text-[10px] font-medium bg-emerald-50/50">Online</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-8 text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700 font-medium">
                  <Power className="h-3 w-3 mr-1.5" /> Putus
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4 text-slate-500" />
                </Button>
              </div>
            </div>
          </div>

          <div className="border-t border-dashed border-slate-200 my-4" />

          {/* WhatsApp Div */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-sm">bot-cs</h3>
                <p className="text-xs text-muted-foreground">Platform: WHATSAPP</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="h-8 text-xs font-medium border-rose-100 text-slate-700">
                  <Smartphone className="h-3 w-3 mr-1.5" /> Tambah Sesi
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8 text-rose-500 border-rose-200 hover:bg-rose-50">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="space-y-3">
              {/* Sesi 1: Online */}
              <div className="border rounded-lg p-3 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="h-10 w-10 bg-emerald-50 text-emerald-500 rounded-lg flex items-center justify-center border border-emerald-100">
                      <Smartphone className="h-5 w-5" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white"></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">zafi-cs</span>
                    <span className="px-2 py-0.5 rounded-full border border-emerald-200 text-emerald-600 text-[10px] font-medium bg-emerald-50/50">Online</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="h-8 text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700 font-medium">
                    <Power className="h-3 w-3 mr-1.5" /> Putus
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4 text-slate-500" />
                  </Button>
                </div>
              </div>

              {/* Sesi 2: Offline */}
              <div className="border rounded-lg p-3 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="h-10 w-10 bg-emerald-50 text-emerald-500 rounded-lg flex items-center justify-center border border-emerald-100">
                      <Smartphone className="h-5 w-5" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-rose-500 border-2 border-white"></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">zafi-cs-agent</span>
                    <span className="px-2 py-0.5 rounded-full border border-rose-200 text-rose-600 text-[10px] font-medium bg-rose-50/50">Offline</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="h-8 font-medium border-slate-200 text-slate-700 hover:bg-slate-50">
                    <QrCode className="h-3 w-3 mr-1.5" /> Scan QR
                  </Button>
                  <Button size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-medium">
                    <Power className="h-3 w-3 mr-1.5" /> Sambung
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4 text-slate-500" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
  );
}
