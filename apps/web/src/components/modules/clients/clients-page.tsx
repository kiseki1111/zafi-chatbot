"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Building2,
  Plus,
  Edit2,
  Users,
  ShieldCheck,
  CheckSquare,
  Square,
  Sparkles,
  MessageCircle,
  Bus,
  Grid3X3,
  Book,
  BellRing,
  Settings,
  Mail,
  Key,
  Sliders,
  Bot,
  Zap,
  Phone,
  Clock,
  Trash2,
  Database,
  LogIn,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/lib/auth-store";
import { useAppStore } from "@/lib/app-store";

// Daftar semua modul inti & fitur khusus per vertikal industri
const AVAILABLE_MODULES = [
  { key: "chatbot", label: "Bot WhatsApp & Takeover", icon: MessageCircle, desc: "Chatbot AI & live chat takeover" },
  { key: "crm", label: "Data Pelanggan (CRM)", icon: Users, desc: "Manajemen kontak, status prospek, & riwayat" },
  { key: "bus_layout", label: "Denah Kursi Bus (17 Seats / Multi-Armada)", icon: Bus, desc: "Visualisasi reservasi tiket & drag-and-drop kursi" },
  { key: "availability", label: "Plansite Properti", icon: Grid3X3, desc: "Denah blok unit kaveling/rumah properti" },
  { key: "knowledge", label: "Knowledge Base AI", icon: Book, desc: "Pelatihan dokumen PDF & teks untuk asisten AI" },
  { key: "followup", label: "Follow-Up Otomatis", icon: BellRing, desc: "Broadcast & pengingat berkala ke WhatsApp pelanggan" },
];

export function ClientsPage() {
  const { loginAsTenant } = useAuthStore();
  const { setView } = useAppStore();
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Dialog Tambah Klien Baru
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    companyName: "",
    category: "transport",
    managerName: "",
    managerEmail: "",
    managerPassword: "Password@123",
    customFeatureNotes: "",
    enabledMenus: ["chatbot", "crm", "bus_layout"], // default bus
  });

  // Dialog Edit Menu Klien
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [editMenus, setEditMenus] = useState<string[]>([]);
  const [editCategory, setEditCategory] = useState<string>("general");

  // Dialog Tambah User / Staf Khusus Tenant
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [selectedTenantForStaff, setSelectedTenantForStaff] = useState<any>(null);
  const [staffForm, setStaffForm] = useState({
    name: "",
    email: "",
    password: "Staff@123",
    role: "administrator",
  });

  // Dialog Detail / Konfigurasi Lengkap Tenant (Dummy & Stateful)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<any>(null);
  const [detailTab, setDetailTab] = useState("general");
  const [detailForm, setDetailForm] = useState({
    name: "",
    category: "",
    phone: "",
    address: "",
    agentName: "",
    agentTone: "",
    systemPrompt: "",
    wahaSessionName: "",
    aiModel: "deepseek/deepseek-v4-flash-0731",
    monthlyTokenQuota: "500000",
    usedTokenCount: "124500",
    customInstruction: "",
    maxAdmins: "5",
  });

  const fetchClients = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/tenant/clients/all");
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.data || [];
      setClients(list);
    } catch (e) {
      console.error(e);
      toast.error("Gagal memuat daftar klien");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleCreateClient = async () => {
    if (!addForm.companyName || !addForm.managerEmail) {
      toast.error("Nama perusahaan dan email manager wajib diisi.");
      return;
    }

    try {
      const res = await fetch("/api/v1/tenant/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });

      if (res.ok) {
        toast.success("Klien baru & akun manager berhasil dibuat!");
        setIsAddModalOpen(false);
        setAddForm({
          companyName: "",
          category: "transport",
          managerName: "",
          managerEmail: "",
          managerPassword: "Password@123",
          customFeatureNotes: "",
          enabledMenus: ["chatbot", "crm", "bus_layout"],
        });
        fetchClients();
      } else {
        const err = await res.json();
        toast.error(err.message || "Gagal membuat klien.");
      }
    } catch (e: any) {
      toast.error(e.message || "Terjadi kesalahan jaringan.");
    }
  };

  const openEditModal = (client: any) => {
    setEditingClient(client);
    const existing = client.metadata?.enabledMenus || ["chatbot", "crm"];
    setEditMenus(existing);
    setEditCategory(client.category || "general");
    setIsEditModalOpen(true);
  };

  const openDetailModal = (client: any) => {
    setSelectedTenant(client);
    const meta = client.metadata || {};
    setDetailForm({
      name: client.name || "",
      category: client.category || "general",
      phone: client.phone || "",
      address: client.address || "",
      agentName: client.agentName || "Asisten AI",
      agentTone: client.agentTone || "ramah dan profesional",
      systemPrompt: client.systemPrompt || "Anda adalah asisten WhatsApp profesional.",
      wahaSessionName: meta.wahaSessionName || client.name?.toLowerCase().replace(/\s+/g, "-") || "session-1",
      aiModel: meta.aiModel || "deepseek/deepseek-v4-flash-0731",
      monthlyTokenQuota: meta.monthlyTokenQuota || "500000",
      usedTokenCount: meta.usedTokenCount || "124500",
      customInstruction: meta.featuresNote || "",
      maxAdmins: meta.maxAdmins || "5",
    });
    setIsDetailModalOpen(true);
  };

  const handleSaveMenus = async () => {
    if (!editingClient) return;

    try {
      const res = await fetch(`/api/v1/tenant/clients/${editingClient.id}/menus`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabledMenus: editMenus,
          category: editCategory,
        }),
      });

      if (res.ok) {
        toast.success("Hak menu & fitur khusus klien berhasil disimpan!");
        setIsEditModalOpen(false);
        fetchClients();
      } else {
        toast.error("Gagal memperbarui menu klien.");
      }
    } catch (e: any) {
      toast.error(e.message || "Gagal menyimpan perubahan.");
    }
  };

  const handleSaveTenantDetail = async () => {
    if (!selectedTenant) return;

    try {
      const res = await fetch(`/api/v1/tenant/clients/${selectedTenant.id}/detail`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: detailForm.name,
          category: detailForm.category,
          phone: detailForm.phone,
          address: detailForm.address,
          agentName: detailForm.agentName,
          agentTone: detailForm.agentTone,
          systemPrompt: detailForm.systemPrompt,
          metadata: {
            wahaSessionName: detailForm.wahaSessionName,
            aiModel: detailForm.aiModel,
            monthlyTokenQuota: detailForm.monthlyTokenQuota,
            usedTokenCount: detailForm.usedTokenCount,
            featuresNote: detailForm.customInstruction,
            maxAdmins: detailForm.maxAdmins,
          },
        }),
      });

      if (res.ok) {
        toast.success(`Pengaturan detail tenant "${detailForm.name}" berhasil disimpan!`);
        setIsDetailModalOpen(false);
        fetchClients();
      } else {
        toast.error("Gagal menyimpan detail tenant.");
      }
    } catch (e: any) {
      toast.error(e.message || "Terjadi kesalahan.");
    }
  };

  // Tambah Staf/Admin khusus tenant ini
  const handleCreateStaff = async () => {
    if (!selectedTenantForStaff || !staffForm.email || !staffForm.name) {
      toast.error("Nama dan email staf wajib diisi.");
      return;
    }

    try {
      const res = await fetch(`/api/v1/tenant/clients/${selectedTenantForStaff.id}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(staffForm),
      });

      if (res.ok) {
        toast.success(`Akun staf "${staffForm.name}" berhasil dibuat untuk ${selectedTenantForStaff.name}!`);
        setIsAddStaffOpen(false);
        setStaffForm({ name: "", email: "", password: "Staff@123", role: "administrator" });
        fetchClients();
      } else {
        toast.error("Gagal membuat akun staf.");
      }
    } catch (e: any) {
      toast.error(e.message || "Gagal membuat akun staf.");
    }
  };

  // Masuk / Login langsung sebagai tenant ini
  const handleImpersonateTenant = (client: any) => {
    const manager = client.users?.find((u: any) => u.role === "manager") || client.users?.[0];
    const tenantUser: any = {
      id: manager ? manager.id : `u-${client.id}`,
      name: manager ? manager.name : `Manager ${client.name}`,
      email: manager ? manager.email : `admin@${client.name.toLowerCase().replace(/\s+/g, "")}.com`,
      role: manager ? manager.role : "manager",
      status: "active",
      createdAt: new Date().toISOString().slice(0, 10),
      lastLogin: new Date().toISOString().slice(0, 16).replace("T", " "),
      tenantId: client.id,
    };

    loginAsTenant(tenantUser);
    toast.success(`Beralih ke akun ${client.name}`);
    setView("overview");
  };

  const toggleMenu = (key: string, isCreate: boolean) => {
    if (isCreate) {
      setAddForm((prev) => ({
        ...prev,
        enabledMenus: prev.enabledMenus.includes(key)
          ? prev.enabledMenus.filter((k) => k !== key)
          : [...prev.enabledMenus, key],
      }));
    } else {
      setEditMenus((prev) =>
        prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Panel Superadmin */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-rose-600 via-pink-600 to-slate-900 p-6 text-white shadow-xl">
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/20 p-3 backdrop-blur-sm">
              <Building2 className="h-7 w-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight">Pusat Kendali Super Admin (B2B Multi-Tenant)</h1>
                <Badge className="bg-rose-500 text-white font-semibold">Master Platform</Badge>
              </div>
              <p className="mt-0.5 text-xs text-rose-100">
                Pendaftaran perusahaan klien, pengaturan hak menu, dan konfigurasi detail per tenant.
              </p>
            </div>
          </div>

          <Button
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
            className="bg-white text-rose-700 hover:bg-white/90 text-xs font-semibold gap-1.5 shadow-sm"
          >
            <Plus className="h-4 w-4" /> Tambah Klien Perusahaan Baru
          </Button>
        </div>
      </div>

      {/* Daftar Klien yang Dikelola */}
      <Card>
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Building2 className="h-5 w-5 text-rose-600" />
            Daftar Perusahaan Klien ({clients.length})
          </CardTitle>
          <CardDescription className="text-xs">
            Kelola akses modul, akun manajer, sesi WhatsApp, dan batas operasional setiap klien.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-12 text-xs text-muted-foreground">Memuat data klien...</div>
          ) : clients.length === 0 ? (
            <div className="text-center py-12 text-xs text-muted-foreground">Belum ada tenant klien terdaftar.</div>
          ) : (
            <div className="divide-y">
              {clients.map((c) => {
                const manager = c.users?.find((u: any) => u.role === "manager") || c.users?.[0];
                const menus: string[] = c.metadata?.enabledMenus || [];
                const notes: string = c.metadata?.featuresNote || "";

                return (
                  <div key={c.id} className="p-4 flex flex-wrap items-center justify-between gap-4 hover:bg-muted/30 transition-colors">
                    <div className="space-y-1.5 max-w-xl">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm text-foreground">{c.name}</h3>
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {c.category || "General"}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          ID: {c.id.slice(0, 8)}...
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5 text-blue-600" />
                          Manager: {manager?.name || "Belum ada"} ({manager?.email || "-"})
                        </span>
                      </div>

                      {notes && (
                        <p className="text-[11px] text-amber-700 dark:text-amber-300 font-medium">
                          ✦ Fitur Khusus: {notes}
                        </p>
                      )}

                      {/* Menu aktif */}
                      <div className="flex flex-wrap gap-1 mt-1">
                        <span className="text-[10px] font-medium text-muted-foreground mr-1 self-center">Menu Aktif:</span>
                        {menus.length === 0 ? (
                          <span className="text-[10px] text-muted-foreground italic">Semua Menu (Default)</span>
                        ) : (
                          menus.map((mKey) => {
                            const mod = AVAILABLE_MODULES.find((m) => m.key === mKey);
                            return (
                              <Badge key={mKey} variant="secondary" className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                {mod?.label || mKey}
                              </Badge>
                            );
                          })
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        size="sm"
                        onClick={() => handleImpersonateTenant(c)}
                        className="text-xs h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm"
                        title="Masuk & lihat dashboard seperti klien ini"
                      >
                        <LogIn className="h-3.5 w-3.5" /> Akses Sebagai Tenant
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedTenantForStaff(c);
                          setIsAddStaffOpen(true);
                        }}
                        className="text-xs h-8 gap-1.5 border-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                        title="Tambah akun staf / admin untuk tenant ini"
                      >
                        <UserPlus className="h-3.5 w-3.5 text-indigo-600" /> + Akun Staf
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openDetailModal(c)}
                        className="text-xs h-8 gap-1.5 border-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        <Sliders className="h-3.5 w-3.5 text-slate-600 dark:text-slate-300" /> Detail
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditModal(c)}
                        className="text-xs h-8 gap-1.5 border-slate-300"
                      >
                        <Edit2 className="h-3.5 w-3.5 text-blue-600" /> Hak Menu
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Tambah Klien Baru */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-rose-600" />
              Pendaftaran Perusahaan Klien Baru
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="font-semibold">Nama Perusahaan Klien</Label>
                <Input
                  value={addForm.companyName}
                  onChange={(e) => setAddForm({ ...addForm, companyName: e.target.value })}
                  placeholder="Misal: PO Cahaya Mandiri"
                  className="h-8 mt-1 text-xs"
                />
              </div>
              <div>
                <Label className="font-semibold">Kategori Bisnis Klien</Label>
                <select
                  value={addForm.category}
                  onChange={(e) => {
                    const cat = e.target.value;
                    let defaultMenus = ["chatbot", "crm"];
                    if (cat === "transport") defaultMenus = ["chatbot", "crm", "bus_layout"];
                    if (cat === "properti") defaultMenus = ["chatbot", "crm", "availability"];
                    setAddForm({ ...addForm, category: cat, enabledMenus: defaultMenus });
                  }}
                  className="w-full h-8 mt-1 rounded-md border bg-background px-2 text-xs"
                >
                  <option value="transport">Transportasi / Bus &amp; Travel</option>
                  <option value="properti">Developer / Properti</option>
                  <option value="retail">Retail / UMKM</option>
                  <option value="general">Lainnya (General)</option>
                </select>
              </div>
            </div>

            <div className="border-t pt-3 space-y-2">
              <span className="font-bold text-slate-700 dark:text-slate-200">Akun Login Manajer Klien</span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Nama Manajer</Label>
                  <Input
                    value={addForm.managerName}
                    onChange={(e) => setAddForm({ ...addForm, managerName: e.target.value })}
                    placeholder="Budi Santoso"
                    className="h-8 mt-1 text-xs"
                  />
                </div>
                <div>
                  <Label>Email Login</Label>
                  <Input
                    value={addForm.managerEmail}
                    onChange={(e) => setAddForm({ ...addForm, managerEmail: e.target.value })}
                    placeholder="budi@perusahaan.com"
                    className="h-8 mt-1 text-xs"
                  />
                </div>
              </div>
              <div>
                <Label>Password Default</Label>
                <Input
                  value={addForm.managerPassword}
                  onChange={(e) => setAddForm({ ...addForm, managerPassword: e.target.value })}
                  className="h-8 mt-1 text-xs font-mono"
                />
              </div>
            </div>

            <div className="border-t pt-3 space-y-2">
              <span className="font-bold text-slate-700 dark:text-slate-200">
                Pilih Fitur / Menu yang Dibuka untuk Klien Ini
              </span>
              <p className="text-[11px] text-muted-foreground">
                Centang fitur sesuai kesepakatan B2B. Sidebar klien hanya menampilkan menu yang dipilih di bawah.
              </p>

              <div className="grid grid-cols-2 gap-2 pt-1">
                {AVAILABLE_MODULES.map((mod) => {
                  const isChecked = addForm.enabledMenus.includes(mod.key);
                  const Icon = mod.icon;
                  return (
                    <div
                      key={mod.key}
                      onClick={() => toggleMenu(mod.key, true)}
                      className={`p-2.5 rounded-lg border cursor-pointer flex items-start gap-2.5 transition-all ${
                        isChecked
                          ? "bg-rose-50/50 border-rose-400 text-rose-950 dark:bg-rose-950/20 dark:border-rose-700 dark:text-rose-200"
                          : "bg-muted/20 border-border text-muted-foreground hover:bg-muted/40"
                      }`}
                    >
                      <div className="mt-0.5">
                        {isChecked ? (
                          <CheckSquare className="h-4 w-4 text-rose-600 shrink-0" />
                        ) : (
                          <Square className="h-4 w-4 shrink-0 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-xs leading-tight flex items-center gap-1.5">
                          <Icon className="h-3.5 w-3.5 shrink-0 text-rose-600" />
                          <span className="truncate">{mod.label}</span>
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{mod.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" size="sm" onClick={() => setIsAddModalOpen(false)}>
              Batal
            </Button>
            <Button size="sm" onClick={handleCreateClient} className="bg-rose-600 hover:bg-rose-700 text-white gap-1.5">
              <Sparkles className="h-3.5 w-3.5" /> Terbitkan Akun Klien
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Edit Hak Menu Klien */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="h-5 w-5 text-blue-600" />
              Atur Menu: {editingClient?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 text-xs">
            <div>
              <Label className="font-semibold">Kategori Bisnis Klien</Label>
              <select
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
                className="w-full h-8 mt-1 rounded-md border bg-background px-2 text-xs"
              >
                <option value="transport">Transportasi / Bus &amp; Travel</option>
                <option value="properti">Developer / Properti</option>
                <option value="retail">Retail / UMKM</option>
                <option value="general">Lainnya (General)</option>
              </select>
            </div>

            <div className="space-y-2 pt-2 border-t">
              <Label className="font-semibold">Checklist Menu Aktif</Label>
              <div className="space-y-2">
                {AVAILABLE_MODULES.map((mod) => {
                  const isChecked = editMenus.includes(mod.key);
                  const Icon = mod.icon;
                  return (
                    <div
                      key={mod.key}
                      onClick={() => toggleMenu(mod.key, false)}
                      className={`p-2.5 rounded-lg border cursor-pointer flex items-center justify-between gap-3 transition-all ${
                        isChecked
                          ? "bg-blue-50/50 border-blue-400 text-blue-950 dark:bg-blue-950/20 dark:border-blue-700 dark:text-blue-200"
                          : "bg-muted/20 border-border text-muted-foreground hover:bg-muted/40"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-blue-600 shrink-0" />
                        <div>
                          <p className="font-semibold text-xs leading-tight">{mod.label}</p>
                          <p className="text-[10px] text-muted-foreground">{mod.desc}</p>
                        </div>
                      </div>
                      {isChecked ? (
                        <CheckSquare className="h-4 w-4 text-blue-600 shrink-0" />
                      ) : (
                        <Square className="h-4 w-4 shrink-0 text-muted-foreground" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" size="sm" onClick={() => setIsEditModalOpen(false)}>
              Batal
            </Button>
            <Button size="sm" onClick={handleSaveMenus} className="bg-blue-600 hover:bg-blue-700 text-white">
              Simpan Hak Menu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Detail & Konfigurasi Lengkap Tenant (Dummy & Stateful) */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sliders className="h-5 w-5 text-rose-600" />
              Detail &amp; Konfigurasi Tenant: {selectedTenant?.name}
            </DialogTitle>
          </DialogHeader>

          <Tabs value={detailTab} onValueChange={setDetailTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-4 h-9">
              <TabsTrigger value="general" className="text-xs">Profil Bisnis</TabsTrigger>
              <TabsTrigger value="bot" className="text-xs">AI &amp; Bot</TabsTrigger>
              <TabsTrigger value="waha" className="text-xs">Sesi WAHA</TabsTrigger>
              <TabsTrigger value="limits" className="text-xs">Kuota &amp; Limit</TabsTrigger>
            </TabsList>

            {/* Tab 1: Profil Bisnis */}
            <TabsContent value="general" className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Nama Perusahaan / Brand</Label>
                  <Input
                    value={detailForm.name}
                    onChange={(e) => setDetailForm({ ...detailForm, name: e.target.value })}
                    className="h-8 mt-1 text-xs"
                  />
                </div>
                <div>
                  <Label>Kategori Industri</Label>
                  <select
                    value={detailForm.category}
                    onChange={(e) => setDetailForm({ ...detailForm, category: e.target.value })}
                    className="w-full h-8 mt-1 rounded-md border bg-background px-2 text-xs"
                  >
                    <option value="transport">Transportasi / Bus &amp; Travel</option>
                    <option value="properti">Developer / Properti</option>
                    <option value="retail">Retail / Toko Online</option>
                    <option value="general">Lainnya (General)</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Nomor WhatsApp Resmi Bisnis</Label>
                  <Input
                    value={detailForm.phone}
                    onChange={(e) => setDetailForm({ ...detailForm, phone: e.target.value })}
                    placeholder="628123456789"
                    className="h-8 mt-1 text-xs font-mono"
                  />
                </div>
                <div>
                  <Label>Catatan Khusus Klien (Custom Needs)</Label>
                  <Input
                    value={detailForm.customInstruction}
                    onChange={(e) => setDetailForm({ ...detailForm, customInstruction: e.target.value })}
                    placeholder="Misal: Perlu visualisasi denah kustom 17 seat"
                    className="h-8 mt-1 text-xs"
                  />
                </div>
              </div>
              <div>
                <Label>Alamat / Lokasi Kantor</Label>
                <Input
                  value={detailForm.address}
                  onChange={(e) => setDetailForm({ ...detailForm, address: e.target.value })}
                  placeholder="Alamat kantor klien"
                  className="h-8 mt-1 text-xs"
                />
              </div>
            </TabsContent>

            {/* Tab 2: AI & Bot WhatsApp */}
            <TabsContent value="bot" className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Nama Panggilan Asisten Bot</Label>
                  <Input
                    value={detailForm.agentName}
                    onChange={(e) => setDetailForm({ ...detailForm, agentName: e.target.value })}
                    className="h-8 mt-1 text-xs"
                  />
                </div>
                <div>
                  <Label>Gaya Bicara / Tone Bot</Label>
                  <Input
                    value={detailForm.agentTone}
                    onChange={(e) => setDetailForm({ ...detailForm, agentTone: e.target.value })}
                    className="h-8 mt-1 text-xs"
                  />
                </div>
              </div>
              <div>
                <Label>Model LLM Default</Label>
                <select
                  value={detailForm.aiModel}
                  onChange={(e) => setDetailForm({ ...detailForm, aiModel: e.target.value })}
                  className="w-full h-8 mt-1 rounded-md border bg-background px-2 text-xs"
                >
                  <option value="deepseek/deepseek-v4-flash-0731">DeepSeek v4 Flash (Hemat &amp; Cepat)</option>
                  <option value="openai/gpt-4o-mini">OpenAI GPT-4o Mini (Akurat)</option>
                  <option value="anthropic/claude-3.5-haiku">Claude 3.5 Haiku (Natural Tone)</option>
                </select>
              </div>
              <div>
                <Label>System Prompt Dasar AI</Label>
                <Textarea
                  value={detailForm.systemPrompt}
                  onChange={(e) => setDetailForm({ ...detailForm, systemPrompt: e.target.value })}
                  className="min-h-[90px] mt-1 text-xs leading-relaxed"
                />
              </div>
            </TabsContent>

            {/* Tab 3: Sesi WAHA */}
            <TabsContent value="waha" className="space-y-3 text-xs">
              <div className="p-3 border rounded-lg bg-muted/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">Sesi WhatsApp HTTP API (WAHA)</span>
                  <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-800">
                    Online / Connected
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Instance WAHA yang dialokasikan khusus untuk menerima webhook pesan masuk dan mengirim pesan balasan klien ini.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Nama Instance / Sesi WAHA</Label>
                  <Input
                    value={detailForm.wahaSessionName}
                    onChange={(e) => setDetailForm({ ...detailForm, wahaSessionName: e.target.value })}
                    className="h-8 mt-1 text-xs font-mono"
                  />
                </div>
                <div>
                  <Label>Webhook Endpoint Destination</Label>
                  <Input
                    value="http://103.30.195.145:3030/api/v1/waha/webhook"
                    disabled
                    className="h-8 mt-1 text-xs font-mono bg-muted/40"
                  />
                </div>
              </div>
            </TabsContent>

            {/* Tab 4: Kuota & Limit */}
            <TabsContent value="limits" className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 border rounded-lg space-y-1 bg-muted/20">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">Batas Token AI / Bulan</span>
                  <Input
                    type="number"
                    value={detailForm.monthlyTokenQuota}
                    onChange={(e) => setDetailForm({ ...detailForm, monthlyTokenQuota: e.target.value })}
                    className="h-8 font-mono text-xs mt-1"
                  />
                  <p className="text-[10px] text-muted-foreground">Token OpenRouter / OpenAI</p>
                </div>
                <div className="p-3 border rounded-lg space-y-1 bg-muted/20">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">Maksimum Staf CS / Admin</span>
                  <Input
                    type="number"
                    value={detailForm.maxAdmins}
                    onChange={(e) => setDetailForm({ ...detailForm, maxAdmins: e.target.value })}
                    className="h-8 font-mono text-xs mt-1"
                  />
                  <p className="text-[10px] text-muted-foreground">Jumlah akun agen takeover</p>
                </div>
              </div>
              <div className="p-3 rounded-lg border border-blue-200 bg-blue-50/40 dark:bg-blue-950/20 text-blue-900 dark:text-blue-200">
                <p className="font-semibold text-xs">Pemakaian Token Berjalan:</p>
                <p className="text-[11px] mt-0.5 font-mono">
                  {Number(detailForm.usedTokenCount).toLocaleString()} / {Number(detailForm.monthlyTokenQuota).toLocaleString()} tokens ({Math.round((Number(detailForm.usedTokenCount) / Number(detailForm.monthlyTokenQuota)) * 100)}%)
                </p>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-4">
            <Button variant="outline" size="sm" onClick={() => setIsDetailModalOpen(false)}>
              Batal
            </Button>
            <Button size="sm" onClick={handleSaveTenantDetail} className="bg-rose-600 hover:bg-rose-700 text-white">
              Simpan Konfigurasi Tenant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Tambah Akun Staf / Admin Khusus Tenant */}
      <Dialog open={isAddStaffOpen} onOpenChange={setIsAddStaffOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-indigo-600" />
              Tambah Staf: {selectedTenantForStaff?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3.5 text-xs">
            <p className="text-muted-foreground text-[11px]">
              Buatkan akun staf / agen customer service untuk membantu takeover chat &amp; kelola CRM klien ini.
            </p>
            <div>
              <Label className="font-semibold">Nama Lengkap Staf</Label>
              <Input
                value={staffForm.name}
                onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                placeholder="Contoh: Rian CS"
                className="h-8 mt-1 text-xs"
              />
            </div>
            <div>
              <Label className="font-semibold">Email Login</Label>
              <Input
                value={staffForm.email}
                onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                placeholder="rian@klien.com"
                className="h-8 mt-1 text-xs"
              />
            </div>
            <div>
              <Label className="font-semibold">Password Akun</Label>
              <Input
                value={staffForm.password}
                onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
                className="h-8 mt-1 text-xs font-mono"
              />
            </div>
            <div>
              <Label className="font-semibold">Peran / Role Akun</Label>
              <select
                value={staffForm.role}
                onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })}
                className="w-full h-8 mt-1 rounded-md border bg-background px-2 text-xs"
              >
                <option value="administrator">Administrator / Staf CS (Chat &amp; CRM)</option>
                <option value="manager">Manajer (Full Akses Fitur Klien Ini)</option>
              </select>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" size="sm" onClick={() => setIsAddStaffOpen(false)}>
              Batal
            </Button>
            <Button size="sm" onClick={handleCreateStaff} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              Buat Akun Staf
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
