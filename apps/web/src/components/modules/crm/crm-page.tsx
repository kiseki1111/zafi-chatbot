"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Users,
  Search,
  Plus,
  Phone,
  Mail,
  MapPin,
  Building2,
  MessageCircle,
  Trash2,
  Edit2,
  FileText,
  Calendar,
  Clock,
} from "lucide-react";
import { useAppStore } from "@/lib/app-store";
import { useAuthStore } from "@/lib/auth-store";

interface ContactData {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  company?: string | null; // Perusahaan / Instansi / Kategori
  address?: string | null; // Alamat / Domisili / Lokasi
  notes?: string | null;   // Catatan kebutuhan / interaksi
  status: string;          // NEW, INQUIRY, BOOKED, COMPLETED, CANCELLED
  source: string;
  createdAt: string;
  updatedAt: string;
  conversations?: any[];
}

const CONTACT_STATUS_CONFIG: Record<string, { label: string; badge: string }> = {
  NEW: {
    label: "Kontak Baru",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  },
  INQUIRY: {
    label: "Prospek / Diskusi",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  },
  BOOKED: {
    label: "Negosiasi / Booking",
    badge: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300",
  },
  COMPLETED: {
    label: "Pelanggan Aktif / Closing",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  },
  CANCELLED: {
    label: "Batal / Tidak Aktif",
    badge: "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
  },
};

export function CrmPage() {
  const { setView, setActiveContactId } = useAppStore();
  const { user } = useAuthStore();
  const [contacts, setContacts] = useState<ContactData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedContact, setSelectedContact] = useState<ContactData | null>(null);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    company: "",
    address: "",
    notes: "",
    status: "NEW",
  });

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      const res = await fetch(`/api/v1/contacts?${params.toString()}`);
      if (!res.ok) return;
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.data || [];
      setContacts(list);
    } catch (e) {
      console.error("Gagal load kontak CRM", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, [search, statusFilter]);

  const handleCreate = async () => {
    if (!form.name.trim() || !form.phone.trim()) return;
    try {
      const res = await fetch("/api/v1/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.trim(),
          email: form.email.trim() || null,
          company: form.company.trim() || null,
          address: form.address.trim() || null,
          notes: form.notes.trim() || null,
          status: form.status,
          source: "CRM",
        }),
      });
      if (res.ok) {
        setIsAddOpen(false);
        setForm({ name: "", phone: "", email: "", company: "", address: "", notes: "", status: "NEW" });
        fetchContacts();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdate = async () => {
    if (!selectedContact) return;
    try {
      const res = await fetch(`/api/v1/contacts/${selectedContact.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.trim(),
          email: form.email.trim() || null,
          company: form.company.trim() || null,
          address: form.address.trim() || null,
          notes: form.notes.trim() || null,
          status: form.status,
        }),
      });
      if (res.ok) {
        setIsEditOpen(false);
        const updated = await res.json();
        const data = updated.data || updated;
        setSelectedContact(data);
        fetchContacts();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus data pelanggan ini?")) return;
    try {
      await fetch(`/api/v1/contacts/${id}`, { method: "DELETE" });
      setSelectedContact(null);
      fetchContacts();
    } catch (e) {
      console.error(e);
    }
  };

  const openEdit = (c: ContactData) => {
    setForm({
      name: c.name || "",
      phone: c.phone || "",
      email: c.email || "",
      company: c.company || "",
      address: c.address || "",
      notes: c.notes || "",
      status: c.status || "NEW",
    });
    setIsEditOpen(true);
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-6.5rem)] lg:h-[calc(100dvh-5rem)] gap-3">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-700 via-teal-700 to-slate-900 px-6 py-4 text-white shadow-xl shrink-0">
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/20 p-2.5 backdrop-blur-sm">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Manajemen Data Pelanggan (CRM)</h1>
              <p className="text-xs text-emerald-100">
                Pencatatan kontak pelanggan, perusahaan/instansi, status prospek, dan riwayat interaksi.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            className="bg-white text-emerald-800 hover:bg-white/90 gap-1.5 shadow-sm text-xs font-semibold"
            onClick={() => {
              setForm({ name: "", phone: "", email: "", company: "", address: "", notes: "", status: "NEW" });
              setIsAddOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Tambah Pelanggan Baru
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <Card className="p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama pelanggan, nomor WA, instansi, atau alamat..."
              className="pl-8 h-9 text-xs"
            />
          </div>
          <Tabs value={statusFilter} onValueChange={setStatusFilter}>
            <TabsList className="h-8">
              <TabsTrigger value="ALL" className="text-xs">Semua</TabsTrigger>
              <TabsTrigger value="NEW" className="text-xs">Kontak Baru</TabsTrigger>
              <TabsTrigger value="INQUIRY" className="text-xs">Prospek</TabsTrigger>
              <TabsTrigger value="BOOKED" className="text-xs">Negosiasi</TabsTrigger>
              <TabsTrigger value="COMPLETED" className="text-xs">Closing</TabsTrigger>
              <TabsTrigger value="CANCELLED" className="text-xs">Batal</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </Card>

      {/* Main Grid: List + Detail */}
      <div className="flex-1 flex gap-3 min-h-0">
        <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="text-center text-xs text-muted-foreground py-12">Memuat data pelanggan...</div>
            ) : contacts.length === 0 ? (
              <div className="text-center text-xs text-muted-foreground py-12">Belum ada data pelanggan yang tersimpan.</div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-muted/50 border-b text-muted-foreground">
                  <tr>
                    <th className="p-3">Nama Pelanggan</th>
                    <th className="p-3">Nomor WhatsApp</th>
                    <th className="p-3">Pertama Kali Chat</th>
                    <th className="p-3">Terakhir Kali Chat</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {contacts.map((c) => {
                    const statusMeta = CONTACT_STATUS_CONFIG[c.status] || {
                      label: c.status,
                      badge: "bg-muted text-foreground",
                    };
                    const isSelected = selectedContact?.id === c.id;
                    const cleanPhone = (c.phone || "")
                      .replace(/@(c\.us|s\.whatsapp\.net|lid|broadcast)$/i, "")
                      .replace(/^\+/, "");
                    const firstChat = (c as any).firstChatAt || c.createdAt;
                    const lastChat = (c as any).lastChatAt || c.conversations?.[0]?.lastMessageAt || c.updatedAt;

                    return (
                      <tr
                        key={c.id}
                        onClick={() => setSelectedContact(c)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? "bg-emerald-50 dark:bg-emerald-950/30" : "hover:bg-muted/40"
                        }`}
                      >
                        <td className="p-3">
                          <p className="font-semibold text-foreground">{c.name || `+${cleanPhone}`}</p>
                          <p className="text-[11px] text-muted-foreground">{c.email || c.notes || "Pelanggan WhatsApp"}</p>
                        </td>
                        <td className="p-3">
                          <p className="font-mono text-muted-foreground font-medium">+{cleanPhone}</p>
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {firstChat ? new Date(firstChat).toLocaleString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }) : "-"}
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {lastChat ? new Date(lastChat).toLocaleString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }) : "-"}
                        </td>
                        <td className="p-3">
                          <Badge variant="secondary" className={`text-[10px] ${statusMeta.badge}`}>
                            {statusMeta.label}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </Card>

        {/* Detail Panel */}
        {selectedContact && (
          <Card className="w-80 lg:w-96 shrink-0 flex flex-col min-h-0 p-4 overflow-y-auto space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-base leading-tight">{selectedContact.name}</h3>
                <div className="flex items-center gap-1.5 mt-1">
                  <Badge
                    variant="secondary"
                    className={`text-[10px] ${(CONTACT_STATUS_CONFIG[selectedContact.status] || {}).badge}`}
                  >
                    {(CONTACT_STATUS_CONFIG[selectedContact.status] || {}).label || selectedContact.status}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(selectedContact)}>
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-600" onClick={() => handleDelete(selectedContact.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Info Pelanggan */}
            <div className="space-y-2.5 text-xs border rounded-lg p-3 bg-muted/20">
              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase">Kontak WhatsApp</span>
                <div className="flex items-center gap-1.5 font-mono text-foreground font-medium">
                  <Phone className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>+{(selectedContact.phone || "").replace(/@(c\.us|s\.whatsapp\.net|lid|broadcast)$/i, "").replace(/^\+/, "")}</span>
                </div>
              </div>

              <div className="space-y-1 pt-1 border-t">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase">Pertama Kali Chat</span>
                <div className="flex items-center gap-1.5 text-foreground">
                  <Calendar className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                  <span>
                    {((selectedContact as any).firstChatAt || selectedContact.createdAt)
                      ? new Date((selectedContact as any).firstChatAt || selectedContact.createdAt).toLocaleString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "-"}
                  </span>
                </div>
              </div>

              <div className="space-y-1 pt-1 border-t">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase">Terakhir Kali Chat</span>
                <div className="flex items-center gap-1.5 text-foreground">
                  <Clock className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>
                    {((selectedContact as any).lastChatAt || selectedContact.conversations?.[0]?.lastMessageAt || selectedContact.updatedAt)
                      ? new Date((selectedContact as any).lastChatAt || selectedContact.conversations?.[0]?.lastMessageAt || selectedContact.updatedAt).toLocaleString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "-"}
                  </span>
                </div>
              </div>

              {selectedContact.email && (
                <div className="space-y-1 pt-1 border-t">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase">Email</span>
                  <div className="flex items-center gap-1.5 text-foreground">
                    <Mail className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                    <span>{selectedContact.email}</span>
                  </div>
                </div>
              )}

              {selectedContact.address && (
                <div className="space-y-1 pt-1 border-t">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase">Alamat / Lokasi</span>
                  <div className="flex items-center gap-1.5 text-foreground">
                    <MapPin className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                    <span>{selectedContact.address}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <Button
              variant="outline"
              className="w-full justify-start text-xs h-8 gap-2 border-emerald-600 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
              onClick={() => {
                if (selectedContact.conversations?.[0]?.id) {
                  setActiveContactId(selectedContact.conversations[0].id);
                }
                setView("chatbot");
              }}
            >
              <MessageCircle className="h-3.5 w-3.5" />
              Chat WhatsApp Pelanggan
            </Button>

            {/* Catatan Pelanggan */}
            <div className="space-y-1">
              <span className="text-xs font-semibold text-muted-foreground">Catatan / Detail Interaksi:</span>
              <div className="p-3 bg-muted/40 rounded-lg text-xs min-h-[70px] whitespace-pre-wrap leading-relaxed">
                {selectedContact.notes || "Belum ada catatan khusus untuk pelanggan ini."}
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Add Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-emerald-600" />
              Tambah Pelanggan Baru
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-xs">
            <div>
              <label className="font-medium">Nama Pelanggan (Wajib)</label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Contoh: Budi Santoso"
                className="h-8 mt-1"
              />
            </div>
            <div>
              <label className="font-medium">Nomor WhatsApp (Wajib)</label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="6281234567890"
                className="h-8 mt-1 font-mono"
              />
            </div>
            <div>
              <label className="font-medium">Email</label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="nama@email.com"
                className="h-8 mt-1"
              />
            </div>
            <div>
              <label className="font-medium">Alamat / Lokasi</label>
              <Input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Contoh: Jl. Ahmad Yani No. 12, Bandung"
                className="h-8 mt-1"
              />
            </div>
            <div>
              <label className="font-medium">Status Pelanggan</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full h-8 mt-1 rounded-md border bg-background px-2 text-xs"
              >
                <option value="NEW">Kontak Baru</option>
                <option value="INQUIRY">Prospek / Diskusi</option>
                <option value="BOOKED">Negosiasi / Booking</option>
                <option value="COMPLETED">Pelanggan Aktif / Closing</option>
                <option value="CANCELLED">Batal / Tidak Aktif</option>
              </select>
            </div>
            <div>
              <label className="font-medium">Catatan / Detail Interaksi</label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Catatan preferensi, kebutuhan produk/layanan, atau jadwal follow-up..."
                className="min-h-[70px] mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsAddOpen(false)}>Batal</Button>
            <Button size="sm" onClick={handleCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white">Simpan Pelanggan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-emerald-600" />
              Edit Data Pelanggan
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-xs">
            <div>
              <label className="font-medium">Nama Pelanggan</label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="h-8 mt-1"
              />
            </div>
            <div>
              <label className="font-medium">Nomor WhatsApp</label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="h-8 mt-1 font-mono"
              />
            </div>
            <div>
              <label className="font-medium">Email</label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="h-8 mt-1"
              />
            </div>
            <div>
              <label className="font-medium">Alamat / Lokasi</label>
              <Input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="h-8 mt-1"
              />
            </div>
            <div>
              <label className="font-medium">Status Pelanggan</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full h-8 mt-1 rounded-md border bg-background px-2 text-xs"
              >
                <option value="NEW">Kontak Baru</option>
                <option value="INQUIRY">Prospek / Diskusi</option>
                <option value="BOOKED">Negosiasi / Booking</option>
                <option value="COMPLETED">Pelanggan Aktif / Closing</option>
                <option value="CANCELLED">Batal / Tidak Aktif</option>
              </select>
            </div>
            <div>
              <label className="font-medium">Catatan / Detail Interaksi</label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="min-h-[70px] mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsEditOpen(false)}>Batal</Button>
            <Button size="sm" onClick={handleUpdate} className="bg-emerald-600 hover:bg-emerald-700 text-white">Simpan Perubahan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
