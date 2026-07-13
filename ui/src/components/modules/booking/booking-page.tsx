import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, MoreHorizontal, FileText, CheckCircle2, Clock, Wallet } from "lucide-react";

export function BookingPage() {
  const bookings = [
    {
      id: "BK-001",
      name: "Budi Santoso",
      phone: "0812-3456-7890",
      project: "Perumahan 1",
      unit: "A-12",
      date: "02 Jun 2026",
      totalDp: 50,
      paidDp: 20,
      pic: "Rina",
      status: "partial",
    },
    {
      id: "BK-002",
      name: "Siti Aminah",
      phone: "0813-5555-1212",
      project: "Perumahan 1",
      unit: "B-04",
      date: "05 Jun 2026",
      totalDp: 75,
      paidDp: 75,
      pic: "Dimas",
      status: "completed",
    },
    {
      id: "BK-003",
      name: "Agus Pratama",
      phone: "0852-7788-9900",
      project: "Perumahan 2",
      unit: "C-09",
      date: "10 Jun 2026",
      totalDp: 60,
      paidDp: 15,
      pic: "Rina",
      status: "partial",
    },
    {
      id: "BK-004",
      name: "Dewi Lestari",
      phone: "0811-2222-3333",
      project: "Apartemen X",
      unit: "12-A",
      date: "12 Jun 2026",
      totalDp: 100,
      paidDp: 0,
      pic: "Dimas",
      status: "pending",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Data Booking</h1>
          <p className="text-muted-foreground text-sm">Kelola transaksi booking, riwayat pembayaran DP, dan penjadwalan akad.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="bg-background">
            <FileText className="mr-2 h-4 w-4 text-emerald-600" /> Export CSV
          </Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
            + Booking Baru
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-5 border-l-4 border-l-blue-500 shadow-sm transition-all hover:shadow-md">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Booking</p>
              <p className="text-3xl font-bold mt-2 font-display">19</p>
            </div>
            <div className="p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
              <FileText className="h-5 w-5 text-blue-500" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
            <span className="text-emerald-500 font-medium">+3</span> dari bulan lalu
          </p>
        </Card>
        
        <Card className="p-5 border-l-4 border-l-emerald-500 shadow-sm transition-all hover:shadow-md">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">DP Masuk</p>
              <p className="text-3xl font-bold mt-2 font-display text-emerald-600 dark:text-emerald-400">Rp 412<span className="text-lg">jt</span></p>
            </div>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg">
              <Wallet className="h-5 w-5 text-emerald-500" />
            </div>
          </div>
          <div className="w-full bg-emerald-100 dark:bg-emerald-950 rounded-full h-1.5 mt-4">
            <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: '65%' }}></div>
          </div>
        </Card>

        <Card className="p-5 border-l-4 border-l-rose-500 shadow-sm transition-all hover:shadow-md">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Sisa Tagihan DP</p>
              <p className="text-3xl font-bold mt-2 font-display text-rose-600 dark:text-rose-400">Rp 320<span className="text-lg">jt</span></p>
            </div>
            <div className="p-2 bg-rose-50 dark:bg-rose-950/30 rounded-lg">
              <Clock className="h-5 w-5 text-rose-500" />
            </div>
          </div>
          <p className="text-xs text-rose-500 mt-3 font-medium">
            4 transaksi melewati jatuh tempo
          </p>
        </Card>

        <Card className="p-5 border-l-4 border-l-purple-500 shadow-sm transition-all hover:shadow-md">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Akad Selesai</p>
              <p className="text-3xl font-bold mt-2 font-display text-purple-600 dark:text-purple-400">8</p>
            </div>
            <div className="p-2 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-purple-500" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Target bulan ini: 15 akad
          </p>
        </Card>
      </div>

      {/* Main Table */}
      <Card className="shadow-sm overflow-hidden">
        <div className="p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/20">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Cari nama, No. WA, atau Unit..." className="pl-9 h-9 bg-background" />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-9 bg-background">Semua Status</Button>
            <Button variant="outline" size="sm" className="h-9 bg-background">Proyek</Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="w-[250px]">Konsumen & Kontak</TableHead>
                <TableHead>Proyek / Unit</TableHead>
                <TableHead>Tgl Booking</TableHead>
                <TableHead className="min-w-[200px]">Progress Pembayaran DP</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>PIC</TableHead>
                <TableHead className="text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.map((b) => {
                const progress = Math.round((b.paidDp / b.totalDp) * 100);
                
                return (
                  <TableRow key={b.id} className="group hover:bg-muted/30 transition-colors">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{b.name}</span>
                        <span className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                          {b.phone}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">{b.project}</span>
                        <Badge variant="secondary" className="w-fit mt-1 text-[10px] bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          Unit: {b.unit}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {b.date}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1.5 w-full max-w-[180px]">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium">Rp {b.paidDp} jt</span>
                          <span className="text-muted-foreground">/ Rp {b.totalDp} jt</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5">
                          <div 
                            className={`h-1.5 rounded-full ${progress === 100 ? 'bg-emerald-500' : progress === 0 ? 'bg-slate-300' : 'bg-amber-500'}`} 
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {b.status === "completed" && (
                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 border-emerald-200">
                          Lunas
                        </Badge>
                      )}
                      {b.status === "partial" && (
                        <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-950/50 dark:text-amber-400 border-amber-200">
                          Sebagian
                        </Badge>
                      )}
                      {b.status === "pending" && (
                        <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-950/50 dark:text-rose-400 border-rose-200">
                          Belum Bayar
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300 flex items-center justify-center text-[10px] font-bold">
                          {b.pic.substring(0,2).toUpperCase()}
                        </div>
                        <span className="text-sm">{b.pic}</span>
                      </div>
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
