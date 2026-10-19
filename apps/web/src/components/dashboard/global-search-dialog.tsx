"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Search, Clock, X, Users, MessageCircle, BookOpen,
  Building2, Package, ArrowRight, Loader2, Sparkles,
  LayoutDashboard, Settings, Smartphone, Bot, FileText,
  Map, Activity, Trash2
} from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { useAppStore } from "@/lib/app-store";

// ─── Types ─────────────────────────────────────────────────────────────────
interface SearchResultItem {
  id: string;
  category: "contact" | "message" | "knowledge" | "unit" | "product";
  title: string;
  subtitle?: string;
  meta?: Record<string, any>;
  highlight?: string;
}

interface SearchCategoryResult {
  category: SearchResultItem["category"] | "__done__";
  items: SearchResultItem[];
  totalMs: number;
}

interface HistoryEntry {
  q: string;
  ts: number;
}

// ─── Quick Navigation ───────────────────────────────────────────────────────
const NAV_COMMANDS = [
  { label: "Ringkasan (Overview)", icon: LayoutDashboard, view: "overview", keywords: ["overview", "ringkasan", "dashboard", "beranda"] },
  { label: "Live Chat WhatsApp", icon: MessageCircle, view: "chatbot", keywords: ["chatbot", "chat", "whatsapp", "wa", "pesan", "live"] },
  { label: "CRM Kontak Prospek", icon: Users, view: "crm", keywords: ["crm", "kontak", "prospek", "pelanggan", "customer"] },
  { label: "Siteplan & Kavling", icon: Map, view: "availability", keywords: ["siteplan", "kavling", "unit", "denah", "availability"] },
  { label: "Knowledge Base", icon: BookOpen, view: "knowledge", keywords: ["knowledge", "dokumen", "brosur", "katalog", "file"] },
  { label: "Follow-Up", icon: Activity, view: "followup", keywords: ["followup", "follow", "up", "jadwal", "pengingat"] },
  { label: "Pengaturan Bot AI", icon: Settings, view: "settings", keywords: ["setting", "pengaturan", "bot", "ai", "asisten"] },
  { label: "Koneksi WhatsApp (QR)", icon: Smartphone, view: "settings", keywords: ["koneksi", "qr", "scan", "whatsapp", "sesi"] },
];

const CATEGORY_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  contact: { label: "Kontak", icon: Users, color: "text-blue-600 bg-blue-50 dark:bg-blue-950/40" },
  message: { label: "Pesan WA", icon: MessageCircle, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40" },
  knowledge: { label: "Dokumen", icon: BookOpen, color: "text-amber-600 bg-amber-50 dark:bg-amber-950/40" },
  unit: { label: "Kavling/Unit", icon: Building2, color: "text-purple-600 bg-purple-50 dark:bg-purple-950/40" },
  product: { label: "Produk", icon: Package, color: "text-rose-600 bg-rose-50 dark:bg-rose-950/40" },
};

// ─── Helpers ────────────────────────────────────────────────────────────────
function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Baru saja";
  if (m < 60) return `${m} menit lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} hari lalu`;
  return new Date(ts).toLocaleDateString("id-ID");
}

function highlightText(text: string, q: string): React.ReactNode {
  if (!q) return text;
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  return parts.map((p, i) =>
    new RegExp(`^${escaped}$`, "i").test(p)
      ? <mark key={i} className="bg-yellow-200 dark:bg-yellow-800/60 text-foreground rounded-[2px] px-[1px]">{p}</mark>
      : <span key={i}>{p}</span>
  );
}

const STATUS_BADGE: Record<string, string> = {
  AVAILABLE: "bg-emerald-100 text-emerald-700 border-emerald-300",
  BOOKED: "bg-amber-100 text-amber-700 border-amber-300",
  OCCUPIED: "bg-rose-100 text-rose-700 border-rose-300",
  MAINTENANCE: "bg-slate-100 text-slate-700 border-slate-300",
  "Follow-Up": "bg-blue-100 text-blue-700 border-blue-300",
  SLIK: "bg-orange-100 text-orange-700 border-orange-300",
  Survey: "bg-violet-100 text-violet-700 border-violet-300",
  Booking: "bg-amber-100 text-amber-700 border-amber-300",
  Closing: "bg-emerald-100 text-emerald-700 border-emerald-300",
};

// ─── Hook: Search History ───────────────────────────────────────────────────
function useSearchHistory(userId: string) {
  const KEY = `zafi_search_history_${userId}`;
  const MAX = 8;

  const load = (): HistoryEntry[] => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(window.localStorage.getItem(KEY) || "[]");
    } catch {
      return [];
    }
  };

  const [history, setHistory] = React.useState<HistoryEntry[]>([]);

  React.useEffect(() => {
    setHistory(load());
  }, [userId]);

  const push = (q: string) => {
    if (typeof window === "undefined" || !q.trim()) return;
    const deduped = load().filter((e) => e.q.toLowerCase() !== q.toLowerCase().trim());
    const next = [{ q: q.trim(), ts: Date.now() }, ...deduped].slice(0, MAX);
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {}
    setHistory(next);
  };

  const remove = (q: string) => {
    if (typeof window === "undefined") return;
    const next = load().filter((e) => e.q !== q);
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {}
    setHistory(next);
  };

  const clear = () => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(KEY);
    } catch {}
    setHistory([]);
  };

  const refresh = () => setHistory(load());

  return { history, push, remove, clear, refresh };
}

// ─── Component ──────────────────────────────────────────────────────────────
interface GlobalSearchDialogProps {
  open: boolean;
  onClose: () => void;
}

export function GlobalSearchDialog({ open, onClose }: GlobalSearchDialogProps) {
  const { user } = useAuthStore();
  const { setView, setActiveContactId, setActiveSessionId } = useAppStore();
  const { history, push: pushHistory, remove: removeHistory, clear: clearHistory, refresh: refreshHistory } =
    useSearchHistory(user?.id || "anon");

  const [q, setQ] = React.useState("");
  const [activeFilter, setActiveFilter] = React.useState<string>("all");
  const [categories, setCategories] = React.useState<SearchCategoryResult[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const [showProgress, setShowProgress] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [selectedIdx, setSelectedIdx] = React.useState(-1);

  // Delayed progress indicator (180ms threshold):
  // Jika pencarian cepat (<180ms), indikator loading TIDAK AKAN PERNAH muncul sama sekali.
  // Ini 100% melenyapkan efek kedipan (flicker/blink) saat mengetik.
  React.useEffect(() => {
    let t: NodeJS.Timeout;
    if (isSearching) {
      t = setTimeout(() => setShowProgress(true), 180);
    } else {
      setShowProgress(false);
    }
    return () => clearTimeout(t);
  }, [isSearching]);

  const inputRef = React.useRef<HTMLInputElement>(null);
  const abortRef = React.useRef<AbortController | null>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  // Reset & refresh when opened/closed
  React.useEffect(() => {
    if (!open) {
      setQ(""); setCategories([]); setIsSearching(false); setShowProgress(false); setDone(false); setSelectedIdx(-1);
    } else {
      refreshHistory();
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // ─── Nav Matches (instant, local) ────────────────────────────────────────
  const navMatches = React.useMemo(() => {
    if (!q.trim()) return [];
    const lq = q.toLowerCase();
    return NAV_COMMANDS.filter((cmd) =>
      cmd.keywords.some((k) => k.includes(lq)) || cmd.label.toLowerCase().includes(lq)
    );
  }, [q]);

  // ─── Stream Search ────────────────────────────────────────────────────────
  const doSearch = React.useCallback(
    async (query: string) => {
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();
      setDone(false);
      setIsSearching(true);

      try {
        const qs = new URLSearchParams({ q: query });
        if (activeFilter !== "all") qs.set("category", activeFilter);

        const useStream = activeFilter === "all";
        if (useStream) {
          // Progressive streaming mode
          const res = await fetch(`/api/v1/search/stream?${qs}`, {
            signal: abortRef.current.signal,
          });
          if (!res.body) return;
          const reader = res.body.getReader();
          const dec = new TextDecoder();
          let buf = "";
          let hasReceivedFirst = false;

          while (true) {
            const { value, done: readerDone } = await reader.read();
            if (readerDone) break;
            buf += dec.decode(value, { stream: true });
            const parts = buf.split("\n\n");
            buf = parts.pop() || "";
            for (const part of parts) {
              const line = part.replace(/^data: /, "").trim();
              if (!line) continue;
              try {
                const parsed: SearchCategoryResult = JSON.parse(line);
                if (parsed.category === "__done__") {
                  if (!hasReceivedFirst) {
                    setCategories([]);
                  }
                  setDone(true);
                } else {
                  if (!hasReceivedFirst) {
                    hasReceivedFirst = true;
                    setCategories([parsed]);
                  } else {
                    setCategories((prev) => {
                      const exists = prev.findIndex((c) => c.category === parsed.category);
                      if (exists >= 0) {
                        const next = [...prev];
                        next[exists] = parsed;
                        return next;
                      }
                      return [...prev, parsed];
                    });
                  }
                }
              } catch {}
            }
          }
        } else {
          // Single category REST mode
          const res = await fetch(`/api/v1/search?${qs}`, {
            signal: abortRef.current.signal,
          });
          const json = await res.json();
          setCategories(json.results || []);
          setDone(true);
        }
      } catch (e: any) {
        if (e.name !== "AbortError") setDone(true);
      } finally {
        setIsSearching(false);
      }
    },
    [activeFilter]
  );

  // Debounce
  React.useEffect(() => {
    if (!q.trim()) { setCategories([]); setIsSearching(false); setDone(false); return; }
    const t = setTimeout(() => doSearch(q), 220);
    return () => clearTimeout(t);
  }, [q, doSearch]);

  // ─── Flat list for keyboard nav ──────────────────────────────────────────
  const flatItems = React.useMemo(() => {
    const nav = navMatches.map((cmd) => ({ type: "nav" as const, cmd }));
    const results = categories
      .filter((c) => c.items.length > 0)
      .flatMap((c) => c.items.map((item) => ({ type: "result" as const, item })));
    return [...nav, ...results];
  }, [navMatches, categories]);

  // Keyboard navigation
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIdx((p) => Math.min(p + 1, flatItems.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIdx((p) => Math.max(p - 1, -1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (selectedIdx >= 0 && flatItems[selectedIdx]) {
          const sel = flatItems[selectedIdx];
          if (sel.type === "nav") handleNavSelect(sel.cmd);
          else handleResultSelect(sel.item);
        } else if (q.trim()) {
          pushHistory(q);
          if (flatItems.length > 0) {
            const first = flatItems[0];
            if (first.type === "nav") handleNavSelect(first.cmd);
            else handleResultSelect(first.item);
          }
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, flatItems, selectedIdx]);

  // ─── Actions ─────────────────────────────────────────────────────────────
  const handleNavSelect = (cmd: (typeof NAV_COMMANDS)[0]) => {
    setView(cmd.view as any);
    pushHistory(q || cmd.label);
    onClose();
  };

  const handleResultSelect = (item: SearchResultItem) => {
    pushHistory(q);
    switch (item.category) {
      case "contact":
        setView("crm");
        break;
      case "message":
        if (item.meta?.contactId) setActiveContactId(item.meta.contactId);
        if (item.meta?.instanceName) setActiveSessionId(item.meta.instanceName);
        setView("chatbot");
        break;
      case "unit":
        setView("availability");
        break;
      case "knowledge":
        setView("knowledge");
        break;
      case "product":
        setView("overview");
        break;
    }
    onClose();
  };

  const handleHistoryClick = (entry: HistoryEntry) => {
    setQ(entry.q);
    inputRef.current?.focus();
  };

  // ─── Flat idx tracking ────────────────────────────────────────────────────
  let globalIdx = 0;
  const nextIdx = () => globalIdx++;

  const showEmpty = !q.trim();
  const hasResults = categories.some((c) => c.items.length > 0) || navMatches.length > 0;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="p-0 gap-0 overflow-hidden max-w-2xl w-full rounded-2xl border border-border/60 shadow-2xl"
        style={{ maxHeight: "min(85vh, 640px)" }}
      >
        <DialogTitle className="sr-only">Pencarian Global</DialogTitle>

        {/* Search Input Header */}
        <div className="border-b border-border/60 relative">
          <div className="flex items-center gap-3 px-4 py-3">
            <Search className="h-4.5 w-4.5 text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => { setQ(e.target.value); setSelectedIdx(-1); }}
              placeholder="Cari kontak, pesan, kavling, dokumen, navigasi..."
              className="flex-1 bg-transparent text-[15px] placeholder:text-muted-foreground outline-none min-w-0"
              autoComplete="off"
              spellCheck={false}
            />
            {showProgress && (
              <Loader2 className="h-3.5 w-3.5 text-emerald-600 animate-spin shrink-0 transition-opacity" />
            )}
            {q && (
              <button
                type="button"
                onClick={() => setQ("")}
                className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded-md hover:bg-muted"
                title="Hapus ketikan"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 text-[10px] font-mono text-muted-foreground">
              Esc
            </kbd>
          </div>

          {/* Indeterminate Animated Progress Glow Line (only shows if search takes > 180ms) */}
          <div className="h-[2px] w-full overflow-hidden bg-transparent">
            <div
              className={cn(
                "h-full bg-gradient-to-r from-transparent via-emerald-500 to-transparent transition-opacity duration-300",
                showProgress ? "opacity-100 animate-pulse" : "opacity-0"
              )}
            />
          </div>
        </div>

        {/* Filter Tabs */}
        {q.trim() && (
          <div className="flex items-center gap-1.5 px-4 py-2 border-b border-border/40 overflow-x-auto scrollbar-hide">
            {["all", "contacts", "messages", "knowledge", "units", "products"].map((f) => (
              <button
                key={f}
                onClick={() => { setActiveFilter(f); setCategories([]); setDone(false); }}
                className={cn(
                  "flex-shrink-0 px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-all border",
                  activeFilter === f
                    ? "bg-foreground text-background border-foreground"
                    : "bg-muted/50 text-muted-foreground border-transparent hover:border-border"
                )}
              >
                {f === "all" ? "Semua" : f === "contacts" ? "Kontak" : f === "messages" ? "Pesan WA" : f === "knowledge" ? "Dokumen" : f === "units" ? "Kavling" : "Produk"}
              </button>
            ))}
          </div>
        )}

        {/* Body */}
        <div ref={listRef} className="overflow-y-auto min-h-[280px] sm:min-h-[320px] flex flex-col justify-start" style={{ maxHeight: "480px" }}>

          {/* ── Empty state: History + Suggestions ── */}
          {showEmpty && (
            <div className="p-4 space-y-4">
              {history.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Pencarian Terakhir</p>
                    <button
                      onClick={clearHistory}
                      className="text-[11px] text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors"
                    >
                      <Trash2 className="h-3 w-3" /> Hapus Semua
                    </button>
                  </div>
                  <div className="space-y-0.5">
                    {history.map((entry) => (
                      <div
                        key={entry.q + entry.ts}
                        onClick={() => handleHistoryClick(entry)}
                        className="group flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/60 cursor-pointer transition-colors"
                      >
                        <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="flex-1 text-sm truncate">{entry.q}</span>
                        <span className="text-[10px] text-muted-foreground shrink-0">{relativeTime(entry.ts)}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); removeHistory(entry.q); }}
                          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Navigasi Cepat</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {NAV_COMMANDS.slice(0, 6).map((cmd) => {
                    const Icon = cmd.icon;
                    return (
                      <button
                        key={cmd.view + cmd.label}
                        onClick={() => handleNavSelect(cmd)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-muted/60 text-left transition-colors"
                      >
                        <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-sm truncate">{cmd.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── Query: Nav Results ── */}
          {!showEmpty && navMatches.length > 0 && (
            <div className="px-4 pt-3 pb-1 animate-in fade-in-50 slide-in-from-bottom-1 duration-200">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Navigasi</p>
              {navMatches.map((cmd) => {
                const Icon = cmd.icon;
                const idx = nextIdx();
                return (
                  <div
                    key={cmd.view + cmd.label}
                    onClick={() => handleNavSelect(cmd)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all duration-150 ease-out",
                      selectedIdx === idx ? "bg-muted shadow-2xs" : "hover:bg-muted/60"
                    )}
                  >
                    <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="flex-1 text-sm">{highlightText(cmd.label, q)}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Query: DB Results per Category ── */}
          {!showEmpty && categories.map((cat) => {
            if (!cat.items.length || cat.category === "__done__") return null;
            const catMeta = CATEGORY_META[cat.category];
            if (!catMeta) return null;
            const Icon = catMeta.icon;
            return (
              <div key={cat.category} className="px-4 pt-3 pb-1 animate-in fade-in-50 slide-in-from-bottom-1 duration-200">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Icon className={cn("h-3.5 w-3.5", catMeta.color.split(" ")[0])} />
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    {catMeta.label}
                  </p>
                  <span className="text-[10px] text-muted-foreground ml-auto font-mono">{cat.totalMs}ms</span>
                </div>
                {cat.items.map((item) => {
                  const idx = nextIdx();
                  const status = item.meta?.status;
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleResultSelect(item)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-150 ease-out group",
                        selectedIdx === idx ? "bg-muted shadow-2xs" : "hover:bg-muted/60"
                      )}
                    >
                      <div className={cn("h-8 w-8 rounded-lg grid place-items-center shrink-0 text-[11px] font-bold", catMeta.color)}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate leading-tight">
                          {highlightText(item.title, q)}
                        </p>
                        {item.subtitle && (
                          <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                            {item.subtitle}
                          </p>
                        )}
                      </div>
                      {status && (
                        <span className={cn(
                          "shrink-0 text-[10px] px-1.5 py-0.5 rounded-full border font-medium",
                          STATUS_BADGE[status] || "bg-muted text-muted-foreground"
                        )}>
                          {status}
                        </span>
                      )}
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* ── No Results (Only shown after search completes and confirmed zero results) ── */}
          {!showEmpty && !isSearching && done && !hasResults && (
            <div className="py-16 text-center animate-in fade-in-50 duration-200 flex-1 flex flex-col justify-center items-center">
              <Sparkles className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Tidak ada hasil untuk <strong>"{q}"</strong></p>
              <p className="text-[11px] text-muted-foreground/60 mt-1">Coba kata kunci yang lebih umum</p>
            </div>
          )}

          <div className="h-2" />
        </div>

        {/* Footer */}
        {q.trim() && (
          <div className="border-t border-border/40 px-4 py-2 flex items-center gap-3 text-[10px] text-muted-foreground bg-muted/20">
            <span className="flex items-center gap-1"><kbd className="px-1 rounded border bg-background font-mono">↑↓</kbd> Navigasi</span>
            <span className="flex items-center gap-1"><kbd className="px-1 rounded border bg-background font-mono">Enter</kbd> Buka</span>
            <span className="flex items-center gap-1"><kbd className="px-1 rounded border bg-background font-mono">Esc</kbd> Tutup</span>
            {done && (
              <span className="ml-auto text-[10px]">
                {categories.reduce((a, c) => a + c.items.length, 0) + navMatches.length} hasil
              </span>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Global Keyboard Trigger Hook ────────────────────────────────────────────
export function useGlobalSearchShortcut(open: boolean, setOpen: (v: boolean) => void) {
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(!open);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, setOpen]);
}
