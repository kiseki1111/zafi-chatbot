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
import { Switch } from "@/components/ui/switch";
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
  FileText,
  Crown,
  ShoppingCart,
  ChevronLeft,
  Plus,
  UserCheck,
  Sparkles,
} from "lucide-react";
import {
  CONTACTS,
  CHAT_MESSAGES,
  WA_SESSIONS,
  MESSAGE_TEMPLATES,
} from "@/lib/mock-data";
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
        <p className="whitespace-pre-wrap break-words">{msg.text}</p>
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
        {contact.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {contact.tags.slice(0, 3).map((t) => (
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
        )}
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

          {/* Quick actions */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Aksi Cepat</Label>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
            >
              <ShoppingCart className="h-4 w-4 text-emerald-600" /> Buat Order
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
            >
              <FileText className="h-4 w-4 text-teal-600" /> Kirim Detail Properti
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
            >
              <Crown className="h-4 w-4 text-amber-500" /> Tandai VIP
            </Button>
          </div>

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
         if (!Array.isArray(sessionsData)) {
           console.warn("Instances API did not return an array:", data);
           return;
         }
         const mapped = sessionsData
           .filter((d: any) => d.status?.toLowerCase() === 'working')
           .map((d: any) => ({ id: d.name, name: d.name, status: d.status?.toLowerCase() || 'stopped' }));
         setSessions(mapped);
      }).catch(console.error);
  }, []);

  const activeSession = useMemo(
    () => sessions.find((s) => s.id === sessionId) ?? null,
    [sessionId, sessions]
  );
  const isConnected = activeSession?.status === "working";

  // AI toggles
  const [aiActive, setAiActive] = useState(true);
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
          assignedTo: c.assignedTo?.name,
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

  // Send a message
  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || !activeId || !sessionId || !activeContact) return;
    
    // Optimistic UI
    const tempId = "temp-" + Date.now();
    const newMsg: ChatMessage = {
      id: tempId,
      contactId: activeId,
      direction: "out",
      text: trimmed,
      status: "sent",
      timestamp: new Date().toLocaleTimeString(),
      isAI: false,
    };
    setMessages((prev) => [...prev, newMsg]);
    setInput("");
    
    try {
      await fetch(`/api/v1/waha/instances/${sessionId}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: activeContact.phone, text: trimmed })
      });
      // Polling will update the status to SENT/DELIVERED
    } catch (e) {
       console.error("Failed to send message", e);
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
    <div className="flex flex-col h-[calc(100dvh-6.5rem)] lg:h-[calc(100dvh-5rem)] gap-3">
      {/* Page header — slim, consistent with other pages */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-green-700 px-6 py-4 text-white shadow-xl shrink-0">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%23ffffff%22 fill-opacity=%220.05%22%3E%3Cpath d=%22M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/20 p-2.5 backdrop-blur-sm">
              <MessageCircle className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Bot WhatsApp</h1>
              <p className="text-xs text-emerald-100">Kelola percakapan &amp; pantau status koneksi agent.</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-3 text-xs text-emerald-100">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
              {contacts.length} kontak
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-white/60" />
              {messagesToday} pesan
            </span>
          </div>
        </div>
      </div>

      {/* ===== Top bar ===== */}
      <Card className="px-3 py-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          {/* WA Session selector */}
          <Select value={sessionId} onValueChange={setSessionId}>
            <SelectTrigger className="w-[180px] h-8 text-xs bg-muted/50 border-0 gap-2">
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
                    <span className="flex flex-col items-start">
                      <span className="text-sm font-medium">{s.name}</span>
                      {s.status === "connected" && s.battery != null && (
                        <span className="text-[10px] text-muted-foreground">
                          Baterai: {s.battery}%
                        </span>
                      )}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Online badge */}
          {isConnected && (
            <Badge className="bg-emerald-600 text-white gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
              Online
            </Badge>
          )}

          {/* Battery indicator for connected session */}
          {isConnected && activeSession?.battery != null && (
            <span className="hidden sm:inline-flex items-center gap-1 text-xs text-muted-foreground">
              {activeSession.battery < 20 ? (
                <BatteryLow className="h-4 w-4 text-rose-500" />
              ) : (
                <BatteryMedium className="h-4 w-4 text-emerald-600" />
              )}
              {activeSession.battery}%
            </span>
          )}

          <div className="ml-auto flex items-center gap-3 flex-wrap">
            {/* Inline stats */}
            <div className="hidden md:flex items-center gap-3 text-xs">
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <UserCheck className="h-3.5 w-3.5 text-blue-600" />
                <span className="font-semibold text-foreground">
                  {contacts.length}
                </span>{" "}
                kontak
              </span>
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
                <span className="font-semibold text-foreground">
                  {messagesToday}
                </span>{" "}
                pesan hari ini
              </span>
            </div>

            {/* AI toggle removed */}
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
    </div>
  );
}
