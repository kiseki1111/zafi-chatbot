"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Search,
  Phone,
  Info,
  Paperclip,
  Smile,
  Send,
  Bot,
  Check,
  CheckCheck,
  X,
  BatteryMedium,
  BatteryLow,
  Zap,
  MessageCircle,
  ChevronLeft,
  Plus,
  UserCheck,
  Sparkles,
  UserCog,
  Image as ImageIcon,
  Users,
} from "lucide-react";
import type {
  Contact,
  ChatMessage,
  MessageStatus,
} from "@/lib/types";
import { useAuthStore } from "@/lib/auth-store";
import { useAppStore } from "@/lib/app-store";
import { MOCK_CHATS, MOCK_CHAT_MESSAGES, DEFAULT_MOCK_MESSAGES } from "@/lib/mock-data";

// ---------- Helpers ----------

type Stage = Contact["stage"];

const STAGE_META: Record<Stage, { label: string; dot: string; badge: string }> = {
  lead: {
    label: "Lead",
    dot: "bg-zinc-400",
    badge: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
  },
  prospect: {
    label: "Prospek",
    dot: "bg-teal-500",
    badge: "bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300",
  },
  negotiation: {
    label: "Negosiasi",
    dot: "bg-amber-500",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  },
  customer: {
    label: "Customer",
    dot: "bg-emerald-500",
    badge:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  },
};

const TAG_META: Record<string, string> = {
  VIP: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  Cash:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  KPR: "bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300",
  Investor:
    "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
  Sewa: "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
};

function tagClass(tag: string): string {
  return TAG_META[tag] ?? "bg-muted text-muted-foreground";
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// Canned Indonesian AI auto-replies (used when "AI aktif" is on)
const AI_REPLIES: string[] = [
  "Baik, saya bantu cek ketersediaannya ya, Bapak/Ibu.",
  "Untuk properti tersebut, DP mulai 20%. Mau saya kirimkan simulasi?",
  "Terima kasih infonya. Boleh saya jadwalkan survey akhir pekan ini?",
  "Saya catat permintaan Anda dan akan koordinasi dengan agent terkait.",
  "Harga masih dapat dibicarakan. Mau saya bantu negosiasi terbaik?",
  "Baik, saya kirimkan brosur & foto lengkapnya sekarang ya.",
];

const AI_SUGGESTIONS: string[] = [
  "Halo! Terima kasih sudah menghubungi. Ada yang bisa saya bantu terkait properti impian Anda?",
  "Baik, saya bantu cek ketersediaannya ya, Bapak/Ibu.",
  "Untuk properti ini DP mulai 20%, tenor KPR hingga 20 tahun. Mau saya kirim simulasi?",
  "Bisa saya jadwalkan survey lokasi akhir pekan ini?",
];

let msgCounter = 1000;
function nextMsgId(): string {
  msgCounter += 1;
  return `m-${msgCounter}`;
}

function nowTime(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes(),
  ).padStart(2, "0")}`;
}

// ---------- Sub-components ----------

function StatusTicks({ status }: { status: MessageStatus }) {
  if (status === "sent")
    return <Check className="h-3.5 w-3.5 text-white/70" aria-label="Terkirim" />;
  if (status === "delivered")
    return (
      <CheckCheck
        className="h-3.5 w-3.5 text-white/70"
        aria-label="Sampai"
      />
    );
  if (status === "read")
    return (
      <CheckCheck
        className="h-3.5 w-3.5 text-sky-200"
        aria-label="Dibaca"
      />
    );
  return <X className="h-3.5 w-3.5 text-rose-300" aria-label="Gagal" />;
}

function MessageBubble({
  msg,
  contactName,
}: {
  msg: ChatMessage;
  contactName: string;
}) {
  const isOut = msg.direction === "out";
  const isCall = msg.messageType === "call";
  const isImage = msg.messageType === "image" && msg.mediaUrl;
  const isVideo = msg.messageType === "video" && msg.mediaUrl;

  if (isCall) {
    return (
      <div className="flex w-full justify-center my-2">
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-[11px] font-medium shadow-xs">
          <Phone className="h-3 w-3 text-amber-600" />
          <span>{msg.text || "Panggilan WhatsApp masuk (Otomatis ditolak)"}</span>
          <span className="text-[9px] opacity-70 ml-1">{msg.timestamp}</span>
        </div>
      </div>
    );
  }
  return (
    <div
      className={cn(
        "flex w-full gap-2 mb-2",
        isOut ? "justify-end" : "justify-start",
      )}
    >
      {!isOut && (
        <Avatar className="h-7 w-7 mt-auto shrink-0">
          <AvatarFallback className="text-[10px] bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
            {initials(contactName)}
          </AvatarFallback>
        </Avatar>
      )}
      <div
        className={cn(
          "max-w-[78%] sm:max-w-[68%] px-3 py-2 rounded-2xl shadow-sm text-sm leading-relaxed",
          isOut
            ? "bg-emerald-600 text-white rounded-br-sm"
            : "bg-background border rounded-bl-sm",
        )}
      >
        {msg.isAI && (
          <div
            className={cn(
              "mb-1 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
              isOut
                ? "bg-white/20 text-white"
                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
            )}
          >
            <Bot className="h-3 w-3" /> AI
          </div>
        )}
        {msg.senderName && !msg.isAI && isOut && (
          <div className="mb-1 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold bg-white/20 text-white">
            <UserCog className="h-3 w-3" /> {msg.senderName}
          </div>
        )}
        {isImage ? (
          <img
            src={msg.mediaUrl}
            alt={msg.text || "gambar"}
            className="rounded-lg max-w-full max-h-64 object-cover mb-1"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : null}
        {isVideo ? (
          <video
            src={msg.mediaUrl}
            controls
            preload="metadata"
            className="rounded-lg max-w-full max-h-64 object-cover mb-1 bg-black"
          />
        ) : null}
        {/* Untuk pesan image/video: sembunyikan placeholder caption default */}
        {msg.text &&
          !(
            (msg.messageType === "image" || msg.messageType === "video") &&
            (msg.text === "Mengirim foto" || msg.text === "Mengirim video" || msg.text?.startsWith("Mengirim "))
          ) && (
          <p className="whitespace-pre-wrap break-words">{msg.text}</p>
        )}
        <div
          className={cn(
            "mt-1 flex items-center gap-1 justify-end text-[10px]",
            isOut ? "text-white/80" : "text-muted-foreground",
          )}
        >
          <span>{msg.timestamp}</span>
          {isOut && <StatusTicks status={msg.status} />}
        </div>
      </div>
    </div>
  );
}

function ContactListItem({
  contact,
  active,
  onClick,
}: {
  contact: Contact;
  active: boolean;
  onClick: () => void;
}) {
  const stage = STAGE_META[contact.stage];
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        "w-full grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-lg p-3 text-left transition-all duration-150 ease-out cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 active:scale-[0.98]",
        active
          ? "bg-emerald-50 dark:bg-emerald-950/30 ring-1 ring-emerald-200 dark:ring-emerald-800 shadow-xs"
          : "hover:bg-muted/60 hover:translate-x-0.5",
      )}
    >
      <div className="relative shrink-0">
        <Avatar className="h-10 w-10">
          {contact.avatar && (
            <AvatarImage src={contact.avatar} alt={contact.name} className="object-cover" />
          )}
          <AvatarFallback className="text-xs bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
            {initials(contact.name)}
          </AvatarFallback>
        </Avatar>
        <span
          className={cn(
            "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-background",
            stage.dot,
          )}
          title={stage.label}
        />
      </div>
        <div className="min-w-0 flex-1 flex flex-col justify-center">
          <div className="grid grid-cols-[1fr_auto] items-center gap-2">
            <p className="text-sm font-medium truncate">{contact.name}</p>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground">
                {contact.lastMessageAt}
              </span>
              {(contact.unread ?? 0) > 0 && (
                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
                  {contact.unread}
                </span>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {contact.lastMessage}
          </p>
          <div className="flex flex-wrap gap-1 mt-1">
            {contact.mode === "human" ? (
              <span className="inline-flex items-center rounded px-1 py-0 text-[10px] font-medium bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 gap-0.5">
                <UserCog className="h-2.5 w-2.5" />
                {contact.assignedToName ? contact.assignedToName : "Admin"}
              </span>
            ) : (
              <span className="inline-flex items-center rounded px-1 py-0 text-[10px] font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 gap-0.5">
                <span className="relative flex h-2 w-2 mr-0.5">
                  <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <Bot className="h-2.5 w-2.5" /> Bot
              </span>
            )}
            {contact.tags.slice(0, 2).map((t) => (
              <span
                key={t}
                className={cn(
                  "inline-flex items-center rounded px-1 py-0 text-[9px] font-medium",
                  tagClass(t),
                )}
              >
                {t}
              </span>
            ))}
          </div>
        </div>
    </div>
  );
}

function ContactInfoPanel({
  contact,
  onStageChange,
  onRemoveTag,
  onAddTag,
  newTag,
  setNewTag,
  notes,
  setNotes,
}: {
  contact: Contact;
  onStageChange: (s: Stage) => void;
  onRemoveTag: (t: string) => void;
  onAddTag: () => void;
  newTag: string;
  setNewTag: (v: string) => void;
  notes: string;
  setNotes: (v: string) => void;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="p-4 space-y-4">
          {/* Identity */}
          <div className="flex flex-col items-center text-center">
            <Avatar className="h-16 w-16 mb-2">
              <AvatarFallback className="text-lg bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
                {initials(contact.name)}
              </AvatarFallback>
            </Avatar>
            <p className="font-semibold">{contact.name}</p>
            <p className="text-xs text-muted-foreground">+{contact.phone}</p>
            <Badge
              variant="secondary"
              className={cn("mt-2", STAGE_META[contact.stage].badge)}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full mr-1",
                  STAGE_META[contact.stage].dot,
                )}
              />
              {STAGE_META[contact.stage].label}
            </Badge>
          </div>

          <Separator />

          {/* Stage selector */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Tahap Pipeline</Label>
            <Select
              value={contact.stage}
              onValueChange={(v) => onStageChange(v as Stage)}
            >
              <SelectTrigger className="w-full" size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lead">Lead</SelectItem>
                <SelectItem value="prospect">Prospek</SelectItem>
                <SelectItem value="negotiation">Negosiasi</SelectItem>
                <SelectItem value="customer">Customer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Tag</Label>
            <div className="flex flex-wrap gap-1.5">
              {contact.tags.map((t) => (
                <Badge
                  key={t}
                  variant="secondary"
                  className={cn("gap-1 pr-1", tagClass(t))}
                >
                  {t}
                  <button
                    onClick={() => onRemoveTag(t)}
                    className="rounded-full hover:bg-black/10 p-0.5"
                    aria-label={`Hapus tag ${t}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {contact.tags.length === 0 && (
                <span className="text-xs text-muted-foreground">
                  Belum ada tag
                </span>
              )}
            </div>
            <div className="flex gap-1.5">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Tambah tag…"
                className="h-8 text-xs"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onAddTag();
                  }
                }}
              />
              <Button
                size="icon"
                variant="outline"
                className="h-8 w-8 shrink-0"
                onClick={onAddTag}
                aria-label="Tambah tag"
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <Separator />

          {/* Property interest */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">
              Properti Diminati
            </Label>
            <p className="text-sm font-medium">{contact.propertyInterest ?? "-"}</p>
          </div>

          {/* Assigned */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Ditangani Oleh</Label>
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-[10px] bg-teal-100 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300">
                  {initials(contact.assignedTo ?? "?")}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm">{contact.assignedTo ?? "-"}</span>
            </div>
          </div>

          <Separator />

          <Separator />

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Catatan / Aktivitas Terbaru
            </Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Tulis catatan tentang kontak ini…"
              className="min-h-[80px] text-xs resize-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- Main page ----------

export function ChatbotPage() {
  const { user } = useAuthStore();
  const { activeContactId, setActiveContactId, activeSessionId, setActiveSessionId } = useAppStore();
  const me = user?.name ?? "Saya";
  const [sessions, setSessions] = useState<{id: string, name: string, status: string, battery?: number}[]>([]);
  const sessionId = activeSessionId || "";
  const setSessionId = setActiveSessionId;
  
  useEffect(() => {
    const query = user?.tenantId && user.role !== 'superadmin' ? `?tenantId=${user.tenantId}` : '';
    fetch(`/api/v1/waha/instances${query}`)
      .then(res => res.json())
      .then(data => {
         let sessionsData = data;
         if (data && data.data && Array.isArray(data.data)) {
           sessionsData = data.data;
         }
         let mapped: any[] = [];
         if (Array.isArray(sessionsData)) {
           mapped = sessionsData
             .filter((d: any) => d.status?.toLowerCase() === 'working')
             .map((d: any) => ({ id: d.name, name: d.name, status: d.status?.toLowerCase() || 'stopped' }));
         }
         // Selalu sediakan Sesi Dev Simulator untuk testing lokal
         if (!mapped.some((m) => m.id === "dev-session")) {
           mapped.push({ id: "dev-session", name: "Sesi Simulasi (Dev)", status: "working" });
         }
         setSessions(mapped);
         if (!sessionId && mapped.length > 0) {
           setSessionId(mapped[0].id);
         }
      }).catch(() => {
        const fallback = [{ id: "dev-session", name: "Sesi Simulasi (Dev)", status: "working" }];
        setSessions(fallback);
        if (!sessionId) setSessionId("dev-session");
      });
  }, [user?.tenantId, user?.role]);

  const activeSession = useMemo(
    () => sessions.find((s) => s.id === sessionId) ?? null,
    [sessionId, sessions]
  );
  const isConnected = activeSession?.status === "working";

  // AI toggle for suggested replies
  const [aiSuggest, setAiSuggest] = useState(true);

  // Contacts / Conversations
  const [contacts, setContacts] = useState<Contact[]>([]);
  const activeId = activeContactId;
  const setActiveId = setActiveContactId;

  // Messages & Pagination
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [skip, setSkip] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // UI state
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "mine">("all");
  const [input, setInput] = useState("");
  const [infoOpenMobile, setInfoOpenMobile] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [mobileShowList, setMobileShowList] = useState(false);
  const [chatFilter, setChatFilter] = useState<"all"|"bot"|"human"|"unread">("all");

  // Takeover state
  const [takingOver, setTakingOver] = useState(false);
  const [imagePreview, setImagePreview] = useState<{ base64: string; mimeType: string; name: string } | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Real WAHA Tester modal state
  const [isWahaTestModalOpen, setIsWahaTestModalOpen] = useState(false);
  const [wahaTestLoading, setWahaTestLoading] = useState(false);
  const [wahaTestResult, setWahaTestResult] = useState<any>(null);
  const [wahaTestForm, setWahaTestForm] = useState({
    sessionName: "Zafi-CS",
    chatId: "6281234567890",
    text: "Halo, ini pesan test simulasi WAHA",
    imageUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&auto=format&fit=crop",
  });

  // Contact detail modal state
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Quota & Billing state (MAU & AI Response)
  const [quota, setQuota] = useState<{
    plan: string;
    planName: string;
    planPrice: number;
    priceLabel: string;
    mauUsed: number;
    maxMau: number;
    mauPercent: number;
    aiResponsesUsed: number;
    maxAiResponses: number;
    aiResponsesPercent: number;
    isMauExceeded: boolean;
    isAiResponsesExceeded: boolean;
  }>({
    plan: "trial",
    planName: "Free Trial",
    planPrice: 0,
    priceLabel: "Gratis",
    mauUsed: 0,
    maxMau: 10,
    mauPercent: 0,
    aiResponsesUsed: 0,
    maxAiResponses: 50,
    aiResponsesPercent: 0,
    isMauExceeded: false,
    isAiResponsesExceeded: false,
  });

  const fetchQuota = () => {
    const fetchId =
      user?.tenantId ||
      (user?.id && !user.id.startsWith("u-") && user.role !== "superadmin"
        ? user.id
        : "demo");
    if (!fetchId) return;
    fetch(`/api/v1/tenant/clients/${fetchId}/quota`)
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => {
        const data = res?.data || res;
        if (data && data.plan) setQuota(data);
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchQuota();
  }, [user?.tenantId, user?.id, user?.role]);

  // Fetch Conversations
  const fetchConversations = async () => {
    if (!sessionId) return;
    const isDemo =
      user?.id?.startsWith('u-') ||
      user?.email?.includes('demo') ||
      (process.env.NODE_ENV !== 'production' && !user?.tenantId);

    try {
      const tenantQuery = user?.tenantId && user.role !== 'superadmin' ? `&tenantId=${user.tenantId}` : '';
      const res = await fetch(`/api/v1/chats?instanceName=${sessionId}${tenantQuery}`);
      const data = await res.json();
      let chatsData = data;
      if (data && data.data && Array.isArray(data.data)) {
        chatsData = data.data;
      }
      if (!Array.isArray(chatsData) || chatsData.length === 0) {
        if (isDemo) {
          setContacts(MOCK_CHATS);
          if (!activeId) setActiveId(MOCK_CHATS[0].id);
        } else {
          setContacts([]);
        }
        return;
      }
      const mappedContacts: Contact[] = chatsData.map((c: any) => {
        const cleanPhone = (c.contactNumber || "")
          .replace(/@(c\.us|s\.whatsapp\.net|lid|broadcast)$/i, "")
          .replace(/^\+/, "");
        const cleanName = cleanPhone ? `+${cleanPhone}` : (c.contactName || "Pelanggan");
        return {
          id: c.id,
          name: cleanName,
          phone: cleanPhone,
          stage: c.status === 'OPEN' ? 'lead' : 'customer',
          tags: [],
          assignedTo: c.assignedTo?.id,
          assignedToName: c.assignedTo?.name,
          mode: c.mode || 'bot',
          unread: c.unreadCount,
          lastMessage: c.messages?.[0]?.content,
          lastMessageAt: new Date(c.lastMessageAt).toLocaleTimeString(),
        };
      });
      setContacts((prev) => {
        const prevMap = new Map(prev.map((item) => [item.id, item]));
        return mappedContacts.map((mc) => {
          const existing = prevMap.get(mc.id);
          return {
            ...mc,
            avatar: existing?.avatar || mc.avatar,
            about: existing?.about || mc.about,
          };
        });
      });
      if (!activeId && mappedContacts.length > 0) {
         setActiveId(mappedContacts.find((c) => c.unread > 0)?.id ?? mappedContacts[0].id);
      }
    } catch (e) {
      console.error(e);
      if (isDemo) {
        setContacts(MOCK_CHATS);
        if (!activeId) setActiveId(MOCK_CHATS[0].id);
      } else {
        setContacts([]);
      }
    }
  };

  // Fetch Messages for active chat
  const fetchMessages = async (reset = false) => {
    if (!activeId) return;
    const currentSkip = reset ? 0 : skip;
    if (reset) setLoadingMore(true);
    
    try {
      const res = await fetch(`/api/v1/chats/${activeId}/messages?skip=${currentSkip}&take=20`);
      const data = await res.json();
      let msgsData = data;
      if (data && data.data && Array.isArray(data.data)) {
        msgsData = data.data;
      }
      if (!Array.isArray(msgsData) || (reset && msgsData.length === 0)) {
        const mockMsgs = MOCK_CHAT_MESSAGES[activeId] || DEFAULT_MOCK_MESSAGES;
        setMessages(mockMsgs);
        setHasMore(false);
        return;
      }
      const mappedMsgs: ChatMessage[] = msgsData.map((m: any) => ({
        id: m.id,
        contactId: m.conversationId,
        direction: m.senderType === 'customer' ? 'in' : 'out',
        text: m.content,
        status: m.status?.toLowerCase() || 'sent',
        timestamp: new Date(m.createdAt).toLocaleTimeString(),
        isAI: m.senderType === 'bot' || m.senderType === 'ai',
        senderName: m.senderType === 'agent' ? (m.sender?.name || 'Admin') : undefined,
        messageType: m.messageType?.toLowerCase(),
        mediaUrl: (m.metadata as any)?.localMediaUrl || (m.metadata as any)?.mediaUrl || (m.metadata as any)?.url,
      }));
      
      if (reset) {
         setMessages(mappedMsgs);
         setSkip(20);
         setHasMore(mappedMsgs.length === 20);
      } else {
         if (mappedMsgs.length > 0) {
            // Prepend older messages
            setMessages(prev => [...mappedMsgs, ...prev]);
            setSkip(s => s + 20);
            setHasMore(mappedMsgs.length === 20);
         } else {
            setHasMore(false);
         }
      }
    } catch (e) {
      console.error(e);
      const mockMsgs = MOCK_CHAT_MESSAGES[activeId] || DEFAULT_MOCK_MESSAGES;
      setMessages(mockMsgs);
      setHasMore(false);
    } finally {
      if (reset) setLoadingMore(false);
    }
  };

  // Initial loads and activeId change
  useEffect(() => {
    fetchConversations();
  }, [sessionId]);

  // Fetch active contact profile picture & bio
  const fetchActiveProfile = async (convId: string) => {
    if (!convId) return;
    setLoadingProfile(true);
    try {
      const res = await fetch(`/api/v1/chats/${convId}/profile`);
      if (res.ok) {
        const profile = await res.json();
        const pfp = profile?.profilePicture || null;
        const about = profile?.about || null;
        setContacts((prev) =>
          prev.map((c) =>
            c.id === convId ? { ...c, avatar: pfp || c.avatar, about: about || c.about } : c
          )
        );
      }
    } catch (e) {
      console.debug("Could not fetch contact profile:", e);
    } finally {
      setLoadingProfile(false);
    }
  };

  useEffect(() => {
    if (activeId) {
      fetchMessages(true);
      fetchActiveProfile(activeId);
    }
  }, [activeId]);

  // Polling for real-time updates (every 5 seconds)
  useEffect(() => {
    const fetchLatest = () => {
      fetchConversations();
      if (activeId) {
         fetch(`/api/v1/chats/${activeId}/messages?skip=0&take=20`)
          .then(r => r.json())
          .then(data => {
            let msgsData = data;
            if (data && data.data && Array.isArray(data.data)) {
              msgsData = data.data;
            }
            if (!Array.isArray(msgsData)) return;
            const mappedMsgs: ChatMessage[] = msgsData.map((m: any) => ({
              id: m.id,
              contactId: m.conversationId,
              direction: m.senderType === 'customer' ? 'in' : 'out',
              text: m.content,
              status: m.status?.toLowerCase() || 'sent',
              timestamp: new Date(m.createdAt).toLocaleTimeString(),
              isAI: m.senderType === 'bot' || m.senderType === 'ai',
              senderName: m.senderType === 'agent' ? (m.sender?.name || 'Admin') : undefined,
              messageType: m.messageType?.toLowerCase(),
              mediaUrl: (m.metadata as any)?.localMediaUrl || (m.metadata as any)?.mediaUrl || (m.metadata as any)?.url,
            }));
            setMessages(prev => {
               if (skip <= 20) return mappedMsgs;
               const existingIds = new Set(prev.map(p => p.id));
               const newMsgs = mappedMsgs.filter(m => !existingIds.has(m.id));
               return [...prev, ...newMsgs];
            });
          });
      }
    };

    // SSE Live Stream Connection (Realtime instant update)
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource(`/api/v1/chats/stream?conversationId=${activeId}`);
      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload?.type === 'message' && payload?.data?.message) {
            const raw = payload.data.message;
            if (raw.conversationId === activeId) {
              const isBot = raw.senderType === 'bot' || raw.senderType === 'ai';
              const liveMsg: ChatMessage = {
                id: raw.id || `live-${Date.now()}`,
                contactId: raw.conversationId,
                direction: raw.senderType === 'customer' ? 'in' : 'out',
                text: raw.content || '',
                timestamp: new Date(raw.createdAt || Date.now()).toLocaleTimeString(),
                status: 'delivered',
                isAI: isBot,
                senderName: raw.senderType === 'agent' ? (raw.sender?.name || 'Admin') : undefined,
                messageType: raw.messageType?.toLowerCase(),
                mediaUrl: (raw.metadata as any)?.localMediaUrl || (raw.metadata as any)?.mediaUrl || (raw.metadata as any)?.url,
              };
              setMessages((prev) => {
                if (prev.some((p) => p.id === liveMsg.id)) return prev;
                return [...prev, liveMsg];
              });
            }
          }
        } catch {}
      };
    } catch {}

    // Fallback Poll every 10 seconds (as backup if connection drops)
    const interval = setInterval(fetchLatest, 10000);
    
    // Fetch immediately when user focuses back on the tab
    const onFocus = () => fetchLatest();
    window.addEventListener("focus", onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      if (eventSource) eventSource.close();
    };
  }, [sessionId, activeId, skip]);

  const activeContact = useMemo(
    () => contacts.find((c) => c.id === activeId) ?? null,
    [contacts, activeId],
  );

  const activeMessages = messages; // Already filtered by activeId via API

  const filteredContacts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return contacts.filter((c) => {
      if (q && !c.name.toLowerCase().includes(q) && !c.phone.includes(q))
        return false;
      if (filter === "mine") return c.assignedTo === me;
      // Chat filter chips
      if (chatFilter === "bot") return c.mode !== "human";
      if (chatFilter === "human") return c.mode === "human";
      if (chatFilter === "unread") return (c.unread ?? 0) > 0;
      return true;
    });
  }, [contacts, search, filter, chatFilter, me]);

  // Stats
  const messagesToday = useMemo(
    () => messages.length, 
    [messages],
  );

  // Auto-scroll to bottom on new messages / contact switch
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (skip <= 20) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [activeMessages.length, activeId]);

  // Infinite Scroll Handler
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target.scrollTop === 0 && hasMore && !loadingMore) {
       // Save current scroll height to restore position after prepend
       const oldScrollHeight = target.scrollHeight;
       setLoadingMore(true);
       fetchMessages(false).then(() => {
         // Restore scroll position
         requestAnimationFrame(() => {
           if (scrollAreaRef.current) {
             const newScrollHeight = scrollAreaRef.current.scrollHeight;
             scrollAreaRef.current.scrollTop = newScrollHeight - oldScrollHeight;
           }
         });
         setLoadingMore(false);
       });
    }
  };

  // Selecting a contact: mark unread as 0
  function selectContact(id: string) {
    setActiveId(id);
    setMobileShowList(false);
  }

  // Toggle Takeover / Release
  async function toggleTakeover() {
    if (!activeId || !activeContact) return;
    setTakingOver(true);
    const isHuman = activeContact.mode === "human";
    const endpoint = `/api/v1/chats/${activeId}/${isHuman ? "release" : "takeover"}`;
    try {
      const res = await fetch(endpoint, { method: "POST" });
      if (res.ok) {
        setContacts((prev) =>
          prev.map((c) =>
            c.id === activeId
              ? {
                  ...c,
                  mode: isHuman ? "bot" : "human",
                  assignedToName: isHuman ? undefined : me,
                }
              : c,
          ),
        );
      }
    } catch (e) {
      console.error("Gagal toggle takeover", e);
    } finally {
      setTakingOver(false);
    }
  }

  // Handle image selection
  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    processImageFile(file);
    e.target.value = "";
  }

  // Process image file (from input or clipboard)
  function processImageFile(file: File) {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      setImagePreview({ base64, mimeType: file.type, name: file.name || "screenshot.png" });
    };
    reader.readAsDataURL(file);
  }

  // Clipboard Paste handler (for screenshots / Ctrl+V)
  function handlePaste(e: React.ClipboardEvent) {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith("image/")) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          processImageFile(file);
          break;
        }
      }
    }
  }

  // Send a message (text and/or image)
  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if ((!trimmed && !imagePreview) || !activeId || !sessionId || !activeContact) return;

    const isHuman = activeContact.mode === "human";

    if (imagePreview) {
      const tempId = "temp-img-" + Date.now();
      const newMsg: ChatMessage = {
        id: tempId,
        contactId: activeId,
        direction: "out",
        text: trimmed,
        status: "sent",
        timestamp: new Date().toLocaleTimeString(),
        isAI: false,
        senderName: me,
        messageType: "image",
        mediaUrl: `data:${imagePreview.mimeType};base64,${imagePreview.base64}`,
      };
      setMessages((prev) => [...prev, newMsg]);
      const currentPreview = imagePreview;
      setImagePreview(null);
      setInput("");

      try {
        await fetch(`/api/v1/chats/${activeId}/send-image`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            base64: currentPreview.base64,
            mimeType: currentPreview.mimeType,
            caption: trimmed || undefined,
          }),
        });
      } catch (e) {
        console.error("Failed to send image", e);
      }
      return;
    }

    // Text message
    const tempId = "temp-" + Date.now();
    const newMsg: ChatMessage = {
      id: tempId,
      contactId: activeId,
      direction: "out",
      text: trimmed,
      status: "sent",
      timestamp: new Date().toLocaleTimeString(),
      isAI: false,
      senderName: isHuman ? me : undefined,
    };
    setMessages((prev) => [...prev, newMsg]);
    setInput("");

    try {
      const url = isHuman
        ? `/api/v1/chats/${activeId}/send`
        : `/api/v1/waha/instances/${sessionId}/send`;
      const body = isHuman
        ? JSON.stringify({ text: trimmed })
        : JSON.stringify({ chatId: activeContact.phone, text: trimmed });

      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
    } catch (e) {
      console.error("Failed to send message, simulating mock reply", e);
      if (!isHuman) {
        setTimeout(() => {
          const botReply: ChatMessage = {
            id: "reply-" + Date.now(),
            contactId: activeId,
            direction: "out",
            text: "Terima kasih atas pesannya! Informasi ini telah dicatat oleh sistem AI dan segera ditindaklanjuti.",
            status: "read",
            timestamp: new Date().toLocaleTimeString(),
            isAI: true,
          };
          setMessages((prev) => [...prev, botReply]);
        }, 700);
      }
    }
  }

  // Trigger Real WAHA Send Test
  async function triggerRealWahaTest() {
    setWahaTestLoading(true);
    setWahaTestResult(null);
    try {
      const res = await fetch('/api/v1/chats/test-real-waha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionName: wahaTestForm.sessionName,
          chatId: wahaTestForm.chatId,
          text: wahaTestForm.text,
          imageUrl: wahaTestForm.imageUrl || undefined,
        }),
      });
      const data = await res.json();
      setWahaTestResult(data.data || data);
    } catch (e: any) {
      setWahaTestResult({ sendSuccess: false, error: e.message });
    } finally {
      setWahaTestLoading(false);
    }
  }

  function handleStageChange(stage: Stage) {
    if (!activeId) return;
    setContacts((prev) =>
      prev.map((c) => (c.id === activeId ? { ...c, stage } : c)),
    );
  }

  function handleRemoveTag(tag: string) {
    if (!activeId) return;
    setContacts((prev) =>
      prev.map((c) =>
        c.id === activeId
          ? { ...c, tags: c.tags.filter((t) => t !== tag) }
          : c,
      ),
    );
  }

  function handleAddTag() {
    if (!activeId || !newTag.trim()) return;
    const t = newTag.trim();
    setContacts((prev) =>
      prev.map((c) =>
        c.id === activeId && !c.tags.includes(t)
          ? { ...c, tags: [...c.tags, t] }
          : c,
      ),
    );
    setNewTag("");
  }

  // Suggested AI reply shown as chip when "AI Saran" is on
  const suggestion = useMemo(() => {
    if (!aiSuggest) return null;
    return AI_SUGGESTIONS[Math.floor(Math.random() * AI_SUGGESTIONS.length)];
  }, [aiSuggest, activeId, activeMessages.length]);

  const infoPanel = activeContact ? (
    <ContactInfoPanel
      contact={activeContact}
      onStageChange={handleStageChange}
      onRemoveTag={handleRemoveTag}
      onAddTag={handleAddTag}
      newTag={newTag}
      setNewTag={setNewTag}
      notes={notes[activeContact.id] ?? ""}
      setNotes={(v) =>
        setNotes((prev) => ({ ...prev, [activeContact.id]: v }))
      }
    />
  ) : null;

  return (
    <div className="flex flex-col flex-1 h-full min-h-0 gap-1.5">
      {/* ===== Top Session Selector Bar (Single Streamlined Row) ===== */}
      <div className={cn(
        "flex items-center justify-between gap-2 px-3 py-1.5 bg-card border rounded-xl shadow-2xs shrink-0",
        !mobileShowList && activeId ? "hidden md:flex" : "flex"
      )}>
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="h-6 w-6 rounded-md bg-emerald-600 text-white grid place-items-center shrink-0">
            <MessageCircle className="h-3.5 w-3.5" />
          </div>
          <Select value={sessionId} onValueChange={setSessionId}>
            <SelectTrigger className="w-[180px] sm:w-[220px] h-7 text-xs bg-muted/50 border-0 gap-1.5">
              <SelectValue placeholder="Pilih sesi WAHA" />
            </SelectTrigger>
            <SelectContent>
              {sessions.length === 0 && <SelectItem value="none" disabled>Tidak ada sesi aktif</SelectItem>}
              {sessions.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full",
                        s.status === "working"
                          ? "bg-emerald-500"
                          : s.status === "starting"
                            ? "bg-amber-500"
                            : "bg-rose-500",
                      )}
                    />
                    <span className="text-xs font-medium">{s.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] text-muted-foreground hidden lg:inline pr-1">
            <strong className="text-foreground">{contacts.length}</strong> kontak · <strong className="text-foreground">{messagesToday}</strong> pesan
          </span>
          {isConnected && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Online
            </span>
          )}
        </div>
      </div>

      {/* ===== Main 3-column ===== */}
      <div className="flex-1 flex gap-2 min-h-0">
        {/* ----- Left: contact list ----- */}
        <Card
          className={cn(
            "w-full md:w-72 shrink-0 flex flex-col min-h-0 overflow-hidden",
            // On mobile hide when a conversation is shown
            mobileShowList || !activeId ? "flex" : "hidden md:flex",
          )}
        >
          <div className="p-2.5 space-y-2 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama atau nomor…"
                className="pl-8 h-8"
              />
            </div>

            {/* Chat filter chips */}
            <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
              {([
                { key: "all", label: "Semua" },
                { key: "bot", label: "Bot Aktif" },
                { key: "human", label: "Admin" },
                { key: "unread", label: "Belum Dibaca" },
              ] as const).map((f) => (
                <button
                  key={f.key}
                  onClick={() => setChatFilter(f.key)}
                  className={cn(
                    "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium border transition-colors",
                    chatFilter === f.key
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <ScrollArea className="flex-1 min-h-0">
            <div className="px-2 py-1 space-y-0.5">
              {filteredContacts.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center p-6 space-y-2.5">
                  <div className="h-10 w-10 rounded-xl bg-muted/80 grid place-items-center text-muted-foreground">
                    <MessageCircle className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-foreground">Belum Ada Kontak</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed max-w-[190px]">
                      Pesan masuk dari WhatsApp akan muncul otomatis di sini.
                    </p>
                  </div>
                </div>
              ) : (
                filteredContacts.map((c) => (
                  <ContactListItem
                    key={c.id}
                    contact={c}
                    active={c.id === activeId}
                    onClick={() => selectContact(c.id)}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </Card>

        {/* ----- Middle: conversation ----- */}
        <Card
          className={cn(
            "flex-1 flex flex-col min-w-0",
            // On mobile, hide list-side and show conversation only when a contact is active
            !mobileShowList && activeId ? "flex" : "hidden md:flex",
          )}
        >
          {!sessionId ? (
            <div className="flex-1 grid place-items-center p-6 bg-muted/20">
              <div className="text-center max-w-sm">
                <div className="h-16 w-16 rounded-2xl bg-slate-100 dark:bg-slate-900 grid place-items-center mx-auto mb-4">
                  <MessageCircle className="h-8 w-8 text-slate-500" />
                </div>
                <h3 className="font-semibold text-lg">Pilih Sesi WhatsApp</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Silakan pilih sesi (nomor WhatsApp) di menu atas untuk mulai memantau obrolan dari nomor terkait.
                </p>
              </div>
            </div>
          ) : activeContact ? (
            <>
              {/* Conversation header - Spacious & Clean */}
              <div className="flex items-center justify-between px-3 h-13 border-b shrink-0 bg-background/95">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden h-11 w-11 shrink-0 -ml-1 text-muted-foreground hover:text-foreground"
                    onClick={() => setMobileShowList(true)}
                    aria-label="Kembali ke daftar percakapan"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setProfileModalOpen(true)}
                    className="flex items-center gap-2.5 min-w-0 cursor-pointer hover:opacity-85 transition-opacity"
                    title="Klik untuk melihat detail profil WhatsApp"
                  >
                    <div className="relative shrink-0">
                      <Avatar className="h-9 w-9 ring-1 ring-border">
                        {activeContact.avatar && (
                          <AvatarImage src={activeContact.avatar} alt={activeContact.name} className="object-cover" />
                        )}
                        <AvatarFallback className="text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
                          {initials(activeContact.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className={cn(
                        "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-background",
                        activeContact.mode === "human" ? "bg-blue-500" : "bg-emerald-500"
                      )} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-semibold text-xs text-foreground truncate leading-tight">
                          {activeContact.name}
                        </p>
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-[9px] px-1.5 py-0 h-4 font-normal hidden sm:inline-flex",
                            STAGE_META[activeContact.stage].badge,
                          )}
                        >
                          {STAGE_META[activeContact.stage].label}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-tight truncate">
                        +{activeContact.phone}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right Header Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Takeover Toggle Pill */}
                  <Button
                    variant={activeContact.mode === "human" ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "h-8 px-2.5 text-xs gap-1.5 font-medium shadow-2xs rounded-lg transition-all",
                      activeContact.mode === "human"
                        ? "bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
                        : "border-emerald-600/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                    )}
                    onClick={toggleTakeover}
                    disabled={takingOver}
                    title={activeContact.mode === "human" ? "Klik untuk mengembalikan ke Bot AI" : "Klik untuk mengambil alih chat manual"}
                  >
                    {activeContact.mode === "human" ? (
                      <>
                        <UserCheck className="h-3.5 w-3.5" />
                        <span>Mode Manual</span>
                      </>
                    ) : (
                      <>
                        <Bot className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Bot AI</span>
                      </>
                    )}
                  </Button>

                  {/* Info button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg"
                    onClick={() => setInfoOpenMobile(true)}
                    aria-label="Info kontak"
                  >
                    <Info className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 min-h-0 bg-muted/30 relative">
                <ScrollArea className="h-full" ref={scrollAreaRef} onScrollCapture={handleScroll}>
                  <div
                    className="p-4 min-h-full"
                    style={{
                      backgroundImage:
                        "radial-gradient(circle at 1px 1px, hsl(var(--muted-foreground) / 0.08) 1px, transparent 0)",
                      backgroundSize: "20px 20px",
                    }}
                  >
                    {loadingMore && (
                      <div className="text-center text-xs text-muted-foreground py-2">
                        Memuat pesan lama...
                      </div>
                    )}
                    {activeMessages.length === 0 ? (
                      <div className="h-full grid place-items-center text-center text-sm text-muted-foreground py-20">
                        <div>
                          <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          Belum ada pesan. Mulai percakapan di bawah.
                        </div>
                      </div>
                    ) : (
                      activeMessages.map((m) => (
                        <MessageBubble
                          key={m.id}
                          msg={m}
                          contactName={activeContact.name}
                        />
                      ))
                    )}
                    <div ref={bottomRef} />
                  </div>
                </ScrollArea>
              </div>

              {/* Chat Input Area - Mobile-friendly */}
              <div className="px-3 py-1.5 border-t bg-background shrink-0 flex items-center">
                {imagePreview && (
                  <div className="absolute bottom-12 left-3 right-3 flex items-center gap-2 p-1 rounded-lg bg-background border shadow-md text-xs">
                    <ImageIcon className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate flex-1 font-medium">{imagePreview.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4"
                      onClick={() => setImagePreview(null)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                <div className="flex items-center gap-1.5 w-full">
                  <input
                    type="file"
                    ref={imageInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageSelect}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-11 w-11 shrink-0 text-muted-foreground hover:text-foreground"
                    onClick={() => imageInputRef.current?.click()}
                    title="Kirim gambar"
                  >
                    <ImageIcon className="h-4.5 w-4.5" />
                  </Button>
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onPaste={handlePaste}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage(input);
                      }
                    }}
                    placeholder="Ketik pesan / tempel screenshot (Ctrl+V)..."
                    className="h-11 text-xs"
                  />
                  <Button
                    type="button"
                    size="icon"
                    className={cn(
                      "h-11 w-11 shrink-0 text-white rounded-lg",
                      activeContact.mode === "human"
                        ? "bg-blue-600 hover:bg-blue-700"
                        : "bg-emerald-600 hover:bg-emerald-700",
                    )}
                    onClick={() => sendMessage(input)}
                    disabled={!input.trim() && !imagePreview}
                    title="Kirim pesan"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            // Empty state
            <div className="flex-1 grid place-items-center p-6 bg-muted/20">
              <div className="text-center max-w-sm">
                <div className="h-16 w-16 rounded-2xl bg-emerald-100 dark:bg-emerald-950/40 grid place-items-center mx-auto mb-4">
                  <MessageCircle className="h-8 w-8 text-emerald-600" />
                </div>
                <h3 className="font-semibold text-lg">Pilih percakapan untuk mulai</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Pilih kontak dari daftar di kiri untuk melihat dan membalas
                  pesan WhatsApp. Aktifkan mode AI agar chatbot merespons otomatis.
                </p>
                <div className="flex items-center justify-center gap-2 mt-4 text-xs text-muted-foreground">
                  <UserCheck className="h-4 w-4 text-emerald-600" />
                  {contacts.length} kontak terhubung
                </div>
              </div>
            </div>
          )}
        </Card>

      </div>

      

      {/* ----- Mobile info sheet ----- */}
      <Sheet open={infoOpenMobile} onOpenChange={setInfoOpenMobile}>
        <SheetContent side="right" className="w-full sm:max-w-sm p-0">
          <SheetHeader className="px-4 pt-4 pb-2">
            <SheetTitle className="text-sm">Detail Kontak</SheetTitle>
          </SheetHeader>
          {activeContact && infoPanel}
        </SheetContent>
      </Sheet>

      {/* ----- Real WAHA Tester Modal ----- */}
      <Dialog open={isWahaTestModalOpen} onOpenChange={setIsWahaTestModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-emerald-600" />
              Test API WAHA Real (Kirim Text &amp; Gambar)
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-xs">
            <p className="text-muted-foreground text-[11px]">
              Tembak langsung ke server WAHA (103.30.195.145:3060) untuk memverifikasi apakah sesi aktif dan pesan/gambar berhasil dikirim.
            </p>
            <div>
              <Label className="font-medium">Nama Sesi WAHA</Label>
              <Input
                value={wahaTestForm.sessionName}
                onChange={(e) => setWahaTestForm({ ...wahaTestForm, sessionName: e.target.value })}
                placeholder="Zafi-CS"
                className="h-8 mt-1 font-mono"
              />
            </div>
            <div>
              <Label className="font-medium">Nomor WhatsApp Tujuan</Label>
              <Input
                value={wahaTestForm.chatId}
                onChange={(e) => setWahaTestForm({ ...wahaTestForm, chatId: e.target.value })}
                placeholder="6281234567890"
                className="h-8 mt-1 font-mono"
              />
            </div>
            <div>
              <Label className="font-medium">Teks Pesan</Label>
              <Input
                value={wahaTestForm.text}
                onChange={(e) => setWahaTestForm({ ...wahaTestForm, text: e.target.value })}
                className="h-8 mt-1"
              />
            </div>
            <div>
              <Label className="font-medium">URL Gambar (Opsional)</Label>
              <Input
                value={wahaTestForm.imageUrl}
                onChange={(e) => setWahaTestForm({ ...wahaTestForm, imageUrl: e.target.value })}
                placeholder="https://..."
                className="h-8 mt-1"
              />
            </div>

            {/* Hasil Eksekusi Test */}
            {wahaTestResult && (
              <div className={cn(
                "p-3 rounded-lg border text-xs font-mono space-y-1 mt-2",
                wahaTestResult.sendSuccess
                  ? "bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-200"
                  : "bg-rose-50 border-rose-200 text-rose-900 dark:bg-rose-950/30 dark:border-rose-800 dark:text-rose-200"
              )}>
                <div className="flex items-center gap-1.5 font-bold">
                  <span>{wahaTestResult.sendSuccess ? "✓ Berhasil Dikirim ke WAHA" : "✗ Gagal Dikirim ke WAHA"}</span>
                </div>
                <div className="text-[10px] space-y-0.5">
                  <p>Status Sesi: {wahaTestResult.wahaSessionStatus}</p>
                  <p>Target: {wahaTestResult.targetChatId}</p>
                  {wahaTestResult.error && (
                    <p className="text-rose-600 dark:text-rose-400 font-sans">
                      Error: {typeof wahaTestResult.error === 'object' ? JSON.stringify(wahaTestResult.error) : wahaTestResult.error}
                    </p>
                  )}
                  {wahaTestResult.response && (
                    <p className="opacity-80 truncate">
                      Respon: {JSON.stringify(wahaTestResult.response)}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsWahaTestModalOpen(false)}>
              Tutup
            </Button>
            <Button
              size="sm"
              onClick={triggerRealWahaTest}
              disabled={wahaTestLoading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
            >
              {wahaTestLoading ? "Mengirim..." : "Tembak WAHA API"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ----- Contact Profile & Bio Modal ----- */}
      <Dialog open={profileModalOpen} onOpenChange={setProfileModalOpen}>
        <DialogContent className="max-w-sm sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center font-bold text-base">
              Detail Profil WhatsApp
            </DialogTitle>
          </DialogHeader>

          {activeContact && (
            <div className="flex flex-col items-center text-center space-y-4 py-2">
              <div className="relative">
                <Avatar className="h-24 w-24 border-2 border-emerald-500 shadow-md">
                  {activeContact.avatar && (
                    <AvatarImage
                      src={activeContact.avatar}
                      alt={activeContact.name}
                      className="object-cover"
                    />
                  )}
                  <AvatarFallback className="text-2xl font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                    {initials(activeContact.name)}
                  </AvatarFallback>
                </Avatar>
              </div>

              <div className="space-y-1 w-full">
                <h3 className="font-semibold text-base text-foreground">
                  {activeContact.name}
                </h3>
                <p className="text-xs text-muted-foreground font-mono">
                  +{activeContact.phone}
                </p>
                <div className="flex justify-center gap-1.5 pt-1">
                  <Badge
                    variant="secondary"
                    className={cn("text-[10px]", STAGE_META[activeContact.stage].badge)}
                  >
                    {STAGE_META[activeContact.stage].label}
                  </Badge>
                  {activeContact.mode === "human" ? (
                    <Badge variant="outline" className="text-[10px] text-blue-600 border-blue-300">
                      Ditangani Admin
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-300">
                      Bot Aktif
                    </Badge>
                  )}
                </div>
              </div>

              {/* Bio / About Box */}
              <div className="w-full bg-muted/40 rounded-xl p-3 border text-left space-y-1">
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Info / Bio WhatsApp
                </Label>
                {loadingProfile ? (
                  <p className="text-xs text-muted-foreground italic">Mengambil info dari WhatsApp...</p>
                ) : activeContact.about ? (
                  <p className="text-xs text-foreground font-medium whitespace-pre-wrap">
                    &ldquo;{activeContact.about}&rdquo;
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground italic">
                    (Tidak ada status bio / disembunyikan privasi kontak)
                  </p>
                )}
              </div>

              <div className="flex gap-2 w-full pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => {
                    navigator.clipboard.writeText(`+${activeContact.phone}`);
                  }}
                >
                  Salin Nomor
                </Button>
                <Button
                  size="sm"
                  className="flex-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => {
                    window.open(`https://wa.me/${activeContact.phone}`, "_blank");
                  }}
                >
                  Buka di WhatsApp
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
