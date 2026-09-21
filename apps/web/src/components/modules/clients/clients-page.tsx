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
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Building2,
  Plus,
  Edit2,
  Users,
  MessageCircle,
  Bus,
  Grid3X3,
  Book,
  BellRing,
  Mail,
  Phone,
  Trash2,
  LogIn,
  UserPlus,
  ArrowLeft,
  ArrowRight,
  Check,
  Search,
  KeyRound,
  Shield,
  Bot,
  Layers,
  Sparkles,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/lib/auth-store";
import { useAppStore } from "@/lib/app-store";

// Daftar semua modul yang dapat diaktifkan per klien / akun
const AVAILABLE_MODULES = [
  { key: "chatbot", label: "Bot WhatsApp", icon: MessageCircle, desc: "Chatbot AI & live takeover" },
  { key: "crm", label: "Pelanggan (CRM)", icon: Users, desc: "Manajemen kontak pelanggan" },
  { key: "bus_layout", label: "Denah Kursi Bus", icon: Bus, desc: "Visualisasi denah kursi 17 seats" },
  { key: "availability", label: "Siteplan Properti", icon: Grid3X3, desc: "Denah blok unit kaveling/rumah" },
  { key: "knowledge", label: "Knowledge Base AI", icon: Book, desc: "Pelatihan dokumen untuk asisten AI" },
  { key: "followup", label: "Follow-Up Otomatis", icon: BellRing, desc: "Pengingat otomatis via WhatsApp" },
];

export function ClientsPage() {
  const { loginAsTenant } = useAuthStore();
  const { setView } = useAppStore();
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState("");

  // State untuk Halaman Detail Klien (Master-Detail Pattern)
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Dialog Tambah Klien Baru
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    companyName: "",
    category: "general",
    managerName: "",
    managerEmail: "",
    managerPassword: "Password@123",
    customFeatureNotes: "",
    enabledMenus: ["chatbot", "crm"],
  });

  // Dialog Edit Profil & Konfigurasi Klien
  const [isEditClientModalOpen, setIsEditClientModalOpen] = useState(false);
  const [editClientForm, setEditClientForm] = useState({
    name: "",
    category: "general",
    phone: "",
    address: "",
    agentName: "",
    agentTone: "",
    systemPrompt: "",
    wahaSessionName: "",
  });

  // Dialog Edit Hak Akses Menu Tenant Klien
  const [isEditMenusModalOpen, setIsEditMenusModalOpen] = useState(false);
  const [editMenus, setEditMenus] = useState<string[]>([]);
  const [editCategory, setEditCategory] = useState<string>("general");

  // Dialog Tambah Akun Staf Klien (beserta custom menu per-akun)
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [staffForm, setStaffForm] = useState({
    name: "",
    email: "",
    password: "Password@123",
    role: "administrator",
    allowedMenus: [] as string[],
  });

  // Dialog Edit Akun Staf Klien (Ubah data, role, custom menu, & reset password)
  const [isEditStaffOpen, setIsEditStaffOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);
  const [editStaffForm, setEditStaffForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "administrator",
    isActive: true,
    allowedMenus: [] as string[],
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

  const fetchClientDetail = async (clientId: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/v1/tenant/clients/${clientId}`);
      if (res.ok) {
        const data = await res.json();
        const clientData = data.data || data;
        setSelectedClient(clientData);
      } else {
        toast.error("Gagal memuat detail klien");
      }
    } catch (e) {
      console.error(e);
      toast.error("Gagal memuat detail klien");
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  // Handler: Tambah Klien Baru
  const handleCreateClient = async () => {
    if (!addForm.companyName.trim() || !addForm.managerEmail.trim()) {
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
          category: "general",
          managerName: "",
          managerEmail: "",
          managerPassword: "Password@123",
          customFeatureNotes: "",
          enabledMenus: ["chatbot", "crm"],
        });
        fetchClients();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.message || "Gagal membuat klien baru.");
      }
    } catch (e: any) {
      toast.error(e.message || "Gagal membuat klien baru.");
    }
  };

  // Handler: Hapus Klien
  const handleDeleteClient = async (clientId: string, clientName: string) => {
    if (!confirm(`YAKIN ingin menghapus klien "${clientName}"? Seluruh akun pengguna, data chatbot, dan histori akan dihapus permanen.`)) return;

    try {
      const res = await fetch(`/api/v1/tenant/clients/${clientId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success(`Klien "${clientName}" berhasil dihapus.`);
        setSelectedClient(null);
        fetchClients();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.message || "Gagal menghapus klien.");
      }
    } catch (e: any) {
      toast.error(e.message || "Gagal menghapus klien.");
    }
  };

  // Handler: Buka Modal Edit Klien
  const openEditClientModal = (client: any) => {
    const meta = (client.metadata as any) || {};
    setEditClientForm({
      name: client.name || "",
      category: client.category || "general",
      phone: client.phone || "",
      address: client.address || "",
      agentName: client.agentName || "Asisten AI",
      agentTone: client.agentTone || "ramah dan profesional",
      systemPrompt: client.systemPrompt || "",
      wahaSessionName: meta.wahaSessionName || client.name?.toLowerCase().replace(/\s+/g, "-") || "",
    });
    setIsEditClientModalOpen(true);
  };

  // Handler: Simpan Edit Profil Klien
  const handleSaveClientDetail = async () => {
    if (!selectedClient) return;

    try {
      const res = await fetch(`/api/v1/tenant/clients/${selectedClient.id}/detail`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editClientForm.name,
          category: editClientForm.category,
          phone: editClientForm.phone,
          address: editClientForm.address,
          agentName: editClientForm.agentName,
          agentTone: editClientForm.agentTone,
          systemPrompt: editClientForm.systemPrompt,
          metadata: {
            wahaSessionName: editClientForm.wahaSessionName,
          },
        }),
      });

      if (res.ok) {
        toast.success("Informasi perusahaan berhasil diperbarui!");
        setIsEditClientModalOpen(false);
        fetchClientDetail(selectedClient.id);
        fetchClients();
      } else {
        toast.error("Gagal menyimpan perubahan.");
      }
    } catch (e: any) {
      toast.error(e.message || "Gagal menyimpan perubahan.");
    }
  };

  // Handler: Buka Modal Edit Menu Tenant
  const openEditMenusModal = (client: any) => {
    const meta = (client.metadata as any) || {};
    setEditMenus(meta.enabledMenus || ["chatbot", "crm"]);
    setEditCategory(client.category || "general");
    setIsEditMenusModalOpen(true);
  };

  // Handler: Simpan Menu Tenant
  const handleSaveMenus = async () => {
    if (!selectedClient) return;

    try {
      const res = await fetch(`/api/v1/tenant/clients/${selectedClient.id}/menus`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabledMenus: editMenus,
          category: editCategory,
        }),
      });

      if (res.ok) {
        toast.success("Hak akses menu klien berhasil diperbarui!");
        setIsEditMenusModalOpen(false);
        fetchClientDetail(selectedClient.id);
        fetchClients();
      } else {
        toast.error("Gagal menyimpan menu.");
      }
    } catch (e: any) {
      toast.error(e.message || "Gagal menyimpan menu.");
    }
  };

  // Handler: Buka Modal Buat Akun Staf Baru
  const openAddStaffModal = () => {
    if (!selectedClient) return;
    const meta = (selectedClient.metadata as any) || {};
    const defaultMenus = meta.enabledMenus || ["chatbot", "crm"];
    setStaffForm({
      name: "",
      email: "",
      password: "Password@123",
      role: "administrator",
      allowedMenus: [...defaultMenus],
    });
    setIsAddStaffOpen(true);
  };

  // Handler: Buat Akun Staf Baru
  const handleCreateStaff = async () => {
    if (!selectedClient || !staffForm.email.trim() || !staffForm.name.trim()) {
      toast.error("Nama dan email wajib diisi.");
      return;
    }

    try {
      const res = await fetch(`/api/v1/tenant/clients/${selectedClient.id}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(staffForm),
      });

      if (res.ok) {
        toast.success(`Akun staf "${staffForm.name}" berhasil dibuat!`);
        setIsAddStaffOpen(false);
        fetchClientDetail(selectedClient.id);
        fetchClients();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.message || "Gagal membuat akun staf.");
      }
    } catch (e: any) {
      toast.error(e.message || "Gagal membuat akun staf.");
    }
  };

  // Handler: Buka Modal Edit Staf
  const openEditStaffModal = (staff: any) => {
    setEditingStaff(staff);
    const meta = (selectedClient.metadata as any) || {};
    const defaultMenus = meta.enabledMenus || ["chatbot", "crm"];
    setEditStaffForm({
      name: staff.name || "",
      email: staff.email || "",
      password: "", // Kosong jika tidak ubah password
      role: staff.role || "administrator",
      isActive: staff.isActive ?? true,
      allowedMenus: Array.isArray(staff.allowedMenus) ? [...staff.allowedMenus] : [...defaultMenus],
    });
    setIsEditStaffOpen(true);
  };

  // Handler: Simpan Edit Staf
  const handleUpdateStaff = async () => {
    if (!selectedClient || !editingStaff) return;

    try {
      const res = await fetch(`/api/v1/tenant/clients/${selectedClient.id}/users/${editingStaff.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editStaffForm),
      });

      if (res.ok) {
        toast.success("Akun staf berhasil diperbarui!");
        setIsEditStaffOpen(false);
        fetchClientDetail(selectedClient.id);
        fetchClients();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.message || "Gagal memperbarui akun staf");
      }
    } catch (e: any) {
      toast.error(e.message || "Gagal memperbarui akun staf");
    }
  };

  // Handler: Hapus Akun Staf
  const handleDeleteStaff = async (userId: string, userName: string) => {
    if (!selectedClient) return;
    if (!confirm(`Hapus akun pengguna "${userName}" dari klien ini?`)) return;

    try {
      const res = await fetch(`/api/v1/tenant/clients/${selectedClient.id}/users/${userId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Akun berhasil dihapus!");
        fetchClientDetail(selectedClient.id);
        fetchClients();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.message || "Gagal menghapus akun");
      }
    } catch (e: any) {
      toast.error(e.message || "Gagal menghapus akun");
    }
  };

  // Handler: Masuk / Impersonate Langsung sebagai Pengguna Tertentu
  const handleImpersonateUser = (client: any, user: any) => {
    const tenantUser: any = {
      id: user.id,
      name: user.name || client.name,
      email: user.email,
      role: user.role || "manager",
      status: user.isActive !== false ? "active" : "inactive",
      createdAt: user.createdAt || "2025-01-01",
      lastLogin: new Date().toISOString().slice(0, 16).replace("T", " "),
      tenantId: client.id,
    };
    loginAsTenant(tenantUser);
    toast.success(`Masuk sebagai ${user.name} (${user.role}) - ${client.name}`);
    setView("overview");
  };

  const filteredClients = clients.filter((c) => {
    const query = search.toLowerCase();
    const nameMatch = c.name?.toLowerCase().includes(query);
    const catMatch = c.category?.toLowerCase().includes(query);
    const managerMatch = c.users?.some((u: any) => u.email?.toLowerCase().includes(query) || u.name?.toLowerCase().includes(query));
    return nameMatch || catMatch || managerMatch;
  });

  // =========================================================================
  // VIEW 2: HALAMAN DETAIL KLIEN
  // =========================================================================
  if (selectedClient) {
    const meta = (selectedClient.metadata as any) || {};
    const enabledList = meta.enabledMenus || ["chatbot", "crm"];
    const usersList = selectedClient.users || [];

    // Filter modul yang memang aktif pada tenant ini
    const tenantActiveModules = AVAILABLE_MODULES.filter((m) => enabledList.includes(m.key));

    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        {/* Tombol Navigasi Kembali */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedClient(null)}
            className="text-sm gap-2 -ml-2 text-muted-foreground hover:text-foreground font-medium"
          >
            <ArrowLeft className="h-4 w-4" /> Kembali ke Daftar Klien
          </Button>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 shadow-sm font-semibold"
              onClick={() => {
                const manager = usersList.find((u: any) => u.role === "manager") || usersList[0];
                if (manager) handleImpersonateUser(selectedClient, manager);
              }}
            >
              <LogIn className="h-3.5 w-3.5" /> Akses Sebagai Tenant
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-xs gap-1.5"
              onClick={() => openEditClientModal(selectedClient)}
            >
              <Edit2 className="h-3.5 w-3.5" /> Edit Perusahaan
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-xs gap-1.5"
              onClick={() => openEditMenusModal(selectedClient)}
            >
              <Shield className="h-3.5 w-3.5 text-indigo-600" /> Hak Akses Menu
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
              onClick={() => handleDeleteClient(selectedClient.id, selectedClient.name)}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Hapus Klien
            </Button>
          </div>
        </div>

        {/* Header Klien Card */}
        <Card className="p-6 bg-gradient-to-r from-background via-muted/20 to-background border shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold text-2xl shadow-sm ring-4 ring-emerald-100 dark:ring-emerald-950">
                {selectedClient.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-2xl font-bold tracking-tight text-foreground">{selectedClient.name}</h1>
                  <Badge variant="secondary" className="capitalize text-xs font-semibold px-2.5 py-0.5">
                    {selectedClient.category || "General"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground font-mono mt-1">
                  ID: {selectedClient.id}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs">
              <div className="px-5 py-2.5 rounded-2xl bg-background border shadow-2xs text-center">
                <span className="text-muted-foreground block text-[11px] font-medium">Total Akun Staf</span>
                <strong className="text-lg font-bold text-foreground">{usersList.length} Akun</strong>
              </div>
              <div className="px-5 py-2.5 rounded-2xl bg-background border shadow-2xs text-center">
                <span className="text-muted-foreground block text-[11px] font-medium">Modul Aktif Klien</span>
                <strong className="text-lg font-bold text-emerald-600">{tenantActiveModules.length} Modul</strong>
              </div>
            </div>
          </div>
        </Card>

        {/* Professional, Spacious Navigation Tabs (Fixes Image 1) */}
        <Tabs defaultValue="staff" className="space-y-6">
          <div className="flex items-center border-b pb-3">
            <TabsList className="h-12 p-1.5 bg-muted/60 dark:bg-muted/30 rounded-2xl border flex items-center gap-1.5 w-full sm:w-auto shadow-xs">
              <TabsTrigger
                value="staff"
                className="h-9 px-5 rounded-xl text-sm font-semibold transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs flex items-center gap-2.5 text-muted-foreground hover:text-foreground"
              >
                <Users className="h-4 w-4" />
                <span>Manajemen Akun &amp; Staf</span>
                <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-bold bg-muted dark:bg-muted/60 text-foreground border border-border">
                  {usersList.length}
                </span>
              </TabsTrigger>

              <TabsTrigger
                value="profile"
                className="h-9 px-5 rounded-xl text-sm font-semibold transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs flex items-center gap-2.5 text-muted-foreground hover:text-foreground"
              >
                <Building2 className="h-4 w-4" />
                <span>Profil &amp; Konfigurasi Bot</span>
              </TabsTrigger>

              <TabsTrigger
                value="menus"
                className="h-9 px-5 rounded-xl text-sm font-semibold transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs flex items-center gap-2.5 text-muted-foreground hover:text-foreground"
              >
                <Shield className="h-4 w-4" />
                <span>Hak Akses Fitur Klien</span>
                <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  {tenantActiveModules.length}
                </span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* TAB 1: MANAJEMEN AKUN & STAF (DENGAN CUSTOM AKSES MENU PER AKUN) */}
          <TabsContent value="staff" className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-foreground">Daftar Akun Pengguna &amp; Hak Akses</h3>
                <p className="text-xs text-muted-foreground">
                  Kelola kredensial dan atur secara spesifik menu mana saja yang boleh dibuka oleh masing-masing akun.
                </p>
              </div>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 shadow-sm font-semibold h-9 px-4"
                onClick={openAddStaffModal}
              >
                <UserPlus className="h-4 w-4" /> Tambah Akun Pengguna
              </Button>
            </div>

            <Card className="overflow-hidden border shadow-xs">
              {usersList.length === 0 ? (
                <div className="py-16 text-center text-xs text-muted-foreground">
                  Belum ada akun staf untuk perusahaan ini. Klik tombol di atas untuk membuatkan akun.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-muted/50 border-b text-muted-foreground font-medium">
                      <tr>
                        <th className="p-3.5">Nama Pengguna</th>
                        <th className="p-3.5">Email Login</th>
                        <th className="p-3.5">Peran / Role</th>
                        <th className="p-3.5">Hak Akses Menu Akun</th>
                        <th className="p-3.5">Status</th>
                        <th className="p-3.5">Dibuat</th>
                        <th className="p-3.5 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {usersList.map((u: any) => {
                        const userAllowed = Array.isArray(u.allowedMenus) ? u.allowedMenus : enabledList;
                        const hasFullAccess = enabledList.every((k: string) => userAllowed.includes(k));

                        return (
                          <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                            <td className="p-3.5">
                              <div className="flex items-center gap-2.5">
                                <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold flex items-center justify-center text-xs">
                                  {u.name?.charAt(0).toUpperCase()}
                                </div>
                                <span className="font-semibold text-foreground text-sm">{u.name}</span>
                              </div>
                            </td>
                            <td className="p-3.5 font-mono text-muted-foreground">{u.email}</td>
                            <td className="p-3.5">
                              <Badge
                                variant="outline"
                                className={
                                  u.role === "manager"
                                    ? "border-purple-300 bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 font-bold uppercase text-[10px]"
                                    : "border-blue-300 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 uppercase text-[10px]"
                                }
                              >
                                {u.role}
                              </Badge>
                            </td>
                            <td className="p-3.5">
                              <div className="flex flex-wrap gap-1 max-w-xs">
                                {hasFullAccess ? (
                                  <Badge variant="secondary" className="text-[10px] bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                    ✓ Semua Menu Klien ({userAllowed.length})
                                  </Badge>
                                ) : (
                                  userAllowed.map((mKey: string) => {
                                    const mod = AVAILABLE_MODULES.find((m) => m.key === mKey);
                                    return (
                                      <Badge key={mKey} variant="outline" className="text-[10px] py-0 px-1.5 bg-background">
                                        {mod?.label || mKey}
                                      </Badge>
                                    );
                                  })
                                )}
                              </div>
                            </td>
                            <td className="p-3.5">
                              <span className="inline-flex items-center gap-1.5 font-medium">
                                <span className={`h-2 w-2 rounded-full ${u.isActive !== false ? "bg-emerald-500" : "bg-rose-500"}`} />
                                {u.isActive !== false ? "Aktif" : "Nonaktif"}
                              </span>
                            </td>
                            <td className="p-3.5 text-muted-foreground">
                              {new Date(u.createdAt).toLocaleDateString("id-ID", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </td>
                            <td className="p-3.5 text-right space-x-1 whitespace-nowrap">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-xs text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                                onClick={() => handleImpersonateUser(selectedClient, u)}
                                title="Login langsung sebagai akun ini"
                              >
                                <LogIn className="h-3.5 w-3.5 mr-1" /> Masuk
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                onClick={() => openEditStaffModal(u)}
                                title="Edit Akun & Hak Menu"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                onClick={() => handleDeleteStaff(u.id, u.name)}
                                title="Hapus Akun"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* TAB 2: PROFIL & KONFIGURASI BOT */}
          <TabsContent value="profile" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <Card className="p-5 space-y-3">
                <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-emerald-600" /> Informasi Perusahaan
                </h4>
                <div className="space-y-2.5 pt-2 border-t text-muted-foreground">
                  <div>
                    <span className="text-[11px] font-medium text-foreground block">Alamat / Lokasi:</span>
                    <span>{selectedClient.address || "Belum diatur"}</span>
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-foreground block">Nomor WhatsApp Bisnis:</span>
                    <span className="font-mono">{selectedClient.phone || "Belum diatur"}</span>
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-foreground block">Kategori Bisnis:</span>
                    <span className="capitalize font-semibold text-foreground">{selectedClient.category || "General"}</span>
                  </div>
                </div>
              </Card>

              <Card className="p-5 space-y-3">
                <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                  <Bot className="h-4 w-4 text-blue-600" /> Identitas Asisten AI
                </h4>
                <div className="space-y-2.5 pt-2 border-t text-muted-foreground">
                  <div>
                    <span className="text-[11px] font-medium text-foreground block">Nama Agen Bot:</span>
                    <span className="font-semibold text-foreground">{selectedClient.agentName || "Asisten AI"}</span>
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-foreground block">Tone &amp; Karakter:</span>
                    <span>{selectedClient.agentTone || "Ramah & Profesional"}</span>
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-foreground block">Sesi WAHA Terhubung:</span>
                    <span className="font-mono text-emerald-600 font-semibold">{meta.wahaSessionName || "-"}</span>
                  </div>
                </div>
              </Card>
            </div>

            {selectedClient.systemPrompt && (
              <Card className="p-5 space-y-2 text-xs">
                <span className="font-semibold text-foreground">System Prompt Khusus:</span>
                <p className="p-3 bg-muted/40 rounded-lg whitespace-pre-wrap leading-relaxed text-muted-foreground font-mono text-[11px]">
                  {selectedClient.systemPrompt}
                </p>
              </Card>
            )}
          </TabsContent>

          {/* TAB 3: HAK AKSES FITUR KLIEN */}
          <TabsContent value="menus" className="space-y-4">
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="font-bold text-sm">Modul Fitur yang Diaktifkan untuk Klien Ini</h4>
                  <p className="text-xs text-muted-foreground">
                    Modul ini menentukan menu apa saja yang tersedia untuk perusahaan {selectedClient.name}.
                  </p>
                </div>
                <Button size="sm" variant="outline" className="text-xs" onClick={() => openEditMenusModal(selectedClient)}>
                  Ubah Hak Akses Klien
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {AVAILABLE_MODULES.map((m) => {
                  const isEnabled = enabledList.includes(m.key);
                  const Icon = m.icon;
                  return (
                    <div
                      key={m.key}
                      className={`p-3.5 rounded-xl border flex items-start gap-3 transition-colors ${
                        isEnabled
                          ? "border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20"
                          : "border-border bg-muted/30 opacity-60"
                      }`}
                    >
                      <div className={`p-2 rounded-lg ${isEnabled ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50" : "bg-muted text-muted-foreground"}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-xs text-foreground">{m.label}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{m.desc}</p>
                        <Badge variant={isEnabled ? "default" : "secondary"} className="mt-2 text-[9px] h-4">
                          {isEnabled ? "Aktif" : "Nonaktif"}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        {/* DIALOG: BUAT AKUN STAF BARU DENGAN HAK AKSES MENU PER AKUN */}
        <Dialog open={isAddStaffOpen} onOpenChange={setIsAddStaffOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-emerald-600" />
                Tambah Akun Pengguna
              </DialogTitle>
              <DialogDescription>
                Buatkan akun login baru untuk <strong>{selectedClient.name}</strong> dan pilih menu apa saja yang boleh diakses akun ini.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 text-xs">
              <div className="space-y-1">
                <Label>Nama Lengkap Staf</Label>
                <Input
                  value={staffForm.name}
                  onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                  placeholder="Contoh: Budi Santoso"
                  className="h-8 mt-1"
                />
              </div>

              <div className="space-y-1">
                <Label>Email Login</Label>
                <Input
                  type="email"
                  value={staffForm.email}
                  onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                  placeholder="nama@perusahaan.com"
                  className="h-8 mt-1 font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label>Password Awal</Label>
                <Input
                  type="password"
                  value={staffForm.password}
                  onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
                  className="h-8 mt-1 font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label>Peran / Role Utama</Label>
                <select
                  value={staffForm.role}
                  onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })}
                  className="w-full h-8 mt-1 rounded-md border bg-background px-2 text-xs"
                >
                  <option value="administrator">Administrator (Kelola data &amp; bot)</option>
                  <option value="operator">Operator / CS (Chat &amp; takeover pelanggan)</option>
                  <option value="marketing">Marketing (Broadcast &amp; kampanye)</option>
                  <option value="manager">Manager (Akses manajerial)</option>
                </select>
              </div>

              {/* Checklist Hak Akses Menu Khusus Akun Ini */}
              <div className="pt-2 border-t space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-bold text-foreground">Hak Akses Menu Akun Ini</Label>
                    <p className="text-[11px] text-muted-foreground">
                      Pilih modul yang boleh dibuka oleh staf ini.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-[10px] h-6 px-2 text-emerald-600"
                    onClick={() => {
                      if (staffForm.allowedMenus.length === tenantActiveModules.length) {
                        setStaffForm({ ...staffForm, allowedMenus: [] });
                      } else {
                        setStaffForm({ ...staffForm, allowedMenus: tenantActiveModules.map((m) => m.key) });
                      }
                    }}
                  >
                    {staffForm.allowedMenus.length === tenantActiveModules.length ? "Batal Pilih Semua" : "Pilih Semua"}
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2.5 rounded-xl border bg-muted/20">
                  {tenantActiveModules.map((m) => {
                    const isChecked = staffForm.allowedMenus.includes(m.key);
                    return (
                      <div
                        key={m.key}
                        onClick={() => {
                          const updated = isChecked
                            ? staffForm.allowedMenus.filter((k) => k !== m.key)
                            : [...staffForm.allowedMenus, m.key];
                          setStaffForm({ ...staffForm, allowedMenus: updated });
                        }}
                        className={`p-2.5 rounded-lg border flex items-center justify-between cursor-pointer transition-colors ${
                          isChecked
                            ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-950 dark:text-emerald-200"
                            : "bg-background border-border text-muted-foreground opacity-70"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <m.icon className="h-3.5 w-3.5" />
                          <span className="text-xs font-medium">{m.label}</span>
                        </div>
                        <div className={`h-4 w-4 rounded border flex items-center justify-center ${isChecked ? "bg-emerald-600 border-emerald-600 text-white" : "border-input"}`}>
                          {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setIsAddStaffOpen(false)}>Batal</Button>
              <Button size="sm" onClick={handleCreateStaff} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                Buat Akun Staf
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* DIALOG: EDIT AKUN STAF & HAK AKSES MENU */}
        <Dialog open={isEditStaffOpen} onOpenChange={setIsEditStaffOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit2 className="h-4 w-4 text-emerald-600" />
                Edit Akun &amp; Hak Akses Menu
              </DialogTitle>
              <DialogDescription>
                Ubah informasi profil, role, menu yang boleh diakses, atau reset password akun ini.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 text-xs">
              <div className="space-y-1">
                <Label>Nama Lengkap</Label>
                <Input
                  value={editStaffForm.name}
                  onChange={(e) => setEditStaffForm({ ...editStaffForm, name: e.target.value })}
                  className="h-8 mt-1"
                />
              </div>

              <div className="space-y-1">
                <Label>Email Login</Label>
                <Input
                  type="email"
                  value={editStaffForm.email}
                  onChange={(e) => setEditStaffForm({ ...editStaffForm, email: e.target.value })}
                  className="h-8 mt-1 font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label>Reset Password Baru (Opsional)</Label>
                <Input
                  type="password"
                  placeholder="Kosongkan jika tidak ingin mengubah password"
                  value={editStaffForm.password}
                  onChange={(e) => setEditStaffForm({ ...editStaffForm, password: e.target.value })}
                  className="h-8 mt-1 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Peran / Role</Label>
                  <select
                    value={editStaffForm.role}
                    onChange={(e) => setEditStaffForm({ ...editStaffForm, role: e.target.value })}
                    className="w-full h-8 mt-1 rounded-md border bg-background px-2 text-xs"
                  >
                    <option value="administrator">Administrator</option>
                    <option value="operator">Operator</option>
                    <option value="marketing">Marketing</option>
                    <option value="manager">Manager</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>Status Akun</Label>
                  <select
                    value={editStaffForm.isActive ? "true" : "false"}
                    onChange={(e) => setEditStaffForm({ ...editStaffForm, isActive: e.target.value === "true" })}
                    className="w-full h-8 mt-1 rounded-md border bg-background px-2 text-xs"
                  >
                    <option value="true">Aktif</option>
                    <option value="false">Nonaktif / Suspended</option>
                  </select>
                </div>
              </div>

              {/* Checklist Hak Akses Menu Khusus Akun Ini */}
              <div className="pt-2 border-t space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-bold text-foreground">Hak Akses Menu Akun Ini</Label>
                    <p className="text-[11px] text-muted-foreground">
                      Pilih modul yang boleh dibuka oleh staf ini.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-[10px] h-6 px-2 text-emerald-600"
                    onClick={() => {
                      if (editStaffForm.allowedMenus.length === tenantActiveModules.length) {
                        setEditStaffForm({ ...editStaffForm, allowedMenus: [] });
                      } else {
                        setEditStaffForm({ ...editStaffForm, allowedMenus: tenantActiveModules.map((m) => m.key) });
                      }
                    }}
                  >
                    {editStaffForm.allowedMenus.length === tenantActiveModules.length ? "Batal Pilih Semua" : "Pilih Semua"}
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2.5 rounded-xl border bg-muted/20">
                  {tenantActiveModules.map((m) => {
                    const isChecked = editStaffForm.allowedMenus.includes(m.key);
                    return (
                      <div
                        key={m.key}
                        onClick={() => {
                          const updated = isChecked
                            ? editStaffForm.allowedMenus.filter((k) => k !== m.key)
                            : [...editStaffForm.allowedMenus, m.key];
                          setEditStaffForm({ ...editStaffForm, allowedMenus: updated });
                        }}
                        className={`p-2.5 rounded-lg border flex items-center justify-between cursor-pointer transition-colors ${
                          isChecked
                            ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-950 dark:text-emerald-200"
                            : "bg-background border-border text-muted-foreground opacity-70"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <m.icon className="h-3.5 w-3.5" />
                          <span className="text-xs font-medium">{m.label}</span>
                        </div>
                        <div className={`h-4 w-4 rounded border flex items-center justify-center ${isChecked ? "bg-emerald-600 border-emerald-600 text-white" : "border-input"}`}>
                          {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setIsEditStaffOpen(false)}>Batal</Button>
              <Button size="sm" onClick={handleUpdateStaff} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                Simpan Perubahan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* DIALOG: EDIT PROFIL KLIEN */}
        <Dialog open={isEditClientModalOpen} onOpenChange={setIsEditClientModalOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Informasi Perusahaan</DialogTitle>
              <DialogDescription>Perbarui data profil, kontak bisnis, dan konfigurasi bot klien.</DialogDescription>
            </DialogHeader>

            <div className="space-y-3 text-xs">
              <div>
                <Label>Nama Perusahaan</Label>
                <Input
                  value={editClientForm.name}
                  onChange={(e) => setEditClientForm({ ...editClientForm, name: e.target.value })}
                  className="h-8 mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Kategori Bisnis</Label>
                  <select
                    value={editClientForm.category}
                    onChange={(e) => setEditClientForm({ ...editClientForm, category: e.target.value })}
                    className="w-full h-8 mt-1 rounded-md border bg-background px-2 text-xs"
                  >
                    <option value="general">General / UMKM</option>
                    <option value="properti">Developer Properti</option>
                    <option value="transport">Transportasi / Bus</option>
                  </select>
                </div>
                <div>
                  <Label>Nomor WhatsApp Bisnis</Label>
                  <Input
                    value={editClientForm.phone}
                    onChange={(e) => setEditClientForm({ ...editClientForm, phone: e.target.value })}
                    placeholder="6281234567890"
                    className="h-8 mt-1 font-mono"
                  />
                </div>
              </div>

              <div>
                <Label>Alamat Kantor</Label>
                <Input
                  value={editClientForm.address}
                  onChange={(e) => setEditClientForm({ ...editClientForm, address: e.target.value })}
                  className="h-8 mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Nama Agen Bot</Label>
                  <Input
                    value={editClientForm.agentName}
                    onChange={(e) => setEditClientForm({ ...editClientForm, agentName: e.target.value })}
                    className="h-8 mt-1"
                  />
                </div>
                <div>
                  <Label>Sesi WAHA (Session Name)</Label>
                  <Input
                    value={editClientForm.wahaSessionName}
                    onChange={(e) => setEditClientForm({ ...editClientForm, wahaSessionName: e.target.value })}
                    className="h-8 mt-1 font-mono"
                  />
                </div>
              </div>

              <div>
                <Label>Tone / Karakter Respon AI</Label>
                <Input
                  value={editClientForm.agentTone}
                  onChange={(e) => setEditClientForm({ ...editClientForm, agentTone: e.target.value })}
                  className="h-8 mt-1"
                />
              </div>

              <div>
                <Label>System Prompt Khusus</Label>
                <Textarea
                  value={editClientForm.systemPrompt}
                  onChange={(e) => setEditClientForm({ ...editClientForm, systemPrompt: e.target.value })}
                  rows={3}
                  className="mt-1 text-xs"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setIsEditClientModalOpen(false)}>Batal</Button>
              <Button size="sm" onClick={handleSaveClientDetail} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                Simpan Perubahan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* DIALOG: EDIT HAK AKSES MENU KLIEN */}
        <Dialog open={isEditMenusModalOpen} onOpenChange={setIsEditMenusModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Hak Akses Modul Klien</DialogTitle>
              <DialogDescription>Pilih menu mana saja yang boleh digunakan oleh klien ini.</DialogDescription>
            </DialogHeader>

            <div className="space-y-2 py-2">
              {AVAILABLE_MODULES.map((m) => {
                const isChecked = editMenus.includes(m.key);
                return (
                  <div
                    key={m.key}
                    onClick={() => {
                      if (isChecked) {
                        setEditMenus(editMenus.filter((k) => k !== m.key));
                      } else {
                        setEditMenus([...editMenus, m.key]);
                      }
                    }}
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      isChecked ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/30" : "hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`p-1.5 rounded-lg ${isChecked ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"}`}>
                        <m.icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-xs text-foreground">{m.label}</p>
                        <p className="text-[10px] text-muted-foreground">{m.desc}</p>
                      </div>
                    </div>
                    <div className={`h-5 w-5 rounded-md border flex items-center justify-center ${isChecked ? "bg-emerald-600 border-emerald-600 text-white" : "border-input"}`}>
                      {isChecked && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                    </div>
                  </div>
                );
              })}
            </div>

            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setIsEditMenusModalOpen(false)}>Batal</Button>
              <Button size="sm" onClick={handleSaveMenus} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                Simpan Hak Akses
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // =========================================================================
  // VIEW 1: DAFTAR KLIEN RINGKAS (CLEAN LIST VIEW)
  // =========================================================================
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Halaman Utama */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Kelola Klien &amp; Bisnis</h2>
          <p className="text-sm text-muted-foreground">
            Daftar perusahaan/klien platform. Klik pada perusahaan untuk melihat detail lengkap dan mengelola staf.
          </p>
        </div>

        <Button
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm text-xs gap-1.5 font-semibold h-9 px-4"
          onClick={() => setIsAddModalOpen(true)}
        >
          <Plus className="h-4 w-4" /> Tambah Perusahaan Baru
        </Button>
      </div>

      {/* Filter / Search Bar */}
      <Card className="p-3 shadow-xs">
        <div className="relative max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama perusahaan, kategori, atau email manager..."
            className="pl-8 h-9 text-xs"
          />
        </div>
      </Card>

      {/* Daftar Klien Ringkas */}
      {loading ? (
        <div className="py-20 text-center text-xs text-muted-foreground">Memuat data klien...</div>
      ) : filteredClients.length === 0 ? (
        <Card className="p-12 text-center text-xs text-muted-foreground">
          Tidak ada klien yang cocok dengan pencarian Anda.
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filteredClients.map((client) => {
            const manager = client.users?.find((u: any) => u.role === "manager") || client.users?.[0];
            const staffCount = client.users?.length || 0;
            const categoryBadgeColor =
              client.category === "properti"
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                : client.category === "transport"
                ? "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300"
                : "bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300";

            return (
              <Card
                key={client.id}
                className="p-4 transition-all hover:border-emerald-500/60 hover:shadow-xs group cursor-pointer"
                onClick={() => fetchClientDetail(client.id)}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Info Dasar Perusahaan */}
                  <div className="flex items-center gap-3.5">
                    <div className="h-12 w-12 rounded-xl bg-muted group-hover:bg-emerald-50 dark:group-hover:bg-emerald-950/50 text-foreground group-hover:text-emerald-600 transition-colors flex items-center justify-center font-bold text-lg border shadow-2xs">
                      {client.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-base text-foreground group-hover:text-emerald-600 transition-colors">
                          {client.name}
                        </h3>
                        <Badge variant="secondary" className={`text-[10px] font-medium capitalize ${categoryBadgeColor}`}>
                          {client.category || "General"}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          {manager ? `${manager.name} (${manager.email})` : "Belum ada manager"}
                        </span>
                        <span>•</span>
                        <span className="font-semibold text-foreground">
                          {staffCount} Akun Pengguna
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Tombol Aksi Cepat */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0" onClick={(e) => e.stopPropagation()}>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-8 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border-emerald-600/30 gap-1 font-medium"
                      onClick={() => {
                        const m = client.users?.find((u: any) => u.role === "manager") || client.users?.[0];
                        if (m) handleImpersonateUser(client, m);
                      }}
                    >
                      <LogIn className="h-3.5 w-3.5" /> Akses Sebagai Tenant
                    </Button>
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 gap-1 shadow-2xs font-semibold"
                      onClick={() => fetchClientDetail(client.id)}
                    >
                      Detail <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* DIALOG: TAMBAH KLIEN BARU */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-emerald-600" />
              Tambah Perusahaan Klien Baru
            </DialogTitle>
            <DialogDescription>
              Buat perusahaan klien baru beserta akun manager untuk mengelolanya.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-xs">
            <div>
              <Label>Nama Perusahaan / Bisnis</Label>
              <Input
                value={addForm.companyName}
                onChange={(e) => setAddForm({ ...addForm, companyName: e.target.value })}
                placeholder="Contoh: PT Harmoni Land Properti"
                className="h-8 mt-1"
              />
            </div>

            <div>
              <Label>Kategori Bisnis</Label>
              <select
                value={addForm.category}
                onChange={(e) => setAddForm({ ...addForm, category: e.target.value })}
                className="w-full h-8 mt-1 rounded-md border bg-background px-2 text-xs"
              >
                <option value="general">General / UMKM</option>
                <option value="properti">Developer Properti</option>
                <option value="transport">Transportasi / Bus</option>
              </select>
            </div>

            <div className="pt-2 border-t space-y-2">
              <span className="font-semibold text-foreground">Akun Manager Utama</span>
              <div>
                <Label>Nama Manager</Label>
                <Input
                  value={addForm.managerName}
                  onChange={(e) => setAddForm({ ...addForm, managerName: e.target.value })}
                  placeholder="Contoh: Budi Pratama"
                  className="h-8 mt-1"
                />
              </div>

              <div>
                <Label>Email Manager</Label>
                <Input
                  type="email"
                  value={addForm.managerEmail}
                  onChange={(e) => setAddForm({ ...addForm, managerEmail: e.target.value })}
                  placeholder="manager@perusahaan.com"
                  className="h-8 mt-1 font-mono"
                />
              </div>

              <div>
                <Label>Password Login</Label>
                <Input
                  type="password"
                  value={addForm.managerPassword}
                  onChange={(e) => setAddForm({ ...addForm, managerPassword: e.target.value })}
                  className="h-8 mt-1 font-mono"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsAddModalOpen(false)}>Batal</Button>
            <Button size="sm" onClick={handleCreateClient} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              Simpan Perusahaan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
