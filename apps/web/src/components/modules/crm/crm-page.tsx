"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
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
  ChevronRight,
  Copy,
} from "lucide-react";
import { useAppStore } from "@/lib/app-store";
import { useAuthStore } from "@/lib/auth-store";
import { MOCK_CRM_CONTACTS } from "@/lib/mock-data";

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

const STATUS_FILTER_CHIPS = [
  { key: "ALL", label: "Semua" },
  { key: "NEW", label: "Baru" },
  { key: "INQUIRY", label: "Prospek" },
  { key: "BOOKED", label: "Negosiasi" },
  { key: "COMPLETED", label: "Aktif" },
  { key: "CANCELLED", label: "Batal" },
] as const;

function formatRelativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  if (isNaN(then)) return "-";
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Baru saja";
  if (diffMin < 60) return `${diffMin} menit lalu`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} jam lalu`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) return `${diffDay} hari lalu`;
  const diffMonth = Math.floor(diffDay / 30);
  if (diffMonth < 12) return `${diffMonth} bulan lalu`;
  return `${Math.floor(diffMonth / 12)} tahun lalu`;
}

export function CrmPage() {
  const { setView, setActiveContactId } = useAppStore();
  const { user } = useAuthStore();
  const [contacts, setContacts] = useState<ContactData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedContact, setSelectedContact] = useState<ContactData | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

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

  // Derived: contacts filtered by status chip (mobile filter)
  const filteredContacts = statusFilter === "ALL"
    ? contacts
    : contacts.filter((c) => c.status === statusFilter);

  const fetchContacts = async () => {
    setLoading(true);
    let list: ContactData[] = [];
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const res = await fetch(`/api/v1/contacts?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        list = Array.isArray(data) ? data : data.data || [];
      }
    } catch (e) {
      console.error("Gagal load kontak CRM, gunakan data mockup", e);
    } finally {
      const isDemoAccount =
        user?.id?.startsWith("u-") ||
        user?.email?.includes("demo") ||
        (process.env.NODE_ENV !== "production" && !user?.tenantId);

      if (list.length === 0 && isDemoAccount) {
        // Mock fallback filtered by search untuk mode demo / preview
        let mockFiltered = MOCK_CRM_CONTACTS;
        if (search) {
          const q = search.toLowerCase();
          mockFiltered = mockFiltered.filter(
            (c) =>
              c.name.toLowerCase().includes(q) ||
              c.phone.includes(q) ||
              (c.company && c.company.toLowerCase().includes(q)) ||
              (c.notes && c.notes.toLowerCase().includes(q))
          );
        }
        setContacts(mockFiltered);
      } else {
        setContacts(list);
      }
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, [search]);

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
        return;
      }
    } catch (e) {
      console.error(e);
    }
    // Mock fallback creation
    const newMock: ContactData = {
      id: "crm-mock-" + Date.now(),
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || null,
      company: form.company.trim() || null,
      address: form.address.trim() || null,
      notes: form.notes.trim() || null,
      status: form.status,
      source: "Manual",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setContacts((prev) => [newMock, ...prev]);
    setIsAddOpen(false);
    setForm({ name: "", phone: "", email: "", company: "", address: "", notes: "", status: "NEW" });
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
      {/* Header - Compact & Clean (No bloated explanation) */}
      <div className="rounded-xl border bg-card p-4 sm:p-5 shadow-xs shrink-0">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-9 w-9 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 grid place-items-center shrink-0">
              <Users className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground truncate">
                Pelanggan &amp; Leads
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {contacts.length} kontak terdaftar
              </p>
            </div>
          </div>
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-xs text-xs font-semibold h-8 px-3 shrink-0"
            onClick={() => {
              setForm({ name: "", phone: "", email: "", company: "", address: "", notes: "", status: "NEW" });
              setIsAddOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Tambah Pelanggan</span>
            <span className="sm:hidden">Tambah</span>
          </Button>
        </div>
      </div>

      {/* Search bar - General (Tanpa klasifikasi/tab yang meluber) */}
      <div className="relative shrink-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama pelanggan, nomor WhatsApp, atau catatan..."
          className="pl-9 h-10 text-xs bg-card border rounded-xl shadow-2xs"
        />
      </div>

      {/* Mobile Status Filter Chips (md:hidden) */}
      <div className="md:hidden shrink-0 -mx-1 px-1 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1.5 pb-0.5">
          {STATUS_FILTER_CHIPS.map((chip) => (
            <button
              key={chip.key}
              onClick={() => setStatusFilter(chip.key)}
              className={cn(
                "shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                statusFilter === chip.key
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                  : "bg-card text-muted-foreground border-border hover:bg-muted/60"
              )}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: List + Detail */}
      <div className="flex-1 flex gap-3 min-h-0">
        <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-border/40">
                    <div className="flex items-center gap-3 w-1/3">
                      <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                      <div className="space-y-1.5 w-full">
                        <Skeleton className="h-3.5 w-32" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                    <Skeleton className="h-3 w-28" />
                    <Skeleton className="h-3 w-24 hidden md:block" />
                    <Skeleton className="h-3 w-24 hidden lg:block" />
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>
                ))}
              </div>
            ) : contacts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                <div className="h-16 w-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 grid place-items-center mb-4 text-emerald-600 shadow-sm">
                  <Users className="h-8 w-8" />
                </div>
                <h4 className="text-sm font-semibold text-foreground">Belum Ada Data Pelanggan</h4>
                <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-5 leading-relaxed">
                  Semua nomor WhatsApp yang menghubungi asisten bot Anda akan dicatat otomatis di sini. Anda juga dapat menambahkan kontak pelanggan baru secara manual.
                </p>
                <Button
                  size="sm"
                  onClick={() => setIsAddOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 shadow-sm"
                >
                  <Plus className="h-3.5 w-3.5" /> Tambah Pelanggan Pertama
                </Button>
              </div>
            ) : (
              <>
                {/* Mobile Touch Cards View (md:hidden) */}
                <div className="md:hidden divide-y">
                  {filteredContacts.map((c) => {
                    const statusMeta = CONTACT_STATUS_CONFIG[c.status] || {
                      label: c.status,
                      badge: "bg-muted text-foreground",
                    };
                    const isSelected = selectedContact?.id === c.id;
                    const cleanPhone = (c.phone || "")
                      .replace(/@(c\.us|s\.whatsapp\.net|lid|broadcast)$/i, "")
                      .replace(/^\+/, "");
                    const lastChat = (c as any).lastChatAt || c.conversations?.[0]?.lastMessageAt || c.updatedAt;

                    return (
                      <div
                        key={c.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedContact(c)}
                        className={cn(
                          "p-3.5 flex items-center justify-between transition-colors active:bg-muted/70 cursor-pointer select-none min-h-[64px]",
                          isSelected ? "bg-emerald-500/10" : ""
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <Avatar className="h-11 w-11 shrink-0 ring-1 ring-border">
                            <AvatarFallback className="text-sm font-bold bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
                              {c.name ? c.name.charAt(0).toUpperCase() : "P"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1 pr-2">
                            <p className="font-semibold text-sm text-foreground truncate">{c.name || `+${cleanPhone}`}</p>
                            <p className="font-mono text-xs text-muted-foreground mt-0.5">+{cleanPhone}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="secondary" className={cn("text-[9px] px-1.5 py-0 h-4 shrink-0 font-medium", statusMeta.badge)}>
                                {statusMeta.label}
                              </Badge>
                              {c.company && (
                                <span className="flex items-center gap-1 text-[10px] text-muted-foreground truncate">
                                  <Building2 className="h-3 w-3 shrink-0" />
                                  <span className="truncate">{c.company}</span>
                                </span>
                              )}
                            </div>
                            {lastChat && (
                              <p className="text-[10px] text-muted-foreground/70 mt-0.5 flex items-center gap-1">
                                <Clock className="h-2.5 w-2.5 shrink-0" />
                                {formatRelativeTime(lastChat)}
                              </p>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      </div>
                    );
                  })}
                  {filteredContacts.length === 0 && statusFilter !== "ALL" && (
                    <div className="py-10 text-center text-xs text-muted-foreground">
                      Tidak ada kontak dengan status ini.
                    </div>
                  )}
                </div>

                {/* Desktop Table View (hidden md:table) */}
                <table className="hidden md:table w-full text-left text-xs border-collapse">
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
                          className={`cursor-pointer transition-all duration-150 ease-out select-none ${
                            isSelected ? "bg-emerald-50 dark:bg-emerald-950/30" : "hover:bg-muted/60"
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
              </>
            )}
          </div>
        </Card>

        {/* Desktop Detail Panel (hidden on mobile) */}
        {selectedContact && (
          <Card className="hidden md:flex w-80 lg:w-96 shrink-0 flex-col min-h-0 p-4 overflow-y-auto space-y-4">
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
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(selectedContact)}>
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-600" onClick={() => handleDelete(selectedContact.id)}>
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
              className="w-full justify-start text-xs h-9 gap-2 border-emerald-600 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 font-medium"
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

      {/* Mobile Contact Detail Sheet (md:hidden) */}
      <Sheet open={!!selectedContact} onOpenChange={(open) => !open && setSelectedContact(null)}>
        <SheetContent side="bottom" className="p-4 rounded-t-2xl max-h-[85vh] overflow-y-auto md:hidden space-y-4">
          {selectedContact && (() => {
            const mobileCleanPhone = (selectedContact.phone || "")
              .replace(/@(c\.us|s\.whatsapp\.net|lid|broadcast)$/i, "")
              .replace(/^\+/, "");
            const mobileFirstChat = (selectedContact as any).firstChatAt || selectedContact.createdAt;
            const mobileLastChat = (selectedContact as any).lastChatAt || selectedContact.conversations?.[0]?.lastMessageAt || selectedContact.updatedAt;

            return (
              <>
                <SheetHeader className="text-left pb-2 border-b">
                  <div className="flex items-start justify-between">
                    <div>
                      <SheetTitle className="text-base font-bold leading-tight">{selectedContact.name}</SheetTitle>
                      <Badge
                        variant="secondary"
                        className={`text-[10px] mt-1 ${(CONTACT_STATUS_CONFIG[selectedContact.status] || {}).badge}`}
                      >
                        {(CONTACT_STATUS_CONFIG[selectedContact.status] || {}).label || selectedContact.status}
                      </Badge>
                    </div>
                  </div>
                </SheetHeader>

                {/* Quick Action Buttons Row */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-10 text-xs gap-1.5 border-emerald-600 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 font-medium"
                    onClick={() => {
                      if (selectedContact.conversations?.[0]?.id) {
                        setActiveContactId(selectedContact.conversations[0].id);
                      }
                      setSelectedContact(null);
                      setView("chatbot");
                    }}
                  >
                    <MessageCircle className="h-4 w-4" />
                    WhatsApp
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-10 w-10 p-0 shrink-0"
                    onClick={() => {
                      navigator.clipboard.writeText(`+${mobileCleanPhone}`);
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-10 w-10 p-0 shrink-0"
                    onClick={() => openEdit(selectedContact)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* Contact Info */}
                <div className="space-y-2.5 text-xs border rounded-xl p-3 bg-muted/20">
                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase">Kontak WhatsApp</span>
                    <div className="flex items-center gap-1.5 font-mono text-foreground font-medium text-base">
                      <Phone className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>+{mobileCleanPhone}</span>
                    </div>
                  </div>

                  {selectedContact.email && (
                    <div className="space-y-1 pt-1.5 border-t">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase">Email</span>
                      <div className="flex items-center gap-1.5 text-foreground">
                        <Mail className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                        <span>{selectedContact.email}</span>
                      </div>
                    </div>
                  )}

                  {selectedContact.company && (
                    <div className="space-y-1 pt-1.5 border-t">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase">Perusahaan</span>
                      <div className="flex items-center gap-1.5 text-foreground">
                        <Building2 className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                        <span>{selectedContact.company}</span>
                      </div>
                    </div>
                  )}

                  {selectedContact.address && (
                    <div className="space-y-1 pt-1.5 border-t">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase">Lokasi / Alamat</span>
                      <div className="flex items-center gap-1.5 text-foreground">
                        <MapPin className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                        <span>{selectedContact.address}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Activity Timeline */}
                <div className="space-y-2 border rounded-xl p-3 bg-muted/20">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase">Riwayat Aktivitas</span>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-2 text-foreground">
                      <Calendar className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                      <span className="text-muted-foreground">Pertama kali chat:</span>
                      <span className="font-medium">
                        {mobileFirstChat
                          ? new Date(mobileFirstChat).toLocaleString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : "-"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-foreground">
                      <Clock className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span className="text-muted-foreground">Terakhir kali chat:</span>
                      <span className="font-medium">
                        {mobileLastChat
                          ? new Date(mobileLastChat).toLocaleString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : "-"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-foreground">
                      <FileText className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                      <span className="text-muted-foreground">Sumber:</span>
                      <span className="font-medium">{selectedContact.source || "-"}</span>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-muted-foreground">Catatan Prospek:</span>
                  <div className="p-3 bg-muted/40 rounded-xl text-xs min-h-[60px] whitespace-pre-wrap leading-relaxed">
                    {selectedContact.notes || "Belum ada catatan khusus untuk pelanggan ini."}
                  </div>
                </div>

                {/* Delete Button */}
                <Button
                  variant="outline"
                  className="w-full text-xs h-10 gap-2 border-rose-200 dark:border-rose-800 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 font-medium mt-2"
                  onClick={() => handleDelete(selectedContact.id)}
                >
                  <Trash2 className="h-4 w-4" />
                  Hapus Pelanggan
                </Button>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>

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
