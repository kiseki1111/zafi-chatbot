import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CalendarPlus, Smartphone, Video, Clock, Music, CheckCircle, Play, Pause, Megaphone, Target, BarChart3, Plus } from "lucide-react";

export function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Laporan & Autoposting</h1>
        <p className="text-muted-foreground">Analisis penjualan, performa iklan, dan kelola postingan otomatis.</p>
      </div>

      <Tabs defaultValue="analytics" className="w-full">
        <TabsList className="grid grid-cols-3 w-full md:w-[400px] mb-4 md:mb-0 h-auto md:h-10">
          <TabsTrigger value="analytics" className="py-2">Analytics</TabsTrigger>
          <TabsTrigger value="post" className="py-2">Auto Posting</TabsTrigger>
          <TabsTrigger value="ads" className="py-2">Ads</TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="mt-4 space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="p-4">
              <p className="text-sm font-medium text-muted-foreground">Penjualan</p>
              <p className="text-2xl font-bold mt-2">Rp 1,12 M</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm font-medium text-muted-foreground">Unit terjual</p>
              <p className="text-2xl font-bold mt-2">19</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm font-medium text-muted-foreground">Konversi</p>
              <p className="text-2xl font-bold mt-2">22%</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm font-medium text-muted-foreground">Biaya iklan</p>
              <p className="text-2xl font-bold mt-2 text-rose-500">Rp 18 jt</p>
            </Card>
          </div>

          <Card className="p-12 flex items-center justify-center border-dashed">
            <p className="text-sm text-muted-foreground text-center">
              Grafik tren penjualan, sumber leads & ROI iklan tampil di sini.
            </p>
          </Card>
        </TabsContent>

        {/* TAB: AUTO POSTING */}
        <TabsContent value="post" className="mt-4 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Jadwal Auto-Posting (Short Video)</h2>
              <p className="text-sm text-muted-foreground">Fokus untuk distribusi video vertikal ke TikTok & Instagram Reels.</p>
            </div>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <CalendarPlus className="h-4 w-4 mr-2" /> Jadwalkan Video Baru
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-pink-50/50 dark:bg-pink-950/20 border-pink-100 dark:border-pink-900">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500 rounded-lg flex items-center justify-center text-white shadow-sm">
                    <Smartphone className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Instagram Reels</p>
                    <p className="text-xs text-muted-foreground">@properti.ku</p>
                  </div>
                </div>
                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">Tersambung</Badge>
              </CardContent>
            </Card>

            <Card className="bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-black rounded-lg flex items-center justify-center text-white shadow-sm">
                    <Video className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">TikTok</p>
                    <p className="text-xs text-muted-foreground">@propertiku_official</p>
                  </div>
                </div>
                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">Tersambung</Badge>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 flex flex-col justify-center h-full">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Statistik Bulan Ini</p>
                <div className="flex justify-between items-end">
                  <div>
                    <span className="text-2xl font-bold">12</span>
                    <span className="text-sm text-muted-foreground ml-1">Ter-upload</span>
                  </div>
                  <div>
                    <span className="text-2xl font-bold text-amber-500">3</span>
                    <span className="text-sm text-muted-foreground ml-1">Menunggu</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="overflow-hidden">
            <div className="border-b px-4 py-3 bg-muted/30">
              <p className="font-semibold text-sm flex items-center gap-2">
                <Clock className="h-4 w-4 text-emerald-600" /> Antrean Postingan
              </p>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Preview Konten</TableHead>
                    <TableHead>Detail Media</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead>Jadwal Tayang</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    { 
                      text: "Gerebek Rumah Sultan di PIK", 
                      caption: "Siapa sangka rumah ini DP-nya cuma 50 Juta?! 😱 Cek link di bio!",
                      platforms: ["TikTok", "IG Reels"], 
                      time: "Hari ini, 17:30", 
                      status: "Scheduled", 
                      icon: Clock, 
                      color: "text-amber-500",
                      audio: "Trending Audio #1",
                      duration: "0:45"
                    },
                    { 
                      text: "Edukasi: 3 Syarat Lolos KPR", 
                      caption: "Save video ini buat nanti kamu apply KPR ya! 📌 #KPR #TipsRumah",
                      platforms: ["IG Reels"], 
                      time: "Besok, 12:00", 
                      status: "Scheduled", 
                      icon: Clock, 
                      color: "text-amber-500",
                      audio: "Original Audio",
                      duration: "1:15"
                    },
                    { 
                      text: "Home Tour Tipe 36/60", 
                      caption: "Kecil-kecil cabe rawit, sisa lahan di belakang masih luas banget!",
                      platforms: ["TikTok", "IG Reels"], 
                      time: "Kemarin, 19:00", 
                      status: "Published", 
                      icon: CheckCircle, 
                      color: "text-emerald-500",
                      audio: "Viral Song - DJ TikTok",
                      duration: "0:59"
                    },
                  ].map((post, i) => (
                    <TableRow key={i} className="hover:bg-muted/10">
                      <TableCell className="min-w-[250px]">
                        <div className="flex items-start gap-3">
                          <div className="h-16 w-12 bg-slate-200 dark:bg-slate-800 rounded-md flex items-center justify-center shrink-0 relative overflow-hidden border">
                            <Play className="h-4 w-4 text-slate-400 absolute" />
                            <div className="absolute bottom-1 right-1 bg-black/70 px-1 py-0.5 rounded text-[8px] text-white font-medium">
                              {post.duration}
                            </div>
                          </div>
                          <div>
                            <p className="font-semibold text-sm line-clamp-1">{post.text}</p>
                            <p className="text-xs text-muted-foreground line-clamp-1 mt-1">"{post.caption}"</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Music className="h-3 w-3" />
                          <span className="truncate max-w-[120px]">{post.audio}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {post.platforms.map(p => (
                            <Badge key={p} variant="outline" className="text-[10px] bg-background">
                              {p}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm font-medium whitespace-nowrap">{post.time}</TableCell>
                      <TableCell>
                        <div className={`flex items-center gap-1.5 text-sm font-semibold ${post.color}`}>
                          <post.icon className="h-4 w-4" />
                          {post.status}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="h-8 text-xs font-medium">Edit / Cancel</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* TAB: ADS */}
        <TabsContent value="ads" className="mt-4 space-y-4">
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            <Card>
              <CardContent className="p-4 flex flex-col md:flex-row items-start md:items-center gap-4">
                <div className="h-10 w-10 shrink-0 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                  <Megaphone className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs md:text-sm text-muted-foreground">Iklan Aktif</p>
                  <p className="text-xl md:text-2xl font-bold">3</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex flex-col md:flex-row items-start md:items-center gap-4">
                <div className="h-10 w-10 shrink-0 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">
                  <Target className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs md:text-sm text-muted-foreground">Leads Didapat</p>
                  <p className="text-xl md:text-2xl font-bold">142</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex flex-col md:flex-row items-start md:items-center gap-4">
                <div className="h-10 w-10 shrink-0 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-violet-600">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs md:text-sm text-muted-foreground">Jangkauan (Reach)</p>
                  <p className="text-xl md:text-2xl font-bold">48.2k</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex flex-col justify-center gap-1">
                <p className="text-xs md:text-sm text-muted-foreground">Total Biaya (Spend)</p>
                <p className="text-lg md:text-xl font-bold">Rp 3.450.000</p>
                <p className="text-[10px] text-muted-foreground">CPL: Rp 24.295</p>
              </CardContent>
            </Card>
          </div>

          <Card className="overflow-hidden">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 gap-4">
              <div>
                <CardTitle className="text-base">Kampanye Berjalan</CardTitle>
                <CardDescription>Pantau performa Facebook & Instagram Ads</CardDescription>
              </div>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" /> Buat Kampanye
              </Button>
            </CardHeader>
            <CardContent className="p-0 sm:p-6 sm:pt-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama Kampanye</TableHead>
                      <TableHead>Platform</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Leads</TableHead>
                      <TableHead>Biaya / Lead</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[
                      { name: "Promo Bebas Biaya KPR", platform: "Meta (FB/IG)", status: "Active", leads: 45, cpl: "Rp 21.000" },
                      { name: "Lead Gen - Cluster Baru", platform: "Meta (FB/IG)", status: "Active", leads: 82, cpl: "Rp 18.500" },
                      { name: "Retargeting Website", platform: "Google Ads", status: "Paused", leads: 15, cpl: "Rp 45.000" },
                    ].map((ad, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium min-w-[180px]">{ad.name}</TableCell>
                        <TableCell><Badge variant="outline" className="whitespace-nowrap">{ad.platform}</Badge></TableCell>
                        <TableCell>
                          <Badge variant={ad.status === "Active" ? "default" : "secondary"} className={ad.status === "Active" ? "bg-emerald-500 hover:bg-emerald-600" : ""}>
                            {ad.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-semibold">{ad.leads}</TableCell>
                        <TableCell className="text-muted-foreground whitespace-nowrap">{ad.cpl}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" className={ad.status === "Active" ? "text-rose-500" : "text-emerald-500"}>
                            {ad.status === "Active" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
