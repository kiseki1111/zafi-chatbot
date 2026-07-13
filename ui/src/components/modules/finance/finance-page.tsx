"use client";

import * as React from "react";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis,
} from "recharts";
import {
  Wallet, TrendingUp, Clock, FileCheck2, Plus, Search, Eye,
  CheckCircle2, Printer, MoreVertical, Calendar, CreditCard,
  Banknote, QrCode, Receipt, Landmark, AlertCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  INVOICES, ORDERS, formatCurrency, formatFullCurrency,
} from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import type { Invoice, InvoiceStatus, PaymentMethod, Order } from "@/lib/types";

type InvoiceRow = Invoice;

const STATUS_LABELS: Record<InvoiceStatus, string> = {
  "lunas": "Lunas",
  "belum-bayar": "Belum Bayar",
  "jatuh-tempo": "Jatuh Tempo",
  "dibatalkan": "Dibatalkan",
};

const STATUS_THEME: Record<InvoiceStatus, string> = {
  "lunas": "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  "belum-bayar": "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  "jatuh-tempo": "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
  "dibatalkan": "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
};

const METHOD_LABELS: Record<PaymentMethod, string> = {
  transfer: "Transfer",
  cash: "Cash",
  cicilan: "Cicilan",
  qris: "QRIS",
};

const METHOD_THEME: Record<PaymentMethod, string> = {
  transfer: "bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300",
  cash: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  cicilan: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  qris: "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
};

function MethodIcon({ method, className }: { method: PaymentMethod; className?: string }) {
  const map: Record<PaymentMethod, React.ComponentType<{ className?: string }>> = {
    transfer: Landmark,
    cash: Banknote,
    cicilan: CreditCard,
    qris: QrCode,
  };
  const Comp = map[method];
  return <Comp className={className} />;
}

// 7-month mock revenue (in juta Rp)
const REVENUE_CHART = [
  { label: "Jul", value: 420 },
  { label: "Agu", value: 510 },
  { label: "Sep", value: 480 },
  { label: "Okt", value: 620 },
  { label: "Nov", value: 580 },
  { label: "Des", value: 720 },
  { label: "Jan", value: 645 },
];

const PERIOD_OPTIONS = [
  { value: "bulan-ini", label: "Bulan Ini" },
  { value: "bulan-lalu", label: "Bulan Lalu" },
  { value: "kuartal", label: "Kuartal Ini" },
  { value: "tahun", label: "Tahun Ini" },
];

export function FinancePage() {
  const { toast } = useToast();

  const [invoices, setInvoices] = React.useState<InvoiceRow[]>(() =>
    INVOICES.map((i) => ({ ...i })),
  );
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<InvoiceStatus | "all">("all");
  const [period, setPeriod] = React.useState("bulan-ini");

  const [viewTarget, setViewTarget] = React.useState<InvoiceRow | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [createForm, setCreateForm] = React.useState<{
    orderId: string; method: PaymentMethod; dueAt: string;
  }>({ orderId: "", method: "transfer", dueAt: "" });

  const filtered = invoices.filter((i) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      i.number.toLowerCase().includes(q) ||
      i.contactName.toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || i.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const pendapatan = invoices.filter((i) => i.status === "lunas").reduce((s, i) => s + i.amount, 0);
  const piutang = invoices
    .filter((i) => i.status === "belum-bayar" || i.status === "jatuh-tempo")
    .reduce((s, i) => s + i.amount, 0);
  const lunasCount = invoices.filter((i) => i.status === "lunas").length;
  const jatuhTempoCount = invoices.filter((i) => i.status === "jatuh-tempo").length;

  // Distribution data for pie
  const dist = (["lunas", "belum-bayar", "jatuh-tempo", "dibatalkan"] as InvoiceStatus[]).map((st) => ({
    label: STATUS_LABELS[st],
    value: invoices.filter((i) => i.status === st).length,
    status: st,
  }));

  function markPaid(inv: InvoiceRow) {
    setInvoices((prev) =>
      prev.map((i) =>
        i.id === inv.id
          ? {
              ...i,
              status: "lunas" as InvoiceStatus,
              paidAt: new Date().toISOString().slice(0, 10),
            }
          : i,
      ),
    );
    toast({
      title: "Invoice ditandai lunas",
      description: `${inv.number} (${formatCurrency(inv.amount)}) kini berstatus Lunas.`,
    });
    if (viewTarget?.id === inv.id) {
      setViewTarget({ ...inv, status: "lunas", paidAt: new Date().toISOString().slice(0, 10) });
    }
  }

  function handleCreate() {
    const order = ORDERS.find((o) => o.id === createForm.orderId);
    if (!order) {
      toast({ title: "Pilih order", description: "Silakan pilih order terlebih dahulu.", variant: "destructive" });
      return;
    }
    if (!createForm.dueAt) {
      toast({ title: "Tanggal jatuh tempo wajib diisi", variant: "destructive" });
      return;
    }
    const seq = String(invoices.length + 1).padStart(4, "0");
    const newInv: InvoiceRow = {
      id: "inv-" + Date.now(),
      number: `INV-2025-${seq}`,
      orderId: order.id,
      contactName: order.contactName,
      amount: order.amount,
      status: "belum-bayar",
      method: createForm.method,
      issuedAt: new Date().toISOString().slice(0, 10),
      dueAt: createForm.dueAt,
    };
    setInvoices((prev) => [newInv, ...prev]);
    toast({
      title: "Invoice dibuat",
      description: `${newInv.number} untuk ${newInv.contactName} sebesar ${formatCurrency(newInv.amount)}.`,
    });
    setCreateOpen(false);
    setCreateForm({ orderId: "", method: "transfer", dueAt: "" });
  }

  function handlePrint(inv: InvoiceRow) {
    toast({
      title: "Mencetak invoice…",
      description: `Invoice ${inv.number} sedang diproses untuk dicetak.`,
    });
  }

  const selectedOrder: Order | undefined = ORDERS.find((o) => o.id === createForm.orderId);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Wallet className="h-5 w-5 text-emerald-600" />
            Keuangan
          </h2>
          <p className="text-sm text-muted-foreground">
            Kelola invoice, pendapatan, dan piutang klien Anda.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-full sm:w-44">
              <Calendar className="h-4 w-4 mr-1.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map((p) => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> Buat Invoice
          </Button>
        </div>
      </div>

      {/* Stat strip */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <FinanceStat
          label="Pendapatan"
          value={formatCurrency(pendapatan)}
          sub={`${lunasCount} invoice lunas`}
          icon={TrendingUp}
          theme="emerald"
        />
        <FinanceStat
          label="Piutang"
          value={formatCurrency(piutang)}
          sub="Belum bayar + jatuh tempo"
          icon={Clock}
          theme="amber"
        />
        <FinanceStat
          label="Invoice Lunas"
          value={String(lunasCount)}
          sub="dari total invoice"
          icon={FileCheck2}
          theme="teal"
        />
        <FinanceStat
          label="Jatuh Tempo"
          value={String(jatuhTempoCount)}
          sub="Perlu tindak lanjut"
          icon={AlertCircle}
          theme="rose"
        />
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Tren Pendapatan</CardTitle>
                <CardDescription>7 bulan terakhir (dalam juta Rupiah)</CardDescription>
              </div>
              <Badge variant="outline" className="text-emerald-600 border-emerald-200">
                <TrendingUp className="h-3 w-3 mr-1" /> +12,4%
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={REVENUE_CHART} margin={{ left: -16, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="gBar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#059669" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} className="text-xs" />
                <YAxis tickLine={false} axisLine={false} className="text-xs" />
                <RTooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 12 }}
                  formatter={(v: number) => `Rp ${v} jt`}
                  cursor={{ fill: "rgba(16,185,129,0.08)" }}
                />
                <Bar dataKey="value" name="Pendapatan" fill="url(#gBar)" radius={[6, 6, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Distribusi Status Invoice</CardTitle>
            <CardDescription>{invoices.length} invoice total</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={dist}
                  dataKey="value"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius={42}
                  outerRadius={70}
                  paddingAngle={3}
                >
                  {dist.map((d) => (
                    <Cell key={d.status} fill={PIE_COLOR[d.status]} />
                  ))}
                </Pie>
                <RTooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} formatter={(v: number) => `${v} invoice`} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5 mt-2">
              {dist.map((d) => (
                <div key={d.status} className="flex items-center gap-2 text-xs">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: PIE_COLOR[d.status] }} />
                  <span className="flex-1 text-muted-foreground">{d.label}</span>
                  <span className="font-semibold">{d.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          <FilterPill active={statusFilter === "all"} onClick={() => setStatusFilter("all")} label="Semua" />
          {(["lunas", "belum-bayar", "jatuh-tempo", "dibatalkan"] as InvoiceStatus[]).map((st) => (
            <FilterPill
              key={st}
              active={statusFilter === st}
              onClick={() => setStatusFilter(st)}
              label={STATUS_LABELS[st]}
              theme={st}
            />
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari nomor / klien…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 w-full sm:w-64"
          />
        </div>
      </div>

      {/* Invoices table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Daftar Invoice</CardTitle>
          <CardDescription>{filtered.length} dari {invoices.length} invoice</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <ScrollArea className="h-[460px]">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-muted/60 backdrop-blur">
                  <tr className="text-left text-xs text-muted-foreground border-b">
                    <th className="py-2.5 px-4 font-medium">Nomor</th>
                    <th className="py-2.5 px-4 font-medium">Klien</th>
                    <th className="py-2.5 px-4 font-medium">Order</th>
                    <th className="py-2.5 px-4 font-medium text-right">Nilai</th>
                    <th className="py-2.5 px-4 font-medium">Metode</th>
                    <th className="py-2.5 px-4 font-medium">Status</th>
                    <th className="py-2.5 px-4 font-medium">Terbit</th>
                    <th className="py-2.5 px-4 font-medium">Jatuh Tempo</th>
                    <th className="py-2.5 px-4 font-medium">Dibayar</th>
                    <th className="py-2.5 px-4 font-medium text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((inv) => {
                    const order = ORDERS.find((o) => o.id === inv.orderId);
                    return (
                      <tr key={inv.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="py-2.5 px-4 font-mono text-xs">{inv.number}</td>
                        <td className="py-2.5 px-4 font-medium truncate max-w-[140px]">{inv.contactName}</td>
                        <td className="py-2.5 px-4 text-muted-foreground font-mono text-xs truncate max-w-[120px]">
                          {order?.code ?? inv.orderId}
                        </td>
                        <td className="py-2.5 px-4 text-right font-medium whitespace-nowrap">{formatCurrency(inv.amount)}</td>
                        <td className="py-2.5 px-4">
                          <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium", METHOD_THEME[inv.method])}>
                            <MethodIcon method={inv.method} className="h-3 w-3" />
                            {METHOD_LABELS[inv.method]}
                          </span>
                        </td>
                        <td className="py-2.5 px-4">
                          <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium", STATUS_THEME[inv.status])}>
                            {STATUS_LABELS[inv.status]}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-muted-foreground whitespace-nowrap">{inv.issuedAt}</td>
                        <td className="py-2.5 px-4 text-muted-foreground whitespace-nowrap">{inv.dueAt}</td>
                        <td className="py-2.5 px-4 text-muted-foreground whitespace-nowrap">{inv.paidAt ?? "—"}</td>
                        <td className="py-2.5 px-4 text-right">
                          <InvoiceActions
                            inv={inv}
                            onView={() => setViewTarget(inv)}
                            onMarkPaid={() => markPaid(inv)}
                            onPrint={() => handlePrint(inv)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={10} className="py-10 text-center text-muted-foreground text-sm">
                        Tidak ada invoice yang cocok dengan filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </ScrollArea>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y">
            {filtered.map((inv) => {
              const order = ORDERS.find((o) => o.id === inv.orderId);
              return (
                <div key={inv.id} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-mono text-xs text-muted-foreground">{inv.number}</p>
                      <p className="font-medium truncate">{inv.contactName}</p>
                      <p className="text-xs text-muted-foreground truncate">{order?.code ?? inv.orderId}</p>
                    </div>
                    <InvoiceActions
                      inv={inv}
                      onView={() => setViewTarget(inv)}
                      onMarkPaid={() => markPaid(inv)}
                      onPrint={() => handlePrint(inv)}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-base font-bold">{formatCurrency(inv.amount)}</span>
                    <div className="flex items-center gap-1.5">
                      <span className={cn("inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium", METHOD_THEME[inv.method])}>
                        <MethodIcon method={inv.method} className="h-3 w-3" />
                        {METHOD_LABELS[inv.method]}
                      </span>
                      <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium", STATUS_THEME[inv.status])}>
                        {STATUS_LABELS[inv.status]}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2 text-[11px] text-muted-foreground">
                    <span>Jatuh tempo: {inv.dueAt}</span>
                    <span>{inv.paidAt ? `Dibayar: ${inv.paidAt}` : "Belum dibayar"}</span>
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="py-10 text-center text-muted-foreground text-sm">
                Tidak ada invoice yang cocok dengan filter.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* View invoice dialog */}
      <Dialog open={!!viewTarget} onOpenChange={(o) => !o && setViewTarget(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-emerald-600" />
              Detail Invoice
            </DialogTitle>
            <DialogDescription>
              Nomor <span className="font-mono text-foreground">{viewTarget?.number}</span>
            </DialogDescription>
          </DialogHeader>
          {viewTarget && <InvoiceDetail inv={viewTarget} />}
          <DialogFooter className="gap-2">
            {viewTarget && (
              <>
                <Button variant="outline" onClick={() => handlePrint(viewTarget)}>
                  <Printer className="h-4 w-4" /> Cetak
                </Button>
                {viewTarget.status !== "lunas" && viewTarget.status !== "dibatalkan" && (
                  <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => markPaid(viewTarget)}>
                    <CheckCircle2 className="h-4 w-4" /> Tandai Lunas
                  </Button>
                )}
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create invoice dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Buat Invoice Baru</DialogTitle>
            <DialogDescription>Pilih order untuk dibuatkan invoice. Nilai mengikuti order.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Pilih Order</Label>
              <Select
                value={createForm.orderId}
                onValueChange={(v) => setCreateForm((s) => ({ ...s, orderId: v }))}
              >
                <SelectTrigger><SelectValue placeholder="Pilih order…" /></SelectTrigger>
                <SelectContent>
                  {ORDERS.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.code} — {o.contactName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedOrder && (
              <div className="rounded-md border bg-muted/30 p-3 space-y-1.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Klien</span>
                  <span className="font-medium">{selectedOrder.contactName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Properti</span>
                  <span className="font-medium truncate max-w-[200px]">{selectedOrder.propertyTitle}</span>
                </div>
                <Separator className="my-1" />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Nilai Invoice</span>
                  <span className="font-bold text-emerald-600">{formatFullCurrency(selectedOrder.amount)}</span>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Metode Pembayaran</Label>
                <Select
                  value={createForm.method}
                  onValueChange={(v) => setCreateForm((s) => ({ ...s, method: v as PaymentMethod }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="transfer">Transfer</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="cicilan">Cicilan</SelectItem>
                    <SelectItem value="qris">QRIS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="due-at">Jatuh Tempo</Label>
                <Input
                  id="due-at"
                  type="date"
                  value={createForm.dueAt}
                  onChange={(e) => setCreateForm((s) => ({ ...s, dueAt: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Batal</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleCreate}>
              <Plus className="h-4 w-4" /> Buat Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============ Sub components ============

const PIE_COLOR: Record<InvoiceStatus, string> = {
  "lunas": "#059669",
  "belum-bayar": "#d97706",
  "jatuh-tempo": "#e11d48",
  "dibatalkan": "#71717a",
};

function FinanceStat({
  label, value, sub, icon: Icon, theme,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ComponentType<{ className?: string }>;
  theme: "emerald" | "teal" | "amber" | "rose";
}) {
  const map = {
    emerald: "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600",
    teal: "bg-teal-100 dark:bg-teal-950/40 text-teal-600",
    amber: "bg-amber-100 dark:bg-amber-950/40 text-amber-600",
    rose: "bg-rose-100 dark:bg-rose-950/40 text-rose-600",
  } as const;
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardDescription className="text-xs">{label}</CardDescription>
          <div className={cn("h-8 w-8 rounded-lg grid place-items-center", map[theme])}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight mt-1">{value}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-[11px] text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  );
}

function FilterPill({
  active, onClick, label, theme,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  theme?: InvoiceStatus;
}) {
  const dot = theme ? PIE_COLOR[theme] : undefined;
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-colors",
        active
          ? "bg-emerald-600 text-white border-emerald-600"
          : "bg-background text-muted-foreground hover:bg-muted/60 border-border",
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full" style={{ background: dot }} />}
      {label}
    </button>
  );
}

function InvoiceActions({
  inv, onView, onMarkPaid, onPrint,
}: {
  inv: InvoiceRow;
  onView: () => void;
  onMarkPaid: () => void;
  onPrint: () => void;
}) {
  const canMarkPaid = inv.status !== "lunas" && inv.status !== "dibatalkan";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreVertical className="h-4 w-4" />
          <span className="sr-only">Aksi</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onClick={onView}>
          <Eye className="h-4 w-4" /> Lihat Detail
        </DropdownMenuItem>
        {canMarkPaid && (
          <DropdownMenuItem onClick={onMarkPaid} className="text-emerald-600 focus:text-emerald-700 focus:bg-emerald-50 dark:focus:bg-emerald-950/40">
            <CheckCircle2 className="h-4 w-4" /> Tandai Lunas
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onPrint}>
          <Printer className="h-4 w-4" /> Cetak
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function InvoiceDetail({ inv }: { inv: InvoiceRow }) {
  const order = ORDERS.find((o) => o.id === inv.orderId);
  const ppn = Math.round(inv.amount * 0.11);
  const total = inv.amount + ppn;
  return (
    <div className="space-y-4">
      {/* From / To */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-lg border p-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Dari</p>
          <p className="font-semibold mt-0.5">PropertiKu Agent</p>
          <p className="text-xs text-muted-foreground">Jl. Merdeka No. 123, Bandung</p>
          <p className="text-xs text-muted-foreground">email: billing@propertiku.id</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Kepada</p>
          <p className="font-semibold mt-0.5">{inv.contactName}</p>
          <p className="text-xs text-muted-foreground">Klien</p>
          <p className="text-xs text-muted-foreground">Order: {order?.code ?? inv.orderId}</p>
        </div>
      </div>

      {/* Meta */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <MetaItem label="Terbit" value={inv.issuedAt} />
        <MetaItem label="Jatuh Tempo" value={inv.dueAt} />
        <MetaItem label="Dibayar" value={inv.paidAt ?? "—"} />
        <div>
          <p className="text-muted-foreground">Status</p>
          <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium mt-0.5", STATUS_THEME[inv.status])}>
            {STATUS_LABELS[inv.status]}
          </span>
        </div>
      </div>

      {/* Line items */}
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="text-left py-2 px-3 font-medium">Deskripsi</th>
              <th className="text-right py-2 px-3 font-medium">Nilai</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t">
              <td className="py-2.5 px-3">
                <p className="font-medium">{order?.propertyTitle ?? "Properti"}</p>
                <p className="text-xs text-muted-foreground">
                  {order?.type === "jual" ? "Pembelian" : "Sewa"} · Klien {inv.contactName}
                </p>
              </td>
              <td className="py-2.5 px-3 text-right">{formatFullCurrency(inv.amount)}</td>
            </tr>
            <tr className="border-t">
              <td className="py-2.5 px-3 text-muted-foreground">PPN 11%</td>
              <td className="py-2.5 px-3 text-right">{formatFullCurrency(ppn)}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr className="border-t bg-emerald-50 dark:bg-emerald-950/30">
              <td className="py-2.5 px-3 font-bold">Total</td>
              <td className="py-2.5 px-3 text-right font-bold text-emerald-700 dark:text-emerald-300">
                {formatFullCurrency(total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Payment method */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Metode Pembayaran</span>
        <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium", METHOD_THEME[inv.method])}>
          <MethodIcon method={inv.method} className="h-3.5 w-3.5" />
          {METHOD_LABELS[inv.method]}
        </span>
      </div>
    </div>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <p className="font-medium mt-0.5">{value}</p>
    </div>
  );
}
