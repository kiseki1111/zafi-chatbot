"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
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
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Home, Building2, Store, Warehouse, Mountain, Plus, Search, MapPin,
  Bed, Bath, Maximize, Pencil, Trash2, MoreVertical, Eye, CheckCircle2,
  AlertCircle, Wallet, Tag, LayoutGrid, ImageIcon,
} from "lucide-react";
import {
  PROPERTIES, formatCurrency, formatFullCurrency,
} from "@/lib/mock-data";
import type {
  Property, PropertyStatus, PropertyType,
} from "@/lib/types";
import { useAuthStore } from "@/lib/auth-store";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// ===== Helpers =====
const typeMeta: Record<
  PropertyType,
  { label: string; icon: typeof Home }
> = {
  rumah: { label: "Rumah", icon: Home },
  apartemen: { label: "Apartemen", icon: Building2 },
  ruko: { label: "Ruko", icon: Store },
  tanah: { label: "Tanah", icon: Mountain },
  gudang: { label: "Gudang", icon: Warehouse },
};

const statusMeta: Record<
  PropertyStatus,
  { label: string; className: string }
> = {
  tersedia: {
    label: "Tersedia",
    className:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-transparent",
  },
  terjual: {
    label: "Terjual",
    className:
      "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-transparent",
  },
  tersewa: {
    label: "Tersewa",
    className:
      "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-transparent",
  },
  draft: {
    label: "Draft",
    className:
      "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 border-transparent",
  },
};

const typeFilters: { key: "all" | PropertyType; label: string }[] = [
  { key: "all", label: "Semua" },
  { key: "rumah", label: "Rumah" },
  { key: "apartemen", label: "Apartemen" },
  { key: "ruko", label: "Ruko" },
  { key: "tanah", label: "Tanah" },
  { key: "gudang", label: "Gudang" },
];

const statusFilters: { key: "all" | PropertyStatus; label: string }[] = [
  { key: "all", label: "Semua" },
  { key: "tersedia", label: "Tersedia" },
  { key: "terjual", label: "Terjual" },
  { key: "tersewa", label: "Tersewa" },
  { key: "draft", label: "Draft" },
];

// ===== Main =====
export function PropertiesPage() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [search, setSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<"all" | PropertyType>("all");
  const [statusFilter, setStatusFilter] = React.useState<"all" | PropertyStatus>("all");
  const [createOpen, setCreateOpen] = React.useState(false);

  // ===== Derived stats =====
  const total = PROPERTIES.length;
  const tersedia = PROPERTIES.filter((p) => p.status === "tersedia").length;
  const terjual = PROPERTIES.filter((p) => p.status === "terjual").length;
  const totalNilai = PROPERTIES.reduce((acc, p) => acc + p.price, 0);

  // ===== Filtered =====
  const filtered = PROPERTIES.filter((p) => {
    const okType = typeFilter === "all" || p.type === typeFilter;
    const okStatus = statusFilter === "all" || p.status === statusFilter;
    const q = search.trim().toLowerCase();
    const okSearch =
      q === "" ||
      p.title.toLowerCase().includes(q) ||
      p.location.toLowerCase().includes(q) ||
      p.agent.toLowerCase().includes(q);
    return okType && okStatus && okSearch;
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Home className="h-5 w-5 text-emerald-600" />
            Daftar Properti
          </h2>
          <p className="text-sm text-muted-foreground">
            {total} properti terdaftar — kelola listing Anda di sini,{" "}
            {user?.name.split(" ")[0]}.
          </p>
        </div>
        <Button
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="h-4 w-4" /> Tambah Properti
        </Button>
      </div>

      {/* Stat strip */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <MiniStat
          label="Total Properti"
          value={String(total)}
          icon={LayoutGrid}
          iconBg="bg-emerald-100 dark:bg-emerald-950/40"
          iconColor="text-emerald-600"
        />
        <MiniStat
          label="Tersedia"
          value={String(tersedia)}
          icon={Tag}
          iconBg="bg-teal-100 dark:bg-teal-950/40"
          iconColor="text-teal-600"
        />
        <MiniStat
          label="Terjual"
          value={String(terjual)}
          icon={CheckCircle2}
          iconBg="bg-rose-100 dark:bg-rose-950/40"
          iconColor="text-rose-600"
        />
        <MiniStat
          label="Total Nilai"
          value={formatCurrency(totalNilai)}
          icon={Wallet}
          iconBg="bg-amber-100 dark:bg-amber-950/40"
          iconColor="text-amber-600"
        />
      </div>

      {/* Filter bar */}
      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row gap-3 md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari judul, lokasi, atau agen…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {typeFilters.map((t) => (
              <button
                key={t.key}
                onClick={() => setTypeFilter(t.key)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-colors border",
                  typeFilter === t.key
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "bg-background text-muted-foreground hover:bg-muted border-border",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as "all" | PropertyStatus)}
          >
            <SelectTrigger className="w-full md:w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {statusFilters.map((s) => (
                <SelectItem key={s.key} value={s.key}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Property grid */}
      {filtered.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p) => (
            <PropertyCard key={p.id} property={p} toast={toast} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 grid place-items-center text-center text-sm text-muted-foreground">
            <div>
              <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground/60" />
              Tidak ada properti yang cocok dengan filter.
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Dialog */}
      <CreatePropertyDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        toast={toast}
      />
    </div>
  );
}

// ===== Mini stat =====
function MiniStat({
  label, value, icon: Icon, iconBg, iconColor,
}: {
  label: string;
  value: string;
  icon: typeof Home;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={cn("h-10 w-10 rounded-lg grid place-items-center shrink-0", iconBg, iconColor)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground leading-tight">{label}</p>
          <p className="text-lg font-bold leading-tight mt-0.5 truncate">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ===== Property Card =====
function PropertyCard({
  property, toast,
}: {
  property: Property;
  toast: (t: { title: string; description?: string }) => void;
}) {
  const tm = typeMeta[property.type];
  const sm = statusMeta[property.status];
  const TIcon = tm.icon;
  const [imgOk, setImgOk] = React.useState(true);

  const handleEdit = () => {
    toast({
      title: "Mode edit",
      description: `Membuka editor untuk "${property.title}".`,
    });
  };
  const handleDelete = () => {
    toast({
      title: "Properti dihapus",
      description: `"${property.title}" telah dihapus dari daftar.`,
    });
  };
  const handleDetail = () => {
    toast({
      title: "Detail properti",
      description: `Menampilkan detail "${property.title}".`,
    });
  };

  return (
    <Card className="overflow-hidden flex flex-col p-0 gap-0">
      {/* Image */}
      <div className="relative aspect-[16/10] bg-muted overflow-hidden">
        {property.image && imgOk ? (
          <img
            src={property.image}
            alt={property.title}
            loading="lazy"
            onError={() => setImgOk(false)}
            className="h-full w-full object-cover transition-transform hover:scale-105 duration-300"
          />
        ) : (
          <div className="h-full w-full grid place-items-center text-muted-foreground/50">
            <div className="text-center">
              <ImageIcon className="h-8 w-8 mx-auto" />
              <p className="text-[10px] mt-1">Tanpa gambar</p>
            </div>
          </div>
        )}
        {/* Type badge top-left */}
        <div className="absolute top-2 left-2">
          <Badge className={cn("gap-1 bg-white/95 dark:bg-zinc-900/90 text-zinc-700 dark:text-zinc-200 border-transparent backdrop-blur")}>
            <TIcon className="h-3 w-3" /> {tm.label}
          </Badge>
        </div>
        {/* Status badge top-right */}
        <div className="absolute top-2 right-2">
          <Badge className={cn("border-transparent backdrop-blur", sm.className)}>
            {sm.label}
          </Badge>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-col flex-1 p-4 gap-2.5">
        {/* Price */}
        <div>
          <p className="text-emerald-600 dark:text-emerald-400 font-bold text-lg leading-tight">
            {formatFullCurrency(property.price)}
          </p>
        </div>
        {/* Title */}
        <h3 className="font-semibold leading-tight line-clamp-1" title={property.title}>
          {property.title}
        </h3>
        {/* Location */}
        <div className="flex items-start gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5 text-rose-500" />
          <span className="line-clamp-1">{property.location}</span>
        </div>
        {/* Specs */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap pt-1">
          {(property.bedrooms ?? 0) > 0 && (
            <span className="inline-flex items-center gap-1">
              <Bed className="h-3.5 w-3.5 text-teal-600" /> {property.bedrooms} KT
            </span>
          )}
          {(property.bathrooms ?? 0) > 0 && (
            <span className="inline-flex items-center gap-1">
              <Bath className="h-3.5 w-3.5 text-violet-600" /> {property.bathrooms} KM
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <Maximize className="h-3.5 w-3.5 text-amber-600" /> {property.area} m²
          </span>
        </div>

        {/* Agent */}
        <div className="flex items-center gap-2 pt-1.5 mt-auto border-t">
          <Avatar className="h-6 w-6">
            <AvatarFallback className="text-[10px] bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
              {property.agent.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs text-muted-foreground truncate flex-1">
            {property.agent}
          </span>
        </div>
      </div>

      {/* Footer actions */}
      <div className="flex items-center gap-2 px-4 pb-4">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={handleDetail}
        >
          <Eye className="h-3.5 w-3.5" /> Lihat Detail
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="px-2">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleDetail}>
              <Eye className="h-4 w-4 mr-2" /> Lihat Detail
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleEdit}>
              <Pencil className="h-4 w-4 mr-2" /> Edit Properti
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleDelete}
              className="text-rose-600 focus:text-rose-700 focus:bg-rose-50 dark:focus:bg-rose-950/30"
            >
              <Trash2 className="h-4 w-4 mr-2" /> Hapus
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  );
}

// ===== Create Property Dialog =====
function CreatePropertyDialog({
  open, onOpenChange, toast,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  toast: (t: { title: string; description?: string }) => void;
}) {
  const [title, setTitle] = React.useState("");
  const [type, setType] = React.useState<PropertyType>("rumah");
  const [price, setPrice] = React.useState("");
  const [location, setLocation] = React.useState("");
  const [bedrooms, setBedrooms] = React.useState("");
  const [bathrooms, setBathrooms] = React.useState("");
  const [area, setArea] = React.useState("");
  const [status, setStatus] = React.useState<PropertyStatus>("tersedia");

  const reset = () => {
    setTitle("");
    setType("rumah");
    setPrice("");
    setLocation("");
    setBedrooms("");
    setBathrooms("");
    setArea("");
    setStatus("tersedia");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !location.trim() || !price || !area) {
      toast({
        title: "Lengkapi data",
        description: "Judul, lokasi, harga, dan luas wajib diisi.",
      });
      return;
    }
    toast({
      title: "Properti ditambahkan",
      description: `"${title}" berhasil disimpan sebagai ${statusMeta[status].label.toLowerCase()}.`,
    });
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Tambah Properti Baru</DialogTitle>
            <DialogDescription>
              Isi informasi listing properti. Field bertanda * wajib diisi.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="p-title">Judul Properti *</Label>
              <Input
                id="p-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="mis. Rumah Modern Cibaduyut"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="p-type">Tipe *</Label>
                <Select
                  value={type}
                  onValueChange={(v) => setType(v as PropertyType)}
                >
                  <SelectTrigger id="p-type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rumah">Rumah</SelectItem>
                    <SelectItem value="apartemen">Apartemen</SelectItem>
                    <SelectItem value="ruko">Ruko</SelectItem>
                    <SelectItem value="tanah">Tanah</SelectItem>
                    <SelectItem value="gudang">Gudang</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-status">Status *</Label>
                <Select
                  value={status}
                  onValueChange={(v) => setStatus(v as PropertyStatus)}
                >
                  <SelectTrigger id="p-status" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tersedia">Tersedia</SelectItem>
                    <SelectItem value="terjual">Terjual</SelectItem>
                    <SelectItem value="tersewa">Tersewa</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="p-price">Harga (Rp) *</Label>
              <Input
                id="p-price"
                type="number"
                min={0}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="mis. 850000000"
              />
              {price && Number(price) > 0 && (
                <p className="text-[11px] text-muted-foreground">
                  {formatFullCurrency(Number(price))}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="p-location">Lokasi *</Label>
              <Input
                id="p-location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="mis. Cibaduyut, Bandung"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="p-bed">Kamar Tidur</Label>
                <Input
                  id="p-bed"
                  type="number"
                  min={0}
                  value={bedrooms}
                  onChange={(e) => setBedrooms(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-bath">Kamar Mandi</Label>
                <Input
                  id="p-bath"
                  type="number"
                  min={0}
                  value={bathrooms}
                  onChange={(e) => setBathrooms(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-area">Luas (m²) *</Label>
                <Input
                  id="p-area"
                  type="number"
                  min={0}
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder="120"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <CheckCircle2 className="h-4 w-4" /> Simpan Properti
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
