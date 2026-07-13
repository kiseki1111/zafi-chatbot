import { useState, useRef } from "react";
import { useGoogleLogin } from "@react-oauth/google";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { 
  Sparkles, TrendingUp, Search, ImageIcon, Wand2, CalendarPlus, 
  Clock, CheckCircle, AlertCircle, Megaphone, BarChart3, Target, 
  Play, Pause, LayoutTemplate, Upload, Copy, Plus, Send, Paperclip, 
  Bot, User, Pin, FileText, MessageSquare, ExternalLink, Folder,
  Video, Music, Smartphone, Loader2
} from "lucide-react";
import ReactMarkdown from 'react-markdown';
import { useToast } from "@/hooks/use-toast";

export function SocialPage() {
  const { toast } = useToast();
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  const [chatHistory, setChatHistory] = useState([
    { role: "ai", text: "Halo! Saya asisten AI PropertiKu. Apa yang ingin kita kerjakan hari ini? Anda bisa meminta ide konten, bedah tren, atau *attach* listing properti Anda untuk mulai *brainstorming*." }
  ]);
  
  const [pinnedChats, setPinnedChats] = useState([
    {
      title: "Angle Konten TikTok",
      tagClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
      content: "\"Hitung-hitungan Ngontrak vs Cicil\" - Buka dengan drama \"Bulan ini bayar kontrakan lagi?\". Berikan simulasi cicilan Cluster Graha Hijau yang setara dengan biaya ngontrak (3 jutaan/bulan)."
    },
    {
      title: "Script Instagram Reels",
      tagClass: "bg-blue-50 text-blue-700 border-blue-200",
      content: "\"3 Hal yang Bikin KPR Ditolak\" - Video edukasi singkat untuk Gen-Z. 1. BI Checking jelek (Paylater). 2. Masa kerja belum 1 tahun. 3. Angsuran lebih dari 30% gaji."
    }
  ]);

  // Image Generator State
  const [imagePrompt, setImagePrompt] = useState("");
  const [imageStyle, setImageStyle] = useState("Realistis");
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  // Modal Upload State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [customFileName, setCustomFileName] = useState("");
  const [selectedFileForUpload, setSelectedFileForUpload] = useState<File | null>(null);
  const [driveToken, setDriveToken] = useState<string | null>(null);

  const [uploadedFiles, setUploadedFiles] = useState([
    { label: "Brosur Tipe 36 Graha Hijau", type: "PDF / PSD", date: "Hari Ini", link: "#" },
    { label: "Promo Merdeka Agustus", type: "JPG / Canva", date: "Kemarin", link: "#" },
    { label: "Flyer Open House Cluster A", type: "PNG", date: "2 Hari Lalu", link: "#" },
    { label: "Logo & Aset Watermark", type: "PNG / SVG", date: "Minggu Lalu", link: "#" },
    { label: "Desain Spanduk Fisik", type: "CDR", date: "Bulan Lalu", link: "#" },
    { label: "Template Pricelist 2026", type: "XLSX / PDF", date: "Bulan Lalu", link: "#" },
  ]);

  const handlePinChat = (text: string) => {
    // Generate simple title from first few words
    const preview = text.replace(/[^\w\s]/gi, '').split(' ').slice(0, 4).join(' ');
    setPinnedChats(prev => [{
      title: "Ide AI: " + preview + "...",
      tagClass: "bg-amber-50 text-amber-700 border-amber-200",
      content: text
    }, ...prev]);
    toast({ title: "Tersimpan", description: "Respon AI berhasil dipin ke koleksi." });
  };

  const performUpload = async (token: string) => {
    if (!selectedFileForUpload) return;
    setIsUploading(true);
    try {
      const finalName = customFileName.trim() || selectedFileForUpload.name;
      const metadata = { name: finalName, mimeType: selectedFileForUpload.type };
      const formData = new FormData();
      formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      formData.append('file', selectedFileForUpload);

      const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      
      toast({ title: "Tersimpan ke GDrive", description: "File desain berhasil diunggah ke Google Drive Anda." });
      
      setUploadedFiles(prev => [{
        label: finalName,
        type: selectedFileForUpload.type.split('/')[1]?.toUpperCase() || 'FILE',
        date: 'Baru saja',
        link: data.webViewLink
      }, ...prev]);

      setIsUploadModalOpen(false);
      setCustomFileName("");
      setSelectedFileForUpload(null);
    } catch (err) {
      toast({ title: "Gagal Mengunggah", description: "Terjadi kesalahan jaringan atau izin saat mengunggah.", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const driveLogin = useGoogleLogin({
    scope: 'https://www.googleapis.com/auth/drive.file',
    onSuccess: (tokenResponse) => {
      setDriveToken(tokenResponse.access_token);
      performUpload(tokenResponse.access_token);
    },
    onError: () => {
      toast({ title: "Batal", description: "Akses Google Drive dibatalkan.", variant: "destructive" });
    }
  });

  const handleUploadSubmit = () => {
    if (!selectedFileForUpload) {
      toast({ title: "Pilih File", description: "Silakan pilih file terlebih dahulu.", variant: "destructive" });
      return;
    }
    if (driveToken) {
      performUpload(driveToken);
    } else {
      driveLogin();
    }
  };

  const handleGenerate = async () => {
    if (!aiPrompt.trim() || isGenerating || isTyping) return;

    const userMessage = { role: "user", text: aiPrompt };
    setChatHistory((prev) => [...prev, userMessage]);
    setAiPrompt("");
    setIsGenerating(true);
    setTimeout(() => {
      if (chatEndRef.current && chatEndRef.current.parentElement) {
        chatEndRef.current.parentElement.scrollTop = chatEndRef.current.parentElement.scrollHeight;
      }
    }, 100);

    try {
      const res = await fetch('http://localhost:3000/ai/brainstorm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userMessage.text })
      });
      
      if (!res.ok) throw new Error('Gagal menghubungi AI Server');
      
      const data = await res.json();
      const fullText = data.data?.result || "Maaf, AI tidak memberikan respons.";

      setIsGenerating(false);
      setIsTyping(true);
      
      setChatHistory((prev) => [...prev, { role: "ai", text: "" }]);
      
      const words = fullText.split(" ");
      let i = 0;
      let currentText = "";

      const typeWriter = setInterval(() => {
        if (i < words.length) {
          currentText += (i === 0 ? "" : " ") + words[i];
          setChatHistory((prev) => {
            const newHistory = [...prev];
            newHistory[newHistory.length - 1].text = currentText;
            return newHistory;
          });
          i++;
          // Scroll the specific container instead of the whole page
          if (chatEndRef.current && chatEndRef.current.parentElement) {
            chatEndRef.current.parentElement.scrollTop = chatEndRef.current.parentElement.scrollHeight;
          }
        } else {
          clearInterval(typeWriter);
          setIsTyping(false);
        }
      }, 50); // Speed of typing per word

    } catch (err) {
      toast({ title: "AI Error", description: "Terjadi kesalahan saat memproses permintaan AI.", variant: "destructive" });
      setIsGenerating(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!imagePrompt.trim()) return;
    setIsGeneratingImage(true);
    setGeneratedImage(null);
    try {
      const res = await fetch('http://localhost:3000/ai/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: imagePrompt, style: imageStyle })
      });
      if (!res.ok) throw new Error('Failed to generate image');
      const data = await res.json();
      setGeneratedImage(data.data?.imageUrl || data.imageUrl);
      toast({ title: "Gambar Berhasil Dibuat", description: "Gambar AI Anda siap!" });
    } catch (err) {
      toast({ title: "Error", description: "Gagal membuat gambar.", variant: "destructive" });
    } finally {
      setIsGeneratingImage(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Kreatif</h1>
        <p className="text-muted-foreground">Riset konten, AI desain, dan kelola ide kreatif.</p>
      </div>

      <Tabs defaultValue="ide" className="w-full">
        <TabsList className="grid grid-cols-2 w-full md:w-[300px] mb-4 md:mb-0 h-auto md:h-10">
          <TabsTrigger value="ide" className="py-2">Riset Ide</TabsTrigger>
          <TabsTrigger value="desain" className="py-2">Graphic Design</TabsTrigger>
        </TabsList>

        {/* TAB 1: RISET IDE */}
        <TabsContent value="ide" className="mt-4 space-y-4">
          <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 lg:h-[650px]">
            {/* Left: Chat Area */}
            <Card className="lg:col-span-2 flex flex-col h-[500px] lg:h-full overflow-hidden">
              <CardHeader className="py-3 px-4 border-b bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wand2 className="h-4 w-4 text-emerald-600" />
                    <CardTitle className="text-sm font-semibold">Brainstorm AI</CardTitle>
                  </div>
                  <Badge variant="outline" className="text-[10px]">Model: GPT-4o-Properti</Badge>
                </div>
              </CardHeader>
              <CardContent className="flex-1 p-0 flex flex-col overflow-hidden">
                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {chatHistory.map((chat, index) => (
                    <div key={index} className={`flex gap-3 ${chat.role === "user" ? "flex-row-reverse" : ""}`}>
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${chat.role === "user" ? "bg-blue-100" : "bg-emerald-100"}`}>
                        {chat.role === "user" ? <User className="h-4 w-4 text-blue-700" /> : <Bot className="h-4 w-4 text-emerald-700" />}
                      </div>
                      <div className={`p-3 rounded-lg text-sm max-w-[85%] ${chat.role === "user" ? "bg-emerald-600 text-white rounded-tr-none whitespace-pre-wrap" : "bg-muted/50 rounded-tl-none prose prose-sm dark:prose-invert max-w-none"} relative group`}>
                        {chat.role === "ai" && !isTyping && index > 0 && (
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 text-muted-foreground hover:text-emerald-600 bg-background/50 hover:bg-background/80" 
                            onClick={() => handlePinChat(chat.text)} 
                            title="Pin Ide Ini"
                          >
                            <Pin className="h-3 w-3" />
                          </Button>
                        )}
                        {chat.role === "ai" ? (
                          <ReactMarkdown>{chat.text}</ReactMarkdown>
                        ) : (
                          chat.text
                        )}
                      </div>
                    </div>
                  ))}
                  {isGenerating && (
                    <div className="flex gap-3">
                      <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                        <Bot className="h-4 w-4 text-emerald-700 animate-pulse" />
                      </div>
                      <div className="bg-muted/50 p-3 rounded-lg text-sm rounded-tl-none max-w-[85%] flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-emerald-600" /> Sedang memproses...
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
                {/* Chat Input */}
                <div className="p-3 bg-background border-t">
                  <div className="flex items-end gap-2 p-2 border rounded-xl bg-muted/20 focus-within:ring-1 focus-within:ring-emerald-500">
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground shrink-0 rounded-full" title="Attach Konteks Properti / Data">
                      <Paperclip className="h-4 w-4" />
                    </Button>
                    <Textarea 
                      placeholder="Ketik prompt atau request Anda di sini..."
                      className="min-h-[40px] max-h-[120px] bg-transparent border-0 focus-visible:ring-0 resize-none p-2 text-sm shadow-none"
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleGenerate();
                        }
                      }}
                    />
                    <Button 
                      size="icon" 
                      className="h-8 w-8 bg-emerald-600 hover:bg-emerald-700 shrink-0 rounded-full"
                      onClick={handleGenerate}
                      disabled={isGenerating || isTyping || !aiPrompt.trim()}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Right: Koleksi Chat & Scratchpad */}
            <div className="flex flex-col gap-4 h-[500px] lg:h-full overflow-hidden">
              <Card className="flex-1 flex flex-col overflow-hidden min-h-0">
                <CardHeader className="py-3 px-4 border-b bg-emerald-50/50 dark:bg-emerald-950/20">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <LayoutTemplate className="h-4 w-4 text-emerald-600" />
                      Koleksi Chat & Ide
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 p-3 overflow-y-auto bg-muted/10 space-y-3">
                  {pinnedChats.map((pinned, i) => (
                    <div key={i} className="p-3 bg-background border rounded-lg shadow-sm group hover:border-emerald-300 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <Badge variant="outline" className={`text-[10px] ${pinned.tagClass}`}>{pinned.title}</Badge>
                        <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => setPinnedChats(prev => prev.filter((_, idx) => idx !== i))}>
                          <Pin className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-3 leading-relaxed">
                        {pinned.content}
                      </p>
                      <div className="mt-3 flex gap-2">
                        <Button size="sm" variant="outline" className="h-7 text-xs w-full" onClick={() => setAiPrompt(pinned.content)}>
                          <MessageSquare className="h-3 w-3 mr-1.5" /> Bawa ke Chat
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  {pinnedChats.length === 0 && (
                    <div className="p-3 border-2 border-dashed rounded-lg text-center text-muted-foreground flex flex-col items-center justify-center py-6">
                      <Pin className="h-5 w-5 mb-2 opacity-50" />
                      <p className="text-xs px-2">Pin respon chat terbaik dari AI agar tersimpan selamanya di sini.</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Trending Keywords Mini */}
              <Card className="shrink-0">
                <CardHeader className="py-3 px-4 border-b">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-blue-600" />
                      Tren Pencarian (Google)
                    </CardTitle>
                    <Badge variant="outline" className="text-[9px] bg-blue-50 text-blue-700 border-blue-200">Hari Ini</Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="flex flex-col divide-y">
                    {[
                      { keyword: "Syarat KPR Subsidi", vol: "12.5K", trend: "up" },
                      { keyword: "Rumah Bekasi 300 Juta", vol: "8.2K", trend: "up" },
                      { keyword: "Bunga KPR BCA 2026", vol: "5.4K", trend: "flat" },
                      { keyword: "Desain Dapur Minimalis", vol: "3.1K", trend: "up" },
                    ].map((item, i) => (
                      <div key={i} className="flex justify-between items-center p-3 hover:bg-muted/50 transition-colors cursor-pointer group">
                        <div className="flex items-center gap-2">
                          <Search className="h-3 w-3 text-muted-foreground group-hover:text-emerald-600 transition-colors" />
                          <span className="text-xs font-medium">{item.keyword}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground">{item.vol} / bln</span>
                          {item.trend === "up" ? (
                            <TrendingUp className="h-3 w-3 text-emerald-500" />
                          ) : (
                            <div className="h-0.5 w-3 bg-slate-300 rounded-full" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Bank Inspirasi Video (Swipe File) */}
          <div className="pt-4 border-t mt-8">
            <div className="flex justify-between items-end mb-4">
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Play className="h-5 w-5 text-rose-500 fill-rose-500" />
                  Bank Inspirasi Video (Hasil Scraping)
                </h2>
                <p className="text-sm text-muted-foreground">Kumpulan video properti viral untuk referensi *hook* dan *angle* konten.</p>
              </div>
              <Button variant="outline" size="sm">Lihat Semua Data</Button>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { 
                  title: "Rumah 300 Juta Rasa 1 Miliar di Bekasi", 
                  views: "1.2M", 
                  platform: "TikTok", 
                  author: "@reviewrumah.id", 
                  link: "https://tiktok.com/@reviewrumah.id/video/123",
                  hook: "Kalian percaya nggak, rumah secakep ini cicilannya cuma 2 jutaan?",
                  summary: "Video home tour cepat yang menonjolkan fasad mewah dan interior compact. Fokus pada cicilan murah.",
                  tags: ["Home Tour", "Rumah Murah"]
                },
                { 
                  title: "3 Alasan KPR Kamu Selalu Ditolak Bank", 
                  views: "850K", 
                  platform: "Instagram Reels", 
                  author: "@kpr.mudah", 
                  link: "https://instagram.com/p/123",
                  hook: "Stop apply KPR kalau kamu masih lakuin 3 hal ini!",
                  summary: "Video edukatif *talking head*. Membahas BI checking, masa kerja, dan rasio utang.",
                  tags: ["Edukasi", "Tips KPR"]
                },
                { 
                  title: "POV: Pertama Kali Serah Terima Kunci", 
                  views: "2.1M", 
                  platform: "TikTok", 
                  author: "@propertisultan", 
                  link: "https://tiktok.com/@propertisultan/video/456",
                  hook: "(Visual emosional menangis bahagia saat buka pintu)",
                  summary: "Konten emosional *storytelling* tanpa narasi suara, hanya musik viral yang menyentuh.",
                  tags: ["Storytelling", "Testimoni"]
                },
                { 
                  title: "Mitos vs Fakta Beli Rumah Subsidi", 
                  views: "500K", 
                  platform: "TikTok", 
                  author: "@agenjujur", 
                  link: "https://tiktok.com/@agenjujur/video/789",
                  hook: "Katanya rumah subsidi gampang rusak? Yuk kita bedah materialnya.",
                  summary: "Video *debunking* mitos dengan menunjukkan kualitas material bangunan secara langsung.",
                  tags: ["Review Material", "Subsidi"]
                },
              ].map((vid, i) => (
                <Card 
                  key={i} 
                  className="overflow-hidden cursor-pointer hover:border-emerald-500 transition-all hover:shadow-md group"
                  onClick={() => setSelectedVideo(vid)}
                >
                  <div className="h-36 bg-slate-200 dark:bg-slate-800 relative flex items-center justify-center">
                    <Play className="h-10 w-10 text-white opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-all drop-shadow-md" />
                    <Badge className="absolute bottom-2 right-2 text-[10px] bg-black/70 hover:bg-black/70 text-white border-0">{vid.views} Views</Badge>
                  </div>
                  <CardContent className="p-3">
                    <p className="font-semibold text-sm line-clamp-2 leading-tight">{vid.title}</p>
                    <div className="flex justify-between items-center mt-3">
                      <span className="text-xs text-muted-foreground truncate pr-2">{vid.author}</span>
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted shrink-0">{vid.platform}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* TAB 2: GRAPHIC DESIGN */}
        <TabsContent value="desain" className="mt-4 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
              <h2 className="text-lg font-semibold">Penyimpanan Desain Grafis</h2>
              <p className="text-sm text-muted-foreground">Arsip desain yang pernah digunakan, terintegrasi dengan Google Drive.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Folder className="h-4 w-4 mr-2" /> Buka Root Folder
              </Button>
              <Button 
                size="sm" 
                className="bg-blue-600 hover:bg-blue-700 text-white transition-all"
                onClick={() => setIsUploadModalOpen(true)}
              >
                <Upload className="h-4 w-4 mr-2" /> Upload ke Drive
              </Button>
            </div>
          </div>
          
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            {uploadedFiles.map((item, i) => (
              <Card key={i} className="hover:shadow-md transition-shadow cursor-pointer group flex flex-col">
                <div className="h-28 bg-slate-100 dark:bg-slate-800 flex items-center justify-center border-b relative overflow-hidden">
                  <ImageIcon className="h-8 w-8 text-slate-300 dark:text-slate-600 group-hover:scale-110 transition-transform" />
                  {item.date === "Baru saja" && (
                    <Badge className="absolute top-2 right-2 text-[9px] bg-emerald-500 hover:bg-emerald-600">NEW</Badge>
                  )}
                </div>
                <CardContent className="p-3 flex flex-col flex-1">
                  <p className="font-semibold text-sm line-clamp-1" title={item.label}>{item.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{item.type} • {item.date}</p>
                  <div className="mt-auto pt-3">
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      className="w-full text-xs h-7 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300"
                      onClick={() => {
                         if (item.link !== "#") {
                           window.open(item.link, "_blank");
                         } else {
                           toast({ title: "Demo", description: "Ini hanya file mockup demo." });
                         }
                      }}
                    >
                      <ExternalLink className="h-3 w-3 mr-1.5" /> {item.link !== "#" ? "Buka di GDrive" : "GDrive (Demo)"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border-emerald-200 dark:border-emerald-800 overflow-hidden mt-6 shadow-sm">
            <div className="flex flex-col md:flex-row">
              <div className="w-full md:w-1/2 p-5 bg-emerald-50/30 dark:bg-emerald-950/20 border-r border-emerald-100 dark:border-emerald-900">
                <h3 className="font-semibold text-base flex items-center gap-2 mb-1.5">
                  <Sparkles className="h-4 w-4 text-emerald-600" />
                  AI Image Generator
                </h3>
                <p className="text-sm text-muted-foreground mb-4">Butuh aset ilustrasi atau foto spesifik? Ketik prompt, AI akan membuatnya untuk Anda.</p>
                
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Deskripsi Gambar (Prompt)</label>
                    <Textarea 
                      placeholder="Contoh: Keluarga bahagia berdiri di depan rumah minimalis 2 lantai bergaya skandinavia, cuaca cerah..."
                      className="min-h-[100px] resize-none bg-background focus-visible:ring-emerald-500"
                      value={imagePrompt}
                      onChange={(e) => setImagePrompt(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Style & Ukuran</label>
                    <div className="flex flex-wrap gap-2">
                      <Badge 
                        variant={imageStyle === "Realistis" ? "secondary" : "outline"}
                        className={`px-3 py-1 cursor-pointer text-xs font-medium ${imageStyle === "Realistis" ? "bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border-transparent" : "hover:bg-muted border-dashed"}`}
                        onClick={() => setImageStyle("Realistis")}
                      >
                        Realistis
                      </Badge>
                      <Badge 
                        variant={imageStyle === "Ilustrasi 3D" ? "secondary" : "outline"}
                        className={`px-3 py-1 cursor-pointer text-xs font-medium ${imageStyle === "Ilustrasi 3D" ? "bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border-transparent" : "hover:bg-muted border-dashed"}`}
                        onClick={() => setImageStyle("Ilustrasi 3D")}
                      >
                        Ilustrasi 3D
                      </Badge>
                      <Badge 
                        variant={imageStyle === "Sketsa" ? "secondary" : "outline"}
                        className={`px-3 py-1 cursor-pointer text-xs font-medium ${imageStyle === "Sketsa" ? "bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border-transparent" : "hover:bg-muted border-dashed"}`}
                        onClick={() => setImageStyle("Sketsa")}
                      >
                        Sketsa
                      </Badge>
                      <div className="w-[1px] h-6 bg-border mx-1" />
                      <Badge variant="secondary" className="px-3 py-1 cursor-pointer bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border-transparent text-xs font-medium">1:1 (Post)</Badge>
                    </div>
                  </div>
                  
                  <Button 
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white mt-2 shadow-sm"
                    onClick={handleGenerateImage}
                    disabled={!imagePrompt.trim() || isGeneratingImage}
                  >
                    {isGeneratingImage ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Membuat Gambar...</> : <><Wand2 className="h-4 w-4 mr-2" /> Buat Gambar Sekarang</>}
                  </Button>
                </div>
              </div>
              
              <div className="w-full md:w-1/2 bg-slate-50 dark:bg-slate-900/50 p-6 flex flex-col items-center justify-center min-h-[300px]">
                {/* Empty State / Preview Area */}
                {isGeneratingImage ? (
                  <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl w-full h-full flex flex-col items-center justify-center p-6 text-center bg-white dark:bg-slate-950">
                    <Loader2 className="h-10 w-10 mb-3 animate-spin text-emerald-600" />
                    <p className="font-medium text-sm text-slate-600 dark:text-slate-400">Sedang memproses...</p>
                    <p className="text-xs mt-1 text-muted-foreground">AI Gemini sedang menyusun prompt, merender gambar...</p>
                  </div>
                ) : generatedImage ? (
                  <div className="w-full h-full relative group">
                    <img src={generatedImage} alt="AI Generated" className="w-full h-full object-cover rounded-xl shadow-sm border" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 rounded-xl">
                      <Button variant="secondary" size="sm" onClick={() => window.open(generatedImage, '_blank')}><ExternalLink className="h-4 w-4 mr-2" /> Buka Penuh</Button>
                      <Button variant="secondary" size="sm" onClick={() => toast({ title: "Fitur Demo", description: "Untuk menyimpan ke GDrive silahkan hubungkan akun." })}><Upload className="h-4 w-4 mr-2" /> GDrive</Button>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl w-full h-full flex flex-col items-center justify-center p-6 text-center text-muted-foreground bg-white dark:bg-slate-950">
                    <ImageIcon className="h-10 w-10 mb-3 opacity-20" />
                    <p className="font-medium text-sm text-slate-600 dark:text-slate-400">Area Preview</p>
                    <p className="text-xs mt-1 max-w-[250px]">Hasil gambar AI akan muncul di sini dan otomatis tersimpan ke GDrive Anda.</p>
                  </div>
                )}
              </div>
            </div>
          </Card>

          <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 mt-4">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-1">
                <p className="font-semibold text-sm text-blue-900 dark:text-blue-300 flex items-center gap-2">
                  <Folder className="h-4 w-4" />
                  Kapasitas Google Drive Anda
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-400">12.4 GB terpakai dari 15 GB. Sinkronisasi otomatis berjalan setiap kali ada aset baru.</p>
              </div>
              <Button variant="outline" size="sm" className="border-blue-600 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/40 shrink-0 ml-4">
                Kelola Storage
              </Button>
            </CardContent>
          </Card>
        </TabsContent>


      </Tabs>

      {/* Modal Detail Video */}
      {selectedVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setSelectedVideo(null)}>
          <Card className="w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex flex-col md:flex-row h-full">
              {/* Dummy Video Player */}
              <div className="w-full md:w-2/5 bg-black h-48 md:h-[400px] flex items-center justify-center relative">
                <Play className="h-12 w-12 text-white/80" />
                <Badge className="absolute top-4 left-4 bg-black/50 text-white border-white/20">
                  {selectedVideo.platform}
                </Badge>
              </div>
              
              {/* Detail Info */}
              <div className="w-full md:w-3/5 p-6 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-lg leading-tight">{selectedVideo.title}</h3>
                    <p className="text-sm text-emerald-600 font-medium mt-1">{selectedVideo.author} • {selectedVideo.views} Views</p>
                  </div>
                </div>

                <div className="space-y-4 flex-1">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Hook (Kalimat Pancingan)</p>
                    <div className="p-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-md">
                      <p className="text-sm italic font-medium text-amber-900 dark:text-amber-200">"{selectedVideo.hook}"</p>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Hasil Analisa AI (Summary)</p>
                    <p className="text-sm leading-relaxed">{selectedVideo.summary}</p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Kategori / Tags</p>
                    <div className="flex gap-1.5">
                      {selectedVideo.tags.map((tag: string) => (
                        <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t flex items-center gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => window.open(selectedVideo.link, "_blank")}>
                    Buka Link Asli
                  </Button>
                  <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => {
                    // Logic to send to chat
                    setSelectedVideo(null);
                  }}>
                    Eksplor Ide di Chat
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Modal Upload Google Drive */}
      <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Upload ke Google Drive</DialogTitle>
            <DialogDescription>
              File akan diunggah ke folder "Aset Sosial Media" di Google Drive Anda.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Pilih File</Label>
              <Input 
                type="file" 
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setSelectedFileForUpload(file);
                    // Set default name to original filename without extension
                    if (!customFileName) {
                      const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
                      setCustomFileName(nameWithoutExt);
                    }
                  }
                }} 
              />
            </div>
            <div className="space-y-2">
              <Label>Nama File / Judul Desain</Label>
              <Input 
                placeholder="Contoh: Brosur Promo Agustus" 
                value={customFileName}
                onChange={(e) => setCustomFileName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUploadModalOpen(false)} disabled={isUploading}>
              Batal
            </Button>
            <Button onClick={handleUploadSubmit} disabled={isUploading || !selectedFileForUpload} className="bg-blue-600 hover:bg-blue-700">
              {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isUploading ? "Mengunggah..." : "Simpan & Unggah"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
