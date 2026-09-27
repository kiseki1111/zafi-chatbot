"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Brain, Save, RefreshCw, Key, ShieldCheck, Cpu } from "lucide-react";

interface AiConfig {
  defaultProvider: string;
  defaultModel: string;
  visionModel: string;
  embeddingModel: string;
  temperature: number;
  globalSystemPrompt: string;
  securityBypassMode: boolean;
}

const DEFAULT_CONFIG: AiConfig = {
  defaultProvider: "openrouter",
  defaultModel: "deepseek/deepseek-v4-flash-0731",
  visionModel: "meta-llama/llama-4-scout-17b-16e-instruct",
  embeddingModel: "qwen/qwen3-embedding-8b",
  temperature: 0.3,
  globalSystemPrompt: "Anda adalah asisten AI customer service profesional untuk bisnis properti dan UMKM di Indonesia.",
  securityBypassMode: false,
};

export function AiConfigPage() {
  const [config, setConfig] = useState<AiConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/platform/config/ai_config");
      const json = await res.json();
      const val = json?.data || json;
      if (val && typeof val === "object") {
        setConfig({ ...DEFAULT_CONFIG, ...val });
      }
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await fetch("/api/v1/platform/config/ai_config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: config }),
      });
      toast.success("Konfigurasi AI platform berhasil disimpan!");
    } catch {
      toast.error("Gagal menyimpan konfigurasi");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Konfigurasi Model AI & Sistem</h2>
          <p className="text-xs text-muted-foreground">
            Pengaturan engine AI global, model LLM default, vision, dan security bypass
          </p>
        </div>
        <Button onClick={fetchConfig} variant="outline" size="sm" className="h-8 text-xs gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        {/* Core Engine Config */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2 border-b pb-3">
            <Cpu className="h-4 w-4 text-emerald-600" />
            <h3 className="font-bold text-sm">Model LLM & Provider Default</h3>
          </div>

          <div className="grid md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1.5">
              <Label>Provider AI Utama</Label>
              <Input
                value={config.defaultProvider}
                onChange={(e) => setConfig({ ...config, defaultProvider: e.target.value })}
                className="h-8 text-xs"
                placeholder="openrouter / openai"
              />
              <p className="text-[10px] text-muted-foreground">Penyedia routing API LLM global.</p>
            </div>

            <div className="space-y-1.5">
              <Label>Model Text / Chatbot Default</Label>
              <Input
                value={config.defaultModel}
                onChange={(e) => setConfig({ ...config, defaultModel: e.target.value })}
                className="h-8 text-xs font-mono"
                placeholder="deepseek/deepseek-v4-flash-0731"
              />
              <p className="text-[10px] text-muted-foreground">Model yang dipakai saat asisten bot merespons pelanggan.</p>
            </div>

            <div className="space-y-1.5">
              <Label>Model Vision (Analisis Foto)</Label>
              <Input
                value={config.visionModel}
                onChange={(e) => setConfig({ ...config, visionModel: e.target.value })}
                className="h-8 text-xs font-mono"
                placeholder="meta-llama/llama-4-scout-17b-16e-instruct"
              />
              <p className="text-[10px] text-muted-foreground">Dipakai saat pelanggan mengirim foto di WhatsApp.</p>
            </div>

            <div className="space-y-1.5">
              <Label>Model Embedding RAG</Label>
              <Input
                value={config.embeddingModel}
                onChange={(e) => setConfig({ ...config, embeddingModel: e.target.value })}
                className="h-8 text-xs font-mono"
                placeholder="qwen/qwen3-embedding-8b"
              />
              <p className="text-[10px] text-muted-foreground">Pencarian semantik pada Knowledge Base.</p>
            </div>
          </div>
        </Card>

        {/* Global Prompt & Tuning */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2 border-b pb-3">
            <Brain className="h-4 w-4 text-indigo-600" />
            <h3 className="font-bold text-sm">Behavior & Global System Prompt</h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="space-y-1.5">
              <Label>Global System Prompt Baseline</Label>
              <Textarea
                rows={4}
                value={config.globalSystemPrompt}
                onChange={(e) => setConfig({ ...config, globalSystemPrompt: e.target.value })}
                className="text-xs"
              />
              <p className="text-[10px] text-muted-foreground">
                Instruksi dasar yang disuntikkan ke setiap prompt bot di seluruh tenant klien.
              </p>
            </div>

            <div className="space-y-1.5 max-w-xs">
              <Label>Temperature (0.0 - 1.0)</Label>
              <Input
                type="number"
                step="0.05"
                min="0"
                max="1"
                value={config.temperature}
                onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) || 0.3 })}
                className="h-8 text-xs font-mono"
              />
              <p className="text-[10px] text-muted-foreground">Nilai rendah (0.1-0.3) membuat jawaban lebih faktual & minim halusinasi.</p>
            </div>
          </div>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-xs">
            <Save className="h-4 w-4" /> {saving ? "Menyimpan..." : "Simpan Konfigurasi AI"}
          </Button>
        </div>
      </form>
    </div>
  );
}
