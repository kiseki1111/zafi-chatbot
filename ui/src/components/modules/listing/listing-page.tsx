import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, MapPin, Tag, Plus, Building, Grid, MoreVertical, Building2, Loader2, UploadCloud } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export function ListingPage() {
  const [selectedSiteplan, setSelectedSiteplan] = useState<{ 
    id: string, 
    name: string,
    location?: string,
    price?: string,
    specs?: string
  } | null>(null);
  
  // States for Add Property
  const [isAddPropertyOpen, setIsAddPropertyOpen] = useState(false);
  const [addStep, setAddStep] = useState(1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Listing Proyek & Produk</h1>
        <p className="text-muted-foreground">Katalog properti, progres konstruksi, dan academy penjualan.</p>
      </div>

      <Tabs defaultValue="properti" className="w-full">
        <TabsList>
          <TabsTrigger value="properti">Properti</TabsTrigger>
          <TabsTrigger value="konstruksi">Konstruksi</TabsTrigger>
          <TabsTrigger value="academy">Academy</TabsTrigger>
        </TabsList>

        <TabsContent value="properti" className="space-y-4 mt-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Cari properti..." className="pl-9" />
            </div>
            <Button variant="outline"><MapPin className="mr-2 h-4 w-4" /> Semua Lokasi</Button>
            <Button variant="outline"><Tag className="mr-2 h-4 w-4" /> Semua Harga</Button>
            <Button className="ml-auto bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => { setIsAddPropertyOpen(true); setAddStep(1); }}>
              <Plus className="mr-2 h-4 w-4" /> Tambah Properti
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <Card className="overflow-hidden">
              <div className="h-48 bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center relative text-slate-700">
                <Building className="h-20 w-20 opacity-20" />
                <div className="absolute top-3 left-3 bg-black/60 text-white text-xs px-2.5 py-1 rounded-full flex items-center gap-1.5 backdrop-blur-sm">
                  <span className="h-2 w-2 rounded-full bg-emerald-500"></span> Tersedia
                </div>
              </div>
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-base leading-tight">Menteng Residence Cluster A</h3>
                  <Button variant="ghost" size="icon" className="h-6 w-6 -mr-2"><MoreVertical className="h-4 w-4" /></Button>
                </div>
                <div className="flex items-center text-xs text-muted-foreground mb-4">
                  <MapPin className="mr-1 h-3 w-3" /> Jakarta Pusat
                </div>
                <div className="flex justify-between mb-4 border-t pt-4">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Stok Unit</p>
                    <p className="font-bold font-display text-lg mt-0.5">51 <span className="text-xs font-normal text-muted-foreground">Unit</span></p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Harga Mulai</p>
                    <p className="font-bold font-display text-lg mt-0.5 text-emerald-600 dark:text-emerald-400">Rp 2.5M</p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  className="w-full text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                  onClick={() => setSelectedSiteplan({ 
                    id: "p1", 
                    name: "Menteng Residence Cluster A",
                    location: "Jl. MH Thamrin No.10, Menteng, Jakarta Pusat",
                    price: "Mulai Rp 2.500.000.000",
                    specs: "LT: 90m² | LB: 75m² | 3 KT" 
                  })}
                >
                  <Grid className="mr-2 h-4 w-4" /> Buka Siteplan Interaktif
                </Button>
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <div className="h-48 bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center relative text-slate-700">
                <Building2 className="h-20 w-20 opacity-20" />
                <div className="absolute top-3 left-3 bg-black/60 text-white text-xs px-2.5 py-1 rounded-full flex items-center gap-1.5 backdrop-blur-sm">
                  <span className="h-2 w-2 rounded-full bg-amber-500"></span> Hampir Habis
                </div>
              </div>
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-base leading-tight">Apartemen Sudirman Tower B</h3>
                  <Button variant="ghost" size="icon" className="h-6 w-6 -mr-2"><MoreVertical className="h-4 w-4" /></Button>
                </div>
                <div className="flex items-center text-xs text-muted-foreground mb-4">
                  <MapPin className="mr-1 h-3 w-3" /> Jakarta Selatan
                </div>
                <div className="flex justify-between mb-4 border-t pt-4">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Stok Unit</p>
                    <p className="font-bold font-display text-lg mt-0.5">12 <span className="text-xs font-normal text-muted-foreground">Unit</span></p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Harga Mulai</p>
                    <p className="font-bold font-display text-lg mt-0.5 text-emerald-600 dark:text-emerald-400">Rp 1.2M</p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  className="w-full text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                  onClick={() => setSelectedSiteplan({ 
                    id: "p2", 
                    name: "Apartemen Sudirman Tower B",
                    location: "Kuningan, Setiabudi, Jakarta Selatan",
                    price: "Mulai Rp 1.200.000.000",
                    specs: "Studio / 1BR / 2BR" 
                  })}
                >
                  <Grid className="mr-2 h-4 w-4" /> Buka Siteplan Interaktif
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="konstruksi" className="mt-4">
          <Card className="p-6 max-w-2xl">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Proyek Konstruksi</h3>
            <div className="flex justify-between text-sm mb-2">
              <span>Progres fisik Proyek A</span>
              <span className="font-bold">64%</span>
            </div>
            <Progress value={64} className="h-2" />
            <p className="text-xs text-muted-foreground mt-4">Milestone, dokumentasi & jadwal konstruksi tampil di sini.</p>
          </Card>
        </TabsContent>

        <TabsContent value="academy" className="mt-4">
          <Card className="p-6 max-w-2xl">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Academy</h3>
            <p className="text-sm">📘 Ebook A — Teknik closing &nbsp;&middot;&nbsp; 🎓 Pelatihan A — Product knowledge</p>
            <p className="text-xs text-muted-foreground mt-4">Materi belajar untuk tim; bisa dibuka & diunduh.</p>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog Siteplan Interaktif */}
      <Dialog open={!!selectedSiteplan} onOpenChange={(open) => !open && setSelectedSiteplan(null)}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <Grid className="h-5 w-5" /> Siteplan Interaktif: {selectedSiteplan?.name}
            </DialogTitle>
            <DialogDescription>
              Denah visual unit dan informasi kepemilikan.
            </DialogDescription>
          </DialogHeader>

          {/* Property Info Bar */}
          {selectedSiteplan?.location && (
            <div className="flex flex-wrap gap-4 p-3 bg-emerald-50/50 border border-emerald-100 rounded-lg text-sm mb-2">
              <div className="flex items-center gap-1.5 text-emerald-800">
                <MapPin className="h-4 w-4" /> <span className="font-medium">{selectedSiteplan.location}</span>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-800">
                <Tag className="h-4 w-4" /> <span className="font-medium">{selectedSiteplan.price}</span>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-800">
                <Building className="h-4 w-4" /> <span className="font-medium">{selectedSiteplan.specs}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Visual Grid */}
            <div className="border rounded-lg p-4 bg-slate-50">
              <h4 className="text-sm font-semibold mb-3">Denah Unit</h4>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { unit: "A1", status: "sold", owner: "Budi Santoso" },
                  { unit: "A2", status: "available" },
                  { unit: "A3", status: "available" },
                  { unit: "A4", status: "sold", owner: "Siti Aminah" },
                  { unit: "B1", status: "available" },
                  { unit: "B2", status: "sold", owner: "Agus Pratama" },
                  { unit: "B3", status: "available" },
                  { unit: "B4", status: "available" },
                  { unit: "C1", status: "sold", owner: "Rina Marlina" },
                  { unit: "C2", status: "available" },
                  { unit: "C3", status: "sold", owner: "Doni Kusuma" },
                  { unit: "C4", status: "available" },
                ].map((u) => (
                  <div 
                    key={u.unit} 
                    className={`h-16 rounded-md flex flex-col items-center justify-center border-2 transition-all cursor-default
                      ${u.status === 'sold' ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:scale-105 hover:cursor-pointer'}`}
                  >
                    <span className="font-bold text-sm">{u.unit}</span>
                    <span className="text-[10px] mt-1">{u.status === 'sold' ? 'Terjual' : 'Tersedia'}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-4 mt-4 justify-center text-xs text-muted-foreground">
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-emerald-50 border-2 border-emerald-200"></div> Tersedia</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-rose-50 border-2 border-rose-200"></div> Terjual</div>
              </div>
            </div>

            {/* List Owners / Detail Unit */}
            <div className="border rounded-lg p-4 flex flex-col">
              <h4 className="text-sm font-semibold mb-3">Detail & Kepemilikan Unit</h4>
              <div className="space-y-3 flex-1 overflow-y-auto max-h-[350px] pr-2">
                {[
                  { unit: "A1", owner: "Budi Santoso", date: "12 Ags 2023", price: "Rp 2.7M", type: "Sudut / Hook" },
                  { unit: "A2", owner: null, date: null, price: "Rp 2.5M", type: "Standard" },
                  { unit: "A4", owner: "Siti Aminah", date: "05 Sep 2023", price: "Rp 2.5M", type: "Standard" },
                  { unit: "B2", owner: "Agus Pratama", date: "21 Okt 2023", price: "Rp 2.6M", type: "Dekat Taman" },
                  { unit: "C1", owner: "Rina Marlina", date: "11 Nov 2023", price: "Rp 2.8M", type: "Premium" },
                  { unit: "C3", owner: "Doni Kusuma", date: "02 Des 2023", price: "Rp 2.5M", type: "Standard" },
                ].map((o) => (
                  <div key={o.unit} className={`flex items-start justify-between p-3 rounded-lg border shadow-sm ${o.owner ? 'bg-white' : 'bg-slate-50 border-dashed'}`}>
                    <div className="flex gap-3 w-full">
                      <div className={`w-10 h-10 rounded-lg shrink-0 flex flex-col items-center justify-center font-bold text-xs
                        ${o.owner ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {o.unit}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start w-full">
                          <p className="font-semibold text-sm">{o.owner ? o.owner : <span className="text-emerald-600 italic">Tersedia</span>}</p>
                          <span className="text-xs font-bold font-display">{o.price}</span>
                        </div>
                        <div className="flex justify-between items-center mt-1">
                          <p className="text-[10px] text-slate-500 bg-slate-200/50 px-1.5 py-0.5 rounded">{o.type}</p>
                          {o.date && <p className="text-[10px] text-muted-foreground">Booking: {o.date}</p>}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Tambah Properti (Simulasi AI) */}
      <Dialog open={isAddPropertyOpen} onOpenChange={(open) => !open && setIsAddPropertyOpen(false)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Tambah Properti Baru</DialogTitle>
            <DialogDescription>
              {addStep === 1 && "Masukkan detail properti dan unggah gambar denah siteplan."}
              {addStep === 2 && "Sistem sedang memproses gambar siteplan Anda..."}
              {addStep === 3 && "Pemetaan siteplan otomatis berhasil diselesaikan."}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4">
            {addStep === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nama Properti</Label>
                  <Input placeholder="Contoh: Cluster Cendana" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Lokasi</Label>
                    <Input placeholder="Contoh: Jakarta Timur" />
                  </div>
                  <div className="space-y-2">
                    <Label>Total Unit (Opsional)</Label>
                    <Input type="number" placeholder="Contoh: 12" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Format Blok/Kaveling (Opsional untuk Bantuan AI)</Label>
                  <Input placeholder="Contoh: A1-A4, B1-B4, C1-C4" className="text-sm" />
                  <p className="text-[10px] text-muted-foreground mt-1">*Informasi ini sangat membantu sistem AI untuk memetakan nama kaveling dengan lebih akurat.</p>
                </div>
                <div className="space-y-2">
                  <Label>Unggah Siteplan (Blueprint/Render)</Label>
                  <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-50 transition-colors">
                    <UploadCloud className="h-8 w-8 text-slate-400 mb-2" />
                    <p className="text-sm font-medium">Klik untuk mengunggah atau seret file (JPG, PNG, PDF)</p>
                    <p className="text-xs text-muted-foreground mt-1">Pastikan gambar jelas untuk hasil pemetaan AI yang akurat.</p>
                  </div>
                </div>
                
                <div className="flex justify-end pt-4 gap-2">
                  <Button variant="outline" onClick={() => setIsAddPropertyOpen(false)}>Batal</Button>
                  <Button 
                    className="bg-blue-600 hover:bg-blue-700 text-white" 
                    onClick={() => {
                      setAddStep(2);
                      setTimeout(() => setAddStep(3), 2500); // Simulasi delay 2.5 detik
                    }}
                  >
                    Proses dengan AI ✨
                  </Button>
                </div>
              </div>
            )}

            {addStep === 2 && (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
                <p className="text-sm font-medium text-slate-600 text-center animate-pulse">
                  AI sedang menganalisis gambar...<br/>
                  <span className="text-xs font-normal">Mendeteksi blok, kaveling, dan mengekstrak label teks.</span>
                </p>
              </div>
            )}

            {addStep === 3 && (
              <div className="space-y-4">
                <div className="bg-slate-100 rounded-lg p-4 border relative overflow-hidden">
                  <div className="absolute top-2 right-2 bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div> AI Detection: 12 Unit
                  </div>
                  <h4 className="text-sm font-semibold mb-3">Preview Hasil Pemetaan Otomatis</h4>
                  
                  {/* Simulasi Gambar yang sudah di-overlay poligon (menggunakan kotak HTML sederhana untuk dummy) */}
                  <div className="w-full h-48 bg-slate-300 rounded relative shadow-inner overflow-hidden flex items-center justify-center">
                     <p className="text-slate-400 opacity-50 absolute z-0 text-xl font-bold italic">Gambar Siteplan Asli</p>
                     
                     <div className="grid grid-cols-4 gap-2 w-full h-full p-2 z-10 relative">
                        {["A1","A2","A3","A4","B1","B2","B3","B4","C1","C2","C3","C4"].map((u, i) => (
                           <div key={u} className="border-2 border-emerald-400 bg-emerald-400/20 rounded flex items-center justify-center relative group cursor-pointer hover:bg-emerald-400/40 transition-colors">
                              <span className="text-xs font-bold text-emerald-900 bg-white/80 px-1 rounded">{u}</span>
                              <div className="hidden group-hover:block absolute -top-2 -right-2 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] text-center leading-4 shadow cursor-pointer">x</div>
                           </div>
                        ))}
                     </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2 italic">
                    * AI mendeteksi 12 blok kaveling. Anda dapat mengklik tanda silang (x) untuk menghapus deteksi yang salah, atau menyeret (drag) kotak untuk menyesuaikan posisinya.
                  </p>
                </div>

                <div className="flex justify-end pt-4 gap-2">
                  <Button variant="outline" onClick={() => setAddStep(1)}>Kembali</Button>
                  <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => {
                    setIsAddPropertyOpen(false);
                    setAddStep(1);
                  }}>
                    Simpan Properti
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
