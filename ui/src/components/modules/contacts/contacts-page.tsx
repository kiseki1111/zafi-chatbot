"use client";

import { useMemo, useState, useEffect } from "react";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Users, Search, Plus, LayoutGrid, Table as TableIcon, Eye, MessageCircle,
  MoreHorizontal, UserPlus, ShoppingBag, Send, RefreshCw, Building2,
  Filter, Tags, Clock, TrendingUp, UserCheck, Sparkles,
} from "lucide-react";
import {
  CONTACTS, ALL_USERS,
} from "@/lib/mock-data";
import type { Contact } from "@/lib/types";
import { useAppStore } from "@/lib/app-store";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type Stage = Contact["stage"];
type StageFilter = "semua" | Stage;
type TagFilter = "semua" | "VIP" | "Cash" | "KPR" | "Investor" | "Sewa";
type ViewMode = "kartu" | "tabel";

const STAGE_LABELS: Record<Stage, string> = {
  lead: "Lead",
  prospect: "Prospek",
  negotiation: "Negosiasi",
  customer: "Customer",
};

const STAGE_BADGE_CLASS: Record<Stage, string> = {
  lead: "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
  prospect: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  negotiation: "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
  customer: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
};

const STAGE_DOT_CLASS: Record<Stage, string> = {
  lead: "bg-sky-500",
  prospect: "bg-amber-500",
  negotiation: "bg-violet-500",
  customer: "bg-emerald-500",
};

const STAGE_ORDER: Stage[] = ["lead", "prospect", "negotiation", "customer"];

const TAG_OPTIONS: TagFilter[] = ["VIP", "Cash", "KPR", "Investor", "Sewa"];

const TAG_CHIP_CLASS: Record<string, string> = {
  VIP: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  Cash: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  KPR: "bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300",
  Investor: "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
  Sewa: "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
};

export function ContactsPage() {
  const { setView, setActiveContactId, setActiveSessionId } = useAppStore();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<StageFilter>("semua");
  const [tagFilter, setTagFilter] = useState<TagFilter>("semua");
  const [viewMode, setViewMode] = useState<ViewMode>("kartu");

  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const [contacts, setContacts] = useState<Contact[]>([]);

  useEffect(() => {
    fetch('/api/v1/chats')
      .then(r => r.json())
      .then(data => {
        let chatsData = data;
        if (data && data.data && Array.isArray(data.data)) chatsData = data.data;
        if (!Array.isArray(chatsData)) return;
        const mapped: Contact[] = chatsData.map((c: any) => ({
          id: c.id,
          instanceName: c.instanceName,
          name: c.contactName || c.contactNumber,
          phone: c.contactNumber,
          stage: c.status === 'OPEN' ? 'lead' : 'customer',
          tags: [],
          assignedTo: c.assignedTo?.name,
          unread: c.unreadCount || 0,
          lastMessage: c.messages?.[0]?.content,
          lastMessageAt: c.lastMessageAt ? new Date(c.lastMessageAt).toLocaleTimeString() : undefined,
          propertyInterest: "Belum ada",
        }));
        setContacts(mapped);
      })
      .catch(console.error);
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return contacts.filter((c) => {
      const matchSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.propertyInterest?.toLowerCase().includes(q) ?? false);
      const matchStage = stageFilter === "semua" || c.stage === stageFilter;
      const matchTag = tagFilter === "semua" || c.tags.includes(tagFilter);
      return matchSearch && matchStage && matchTag;
    });
  }, [contacts, search, stageFilter, tagFilter]);

  const stats = useMemo(() => {
    const total = contacts.length;
    const leadCount = contacts.filter((c) => c.stage === "lead").length;
    const negoCount = contacts.filter((c) => c.stage === "negotiation").length;
    const custCount = contacts.filter((c) => c.stage === "customer").length;
    return { total, leadCount, negoCount, custCount };
  }, [contacts]);

  const stageCounts = useMemo(() => {
    const counts: Record<Stage, number> = { lead: 0, prospect: 0, negotiation: 0, customer: 0 };
    contacts.forEach((c) => {
      counts[c.stage] += 1;
    });
    return counts;
  }, [contacts]);

  const openDetail = (contact: Contact) => {
    setSelectedContact(contact);
    setActiveContactId(contact.id);
    setDetailOpen(true);
  };

  const handleChat = (contact: Contact) => {
    setActiveContactId(contact.id);
    if (contact.instanceName) {
      setActiveSessionId(contact.instanceName);
    }
    setView("chatbot");
  };

  const handleCreate = (data: {
    name: string; phone: string; stage: Stage; tags: string[];
    propertyInterest: string; assignedTo: string;
  }) => {
    const newContact: Contact = {
      id: "c-" + Date.now(),
      name: data.name,
      phone: data.phone,
      tags: data.tags,
      stage: data.stage,
      assignedTo: data.assignedTo,
      propertyInterest: data.propertyInterest,
      lastMessage: "—",
      lastMessageAt: "Baru",
      unread: 0,
    };
    setContacts((prev) => [newContact, ...prev]);
    setCreateOpen(false);
    toast({
      title: "Kontak ditambahkan",
      description: `${newContact.name} berhasil ditambahkan ke CRM.`,
    });
  };

  const updateStage = (contactId: string, stage: Stage) => {
    setContacts((prev) =>
      prev.map((c) => (c.id === contactId ? { ...c, stage } : c)),
    );
    if (selectedContact?.id === contactId) {
      setSelectedContact((prev) => (prev ? { ...prev, stage } : prev));
    }
    toast({
      title: "Stage diperbarui",
      description: `Kontak kini berada di stage "${STAGE_LABELS[stage]}".`,
    });
  };

  const total = stats.total || 1;

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 grid place-items-center">
              <Users className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold leading-tight">Kontak & Leads</h2>
              <p className="text-sm text-muted-foreground">
                {stats.total} kontak · {filtered.length} ditampilkan
              </p>
            </div>
          </div>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white w-full lg:w-auto"
            onClick={() => setCreateOpen(true)}
          >
            <UserPlus className="h-4 w-4" /> Tambah Kontak
          </Button>
        </div>

        {/* Stat strip */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Kontak"
            value={String(stats.total)}
            icon={Users}
            iconBg="bg-emerald-100 dark:bg-emerald-950/40"
            iconColor="text-emerald-600"
            sub="Seluruh CRM"
          />
          <StatCard
            label="Lead Baru"
            value={String(stats.leadCount)}
            icon={Sparkles}
            iconBg="bg-sky-100 dark:bg-sky-950/40"
            iconColor="text-sky-600"
            sub="Perlu di follow up"
          />
          <StatCard
            label="Negosiasi"
            value={String(stats.negoCount)}
            icon={TrendingUp}
            iconBg="bg-violet-100 dark:bg-violet-950/40"
            iconColor="text-violet-600"
            sub="Siap closing"
          />
          <StatCard
            label="Customer"
            value={String(stats.custCount)}
            icon={UserCheck}
            iconBg="bg-teal-100 dark:bg-teal-950/40"
            iconColor="text-teal-600"
            sub="Sudah transaksi"
          />
        </div>

        {/* Pipeline funnel bar */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Pipeline Leads</CardTitle>
                <CardDescription>Distribusi kontak per stage</CardDescription>
              </div>
              <Badge variant="outline" className="text-emerald-600 border-emerald-200">
                {((stats.custCount / total) * 100).toFixed(0)}% konversi
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex h-9 w-full overflow-hidden rounded-lg">
              {STAGE_ORDER.map((stage) => {
                const count = stageCounts[stage];
                const pct = (count / total) * 100;
                const colors: Record<Stage, string> = {
                  lead: "bg-sky-500",
                  prospect: "bg-amber-500",
                  negotiation: "bg-violet-500",
                  customer: "bg-emerald-500",
                };
                return (
                  <Tooltip key={stage}>
                    <TooltipTrigger asChild>
                      <div
                        className={cn("h-full flex items-center justify-center text-[10px] font-semibold text-white transition-all", colors[stage])}
                        style={{ width: `${pct}%` }}
                      >
                        {pct > 8 ? count : ""}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      {STAGE_LABELS[stage]}: {count} kontak ({pct.toFixed(0)}%)
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
              {STAGE_ORDER.map((stage) => {
                const count = stageCounts[stage];
                const pct = ((count / total) * 100).toFixed(0);
                return (
                  <div key={stage} className="rounded-lg border p-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className={cn("h-2 w-2 rounded-full", STAGE_DOT_CLASS[stage])} />
                      <span className="text-xs text-muted-foreground">{STAGE_LABELS[stage]}</span>
                    </div>
                    <p className="text-lg font-bold mt-0.5">{count}</p>
                    <p className="text-[10px] text-muted-foreground">{pct}% dari total</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Filter & view toggle */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari nama, telepon, atau properti…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Select value={stageFilter} onValueChange={(v) => setStageFilter(v as StageFilter)}>
                  <SelectTrigger size="sm" className="w-[140px]">
                    <Filter className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                    <SelectValue placeholder="Stage" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="semua">Semua Stage</SelectItem>
                    {(Object.keys(STAGE_LABELS) as Stage[]).map((s) => (
                      <SelectItem key={s} value={s}>{STAGE_LABELS[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={tagFilter} onValueChange={(v) => setTagFilter(v as TagFilter)}>
                  <SelectTrigger size="sm" className="w-[130px]">
                    <Tags className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                    <SelectValue placeholder="Tag" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="semua">Semua Tag</SelectItem>
                    {TAG_OPTIONS.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="inline-flex items-center rounded-lg border bg-muted/40 p-1">
                  <Button
                    size="sm"
                    variant={viewMode === "kartu" ? "default" : "ghost"}
                    className={cn(
                      "h-7 px-3 text-xs",
                      viewMode === "kartu" && "bg-emerald-600 text-white hover:bg-emerald-700",
                    )}
                    onClick={() => setViewMode("kartu")}
                  >
                    <LayoutGrid className="h-3.5 w-3.5" /> Kartu
                  </Button>
                  <Button
                    size="sm"
                    variant={viewMode === "tabel" ? "default" : "ghost"}
                    className={cn(
                      "h-7 px-3 text-xs",
                      viewMode === "tabel" && "bg-emerald-600 text-white hover:bg-emerald-700",
                    )}
                    onClick={() => setViewMode("tabel")}
                  >
                    <TableIcon className="h-3.5 w-3.5" /> Tabel
                  </Button>
                </div>
              </div>
            </div>
            {filtered.length === 0 && (
              <div className="mt-4 text-center text-sm text-muted-foreground py-8">
                Tidak ada kontak yang cocok dengan filter.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card view */}
        {viewMode === "kartu" && filtered.length > 0 && (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((c) => (
              <ContactCard
                key={c.id}
                contact={c}
                onChat={() => handleChat(c)}
                onDetail={() => openDetail(c)}
                onStageChange={(stage) => updateStage(c.id, stage)}
              />
            ))}
          </div>
        )}

        {/* Table view */}
        {viewMode === "tabel" && filtered.length > 0 && (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="pl-4">Nama</TableHead>
                      <TableHead>Telepon</TableHead>
                      <TableHead>Stage</TableHead>
                      <TableHead>Tags</TableHead>
                      <TableHead>Properti Diminati</TableHead>
                      <TableHead>Ditugaskan ke</TableHead>
                      <TableHead>Pesan Terakhir</TableHead>
                      <TableHead className="text-right pr-4">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((c) => (
                      <TableRow key={c.id} className="cursor-pointer" onClick={() => openDetail(c)}>
                        <TableCell className="pl-4">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-7 w-7">
                              <AvatarFallback className="text-[10px] bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
                                {c.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-sm">{c.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          +{c.phone}
                        </TableCell>
                        <TableCell>
                          <StageBadge stage={c.stage} />
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {c.tags.map((t) => (
                              <Badge key={t} variant="secondary" className={cn("text-[9px] h-4 px-1", TAG_CHIP_CLASS[t] ?? "")}>
                                {t}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground truncate max-w-[160px]">
                          {c.propertyInterest ?? "—"}
                        </TableCell>
                        <TableCell className="text-sm">{c.assignedTo ?? "—"}</TableCell>
                        <TableCell className="max-w-[200px]">
                          <p className="text-xs text-muted-foreground truncate">{c.lastMessage ?? "—"}</p>
                          <p className="text-[10px] text-muted-foreground">{c.lastMessageAt}</p>
                        </TableCell>
                        <TableCell className="text-right pr-4">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleChat(c);
                            }}
                          >
                            <MessageCircle className="h-3.5 w-3.5" /> Chat
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Detail Dialog */}
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            {selectedContact && (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-lg font-semibold">
                        {selectedContact.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <DialogTitle className="truncate">{selectedContact.name}</DialogTitle>
                      <DialogDescription>+{selectedContact.phone}</DialogDescription>
                    </div>
                    <StageBadge stage={selectedContact.stage} />
                  </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto pr-2 min-h-0">
                  <div className="space-y-4">
                    {/* Quick facts */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg border bg-muted/30 p-3">
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Building2 className="h-3 w-3" /> Properti Diminati
                        </p>
                        <p className="text-sm font-medium mt-1">{selectedContact.propertyInterest ?? "—"}</p>
                      </div>
                      <div className="rounded-lg border bg-muted/30 p-3">
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <UserCheck className="h-3 w-3" /> Ditugaskan ke
                        </p>
                        <p className="text-sm font-medium mt-1">{selectedContact.assignedTo ?? "—"}</p>
                      </div>
                    </div>

                    {/* Tags */}
                    <div className="rounded-lg border p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Tags</p>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedContact.tags.length === 0 ? (
                          <span className="text-xs text-muted-foreground">Tidak ada tag</span>
                        ) : (
                          selectedContact.tags.map((t) => (
                            <Badge key={t} variant="secondary" className={cn("text-xs", TAG_CHIP_CLASS[t] ?? "")}>
                              {t}
                            </Badge>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Activity timeline */}
                    <div className="rounded-lg border p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" /> Riwayat Aktivitas
                      </p>
                      <ContactTimeline contact={selectedContact} />
                    </div>

                    {/* Notes */}
                    <div className="rounded-lg border p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Catatan</p>
                      <p className="text-sm text-muted-foreground italic">
                        "{selectedContact.stage === "customer"
                          ? "Klien setia, potensi repeat order tinggi. Pertahankan hubungan jangka panjang."
                          : selectedContact.stage === "negotiation"
                            ? "Sedang dalam tahap negosiasi harga. Siapkan simulasi cicilan & opsi alternatif."
                            : "Lead kualitas tinggi. Segera follow up dengan jadwal survey properti."}"
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Action buttons */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setDetailOpen(false);
                      setView("orders");
                    }}
                  >
                    <ShoppingBag className="h-3.5 w-3.5" /> Buat Order
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() =>
                      toast({
                        title: "Membuka WhatsApp",
                        description: `Mengarahkan ke https://wa.me/${selectedContact.phone} (demo).`,
                      })
                    }
                  >
                    <Send className="h-3.5 w-3.5" /> Kirim WhatsApp
                  </Button>
                  <Select
                    value={selectedContact.stage}
                    onValueChange={(v) => updateStage(selectedContact.id, v as Stage)}
                  >
                    <SelectTrigger size="sm" className="flex-1">
                      <RefreshCw className="h-3.5 w-3.5" />
                      <SelectValue placeholder="Ubah Stage" />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(STAGE_LABELS) as Stage[]).map((s) => (
                        <SelectItem key={s} value={s}>{STAGE_LABELS[s]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Create Contact Dialog */}
        <CreateContactDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          onSubmit={handleCreate}
        />
      </div>
    </TooltipProvider>
  );
}

// ===== Subcomponents =====

function StageBadge({ stage }: { stage: Stage }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
        STAGE_BADGE_CLASS[stage],
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", STAGE_DOT_CLASS[stage])} />
      {STAGE_LABELS[stage]}
    </span>
  );
}

function StatCard({
  label, value, icon: Icon, iconBg, iconColor, sub,
}: {
  label: string; value: string; icon: typeof Users;
  iconBg: string; iconColor: string; sub?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{label}</p>
          <div className={cn("h-7 w-7 rounded-lg grid place-items-center", iconBg)}>
            <Icon className={cn("h-4 w-4", iconColor)} />
          </div>
        </div>
        <p className="text-xl font-bold tracking-tight mt-2">{value}</p>
        {sub && <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function ContactCard({
  contact, onChat, onDetail, onStageChange,
}: {
  contact: Contact;
  onChat: () => void;
  onDetail: () => void;
  onStageChange: (stage: Stage) => void;
}) {
  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="relative">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold">
                {contact.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold text-sm truncate">{contact.name}</p>
              <StageBadge stage={contact.stage} />
            </div>
            <p className="text-xs text-muted-foreground">+{contact.phone}</p>
          </div>
        </div>

        {/* Tags */}
        {contact.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {contact.tags.map((t) => (
              <Badge key={t} variant="secondary" className={cn("text-[10px] h-5 px-1.5", TAG_CHIP_CLASS[t] ?? "")}>
                {t}
              </Badge>
            ))}
          </div>
        )}

        {/* Property interest */}
        {contact.propertyInterest && (
          <div className="flex items-center gap-1.5 text-xs">
            <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground truncate">{contact.propertyInterest}</span>
          </div>
        )}

        {/* Assigned */}
        {contact.assignedTo && (
          <div className="flex items-center gap-1.5 text-xs">
            <UserCheck className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground truncate">{contact.assignedTo}</span>
          </div>
        )}

        {/* Last message */}
        <div className="rounded-md bg-muted/40 p-2">
          <p className="text-xs text-muted-foreground line-clamp-2">{contact.lastMessage ?? "Belum ada pesan"}</p>
          <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
            <Clock className="h-2.5 w-2.5" /> {contact.lastMessageAt}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 pt-1">
          <Button
            size="sm"
            className="flex-1 h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={onChat}
          >
            <MessageCircle className="h-3.5 w-3.5" /> Chat
          </Button>
          <Button size="sm" variant="outline" className="h-8 px-3" onClick={onDetail}>
            <Eye className="h-3.5 w-3.5" /> Detail
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Ubah Stage</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {(Object.keys(STAGE_LABELS) as Stage[]).map((s) => (
                <DropdownMenuItem key={s} onClick={() => onStageChange(s)}>
                  <span className={cn("h-2 w-2 rounded-full mr-2", STAGE_DOT_CLASS[s])} />
                  {STAGE_LABELS[s]}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDetail}>
                <Eye className="h-3.5 w-3.5 mr-2" /> Lihat Detail
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}

function DropdownMenuLabel({ children }: { children: React.ReactNode }) {
  return <p className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{children}</p>;
}

function ContactTimeline({ contact }: { contact: Contact }) {
  // Mock timeline based on stage
  const baseTime = "2 hari lalu";
  const events: { label: string; meta: string; done: boolean; tone: Stage }[] = [
    { label: "Lead masuk", meta: "via WhatsApp (AI filter)", done: true, tone: "lead" },
    { label: "Dihubungi pertama kali", meta: baseTime, done: contact.stage !== "lead", tone: "prospect" },
    { label: "Survey properti", meta: contact.propertyInterest ?? "—", done: ["negotiation", "customer"].includes(contact.stage), tone: "negotiation" },
    { label: "Negosiasi harga", meta: "Menunggu persetujuan", done: contact.stage === "negotiation" || contact.stage === "customer", tone: "negotiation" },
    { label: "Closing", meta: contact.stage === "customer" ? "Selesai" : "Pending", done: contact.stage === "customer", tone: "customer" },
  ];
  return (
    <ol className="space-y-3">
      {events.map((e, i) => (
        <li key={i} className="flex gap-3">
          <div className="flex flex-col items-center">
            <span className={cn("h-2.5 w-2.5 rounded-full mt-1", e.done ? STAGE_DOT_CLASS[e.tone] : "bg-muted-foreground/30")} />
            {i < events.length - 1 && <span className="flex-1 w-px bg-border min-h-[18px]" />}
          </div>
          <div className="pb-1">
            <p className={cn("text-sm", e.done ? "font-medium" : "text-muted-foreground")}>{e.label}</p>
            <p className="text-[11px] text-muted-foreground">{e.meta}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function CreateContactDialog({
  open, onOpenChange, onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (data: {
    name: string; phone: string; stage: Stage; tags: string[];
    propertyInterest: string; assignedTo: string;
  }) => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [stage, setStage] = useState<Stage>("lead");
  const [tagsInput, setTagsInput] = useState("");
  const [propertyInterest, setPropertyInterest] = useState("");
  const [assignedTo, setAssignedTo] = useState("");

  const reset = () => {
    setName(""); setPhone(""); setStage("lead");
    setTagsInput(""); setPropertyInterest(""); setAssignedTo("");
  };

  const handleSubmit = () => {
    if (!name.trim() || !phone.trim()) return;
    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    onSubmit({
      name: name.trim(),
      phone: phone.trim(),
      stage,
      tags,
      propertyInterest: propertyInterest.trim(),
      assignedTo,
    });
    reset();
  };

  // Unique assignee names from existing contacts + all users
  const assignees = useMemo(() => {
    const fromContacts = new Set(CONTACTS.map((c) => c.assignedTo).filter(Boolean) as string[]);
    ALL_USERS.forEach((u) => fromContacts.add(u.name));
    return Array.from(fromContacts);
  }, []);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tambah Kontak Baru</DialogTitle>
          <DialogDescription>
            Daftarkan lead atau kontak baru ke CRM Anda.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Nama Lengkap</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="cth. Rina Marlina"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Nomor WhatsApp</Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="cth. 6285212345xxx"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Stage Awal</Label>
              <Select value={stage} onValueChange={(v) => setStage(v as Stage)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(STAGE_LABELS) as Stage[]).map((s) => (
                    <SelectItem key={s} value={s}>{STAGE_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Ditugaskan ke</Label>
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih agent" />
                </SelectTrigger>
                <SelectContent>
                  {assignees.map((a) => (
                    <SelectItem key={a} value={a}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Tags (pisahkan dengan koma)</Label>
            <Input
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="cth. VIP, Cash, KPR"
            />
            {tagsInput && (
              <div className="flex flex-wrap gap-1 mt-1">
                {tagsInput.split(",").map((t, i) => {
                  const tag = t.trim();
                  if (!tag) return null;
                  return (
                    <Badge key={i} variant="secondary" className={cn("text-[10px]", TAG_CHIP_CLASS[tag] ?? "")}>
                      {tag}
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Properti Diminati (opsional)</Label>
            <Input
              value={propertyInterest}
              onChange={(e) => setPropertyInterest(e.target.value)}
              placeholder="cth. Rumah Cibaduyut"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            disabled={!name.trim() || !phone.trim()}
            onClick={handleSubmit}
          >
            <Plus className="h-4 w-4" /> Tambah Kontak
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
