"use client";

import {
  Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  TrendingUp, TrendingDown, MessageCircle, Users, ShoppingBag, Wallet,
  ArrowUpRight, Bot, Activity, Phone, Zap,
} from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { useAppStore } from "@/lib/app-store";
import { ROLE_LABELS, canAccess } from "@/lib/rbac";
import {
  REVENUE_TREND, LEAD_SOURCE, FUNNEL_DATA, ORDERS, CONTACTS,
  WA_SESSIONS, formatCurrency, formatFullCurrency,
} from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/types";

const PIE_COLORS = ["#059669", "#0d9488", "#65a30d", "#d97706", "#9333ea"];

export function OverviewPage() {
  const { user } = useAuthStore();
  const { setView, setActiveOrderId } = useAppStore();
  const role = user?.role ?? "operator";

  const kpis = getKpis(user?.division || role);
  const canChat = canAccess(role, user?.division, "chatbot");
  const canOrders = canAccess(role, user?.division, "orders");

  return (
    <div className="space-y-5">
      {/* Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">
            Halo, {user?.name.split(" ")[0]} 👋
          </h2>
          <p className="text-sm text-muted-foreground">
            Berikut ringkasan bisnis properti Anda hari ini. Anda masuk sebagai{" "}
            <span className="font-medium text-foreground">{ROLE_LABELS[role]}</span>.
          </p>
        </div>
        <div className="flex gap-2">
          {canChat && (
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setView("chatbot")}>
              <MessageCircle className="h-4 w-4" /> Buka Chatbot
            </Button>
          )}
          {canOrders && (
            <Button variant="outline" onClick={() => setView("orders")}>
              <ShoppingBag className="h-4 w-4" /> Lihat Order
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.key} className="overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="text-xs">{k.label}</CardDescription>
                <div className={cn("h-8 w-8 rounded-lg grid place-items-center", k.iconBg, k.iconColor)}>
                  <k.Icon className="h-4 w-4" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold tracking-tight mt-1">{k.value}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center gap-1 text-xs">
                {k.delta >= 0 ? (
                  <TrendingUp className="h-3 w-3 text-emerald-600" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-rose-600" />
                )}
                <span className={k.delta >= 0 ? "text-emerald-600 font-medium" : "text-rose-600 font-medium"}>
                  {k.delta >= 0 ? "+" : ""}{k.delta}%
                </span>
                <span className="text-muted-foreground">vs bulan lalu</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-base">Tren Pendapatan</CardTitle>
              <CardDescription>7 bulan terakhir (dalam juta Rupiah)</CardDescription>
            </div>
            <Badge variant="outline" className="text-emerald-600 border-emerald-200">
              <TrendingUp className="h-3 w-3 mr-1" /> +12,4%
            </Badge>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={REVENUE_TREND} margin={{ left: -16, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gTgt" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0d9488" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} className="text-xs" />
                <YAxis tickLine={false} axisLine={false} className="text-xs" />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 12 }}
                  formatter={(v: number) => `Rp ${v} jt`}
                />
                <Area type="monotone" dataKey="value2" name="Target" stroke="#0d9488" strokeWidth={2} fill="url(#gTgt)" />
                <Area type="monotone" dataKey="value" name="Aktual" stroke="#059669" strokeWidth={2.5} fill="url(#gRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Sumber Leads</CardTitle>
            <CardDescription>Distribusi kanal masuk</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={LEAD_SOURCE} dataKey="value" nameKey="label" cx="50%" cy="50%" innerRadius={42} outerRadius={70} paddingAngle={3}>
                  {LEAD_SOURCE.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => `${v}%`} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5 mt-2">
              {LEAD_SOURCE.map((s, i) => (
                <div key={s.label} className="flex items-center gap-2 text-xs">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="flex-1 text-muted-foreground">{s.label}</span>
                  <span className="font-semibold">{s.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Funnel + Recent orders */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Funnel Konversi</CardTitle>
            <CardDescription>Dari lead hingga deal</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {FUNNEL_DATA.length > 0 ? FUNNEL_DATA.map((f, i) => {
              const pct = (f.value / FUNNEL_DATA[0].value) * 100;
              const colors = ["bg-emerald-500", "bg-teal-500", "bg-amber-500", "bg-rose-500"];
              return (
                <div key={f.label}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium">{f.label}</span>
                    <span className="text-muted-foreground">{f.value} · {pct.toFixed(0)}%</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                    <div className={cn("h-full rounded-full transition-all", colors[i])} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            }) : <div className="text-sm text-center text-muted-foreground py-4">Belum ada data funnel</div>}
            <div className="pt-2 mt-2 border-t">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Conversion Rate</span>
                <span className="font-bold text-emerald-600">
                  {FUNNEL_DATA.length > 3 && FUNNEL_DATA[0]?.value ? ((FUNNEL_DATA[3].value / FUNNEL_DATA[0].value) * 100).toFixed(1) : "0.0"}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base">Order Terbaru</CardTitle>
              <CardDescription>5 transaksi terkini</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="text-emerald-600" onClick={() => setView("orders")}>
              Lihat semua <ArrowUpRight className="h-3.5 w-3.5" />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-y bg-muted/40">
                  <tr className="text-left text-xs text-muted-foreground">
                    <th className="py-2 px-4 font-medium">Kode</th>
                    <th className="py-2 px-4 font-medium">Klien</th>
                    <th className="py-2 px-4 font-medium">Properti</th>
                    <th className="py-2 px-4 font-medium text-right">Nilai</th>
                    <th className="py-2 px-4 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {ORDERS.slice(0, 5).map((o) => (
                    <tr
                      key={o.id}
                      className="border-b last:border-0 hover:bg-muted/30 cursor-pointer"
                      onClick={() => { setActiveOrderId(o.id); setView("orders"); }}
                    >
                      <td className="py-2.5 px-4 font-mono text-xs">{o.code}</td>
                      <td className="py-2.5 px-4 font-medium truncate max-w-[120px]">{o.contactName}</td>
                      <td className="py-2.5 px-4 text-muted-foreground truncate max-w-[140px]">{o.propertyTitle}</td>
                      <td className="py-2.5 px-4 text-right font-medium whitespace-nowrap">{formatCurrency(o.amount)}</td>
                      <td className="py-2.5 px-4"><OrderBadge status={o.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* WA Sessions + Activity */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Sesi WhatsApp (Waha)</CardTitle>
              <Bot className="h-4 w-4 text-emerald-600" />
            </div>
            <CardDescription>Status koneksi agent</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {WA_SESSIONS.map((s) => (
              <div key={s.id} className="flex items-center gap-3 rounded-lg border p-2.5">
                <div className="relative">
                  <div className="h-9 w-9 rounded-full bg-emerald-100 dark:bg-emerald-950/40 grid place-items-center">
                    <Phone className="h-4 w-4 text-emerald-600" />
                  </div>
                  <span
                    className={cn(
                      "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-background",
                      s.status === "connected" ? "bg-emerald-500" : s.status === "connecting" ? "bg-amber-500" : "bg-rose-400",
                    )}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{s.name}</p>
                  <p className="text-xs text-muted-foreground">+{s.phone}</p>
                </div>
                <div className="text-right">
                  <Badge variant={s.status === "connected" ? "default" : "secondary"} className={s.status === "connected" ? "bg-emerald-600" : ""}>
                    {s.status === "connected" ? "Online" : "Offline"}
                  </Badge>
                  {s.status === "connected" && (
                    <p className="text-[10px] text-muted-foreground mt-1">{s.battery}% baterai</p>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
          <CardFooter className="pt-0">
            {canChat ? (
              <Button variant="outline" size="sm" className="w-full" onClick={() => setView("chatbot")}>
                Kelola Sesi WhatsApp
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground w-full text-center">Hubungi admin untuk mengelola sesi.</p>
            )}
          </CardFooter>
        </Card>

        {canChat ? (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Chat Belum Dibaca</CardTitle>
              <CardDescription>Perlu tindak lanjut</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[220px]">
                <div className="px-4 py-2 space-y-1">
                  {CONTACTS.filter((c) => c.unread > 0).map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setView("chatbot")}
                      className="w-full flex items-center gap-3 rounded-lg p-2 hover:bg-muted/50 transition-colors text-left"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
                          {c.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{c.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{c.lastMessage}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[10px] text-muted-foreground">{c.lastMessageAt}</p>
                        {c.unread > 0 && (
                          <Badge className="bg-rose-500 text-white text-[10px] h-5 min-w-5 justify-center mt-0.5">{c.unread}</Badge>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Performa Tim</CardTitle>
              <CardDescription>Aktivitas agent minggu ini</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { name: "Citra Lestari", deals: 4, leads: 18 },
                { name: "Gita Permata", deals: 3, leads: 14 },
                { name: "Indah Sari", deals: 2, leads: 12 },
              ].map((a) => (
                <div key={a.name} className="flex items-center justify-between text-sm">
                  <span className="font-medium">{a.name}</span>
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    <span>{a.leads} leads</span>
                    <span className="text-emerald-600 font-semibold">{a.deals} deal</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Aktivitas AI</CardTitle>
              <Zap className="h-4 w-4 text-amber-500" />
            </div>
            <CardDescription>24 jam terakhir</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ActivityRow icon={Bot} color="emerald" title="342 pesan ditangani AI" sub="Tingkat resolusi 87%" />
            <ActivityRow icon={MessageCircle} color="teal" title="58 percakapan baru" sub="42 dari WhatsApp" />
            <ActivityRow icon={ShoppingBag} color="amber" title="3 order baru terbentuk" sub="Otomatis dari chat" />
            <ActivityRow icon={Users} color="violet" title="12 lead baru terkualifikasi" sub="Skor rata-rata 7.8" />
            <div className="pt-2 mt-1 border-t flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Response time rata-rata</span>
              <span className="text-sm font-bold text-emerald-600">1.8 dtk</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ActivityRow({ icon: Icon, color, title, sub }: { icon: typeof Activity; color: string; title: string; sub: string }) {
  const map: Record<string, string> = {
    emerald: "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600",
    teal: "bg-teal-100 dark:bg-teal-950/40 text-teal-600",
    amber: "bg-amber-100 dark:bg-amber-950/40 text-amber-600",
    violet: "bg-violet-100 dark:bg-violet-950/40 text-violet-600",
  };
  return (
    <div className="flex items-start gap-3">
      <div className={cn("h-8 w-8 rounded-lg grid place-items-center shrink-0", map[color])}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium leading-tight">{title}</p>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </div>
    </div>
  );
}

function OrderBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    baru: "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
    diproses: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
    negosiasi: "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
    deal: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
    gagal: "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
    dibatalkan: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
  };
  return <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium capitalize", map[status] ?? "")}>{status}</span>;
}

interface Kpi {
  key: string;
  label: string;
  value: string;
  delta: number;
  Icon: typeof TrendingUp;
  iconBg: string;
  iconColor: string;
}

function getKpis(role: string): Kpi[] {
  const base: Record<string, Omit<Kpi, "key">> = {
    revenue: { label: "Pendapatan Bulan Ini", value: "Rp 645 jt", delta: 12.4, Icon: Wallet, iconBg: "bg-emerald-100 dark:bg-emerald-950/40", iconColor: "text-emerald-600" },
    leads: { label: "Leads Baru", value: "182", delta: 8.1, Icon: Users, iconBg: "bg-teal-100 dark:bg-teal-950/40", iconColor: "text-teal-600" },
    orders: { label: "Order Aktif", value: "24", delta: -3.2, Icon: ShoppingBag, iconBg: "bg-amber-100 dark:bg-amber-950/40", iconColor: "text-amber-600" },
    chats: { label: "Chat Belum Dibaca", value: "8", delta: 15.0, Icon: MessageCircle, iconBg: "bg-rose-100 dark:bg-rose-950/40", iconColor: "text-rose-600" },
    invoice: { label: "Invoice Lunas", value: "Rp 570 jt", delta: 22.0, Icon: Wallet, iconBg: "bg-emerald-100 dark:bg-emerald-950/40", iconColor: "text-emerald-600" },
    outstanding: { label: "Piutang Belum Bayar", value: "Rp 391 jt", delta: -5.4, Icon: TrendingDown, iconBg: "bg-rose-100 dark:bg-rose-950/40", iconColor: "text-rose-600" },
    campaign: { label: "Kampanye Aktif", value: "3", delta: 50.0, Icon: Activity, iconBg: "bg-violet-100 dark:bg-violet-950/40", iconColor: "text-violet-600" },
    resolved: { label: "AI Resolution Rate", value: "87%", delta: 4.2, Icon: Bot, iconBg: "bg-emerald-100 dark:bg-emerald-950/40", iconColor: "text-emerald-600" },
  };

  switch (role) {
    case "keuangan":
      return [
        { key: "k1", ...base.revenue },
        { key: "k2", ...base.invoice },
        { key: "k3", ...base.outstanding },
        { key: "k4", ...base.orders },
      ];
    case "marketing":
      return [
        { key: "k1", ...base.leads },
        { key: "k2", ...base.campaign },
        { key: "k3", ...base.chats },
        { key: "k4", ...base.resolved },
      ];
    case "operator":
      return [
        { key: "k1", ...base.chats },
        { key: "k2", ...base.leads },
        { key: "k3", ...base.orders },
        { key: "k4", ...base.resolved },
      ];
    default: // superadmin, admin, manager
      return [
        { key: "k1", ...base.revenue },
        { key: "k2", ...base.leads },
        { key: "k3", ...base.orders },
        { key: "k4", ...base.chats },
      ];
  }
}
