"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Calculator, FileText, CheckCircle2, Landmark, Upload } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface KprApplication {
  id: string;
  name: string;
  property: string;
  bank: string;
  docs: { id: string; name: string; checked: boolean }[];
}

const DUMMY_PIPELINE: KprApplication[] = [
  {
    id: "KPR-01",
    name: "Budi Santoso",
    property: "Perumahan 1 - A12",
    bank: "BCA",
    docs: [
      { id: "d1", name: "Surat Pemesanan Rumah (SPR)", checked: false },
      { id: "d2", name: "SPJK (Persetujuan Kredit)", checked: false },
    ],
  },
  {
    id: "KPR-02",
    name: "Siti Aminah",
    property: "Apartemen X - 12B",
    bank: "Mandiri",
    docs: [
      { id: "d1", name: "Surat Pemesanan Rumah (SPR)", checked: true },
      { id: "d2", name: "SPJK (Persetujuan Kredit)", checked: false },
    ],
  },
  {
    id: "KPR-03",
    name: "Agus Pratama",
    property: "Perumahan 2 - C9",
    bank: "BTN",
    docs: [
      { id: "d1", name: "Surat Pemesanan Rumah (SPR)", checked: true },
      { id: "d2", name: "SPJK (Persetujuan Kredit)", checked: true },
    ],
  },
];

export function KprPage() {
  const [applications, setApplications] = useState<KprApplication[]>(DUMMY_PIPELINE);
  const [activeTab, setActiveTab] = useState("berkas");
  const [selectedApp, setSelectedApp] = useState<KprApplication | null>(null);

  // Kalkulator States
  const [price, setPrice] = useState<number>(500000000);
  const [dp, setDp] = useState<number>(100000000);
  const [tenor, setTenor] = useState<number>(15);
  const [interest, setInterest] = useState<number>(7.5);
  const [result, setResult] = useState<number | null>(null);
  const [bankType, setBankType] = useState<"BCA" | "BSI">("BCA");

  const calculateKpr = () => {
    const p = price - dp;
    const n = tenor * 12;
    if (p <= 0 || n <= 0) return setResult(0);
    
    if (bankType === "BCA") {
      const r = interest / 100 / 12;
      if (r <= 0) return setResult(p / n);
      const m = p * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
      setResult(m);
    } else if (bankType === "BSI") {
      const margin = interest / 100;
      const totalMargin = p * margin * tenor;
      const totalPay = p + totalMargin;
      const m = totalPay / n;
      setResult(m);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val);
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value.replace(/\D/g, ""));
    setPrice(isNaN(val) ? 0 : val);
  };
  const handleDpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value.replace(/\D/g, ""));
    setDp(isNaN(val) ? 0 : val);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Manajemen Berkas & KPR</h1>
          <p className="text-muted-foreground text-sm">Pantau status berkas SPR, SPJK, dan hitung estimasi cicilan dengan cepat.</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="berkas" className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" /> Status Berkas Nasabah
          </TabsTrigger>
          <TabsTrigger value="calculator" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" /> Kalkulator & Info Bank
          </TabsTrigger>
        </TabsList>

        <TabsContent value="berkas" className="m-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {applications.map((app) => {
              const hasSPR = app.docs.find(d => d.name.includes("SPR"))?.checked;
              const hasSPJK = app.docs.find(d => d.name.includes("SPJK"))?.checked;
              
              return (
                <Card 
                  key={app.id} 
                  className="p-4 cursor-pointer hover:shadow-md transition-all hover:border-emerald-300 bg-white flex flex-col"
                  onClick={() => setSelectedApp(app)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-bold text-base">{app.name}</p>
                    <Badge variant="outline" className="text-[10px] bg-slate-50">{app.bank}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">{app.property}</p>
                  
                  <div className="flex gap-3 mt-auto pt-4 border-t border-slate-100">
                    <div className={`flex-1 flex flex-col items-center justify-center p-2 rounded-lg border ${hasSPR ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                       <span className="text-[10px] font-semibold uppercase tracking-wider mb-1">SPR</span>
                       {hasSPR ? <CheckCircle2 className="h-5 w-5" /> : <div className="h-5 w-5 rounded-full border-2 border-slate-300" />}
                    </div>
                    <div className={`flex-1 flex flex-col items-center justify-center p-2 rounded-lg border ${hasSPJK ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                       <span className="text-[10px] font-semibold uppercase tracking-wider mb-1">SPJK</span>
                       {hasSPJK ? <CheckCircle2 className="h-5 w-5" /> : <div className="h-5 w-5 rounded-full border-2 border-slate-300" />}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="calculator" className="m-0 space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Calculator className="h-4 w-4" /> Parameter Simulasi
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Jenis Bank / Akad</Label>
                  <Select value={bankType} onValueChange={(val: "BCA" | "BSI") => setBankType(val)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Jenis Bank" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BCA">BCA (Konvensional - Annuity)</SelectItem>
                      <SelectItem value="BSI">BSI (Syariah - Margin Flat)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Harga properti (Rp)</Label>
                  <Input value={price === 0 ? "" : price.toLocaleString("id-ID")} onChange={handlePriceChange} />
                </div>
                <div className="space-y-2">
                  <Label>Uang muka / DP (Rp)</Label>
                  <Input value={dp === 0 ? "" : dp.toLocaleString("id-ID")} onChange={handleDpChange} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tenor (Tahun)</Label>
                    <Input type="number" value={tenor} onChange={(e) => setTenor(Number(e.target.value))} />
                  </div>
                  <div className="space-y-2">
                    <Label>{bankType === "BCA" ? "Bunga / tahun (%)" : "Margin / tahun (%)"}</Label>
                    <Input type="number" step="0.1" value={interest} onChange={(e) => setInterest(Number(e.target.value))} />
                  </div>
                </div>
                <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white mt-2" onClick={calculateKpr}>
                  Hitung cicilan
                </Button>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="flex flex-col items-center justify-center p-6 text-center border-emerald-200 bg-emerald-50/30">
                <p className="text-sm text-muted-foreground">Estimasi cicilan / bulan</p>
                <p className="text-5xl font-bold font-display mt-4 text-emerald-600 drop-shadow-sm">
                  {result !== null ? formatCurrency(result) : "-"}
                </p>
                <p className="text-xs text-muted-foreground mt-4">
                  Selama {tenor * 12} bulan &middot; Asumsi suku bunga flat
                </p>
                {result !== null && (
                  <div className="mt-6 text-sm text-left w-full space-y-2 border-t border-emerald-100 pt-4">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Plafon Pinjaman:</span>
                      <span className="font-medium">{formatCurrency(price - dp)}</span>
                    </div>
                  </div>
                )}
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Landmark className="h-4 w-4 text-blue-600" /> Referensi Suku Bunga Promo (Dummy)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center p-2 rounded-lg border bg-slate-50 text-sm">
                    <div className="font-medium flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-600" /> BCA</div>
                    <div className="text-muted-foreground">Fixed 3 thn <span className="font-bold text-foreground">4.25%</span></div>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded-lg border bg-slate-50 text-sm">
                    <div className="font-medium flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-amber-500" /> Mandiri</div>
                    <div className="text-muted-foreground">Fixed 5 thn <span className="font-bold text-foreground">5.50%</span></div>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded-lg border bg-slate-50 text-sm">
                    <div className="font-medium flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-800" /> BTN</div>
                    <div className="text-muted-foreground">Promo Milenial <span className="font-bold text-foreground">4.75%</span></div>
                  </div>
                  <p className="text-[10px] text-muted-foreground text-center italic mt-2">
                    Informasi ini membantu agen memberikan estimasi cepat kepada calon pembeli.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Detail Pengajuan & Checklist Modal */}
      <Dialog open={!!selectedApp} onOpenChange={(open) => !open && setSelectedApp(null)}>
        <DialogContent className="sm:max-w-md">
          {selectedApp && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <DialogTitle className="text-xl">{selectedApp.name}</DialogTitle>
                    <DialogDescription className="mt-1 flex items-center gap-1.5">
                      <Landmark className="h-3.5 w-3.5" /> Pengajuan KPR {selectedApp.bank}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="mt-4 space-y-6">
                {/* Info Properti */}
                <div className="rounded-lg border p-3 bg-muted/20 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Unit Properti</p>
                  <p className="text-sm font-medium">{selectedApp.property}</p>
                </div>

                {/* Checklist Dokumen */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold flex items-center gap-2">
                      <FileText className="h-4 w-4 text-emerald-600" /> Checklist Berkas (Legal/Admin)
                    </p>
                    <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                      {selectedApp.docs.filter(d => d.checked).length} / {selectedApp.docs.length} Lengkap
                    </span>
                  </div>
                  
                  <div className="space-y-2 border rounded-lg p-1">
                    {selectedApp.docs.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-md transition-colors group">
                        <div className="flex items-center space-x-3">
                          <Checkbox 
                            id={doc.id} 
                            checked={doc.checked} 
                            onCheckedChange={(checked) => {
                              setSelectedApp(prev => prev ? {
                                ...prev,
                                docs: prev.docs.map(d => d.id === doc.id ? { ...d, checked: !!checked } : d)
                              } : null);
                            }}
                          />
                          <label
                            htmlFor={doc.id}
                            className={`text-sm font-medium leading-none cursor-pointer ${doc.checked ? 'text-muted-foreground line-through' : ''}`}
                          >
                            {doc.name}
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground italic">
                    *Tim marketing dapat memantau dengan jelas apakah dokumen krusial ini sudah terbit atau belum.
                  </p>
                </div>

                <div className="flex gap-2 justify-end pt-4 border-t">
                  <Button variant="outline" onClick={() => setSelectedApp(null)}>Tutup</Button>
                  <Button 
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => {
                      if (selectedApp) {
                        setApplications(prev => prev.map(app => app.id === selectedApp.id ? selectedApp : app));
                        setSelectedApp(null);
                      }
                    }}
                  >
                    Simpan Perubahan
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
