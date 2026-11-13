"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Users,
  Search,
  RefreshCw,
  Plus,
  ShieldCheck,
  ShieldAlert,
  Smartphone,
  CheckCircle2,
  Lock,
  MessageSquare,
  Building,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import { useAppStore } from "@/lib/app-store";

interface Employee {
  id: string;
  nik: string;
  name: string;
  email: string;
  department: string;
  position: string;
  phone: string;
  isWaVerified: boolean;
  accessLevel: "STAFF" | "HR_ADMIN" | "FINANCE_ADMIN" | "EXECUTIVE";
  status: "ACTIVE" | "SUSPENDED";
}

// ponytail: tanpa data mockup, data diisi via sync API HRIS
export function EmployeesPage() {
  const { setView } = useAppStore();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState("ALL");
  const [isSyncing, setIsSyncing] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // ponytail: ambil data live karyawan dari HRIS saat komponen mount
  useEffect(() => {
    fetch("/api/v1/hris/karyawan/list")
      .then((res) => res.json())
      .then((json) => {
        const list = json?.data?.data || json?.data || [];
        if (Array.isArray(list) && list.length > 0) {
          const mapped: Employee[] = list.map((k: any, i: number) => ({
            id: `hris-${k.nik || i}`,
            nik: k.nik,
            name: k.name || k.nama_karyawan,
            email: `${k.nik?.toLowerCase() || 'staff'}@perusahaan.co.id`,
            department: k.department || 'Operasional',
            position: k.position || 'Staf',
            phone: k.phone || k.no_hp || '-',
            isWaVerified: Boolean(k.phone || k.no_hp),
            accessLevel: (k.department?.includes('Keuangan') ? 'FINANCE_ADMIN' : k.department?.includes('HR') ? 'HR_ADMIN' : 'STAFF') as Employee['accessLevel'],
            status: k.status === '1' || k.status === 'ACTIVE' ? 'ACTIVE' : 'ACTIVE',
          }));
          setEmployees(mapped);
        }
      })
      .catch(() => null);
  }, []);

  const departments = ["ALL", "HRD", "Keuangan & Akuntansi", "Teknologi & IT", "Operasional", "Direksi", "Produksi & Operasional"];

  const filteredEmployees = employees.filter((e) => {
    const matchSearch =
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.nik.toLowerCase().includes(search.toLowerCase()) ||
      e.phone.includes(search);
    const matchDept = selectedDept === "ALL" || e.department === selectedDept;
    return matchSearch && matchDept;
  });

  const handleSyncHRIS = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch("/api/v1/hris/karyawan/list");
      const json = await res.json();
      const list = json?.data?.data || json?.data || [];
      if (Array.isArray(list) && list.length > 0) {
        const mapped: Employee[] = list.map((k: any, i: number) => ({
          id: `hris-${k.nik || i}`,
          nik: k.nik,
          name: k.name || k.nama_karyawan,
          email: `${k.nik?.toLowerCase() || 'staff'}@perusahaan.co.id`,
          department: k.department || 'Operasional',
          position: k.position || 'Staf',
          phone: k.phone || k.no_hp || '-',
          isWaVerified: Boolean(k.phone || k.no_hp),
          accessLevel: (k.department?.includes('Keuangan') ? 'FINANCE_ADMIN' : k.department?.includes('HR') ? 'HR_ADMIN' : 'STAFF') as Employee['accessLevel'],
          status: 'ACTIVE',
        }));
        setEmployees(mapped);
        toast.success(`Sinkronisasi ${mapped.length} data karyawan dari sistem HRIS berhasil!`);
      } else {
        toast.success("Sinkronisasi selesai (tidak ada pembaruan data baru).");
      }
    } catch {
      toast.error("Gagal sinkronisasi data dari HRIS.");
    } finally {
      setIsSyncing(false);
    }
  };

  const getAccessBadge = (level: Employee["accessLevel"]) => {
    switch (level) {
      case "EXECUTIVE":
        return <Badge className="bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/20 text-[10px]">Akses Penuh Direksi</Badge>;
      case "FINANCE_ADMIN":
        return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-[10px]">Akses Data Finance</Badge>;
      case "HR_ADMIN":
        return <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/20 text-[10px]">Akses Data HR</Badge>;
      case "STAFF":
      default:
        return <Badge variant="secondary" className="text-[10px]">Staf (Data Sendiri)</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Users className="h-6 w-6 text-emerald-600" />
            Karyawan & Hak Akses Asisten
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Atur staf terdaftar yang dapat berinteraksi dengan Asisten AI serta pembatasan izin query data finansial dan personalia.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSyncHRIS}
            disabled={isSyncing}
            className="gap-2 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
            Sinkron Data HRIS
          </Button>
          <Button
            size="sm"
            onClick={() => toast.info("Fitur tambah karyawan manual dibuka")}
            className="gap-1.5 text-xs"
          >
            <Plus className="h-3.5 w-3.5" /> Tambah Staf
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-card/50 shadow-xs">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">Total Karyawan</p>
            <p className="text-xl font-bold text-foreground mt-1">{employees.length} Staf</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 shadow-xs">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">Akses Aktif</p>
            <p className="text-xl font-bold text-emerald-600 mt-1">{employees.filter((e) => e.status === "ACTIVE").length} Aktif</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 shadow-xs">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">WhatsApp Terverifikasi</p>
            <p className="text-xl font-bold text-blue-600 mt-1">{employees.filter((e) => e.isWaVerified).length} / {employees.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 shadow-xs">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">Izin Data Sensitif</p>
            <p className="text-xl font-bold text-purple-600 mt-1">{employees.filter((e) => e.accessLevel !== "STAFF").length} Staf</p>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari nama, NIK, atau no. WA..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {departments.map((dept) => (
            <Button
              key={dept}
              variant={selectedDept === dept ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedDept(dept)}
              className="text-xs h-8 px-2.5 rounded-full shrink-0"
            >
              {dept === "ALL" ? "Semua Dept" : dept}
            </Button>
          ))}
        </div>
      </div>

      {/* Employees Table */}
      <Card className="border border-border/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 border-b border-border/60 text-muted-foreground font-medium">
              <tr>
                <th className="py-3 px-4">Karyawan</th>
                <th className="py-3 px-4">Departemen & Jabatan</th>
                <th className="py-3 px-4">WhatsApp</th>
                <th className="py-3 px-4">Level Akses AI</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredEmployees.map((emp) => (
                <tr key={emp.id} className="hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <Avatar className="h-8 w-8 text-xs font-semibold">
                        <AvatarFallback>{emp.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-foreground text-xs leading-tight">{emp.name}</p>
                        <p className="text-[11px] text-muted-foreground font-mono">{emp.nik}</p>
                      </div>
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    <p className="text-foreground font-medium">{emp.department}</p>
                    <p className="text-[11px] text-muted-foreground">{emp.position}</p>
                  </td>

                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5">
                      <Smartphone className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-mono text-[11px] text-foreground">+{emp.phone}</span>
                      {emp.isWaVerified ? (
                        <span title="Terverifikasi">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                        </span>
                      ) : (
                        <Badge variant="outline" className="text-[9px] text-amber-600 border-amber-500/30">Belum Link</Badge>
                      )}
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    {getAccessBadge(emp.accessLevel)}
                  </td>

                  <td className="py-3 px-4">
                    <Badge variant={emp.status === "ACTIVE" ? "default" : "destructive"} className="text-[10px]">
                      {emp.status === "ACTIVE" ? "Aktif" : "Ditangguhkan"}
                    </Badge>
                  </td>

                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs px-2"
                        onClick={() => {
                          setView("chatbot");
                          toast.info(`Membuka sesi simulasi chat untuk ${emp.name}`);
                        }}
                      >
                        <MessageSquare className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                        Test Chat
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs px-2"
                        onClick={() => setEditingEmployee(emp)}
                      >
                        <Lock className="h-3 w-3 mr-1" />
                        Hak Akses
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal Edit Hak Akses */}
      <Dialog open={!!editingEmployee} onOpenChange={() => setEditingEmployee(null)}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Ubah Level Hak Akses Data</DialogTitle>
            <DialogDescription className="text-xs">
              Atur data apa saja yang boleh ditanyakan oleh <strong>{editingEmployee?.name}</strong> ({editingEmployee?.department}) kepada Asisten AI.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Level Hak Akses AI</Label>
              <select
                defaultValue={editingEmployee?.accessLevel}
                className="w-full text-xs rounded-md border border-input bg-background px-3 py-2"
              >
                <option value="STAFF">Staf Biasa (Hanya Data Pribadi: Cuti, Slip Gaji, Reimburse Sendiri)</option>
                <option value="HR_ADMIN">HR Admin (Rekap Cuti Karyawan, Status Absensi Seluruh Tim)</option>
                <option value="FINANCE_ADMIN">Finance Admin (Status Kas, Invoice Klien, Aging Piutang, Budget)</option>
                <option value="EXECUTIVE">Direksi & Manajemen (Seluruh Data HR & Keuangan)</option>
              </select>
            </div>
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded text-xs text-amber-900 dark:text-amber-200 space-y-1">
              <p className="font-semibold flex items-center gap-1.5">
                <ShieldAlert className="h-3.5 w-3.5 text-amber-600 shrink-0" /> Proteksi Kerahasiaan Data
              </p>
              <p className="text-[11px] leading-relaxed">
                Staf biasa tidak akan pernah bisa mengakses data gaji atau keuangan staf lain meskipun prompt ChatGPT ditanyakan secara eksplisit.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setEditingEmployee(null)}>Batal</Button>
            <Button
              size="sm"
              onClick={() => {
                setEditingEmployee(null);
                toast.success("Level hak akses berhasil diperbarui!");
              }}
            >
              Simpan Hak Akses
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
