"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
} from "lucide-react";
import type {
  Contact,
  ChatMessage,
  MessageStatus,
} from "@/lib/types";
import { useAuthStore } from "@/lib/auth-store";
import { useAppStore } from "@/lib/app-store";

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
  "Baik, saya bantu cek ketersediaannya ya, Bapak/Ibu 🙏",
  "Untuk properti tersebut, DP mulai 20%. Mau saya kirimkan simulasi?",
  "Terima kasih infonya. Boleh saya jadwalkan survey akhir pekan ini?",
  "Saya catat permintaan Anda dan akan koordinasi dengan agent terkait 👍",
  "Harga masih dapat dibicarakan. Mau saya bantu negosiasi terbaik?",
  "Baik, saya kirimkan brosur & foto lengkapnya sekarang ya 🏡",
];

const AI_SUGGESTIONS: string[] = [
  "Halo! Terima kasih sudah menghubungi. Ada yang bisa saya bantu terkait properti impian Anda? 🏡",
  "Baik, saya bantu cek ketersediaannya ya, Bapak/Ibu 🙏",
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
  const isImage = msg.messageType === "image" && msg.mediaUrl;
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
        {msg.text && <p className="whitespace-pre-wrap break-words">{msg.text}</p>}
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
        "w-full grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-lg p-2.5 text-left transition-colors cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-emerald-500",
        active
          ? "bg-emerald-50 dark:bg-emerald-950/30 ring-1 ring-emerald-200 dark:ring-emerald-800"
          : "hover:bg-muted/60",
      )}
    >
      <div className="relative shrink-0">
        <Avatar className="h-10 w-10">
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
            <span className="text-[10px] text-muted-foreground">
              {contact.lastMessageAt}
            </span>
          </div>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {contact.lastMessage}
          </p>
          <div className="flex flex-wrap gap-1 mt-1">
            {contact.mode === "human" ? (
              <span className="inline-flex items-center rounded px-1 py-0 text-[9px] font-medium bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 gap-0.5">
                <UserCog className="h-2.5 w-2.5" />
                {contact.assignedToName ? contact.assignedToName : "Admin"}
              </span>
            ) : (
              <span className="inline-flex items-center rounded px-1 py-0 text-[9px] font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 gap-0.5">
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
    fetch('/api/v1/waha/instances')
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
  }, []);

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

  // Mock incoming simulator modal state
  const [isSimModalOpen, setIsSimModalOpen] = useState(false);
  const [simForm, setSimForm] = useState({
    phone: "628987654321",
    name: "Calon Pembeli Properti",
    text: "Halo admin, apakah unit ini masih tersedia?",
    imageUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&auto=format&fit=crop",
  });

  // Fetch Conversations
  const fetchConversations = async () => {
    if (!sessionId) return;
    try {
      const res = await fetch(`/api/v1/chats?instanceName=${sessionId}`);
      const data = await res.json();
      let chatsData = data;
      if (data && data.data && Array.isArray(data.data)) {
        chatsData = data.data;
      }
      if (!Array.isArray(chatsData)) {
        console.warn("Chats API did not return an array:", data);
        return;
      }
      const mappedContacts: Contact[] = chatsData.map((c: any) => {
        const rawName = c.contactName || c.contactNumber || "";
        const cleanName = rawName.split('@')[0];
        const cleanPhone = (c.contactNumber || "").split('@')[0];
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
      setContacts(mappedContacts);
      if (!activeId && mappedContacts.length > 0) {
         setActiveId(mappedContacts.find((c) => c.unread > 0)?.id ?? mappedContacts[0].id);
      }
    } catch (e) {
      console.error(e);
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
      if (!Array.isArray(msgsData)) {
        console.warn("Messages API did not return an array:", data);
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
        mediaUrl: (m.metadata as any)?.mediaUrl || (m.metadata as any)?.url,
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
    } finally {
      if (reset) setLoadingMore(false);
    }
  };

  // Initial loads and activeId change
  useEffect(() => {
    fetchConversations();
  }, [sessionId]);

  useEffect(() => {
    if (activeId) fetchMessages(true);
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
              mediaUrl: (m.metadata as any)?.mediaUrl || (m.metadata as any)?.url,
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

    // Poll every 5 seconds
    const interval = setInterval(fetchLatest, 5000);
    
    // Fetch immediately when user focuses back on the tab
    const onFocus = () => fetchLatest();
    window.addEventListener("focus", onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
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
      return true;
    });
  }, [contacts, search, filter, me]);

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
      console.error("Failed to send message", e);
    }
  }

  // Trigger Mock Customer Incoming Message (for offline/testing)
  async function triggerSimCustomer() {
    try {
      await fetch('/api/v1/chats/mock-customer-incoming', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: simForm.phone,
          name: simForm.name,
          text: simForm.text,
          imageUrl: simForm.imageUrl || undefined,
          instanceName: sessionId || 'dev-session',
        }),
      });
      setIsSimModalOpen(false);
      await fetchConversations();
      if (activeId) fetchMessages(true);
    } catch (e) {
      console.error("Gagal kirim simulasi pelanggan", e);
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
    <div className="flex flex-col flex-1 h-full min-h-0 gap-2">
      {/* ===== Top Bar Ringkas & Terpadu ===== */}
      <Card className="px-3 py-2 shrink-0 shadow-xs border-muted/70">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-emerald-600 text-white grid place-items-center shadow-xs">
              <MessageCircle className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm leading-none">Live Chat &amp; WA Bot</span>
                {isConnected && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded-full">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Online
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* WA Session selector */}
            <Select value={sessionId} onValueChange={setSessionId}>
              <SelectTrigger className="w-[170px] h-7 text-xs bg-muted/50 border-0 gap-2">
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

            {/* Test Real WAHA Trigger Button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsWahaTestModalOpen(true)}
              className="h-7 text-xs gap-1 border-dashed text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
            >
              <Zap className="h-3.5 w-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Test Kirim</span> WAHA
            </Button>

            {/* Mock Simulator Modal Trigger */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsSimModalOpen(true)}
              className="h-7 text-xs gap-1 border-dashed text-indigo-700 hover:text-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/20"
            >
              <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
              Simulasi
            </Button>

            <span className="text-[11px] text-muted-foreground hidden lg:inline pl-1 border-l">
              <strong className="text-foreground">{contacts.length}</strong> kontak · <strong className="text-foreground">{messagesToday}</strong> pesan
            </span>
          </div>
        </div>
      </Card>

      {/* ===== Main 3-column ===== */}
      <div className="flex-1 flex gap-3 min-h-0">
        {/* ----- Left: contact list ----- */}
        <Card
          className={cn(
            "w-full md:w-80 shrink-0 flex flex-col min-h-0 overflow-hidden",
            // On mobile hide when a conversation is shown
            mobileShowList || !activeId ? "flex" : "hidden md:flex",
          )}
        >
          <div className="p-3 space-y-3 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama atau nomor…"
                className="pl-8 h-9"
              />
            </div>
            <Tabs
              value={filter}
              onValueChange={(v) => setFilter(v as typeof filter)}
            >
              <TabsList className="w-full grid grid-cols-2 h-8">
                <TabsTrigger value="all" className="text-xs">
                  Semua
                </TabsTrigger>
                <TabsTrigger value="mine" className="text-xs">
                  Saya
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <ScrollArea className="flex-1 min-h-0">
            <div className="px-2 py-1 space-y-0.5">
              {filteredContacts.length === 0 ? (
                <div className="text-center text-xs text-muted-foreground py-10">
                  Tidak ada kontak cocok.
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
              {/* Conversation header */}
              <div className="flex items-center gap-3 p-3 border-b">
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden h-8 w-8 shrink-0"
                  onClick={() => setMobileShowList(true)}
                  aria-label="Kembali ke daftar"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarFallback className="text-xs bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
                    {initials(activeContact.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm truncate">
                      {activeContact.name}
                    </p>
                    <Badge
                      variant="secondary"
                      className={cn(
                        "text-[10px]",
                        STAGE_META[activeContact.stage].badge,
                      )}
                    >
                      {STAGE_META[activeContact.stage].label}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    +{activeContact.phone}
                    {activeContact.tags.length > 0 && (
                      <span className="ml-1">
                        · {activeContact.tags.join(", ")}
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant={activeContact.mode === "human" ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "h-8 text-xs gap-1.5",
                      activeContact.mode === "human"
                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                        : "border-emerald-600 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40",
                    )}
                    onClick={toggleTakeover}
                    disabled={takingOver}
                  >
                    <UserCog className="h-3.5 w-3.5" />
                    {takingOver
                      ? "Memproses..."
                      : activeContact.mode === "human"
                        ? "Lepas ke Bot"
                        : "Ambil Alih"}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Telepon">
                    <Phone className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 lg:hidden"
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

              {/* Chat Input Area */}
              <div className="p-3 border-t bg-background space-y-2">
                {imagePreview && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/60 text-xs">
                    <ImageIcon className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span className="truncate flex-1 font-medium">{imagePreview.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={() => setImagePreview(null)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                <div className="flex items-center gap-2">
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
                    className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
                    onClick={() => imageInputRef.current?.click()}
                    title="Kirim gambar"
                  >
                    <ImageIcon className="h-4 w-4" />
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
                    placeholder={
                      activeContact.mode === "human"
                        ? "Ketik pesan / tempel screenshot (Ctrl+V)..."
                        : "Ketik pesan / tempel screenshot (Ctrl+V)..."
                    }
                    className="h-9 text-sm"
                  />
                  <Button
                    type="button"
                    size="icon"
                    className={cn(
                      "h-9 w-9 shrink-0 text-white",
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

      {/* ----- Simulator Modal ----- */}
      <Dialog open={isSimModalOpen} onOpenChange={setIsSimModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-indigo-600" />
              Simulasi Pesan Customer (Testing)
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-xs">
            <div>
              <Label className="font-medium">Nomor WhatsApp Pengirim</Label>
              <Input
                value={simForm.phone}
                onChange={(e) => setSimForm({ ...simForm, phone: e.target.value })}
                className="h-8 mt-1 font-mono"
              />
            </div>
            <div>
              <Label className="font-medium">Nama Pengirim</Label>
              <Input
                value={simForm.name}
                onChange={(e) => setSimForm({ ...simForm, name: e.target.value })}
                className="h-8 mt-1"
              />
            </div>
            <div>
              <Label className="font-medium">Teks Pesan</Label>
              <Input
                value={simForm.text}
                onChange={(e) => setSimForm({ ...simForm, text: e.target.value })}
                className="h-8 mt-1"
              />
            </div>
            <div>
              <Label className="font-medium">URL Foto / Gambar (Opsional)</Label>
              <Input
                value={simForm.imageUrl}
                onChange={(e) => setSimForm({ ...simForm, imageUrl: e.target.value })}
                placeholder="https://..."
                className="h-8 mt-1"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Kirim foto untuk mengetes fitur terima gambar dari customer di chat bubble.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsSimModalOpen(false)}>
              Batal
            </Button>
            <Button size="sm" onClick={triggerSimCustomer} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              Kirim Sebagai Pelanggan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
    </div>
  );
}
