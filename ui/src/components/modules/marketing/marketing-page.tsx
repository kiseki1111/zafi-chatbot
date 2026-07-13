"use client";

import * as React from "react";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip as RTooltip,
  XAxis, YAxis,
} from "recharts";
import {
  Megaphone, Plus, MessageCircle, Mail, Smartphone, Search, Send,
  Calendar, Eye, CheckCheck, Reply, Users, Pause, Trash2,
  Copy, FileText, Clock, TrendingUp, CheckCircle2, AlertCircle, Hash,
  Zap,
} from "lucide-react";
import { CAMPAIGNS, MESSAGE_TEMPLATES } from "@/lib/mock-data";
import type {
  Campaign, CampaignChannel, CampaignStatus, MessageTemplate,
} from "@/lib/types";
import { useAuthStore } from "@/lib/auth-store";
import { useAppStore } from "@/lib/app-store";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// ===== Helpers =====
const channelMeta: Record<
  CampaignChannel,
  { label: string; icon: typeof MessageCircle; color: string; bg: string }
> = {
  whatsapp: {
    label: "WhatsApp",
    icon: MessageCircle,
    color: "text-emerald-600",
    bg: "bg-emerald-100 dark:bg-emerald-950/40",
  },
  email: {
    label: "Email",
    icon: Mail,
    color: "text-amber-600",
    bg: "bg-amber-100 dark:bg-amber-950/40",
  },
  sms: {
    label: "SMS",
    icon: Smartphone,
    color: "text-violet-600",
    bg: "bg-violet-100 dark:bg-violet-950/40",
  },
};

const statusMeta: Record<
  CampaignStatus,
  { label: string; className: string }
> = {
  aktif: {
    label: "Aktif",
    className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  },
  dijadwalkan: {
    label: "Dijadwalkan",
    className: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  },
  selesai: {
    label: "Selesai",
    className: "bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300",
  },
  draft: {
    label: "Draft",
    className: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
  },
  gagal: {
    label: "Gagal",
    className: "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
  },
};

const statusFilters: { key: "all" | CampaignStatus; label: string }[] = [
  { key: "all", label: "Semua" },
  { key: "aktif", label: "Aktif" },
  { key: "dijadwalkan", label: "Dijadwalkan" },
  { key: "selesai", label: "Selesai" },
  { key: "draft", label: "Draft" },
  { key: "gagal", label: "Gagal" },
];

// ===== Main =====
export function MarketingPage() {
  const { user } = useAuthStore();
  const { setView } = useAppStore();
  const { toast } = useToast();
  const [tab, setTab] = React.useState<"kampanye" | "template" | "broadcast">("kampanye");
  const [statusFilter, setStatusFilter] = React.useState<"all" | CampaignStatus>("all");
  const [channelFilter, setChannelFilter] = React.useState<"all" | CampaignChannel>("all");
  const [search, setSearch] = React.useState("");
  const [createOpen, setCreateOpen] = React.useState(false);
  const [templateOpen, setTemplateOpen] = React.useState(false);

  // ===== Derived stats =====
  const totalCampaigns = CAMPAIGNS.length;
  const activeCampaigns = CAMPAIGNS.filter((c) => c.status === "aktif").length;
  const totalSent = CAMPAIGNS.reduce((acc, c) => acc + c.sent, 0);
  const totalReplied = CAMPAIGNS.reduce((acc, c) => acc + c.replied, 0);
  const responseRate =
    totalSent > 0 ? ((totalReplied / totalSent) * 100).toFixed(1) : "0.0";

  // ===== Performance chart data =====
  const chartData = CAMPAIGNS.filter((c) => c.sent > 0)
    .slice(0, 6)
    .map((c) => ({
      name: c.name.length > 18 ? c.name.slice(0, 16) + "…" : c.name,
      read: c.read,
      replied: c.replied,
    }));

  // ===== Filtered campaigns =====
  const filteredCampaigns = CAMPAIGNS.filter((c) => {
    const okStatus = statusFilter === "all" || c.status === statusFilter;
    const okChannel = channelFilter === "all" || c.channel === channelFilter;
    const okSearch =
      search.trim() === "" ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.message.toLowerCase().includes(search.toLowerCase());
    return okStatus && okChannel && okSearch;
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-emerald-600" />
            Pusat Marketing
          </h2>
          <p className="text-sm text-muted-foreground">
            Kelola kampanye, template pesan, dan broadcast WhatsApp —
            selamat datang, {user?.name.split(" ")[0]}.
          </p>
        </div>
        <Button
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="h-4 w-4" /> Buat Kampanye
        </Button>
      </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList className="w-full sm:w-auto grid grid-cols-3 sm:flex">
            <TabsTrigger value="kampanye">
              <Megaphone className="h-3.5 w-3.5" /> Kampanye
            </TabsTrigger>
            <TabsTrigger value="template">
              <FileText className="h-3.5 w-3.5" /> Template
            </TabsTrigger>
            <TabsTrigger value="broadcast">
              <Send className="h-3.5 w-3.5" /> Broadcast
            </TabsTrigger>
          </TabsList>

          {/* ============ TAB: Kampanye ============ */}
          <TabsContent value="kampanye" className="space-y-5">
            {/* Stat cards */}
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Total Kampanye"
                value={String(totalCampaigns)}
                icon={Megaphone}
                iconBg="bg-emerald-100 dark:bg-emerald-950/40"
                iconColor="text-emerald-600"
              />
              <StatCard
                label="Kampanye Aktif"
                value={String(activeCampaigns)}
                icon={Zap}
                iconBg="bg-amber-100 dark:bg-amber-950/40"
                iconColor="text-amber-600"
              />
              <StatCard
                label="Pesan Terkirim"
                value={totalSent.toLocaleString("id-ID")}
                icon={Send}
                iconBg="bg-teal-100 dark:bg-teal-950/40"
                iconColor="text-teal-600"
              />
              <StatCard
                label="Tingkat Respon"
                value={`${responseRate}%`}
                icon={TrendingUp}
                iconBg="bg-violet-100 dark:bg-violet-950/40"
                iconColor="text-violet-600"
              />
            </div>

            {/* Chart + Filters row */}
            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Performa Kampanye</CardTitle>
                  <CardDescription>
                    Pesan dibaca vs pesan dibalas
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart
                        data={chartData}
                        margin={{ left: -16, right: 8, top: 8 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          className="stroke-muted"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="name"
                          tickLine={false}
                          axisLine={false}
                          className="text-[10px]"
                          interval={0}
                          angle={-12}
                          textAnchor="end"
                          height={56}
                        />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          className="text-xs"
                        />
                        <RTooltip
                          contentStyle={{
                            borderRadius: 12,
                            border: "1px solid hsl(var(--border))",
                            fontSize: 12,
                          }}
                        />
                        <Bar
                          dataKey="read"
                          name="Dibaca"
                          fill="#0d9488"
                          radius={[6, 6, 0, 0]}
                          maxBarSize={42}
                        />
                        <Bar
                          dataKey="replied"
                          name="Dibalas"
                          fill="#059669"
                          radius={[6, 6, 0, 0]}
                          maxBarSize={42}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[220px] grid place-items-center text-sm text-muted-foreground">
                      Belum ada data kampanye yang terkirim.
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Filter</CardTitle>
                  <CardDescription>Status & kanal kampanye</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-1.5">
                    {statusFilters.map((s) => (
                      <button
                        key={s.key}
                        onClick={() => setStatusFilter(s.key)}
                        className={cn(
                          "rounded-full px-3 py-1 text-xs font-medium transition-colors border",
                          statusFilter === s.key
                            ? "bg-emerald-600 text-white border-emerald-600"
                            : "bg-background text-muted-foreground hover:bg-muted border-border",
                        )}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Kanal</Label>
                    <Select
                      value={channelFilter}
                      onValueChange={(v) =>
                        setChannelFilter(v as "all" | CampaignChannel)
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Semua kanal" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Semua Kanal</SelectItem>
                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="sms">SMS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="relative pt-1">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Cari kampanye…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Campaign grid */}
            {filteredCampaigns.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {filteredCampaigns.map((c) => (
                  <CampaignCard key={c.id} campaign={c} toast={toast} />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 grid place-items-center text-center text-sm text-muted-foreground">
                  <div>
                    <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground/60" />
                    Tidak ada kampanye yang cocok dengan filter.
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ============ TAB: Template Pesan ============ */}
          <TabsContent value="template" className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold">
                  Template Pesan ({MESSAGE_TEMPLATES.length})
                </h3>
                <p className="text-xs text-muted-foreground">
                  Gunakan placeholder seperti{" "}
                  <code className="rounded bg-muted px-1 py-0.5 text-[10px]">
                    {"{nama}"}
                  </code>{" "}
                  <code className="rounded bg-muted px-1 py-0.5 text-[10px]">
                    {"{nama_properti}"}
                  </code>{" "}
                  untuk personalisasi.
                </p>
              </div>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => setTemplateOpen(true)}
              >
                <Plus className="h-4 w-4" /> Template Baru
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {MESSAGE_TEMPLATES.map((t) => (
                <TemplateCard key={t.id} template={t} toast={toast} />
              ))}
            </div>
          </TabsContent>

          {/* ============ TAB: Broadcast ============ */}
          <TabsContent value="broadcast">
            <BroadcastComposer toast={toast} />
          </TabsContent>
        </Tabs>

        {/* Create Campaign Dialog */}
        <CreateCampaignDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          toast={toast}
        />

        {/* New Template Dialog */}
        <NewTemplateDialog
          open={templateOpen}
          onOpenChange={setTemplateOpen}
          toast={toast}
        />
      </div>
    );
}

// ===== Stat Card =====
function StatCard({
  label, value, icon: Icon, iconBg, iconColor,
}: {
  label: string;
  value: string;
  icon: typeof Megaphone;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardDescription className="text-xs">{label}</CardDescription>
          <div className={cn("h-8 w-8 rounded-lg grid place-items-center", iconBg, iconColor)}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight mt-1">
          {value}
        </CardTitle>
      </CardHeader>
    </Card>
  );
}

// ===== Campaign Card =====
function CampaignCard({
  campaign, toast,
}: {
  campaign: Campaign;
  toast: (t: { title: string; description?: string }) => void;
}) {
  const ch = channelMeta[campaign.channel];
  const st = statusMeta[campaign.status];
  const progressPct =
    campaign.audience > 0
      ? Math.min(100, (campaign.delivered / campaign.audience) * 100)
      : 0;
  const ChIcon = ch.icon;

  const handlePause = () => {
    toast({
      title: "Kampanye dijeda",
      description: `"${campaign.name}" berhasil dijeda.`,
    });
  };
  const handleDelete = () => {
    toast({
      title: "Kampanye dihapus",
      description: `"${campaign.name}" telah dihapus dari daftar.`,
    });
  };

  return (
    <Card className="overflow-hidden flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base leading-tight truncate">
              {campaign.name}
            </CardTitle>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <Badge
                variant="secondary"
                className={cn("gap-1", ch.bg, ch.color, "border-transparent")}
              >
                <ChIcon className="h-3 w-3" /> {ch.label}
              </Badge>
              <Badge className={cn("border-transparent", st.className)}>
                {st.label}
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-3">
        {/* Stats row */}
        <div className="grid grid-cols-4 gap-2 text-center">
          <StatPill icon={Users} label="Audiens" value={campaign.audience} color="text-zinc-600 dark:text-zinc-300" />
          <StatPill icon={Send} label="Terkirim" value={campaign.sent} color="text-emerald-600" />
          <StatPill icon={Eye} label="Dibaca" value={campaign.read} color="text-teal-600" />
          <StatPill icon={Reply} label="Dibalas" value={campaign.replied} color="text-violet-600" />
        </div>

        {/* Progress */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Terkirim ke audiens</span>
            <span className="font-medium">
              {campaign.delivered.toLocaleString("id-ID")} /{" "}
              {campaign.audience.toLocaleString("id-ID")}
            </span>
          </div>
          <Progress
            value={progressPct}
            className="h-1.5 bg-emerald-100 dark:bg-emerald-950/40 [&>[data-slot=progress-indicator]]:bg-emerald-600"
          />
        </div>

        {/* Schedule */}
        {campaign.scheduledAt && (
          <div className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400">
            <Clock className="h-3.5 w-3.5" />
            <span>Dijadwalkan: {campaign.scheduledAt}</span>
          </div>
        )}

        {/* Message preview */}
        <div className="rounded-md bg-muted/50 p-2.5">
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {campaign.message}
          </p>
        </div>
      </CardContent>

      <CardFooter className="gap-2 pt-0">
        <Button variant="outline" size="sm" className="flex-1">
          <Eye className="h-3.5 w-3.5" /> Lihat Detail
        </Button>
        {campaign.status === "aktif" ? (
          <Button variant="outline" size="sm" onClick={handlePause}>
            <Pause className="h-3.5 w-3.5" /> Jeda
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
          >
            <Trash2 className="h-3.5 w-3.5" /> Hapus
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

function StatPill({
  icon: Icon, label, value, color,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-md border bg-card px-1.5 py-1.5">
      <Icon className={cn("h-3.5 w-3.5 mx-auto", color)} />
      <p className="text-[11px] font-semibold mt-0.5 leading-none">
        {value.toLocaleString("id-ID")}
      </p>
      <p className="text-[9px] text-muted-foreground mt-0.5 leading-none">
        {label}
      </p>
    </div>
  );
}

// ===== Template Card =====
function TemplateCard({
  template, toast,
}: {
  template: MessageTemplate;
  toast: (t: { title: string; description?: string }) => void;
}) {
  const handleUse = () => {
    toast({
      title: "Template dipilih",
      description: `"${template.name}" dimuat ke composer Broadcast.`,
    });
  };
  const handleCopy = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(template.body).catch(() => {});
    }
    toast({
      title: "Tersalin",
      description: "Isi template disalin ke clipboard.",
    });
  };

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm leading-tight">{template.name}</CardTitle>
          <Badge
            variant="secondary"
            className="bg-teal-100 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border-transparent shrink-0"
          >
            {template.category}
          </Badge>
        </div>
        <CardDescription className="text-[11px]">
          Dibuat {template.createdAt}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <pre className="text-xs font-mono whitespace-pre-wrap leading-relaxed text-muted-foreground bg-muted/40 rounded-md p-2.5 line-clamp-3">
          {template.body}
        </pre>
      </CardContent>
      <CardFooter className="gap-2 pt-0">
        <Button
          size="sm"
          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
          onClick={handleUse}
        >
          <Hash className="h-3.5 w-3.5" /> Gunakan
        </Button>
        <Button variant="outline" size="sm" onClick={handleCopy}>
          <Copy className="h-3.5 w-3.5" /> Salin
        </Button>
      </CardFooter>
    </Card>
  );
}

// ===== Broadcast Composer =====
function BroadcastComposer({
  toast,
}: {
  toast: (t: { title: string; description?: string }) => void;
}) {
  const [channel, setChannel] = React.useState<"whatsapp" | "email" | "sms">("whatsapp");
  const [segment, setSegment] = React.useState("all");
  const [templateId, setTemplateId] = React.useState<string>("none");
  const [message, setMessage] = React.useState("");
  const [schedule, setSchedule] = React.useState("");

  const segments: { value: string; label: string }[] = [
    { value: "all", label: "Semua Leads" },
    { value: "prospect", label: "Prospek" },
    { value: "vip", label: "VIP" },
    { value: "investor", label: "Investor" },
    { value: "customer", label: "Pelanggan" },
  ];

  const handlePickTemplate = (id: string) => {
    setTemplateId(id);
    if (id === "none") {
      setMessage("");
      return;
    }
    const t = MESSAGE_TEMPLATES.find((m) => m.id === id);
    if (t) setMessage(t.body);
  };

  const previewMessage = message
    .replace(/\{nama\}/g, "Budi")
    .replace(/\{nama_properti\}/g, "Rumah Modern Cibaduyut")
    .replace(/\{lokasi\}/g, "Cibaduyut, Bandung")
    .replace(/\{harga\}/g, "Rp 850.000.000")
    .replace(/\{luas\}/g, "120 m²")
    .replace(/\{dp\}/g, "Rp 170.000.000")
    .replace(/\{cicilan\}/g, "Rp 5,4 jt")
    .replace(/\{cicilan2\}/g, "Rp 4,6 jt")
    .replace(/\{tanggal\}/g, "20 Januari 2025");

  const handleSendNow = () => {
    if (!message.trim()) {
      toast({
        title: "Pesan kosong",
        description: "Isi pesan broadcast sebelum dikirim.",
      });
      return;
    }
    toast({
      title: "Broadcast dikirim",
      description: `Pesan ${channel.toUpperCase()} terkirim ke segmen ${
        segments.find((s) => s.value === segment)?.label
      }.`,
    });
    setMessage("");
    setTemplateId("none");
  };

  const handleSchedule = () => {
    if (!message.trim()) {
      toast({
        title: "Pesan kosong",
        description: "Isi pesan broadcast sebelum dijadwalkan.",
      });
      return;
    }
    if (!schedule) {
      toast({
        title: "Jadwal kosong",
        description: "Pilih tanggal & jam untuk menjadwalkan broadcast.",
      });
      return;
    }
    toast({
      title: "Broadcast dijadwalkan",
      description: `Akan dikirim pada ${schedule.replace("T", " ")}.`,
    });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      {/* Composer */}
      <Card className="lg:col-span-3">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Komposer Broadcast</CardTitle>
          <CardDescription>
            Susun pesan massal ke segmen kontak. WhatsApp direkomendasikan
            untuk respon tercepat.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Kanal</Label>
              <Select value={channel} onValueChange={(v) => setChannel(v as typeof channel)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Segmen Audiens</Label>
              <Select value={segment} onValueChange={setSegment}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {segments.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Muat Template (opsional)</Label>
            <Select value={templateId} onValueChange={handlePickTemplate}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pilih template…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Tanpa template —</SelectItem>
                {MESSAGE_TEMPLATES.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} · {t.category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Isi Pesan</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              placeholder="Tulis pesan… gunakan {nama} {nama_properti} untuk personalisasi."
              className="resize-none font-mono text-xs"
            />
            <p className="text-[11px] text-muted-foreground">
              Karakter: {message.length}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Jadwalkan (opsional)</Label>
            <Input
              type="datetime-local"
              value={schedule}
              onChange={(e) => setSchedule(e.target.value)}
            />
          </div>
        </CardContent>
        <CardFooter className="gap-2 flex-col-reverse sm:flex-row">
          <Button
            variant="outline"
            className="flex-1 w-full"
            onClick={handleSchedule}
          >
            <Calendar className="h-4 w-4" /> Jadwalkan
          </Button>
          <Button
            className="flex-1 w-full bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={handleSendNow}
          >
            <Send className="h-4 w-4" /> Kirim Sekarang
          </Button>
        </CardFooter>
      </Card>

      {/* WhatsApp Preview */}
      <Card className="lg:col-span-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-emerald-600" />
            Pratinjau WhatsApp
          </CardTitle>
          <CardDescription>
            Tampilan pesan di sisi penerima (placeholder {`{nama}`} → "Budi")
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <PhonePreview message={previewMessage} channel={channel} />
        </CardContent>
      </Card>
    </div>
  );
}

// ===== Phone Preview =====
function PhonePreview({
  message, channel,
}: {
  message: string;
  channel: "whatsapp" | "email" | "sms";
}) {
  return (
    <div className="w-full max-w-[280px] rounded-[2rem] border-4 border-zinc-800 dark:border-zinc-700 bg-zinc-900 dark:bg-zinc-950 p-2 shadow-xl">
      {/* Notch */}
      <div className="mx-auto w-20 h-1.5 rounded-full bg-zinc-700 mb-2" />
      {/* Screen */}
      <div className="rounded-[1.5rem] overflow-hidden bg-[#e5ddd5] dark:bg-zinc-800 h-[440px] flex flex-col">
        {/* Header */}
        <div className="bg-emerald-700 dark:bg-emerald-900 px-3 py-2 flex items-center gap-2 text-white">
          <div className="h-7 w-7 rounded-full bg-white/20 grid place-items-center text-xs font-bold">
            B
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold leading-tight">Budi</p>
            <p className="text-[10px] opacity-80 leading-tight">online</p>
          </div>
          <MessageCircle className="h-3.5 w-3.5 opacity-80" />
        </div>
        {/* Chat area */}
        <ScrollArea className="flex-1 px-2 py-2">
          <div className="space-y-2">
            {channel === "whatsapp" && message.trim() ? (
              <div className="max-w-[85%] ml-auto bg-[#dcf8c6] dark:bg-emerald-600 rounded-lg rounded-tr-sm px-2.5 py-1.5 shadow-sm">
                <p className="text-[11px] text-zinc-800 dark:text-white whitespace-pre-wrap leading-relaxed break-words">
                  {message}
                </p>
                <p className="text-[8px] text-zinc-500 dark:text-white/70 text-right mt-0.5 flex items-center justify-end gap-0.5">
                  09:41 <CheckCheck className="h-2.5 w-2.5 text-sky-500" />
                </p>
              </div>
            ) : (
              <div className="max-w-[85%] mx-auto text-center text-[10px] text-zinc-500 dark:text-zinc-400 bg-white/70 dark:bg-zinc-700/50 rounded-md px-3 py-2">
                {message.trim()
                  ? `Pratinjau ${channel.toUpperCase()}: pesan akan dikirim ke kontak.`
                  : "Pilih atau tulis pesan untuk melihat pratinjau di sini."}
              </div>
            )}
          </div>
        </ScrollArea>
        {/* Input bar */}
        <div className="bg-[#f0f0f0] dark:bg-zinc-900 px-2 py-1.5 flex items-center gap-1.5">
          <div className="flex-1 bg-white dark:bg-zinc-800 rounded-full px-2.5 py-1 text-[10px] text-zinc-400">
            Ketik pesan…
          </div>
          <div className="h-6 w-6 rounded-full bg-emerald-600 grid place-items-center">
            <Send className="h-3 w-3 text-white" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== Create Campaign Dialog =====
function CreateCampaignDialog({
  open, onOpenChange, toast,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  toast: (t: { title: string; description?: string }) => void;
}) {
  const [name, setName] = React.useState("");
  const [channel, setChannel] = React.useState<CampaignChannel>("whatsapp");
  const [audience, setAudience] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [schedule, setSchedule] = React.useState("");

  const reset = () => {
    setName("");
    setChannel("whatsapp");
    setAudience("");
    setMessage("");
    setSchedule("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !message.trim()) {
      toast({
        title: "Lengkapi data",
        description: "Nama kampanye dan isi pesan wajib diisi.",
      });
      return;
    }
    toast({
      title: "Kampanye dibuat",
      description: schedule
        ? `"${name}" dijadwalkan pada ${schedule.replace("T", " ")}.`
        : `"${name}" disimpan sebagai draft.`,
    });
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Buat Kampanye Baru</DialogTitle>
            <DialogDescription>
              Isi detail kampanye broadcast. Anda bisa menjadwalkan
              atau menyimpan sebagai draft.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="cmp-name">Nama Kampanye</Label>
              <Input
                id="cmp-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="mis. Promo Rumah Cibaduyut"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="cmp-channel">Kanal</Label>
                <Select
                  value={channel}
                  onValueChange={(v) => setChannel(v as CampaignChannel)}
                >
                  <SelectTrigger id="cmp-channel" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cmp-audience">Jumlah Audiens</Label>
                <Input
                  id="cmp-audience"
                  type="number"
                  min={0}
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  placeholder="mis. 250"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cmp-message">Isi Pesan</Label>
              <Textarea
                id="cmp-message"
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tulis pesan kampanye… gunakan {nama} untuk personalisasi."
                className="resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cmp-schedule">Jadwal (opsional)</Label>
              <Input
                id="cmp-schedule"
                type="datetime-local"
                value={schedule}
                onChange={(e) => setSchedule(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <CheckCircle2 className="h-4 w-4" /> Simpan Kampanye
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ===== New Template Dialog =====
function NewTemplateDialog({
  open, onOpenChange, toast,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  toast: (t: { title: string; description?: string }) => void;
}) {
  const [name, setName] = React.useState("");
  const [category, setCategory] = React.useState("Opening");
  const [body, setBody] = React.useState("");

  const reset = () => {
    setName("");
    setCategory("Opening");
    setBody("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !body.trim()) {
      toast({
        title: "Lengkapi data",
        description: "Nama dan isi template wajib diisi.",
      });
      return;
    }
    toast({
      title: "Template dibuat",
      description: `"${name}" ditambahkan ke daftar template.`,
    });
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Template Pesan Baru</DialogTitle>
            <DialogDescription>
              Gunakan placeholder{" "}
              <code className="rounded bg-muted px-1 text-[10px]">{`{nama}`}</code>,{" "}
              <code className="rounded bg-muted px-1 text-[10px]">{`{nama_properti}`}</code>,{" "}
              <code className="rounded bg-muted px-1 text-[10px]">{`{lokasi}`}</code>,{" "}
              <code className="rounded bg-muted px-1 text-[10px]">{`{harga}`}</code>{" "}
              untuk personalisasi otomatis.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="tpl-name">Nama Template</Label>
              <Input
                id="tpl-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="mis. Penawaran Listing Baru"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tpl-cat">Kategori</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="tpl-cat" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Opening">Opening</SelectItem>
                  <SelectItem value="Listing">Listing</SelectItem>
                  <SelectItem value="Financing">Financing</SelectItem>
                  <SelectItem value="Follow Up">Follow Up</SelectItem>
                  <SelectItem value="Closing">Closing</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tpl-body">Isi Pesan</Label>
              <Textarea
                id="tpl-body"
                rows={5}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Halo {nama}, berikut detail {nama_properti}…"
                className="resize-none font-mono text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Plus className="h-4 w-4" /> Simpan Template
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
