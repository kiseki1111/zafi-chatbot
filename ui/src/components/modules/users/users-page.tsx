"use client";

import * as React from "react";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Users as UsersIcon, UserPlus, Search, ShieldCheck, ShieldAlert,
  MoreVertical, Pencil, Ban, CheckCircle2, Trash2, Mail, Phone,
  LayoutDashboard, MessageCircle, Building2, ShoppingBag, Megaphone,
  Wallet, Settings as SettingsIcon, Lock, ShieldCheck as ShieldIcon,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/lib/auth-store";
import { ALL_USERS, formatCurrency } from "@/lib/mock-data";
import {
  ROLES, ROLE_LABELS, ROLE_THEME, MENU_ITEMS, menuForRole,
} from "@/lib/rbac";
import type { MenuItem } from "@/lib/rbac";
import { cn } from "@/lib/utils";
import type { Role, User } from "@/lib/types";

// Icon mapping for menu items (lucide names -> components)
const MENU_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  MessageCircle,
  Users: UsersIcon,
  Building2,
  ShoppingBag,
  Megaphone,
  Wallet,
  ShieldCheck: ShieldIcon,
  Settings: SettingsIcon,
};

function MenuIcon({ name, className }: { name: string; className?: string }) {
  const Comp = MENU_ICON_MAP[name] ?? LayoutDashboard;
  return <Comp className={className} />;
}

// Local copy of users so we can mutate (state-managed)
type UserRow = User & { lastLogin?: string };

export function UsersPage() {
  const { toast } = useToast();
  const { user: currentUser } = useAuthStore();

  const [users, setUsers] = React.useState<UserRow[]>(() =>
    ALL_USERS.map((u) => ({ ...u })),
  );
  const [search, setSearch] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState<Role | "all">("all");

  // Dialog state
  const [addOpen, setAddOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<UserRow | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<UserRow | null>(null);

  // Add form
  const [form, setForm] = React.useState({
    name: "", email: "", phone: "", role: "operator" as Role, status: "active" as "active" | "suspended",
  });

  // Edit form
  const [editForm, setEditForm] = React.useState<{ role: Role; status: "active" | "suspended" }>({
    role: "operator", status: "active",
  });
  React.useEffect(() => {
    if (editTarget) {
      setEditForm({ role: editTarget.role, status: editTarget.status });
    }
  }, [editTarget]);

  const isPrivileged =
    currentUser?.role === "superadmin" || currentUser?.role === "admin";

  const filtered = users.filter((u) => {
    const matchSearch =
      !search ||
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.phone ?? "").includes(search);
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const totalActive = users.filter((u) => u.status === "active").length;
  const totalSuspended = users.filter((u) => u.status === "suspended").length;

  const countByRole = (r: Role) => users.filter((u) => u.role === r).length;

  function resetForm() {
    setForm({ name: "", email: "", phone: "", role: "operator", status: "active" });
  }

  function handleAdd() {
    if (!form.name.trim() || !form.email.trim()) {
      toast({ title: "Validasi gagal", description: "Nama dan email wajib diisi.", variant: "destructive" });
      return;
    }
    const newUser: UserRow = {
      id: "u-" + Date.now(),
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || undefined,
      role: form.role,
      status: form.status,
      createdAt: new Date().toISOString().slice(0, 10),
      lastLogin: "-",
    };
    setUsers((prev) => [newUser, ...prev]);
    toast({
      title: "Pengguna ditambahkan",
      description: `${newUser.name} berhasil ditambahkan sebagai ${ROLE_LABELS[newUser.role]}.`,
    });
    setAddOpen(false);
    resetForm();
  }

  function handleEditSave() {
    if (!editTarget) return;
    setUsers((prev) =>
      prev.map((u) =>
        u.id === editTarget.id
          ? { ...u, role: editForm.role, status: editForm.status }
          : u,
      ),
    );
    toast({
      title: "Perubahan disimpan",
      description: `Data ${editTarget.name} berhasil diperbarui.`,
    });
    setEditTarget(null);
  }

  function toggleSuspend(target: UserRow) {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === target.id
          ? { ...u, status: u.status === "active" ? "suspended" : "active" }
          : u,
      ),
    );
    const willSuspend = target.status === "active";
    toast({
      title: willSuspend ? "Pengguna disuspend" : "Pengguna diaktifkan",
      description: willSuspend
        ? `${target.name} telah di-suspend.`
        : `${target.name} telah diaktifkan kembali.`,
      variant: willSuspend ? "destructive" : "default",
    });
  }

  function handleDelete() {
    if (!deleteTarget) return;
    setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
    toast({
      title: "Pengguna dihapus",
      description: `${deleteTarget.name} telah dihapus dari sistem.`,
      variant: "destructive",
    });
    setDeleteTarget(null);
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            Manajemen Pengguna
          </h2>
          <p className="text-sm text-muted-foreground">
            Kelola pengguna, peran, dan hak akses (RBAC) — total {users.length} pengguna terdaftar.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari nama / email / telp…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 w-full sm:w-56"
            />
          </div>
          <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as Role | "all")}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Semua Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Role</SelectItem>
              {ROLES.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Dialog open={addOpen} onOpenChange={(o) => { setAddOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <UserPlus className="h-4 w-4" /> Tambah Pengguna
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Tambah Pengguna Baru</DialogTitle>
                <DialogDescription>
                  Lengkapi data pengguna. Pengguna akan menerima email aktivasi.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="u-name">Nama Lengkap</Label>
                  <Input id="u-name" value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} placeholder="cth. Rina Marlina" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="u-email">Email</Label>
                  <Input id="u-email" type="email" value={form.email} onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))} placeholder="rina@propertiku.id" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="u-phone">Telepon</Label>
                  <Input id="u-phone" value={form.phone} onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))} placeholder="0812-xxxx-xxxx" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Role</Label>
                    <Select value={form.role} onValueChange={(v) => setForm((s) => ({ ...s, role: v as Role }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ROLES.map((r) => (
                          <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Status</Label>
                    <Select value={form.status} onValueChange={(v) => setForm((s) => ({ ...s, status: v as "active" | "suspended" }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Aktif</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setAddOpen(false); resetForm(); }}>Batal</Button>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleAdd}>
                  <UserPlus className="h-4 w-4" /> Simpan
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {!isPrivileged && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900 p-3 text-sm text-amber-800 dark:text-amber-200 flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          <span>Anda melihat halaman ini dalam mode read-only. Hanya Superadmin & Admin yang dapat mengelola pengguna.</span>
        </div>
      )}

      {/* Stat strip */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Pengguna" value={users.length} icon={UsersIcon} theme="emerald" />
        <StatCard label="Pengguna Aktif" value={totalActive} icon={CheckCircle2} theme="teal" />
        <StatCard label="Suspended" value={totalSuspended} icon={Ban} theme="rose" />
        <StatCard label="Total Role" value={ROLES.length} icon={ShieldCheck} theme="violet" />
      </div>

      {/* Role overview grid (RBAC matrix) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-base font-semibold">Ringkasan Role & Hak Akses</h3>
            <p className="text-xs text-muted-foreground">Setiap role memiliki menu yang dapat diakses berbeda.</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {ROLES.map((r) => {
            const theme = ROLE_THEME[r.value];
            const menus = menuForRole(r.value);
            const count = countByRole(r.value);
            return (
              <Card key={r.value} className={cn("ring-1 overflow-hidden", theme.ring)}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={cn("h-9 w-9 rounded-lg grid place-items-center", theme.bg)}>
                        <ShieldCheck className={cn("h-4.5 w-4.5", theme.color)} />
                      </div>
                      <div>
                        <CardTitle className={cn("text-base", theme.color)}>{r.label}</CardTitle>
                        <CardDescription className="text-xs">{r.description}</CardDescription>
                      </div>
                    </div>
                    <Badge variant="outline" className={cn("font-semibold", theme.color)}>
                      {count} pengguna
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-2">
                    Akses Menu ({menus.length})
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {menus.map((m) => (
                      <TooltipProvider key={m.key} delayDuration={150}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className={cn("inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium border", theme.bg, "border-transparent", theme.color)}>
                              <MenuIcon name={m.icon} className="h-3 w-3" />
                              <span>{m.label}</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">
                            {m.label}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Users table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Daftar Pengguna</CardTitle>
              <CardDescription>{filtered.length} dari {users.length} pengguna ditampilkan</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <ScrollArea className="h-[480px]">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-muted/60 backdrop-blur">
                  <tr className="text-left text-xs text-muted-foreground border-b">
                    <th className="py-2.5 px-4 font-medium">Pengguna</th>
                    <th className="py-2.5 px-4 font-medium">Email</th>
                    <th className="py-2.5 px-4 font-medium">Telepon</th>
                    <th className="py-2.5 px-4 font-medium">Role</th>
                    <th className="py-2.5 px-4 font-medium">Status</th>
                    <th className="py-2.5 px-4 font-medium">Dibuat</th>
                    <th className="py-2.5 px-4 font-medium">Login Terakhir</th>
                    <th className="py-2.5 px-4 font-medium text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u) => (
                    <tr key={u.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className={cn("text-xs", ROLE_THEME[u.role].bg, ROLE_THEME[u.role].color)}>
                              {u.name.split(" ").map((s) => s[0]).slice(0, 2).join("")}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium truncate max-w-[160px]">{u.name}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-muted-foreground">
                        <span className="inline-flex items-center gap-1 truncate max-w-[180px]">
                          <Mail className="h-3 w-3" /> {u.email}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-muted-foreground whitespace-nowrap">
                        <span className="inline-flex items-center gap-1">
                          <Phone className="h-3 w-3" /> {u.phone ?? "-"}
                        </span>
                      </td>
                      <td className="py-2.5 px-4">
                        <RoleBadge role={u.role} />
                      </td>
                      <td className="py-2.5 px-4">
                        <StatusBadge status={u.status} />
                      </td>
                      <td className="py-2.5 px-4 text-muted-foreground whitespace-nowrap">{u.createdAt}</td>
                      <td className="py-2.5 px-4 text-muted-foreground whitespace-nowrap">{u.lastLogin ?? "-"}</td>
                      <td className="py-2.5 px-4 text-right">
                        <RowActions
                          user={u}
                          onEdit={() => setEditTarget(u)}
                          onToggleSuspend={() => toggleSuspend(u)}
                          onDelete={() => setDeleteTarget(u)}
                          isSelf={u.id === currentUser?.id}
                        />
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-muted-foreground text-sm">
                        Tidak ada pengguna yang cocok dengan filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </ScrollArea>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y">
            {filtered.map((u) => (
              <div key={u.id} className="p-4 flex gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className={cn("text-xs", ROLE_THEME[u.role].bg, ROLE_THEME[u.role].color)}>
                    {u.name.split(" ").map((s) => s[0]).slice(0, 2).join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{u.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                      {u.phone && <p className="text-xs text-muted-foreground">{u.phone}</p>}
                    </div>
                    <RowActions
                      user={u}
                      onEdit={() => setEditTarget(u)}
                      onToggleSuspend={() => toggleSuspend(u)}
                      onDelete={() => setDeleteTarget(u)}
                      isSelf={u.id === currentUser?.id}
                    />
                  </div>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <RoleBadge role={u.role} />
                    <StatusBadge status={u.status} />
                    <span className="text-[11px] text-muted-foreground">Login: {u.lastLogin ?? "-"}</span>
                  </div>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="py-10 text-center text-muted-foreground text-sm">
                Tidak ada pengguna yang cocok dengan filter.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit dialog */}
      <Dialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Pengguna</DialogTitle>
            <DialogDescription>
              Ubah role dan status untuk <span className="font-medium text-foreground">{editTarget?.name}</span>.
            </DialogDescription>
          </DialogHeader>
          {editTarget && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-lg border p-3 bg-muted/30">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className={cn("text-xs", ROLE_THEME[editTarget.role].bg, ROLE_THEME[editTarget.role].color)}>
                    {editTarget.name.split(" ").map((s) => s[0]).slice(0, 2).join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="font-medium truncate">{editTarget.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{editTarget.email}</p>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select value={editForm.role} onValueChange={(v) => setEditForm((s) => ({ ...s, role: v as Role }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {ROLES.find((r) => r.value === editForm.role)?.description}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={editForm.status} onValueChange={(v) => setEditForm((s) => ({ ...s, status: v as "active" | "suspended" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Aktif</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="rounded-md border bg-muted/30 p-3">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-2">
                  Hak akses dengan role ini
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {menuForRole(editForm.role).map((m: MenuItem) => (
                    <span key={m.key} className="inline-flex items-center gap-1 rounded-md bg-background border px-2 py-0.5 text-[11px]">
                      <MenuIcon name={m.icon} className="h-3 w-3 text-emerald-600" />
                      {m.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>Batal</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleEditSave}>
              <Pencil className="h-4 w-4" /> Simpan Perubahan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus pengguna ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Pengguna{" "}
              <span className="font-medium text-foreground">{deleteTarget?.name}</span> ({deleteTarget?.email})
              akan dihapus permanen dari sistem.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700 text-white"
              onClick={handleDelete}
            >
              <Trash2 className="h-4 w-4" /> Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ============ Sub components ============

function StatCard({
  label, value, icon: Icon, theme,
}: {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  theme: "emerald" | "teal" | "rose" | "violet";
}) {
  const map = {
    emerald: "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600",
    teal: "bg-teal-100 dark:bg-teal-950/40 text-teal-600",
    rose: "bg-rose-100 dark:bg-rose-950/40 text-rose-600",
    violet: "bg-violet-100 dark:bg-violet-950/40 text-violet-600",
  } as const;
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardDescription className="text-xs">{label}</CardDescription>
          <div className={cn("h-8 w-8 rounded-lg grid place-items-center", map[theme])}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight mt-1">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}

function RoleBadge({ role }: { role: Role }) {
  const theme = ROLE_THEME[role];
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1", theme.bg, theme.color, theme.ring)}>
      {ROLE_LABELS[role]}
    </span>
  );
}

function StatusBadge({ status }: { status: "active" | "suspended" }) {
  return status === "active" ? (
    <span className="inline-flex items-center rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 text-[11px] font-medium">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1.5" /> Aktif
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 px-2 py-0.5 text-[11px] font-medium">
      <span className="h-1.5 w-1.5 rounded-full bg-rose-500 mr-1.5" /> Suspended
    </span>
  );
}

function RowActions({
  user, onEdit, onToggleSuspend, onDelete, isSelf,
}: {
  user: UserRow;
  onEdit: () => void;
  onToggleSuspend: () => void;
  onDelete: () => void;
  isSelf: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreVertical className="h-4 w-4" />
          <span className="sr-only">Aksi</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onClick={onEdit}>
          <Pencil className="h-4 w-4" /> Edit Role & Status
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onToggleSuspend} disabled={isSelf}>
          {user.status === "active" ? (
            <>
              <Ban className="h-4 w-4" /> Suspend
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Aktifkan
            </>
          )}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onDelete} disabled={isSelf} className="text-rose-600 focus:text-rose-700 focus:bg-rose-50 dark:focus:bg-rose-950/40">
          <Trash2 className="h-4 w-4" /> Hapus
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
