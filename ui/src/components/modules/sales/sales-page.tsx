import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, MoreHorizontal, TrendingUp, Users, Target, Award } from "lucide-react";

export function SalesPage() {
  const salesTeam = [
    {
      id: "S-01",
      name: "Rina",
      role: "Senior Sales Executive",
      leads: 42,
      closing: 11,
      target: 15,
      value: "Rp 640 jt",
      status: "excellent",
    },
    {
      id: "S-02",
      name: "Dimas",
      role: "Sales Agent",
      leads: 33,
      closing: 8,
      target: 12,
      value: "Rp 480 jt",
      status: "good",
    },
    {
      id: "S-03",
      name: "Joko",
      role: "Junior Sales",
      leads: 56,
      closing: 4,
      target: 10,
      value: "Rp 120 jt",
      status: "needs_improvement",
    },
    {
      id: "S-04",
      name: "Maya",
      role: "Sales Agent",
      leads: 28,
      closing: 9,
      target: 10,
      value: "Rp 550 jt",
      status: "excellent",
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Manajemen Tim Sales</h1>
          <p className="text-muted-foreground text-sm">Pantau performa individu, target closing, dan pencapaian tim sales Anda.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="bg-background">
            <TrendingUp className="mr-2 h-4 w-4 text-blue-600" /> Lihat Laporan
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
            + Tambah Anggota
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-5 border-l-4 border-l-emerald-500 shadow-sm transition-all hover:shadow-md">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Leads Tim</p>
              <p className="text-3xl font-bold mt-2 font-display">159</p>
            </div>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg">
              <Users className="h-5 w-5 text-emerald-500" />
            </div>
          </div>
          <p className="text-xs text-emerald-500 font-medium mt-3 flex items-center gap-1">
            +12% dari minggu lalu
          </p>
        </Card>
        
        <Card className="p-5 border-l-4 border-l-blue-500 shadow-sm transition-all hover:shadow-md">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Closing</p>
              <p className="text-3xl font-bold mt-2 font-display">32</p>
            </div>
            <div className="p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
              <Target className="h-5 w-5 text-blue-500" />
            </div>
          </div>
          <div className="w-full bg-blue-100 dark:bg-blue-950 rounded-full h-1.5 mt-4">
            <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: '68%' }}></div>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 text-right">Target Tim: 47</p>
        </Card>

        <Card className="p-5 border-l-4 border-l-amber-500 shadow-sm transition-all hover:shadow-md">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Nilai Transaksi</p>
              <p className="text-3xl font-bold mt-2 font-display text-amber-600 dark:text-amber-400">1.79<span className="text-lg">M</span></p>
            </div>
            <div className="p-2 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
              <TrendingUp className="h-5 w-5 text-amber-500" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Rata-rata: Rp 55 jt / closing
          </p>
        </Card>

        <Card className="p-5 border-l-4 border-l-purple-500 shadow-sm transition-all hover:shadow-md bg-gradient-to-br from-background to-purple-50/50 dark:to-purple-950/20">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-purple-600 dark:text-purple-400 uppercase tracking-wider flex items-center gap-1">
                <Award className="h-3.5 w-3.5" /> Top Sales
              </p>
              <p className="text-xl font-bold mt-2">Rina</p>
              <p className="text-xs text-muted-foreground mt-1">11 Closing (Rp 640 jt)</p>
            </div>
            <Avatar className="h-12 w-12 border-2 border-purple-200 dark:border-purple-800">
              <AvatarFallback className="bg-purple-100 text-purple-700">RN</AvatarFallback>
            </Avatar>
          </div>
        </Card>
      </div>

      {/* Main Table */}
      <Card className="shadow-sm overflow-hidden">
        <div className="p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/20">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Cari anggota tim..." className="pl-9 h-9 bg-background" />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-9 bg-background">Bulan Ini</Button>
            <Button variant="outline" size="sm" className="h-9 bg-background">Filter Role</Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="w-[280px]">Anggota Tim</TableHead>
                <TableHead className="text-center">Leads Masuk</TableHead>
                <TableHead className="min-w-[200px]">Pencapaian Target Closing</TableHead>
                <TableHead className="text-right">Total Nilai (Rp)</TableHead>
                <TableHead className="text-center">Performa</TableHead>
                <TableHead className="text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {salesTeam.map((s) => {
                const progress = Math.round((s.closing / s.target) * 100);
                const isOver = progress >= 100;
                
                return (
                  <TableRow key={s.id} className="group hover:bg-muted/30 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border shadow-sm">
                          <AvatarFallback className="bg-slate-100 text-slate-700 text-xs font-semibold">
                            {s.name.substring(0,2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="font-semibold text-sm">{s.name}</span>
                          <span className="text-[11px] text-muted-foreground">{s.role}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="inline-flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-lg px-3 py-1">
                        <span className="font-semibold text-sm">{s.leads}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1.5 w-full">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium">{s.closing} <span className="text-muted-foreground font-normal">dari {s.target}</span></span>
                          <span className={isOver ? 'text-emerald-600 font-bold' : 'text-muted-foreground'}>{progress}%</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5">
                          <div 
                            className={`h-1.5 rounded-full ${isOver ? 'bg-emerald-500' : progress > 50 ? 'bg-blue-500' : 'bg-amber-500'}`} 
                            style={{ width: `${Math.min(progress, 100)}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {s.value}
                    </TableCell>
                    <TableCell className="text-center">
                      {s.status === "excellent" && (
                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 border-emerald-200 font-medium">
                          Memuaskan
                        </Badge>
                      )}
                      {s.status === "good" && (
                        <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-950/50 dark:text-blue-400 border-blue-200 font-medium">
                          Bagus
                        </Badge>
                      )}
                      {s.status === "needs_improvement" && (
                        <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-950/50 dark:text-rose-400 border-rose-200 font-medium">
                          Perlu Evaluasi
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
