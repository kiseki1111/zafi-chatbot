
"use client";

import * as React from "react";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Save, Loader2 } from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";

export function WarnaWebsiteTab() {
  const { user } = useAuthStore();
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  const [colors, setColors] = React.useState({
    primary: "#059669",   // emerald-600 default
    secondary: "#0d9488", // teal-600 default
    accent: "#3b82f6",    // blue-500 default
  });

  React.useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/v1/tenant/${user?.tenantId || user?.id || 'demo'}/dashboard`);
        const data = await res.json();
        const savedColors = data?.tenant?.metadata?.colorPalette;
        if (savedColors) {
          setColors({
            primary: savedColors.primary || "#059669",
            secondary: savedColors.secondary || "#0d9488",
            accent: savedColors.accent || "#3b82f6",
          });
        }
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    }
    load();
  }, [user?.id]);

  const applyColorsLocally = (palette: typeof colors) => {
    document.documentElement.style.setProperty("--brand-primary", palette.primary);
    document.documentElement.style.setProperty("--brand-secondary", palette.secondary);
    document.documentElement.style.setProperty("--brand-accent", palette.accent);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`/api/v1/tenant/${user?.id || 'demo'}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ colorPalette: colors }),
      });
      applyColorsLocally(colors);
      toast.success("Palet warna website berhasil disimpan!");
    } catch (e) {
      toast.error("Gagal menyimpan palet warna");
    }
    setSaving(false);
  };

  const resetDefault = () => {
    const defaults = { primary: "#059669", secondary: "#0d9488", accent: "#3b82f6" };
    setColors(defaults);
    applyColorsLocally(defaults);
  };

  if (loading) {
    return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-emerald-600" /></div>;
  }

  return (
    <Card>
      <CardHeader className="pb-3 border-b mb-4">
        <CardTitle className="text-lg">Kustomisasi Warna Website</CardTitle>
        <CardDescription>
          Sesuaikan warna utama dashboard dan branding sesuai identitas bisnis Anda.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 md:grid-cols-3">
          {/* Warna Utama */}
          <div className="space-y-2 border rounded-xl p-4 bg-muted/20">
            <Label htmlFor="primaryColor" className="font-semibold text-sm">Warna Utama (Primary)</Label>
            <p className="text-[11px] text-muted-foreground">Dipakai pada tombol utama, icon aktif, dan header.</p>
            <div className="flex items-center gap-3 pt-2">
              <input
                id="primaryColor"
                type="color"
                value={colors.primary}
                onChange={(e) => {
                  const updated = { ...colors, primary: e.target.value };
                  setColors(updated);
                  applyColorsLocally(updated);
                }}
                className="h-10 w-14 rounded cursor-pointer border border-input bg-transparent p-1"
              />
              <span className="font-mono text-xs uppercase">{colors.primary}</span>
            </div>
          </div>

          {/* Warna Sekunder */}
          <div className="space-y-2 border rounded-xl p-4 bg-muted/20">
            <Label htmlFor="secondaryColor" className="font-semibold text-sm">Warna Sekunder</Label>
            <p className="text-[11px] text-muted-foreground">Dipakai pada gradien header dan aksen latar.</p>
            <div className="flex items-center gap-3 pt-2">
              <input
                id="secondaryColor"
                type="color"
                value={colors.secondary}
                onChange={(e) => {
                  const updated = { ...colors, secondary: e.target.value };
                  setColors(updated);
                  applyColorsLocally(updated);
                }}
                className="h-10 w-14 rounded cursor-pointer border border-input bg-transparent p-1"
              />
              <span className="font-mono text-xs uppercase">{colors.secondary}</span>
            </div>
          </div>

          {/* Warna Aksen */}
          <div className="space-y-2 border rounded-xl p-4 bg-muted/20">
            <Label htmlFor="accentColor" className="font-semibold text-sm">Warna Aksen / Highlight</Label>
            <p className="text-[11px] text-muted-foreground">Dipakai pada badge, highlight notifikasi, dan tombol takeover.</p>
            <div className="flex items-center gap-3 pt-2">
              <input
                id="accentColor"
                type="color"
                value={colors.accent}
                onChange={(e) => {
                  const updated = { ...colors, accent: e.target.value };
                  setColors(updated);
                  applyColorsLocally(updated);
                }}
                className="h-10 w-14 rounded cursor-pointer border border-input bg-transparent p-1"
              />
              <span className="font-mono text-xs uppercase">{colors.accent}</span>
            </div>
          </div>
        </div>

        {/* Live Preview Bar */}
        <div className="space-y-2 pt-2">
          <Label className="text-xs text-muted-foreground">Pratinjau Tampilan Brand:</Label>
          <div
            className="p-4 rounded-xl text-white flex items-center justify-between shadow-sm transition-all"
            style={{
              background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
            }}
          >
            <div>
              <p className="font-bold text-sm">Contoh Header Dashboard</p>
              <p className="text-xs opacity-85">Kombinasi warna utama dan sekunder perusahaan Anda.</p>
            </div>
            <button
              type="button"
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white shadow-sm"
              style={{ backgroundColor: colors.accent }}
            >
              Tombol Aksen
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <Button variant="outline" size="sm" onClick={resetDefault}>
            Reset Default
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Simpan Palet Warna
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
