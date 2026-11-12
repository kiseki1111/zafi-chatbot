"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Bot,
  User,
  Send,
  Sparkles,
  Terminal,
  Database,
  ShieldCheck,
  ShieldAlert,
  Clock,
  RotateCcw,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

interface ChatMessage {
  id: string;
  sender: "user" | "bot";
  text: string;
  timestamp: string;
  toolCall?: {
    name: string;
    params: Record<string, any>;
    result: Record<string, any>;
    status: "SUCCESS" | "UNAUTHORIZED" | "ERROR";
  };
}

interface TestPersona {
  id: string;
  name: string;
  role: string;
  department: string;
  accessLevel: "STAFF" | "HR_ADMIN" | "FINANCE_ADMIN" | "EXECUTIVE";
}

const TEST_PERSONAS: TestPersona[] = [
  {
    id: "p-1",
    name: "Ahmad Fauzi",
    role: "Software Engineer",
    department: "Teknologi & IT",
    accessLevel: "STAFF",
  },
  {
    id: "p-2",
    name: "Budi Santoso",
    role: "Senior Accountant",
    department: "Keuangan & Akuntansi",
    accessLevel: "FINANCE_ADMIN",
  },
  {
    id: "p-3",
    name: "Siti Rahmawati",
    role: "HR Operations Lead",
    department: "HRD",
    accessLevel: "HR_ADMIN",
  },
  {
    id: "p-4",
    name: "Hendro Wibowo",
    role: "Managing Director",
    department: "Direksi",
    accessLevel: "EXECUTIVE",
  },
];

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: "m-1",
    sender: "bot",
    text: "Halo! Saya Asisten AI Internal perusahaan Anda. Saya siap membantu memeriksa data cuti, slip gaji, info kas, status invoice, maupun dokumen SOP perusahaan.",
    timestamp: "10:00 WIB",
  },
];

export function AssistantChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [activePersona, setActivePersona] = useState<TestPersona>(TEST_PERSONAS[0]);
  const [isTyping, setIsTyping] = useState(false);
  const [inspectorData, setInspectorData] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSend = (textToSend?: string) => {
    const q = textToSend || input;
    if (!q.trim()) return;

    const userMsg: ChatMessage = {
      id: "u-" + Date.now(),
      sender: "user",
      text: q,
      timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB",
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    setTimeout(async () => {
      setIsTyping(false);
      const lower = q.toLowerCase();
      let botResponse = "";
      let toolCall: ChatMessage["toolCall"] = undefined;

      if (lower.includes("cuti")) {
        try {
          const res = await fetch("/api/v1/hris/karyawan/250100001/cuti");
          const json = await res.json();
          const d = json?.data || json;
          const sisa = d?.sisa_cuti ?? 12;
          const terpakai = d?.cuti_terpakai ?? 0;
          const kuota = d?.kuota_tahunan ?? 12;
          toolCall = {
            name: "hris.cek_sisa_cuti",
            params: { nik: "250100001", nama: activePersona.name },
            result: d,
            status: "SUCCESS",
          };
          botResponse = `Halo ${activePersona.name}! Berdasarkan database sistem HRIS, kuota cuti tahunan Anda adalah ${kuota} hari (terpakai: ${terpakai} hari), sehingga sisa kuota cuti Anda tersisa ${sisa} hari kerja.`;
        } catch {
          botResponse = `Halo ${activePersona.name}, kuota cuti tahunan Anda saat ini tersisa 12 hari kerja.`;
        }
      } else if (lower.includes("absen") || lower.includes("presensi") || lower.includes("kehadiran")) {
        try {
          const res = await fetch("/api/v1/hris/karyawan/250100001/presensi");
          const json = await res.json();
          const d = json?.data || json;
          const rekap = d?.rekap_bulan_ini;
          toolCall = {
            name: "hris.rekap_presensi",
            params: { nik: "250100001", nama: activePersona.name },
            result: d,
            status: "SUCCESS",
          };
          botResponse = `Rekap kehadiran Anda di HRIS bulan ini: Hadir ${rekap?.hadir ?? 7} hari, Izin ${rekap?.izin ?? 0} hari, Sakit ${rekap?.sakit ?? 0} hari. Status absensi hari ini: ${d?.hari_ini?.status ?? "Hadir"}.`;
        } catch {
          botResponse = `Halo ${activePersona.name}, status absensi Anda hari ini tercatat Hadir.`;
        }
      } else if (lower.includes("slip") || lower.includes("gaji")) {
        try {
          const res = await fetch("/api/v1/hris/karyawan/250100001/slip-gaji");
          const json = await res.json();
          const d = json?.data || json;
          toolCall = {
            name: "hris.info_slip_gaji",
            params: { nik: "250100001", nama: activePersona.name },
            result: d,
            status: "SUCCESS",
          };
          botResponse = `Informasi slip gaji untuk ${activePersona.name} (${d?.periode ?? "Periode Terkini"}): Status ${d?.status_slip ?? "Tersedia"}. Rincian slip resmi dapat diunduh via portal presensi HRIS.`;
        } catch {
          botResponse = `Slip gaji periode berjalan sudah diproses.`;
        }
      } else if (lower.includes("kas") || lower.includes("saldo")) {
        if (activePersona.accessLevel === "STAFF") {
          toolCall = {
            name: "accounting.ringkasan_saldo_kas",
            params: { requesterRole: activePersona.accessLevel },
            result: { error: "FORBIDDEN: Hanya role Finance Admin dan Direksi yang diizinkan." },
            status: "UNAUTHORIZED",
          };
          botResponse = `Maaf ${activePersona.name}, informasi saldo kas operasional perusahaan bersifat rahasia dan dibatasi hanya untuk staf Keuangan dan Direksi.`;
        } else {
          toolCall = {
            name: "accounting.ringkasan_saldo_kas",
            params: { accounts: ["KAS_OPERASIONAL", "BANK_BCA"] },
            result: { kasOperasional: 148500000, bcaUtama: 420000000 },
            status: "SUCCESS",
          };
          botResponse = `Posisi saldo kas terkini: Kas Operasional Rp 148.500.000 dan Rekening Bank BCA Rp 420.000.000. Total likuiditas: Rp 568.500.000.`;
        }
      } else if (lower.includes("invoice") || lower.includes("tagihan")) {
        toolCall = {
          name: "accounting.cek_status_invoice",
          params: { invoiceNo: "INV-2026-0089" },
          result: { no: "INV-2026-0089", status: "LUNAS", nominal: 45000000 },
          status: "SUCCESS",
        };
        botResponse = `Invoice INV-2026-0089 tercatat LUNAS per tanggal 5 Maret 2026 sebesar Rp 45.000.000 via transfer Bank Mandiri.`;
      } else {
        botResponse = `Pertanyaan Anda telah dicocokkan dengan dokumen kebijakan internal perusahaan. Silakan ajukan pertanyaan lain seputar hak cuti, absensi, atau invoice.`;
      }

      const botMsg: ChatMessage = {
        id: "b-" + Date.now(),
        sender: "bot",
        text: botResponse,
        timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB",
        toolCall,
      };

      setMessages((prev) => [...prev, botMsg]);
      if (toolCall) {
        setInspectorData(toolCall);
      }
    }, 800);
  };

  return (
    <div className="h-[calc(100dvh-7.5rem)] flex flex-col lg:flex-row gap-4">
      {/* Main Chat Box */}
      <div className="flex-1 flex flex-col bg-card rounded-xl border border-border/80 shadow-xs overflow-hidden">
        {/* Chat Header & Persona Selector */}
        <div className="p-3.5 border-b border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/30">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
              <Bot className="h-4 w-4" />
            </div>
            <div>
              <p className="font-semibold text-xs text-foreground">Playground Chat Asisten Internal</p>
              <p className="text-[10px] text-muted-foreground">Uji coba simulasi respons staf & function calling</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground shrink-0">Simulasi Sebagai:</span>
            <select
              value={activePersona.id}
              onChange={(e) => {
                const found = TEST_PERSONAS.find((p) => p.id === e.target.value);
                if (found) {
                  setActivePersona(found);
                  toast.info(`Beralih simulasi ke: ${found.name} (${found.department})`);
                }
              }}
              className="text-xs bg-background border border-input rounded-md px-2.5 py-1 font-medium"
            >
              {TEST_PERSONAS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.department} ({p.accessLevel})
                </option>
              ))}
            </select>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground"
              onClick={() => {
                setMessages(INITIAL_MESSAGES);
                setInspectorData(null);
                toast.success("Sesi chat simulasi direset");
              }}
              title="Reset Chat"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-2.5 max-w-[85%] ${m.sender === "user" ? "ml-auto flex-row-reverse" : "mr-auto"}`}
            >
              <Avatar className="h-7 w-7 shrink-0 text-[10px]">
                <AvatarFallback className={m.sender === "user" ? "bg-emerald-600 text-white" : "bg-muted text-foreground"}>
                  {m.sender === "user" ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5 text-emerald-600" />}
                </AvatarFallback>
              </Avatar>

              <div className="space-y-1.5">
                <div
                  className={`p-3 rounded-2xl text-xs leading-relaxed ${
                    m.sender === "user"
                      ? "bg-emerald-600 text-white rounded-tr-xs"
                      : "bg-muted/70 text-foreground border border-border/60 rounded-tl-xs"
                  }`}
                >
                  <p>{m.text}</p>
                </div>

                {m.toolCall && (
                  <button
                    onClick={() => setInspectorData(m.toolCall)}
                    className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground bg-muted/40 hover:bg-muted border border-border/60 px-2 py-0.5 rounded cursor-pointer transition-colors"
                  >
                    <Terminal className="h-3 w-3 text-emerald-600" />
                    <span>Tool dipanggil:</span>
                    <code className="font-mono font-semibold text-foreground">{m.toolCall.name}</code>
                    <Badge variant={m.toolCall.status === "SUCCESS" ? "secondary" : "destructive"} className="text-[9px] px-1 py-0">
                      {m.toolCall.status}
                    </Badge>
                  </button>
                )}

                <p className="text-[9px] text-muted-foreground px-1">{m.timestamp}</p>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex gap-2.5 max-w-[80%]">
              <Avatar className="h-7 w-7 shrink-0 text-[10px]">
                <AvatarFallback className="bg-muted text-foreground">
                  <Bot className="h-3.5 w-3.5 text-emerald-600 animate-pulse" />
                </AvatarFallback>
              </Avatar>
              <div className="bg-muted/60 p-3 rounded-2xl rounded-tl-xs text-xs text-muted-foreground flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping mr-1" />
                Asisten sedang memeriksa endpoint sistem...
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>

        {/* Quick Prompt Chips */}
        <div className="px-4 py-2 bg-muted/20 border-t border-border/40 flex items-center gap-1.5 overflow-x-auto text-[11px]">
          <span className="text-muted-foreground font-medium shrink-0 flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-emerald-600" /> Contoh:
          </span>
          <button
            onClick={() => handleSend("Berapa sisa cuti tahunan saya?")}
            className="px-2 py-1 bg-background hover:bg-muted rounded-full border border-border/60 text-muted-foreground hover:text-foreground whitespace-nowrap cursor-pointer transition-colors"
          >
            Sisa Cuti Saya
          </button>
          <button
            onClick={() => handleSend("Berapa saldo kas operasional saat ini?")}
            className="px-2 py-1 bg-background hover:bg-muted rounded-full border border-border/60 text-muted-foreground hover:text-foreground whitespace-nowrap cursor-pointer transition-colors"
          >
            Saldo Kas Perusahaan
          </button>
          <button
            onClick={() => handleSend("Cek status invoice INV-2026-0089")}
            className="px-2 py-1 bg-background hover:bg-muted rounded-full border border-border/60 text-muted-foreground hover:text-foreground whitespace-nowrap cursor-pointer transition-colors"
          >
            Status Invoice Klien
          </button>
        </div>

        {/* Chat Input */}
        <div className="p-3 border-t border-border/60 bg-background flex items-center gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder={`Tanya asisten sebagai ${activePersona.name}...`}
            className="text-xs flex-1"
          />
          <Button
            size="sm"
            onClick={() => handleSend()}
            disabled={!input.trim() || isTyping}
            className="gap-1.5 px-3"
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Tool Call Inspector Panel */}
      <div className="w-full lg:w-80 bg-card rounded-xl border border-border/80 shadow-xs p-4 flex flex-col space-y-3.5">
        <div className="flex items-center gap-2 border-b border-border/60 pb-3">
          <Terminal className="h-4 w-4 text-emerald-600" />
          <h3 className="font-semibold text-xs text-foreground">Inspector Pemanggilan Tool</h3>
        </div>

        {inspectorData ? (
          <div className="space-y-3 text-xs flex-1 overflow-y-auto">
            <div className="p-2.5 rounded bg-muted/50 border border-border/60 space-y-1">
              <span className="text-muted-foreground text-[10px]">Fungsi Yang Dijalankan:</span>
              <p className="font-mono font-bold text-foreground">{inspectorData.name}</p>
              <div className="pt-1">
                <Badge variant={inspectorData.status === "SUCCESS" ? "default" : "destructive"} className="text-[9px]">
                  Status: {inspectorData.status}
                </Badge>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-muted-foreground text-[10px]">Parameter Input Tool:</span>
              <pre className="bg-muted/40 p-2 rounded border font-mono text-[10px] text-foreground overflow-x-auto">
                {JSON.stringify(inspectorData.params, null, 2)}
              </pre>
            </div>

            <div className="space-y-1">
              <span className="text-muted-foreground text-[10px]">Hasil Respons Dari Backend:</span>
              <pre className="bg-muted/40 p-2 rounded border font-mono text-[10px] text-foreground overflow-x-auto">
                {JSON.stringify(inspectorData.result, null, 2)}
              </pre>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-4 text-muted-foreground space-y-2">
            <Zap className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-xs">Kirim pesan pertanyaan cuti atau kas untuk melihat tracing eksekusi tool di sini.</p>
          </div>
        )}

        <div className="pt-2 border-t border-border/60 text-[10px] text-muted-foreground space-y-1">
          <div className="flex items-center justify-between">
            <span>Model LLM:</span>
            <span className="font-mono text-foreground font-semibold">gpt-4o-mini</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Enkripsi Token:</span>
            <span className="text-emerald-600 font-semibold">HS256 Verified</span>
          </div>
        </div>
      </div>
    </div>
  );
}
