"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Store, Bot, Send, ArrowRight, CheckCircle2, QrCode, MessageCircle } from "lucide-react";
import { useAppStore } from "@/lib/app-store";
import { useAuthStore } from "@/lib/auth-store";

export function OnboardingPage() {
  const { setView } = useAppStore();
  const { updateUser } = useAuthStore();
  const { user } = useAuthStore();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [waCsQR, setWaCsQR] = useState<string | null>(null);
  const [waAstQR, setWaAstQR] = useState<string | null>(null);
  const [generatingCsQR, setGeneratingCsQR] = useState(false);
  const [generatingAstQR, setGeneratingAstQR] = useState(false);

  const generateQR = async (type: 'cs' | 'ast') => {
    const isCs = type === 'cs';
    
    if (isCs) setGeneratingCsQR(true);
    else setGeneratingAstQR(true);
    
    // Simulasi loading 2 detik sebelum menampilkan QR Dummy
    setTimeout(() => {
      const dummyUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=Dummy_QR_${type}_${Date.now()}`;
      if (isCs) setWaCsQR(dummyUrl);
      else setWaAstQR(dummyUrl);
      
      if (isCs) setGeneratingCsQR(false);
      else setGeneratingAstQR(false);
    }, 2000);
  };
  
  const [form, setForm] = useState({
    storeName: "",
    category: "",
    phone: "",
    address: "",
    agentName: "Dina",
    agentTone: "Santai & Ramah (Kak, Sis, Bro)",
    instructions: "",
    botToken: ""
  });

  const updateForm = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [key]: e.target.value });
  };

  const handleNext = () => setStep(step + 1);
  const handleComplete = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/tenant/${user?.id || 'demo'}/onboarding`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        const data = await res.json();
        // The API might wrap it in { data: tenant } or return the tenant directly
        const realTenantId = data?.data?.id || data?.id || user?.tenantId;
        updateUser({ tenantId: realTenantId });
        setView("overview");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-10 space-y-6">
      <div className="text-center space-y-2 mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Selamat Datang di Chatbot Manager</h1>
        <p className="text-muted-foreground">Mari siapkan profil toko dan asisten pintar Anda dalam 3 langkah mudah.</p>
      </div>

      <div className="flex justify-between mb-8 relative before:absolute before:inset-0 before:top-1/2 before:-translate-y-1/2 before:h-0.5 before:bg-muted before:-z-10">
        {[1, 2, 3].map((num) => (
          <div key={num} className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step >= num ? 'bg-emerald-600 text-white ring-4 ring-background' : 'bg-muted text-muted-foreground ring-4 ring-background'}`}>
            {step > num ? <CheckCircle2 className="w-5 h-5" /> : num}
          </div>
        ))}
      </div>

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Store className="w-5 h-5 text-emerald-600" /> Informasi Toko</CardTitle>
            <CardDescription>Beritahu AI tentang bisnis Anda.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nama Toko</Label>
              <Input placeholder="Contoh: Toko Baju Berkah" value={form.storeName} onChange={updateForm('storeName')} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Kategori Bisnis</Label>
                <Input placeholder="Pakaian, Makanan & Minuman, Jasa..." value={form.category} onChange={updateForm('category')} />
              </div>
              <div className="space-y-1.5">
                <Label>Nomor WhatsApp Bisnis / ID Telegram</Label>
                <Input placeholder="0812... atau @username" value={form.phone} onChange={updateForm('phone')} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Alamat Singkat</Label>
              <Textarea placeholder="Alamat toko atau 'Hanya Online'" value={form.address} onChange={updateForm('address')} />
            </div>
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button onClick={handleNext} className="bg-emerald-600 hover:bg-emerald-700">Lanjut <ArrowRight className="w-4 h-4 ml-2" /></Button>
          </CardFooter>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Bot className="w-5 h-5 text-indigo-600" /> Karakter Asisten Pintar</CardTitle>
            <CardDescription>Atur bagaimana asisten pintar Anda akan merespons pelanggan.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nama Asisten Toko</Label>
              <Input placeholder="Contoh: Dina (Asisten Toko Berkah)" value={form.agentName} onChange={updateForm('agentName')} />
            </div>
            <div className="space-y-1.5">
              <Label>Gaya Bahasa</Label>
              <select value={form.agentTone} onChange={updateForm('agentTone')} className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                <option value="Santai & Ramah (Kak, Sis, Bro)">Santai & Ramah (Kak, Sis, Bro)</option>
                <option value="Formal & Sopan (Bapak, Ibu)">Formal & Sopan (Bapak, Ibu)</option>
                <option value="Ceria & Penuh Emoji 🤩">Ceria & Penuh Emoji 🤩</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Instruksi Khusus (Opsional)</Label>
              <Textarea placeholder="Contoh: Selalu tawarkan promo gratis ongkir di akhir percakapan." value={form.instructions} onChange={updateForm('instructions')} />
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>Kembali</Button>
            <Button onClick={handleNext} className="bg-indigo-600 hover:bg-indigo-700">Lanjut <ArrowRight className="w-4 h-4 ml-2" /></Button>
          </CardFooter>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><QrCode className="w-5 h-5 text-blue-500" /> Hubungkan Saluran Komunikasi</CardTitle>
            <CardDescription>Hubungkan asisten ke WhatsApp dan Telegram</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col space-y-6 py-6">
            
            {/* WhatsApp Section */}
            <div className="grid grid-cols-2 gap-6">
              {/* QR CS */}
              <div className="border rounded-xl p-5 flex flex-col items-center justify-center text-center space-y-4 bg-slate-50/50">
                <div className="space-y-1">
                  <h3 className="font-semibold text-slate-800">WhatsApp Customer Service</h3>
                  <p className="text-xs text-muted-foreground">Pindai QR ini dengan nomor khusus CS toko Anda.</p>
                </div>
                
                {waCsQR ? (
                  <div className="p-2 bg-white rounded-lg border shadow-sm">
                    <img src={waCsQR} alt="QR WA CS" className="w-40 h-40" />
                  </div>
                ) : (
                  <Button 
                    variant="outline" 
                    className="w-full bg-white" 
                    onClick={() => generateQR('cs')}
                    disabled={generatingCsQR}
                  >
                    {generatingCsQR ? "Memuat QR..." : "Buat Kode QR WA CS"}
                  </Button>
                )}
              </div>

              {/* QR Asisten */}
              <div className="border rounded-xl p-5 flex flex-col items-center justify-center text-center space-y-4 bg-slate-50/50">
                <div className="space-y-1">
                  <h3 className="font-semibold text-slate-800">WhatsApp Asisten Pintar</h3>
                  <p className="text-xs text-muted-foreground">Pindai QR ini dengan nomor khusus Asisten Anda.</p>
                </div>
                
                {waAstQR ? (
                  <div className="p-2 bg-white rounded-lg border shadow-sm">
                    <img src={waAstQR} alt="QR WA Asisten" className="w-40 h-40" />
                  </div>
                ) : (
                  <Button 
                    variant="outline" 
                    className="w-full bg-white" 
                    onClick={() => generateQR('ast')}
                    disabled={generatingAstQR}
                  >
                    {generatingAstQR ? "Memuat QR..." : "Buat Kode QR WA Asisten"}
                  </Button>
                )}
              </div>
            </div>

            {/* Telegram Dev Mode Section */}
            <div className="pt-4 border-t">
              <h3 className="flex items-center gap-2 font-semibold text-slate-800 mb-4">
                <MessageCircle className="w-4 h-4 text-blue-500" /> Telegram (Uji Coba)
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-lg">
                  <p className="text-sm font-medium text-blue-800 mb-1">Customer Service</p>
                  <p className="text-xs text-blue-600 mb-2">Gunakan tautan ini untuk mencoba panel CS:</p>
                  <a 
                    href={`https://t.me/umkmmastercs_bot?start=cs_${form.storeName.toLowerCase().replace(/\\s+/g, '_') || 'demo'}`}
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-blue-700 font-bold hover:underline break-all text-sm"
                  >
                    t.me/umkmmastercs_bot?start=cs_{form.storeName.toLowerCase().replace(/\\s+/g, '_') || 'demo'}
                  </a>
                </div>

                <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-lg">
                  <p className="text-sm font-medium text-indigo-800 mb-1">Asisten Pintar</p>
                  <p className="text-xs text-indigo-600 mb-2">Gunakan tautan ini untuk mencoba Asisten Pintar:</p>
                  <a 
                    href={`https://t.me/master4gent_bot?start=ast_${form.storeName.toLowerCase().replace(/\\s+/g, '_') || 'demo'}`}
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-indigo-700 font-bold hover:underline break-all text-sm"
                  >
                    t.me/master4gent_bot?start=ast_{form.storeName.toLowerCase().replace(/\\s+/g, '_') || 'demo'}
                  </a>
                </div>
              </div>
            </div>

          </CardContent>
          <CardFooter className="flex justify-between bg-muted/30 pt-6">
            <Button variant="outline" onClick={() => setStep(2)}>Kembali</Button>
            <Button onClick={handleComplete} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {loading ? "Menyimpan..." : "Selesai & Buka Halaman Utama"}
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
