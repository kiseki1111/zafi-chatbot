"use client";

import { useMemo, useState } from "react";
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
import { Separator } from "@/components/ui/separator";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ShoppingBag, Search, Plus, LayoutGrid, Table as TableIcon, Eye,
  Phone, Printer, User, Building2, CalendarDays, Clock, TrendingUp,
  Loader2, ArrowUpRight, CheckCircle2, Filter,
} from "lucide-react";
import {
  ORDERS, CONTACTS, PROPERTIES, formatCurrency, formatFullCurrency,
} from "@/lib/mock-data";
import type { Order, OrderStatus, OrderType } from "@/lib/types";
import { useAppStore } from "@/lib/app-store";
import { useAuthStore } from "@/lib/auth-store";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type StatusFilter = "semua" | OrderStatus;
type TypeFilter = "semua" | OrderType;
type ViewMode = "tabel" | "kanban";

const STATUS_LABELS: Record<OrderStatus, string> = {
  baru: "Baru",
  diproses: "Diproses",
  negosiasi: "Negosiasi",
  deal: "Deal",
  gagal: "Gagal",
  dibatalkan: "Dibatalkan",
};

const STATUS_BADGE_CLASS: Record<OrderStatus, string> = {
  baru: "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
  diproses: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  negosiasi: "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
  deal: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  gagal: "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
  dibatalkan: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
};

const STATUS_DOT_CLASS: Record<OrderStatus, string> = {
  baru: "bg-sky-500",
  diproses: "bg-amber-500",
  negosiasi: "bg-violet-500",
  deal: "bg-emerald-500",
  gagal: "bg-rose-500",
  dibatalkan: "bg-zinc-400",
};

const KANBAN_STATUSES: OrderStatus[] = ["baru", "diproses", "negosiasi", "deal", "gagal"];

export function OrdersPage() {
  const { user } = useAuthStore();
  const { setActiveOrderId, setView } = useAppStore();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("semua");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("semua");
  const [viewMode, setViewMode] = useState<ViewMode>("tabel");
  const [sortNewest, setSortNewest] = useState(true);

  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  // Local copy of orders so we can mutate status (mock only).
  const [orders, setOrders] = useState<Order[]>(ORDERS);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = orders.filter((o) => {
      const matchSearch =
        !q ||
        o.code.toLowerCase().includes(q) ||
        o.contactName.toLowerCase().includes(q) ||
        o.propertyTitle.toLowerCase().includes(q);
      const matchStatus = statusFilter === "semua" || o.status === statusFilter;
      const matchType = typeFilter === "semua" || o.type === typeFilter;
      return matchSearch && matchStatus && matchType;
    });
    list.sort((a, b) => {
      const da = new Date(a.createdAt).getTime();
      const db = new Date(b.createdAt).getTime();
      return sortNewest ? db - da : da - db;
    });
    return list;
  }, [orders, search, statusFilter, typeFilter, sortNewest]);

  const stats = useMemo(() => {
    const total = orders.length;
    const dealList = orders.filter((o) => o.status === "deal");
    const dealCount = dealList.length;
    const dealSum = dealList.reduce((s, o) => s + o.amount, 0);
    const prosesCount = orders.filter(
      (o) => o.status === "diproses" || o.status === "negosiasi" || o.status === "baru",
    ).length;
    const pipelineSum = orders
      .filter((o) => o.status !== "deal" && o.status !== "gagal" && o.status !== "dibatalkan")
      .reduce((s, o) => s + o.amount, 0);
    return { total, dealCount, dealSum, prosesCount, pipelineSum };
  }, [orders]);

  const kanbanGroups = useMemo(() => {
    const groups: Record<OrderStatus, Order[]> = {
      baru: [], diproses: [], negosiasi: [], deal: [], gagal: [], dibatalkan: [],
    };
    filtered.forEach((o) => {
      if (groups[o.status]) groups[o.status].push(o);
    });
    return groups;
  }, [filtered]);

  const openDetail = (order: Order) => {
    setSelectedOrder(order);
    setActiveOrderId(order.id);
    setDetailOpen(true);
  };

  const handleCreateOrder = (data: {
    contactId: string; propertyId: string; type: OrderType; amount: number;
  }) => {
    const contact = CONTACTS.find((c) => c.id === data.contactId);
    const property = PROPERTIES.find((p) => p.id === data.propertyId);
    if (!contact || !property) return;
    const seq = String(orders.length + 1).padStart(4, "0");
    const newOrder: Order = {
      id: "o-" + Date.now(),
      code: `ORD-2025-${seq}`,
      contactId: contact.id,
      contactName: contact.name,
      propertyId: property.id,
      propertyTitle: property.title,
      type: data.type,
      amount: data.amount,
      status: "baru",
      agent: user?.name ?? "Operator",
      createdAt: new Date().toISOString().slice(0, 10),
      updatedAt: new Date().toISOString().slice(0, 10),
    };
    setOrders((prev) => [newOrder, ...prev]);
    setCreateOpen(false);
    toast({
      title: "Order berhasil dibuat",
      description: `${newOrder.code} untuk ${newOrder.contactName} telah ditambahkan.`,
    });
  };

  const updateOrderStatus = (orderId: string, status: OrderStatus) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? { ...o, status, updatedAt: new Date().toISOString().slice(0, 10) }
          : o,
      ),
    );
    if (selectedOrder?.id === orderId) {
      setSelectedOrder((prev) => (prev ? { ...prev, status } : prev));
    }
    toast({
      title: "Status order diperbarui",
      description: `Order kini berstatus "${STATUS_LABELS[status]}".`,
    });
  };

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 grid place-items-center">
                <ShoppingBag className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold leading-tight">Manajemen Order</h2>
                <p className="text-sm text-muted-foreground">
                  {stats.total} total transaksi · {filtered.length} ditampilkan
                </p>
              </div>
            </div>
          </div>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white w-full lg:w-auto"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="h-4 w-4" /> Buat Order
          </Button>
        </div>

        {/* Stat strip */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Order"
            value={String(stats.total)}
            icon={ShoppingBag}
            iconBg="bg-emerald-100 dark:bg-emerald-950/40"
            iconColor="text-emerald-600"
            sub="Seluruh transaksi"
          />
          <StatCard
            label="Order Deal"
            value={String(stats.dealCount)}
            icon={CheckCircle2}
            iconBg="bg-teal-100 dark:bg-teal-950/40"
            iconColor="text-teal-600"
            sub={formatCurrency(stats.dealSum)}
          />
          <StatCard
            label="Sedang Diproses"
            value={String(stats.prosesCount)}
            icon={Loader2}
            iconBg="bg-amber-100 dark:bg-amber-950/40"
            iconColor="text-amber-600"
            sub="Butuh tindak lanjut"
          />
          <StatCard
            label="Nilai Pipeline"
            value={formatCurrency(stats.pipelineSum)}
            icon={TrendingUp}
            iconBg="bg-violet-100 dark:bg-violet-950/40"
            iconColor="text-violet-600"
            sub="Potensi deal"
          />
        </div>

        {/* Filter & view toggle */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari kode, klien, atau properti…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                  <SelectTrigger size="sm" className="w-[150px]">
                    <Filter className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="semua">Semua Status</SelectItem>
                    {(Object.keys(STATUS_LABELS) as OrderStatus[]).map((s) => (
                      <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TypeFilter)}>
                  <SelectTrigger size="sm" className="w-[120px]">
                    <SelectValue placeholder="Tipe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="semua">Semua Tipe</SelectItem>
                    <SelectItem value="jual">Jual</SelectItem>
                    <SelectItem value="sewa">Sewa</SelectItem>
                  </SelectContent>
                </Select>
                <div className="inline-flex items-center rounded-lg border bg-muted/40 p-1">
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
                  <Button
                    size="sm"
                    variant={viewMode === "kanban" ? "default" : "ghost"}
                    className={cn(
                      "h-7 px-3 text-xs",
                      viewMode === "kanban" && "bg-emerald-600 text-white hover:bg-emerald-700",
                    )}
                    onClick={() => setViewMode("kanban")}
                  >
                    <LayoutGrid className="h-3.5 w-3.5" /> Kanban
                  </Button>
                </div>
              </div>
            </div>
            {filtered.length === 0 && (
              <div className="mt-4 text-center text-sm text-muted-foreground py-8">
                Tidak ada order yang cocok dengan filter.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Table view */}
        {viewMode === "tabel" && filtered.length > 0 && (
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Daftar Order</CardTitle>
                <CardDescription>
                  {sortNewest ? "Terbaru" : "Terlama"} lebih dulu · klik baris untuk detail
                </CardDescription>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSortNewest((s) => !s)}
                  >
                    <CalendarDays className="h-3.5 w-3.5" />
                    {sortNewest ? "Terbaru" : "Terlama"}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Ubah urutan tanggal</TooltipContent>
              </Tooltip>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="pl-4">Kode</TableHead>
                      <TableHead>Klien</TableHead>
                      <TableHead>Properti</TableHead>
                      <TableHead>Tipe</TableHead>
                      <TableHead className="text-right">Nilai</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Agent</TableHead>
                      <TableHead>Tanggal</TableHead>
                      <TableHead className="text-right pr-4">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((o) => {
                      const contact = CONTACTS.find((c) => c.id === o.contactId);
                      return (
                        <TableRow
                          key={o.id}
                          className="cursor-pointer"
                          onClick={() => openDetail(o)}
                        >
                          <TableCell className="pl-4 font-mono text-xs">{o.code}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-7 w-7">
                                <AvatarFallback className="text-[10px] bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
                                  {o.contactName.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="font-medium text-sm truncate max-w-[140px]">{o.contactName}</p>
                                {contact && (
                                  <p className="text-[11px] text-muted-foreground">+{contact.phone}</p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground truncate max-w-[160px]">
                            {o.propertyTitle}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px]",
                                o.type === "jual"
                                  ? "border-emerald-200 text-emerald-700 dark:border-emerald-900 dark:text-emerald-300"
                                  : "border-teal-200 text-teal-700 dark:border-teal-900 dark:text-teal-300",
                              )}
                            >
                              {o.type === "jual" ? "Jual" : "Sewa"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium whitespace-nowrap">
                            {formatCurrency(o.amount)}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={o.status} />
                          </TableCell>
                          <TableCell className="text-sm">{o.agent}</TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {o.createdAt}
                          </TableCell>
                          <TableCell className="text-right pr-4">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                              onClick={(e) => {
                                e.stopPropagation();
                                openDetail(o);
                              }}
                            >
                              <Eye className="h-3.5 w-3.5" /> Lihat
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Kanban view */}
        {viewMode === "kanban" && filtered.length > 0 && (
          <div className="flex gap-3 overflow-x-auto pb-3 snap-x">
            {KANBAN_STATUSES.map((status) => {
              const cards = kanbanGroups[status];
              const total = cards.reduce((s, o) => s + o.amount, 0);
              return (
                <div
                  key={status}
                  className="w-[280px] shrink-0 snap-start rounded-xl border bg-card flex flex-col"
                >
                  <div className="p-3 border-b">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={cn("h-2.5 w-2.5 rounded-full", STATUS_DOT_CLASS[status])} />
                        <span className="text-sm font-semibold">{STATUS_LABELS[status]}</span>
                      </div>
                      <Badge variant="secondary" className="text-[10px] h-5">
                        {cards.length}
                      </Badge>
                    </div>
                    {total > 0 && (
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Total {formatCurrency(total)}
                      </p>
                    )}
                  </div>
                  <div
                    className="p-2 space-y-2 max-h-[60vh] overflow-y-auto
                      [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full
                      [&::-webkit-scrollbar-thumb]:bg-muted-foreground/25
                      [&::-webkit-scrollbar-track]:bg-transparent"
                  >
                    {cards.length === 0 ? (
                      <div className="text-center text-xs text-muted-foreground py-8 border border-dashed rounded-lg">
                        Tidak ada order
                      </div>
                    ) : (
                      cards.map((o) => (
                        <button
                          key={o.id}
                          onClick={() => openDetail(o)}
                          className="w-full text-left rounded-lg border bg-background p-3 hover:border-emerald-400 hover:shadow-sm transition-all"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-mono text-[10px] text-muted-foreground">{o.code}</span>
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[9px] h-4 px-1",
                                o.type === "jual"
                                  ? "border-emerald-200 text-emerald-700 dark:border-emerald-900 dark:text-emerald-300"
                                  : "border-teal-200 text-teal-700 dark:border-teal-900 dark:text-teal-300",
                              )}
                            >
                              {o.type === "jual" ? "JUAL" : "SEWA"}
                            </Badge>
                          </div>
                          <p className="text-sm font-medium truncate">{o.propertyTitle}</p>
                          <p className="text-xs text-muted-foreground truncate">{o.contactName}</p>
                          <div className="flex items-center justify-between mt-2 pt-2 border-t">
                            <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                              {formatCurrency(o.amount)}
                            </span>
                            <span className="text-[10px] text-muted-foreground">{o.agent.split(" ")[0]}</span>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Detail Dialog */}
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            {selectedOrder && (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-2">
                    <DialogTitle className="font-mono text-base">{selectedOrder.code}</DialogTitle>
                    <StatusBadge status={selectedOrder.status} />
                  </div>
                  <DialogDescription>
                    Dibuat {selectedOrder.createdAt} · Diperbarui {selectedOrder.updatedAt}
                  </DialogDescription>
                </DialogHeader>

                <ScrollArea className="flex-1 max-h-[55vh] pr-2">
                  <div className="space-y-4">
                    {/* Amount + type highlight */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg border bg-muted/30 p-3">
                        <p className="text-xs text-muted-foreground">Nilai Transaksi</p>
                        <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
                          {formatFullCurrency(selectedOrder.amount)}
                        </p>
                      </div>
                      <div className="rounded-lg border bg-muted/30 p-3">
                        <p className="text-xs text-muted-foreground">Tipe</p>
                        <p className="text-lg font-bold capitalize">{selectedOrder.type}</p>
                      </div>
                    </div>

                    {/* Contact info */}
                    <InfoBlock title="Klien" icon={User}>
                      {(() => {
                        const contact = CONTACTS.find((c) => c.id === selectedOrder.contactId);
                        return (
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback className="bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
                                {selectedOrder.contactName.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="font-medium text-sm">{selectedOrder.contactName}</p>
                              {contact && (
                                <p className="text-xs text-muted-foreground">+{contact.phone}</p>
                              )}
                              {contact?.tags && contact.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {contact.tags.map((t) => (
                                    <Badge key={t} variant="secondary" className="text-[9px] h-4 px-1">
                                      {t}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </InfoBlock>

                    {/* Property info */}
                    <InfoBlock title="Properti" icon={Building2}>
                      {(() => {
                        const prop = PROPERTIES.find((p) => p.id === selectedOrder.propertyId);
                        return (
                          <div>
                            <p className="font-medium text-sm">{selectedOrder.propertyTitle}</p>
                            {prop && (
                              <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                <span>Lokasi: <span className="text-foreground">{prop.location}</span></span>
                                <span>Luas: <span className="text-foreground">{prop.area} m²</span></span>
                                {prop.bedrooms != null && (
                                  <span>KT: <span className="text-foreground">{prop.bedrooms}</span></span>
                                )}
                                {prop.bathrooms != null && (
                                  <span>KM: <span className="text-foreground">{prop.bathrooms}</span></span>
                                )}
                                <span className="col-span-2">
                                  Harga listing: <span className="text-foreground font-medium">{formatCurrency(prop.price)}</span>
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </InfoBlock>

                    {/* Timeline */}
                    <InfoBlock title="Riwayat Status" icon={Clock}>
                      <Timeline order={selectedOrder} />
                    </InfoBlock>

                    {/* Agent */}
                    <InfoBlock title="Agent" icon={User}>
                      <p className="text-sm">{selectedOrder.agent}</p>
                    </InfoBlock>
                  </div>
                </ScrollArea>

                <Separator />

                {/* Action buttons */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <Select
                    value={selectedOrder.status}
                    onValueChange={(v) => updateOrderStatus(selectedOrder.id, v as OrderStatus)}
                  >
                    <SelectTrigger size="sm" className="flex-1">
                      <SelectValue placeholder="Ubah Status" />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(STATUS_LABELS) as OrderStatus[]).map((s) => (
                        <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() =>
                      toast({ title: "Invoice disiapkan", description: `Invoice untuk ${selectedOrder.code} dibuat (demo).` })
                    }
                  >
                    <Printer className="h-3.5 w-3.5" /> Cetak Invoice
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => {
                      const contact = CONTACTS.find((c) => c.id === selectedOrder.contactId);
                      setActiveContactId(contact?.id ?? null);
                      setView("chatbot");
                    }}
                  >
                    <Phone className="h-3.5 w-3.5" /> Hubungi Klien
                  </Button>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Create Order Dialog */}
        <CreateOrderDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          onSubmit={handleCreateOrder}
        />
      </div>
    </TooltipProvider>
  );
}

// ===== Subcomponents =====

function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
        STATUS_BADGE_CLASS[status],
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOT_CLASS[status])} />
      {STATUS_LABELS[status]}
    </span>
  );
}

function StatCard({
  label, value, icon: Icon, iconBg, iconColor, sub,
}: {
  label: string; value: string; icon: typeof ShoppingBag;
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

function InfoBlock({
  title, icon: Icon, children,
}: {
  title: string; icon: typeof User; children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</span>
      </div>
      {children}
    </div>
  );
}

function Timeline({ order }: { order: Order }) {
  // Mock timeline based on order status + dates
  type Tone = "emerald" | "amber" | "violet" | "rose" | "zinc";
  const events: { label: string; date: string; done: boolean; tone: Tone }[] = [
    { label: "Order dibuat", date: order.createdAt, done: true, tone: "emerald" },
    { label: "Klien dihubungi", date: order.createdAt, done: true, tone: "emerald" },
    { label: "Survey properti", date: order.updatedAt, done: ["diproses", "negosiasi", "deal", "gagal", "dibatalkan"].includes(order.status), tone: "amber" },
    { label: "Negosiasi harga", date: order.updatedAt, done: ["negosiasi", "deal"].includes(order.status), tone: "violet" },
    {
      label: order.status === "deal" ? "Deal closed" : order.status === "gagal" ? "Deal gagal" : order.status === "dibatalkan" ? "Order dibatalkan" : "Menunggu deal",
      date: order.updatedAt,
      done: ["deal", "gagal", "dibatalkan"].includes(order.status),
      tone: order.status === "deal" ? "emerald" : order.status === "gagal" ? "rose" : "zinc",
    },
  ];
  const toneClass: Record<Tone, string> = {
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    violet: "bg-violet-500",
    rose: "bg-rose-500",
    zinc: "bg-zinc-400",
  };
  return (
    <ol className="space-y-3">
      {events.map((e, i) => (
        <li key={i} className="flex gap-3">
          <div className="flex flex-col items-center">
            <span className={cn("h-2.5 w-2.5 rounded-full mt-1", e.done ? toneClass[e.tone] : "bg-muted-foreground/30")} />
            {i < events.length - 1 && <span className="flex-1 w-px bg-border min-h-[20px]" />}
          </div>
          <div className="pb-1">
            <p className={cn("text-sm", e.done ? "font-medium" : "text-muted-foreground")}>{e.label}</p>
            <p className="text-[11px] text-muted-foreground">{e.date}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function CreateOrderDialog({
  open, onOpenChange, onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (data: { contactId: string; propertyId: string; type: OrderType; amount: number }) => void;
}) {
  const [contactId, setContactId] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [type, setType] = useState<OrderType>("jual");
  const [amount, setAmount] = useState<string>("");

  const reset = () => {
    setContactId("");
    setPropertyId("");
    setType("jual");
    setAmount("");
  };

  const handlePropertyChange = (id: string) => {
    setPropertyId(id);
    const prop = PROPERTIES.find((p) => p.id === id);
    if (prop) {
      setAmount(String(prop.price));
    }
  };

  const handleSubmit = () => {
    if (!contactId || !propertyId || !amount) return;
    onSubmit({ contactId, propertyId, type, amount: Number(amount) });
    reset();
  };

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
          <DialogTitle>Buat Order Baru</DialogTitle>
          <DialogDescription>
            Pilih klien dan properti untuk membuat transaksi baru.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Klien</Label>
            <Select value={contactId} onValueChange={setContactId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pilih kontak" />
              </SelectTrigger>
              <SelectContent>
                {CONTACTS.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} · +{c.phone}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Properti</Label>
            <Select value={propertyId} onValueChange={handlePropertyChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pilih properti" />
              </SelectTrigger>
              <SelectContent>
                {PROPERTIES.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.title} · {formatCurrency(p.price)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tipe Transaksi</Label>
              <Select value={type} onValueChange={(v) => setType(v as OrderType)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="jual">Jual</SelectItem>
                  <SelectItem value="sewa">Sewa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Nilai (Rp)</Label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>
          {amount && Number(amount) > 0 && (
            <p className="text-xs text-muted-foreground">
              Terbilang: <span className="font-medium text-foreground">{formatFullCurrency(Number(amount))}</span>
            </p>
          )}
          <div className="rounded-md bg-muted/40 p-2 text-xs text-muted-foreground flex items-center gap-1.5">
            <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600" />
            Status awal order akan diatur sebagai <span className="font-medium text-foreground">"Baru"</span>.
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            disabled={!contactId || !propertyId || !amount}
            onClick={handleSubmit}
          >
            <Plus className="h-4 w-4" /> Buat Order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
