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
  Bus,
  Search,
  Plus,
  Phone,
  Mail,
  MapPin,
  MessageCircle,
  Trash2,
  Edit2,
  Calendar,
  Users,
  Ticket,
  Clock,
  ArrowRight,
} from "lucide-react";
import { useAppStore } from "@/lib/app-store";

interface ContactData {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  company?: string | null; // Rute / Tujuan (e.g. Jakarta - Surabaya)
  address?: string | null; // Tipe Bus / Kebutuhan (e.g. Pariwisata 45 Seat)
  notes?: string | null;   // Catatan tanggal sewa / jumlah kursi / status pembayaran
  status: string;          // NEW, INQUIRY, BOOKED, COMPLETED, CANCELLED
  source: string;
  createdAt: string;
  updatedAt: string;
  conversations?: any[];
}

const BUS_STATUS_CONFIG: Record<string, { label: string; badge: string }> = {
  NEW: { label: "Tanya Jadwal/Rute", badge: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300" },
  INQUIRY: { label: "Cek Tarif / Nego", badge: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" },
  BOOKED: { label: "Booking Terkonfirmasi", badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" },
  COMPLETED: { label: "Selesai Berangkat", badge: "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300" },
  CANCELLED: { label: "Batal", badge: "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300" },
};

export function CrmPage() {
  const { setView, setActiveContactId } = useAppStore();
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
    route: "",      // mapped to company
    busType: "",    // mapped to address
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
    if (!form.phone.trim()) return;
    try {
      const res = await fetch("/api/v1/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          email: form.email,
          company: form.route,
          address: form.busType,
          notes: form.notes,
          status: form.status,
          source: "BUS_CRM",
        }),
      });
      if (res.ok) {
        setIsAddOpen(false);
        setForm({ name: "", phone: "", email: "", route: "", busType: "", notes: "", status: "NEW" });
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
          name: form.name,
          phone: form.phone,
          email: form.email,
          company: form.route,
          address: form.busType,
          notes: form.notes,
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
    if (!confirm("Hapus data pemesan bus ini?")) return;
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
      route: c.company || "",
      busType: c.address || "",
      notes: c.notes || "",
      status: c.status || "NEW",
    });
    setIsEditOpen(true);
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-6.5rem)] lg:h-[calc(100dvh-5rem)] gap-3">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-700 via-blue-700 to-slate-900 px-6 py-4 text-white shadow-xl shrink-0">
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/20 p-2.5 backdrop-blur-sm">
              <Bus className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Manajemen Penumpang &amp; Sewa Bus (CRM)</h1>
              <p className="text-xs text-blue-100">
                Pencatatan rute, jenis armada, jadwal berangkat, dan status reservasi tiket/carter bus.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            className="bg-white text-blue-800 hover:bg-white/90 gap-1.5 shadow-sm text-xs font-semibold"
            onClick={() => {
              setForm({ name: "", phone: "", email: "", route: "", busType: "", notes: "", status: "NEW" });
              setIsAddOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Booking / Penumpang Baru
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
              placeholder="Cari nama penumpang, no WA, rute perjalanan, atau armada..."
              className="pl-8 h-9 text-xs"
            />
          </div>
          <Tabs value={statusFilter} onValueChange={setStatusFilter}>
            <TabsList className="h-8">
              <TabsTrigger value="ALL" className="text-xs">Semua</TabsTrigger>
              <TabsTrigger value="NEW" className="text-xs">Tanya Jadwal</TabsTrigger>
              <TabsTrigger value="INQUIRY" className="text-xs">Nego Tarif</TabsTrigger>
              <TabsTrigger value="BOOKED" className="text-xs">Booking</TabsTrigger>
              <TabsTrigger value="COMPLETED" className="text-xs">Berangkat</TabsTrigger>
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
              <div className="text-center text-xs text-muted-foreground py-12">Memuat data penumpang bus...</div>
            ) : contacts.length === 0 ? (
              <div className="text-center text-xs text-muted-foreground py-12">Belum ada data penumpang atau sewa bus.</div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-muted/50 border-b text-muted-foreground">
                  <tr>
                    <th className="p-3">Penumpang / Pemesan</th>
                    <th className="p-3">Rute &amp; Armada Bus</th>
                    <th className="p-3">Kontak WA</th>
                    <th className="p-3">Status Reservasi</th>
                    <th className="p-3">Update</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {contacts.map((c) => {
                    const statusMeta = BUS_STATUS_CONFIG[c.status] || { label: c.status, badge: "bg-muted text-foreground" };
                    const isSelected = selectedContact?.id === c.id;
                    return (
                      <tr
                        key={c.id}
                        onClick={() => setSelectedContact(c)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? "bg-indigo-50 dark:bg-indigo-950/30" : "hover:bg-muted/40"
                        }`}
                      >
                        <td className="p-3">
                          <p className="font-semibold text-foreground">{c.name}</p>
                          <p className="text-[11px] text-muted-foreground">{c.address || "Belum pilih bus"}</p>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1 font-medium text-foreground">
                            <Bus className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                            <span>{c.company || "Tanya Rute"}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <p className="font-mono text-muted-foreground">+{c.phone}</p>
                        </td>
                        <td className="p-3">
                          <Badge variant="secondary" className={`text-[10px] ${statusMeta.badge}`}>
                            {statusMeta.label}
                          </Badge>
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {new Date(c.updatedAt).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                          })}
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
                  <Badge variant="secondary" className={`text-[10px] ${(BUS_STATUS_CONFIG[selectedContact.status] || {}).badge}`}>
                    {(BUS_STATUS_CONFIG[selectedContact.status] || {}).label || selectedContact.status}
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

            {/* Info Bus & Rute */}
            <div className="space-y-2.5 text-xs border rounded-lg p-3 bg-muted/20">
              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase">Rute Perjalanan</span>
                <div className="flex items-center gap-1.5 font-medium text-foreground">
                  <MapPin className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                  <span>{selectedContact.company || "Belum ditentukan"}</span>
                </div>
              </div>

              <div className="space-y-1 pt-1 border-t">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase">Tipe Bus / Armada</span>
                <div className="flex items-center gap-1.5 text-foreground">
                  <Bus className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                  <span>{selectedContact.address || "Reguler / Belum Pilih"}</span>
                </div>
              </div>

              <div className="space-y-1 pt-1 border-t">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase">Kontak Pemesan</span>
                <div className="flex items-center gap-1.5 font-mono text-foreground">
                  <Phone className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>+{selectedContact.phone}</span>
                </div>
              </div>
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
              Chat WhatsApp Pemesan
            </Button>

            {/* Catatan / Kebutuhan Bus */}
            <div className="space-y-1">
              <span className="text-xs font-semibold text-muted-foreground">Catatan Sewa / Detail Kursi / Jadwal:</span>
              <div className="p-3 bg-muted/40 rounded-lg text-xs min-h-[70px] whitespace-pre-wrap leading-relaxed">
                {selectedContact.notes || "Belum ada catatan khusus mengenai jadwal keberangkatan atau kapasitas."}
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
              <Bus className="h-5 w-5 text-indigo-600" />
              Catat Penumpang / Reservasi Bus
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-xs">
            <div>
              <label className="font-medium">Nama Penumpang / Pemesan (Wajib)</label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Contoh: Pak Bambang (Rombongan Alumni)"
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
              <label className="font-medium">Rute Perjalanan</label>
              <Input
                value={form.route}
                onChange={(e) => setForm({ ...form, route: e.target.value })}
                placeholder="Contoh: Jakarta - Jogja - Solo (PP)"
                className="h-8 mt-1"
              />
            </div>
            <div>
              <label className="font-medium">Pilihan Armada / Tipe Bus</label>
              <select
                value={form.busType}
                onChange={(e) => setForm({ ...form, busType: e.target.value })}
                className="w-full h-8 mt-1 rounded-md border bg-background px-2 text-xs"
              >
                <option value="">Pilih Tipe Bus...</option>
                <option value="Big Bus HDD (45 - 50 Seat)">Big Bus HDD (45 - 50 Seat)</option>
                <option value="Medium Bus (31 - 35 Seat)">Medium Bus (31 - 35 Seat)</option>
                <option value="Executive Sleeper Bus (22 Seat)">Executive Sleeper Bus (22 Seat)</option>
                <option value="HiAce Premio / Commuter (14 Seat)">HiAce Premio / Commuter (14 Seat)</option>
                <option value="Tiket Reguler Antarkota">Tiket Reguler Antarkota</option>
              </select>
            </div>
            <div>
              <label className="font-medium">Status Pemesanan</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full h-8 mt-1 rounded-md border bg-background px-2 text-xs"
              >
                <option value="NEW">Tanya Jadwal/Rute</option>
                <option value="INQUIRY">Cek Tarif / Nego</option>
                <option value="BOOKED">Booking Terkonfirmasi</option>
                <option value="COMPLETED">Selesai Berangkat</option>
                <option value="CANCELLED">Batal</option>
              </select>
            </div>
            <div>
              <label className="font-medium">Catatan Keberangkatan / Titik Jemput / DP</label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Berangkat tgl 25 Okt jam 06:00, jemput di Pool Cilandak, DP 50% sudah masuk."
                className="min-h-[70px] mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsAddOpen(false)}>Batal</Button>
            <Button size="sm" onClick={handleCreate} className="bg-indigo-600 hover:bg-indigo-700 text-white">Simpan Data Bus</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bus className="h-5 w-5 text-indigo-600" />
              Edit Reservasi Bus
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-xs">
            <div>
              <label className="font-medium">Nama Penumpang / Pemesan</label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="h-8 mt-1"
              />
            </div>
            <div>
              <label className="font-medium">Rute</label>
              <Input
                value={form.route}
                onChange={(e) => setForm({ ...form, route: e.target.value })}
                className="h-8 mt-1"
              />
            </div>
            <div>
              <label className="font-medium">Armada Bus</label>
              <select
                value={form.busType}
                onChange={(e) => setForm({ ...form, busType: e.target.value })}
                className="w-full h-8 mt-1 rounded-md border bg-background px-2 text-xs"
              >
                <option value="">Pilih Tipe Bus...</option>
                <option value="Big Bus HDD (45 - 50 Seat)">Big Bus HDD (45 - 50 Seat)</option>
                <option value="Medium Bus (31 - 35 Seat)">Medium Bus (31 - 35 Seat)</option>
                <option value="Executive Sleeper Bus (22 Seat)">Executive Sleeper Bus (22 Seat)</option>
                <option value="HiAce Premio / Commuter (14 Seat)">HiAce Premio / Commuter (14 Seat)</option>
                <option value="Tiket Reguler Antarkota">Tiket Reguler Antarkota</option>
              </select>
            </div>
            <div>
              <label className="font-medium">Status Pemesanan</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full h-8 mt-1 rounded-md border bg-background px-2 text-xs"
              >
                <option value="NEW">Tanya Jadwal/Rute</option>
                <option value="INQUIRY">Cek Tarif / Nego</option>
                <option value="BOOKED">Booking Terkonfirmasi</option>
                <option value="COMPLETED">Selesai Berangkat</option>
                <option value="CANCELLED">Batal</option>
              </select>
            </div>
            <div>
              <label className="font-medium">Catatan</label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="min-h-[70px] mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsEditOpen(false)}>Batal</Button>
            <Button size="sm" onClick={handleUpdate} className="bg-indigo-600 hover:bg-indigo-700 text-white">Simpan Perubahan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
