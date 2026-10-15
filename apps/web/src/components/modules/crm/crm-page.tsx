"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";
import {
  Users,
  Search,
  Plus,
  Phone,
  MessageCircle,
  Trash2,
  Download,
  ChevronDown,
  Home,
  FileSpreadsheet,
} from "lucide-react";
import { useAppStore } from "@/lib/app-store";
import { useAuthStore } from "@/lib/auth-store";
import { MOCK_CRM_CONTACTS } from "@/lib/mock-data";

export interface ContactData {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  company?: string | null;
  address?: string | null;
  notes?: string | null;
  status: string;
  source?: string;
  metadata?: {
    perumahan?: string;
    tipeUnit?: string;
    hargaUnit?: number | string;
    [key: string]: any;
  } | null;
  createdAt: string;
  updatedAt: string;
  conversations?: any[];
}

export interface PropertyGroup {
  id: string;
  name: string;
  category?: string;
  items: { id: string; code: string; houseType?: string; price?: number; status: string }[];
}

const DEFAULT_PERUMAHAN_CATALOG = [
  { name: "Griya Amanah 2", types: [{ name: "Tipe 40", price: 295000000 }, { name: "Tipe 36", price: 192800000 }] },
  { name: "Zafi Residence", types: [{ name: "Tipe 36", price: 192800000 }, { name: "Tipe 45", price: 260000000 }] },
  { name: "Kahyana Residence", types: [{ name: "Tipe 36", price: 192800000 }, { name: "Tipe 40", price: 245000000 }] },
];

const PROSPECT_STATUS_OPTIONS = [
  { value: "Follow-Up", label: "Follow-Up" },
  { value: "Survey", label: "Survey Lokasi" },
  { value: "SLIK", label: "Cek SLIK / Bank" },
  { value: "Booking", label: "Booking Unit" },
  { value: "Closing", label: "Closing / Akad" },
  { value: "Batal", label: "Batal / Pending" },
];

function formatRupiah(val: number | string | undefined | null): string {
  if (val === undefined || val === null || val === "") return "";
  const num = typeof val === "number" ? val : Number(String(val).replace(/\D/g, ""));
  if (isNaN(num) || num === 0) return "";
  return num.toLocaleString("id-ID");
}

function parseRupiahNumber(val: string): number {
  const digits = val.replace(/\D/g, "");
  return digits ? Number(digits) : 0;
}

export function CrmPage() {
  const { setView, setActiveContactId } = useAppStore();
  const { user } = useAuthStore();
  const [allContacts, setAllContacts] = useState<ContactData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [propertyGroups, setPropertyGroups] = useState<PropertyGroup[]>([]);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search — hanya filter setelah user berhenti mengetik 400ms
  const handleSearchChange = (val: string) => {
    setSearchInput(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(val), 400);
  };

  // Fetch katalog perumahan (sekali saat mount)
  const fetchPropertyGroups = useCallback(async () => {
    try {
      const tenantId = user?.tenantId || "";
      const res = await fetch(`/api/v1/availability/groups?tenantId=${tenantId}`);
      if (res.ok) {
        const json = await res.json();
        const list: PropertyGroup[] = Array.isArray(json) ? json : (json?.data ?? []);
        setPropertyGroups(list);
      }
    } catch { /* gunakan fallback */ }
  }, [user?.tenantId]);

  // Fetch semua kontak sekali — tidak membawa search ke server
  const fetchContacts = useCallback(async () => {
    setLoading(true);
    let list: ContactData[] = [];
    try {
      const res = await fetch("/api/v1/contacts");
      if (res.ok) {
        const data = await res.json();
        list = Array.isArray(data) ? data : (data.data ?? []);
      }
    } catch { /* fall through to mock */ }

    const isDemoAccount =
      user?.id?.startsWith("u-") ||
      user?.email?.includes("demo") ||
      (process.env.NODE_ENV !== "production" && !user?.tenantId);

    setAllContacts(list.length === 0 && isDemoAccount ? (MOCK_CRM_CONTACTS as ContactData[]) : list);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchPropertyGroups();
    fetchContacts();
  }, [fetchPropertyGroups, fetchContacts]);

  // Katalog perumahan dari database atau fallback
  const perumahanCatalog = useMemo(() => {
    if (propertyGroups.length > 0) {
      return propertyGroups.map((g) => {
        const typesMap = new Map<string, number>();
        g.items?.forEach((item) => {
          if (item.houseType && !typesMap.has(item.houseType)) {
            typesMap.set(item.houseType, item.price ? Number(item.price) : 0);
          }
        });
        const types = Array.from(typesMap.entries()).map(([name, price]) => ({ name, price }));
        return { name: g.name, types: types.length > 0 ? types : [{ name: "Tipe Standar", price: 0 }] };
      });
    }
    return DEFAULT_PERUMAHAN_CATALOG;
  }, [propertyGroups]);

  // Filter client-side: search (debounced) + status
  const filteredContacts = useMemo(() => {
    let list = allContacts;
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.phone || "").includes(q) ||
          (c.metadata?.perumahan ?? "").toLowerCase().includes(q) ||
          (c.notes ?? "").toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "ALL") {
      list = list.filter((c) => {
        if (statusFilter === "Follow-Up") return ["Follow-Up", "INQUIRY", "NEW"].includes(c.status);
        return c.status === statusFilter;
      });
    }
    return list;
  }, [allContacts, debouncedSearch, statusFilter]);

  // Optimistic field update + fire-and-forget PATCH
  const handleFieldChange = async (contactId: string, fieldPath: string, value: any) => {
    setAllContacts((prev) =>
      prev.map((c) => {
        if (c.id !== contactId) return c;
        if (fieldPath.startsWith("metadata.")) {
          const key = fieldPath.split(".")[1];
          return { ...c, metadata: { ...(c.metadata ?? {}), [key]: value } };
        }
        return { ...c, [fieldPath]: value };
      })
    );
    const target = allContacts.find((c) => c.id === contactId);
    let payload: any;
    if (fieldPath.startsWith("metadata.")) {
      const key = fieldPath.split(".")[1];
      payload = { metadata: { ...(target?.metadata ?? {}), [key]: value } };
    } else {
      payload = { [fieldPath]: value };
    }
    fetch(`/api/v1/contacts/${contactId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => {});
  };

  const handlePerumahanSelect = (contactId: string, perumahanName: string) => {
    const cluster = perumahanCatalog.find((p) => p.name === perumahanName);
    const defaultType = cluster?.types?.[0]?.name ?? "";
    const defaultPrice = cluster?.types?.[0]?.price ?? 0;
    const target = allContacts.find((c) => c.id === contactId);
    const newMeta = {
      ...(target?.metadata ?? {}),
      perumahan: perumahanName,
      tipeUnit: defaultType,
      hargaUnit: defaultPrice > 0 ? defaultPrice : (target?.metadata?.hargaUnit ?? ""),
    };
    setAllContacts((prev) =>
      prev.map((c) => (c.id === contactId ? { ...c, metadata: newMeta } : c))
    );
    fetch(`/api/v1/contacts/${contactId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ metadata: newMeta }),
    }).catch(() => {});
  };

  const handleTipeUnitSelect = (contactId: string, perumahanName: string, tipeName: string) => {
    const cluster = perumahanCatalog.find((p) => p.name === perumahanName);
    const suggestedPrice = cluster?.types?.find((t) => t.name === tipeName)?.price ?? 0;
    const target = allContacts.find((c) => c.id === contactId);
    const newMeta = {
      ...(target?.metadata ?? {}),
      tipeUnit: tipeName,
      ...(suggestedPrice > 0 ? { hargaUnit: suggestedPrice } : {}),
    };
    setAllContacts((prev) =>
      prev.map((c) => (c.id === contactId ? { ...c, metadata: newMeta } : c))
    );
    fetch(`/api/v1/contacts/${contactId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ metadata: newMeta }),
    }).catch(() => {});
  };

  const handleAddRow = async () => {
    const def = perumahanCatalog[0];
    const tempId = `crm-${Date.now()}`;
    const newContact: ContactData = {
      id: tempId,
      name: "Anonim",
      phone: `08${Math.floor(100000000 + Math.random() * 900000000)}`,
      email: null,
      status: "Follow-Up",
      notes: "",
      metadata: { perumahan: def?.name ?? "", tipeUnit: def?.types?.[0]?.name ?? "", hargaUnit: def?.types?.[0]?.price ?? 0 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setAllContacts((prev) => [newContact, ...prev]);
    try {
      const res = await fetch("/api/v1/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newContact.name, phone: newContact.phone, status: newContact.status, metadata: newContact.metadata, source: "CRM" }),
      });
      if (res.ok) {
        const data = await res.json().then((d) => d.data ?? d);
        if (data?.id) setAllContacts((prev) => prev.map((c) => (c.id === tempId ? { ...c, id: data.id } : c)));
      }
    } catch { /* optimistic already applied */ }
  };

  const handleDeleteRow = (id: string) => {
    setDeleteConfirmId(id);
  };

  const executeDeleteRow = () => {
    if (!deleteConfirmId) return;
    const id = deleteConfirmId;
    setAllContacts((prev) => prev.filter((c) => c.id !== id));
    fetch(`/api/v1/contacts/${id}`, { method: "DELETE" }).catch(() => {});
    setDeleteConfirmId(null);
  };

  const handleExportCsv = () => {
    const headers = ["No.", "Nama Pelanggan", "No. WhatsApp", "Perumahan", "Tipe Unit", "Harga Unit (Rp)", "Status", "Catatan"];
    const rows = filteredContacts.map((c, idx) => {
      const cleanPhone = (c.phone || "").replace(/@(c\.us|s\.whatsapp\.net|lid|broadcast)$/i, "").replace(/^\+/, "");
      const selectedPerumahan = c.metadata?.perumahan || perumahanCatalog[0]?.name || "";
      const cluster = perumahanCatalog.find((p) => p.name === selectedPerumahan);
      const selectedTipe = c.metadata?.tipeUnit || cluster?.types?.[0]?.name || "";
      const displayPrice = c.metadata?.hargaUnit ? formatRupiah(c.metadata.hargaUnit) : (cluster?.types?.[0]?.price ? formatRupiah(cluster.types[0].price) : "");

      return [
        idx + 1,
        `"${(c.name ?? "").replace(/"/g, '""')}"`,
        `"${cleanPhone}"`,
        `"${selectedPerumahan.replace(/"/g, '""')}"`,
        `"${selectedTipe.replace(/"/g, '""')}"`,
        `"${displayPrice}"`,
        `"${c.status ?? ""}"`,
        `"${(c.notes ?? "").replace(/\r?\n/g, " ").replace(/"/g, '""')}"`,
      ].join(",");
    });
    const csv = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `Data_Pelanggan_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // ─── Komponen inline untuk dropdown sel tabel ─────────────────────────────
  function CellSelect({
    value,
    options,
    onValueChange,
    placeholder,
  }: {
    value: string;
    options: { value: string; label: string }[];
    onValueChange: (v: string) => void;
    placeholder?: string;
  }) {
    const allOptions = options.some((o) => o.value === value)
      ? options
      : [...options, { value, label: value }];

    return (
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger
          size="sm"
          className="h-7 w-full min-w-0 text-xs border-transparent bg-transparent hover:bg-muted/60 hover:border-border focus:border-emerald-500 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500 shadow-none px-2 gap-1 [&>span]:truncate [&>span]:block"
        >
          <SelectValue placeholder={placeholder ?? "Pilih..."} />
        </SelectTrigger>
        <SelectContent className="text-xs">
          {allOptions.map((o) => (
            <SelectItem key={o.value} value={o.value} className="text-xs">
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  // ─── Komponen inline untuk dropdown mobile ────────────────────────────────
  function MobileCellSelect({
    label,
    value,
    options,
    onValueChange,
  }: {
    label: string;
    value: string;
    options: { value: string; label: string }[];
    onValueChange: (v: string) => void;
  }) {
    const allOptions = options.some((o) => o.value === value)
      ? options
      : [...options, { value, label: value }];
    return (
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-muted-foreground w-24 shrink-0">{label}:</span>
        <Select value={value} onValueChange={onValueChange}>
          <SelectTrigger size="sm" className="flex-1 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="text-xs">
            {allOptions.map((o) => (
              <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-3 p-4 lg:p-2 pb-20 lg:pb-2 overflow-hidden">
      {/* HEADER */}
      <div className="rounded-xl border bg-card p-4 sm:p-5 shadow-xs shrink-0">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-9 w-9 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 grid place-items-center shrink-0">
              <Users className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground truncate">Pelanggan</h1>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{filteredContacts.length} data pelanggan terdaftar</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleExportCsv} className="h-8 px-3 text-xs font-semibold gap-1.5 shadow-xs">
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Unduh Excel (.csv)</span>
              <span className="sm:hidden">Excel</span>
            </Button>
            <Button size="sm" onClick={handleAddRow} className="h-8 px-3 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              <span>Tambah Pelanggan</span>
            </Button>
          </div>
        </div>

        {/* Search + filter chips DALAM header card, tanpa gap ekstra */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Cari nama, nomor, perumahan, atau catatan..."
              className="pl-8 h-8 text-xs bg-background border rounded-lg"
            />
          </div>
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
            {[
              { key: "ALL", label: "Semua" },
              { key: "Follow-Up", label: "Follow-Up" },
              { key: "Survey", label: "Survey" },
              { key: "SLIK", label: "SLIK" },
              { key: "Booking", label: "Booking" },
              { key: "Closing", label: "Closing" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={cn(
                  "px-2.5 py-1 rounded-md text-xs font-medium border transition-colors shrink-0",
                  statusFilter === tab.key
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                    : "bg-transparent text-muted-foreground border-border hover:bg-muted/70"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Container: Tabel mengisi seluruh div tanpa gap / padding padding internal */}
      <div className="rounded-xl border bg-card flex-1 flex flex-col min-h-0 overflow-hidden shadow-xs">
        <div className="flex-1 min-h-0 overflow-auto">
          {loading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
                  <Skeleton className="h-6 w-8" />
                  <Skeleton className="h-6 w-36" />
                  <Skeleton className="h-6 w-28" />
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-6 flex-1" />
                </div>
              ))}
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="h-14 w-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 grid place-items-center mb-3">
                <FileSpreadsheet className="h-7 w-7" />
              </div>
              <h4 className="text-sm font-semibold text-foreground">Belum Ada Data Pelanggan</h4>
              <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-4">
                Setiap percakapan pelanggan di WhatsApp akan tercatat otomatis di sini.
              </p>
              <Button size="sm" onClick={handleAddRow} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Tambah Pelanggan Pertama
              </Button>
            </div>
          ) : (
            <>
              {/* ── DESKTOP TABLE ── */}
              <div className="hidden md:block w-full overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse table-fixed">
                  <colgroup>
                    <col style={{ width: "48px" }} />
                    <col style={{ width: "170px" }} />
                    <col style={{ width: "140px" }} />
                    <col style={{ width: "170px" }} />
                    <col style={{ width: "120px" }} />
                    <col style={{ width: "130px" }} />
                    <col style={{ width: "145px" }} />
                    <col style={{ minWidth: "220px" }} />
                    <col style={{ width: "64px" }} />
                  </colgroup>
                  <thead className="sticky top-0 z-10 bg-muted/60 backdrop-blur-xs border-b text-muted-foreground">
                    <tr className="divide-x divide-border font-semibold text-[11px]">
                      <th style={{ width: "48px" }} className="py-2.5 px-2 text-center shrink-0">No.</th>
                      <th style={{ width: "170px" }} className="py-2.5 px-3 shrink-0">Nama Pelanggan</th>
                      <th style={{ width: "140px" }} className="py-2.5 px-3 shrink-0">No. WhatsApp</th>
                      <th style={{ width: "170px" }} className="py-2.5 px-3 shrink-0">
                        <div className="flex items-center gap-1">Perumahan <ChevronDown className="h-3 w-3 opacity-50 shrink-0" /></div>
                      </th>
                      <th style={{ width: "120px" }} className="py-2.5 px-3 shrink-0">
                        <div className="flex items-center gap-1">Tipe Unit <ChevronDown className="h-3 w-3 opacity-50 shrink-0" /></div>
                      </th>
                      <th style={{ width: "130px" }} className="py-2.5 px-3 text-right shrink-0">Harga Unit (Rp)</th>
                      <th style={{ width: "145px" }} className="py-2.5 px-3 shrink-0">
                        <div className="flex items-center gap-1">Status <ChevronDown className="h-3 w-3 opacity-50 shrink-0" /></div>
                      </th>
                      <th className="py-2.5 px-3">Catatan</th>
                      <th style={{ width: "64px" }} className="py-2.5 px-2 text-center shrink-0">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredContacts.map((c, index) => {
                      const selectedPerumahan = c.metadata?.perumahan ?? perumahanCatalog[0]?.name ?? "";
                      const cluster = perumahanCatalog.find((p) => p.name === selectedPerumahan);
                      const unitTypes = cluster?.types ?? [];
                      const selectedTipe = c.metadata?.tipeUnit ?? unitTypes[0]?.name ?? "";
                      const cleanPhone = (c.phone ?? "")
                        .replace(/@(c\.us|s\.whatsapp\.net|lid|broadcast)$/i, "")
                        .replace(/^\+/, "");

                      return (
                        <tr key={c.id} className="group transition-colors divide-x divide-border hover:bg-muted/40">
                          <td style={{ width: "48px", maxWidth: "48px" }} className="py-2 px-2 text-center text-muted-foreground align-middle overflow-hidden">{index + 1}</td>

                          <td style={{ width: "170px", maxWidth: "170px" }} className="py-1 px-2 overflow-hidden align-middle">
                            <input
                              type="text"
                              value={c.name ?? ""}
                              onChange={(e) => handleFieldChange(c.id, "name", e.target.value)}
                              placeholder="Nama pelanggan..."
                              className="w-full bg-transparent px-2 py-1 rounded text-xs font-medium border border-transparent hover:border-border focus:border-emerald-500 focus:bg-background outline-none transition-colors"
                            />
                          </td>

                          <td style={{ width: "140px", maxWidth: "140px" }} className="py-1 px-2 overflow-hidden align-middle">
                            <input
                              type="text"
                              value={cleanPhone}
                              onChange={(e) => handleFieldChange(c.id, "phone", e.target.value)}
                              placeholder="08xxxxxxxxxx"
                              className="w-full bg-transparent px-2 py-1 rounded text-xs font-mono border border-transparent hover:border-border focus:border-emerald-500 focus:bg-background outline-none transition-colors"
                            />
                          </td>

                          <td style={{ width: "170px", maxWidth: "170px" }} className="py-1 px-1 overflow-hidden align-middle">
                            <CellSelect
                              value={selectedPerumahan}
                              options={perumahanCatalog.map((p) => ({ value: p.name, label: p.name }))}
                              onValueChange={(v) => handlePerumahanSelect(c.id, v)}
                            />
                          </td>

                          <td style={{ width: "120px", maxWidth: "120px" }} className="py-1 px-1 overflow-hidden align-middle">
                            <CellSelect
                              value={selectedTipe}
                              options={unitTypes.map((t) => ({ value: t.name, label: t.name }))}
                              onValueChange={(v) => handleTipeUnitSelect(c.id, selectedPerumahan, v)}
                            />
                          </td>

                          <td style={{ width: "130px", maxWidth: "130px" }} className="py-1 px-2 overflow-hidden align-middle">
                            <input
                              type="text"
                              value={formatRupiah(c.metadata?.hargaUnit)}
                              onChange={(e) => handleFieldChange(c.id, "metadata.hargaUnit", parseRupiahNumber(e.target.value))}
                              placeholder="0"
                              className="w-full text-right bg-transparent px-2 py-1 rounded text-xs font-mono border border-transparent hover:border-border focus:border-emerald-500 focus:bg-background outline-none transition-colors"
                            />
                          </td>

                          <td style={{ width: "145px", maxWidth: "145px" }} className="py-1 px-1 overflow-hidden align-middle">
                            <CellSelect
                              value={c.status ?? "Follow-Up"}
                              options={PROSPECT_STATUS_OPTIONS}
                              onValueChange={(v) => handleFieldChange(c.id, "status", v)}
                            />
                          </td>

                          <td className="py-1 px-2 overflow-hidden align-middle">
                            <textarea
                              value={c.notes ?? ""}
                              onChange={(e) => handleFieldChange(c.id, "notes", e.target.value)}
                              placeholder="Catatan kebutuhan..."
                              className="w-full h-[3.25rem] bg-transparent px-2 py-1 rounded text-xs leading-relaxed border border-transparent hover:border-border focus:border-emerald-500 focus:bg-background outline-none resize-none transition-colors"
                            />
                          </td>

                          <td style={{ width: "64px", maxWidth: "64px" }} className="py-1 px-2 text-center align-middle overflow-hidden">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost" size="icon"
                                className="h-7 w-7 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                                title="Buka percakapan WhatsApp"
                                onClick={() => { if (c.conversations?.[0]?.id) setActiveContactId(c.conversations[0].id); setView("chatbot"); }}
                              >
                                <MessageCircle className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost" size="icon"
                                className="h-7 w-7 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                title="Hapus baris"
                                onClick={() => handleDeleteRow(c.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* ── MOBILE CARDS ── */}
              <div className="md:hidden divide-y divide-border">
                {filteredContacts.map((c, idx) => {
                  const selectedPerumahan = c.metadata?.perumahan ?? perumahanCatalog[0]?.name ?? "";
                  const cluster = perumahanCatalog.find((p) => p.name === selectedPerumahan);
                  const unitTypes = cluster?.types ?? [];
                  const cleanPhone = (c.phone ?? "")
                    .replace(/@(c\.us|s\.whatsapp\.net|lid|broadcast)$/i, "")
                    .replace(/^\+/, "");

                  return (
                    <div key={c.id} className="p-3.5 space-y-3 bg-card">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="h-6 w-6 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold grid place-items-center shrink-0">
                            {idx + 1}
                          </span>
                          <input
                            type="text"
                            value={c.name ?? ""}
                            onChange={(e) => handleFieldChange(c.id, "name", e.target.value)}
                            placeholder="Nama pelanggan..."
                            className="font-bold text-sm text-foreground bg-transparent border-b border-dashed border-border focus:border-emerald-500 outline-none"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600"
                            onClick={() => { if (c.conversations?.[0]?.id) setActiveContactId(c.conversations[0].id); setView("chatbot"); }}>
                            <MessageCircle className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500" onClick={() => handleDeleteRow(c.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-muted-foreground w-24 shrink-0 flex items-center gap-1">
                          <Phone className="h-3 w-3" /> No. WhatsApp:
                        </span>
                        <input
                          type="text"
                          value={cleanPhone}
                          onChange={(e) => handleFieldChange(c.id, "phone", e.target.value)}
                          placeholder="08xxxxxxxxxx"
                          className="flex-1 font-mono text-xs bg-muted/30 px-2 py-1 rounded border border-border"
                        />
                      </div>

                      <MobileCellSelect
                        label="Perumahan"
                        value={selectedPerumahan}
                        options={perumahanCatalog.map((p) => ({ value: p.name, label: p.name }))}
                        onValueChange={(v) => handlePerumahanSelect(c.id, v)}
                      />

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <span className="text-[10px] text-muted-foreground font-medium">Tipe Unit:</span>
                          <Select
                            value={c.metadata?.tipeUnit ?? unitTypes[0]?.name ?? ""}
                            onValueChange={(v) => handleTipeUnitSelect(c.id, selectedPerumahan, v)}
                          >
                            <SelectTrigger size="sm" className="h-8 text-xs w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="text-xs">
                              {unitTypes.map((t) => (
                                <SelectItem key={t.name} value={t.name} className="text-xs">{t.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] text-muted-foreground font-medium">Harga Unit (Rp):</span>
                          <input
                            type="text"
                            value={formatRupiah(c.metadata?.hargaUnit)}
                            onChange={(e) => handleFieldChange(c.id, "metadata.hargaUnit", parseRupiahNumber(e.target.value))}
                            placeholder="0"
                            className="w-full text-xs font-mono bg-muted/30 px-2 py-1 rounded border border-border"
                          />
                        </div>
                      </div>

                      <MobileCellSelect
                        label="Status"
                        value={c.status ?? "Follow-Up"}
                        options={PROSPECT_STATUS_OPTIONS}
                        onValueChange={(v) => handleFieldChange(c.id, "status", v)}
                      />

                      <div className="space-y-1">
                        <span className="text-[10px] text-muted-foreground font-medium">Catatan:</span>
                        <textarea
                          rows={2}
                          value={c.notes ?? ""}
                          onChange={(e) => handleFieldChange(c.id, "notes", e.target.value)}
                          placeholder="Catatan kebutuhan pelanggan..."
                          className="w-full text-xs bg-muted/20 px-2.5 py-1.5 rounded-lg border border-border leading-relaxed resize-none outline-none"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteConfirmId}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
        title="Hapus Data Pelanggan"
        description="Apakah Anda yakin ingin menghapus baris data pelanggan ini? Tindakan ini tidak dapat dibatalkan."
        confirmLabel="Ya, Hapus"
        onConfirm={executeDeleteRow}
      />
    </div>
  );
}
