"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Plus, Search, Edit3, Trash2, CheckCircle2, Clock, XCircle, Wrench, Layers, RefreshCw, Upload, Image, FileVideo, ExternalLink, Play, Copy, Check, Film, BookOpen, Sparkles, FileText, User, AlertTriangle, Home, LandPlot, Building2, SlidersHorizontal, Calculator, Tag, Move, Download, Camera, MapPin, Compass, LayoutGrid, RotateCw, X
} from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { useBackgroundTasksStore } from "@/lib/background-tasks-store";
import { useToast } from "@/hooks/use-toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { checkWahaMediaLink } from "@/lib/waha-link-validator";
import { cn } from "@/lib/utils";
import type { ResourceGroup, ResourceItem, ResourceStatus, PropertyType, PricingTemplate, SiteplanPricingConfig } from "@/lib/types";

/**
 * Membersihkan format harga (menerima "3500000", "3.500.000", maupun "Rp 3.500.000") menjadi angka murni
 */
export function parseIdrPrice(value: string | number | undefined | null): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "number") return isNaN(value) ? undefined : value;
  const cleaned = value.toString().replace(/[^0-9]/g, "");
  if (!cleaned) return undefined;
  const parsed = parseInt(cleaned, 10);
  return isNaN(parsed) ? undefined : parsed;
}

/**
 * Memformat angka ke pemisah ribuan standar Indonesia (contoh: 3500000 -> "3.500.000")
 */
export function formatIdr(value: number | string | undefined | null): string {
  const num = typeof value === "number" ? value : parseIdrPrice(value);
  if (num === undefined) return "0";
  return num.toLocaleString("id-ID");
}

export interface SiteplanMedia {
  id: string;
  name: string;
  url: string;
  type: "image" | "video";
  description?: string;
  createdAt?: string;
}

export interface ClusterKnowledgeItem {
  id: string;
  title: string;
  category: string;
  content: string;
  updatedAt?: string;
}

function parseClusterKnowledge(raw?: string | null): ClusterKnowledgeItem[] {
  if (!raw || !raw.trim()) return [];
  const trimmed = raw.trim();
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {}
  }
  return [
    {
      id: "k-legacy",
      title: "Informasi & Ketentuan Cluster",
      category: "Umum",
      content: trimmed,
      updatedAt: new Date().toISOString().slice(0, 10),
    },
  ];
}

function parseGroupMedia(raw?: string | null): SiteplanMedia[] {
  if (!raw || !raw.trim()) return [];
  const trimmed = raw.trim();
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {}
  }
  return [
    {
      id: "legacy-1",
      name: "Denah Siteplan Utama",
      url: trimmed,
      type: /\.(mp4|webm|ogg|mov|mkv)$/i.test(trimmed) ? "video" : "image",
      description: "Denah perumahan / cluster",
      createdAt: new Date().toISOString().slice(0, 10),
    },
  ];
}

const STATUS_CONFIG: Record<ResourceStatus, { label: string; bg: string; border: string; text: string; icon: any }> = {
  AVAILABLE: {
    label: "Unit Ready",
    bg: "bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50",
    border: "border-emerald-400 dark:border-emerald-700",
    text: "text-emerald-700 dark:text-emerald-300",
    icon: CheckCircle2,
  },
  BOOKED: {
    label: "Proses Bank",
    bg: "bg-orange-50 dark:bg-orange-950/40 hover:bg-orange-100 dark:hover:bg-orange-900/50",
    border: "border-orange-400 dark:border-orange-700",
    text: "text-orange-700 dark:text-orange-300",
    icon: Clock,
  },
  OCCUPIED: {
    label: "Sudah Terjual",
    bg: "bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/50",
    border: "border-red-500 dark:border-red-700",
    text: "text-red-700 dark:text-red-300",
    icon: XCircle,
  },
  MAINTENANCE: {
    label: "Rumah Contoh",
    bg: "bg-zinc-800 dark:bg-zinc-800 hover:bg-zinc-700 dark:hover:bg-zinc-700 text-white",
    border: "border-zinc-900 dark:border-zinc-700",
    text: "text-zinc-100 dark:text-zinc-100",
    icon: Wrench,
  },
};

export function AvailabilityView() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const { runSiteplanMediaUpload } = useBackgroundTasksStore();

  const tenantId = user?.tenantId || "t-123";

  const [groups, setGroups] = useState<ResourceGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [filterPropertyType, setFilterPropertyType] = useState<string>("ALL");
  const [deleteConfirmState, setDeleteConfirmState] = useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  }>({
    open: false,
    title: "",
    description: "",
    onConfirm: () => {},
  });

  // Modal State
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [groupForm, setGroupForm] = useState({ name: "", category: "properti", description: "" });

  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ResourceItem | null>(null);
  const [itemForm, setItemForm] = useState({
    code: "",
    name: "",
    propertyType: "BANGUNAN" as PropertyType | string,
    houseType: "",
    status: "AVAILABLE" as ResourceStatus,
    price: "",
    customerName: "",
    customerPhone: "",
    notes: "",
  });

  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchForm, setBatchForm] = useState({
    prefix: "A-",
    startNumber: "1",
    endNumber: "10",
    propertyType: "BANGUNAN" as PropertyType | string,
    houseType: "",
    price: "",
  });

  // Validation & loading states — Sprint 0 UX fixes
  const [groupError, setGroupError] = useState("");
  const [itemError, setItemError] = useState("");
  const [batchError, setBatchError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Acuan Tipe & Harga Modal State (1 Siteplan = 1 Template)
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isSavingTemplates, setIsSavingTemplates] = useState(false);
  const [pricingForm, setPricingForm] = useState({
    landArea: "",
    landPrice: "",
    buildingType: "",
    buildingPrice: "",
    packageType: "",
    packagePrice: "",
  });

  // Direct Canva-style Mouse Selection, Drag to Move & Resize
  const [viewMode, setViewMode] = useState<"canvas" | "matrix">("canvas");
  const [selectedElement, setSelectedElement] = useState<{ type: "unit" | "road" | "fasos"; id: string } | null>(null);
  const [selectedUnitCodes, setSelectedUnitCodes] = useState<string[]>([]);
  const [persistentGroups, setPersistentGroups] = useState<string[][]>([]);
  const [marqueeBox, setMarqueeBox] = useState<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);

  const [dragAction, setDragAction] = useState<{
    mode: "move" | "resize" | "rotate";
    handle?: "se" | "e" | "s" | "rot";
    type: "unit" | "road" | "fasos";
    id: string;
    startX: number;
    startY: number;
    initialUnitPos?: { x: number; y: number };
    initialMultiUnitPositions?: Record<string, { x: number; y: number }>;
    initialUnitSize?: { width: number; height: number };
    initialRoad?: any;
    initialFasos?: any;
    initialRotation?: number;
  } | null>(null);
  const [isLayoutSettingsOpen, setIsLayoutSettingsOpen] = useState(false);
  const [unitPositions, setUnitPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [unitSize, setUnitSize] = useState<{ width: number; height: number }>({ width: 44, height: 62 });
  const [roads, setRoads] = useState<Array<{
    id: string;
    name: string;
    x: number;
    y: number;
    width: number;
    height: number;
    rotation?: number;
  }>>([
    { id: "road-main", name: "JALAN KOMPLEK", x: 50, y: 49, width: 92, height: 11, rotation: 0 },
  ]);
  const [fasosList, setFasosList] = useState<Array<{
    id: string;
    name: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }>>([
    { id: "fasos-main", name: "FASOS", x: 48, y: 24, width: 8, height: 11 },
  ]);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isGeneratingJpg, setIsGeneratingJpg] = useState(false);

  // Fetch groups
  const fetchGroups = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/availability/groups?tenantId=${tenantId}`);
      if (res.ok) {
        const json = await res.json();
        // NestJS TransformInterceptor membungkus response di dalam properti `data`
        const groupList = Array.isArray(json) ? json : (Array.isArray(json?.data) ? json.data : []);
        setGroups(groupList);
        if (groupList.length > 0 && !selectedGroupId) {
          setSelectedGroupId(groupList[0].id);
        }
      }
    } catch (e) {
      console.error(e);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
    const handleUpdate = () => {
      fetchGroups();
    };
    window.addEventListener("siteplan-updated", handleUpdate);
    return () => {
      window.removeEventListener("siteplan-updated", handleUpdate);
    };
  }, [tenantId]);

  const activeGroup = useMemo(() => {
    const safeGroups = Array.isArray(groups) ? groups : [];
    return safeGroups.find((g) => g.id === selectedGroupId) || safeGroups[0] || null;
  }, [groups, selectedGroupId]);

  // Filtered items
  const filteredItems = useMemo(() => {
    if (!activeGroup || !activeGroup.items) return [];
    const q = searchQuery.toLowerCase();
    return activeGroup.items.filter((item) => {
      const matchSearch =
        item.code.toLowerCase().includes(q) ||
        (item.houseType && item.houseType.toLowerCase().includes(q)) ||
        (item.customerName && item.customerName.toLowerCase().includes(q)) ||
        ((item as any).propertyType && (item as any).propertyType.toLowerCase().includes(q)) ||
        (item.name && item.name.toLowerCase().includes(q));
      const matchStatus = filterStatus === "ALL" || item.status === filterStatus;
      const matchPropertyType =
        filterPropertyType === "ALL" ||
        ((item as any).propertyType || "BANGUNAN") === filterPropertyType;
      return matchSearch && matchStatus && matchPropertyType;
    });
  }, [activeGroup, searchQuery, filterStatus, filterPropertyType]);

  // Memoized siteplan pricing config (1 siteplan = 1 acuan harga)
  const siteplanPricing: SiteplanPricingConfig = useMemo(() => {
    if (!activeGroup?.pricingTemplates) return {};
    try {
      const raw = activeGroup.pricingTemplates;
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      const target = Array.isArray(parsed)
        ? parsed[0]
        : Array.isArray(parsed?.list)
        ? parsed.list[0]
        : parsed;
      if (target && typeof target === "object") {
        return {
          landArea: target.landArea || target.houseType || "",
          landPrice: target.landPrice,
          buildingType: target.buildingType || target.houseType || "",
          buildingPrice: target.buildingPrice,
          packageType: target.packageType || target.houseType || "",
          packagePrice: target.packagePrice,
        };
      }
      return {};
    } catch {
      return {};
    }
  }, [activeGroup?.pricingTemplates]);

  const isIllustrationActive = useMemo(() => {
    if (!activeGroup?.pricingTemplates) return true;
    try {
      const raw = activeGroup.pricingTemplates;
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (parsed && typeof parsed === "object") {
        if (parsed.isIllustrationActive === false || parsed.isSiteplanActive === false) {
          return false;
        }
      }
      return true;
    } catch {
      return true;
    }
  }, [activeGroup?.pricingTemplates]);

  const handleToggleIllustration = async (checked: boolean) => {
    if (!activeGroup) return;
    let existingTemplates: any = {};
    if (activeGroup.pricingTemplates) {
      try {
        existingTemplates =
          typeof activeGroup.pricingTemplates === "string"
            ? JSON.parse(activeGroup.pricingTemplates)
            : activeGroup.pricingTemplates;
      } catch {}
    }
    const updatedTemplates = {
      ...(typeof existingTemplates === "object" ? existingTemplates : {}),
      isIllustrationActive: checked,
      isSiteplanActive: checked,
    };

    try {
      const res = await fetch(`/api/v1/availability/groups/${activeGroup.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pricingTemplates: updatedTemplates }),
      });
      if (res.ok) {
        setGroups((prev) =>
          prev.map((g) => (g.id === activeGroup.id ? { ...g, pricingTemplates: updatedTemplates } : g))
        );
        toast({
          title: checked ? "Ilustrasi Siteplan Diaktifkan" : "Ilustrasi Siteplan Dinonaktifkan",
          description: checked
            ? "Bot AI WhatsApp kini dapat mengirimkan gambar siteplan kepada customer."
            : "Bot AI WhatsApp akan otomatis mengarahkan customer ke nomor kontak tim Marketing jika ada yang meminta siteplan.",
        });
      }
    } catch (e: any) {
      toast({ title: "Gagal Mengubah Status", description: e.message, variant: "destructive" });
    }
  };

  const naturalSortItems = (list: ResourceItem[]) =>
    [...list].sort((a, b) =>
      a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: "base" })
    );

  const saveFullLayout = (
    positions = unitPositions,
    size = unitSize,
    currentRoads = roads,
    currentFasos = fasosList,
    groups = persistentGroups
  ) => {
    if (!activeGroup) return;
    const fullLayout = {
      unitPositions: positions,
      unitWidth: size.width,
      unitHeight: size.height,
      roads: currentRoads,
      fasos: currentFasos,
      groups: groups,
      isIllustrationActive,
    };
    if (typeof window !== "undefined") {
      localStorage.setItem(`siteplan-layout-${activeGroup.id}`, JSON.stringify(fullLayout));
      localStorage.setItem(`siteplan-groups-${activeGroup.id}`, JSON.stringify(groups));
    }
    fetch(`/api/v1/availability/groups/${activeGroup.id}/save-layout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ layout: fullLayout }),
    }).catch(() => {});
  };

  // Layout & Drag Handlers for Interactive Siteplan
  const autoArrangeUnits = (items = activeGroup?.items || []) => {
    if (!items || items.length === 0) {
      setUnitPositions({});
      return;
    }

    const blockA = naturalSortItems(items.filter((i) => i.code.startsWith("A") || i.code.startsWith("a")));
    const blockB = naturalSortItems(items.filter((i) => i.code.startsWith("B") || i.code.startsWith("b")));
    const others = naturalSortItems(
      items.filter(
        (i) => !i.code.startsWith("A") && !i.code.startsWith("a") && !i.code.startsWith("B") && !i.code.startsWith("b")
      )
    );

    let row1 = blockA;
    let row2 = blockB;

    if (row1.length === 0 && row2.length === 0) {
      const half = Math.ceil(items.length / 2);
      row1 = naturalSortItems(items.slice(0, half));
      row2 = naturalSortItems(items.slice(half));
    } else if (others.length > 0) {
      row2 = [...row2, ...others];
    }

    const positions: Record<string, { x: number; y: number }> = {};
    const margin = 7;
    const widthSpan = 86;

    const arrangeRow = (rowItems: ResourceItem[], yPos: number, hasFasosCenter = false) => {
      const count = rowItems.length + (hasFasosCenter ? 1 : 0);
      const step = count > 1 ? widthSpan / (count - 1) : 0;
      const fasosIndex = Math.floor(rowItems.length / 2);
      let colIdx = 0;

      rowItems.forEach((item, idx) => {
        if (hasFasosCenter && idx === fasosIndex) {
          colIdx++;
        }
        const xPos = margin + colIdx * step;
        positions[item.code] = {
          x: Math.round(xPos * 10) / 10,
          y: yPos,
        };
        colIdx++;
      });
    };

    arrangeRow(row1, 24, true);
    arrangeRow(row2, 74, false);

    const defaultRoads = [
      { id: "road-main", name: `JALAN KOMPLEK ${activeGroup ? activeGroup.name : ""}`.trim(), x: 50, y: 49, width: 92, height: 11, orientation: "horizontal" as const },
    ];
    const defaultFasos = [
      { id: "fasos-main", name: "FASOS", x: 48, y: 24, width: 8, height: 11 },
    ];

    setUnitPositions(positions);
    setRoads(defaultRoads);
    setFasosList(defaultFasos);
    saveFullLayout(positions, unitSize, defaultRoads, defaultFasos);
  };

  // Auto-straighten: sejajarkan baris yang berantakan/berot-berot secara otomatis
  const handleAutoStraighten = () => {
    if (!activeGroup || !activeGroup.items?.length) return;
    const items = activeGroup.items;

    const blockA = naturalSortItems(items.filter((i) => i.code.startsWith("A") || i.code.startsWith("a")));
    const blockB = naturalSortItems(items.filter((i) => i.code.startsWith("B") || i.code.startsWith("b")));
    const others = naturalSortItems(
      items.filter(
        (i) => !i.code.startsWith("A") && !i.code.startsWith("a") && !i.code.startsWith("B") && !i.code.startsWith("b")
      )
    );

    let row1 = blockA;
    let row2 = blockB;

    if (row1.length === 0 && row2.length === 0) {
      const half = Math.ceil(items.length / 2);
      row1 = naturalSortItems(items.slice(0, half));
      row2 = naturalSortItems(items.slice(half));
    } else if (others.length > 0) {
      row2 = [...row2, ...others];
    }

    const newPositions: Record<string, { x: number; y: number }> = { ...unitPositions };
    const margin = 7;
    const widthSpan = 86;

    const straightenRow = (rowItems: ResourceItem[], baselineY: number, hasFasosCenter = false) => {
      const count = rowItems.length + (hasFasosCenter ? 1 : 0);
      const step = count > 1 ? widthSpan / (count - 1) : 0;
      const fasosIndex = Math.floor(rowItems.length / 2);
      let colIdx = 0;

      rowItems.forEach((item, idx) => {
        if (hasFasosCenter && idx === fasosIndex) {
          colIdx++;
        }
        newPositions[item.code] = {
          x: Math.round((margin + colIdx * step) * 10) / 10,
          y: baselineY, // lurus sejajar
        };
        colIdx++;
      });
    };

    straightenRow(row1, 24, true);
    straightenRow(row2, 74, false);

    setUnitPositions(newPositions);
    saveFullLayout(newPositions, unitSize, roads, fasosList);
    toast({
      title: "Barisan Kavling Diluruskan!",
      description: "Seluruh kavling berhasil diluruskan secara otomatis (Auto-Straightened) mengikuti garis lurus Blok A & Blok B.",
    });
  };

  useEffect(() => {
    if (!activeGroup) return;
    const items = activeGroup.items || [];
    if (!items.length) {
      setUnitPositions({});
      return;
    }

    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(`siteplan-layout-${activeGroup.id}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === "object") {
            if (parsed.unitPositions) setUnitPositions(parsed.unitPositions);
            else if (!parsed.unitWidth) setUnitPositions(parsed);
            if (parsed.unitWidth && parsed.unitHeight) {
              setUnitSize({ width: Number(parsed.unitWidth), height: Number(parsed.unitHeight) });
            }
            if (Array.isArray(parsed.roads) && parsed.roads.length > 0) setRoads(parsed.roads);
            if (Array.isArray(parsed.fasos) && parsed.fasos.length > 0) setFasosList(parsed.fasos);
          }
        } catch (e) {}
      }

      const savedGroups = localStorage.getItem(`siteplan-groups-${activeGroup.id}`);
      if (savedGroups) {
        try {
          const parsedG = JSON.parse(savedGroups);
          if (Array.isArray(parsedG)) setPersistentGroups(parsedG);
        } catch (e) {}
      }
    }

    const templates = (activeGroup as any).pricingTemplates;
    if (templates?.siteplanLayout) {
      const layout = templates.siteplanLayout;
      if (layout.unitPositions) setUnitPositions(layout.unitPositions);
      if (layout.unitWidth && layout.unitHeight) setUnitSize({ width: Number(layout.unitWidth), height: Number(layout.unitHeight) });
      if (Array.isArray(layout.roads) && layout.roads.length > 0) setRoads(layout.roads);
      if (Array.isArray(layout.fasos) && layout.fasos.length > 0) setFasosList(layout.fasos);
      return;
    }

    autoArrangeUnits(items);
  }, [activeGroup?.id]);

  // Canva-style: Mouse selection, direct drag to move, and resize handles
  const handleElementMouseDown = (
    type: "unit" | "road" | "fasos",
    id: string,
    clientX: number,
    clientY: number,
    e: any
  ) => {
    e.stopPropagation?.();

    let newSelectedCodes = [...selectedUnitCodes];
    if (type === "unit") {
      const groupFound = persistentGroups.find((g) => g.includes(id));
      if (e.shiftKey) {
        if (newSelectedCodes.includes(id)) {
          newSelectedCodes = newSelectedCodes.filter((c) => c !== id);
        } else {
          newSelectedCodes.push(id);
        }
      } else if (groupFound) {
        newSelectedCodes = groupFound;
      } else if (!newSelectedCodes.includes(id)) {
        newSelectedCodes = [id];
      }
      setSelectedUnitCodes(newSelectedCodes);
      if (newSelectedCodes.length === 1) {
        setSelectedElement({ type, id: newSelectedCodes[0] });
      } else {
        setSelectedElement(null);
      }
    } else {
      setSelectedElement({ type, id });
      setSelectedUnitCodes([]);
    }

    let initialUnitPos: { x: number; y: number } | undefined;
    let initialMultiUnitPositions: Record<string, { x: number; y: number }> = {};
    let initialUnitSize: { width: number; height: number } | undefined;
    let initialRoad: any;
    let initialFasos: any;

    if (type === "unit") {
      initialUnitPos = unitPositions[id] || { x: 50, y: 50 };
      initialUnitSize = { ...unitSize };
      newSelectedCodes.forEach((code) => {
        initialMultiUnitPositions[code] = unitPositions[code] || { x: 50, y: 50 };
      });
    } else if (type === "road") {
      initialRoad = roads.find((r) => r.id === id);
    } else if (type === "fasos") {
      initialFasos = fasosList.find((f) => f.id === id);
    }

    setDragAction({
      mode: "move",
      type,
      id,
      startX: clientX,
      startY: clientY,
      initialUnitPos,
      initialMultiUnitPositions,
      initialUnitSize,
      initialRoad,
      initialFasos,
    });
  };

  const handleResizeHandleMouseDown = (
    handle: "se" | "e" | "s",
    type: "unit" | "road" | "fasos",
    id: string,
    clientX: number,
    clientY: number,
    e: any
  ) => {
    e.stopPropagation?.();
    let initialUnitSize: { width: number; height: number } | undefined;
    let initialRoad: any;
    let initialFasos: any;

    if (type === "unit") {
      initialUnitSize = { ...unitSize };
    } else if (type === "road") {
      initialRoad = roads.find((r) => r.id === id);
    } else if (type === "fasos") {
      initialFasos = fasosList.find((f) => f.id === id);
    }

    setDragAction({
      mode: "resize",
      handle,
      type,
      id,
      startX: clientX,
      startY: clientY,
      initialUnitSize,
      initialRoad,
      initialFasos,
    });
  };

  const handleRotateHandleMouseDown = (
    type: "unit" | "road" | "fasos",
    id: string,
    clientX: number,
    clientY: number,
    e: any
  ) => {
    e.stopPropagation?.();
    let initialRoad: any;
    let initialRotation = 0;
    if (type === "road") {
      initialRoad = roads.find((r) => r.id === id);
      initialRotation = initialRoad?.rotation || 0;
    }
    setDragAction({
      mode: "rotate",
      handle: "rot",
      type,
      id,
      startX: clientX,
      startY: clientY,
      initialRoad,
      initialRotation,
    });
  };

  const handleCanvasMouseMove = (clientX: number, clientY: number) => {
    // 1. Marquee selection box dragging
    if (marqueeBox && canvasRef.current) {
      setMarqueeBox((prev) => (prev ? { ...prev, currentX: clientX, currentY: clientY } : null));

      const rect = canvasRef.current.getBoundingClientRect();
      const boxLeft = Math.min(marqueeBox.startX, clientX);
      const boxRight = Math.max(marqueeBox.startX, clientX);
      const boxTop = Math.min(marqueeBox.startY, clientY);
      const boxBottom = Math.max(marqueeBox.startY, clientY);

      const newlySelected: string[] = [];
      (activeGroup?.items || []).forEach((item) => {
        const pos = unitPositions[item.code] || { x: 50, y: 50 };
        const itemPixelX = rect.left + (pos.x / 100) * rect.width;
        const itemPixelY = rect.top + (pos.y / 100) * rect.height;

        if (
          itemPixelX >= boxLeft - unitSize.width / 2 &&
          itemPixelX <= boxRight + unitSize.width / 2 &&
          itemPixelY >= boxTop - unitSize.height / 2 &&
          itemPixelY <= boxBottom + unitSize.height / 2
        ) {
          newlySelected.push(item.code);
        }
      });

      setSelectedUnitCodes(newlySelected);
      if (newlySelected.length === 1) {
        setSelectedElement({ type: "unit", id: newlySelected[0] });
      } else {
        setSelectedElement(null);
      }
      return;
    }

    if (!dragAction || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const deltaPixelX = clientX - dragAction.startX;
    const deltaPixelY = clientY - dragAction.startY;
    const deltaPercentX = (deltaPixelX / rect.width) * 100;
    const deltaPercentY = (deltaPixelY / rect.height) * 100;

    if (dragAction.mode === "move") {
      if (dragAction.type === "unit") {
        if (selectedUnitCodes.length > 1 && dragAction.initialMultiUnitPositions) {
          setUnitPositions((prev) => {
            const updated = { ...prev };
            selectedUnitCodes.forEach((code) => {
              const initialPos = dragAction.initialMultiUnitPositions?.[code];
              if (initialPos) {
                const rawX = initialPos.x + deltaPercentX;
                const rawY = initialPos.y + deltaPercentY;
                updated[code] = {
                  x: Math.max(3, Math.min(97, Math.round(rawX * 10) / 10)),
                  y: Math.max(8, Math.min(92, Math.round(rawY * 10) / 10)),
                };
              }
            });
            return updated;
          });
        } else if (dragAction.initialUnitPos) {
          const rawX = dragAction.initialUnitPos.x + deltaPercentX;
          const rawY = dragAction.initialUnitPos.y + deltaPercentY;
          const clampedX = Math.max(3, Math.min(97, Math.round(rawX * 10) / 10));
          const clampedY = Math.max(8, Math.min(92, Math.round(rawY * 10) / 10));
          setUnitPositions((prev) => ({ ...prev, [dragAction.id]: { x: clampedX, y: clampedY } }));
        }
      } else if (dragAction.type === "road" && dragAction.initialRoad) {
        const rawX = dragAction.initialRoad.x + deltaPercentX;
        const rawY = dragAction.initialRoad.y + deltaPercentY;
        const clampedX = Math.max(8, Math.min(92, Math.round(rawX * 10) / 10));
        const clampedY = Math.max(8, Math.min(92, Math.round(rawY * 10) / 10));
        setRoads((prev) =>
          prev.map((r) => (r.id === dragAction.id ? { ...r, x: clampedX, y: clampedY } : r))
        );
      } else if (dragAction.type === "fasos" && dragAction.initialFasos) {
        const rawX = dragAction.initialFasos.x + deltaPercentX;
        const rawY = dragAction.initialFasos.y + deltaPercentY;
        const clampedX = Math.max(5, Math.min(95, Math.round(rawX * 10) / 10));
        const clampedY = Math.max(8, Math.min(92, Math.round(rawY * 10) / 10));
        setFasosList((prev) =>
          prev.map((f) => (f.id === dragAction.id ? { ...f, x: clampedX, y: clampedY } : f))
        );
      }
    } else if (dragAction.mode === "resize") {
      if (dragAction.type === "unit" && dragAction.initialUnitSize) {
        let newWidth = dragAction.initialUnitSize.width;
        let newHeight = dragAction.initialUnitSize.height;
        if (dragAction.handle === "se" || dragAction.handle === "e") {
          newWidth = Math.max(28, Math.min(95, Math.round(dragAction.initialUnitSize.width + deltaPixelX)));
        }
        if (dragAction.handle === "se" || dragAction.handle === "s") {
          newHeight = Math.max(36, Math.min(130, Math.round(dragAction.initialUnitSize.height + deltaPixelY)));
        }
        setUnitSize({ width: newWidth, height: newHeight });
      } else if (dragAction.type === "road" && dragAction.initialRoad) {
        let newW = dragAction.initialRoad.width;
        let newH = dragAction.initialRoad.height;
        if (dragAction.handle === "se" || dragAction.handle === "e") {
          newW = Math.max(8, Math.min(98, Math.round((dragAction.initialRoad.width + deltaPercentX) * 10) / 10));
        }
        if (dragAction.handle === "se" || dragAction.handle === "s") {
          newH = Math.max(4, Math.min(35, Math.round((dragAction.initialRoad.height + deltaPercentY) * 10) / 10));
        }
        setRoads((prev) =>
          prev.map((r) => (r.id === dragAction.id ? { ...r, width: newW, height: newH } : r))
        );
      } else if (dragAction.type === "fasos" && dragAction.initialFasos) {
        let newW = dragAction.initialFasos.width;
        let newH = dragAction.initialFasos.height;
        if (dragAction.handle === "se" || dragAction.handle === "e") {
          newW = Math.max(4, Math.min(30, Math.round((dragAction.initialFasos.width + deltaPercentX) * 10) / 10));
        }
        if (dragAction.handle === "se" || dragAction.handle === "s") {
          newH = Math.max(6, Math.min(30, Math.round((dragAction.initialFasos.height + deltaPercentY) * 10) / 10));
        }
        setFasosList((prev) =>
          prev.map((f) => (f.id === dragAction.id ? { ...f, width: newW, height: newH } : f))
        );
      }
    } else if (dragAction.mode === "rotate") {
      if (dragAction.type === "road" && dragAction.initialRoad && canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const roadCenterX = rect.left + (dragAction.initialRoad.x / 100) * rect.width;
        const roadCenterY = rect.top + (dragAction.initialRoad.y / 100) * rect.height;

        const angleRad = Math.atan2(clientY - roadCenterY, clientX - roadCenterX);
        let angleDeg = Math.round((angleRad * 180) / Math.PI + 90);
        if (angleDeg < 0) angleDeg += 360;

        for (const snapAngle of [0, 45, 90, 135, 180, 225, 270, 315, 360]) {
          if (Math.abs(angleDeg - snapAngle) <= 4) {
            angleDeg = snapAngle % 360;
            break;
          }
        }

        setRoads((prev) =>
          prev.map((r) => (r.id === dragAction.id ? { ...r, rotation: angleDeg } : r))
        );
      }
    }
  };

  const handleCanvasMouseUp = () => {
    if (marqueeBox) {
      setMarqueeBox(null);
    }
    if (dragAction && activeGroup) {
      setDragAction(null);
      saveFullLayout();
    }
  };

  useEffect(() => {
    if (!dragAction && !marqueeBox) return;

    const handleWindowMouseMove = (e: MouseEvent) => {
      handleCanvasMouseMove(e.clientX, e.clientY);
    };

    const handleWindowMouseUp = () => {
      handleCanvasMouseUp();
    };

    window.addEventListener("mousemove", handleWindowMouseMove);
    window.addEventListener("mouseup", handleWindowMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleWindowMouseMove);
      window.removeEventListener("mouseup", handleWindowMouseUp);
    };
  }, [dragAction, marqueeBox]);

  const handleCanvasBackgroundMouseDown = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current) {
      if (!e.shiftKey) {
        setSelectedElement(null);
        setSelectedUnitCodes([]);
      }
      setMarqueeBox({
        startX: e.clientX,
        startY: e.clientY,
        currentX: e.clientX,
        currentY: e.clientY,
      });
    }
  };

  // Grouping & Auto-Straighten for Selection
  const handleStraightenSelectedHorizontal = () => {
    const targetCodes = selectedUnitCodes.length > 0 ? selectedUnitCodes : Object.keys(unitPositions);
    if (targetCodes.length < 2) return;

    const itemsToStraighten = naturalSortItems(
      (activeGroup?.items || []).filter((i) => targetCodes.includes(i.code))
    );
    if (itemsToStraighten.length < 2) return;

    const avgY =
      itemsToStraighten.reduce((sum, item) => sum + (unitPositions[item.code]?.y || 50), 0) /
      itemsToStraighten.length;
    const straightY = Math.round(avgY * 10) / 10;

    const allX = itemsToStraighten.map((i) => unitPositions[i.code]?.x || 50);
    let minX = Math.min(...allX);
    let maxX = Math.max(...allX);

    if (maxX - minX < 20) {
      const span = Math.min(84, itemsToStraighten.length * 3.6);
      const centerX = (minX + maxX) / 2;
      minX = Math.max(5, centerX - span / 2);
      maxX = Math.min(95, centerX + span / 2);
    }

    const step = (maxX - minX) / (itemsToStraighten.length - 1);
    const newPositions: Record<string, { x: number; y: number }> = { ...unitPositions };

    itemsToStraighten.forEach((item, idx) => {
      newPositions[item.code] = {
        x: Math.round((minX + idx * step) * 10) / 10,
        y: straightY,
      };
    });

    setUnitPositions(newPositions);
    saveFullLayout(newPositions, unitSize, roads, fasosList);
    toast({
      title: "Grup Diluruskan Horizontal!",
      description: `${itemsToStraighten.length} kavling berhasil diluruskan sejajar pada Y: ${straightY}% dengan jarak spasi yang rata.`,
    });
  };

  const handleStraightenSelectedVertical = () => {
    const targetCodes = selectedUnitCodes.length > 0 ? selectedUnitCodes : Object.keys(unitPositions);
    if (targetCodes.length < 2) return;

    const itemsToStraighten = naturalSortItems(
      (activeGroup?.items || []).filter((i) => targetCodes.includes(i.code))
    );
    if (itemsToStraighten.length < 2) return;

    const avgX =
      itemsToStraighten.reduce((sum, item) => sum + (unitPositions[item.code]?.x || 50), 0) /
      itemsToStraighten.length;
    const straightX = Math.round(avgX * 10) / 10;

    const allY = itemsToStraighten.map((i) => unitPositions[i.code]?.y || 50);
    let minY = Math.min(...allY);
    let maxY = Math.max(...allY);

    if (maxY - minY < 15) {
      const span = Math.min(80, itemsToStraighten.length * 5);
      const centerY = (minY + maxY) / 2;
      minY = Math.max(10, centerY - span / 2);
      maxY = Math.min(90, centerY + span / 2);
    }

    const step = (maxY - minY) / (itemsToStraighten.length - 1);
    const newPositions: Record<string, { x: number; y: number }> = { ...unitPositions };

    itemsToStraighten.forEach((item, idx) => {
      newPositions[item.code] = {
        x: straightX,
        y: Math.round((minY + idx * step) * 10) / 10,
      };
    });

    setUnitPositions(newPositions);
    saveFullLayout(newPositions, unitSize, roads, fasosList);
    toast({
      title: "Grup Diluruskan Vertikal!",
      description: `${itemsToStraighten.length} kavling berhasil diluruskan kolom vertikal pada X: ${straightX}% dengan jarak spasi yang rata.`,
    });
  };

  const handleToggleGroup = () => {
    if (selectedUnitCodes.length < 2) return;
    const sortedSelected = naturalSortItems(
      (activeGroup?.items || []).filter((i) => selectedUnitCodes.includes(i.code))
    ).map((i) => i.code);

    const existingIndex = persistentGroups.findIndex((grp) =>
      sortedSelected.every((code) => grp.includes(code)) && grp.length === sortedSelected.length
    );

    let updatedGroups: string[][];
    if (existingIndex !== -1) {
      updatedGroups = persistentGroups.filter((_, idx) => idx !== existingIndex);
      toast({ title: "Ungroup Berhasil", description: "Grup kavling dipisahkan menjadi individu kembali." });
    } else {
      updatedGroups = [...persistentGroups, sortedSelected];
      toast({
        title: "Group Berhasil!",
        description: `${sortedSelected.length} kavling disatukan menjadi 1 grup. Klik salah satu kavling akan otomatis memilih seluruh grup.`,
      });
    }

    setPersistentGroups(updatedGroups);
    if (typeof window !== "undefined" && activeGroup) {
      localStorage.setItem(`siteplan-groups-${activeGroup.id}`, JSON.stringify(updatedGroups));
    }
  };

  const addRoad = () => {
    const newRoad = {
      id: "road-" + Date.now(),
      name: "JALAN BARU",
      x: 50,
      y: 50,
      width: 75,
      height: 10,
      rotation: 0,
    };
    const updated = [...roads, newRoad];
    setRoads(updated);
    setSelectedElement({ type: "road", id: newRoad.id });
    saveFullLayout(unitPositions, unitSize, updated, fasosList);
    toast({ title: "Jalan Ditambahkan", description: "Jalan baru siap digeser, diputar, dan diatur ukurannya dengan mouse." });
  };

  const removeRoad = (roadId: string) => {
    if (roads.length <= 1) {
      toast({ title: "Perhatian", description: "Minimal harus ada 1 jalan komplek.", variant: "destructive" });
      return;
    }
    const updated = roads.filter((r) => r.id !== roadId);
    setRoads(updated);
    saveFullLayout(unitPositions, unitSize, updated, fasosList);
  };

  const getUnitColorConfig = (item: ResourceItem) => {
    const s = String(item.status || "").toUpperCase();
    const n = String(item.notes || "").toUpperCase();
    if (s === "OCCUPIED" || s === "TERJUAL" || n.includes("TERJUAL")) {
      return { bg: "bg-red-500", text: "text-white", border: "border-red-700", ring: "ring-red-400", label: "Sudah Terjual" };
    }
    if (s === "BOOKED" || s === "PROSES_BANK" || n.includes("PROSES BANK") || n.includes("PROSES")) {
      return { bg: "bg-orange-500", text: "text-white", border: "border-orange-600", ring: "ring-orange-400", label: "Proses Bank" };
    }
    if (s === "AVAILABLE" || s === "READY" || n.includes("READY")) {
      return { bg: "bg-emerald-500", text: "text-white", border: "border-emerald-600", ring: "ring-emerald-400", label: "Unit Ready" };
    }
    if (s === "MAINTENANCE" || n.includes("CONTOH") || n.includes("BOOKING")) {
      return { bg: "bg-blue-500", text: "text-white", border: "border-blue-700", ring: "ring-blue-400", label: "Rumah Contoh / Booking" };
    }
    if (n.includes("CASH") || n.includes("TYPE 40") || String(item.houseType || "").includes("40")) {
      return { bg: "bg-cyan-500", text: "text-white", border: "border-cyan-600", ring: "ring-cyan-400", label: "Konsumen Cash / Tipe 40" };
    }
    return { bg: "bg-emerald-500", text: "text-white", border: "border-emerald-600", ring: "ring-emerald-400", label: "Unit Ready" };
  };

  const handleExportSiteplanJpg = async () => {
    if (!activeGroup) return;
    setIsGeneratingJpg(true);
    try {
      const res = await fetch(`/api/v1/availability/groups/${activeGroup.id}/generate-siteplan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const imageUrl = data?.url || data?.data?.url || `/uploads/incoming/siteplan-${activeGroup.id}.jpg`;

      toast({
        title: "Siteplan Berhasil Dibuat & Disimpan!",
        description: `Gambar siteplan JPG "${activeGroup.name}" kini tersimpan dan siap dikirimkan secara otomatis oleh Bot AI WhatsApp.`,
      });

      const link = document.createElement("a");
      link.href = imageUrl;
      link.download = `siteplan-${activeGroup.name.toLowerCase().replace(/\s+/g, "-")}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      fetchGroups();
    } catch (e: any) {
      toast({ title: "Gagal Menyimpan Siteplan", description: e.message, variant: "destructive" });
    } finally {
      setIsGeneratingJpg(false);
    }
  };

  // Statistics
  const stats = useMemo(() => {
    const items = activeGroup?.items || [];
    const available = items.filter((i) => i.status === "AVAILABLE").length;
    const booked = items.filter((i) => i.status === "BOOKED").length;
    const occupied = items.filter((i) => i.status === "OCCUPIED").length;
    const buildingCount = items.filter((i) => ((i as any).propertyType || "BANGUNAN") === "BANGUNAN").length;
    const landCount = items.filter((i) => (i as any).propertyType === "TANAH").length;
    const landBuildingCount = items.filter((i) => (i as any).propertyType === "TANAH_BANGUNAN").length;
    return { total: items.length, available, booked, occupied, buildingCount, landCount, landBuildingCount };
  }, [activeGroup]);

  // Pricing Handlers (1 Siteplan = 1 Template)
  const openPricingModal = () => {
    setPricingForm({
      landArea: siteplanPricing.landArea || "",
      landPrice: siteplanPricing.landPrice ? formatIdr(siteplanPricing.landPrice) : "",
      buildingType: siteplanPricing.buildingType || "",
      buildingPrice: siteplanPricing.buildingPrice ? formatIdr(siteplanPricing.buildingPrice) : "",
      packageType: siteplanPricing.packageType || "",
      packagePrice: siteplanPricing.packagePrice ? formatIdr(siteplanPricing.packagePrice) : "",
    });
    setIsTemplateModalOpen(true);
  };

  const handleSavePricingConfig = async () => {
    if (!activeGroup) return;
    setIsSavingTemplates(true);

    let existingTemplates: any = {};
    if (activeGroup.pricingTemplates) {
      try {
        existingTemplates =
          typeof activeGroup.pricingTemplates === "string"
            ? JSON.parse(activeGroup.pricingTemplates)
            : activeGroup.pricingTemplates;
      } catch {}
    }
    const existingLayout = existingTemplates?.siteplanLayout;

    const payload: any = {
      landArea: pricingForm.landArea.trim(),
      landPrice: parseIdrPrice(pricingForm.landPrice),
      buildingType: pricingForm.buildingType.trim(),
      buildingPrice: parseIdrPrice(pricingForm.buildingPrice),
      packageType: pricingForm.packageType.trim(),
      packagePrice: parseIdrPrice(pricingForm.packagePrice),
      ...(existingLayout ? { siteplanLayout: existingLayout } : {}),
    };
    try {
      const res = await fetch(`/api/v1/availability/groups/${activeGroup.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pricingTemplates: payload }),
      });
      if (res.ok) {
        toast({ title: "Acuan Harga Tersimpan", description: "Acuan tipe dan harga untuk perumahan ini berhasil disimpan." });
        setGroups((prev) =>
          prev.map((g) => (g.id === activeGroup.id ? { ...g, pricingTemplates: payload } : g)),
        );
        setIsTemplateModalOpen(false);
      } else {
        toast({ title: "Gagal menyimpan", description: "Terjadi kesalahan saat menyimpan acuan harga.", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsSavingTemplates(false);
    }
  };

  const handleItemPropertyTypeChange = (newType: string) => {
    let newPrice = itemForm.price;
    let newHouseType = itemForm.houseType;
    if (newType === "TANAH") {
      if (siteplanPricing.landPrice) newPrice = formatIdr(siteplanPricing.landPrice);
      if (siteplanPricing.landArea && (!newHouseType || newHouseType === siteplanPricing.buildingType || newHouseType === siteplanPricing.packageType)) {
        newHouseType = siteplanPricing.landArea;
      }
    } else if (newType === "BANGUNAN") {
      if (siteplanPricing.buildingPrice) newPrice = formatIdr(siteplanPricing.buildingPrice);
      if (siteplanPricing.buildingType && (!newHouseType || newHouseType === siteplanPricing.landArea || newHouseType === siteplanPricing.packageType)) {
        newHouseType = siteplanPricing.buildingType;
      }
    } else if (newType === "TANAH_BANGUNAN") {
      if (siteplanPricing.packagePrice) newPrice = formatIdr(siteplanPricing.packagePrice);
      if (siteplanPricing.packageType && (!newHouseType || newHouseType === siteplanPricing.landArea || newHouseType === siteplanPricing.buildingType)) {
        newHouseType = siteplanPricing.packageType;
      }
    }
    setItemForm((prev) => ({
      ...prev,
      propertyType: newType,
      houseType: newHouseType,
      price: newPrice,
    }));
  };

  const handleBatchPropertyTypeChange = (newType: string) => {
    let newPrice = batchForm.price;
    let newHouseType = batchForm.houseType;
    if (newType === "TANAH") {
      if (siteplanPricing.landPrice) newPrice = formatIdr(siteplanPricing.landPrice);
      if (siteplanPricing.landArea && (!newHouseType || newHouseType === siteplanPricing.buildingType || newHouseType === siteplanPricing.packageType)) {
        newHouseType = siteplanPricing.landArea;
      }
    } else if (newType === "BANGUNAN") {
      if (siteplanPricing.buildingPrice) newPrice = formatIdr(siteplanPricing.buildingPrice);
      if (siteplanPricing.buildingType && (!newHouseType || newHouseType === siteplanPricing.landArea || newHouseType === siteplanPricing.packageType)) {
        newHouseType = siteplanPricing.buildingType;
      }
    } else if (newType === "TANAH_BANGUNAN") {
      if (siteplanPricing.packagePrice) newPrice = formatIdr(siteplanPricing.packagePrice);
      if (siteplanPricing.packageType && (!newHouseType || newHouseType === siteplanPricing.landArea || newHouseType === siteplanPricing.buildingType)) {
        newHouseType = siteplanPricing.packageType;
      }
    }
    setBatchForm((prev) => ({
      ...prev,
      propertyType: newType,
      houseType: newHouseType,
      price: newPrice,
    }));
  };

  // Handlers — with inline validation (F1) + anti-double-submit (F2)
  const handleSaveGroup = async () => {
    const trimmed = groupForm.name.trim();
    if (!trimmed) { setGroupError("Nama perumahan wajib diisi"); return; }
    if (trimmed.length < 3) { setGroupError("Minimal 3 karakter"); return; }
    setGroupError("");
    if (isSaving) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/v1/availability/groups?tenantId=${tenantId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...groupForm, name: trimmed }),
      });
      if (res.ok) {
        toast({ title: "Berhasil", description: "Perumahan baru telah ditambahkan" });
        setIsGroupModalOpen(false);
        setGroupForm({ name: "", category: "properti", description: "" });
        fetchGroups();
      } else {
        const j = await res.json().catch(() => ({}));
        const msg = j.message || j.data?.message || "Gagal menyimpan";
        setGroupError(msg);
        toast({ title: "Gagal", description: msg, variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setIsSaving(false); }
  };

  const handleSaveItem = async () => {
    const code = itemForm.code.trim();
    if (!activeGroup || !code) { setItemError("Nama blok / kode wajib diisi"); return; }
    const parsedPrice = parseIdrPrice(itemForm.price);
    if (itemForm.price && parsedPrice === undefined) { setItemError("Harga harus angka valid"); return; }
    if (parsedPrice !== undefined && parsedPrice < 0) { setItemError("Harga tidak boleh negatif"); return; }
    setItemError("");
    if (isSaving) return;
    setIsSaving(true);
    try {
      const payload = {
        code,
        name: itemForm.name.trim() || undefined,
        propertyType: itemForm.propertyType || "BANGUNAN",
        houseType: itemForm.houseType.trim() || undefined,
        status: itemForm.status,
        price: parsedPrice,
        customerName: itemForm.customerName.trim() || undefined,
        customerPhone: itemForm.customerPhone.trim() || undefined,
        notes: itemForm.notes.trim() || undefined,
      };

      let res;
      if (editingItem) {
        res = await fetch(`/api/v1/availability/items/${editingItem.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`/api/v1/availability/groups/${activeGroup.id}/items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (res.ok) {
        toast({ title: "Berhasil", description: editingItem ? "Data unit diperbarui" : "Unit baru ditambahkan" });
        setIsItemModalOpen(false);
        setEditingItem(null);
        setItemError("");
        fetchGroups();
      } else {
        const j = await res.json().catch(() => ({}));
        const msg = j.message || j.data?.message || "Gagal menyimpan unit";
        setItemError(msg);
        toast({ title: "Gagal", description: msg, variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setIsSaving(false); }
  };

  const handleBatchGenerate = async () => {
    if (!activeGroup) return;
    const prefix = batchForm.prefix.trim();
    if (!prefix) { setBatchError("Prefix blok wajib diisi"); return; }
    
    const startNum = parseInt(batchForm.startNumber, 10);
    const endNum = parseInt(batchForm.endNumber, 10);

    if (isNaN(startNum) || startNum < 1) { setBatchError("Nomor awal harus berupa angka minimal 1"); return; }
    if (isNaN(endNum) || endNum < 1) { setBatchError("Nomor akhir harus berupa angka minimal 1"); return; }
    if (endNum < startNum) { setBatchError("Nomor akhir harus ≥ nomor awal"); return; }
    if (endNum - startNum > 200) { setBatchError("Maksimal 200 unit per batch"); return; }
    const parsedBatchPrice = parseIdrPrice(batchForm.price);
    setBatchError("");
    if (isSaving) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/v1/availability/groups/${activeGroup.id}/batch-items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prefix,
          startNumber: startNum,
          endNumber: endNum,
          propertyType: batchForm.propertyType || "BANGUNAN",
          houseType: batchForm.houseType.trim() || undefined,
          price: parsedBatchPrice,
        }),
      });
      if (res.ok) {
        toast({ title: "Berhasil", description: "Batch unit berhasil digenerate" });
        setIsBatchModalOpen(false);
        setBatchError("");
        fetchGroups();
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setIsSaving(false); }
  };

  const handleItemPriceChange = (val: string) => {
    const raw = val.replace(/[^0-9]/g, "");
    if (!raw) {
      setItemForm({ ...itemForm, price: "" });
      return;
    }
    const formatted = parseInt(raw, 10).toLocaleString("id-ID");
    setItemForm({ ...itemForm, price: formatted });
  };

  const handleBatchPriceChange = (val: string) => {
    const raw = val.replace(/[^0-9]/g, "");
    if (!raw) {
      setBatchForm({ ...batchForm, price: "" });
      return;
    }
    const formatted = parseInt(raw, 10).toLocaleString("id-ID");
    setBatchForm({ ...batchForm, price: formatted });
  };

  // Knowledge Modular Khusus Cluster
  const clusterKnowledgeList = useMemo(() => {
    return parseClusterKnowledge(activeGroup?.description);
  }, [activeGroup?.description]);

  const [isKnowledgeModalOpen, setIsKnowledgeModalOpen] = useState(false);
  const [editingKnowledgeId, setEditingKnowledgeId] = useState<string | null>(null);
  const [knowledgeForm, setKnowledgeForm] = useState({
    title: "",
    category: "Spesifikasi Bangunan",
    content: "",
  });
  const [isSavingKnowledge, setIsSavingKnowledge] = useState(false);

  const openCreateKnowledgeModal = (defaultCat?: string) => {
    setEditingKnowledgeId(null);
    setKnowledgeForm({
      title: "",
      category: defaultCat || "Spesifikasi Bangunan",
      content: "",
    });
    setIsKnowledgeModalOpen(true);
  };

  const openEditKnowledgeModal = (item: ClusterKnowledgeItem) => {
    setEditingKnowledgeId(item.id);
    setKnowledgeForm({
      title: item.title,
      category: item.category || "Umum",
      content: item.content,
    });
    setIsKnowledgeModalOpen(true);
  };

  const handleSaveKnowledgeItem = async () => {
    if (!activeGroup) return;
    if (!knowledgeForm.title.trim() || !knowledgeForm.content.trim()) {
      toast({ title: "Lengkapi data", description: "Judul dan isi knowledge wajib diisi", variant: "destructive" });
      return;
    }

    setIsSavingKnowledge(true);
    try {
      let updated: ClusterKnowledgeItem[];
      if (editingKnowledgeId) {
        updated = clusterKnowledgeList.map((k) =>
          k.id === editingKnowledgeId
            ? {
                ...k,
                title: knowledgeForm.title.trim(),
                category: knowledgeForm.category,
                content: knowledgeForm.content.trim(),
                updatedAt: new Date().toISOString().slice(0, 10),
              }
            : k
        );
      } else {
        const newItem: ClusterKnowledgeItem = {
          id: "k-" + Date.now(),
          title: knowledgeForm.title.trim(),
          category: knowledgeForm.category,
          content: knowledgeForm.content.trim(),
          updatedAt: new Date().toISOString().slice(0, 10),
        };
        updated = [...clusterKnowledgeList, newItem];
      }

      await saveClusterKnowledgeList(updated);
      setIsKnowledgeModalOpen(false);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setIsSavingKnowledge(false);
    }
  };

  const handleDeleteKnowledgeItem = (id: string, title: string) => {
    if (!activeGroup) return;
    setDeleteConfirmState({
      open: true,
      title: "Hapus Panduan Knowledge",
      description: `Apakah Anda yakin ingin menghapus knowledge "${title}" dari cluster ini?`,
      onConfirm: async () => {
        try {
          const updated = clusterKnowledgeList.filter((k) => k.id !== id);
          await saveClusterKnowledgeList(updated);
          toast({ title: "Dihapus", description: "Knowledge cluster berhasil dihapus" });
        } catch (e: any) {
          toast({ title: "Error", description: e.message, variant: "destructive" });
        }
      },
    });
  };

  const saveClusterKnowledgeList = async (list: ClusterKnowledgeItem[]) => {
    if (!activeGroup) return;
    const payload = JSON.stringify(list);
    const res = await fetch(`/api/v1/availability/groups/${activeGroup.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: payload }),
    });
    if (res.ok) {
      toast({ title: "Berhasil", description: "Knowledge cluster berhasil disimpan untuk bot AI" });
      fetchGroups();
    } else {
      throw new Error("Gagal menyimpan ke server");
    }
  };

  // Galeri Foto & Video Properti
  const mediaList = useMemo(() => {
    return parseGroupMedia(activeGroup?.siteplanImage);
  }, [activeGroup?.siteplanImage]);

  // Upload Modal State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState("");
  const [uploadDesc, setUploadDesc] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // Detail & Edit Media Modal State
  const [selectedMedia, setSelectedMedia] = useState<SiteplanMedia | null>(null);
  const [editMediaName, setEditMediaName] = useState("");
  const [editMediaDesc, setEditMediaDesc] = useState("");
  const [isSavingMedia, setIsSavingMedia] = useState(false);

  const handleSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
      if (!uploadName.trim()) {
        const clean = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
        setUploadName(clean);
      }
    }
  };

  const handleUploadNewMedia = () => {
    if (!uploadFile || !activeGroup) {
      toast({ title: "Pilih file", description: "Silakan pilih file gambar atau video terlebih dahulu", variant: "destructive" });
      return;
    }
    if (!uploadName.trim()) {
      toast({ title: "Nama file wajib", description: "Beri nama file agar dikenali oleh bot AI", variant: "destructive" });
      return;
    }

    const currentFile = uploadFile;
    const currentName = uploadName.trim();
    const currentDesc = uploadDesc.trim();
    const currentGroupId = activeGroup.id;
    const currentMediaList = mediaList;

    // Tutup modal langsung agar pengguna bisa langsung melanjutkan pekerjaan
    setIsUploadModalOpen(false);
    setUploadFile(null);
    setUploadName("");
    setUploadDesc("");

    runSiteplanMediaUpload({
      file: currentFile,
      name: currentName,
      description: currentDesc,
      groupId: currentGroupId,
      currentMediaList: currentMediaList,
      onSuccess: () => {
        fetchGroups();
      },
    });
  };

  const openMediaDetail = (m: SiteplanMedia) => {
    setSelectedMedia(m);
    setEditMediaName(m.name);
    setEditMediaDesc(m.description || "");
  };

  const handleUpdateMedia = async () => {
    if (!selectedMedia || !activeGroup) return;
    if (!editMediaName.trim()) {
      toast({ title: "Nama wajib", description: "Nama file tidak boleh kosong", variant: "destructive" });
      return;
    }

    setIsSavingMedia(true);
    try {
      const updated = mediaList.map((m) =>
        m.id === selectedMedia.id
          ? { ...m, name: editMediaName.trim(), description: editMediaDesc.trim() || undefined }
          : m
      );
      await saveMediaList(updated);
      setSelectedMedia(null);
    } catch (err: any) {
      toast({ title: "Gagal Menyimpan", description: err.message, variant: "destructive" });
    } finally {
      setIsSavingMedia(false);
    }
  };

  const handleDeleteMedia = () => {
    if (!selectedMedia || !activeGroup) return;
    setDeleteConfirmState({
      open: true,
      title: "Hapus Media Visual",
      description: `Apakah Anda yakin ingin menghapus media "${selectedMedia.name}" dari cluster ini?`,
      onConfirm: async () => {
        setIsSavingMedia(true);
        try {
          const updated = mediaList.filter((m) => m.id !== selectedMedia.id);
          await saveMediaList(updated);
          setSelectedMedia(null);
        } catch (err: any) {
          toast({ title: "Gagal Menghapus", description: err.message, variant: "destructive" });
        } finally {
          setIsSavingMedia(false);
        }
      },
    });
  };

  const saveMediaList = async (list: SiteplanMedia[]) => {
    if (!activeGroup) return;
    const payload = JSON.stringify(list);
    const res = await fetch(`/api/v1/availability/groups/${activeGroup.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ siteplanImage: payload }),
    });
    if (res.ok) {
      toast({ title: "Tersimpan", description: "Galeri media berhasil diperbarui" });
      fetchGroups();
    } else {
      throw new Error("Gagal menyimpan ke server");
    }
  };

  const handleDeleteItem = (itemId: string) => {
    setDeleteConfirmState({
      open: true,
      title: "Hapus Unit / Slot",
      description: "Apakah Anda yakin ingin menghapus unit kavling/slot ini?",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/v1/availability/items/${itemId}`, { method: "DELETE" });
          if (res.ok) {
            toast({ title: "Dihapus", description: "Unit/slot berhasil dihapus" });
            fetchGroups();
          }
        } catch (err: any) {
          toast({ title: "Error", description: err.message, variant: "destructive" });
        }
      },
    });
  };

  const openEditModal = (item: ResourceItem) => {
    setEditingItem(item);
    setItemForm({
      code: item.code,
      name: item.name || "",
      propertyType: (item as any).propertyType || "BANGUNAN",
      houseType: item.houseType || "",
      status: item.status,
      price: item.price ? formatIdr(item.price) : "",
      customerName: item.customerName || "",
      customerPhone: item.customerPhone || "",
      notes: item.notes || "",
    });
    setIsItemModalOpen(true);
  };

  const openCreateModal = () => {
    setEditingItem(null);
    setItemForm({
      code: "",
      name: "",
      propertyType: "BANGUNAN",
      houseType: siteplanPricing.buildingType || "",
      status: "AVAILABLE",
      price: siteplanPricing.buildingPrice ? formatIdr(siteplanPricing.buildingPrice) : "",
      customerName: "",
      customerPhone: "",
      notes: "",
    });
    setIsItemModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground truncate">Siteplan</h2>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Button variant="outline" size="sm" onClick={fetchGroups} disabled={loading} className="h-8 px-2 text-xs">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline ml-1.5">Refresh</span>
          </Button>
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 px-2.5 text-xs font-semibold shadow-xs" onClick={() => setIsGroupModalOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            <span className="hidden sm:inline">Tambah Perumahan</span>
            <span className="sm:hidden">Perumahan</span>
          </Button>
        </div>
      </div>

      {/* Tabs / Grup Selector & Actions */}
      {groups.length > 0 && (
        <div className="flex items-center justify-between gap-4 overflow-x-auto pb-2 border-b">
          <div className="flex items-center gap-2">
            {groups.map((g) => {
              const isSelected = (activeGroup?.id === g.id);
              return (
                <button
                  key={g.id}
                  onClick={() => setSelectedGroupId(g.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex items-center gap-2 ${
                    isSelected
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "bg-secondary/60 hover:bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Layers className="h-4 w-4" />
                  {g.name}
                  <Badge variant={isSelected ? "outline" : "secondary"} className={`ml-1 text-[11px] ${isSelected ? "text-white border-white/40" : ""}`}>
                    {g.items?.length || 0}
                  </Badge>
                </button>
              );
            })}
          </div>

          {activeGroup && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 shrink-0"
              onClick={() => {
                if (!activeGroup) return;
                setDeleteConfirmState({
                  open: true,
                  title: "Hapus Grup / Cluster",
                  description: `Apakah Anda yakin ingin menghapus seluruh proyek/cluster "${activeGroup.name}" beserta SEMUA unit di dalamnya? Tindakan ini tidak dapat dibatalkan.`,
                  onConfirm: async () => {
                    try {
                      const res = await fetch(`/api/v1/availability/groups/${activeGroup.id}`, { method: "DELETE" });
                      if (res.ok) {
                        toast({ title: "Dihapus", description: "Proyek/Grup berhasil dihapus" });
                        setSelectedGroupId(null);
                        fetchGroups();
                      }
                    } catch (e: any) {
                      toast({ title: "Error", description: e.message, variant: "destructive" });
                    }
                  },
                });
              }}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Hapus Grup Aktif
            </Button>
          )}
        </div>
      )}

      {/* Modular Knowledge Khusus Cluster - Minimalist & Compact */}
      {activeGroup && (
        <Card className="p-3.5 border shadow-2xs space-y-3">
          <div className="flex items-center justify-between gap-3 pb-2 border-b">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 shrink-0">
                <BookOpen className="h-4 w-4" />
              </div>
              <div className="flex items-center gap-2 min-w-0">
                <h4 className="font-bold text-sm text-foreground truncate">
                  Knowledge: {activeGroup.name}
                </h4>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4.5 font-medium shrink-0">
                  {clusterKnowledgeList.length} Topik
                </Badge>
              </div>
            </div>

            <Button
              size="sm"
              onClick={() => openCreateKnowledgeModal()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 px-3 gap-1.5 font-semibold shrink-0 shadow-2xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Tambah Topik</span>
              <span className="sm:hidden">Tambah</span>
            </Button>
          </div>

          {clusterKnowledgeList.length === 0 ? (
            <div className="py-6 px-4 border border-dashed rounded-xl bg-muted/20 text-center space-y-2">
              <p className="text-xs text-muted-foreground">
                Belum ada topik knowledge khusus untuk cluster <strong>{activeGroup.name}</strong>. Pilih topik awal untuk ditambahkan:
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-7 gap-1 border-blue-200 text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                  onClick={() => openCreateKnowledgeModal("Spesifikasi Bangunan")}
                >
                  + Spesifikasi Bangunan
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-7 gap-1 border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                  onClick={() => openCreateKnowledgeModal("Fasilitas & Lingkungan")}
                >
                  + Fasilitas &amp; Lingkungan
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-7 gap-1 border-purple-200 text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950/40"
                  onClick={() => openCreateKnowledgeModal("Promo & Ketentuan KPR")}
                >
                  + Promo &amp; KPR
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
              {clusterKnowledgeList.map((item) => {
                const categoryColor =
                  item.category?.toLowerCase().includes("spesifikasi")
                    ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800"
                    : item.category?.toLowerCase().includes("fasilitas") || item.category?.toLowerCase().includes("lingkungan")
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                    : item.category?.toLowerCase().includes("promo") || item.category?.toLowerCase().includes("kpr")
                    ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800"
                    : "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/40 dark:text-slate-300 dark:border-slate-800";

                return (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl border bg-card hover:border-emerald-500/60 hover:shadow-2xs transition-all flex flex-col justify-between gap-2.5"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <Badge variant="outline" className={`text-[10px] font-semibold py-0 px-2 border ${categoryColor}`}>
                          {item.category || "Umum"}
                        </Badge>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-foreground"
                            onClick={() => openEditKnowledgeModal(item)}
                            title="Edit Topik"
                          >
                            <Edit3 className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                            onClick={() => handleDeleteKnowledgeItem(item.id, item.title)}
                            title="Hapus Topik"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      <h5 className="font-bold text-xs text-foreground line-clamp-1">{item.title}</h5>
                      <p className="text-[11px] text-muted-foreground line-clamp-3 mt-1 font-sans leading-relaxed whitespace-pre-wrap">
                        {item.content}
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-muted-foreground/80 pt-1.5 border-t">
                      <span className="flex items-center gap-1">
                        <Sparkles className="h-3 w-3 text-emerald-600" /> Aktif di AI Bot
                      </span>
                      <button
                        type="button"
                        onClick={() => openEditKnowledgeModal(item)}
                        className="text-emerald-600 hover:underline font-medium"
                      >
                        Buka / Edit
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-3 sm:p-4 flex flex-col justify-between">
          <span className="text-xs sm:text-sm text-muted-foreground font-medium">Total Unit</span>
          <span className="text-xl sm:text-2xl font-bold mt-1.5 sm:mt-2">{stats.total}</span>
        </Card>
        <Card className="p-3 sm:p-4 flex flex-col justify-between border-emerald-200 bg-emerald-50/40 dark:bg-emerald-950/20">
          <span className="text-xs sm:text-sm text-emerald-700 dark:text-emerald-400 font-medium">Unit Ready (Hijau)</span>
          <span className="text-xl sm:text-2xl font-bold text-emerald-600 mt-1.5 sm:mt-2">{stats.available}</span>
        </Card>
        <Card className="p-3 sm:p-4 flex flex-col justify-between border-orange-200 bg-orange-50/40 dark:bg-orange-950/20">
          <span className="text-xs sm:text-sm text-orange-700 dark:text-orange-400 font-medium">Proses Bank (Orange)</span>
          <span className="text-xl sm:text-2xl font-bold text-orange-600 mt-1.5 sm:mt-2">{stats.booked}</span>
        </Card>
        <Card className="p-3 sm:p-4 flex flex-col justify-between border-red-200 bg-red-50/40 dark:bg-red-950/20">
          <span className="text-xs sm:text-sm text-red-700 dark:text-red-400 font-medium">Sudah Terjual (Merah)</span>
          <span className="text-xl sm:text-2xl font-bold text-red-600 mt-1.5 sm:mt-2">{stats.occupied}</span>
        </Card>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari blok, tipe, atau pembeli..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua Status</SelectItem>
              <SelectItem value="AVAILABLE">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                  <span>Unit Ready (Hijau)</span>
                </span>
              </SelectItem>
              <SelectItem value="BOOKED">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                  <span>Proses Bank (Orange)</span>
                </span>
              </SelectItem>
              <SelectItem value="OCCUPIED">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
                  <span>Sudah Terjual (Merah)</span>
                </span>
              </SelectItem>
              <SelectItem value="MAINTENANCE">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-slate-500 shrink-0" />
                  <span>Rumah Contoh (Abu Hitam)</span>
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterPropertyType} onValueChange={setFilterPropertyType}>
            <SelectTrigger className="w-[155px] h-9">
              <SelectValue placeholder="Jenis" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua Jenis</SelectItem>
              <SelectItem value="BANGUNAN">
                <span className="flex items-center gap-2">
                  <Home className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                  <span>Bangunan Rumah ({stats.buildingCount})</span>
                </span>
              </SelectItem>
              <SelectItem value="TANAH">
                <span className="flex items-center gap-2">
                  <LandPlot className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  <span>Tanah Kosong ({stats.landCount})</span>
                </span>
              </SelectItem>
              <SelectItem value="TANAH_BANGUNAN">
                <span className="flex items-center gap-2">
                  <Building2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span>Tanah + Bangunan ({stats.landBuildingCount})</span>
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {activeGroup && (
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={openPricingModal}
              className="h-8.5 text-xs font-semibold border-emerald-300 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 mr-1 text-emerald-600" />
              Acuan Tipe &amp; Harga
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsBatchModalOpen(true)} className="h-8.5 text-xs font-medium">
              + Generate Batch
            </Button>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white h-8.5 text-xs font-semibold shadow-xs" onClick={openCreateModal}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Tambah Unit
            </Button>
          </div>
        )}
      </div>

      {/* Switcher Tab View: Ilustrasi Siteplan vs Grid Matrix */}
      {activeGroup && (
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-2 bg-muted/40 rounded-xl border">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 p-1 bg-background rounded-lg border shadow-2xs">
              <Button
                variant={viewMode === "canvas" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("canvas")}
                className={cn(
                  "h-8 text-xs font-bold gap-1.5",
                  viewMode === "canvas" ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs" : "text-muted-foreground"
                )}
              >
                <MapPin className="h-3.5 w-3.5" />
                <span>Ilustrasi Siteplan</span>
              </Button>
              <Button
                variant={viewMode === "matrix" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("matrix")}
                className={cn(
                  "h-8 text-xs font-bold gap-1.5",
                  viewMode === "matrix" ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs" : "text-muted-foreground"
                )}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span>Daftar Kartu Unit ({filteredItems.length})</span>
              </Button>
            </div>

            {/* Toggle Status Aktif/Nonaktif Ilustrasi Siteplan untuk Bot AI */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-background shadow-2xs">
              <Switch
                checked={isIllustrationActive}
                onCheckedChange={handleToggleIllustration}
                id="toggle-siteplan-active"
              />
              <Label
                htmlFor="toggle-siteplan-active"
                className="text-xs font-bold cursor-pointer select-none flex items-center gap-1.5"
              >
                <span className="text-muted-foreground">Siteplan AI:</span>
                {isIllustrationActive ? (
                  <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 py-0 px-1.5 font-bold">
                    Aktif
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 py-0 px-1.5 font-bold">
                    Nonaktif (Arahkan ke Marketing)
                  </Badge>
                )}
              </Label>
            </div>
          </div>

          {viewMode === "canvas" && (
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={handleAutoStraighten}
                className="h-8 text-xs font-semibold gap-1.5 bg-background border-emerald-300 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                title="Luruskan barisan kavling secara otomatis (Auto-Straighten)"
              >
                <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                <span>Auto-Straighten</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => addRoad()}
                className="h-8 text-xs font-semibold gap-1.5 bg-background"
                title="Tambah jalan komplek baru (bisa digeser & diputar bebas)"
              >
                <Plus className="h-3.5 w-3.5 text-slate-600" />
                <span>+ Jalan</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => autoArrangeUnits()}
                className="h-8 text-xs font-semibold gap-1.5 bg-background"
                title="Tata letak awal Blok A atas & Blok B bawah"
              >
                <Compass className="h-3.5 w-3.5 text-emerald-600" />
                <span className="hidden sm:inline">Susun Ulang</span>
              </Button>
              <Button
                size="sm"
                disabled={isGeneratingJpg}
                onClick={handleExportSiteplanJpg}
                className="bg-blue-600 hover:bg-blue-700 text-white h-8 text-xs font-bold gap-1.5 shadow-xs"
              >
                <Camera className="h-3.5 w-3.5" />
                <span>{isGeneratingJpg ? "Menyimpan..." : "Simpan Gambar JPG"}</span>
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Tampilan 1: Interactive Siteplan Canvas (Direct Canva-style mouse drag & resize) */}
      {viewMode === "canvas" && activeGroup ? (
        <Card className="border shadow-xs overflow-hidden relative">
          <div className="overflow-x-auto">
            <div
              ref={canvasRef}
              onMouseDown={handleCanvasBackgroundMouseDown}
              onMouseMove={(e) => handleCanvasMouseMove(e.clientX, e.clientY)}
              onTouchMove={(e) => {
                if (e.touches[0]) handleCanvasMouseMove(e.touches[0].clientX, e.touches[0].clientY);
              }}
              onMouseUp={handleCanvasMouseUp}
              onTouchEnd={handleCanvasMouseUp}
              className="relative w-full min-h-[670px] bg-slate-50 dark:bg-slate-950/40 p-4 border rounded-xl select-none transition-colors"
              style={{ minWidth: "1150px" }}
            >
              {/* Header Title & Helper Tip */}
              <div className="text-center pt-2 pb-3 pointer-events-none">
                <h2 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100 tracking-wider">
                  SITE PLAN {activeGroup.name.toUpperCase()}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">Canva Mode:</span> Klik &amp; blok area untuk memilih banyak kavling. Seret mouse untuk geser, dan tarik sudut kotak (handle bulat) untuk ubah ukuran. Klik 2x pada kavling untuk ubah status unit.
                </p>
                {!isIllustrationActive && (
                  <div className="mt-2.5 inline-flex items-center gap-1.5 py-1 px-3 rounded-full bg-amber-100 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-[11px] font-semibold shadow-2xs">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                    <span>Mode Nonaktif: Customer yang meminta denah di WhatsApp akan diarahkan ke nomor kontak tim Marketing.</span>
                  </div>
                )}
              </div>

              {/* Canva Rubberband / Marquee Selection Box */}
              {marqueeBox && canvasRef.current && (() => {
                const rect = canvasRef.current.getBoundingClientRect();
                const left = Math.min(marqueeBox.startX, marqueeBox.currentX) - rect.left;
                const top = Math.min(marqueeBox.startY, marqueeBox.currentY) - rect.top;
                const width = Math.abs(marqueeBox.currentX - marqueeBox.startX);
                const height = Math.abs(marqueeBox.currentY - marqueeBox.startY);

                return (
                  <div
                    style={{ left, top, width, height }}
                    className="absolute pointer-events-none border-2 border-blue-500 bg-blue-500/15 rounded-sm z-40 border-dashed animate-in fade-in-50 duration-75"
                  />
                );
              })()}

              {/* Floating Canva Multi-selection & Grouping Bar */}
              {selectedUnitCodes.length > 1 && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-slate-900/95 text-white backdrop-blur-md px-4 py-2 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-2.5 z-40 text-xs animate-in fade-in zoom-in-95 duration-150 pointer-events-auto">
                  <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    {selectedUnitCodes.length} Kavling Terpilih
                  </span>
                  <div className="h-4 w-px bg-slate-700" />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleStraightenSelectedHorizontal}
                    className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1 px-2.5 shadow-xs"
                    title="Luruskan baris horizontal rata Y dengan spasi seragam"
                  >
                    <Sparkles className="h-3 w-3" /> Luruskan Horizontal
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleStraightenSelectedVertical}
                    className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1 px-2.5 shadow-xs"
                    title="Luruskan kolom vertikal rata X dengan spasi seragam"
                  >
                    <Sparkles className="h-3 w-3" /> Luruskan Vertikal
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleToggleGroup}
                    className="h-7 text-xs bg-slate-800 hover:bg-slate-700 text-white border-slate-600 font-medium px-2.5"
                    title="Satukan kavling menjadi satu kesatuan grup"
                  >
                    {persistentGroups.some((g) => selectedUnitCodes.every((c) => g.includes(c)) && g.length === selectedUnitCodes.length)
                      ? "Ungroup"
                      : "Group"}
                  </Button>
                  <button
                    type="button"
                    onClick={() => setSelectedUnitCodes([])}
                    className="p-1 rounded-full text-slate-400 hover:text-white ml-1"
                    title="Batal pilih"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {/* Dynamic Roads (Jalan Komplek Bebas Putar & Tarik Ukuran dengan Mouse) */}
              {roads.map((road) => {
                const isSelected = selectedElement?.type === "road" && selectedElement?.id === road.id;
                const rot = road.rotation || 0;

                return (
                  <div
                    key={road.id}
                    onMouseDown={(e) => handleElementMouseDown("road", road.id, e.clientX, e.clientY, e)}
                    onTouchStart={(e) => {
                      if (e.touches[0]) handleElementMouseDown("road", road.id, e.touches[0].clientX, e.touches[0].clientY, e);
                    }}
                    style={{
                      left: `${road.x}%`,
                      top: `${road.y}%`,
                      width: `${road.width}%`,
                      height: `${road.height}%`,
                      transform: `translate(-50%, -50%) rotate(${rot}deg)`,
                    }}
                    className={cn(
                      "absolute bg-slate-700 dark:bg-slate-800 rounded-lg flex items-center justify-center shadow-inner select-none transition-shadow cursor-move",
                      isSelected ? "ring-2 ring-blue-500 shadow-xl z-20" : "hover:ring-1 hover:ring-slate-500"
                    )}
                    title={`Jalan: ${road.name} (${rot}°)\n(Klik & seret untuk geser. Tarik handle bulat atas untuk memutar sudut)`}
                  >
                    <div className="absolute inset-x-0 h-0 border-t-2 border-dashed border-amber-400 pointer-events-none" />
                    <span className="relative z-10 px-3 py-1 rounded bg-slate-900/90 text-white text-[11px] font-black tracking-widest uppercase shadow-xs truncate max-w-[85%] pointer-events-none">
                      {road.name} {rot !== 0 ? `(${rot}°)` : ""}
                    </span>

                    {/* Canva Rotation Handle & Resize Handles when Road is selected */}
                    {isSelected && (
                      <>
                        {/* Top Rotation Handle (Putar Sudut Bebas dengan Mouse) */}
                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 flex flex-col items-center z-30 pointer-events-auto">
                          <div
                            onMouseDown={(e) => handleRotateHandleMouseDown("road", road.id, e.clientX, e.clientY, e)}
                            onTouchStart={(e) => {
                              if (e.touches[0]) handleRotateHandleMouseDown("road", road.id, e.touches[0].clientX, e.touches[0].clientY, e as any);
                            }}
                            className="h-5.5 w-5.5 rounded-full bg-white border-2 border-blue-600 shadow-lg flex items-center justify-center cursor-grab active:cursor-grabbing hover:scale-125 transition-transform"
                            title={`Putar Sudut Jalan: ${rot}° (Klik & seret memutar dengan mouse)`}
                          >
                            <RotateCw className="h-3 w-3 text-blue-600" />
                          </div>
                          <div className="h-2 w-0.5 bg-blue-500" />
                        </div>

                        {/* Quick 90 deg rotate button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRoads((prev) =>
                              prev.map((r) =>
                                r.id === road.id ? { ...r, rotation: ((r.rotation || 0) + 90) % 360 } : r
                              )
                            );
                            saveFullLayout();
                          }}
                          className="absolute -top-3.5 -left-3.5 h-6 px-1.5 rounded-full bg-slate-800 text-white border border-slate-600 flex items-center gap-1 shadow-md hover:bg-slate-700 text-[10px] font-bold z-30 pointer-events-auto"
                          title="Putar cepat 90 derajat"
                        >
                          <RotateCw className="h-2.5 w-2.5" /> 90°
                        </button>

                        {/* Corner Resize Handle */}
                        <div
                          onMouseDown={(e) => handleResizeHandleMouseDown("se", "road", road.id, e.clientX, e.clientY, e)}
                          onTouchStart={(e) => {
                            if (e.touches[0]) handleResizeHandleMouseDown("se", "road", road.id, e.touches[0].clientX, e.touches[0].clientY, e as any);
                          }}
                          className="absolute -bottom-1.5 -right-1.5 h-3.5 w-3.5 rounded-full bg-white border-2 border-blue-600 shadow-md cursor-se-resize z-30 transition-transform hover:scale-125 pointer-events-auto"
                          title="Tarik untuk ubah panjang & ketebalan jalan"
                        />
                        {/* Right Resize Handle */}
                        <div
                          onMouseDown={(e) => handleResizeHandleMouseDown("e", "road", road.id, e.clientX, e.clientY, e)}
                          onTouchStart={(e) => {
                            if (e.touches[0]) handleResizeHandleMouseDown("e", "road", road.id, e.touches[0].clientX, e.touches[0].clientY, e as any);
                          }}
                          className="absolute top-1/2 -translate-y-1/2 -right-1.5 h-5 w-2 rounded-full bg-white border-2 border-blue-600 shadow-md cursor-e-resize z-30 transition-transform hover:scale-125 pointer-events-auto"
                          title="Tarik untuk perpanjang jalan"
                        />
                        {/* Bottom Resize Handle */}
                        <div
                          onMouseDown={(e) => handleResizeHandleMouseDown("s", "road", road.id, e.clientX, e.clientY, e)}
                          onTouchStart={(e) => {
                            if (e.touches[0]) handleResizeHandleMouseDown("s", "road", road.id, e.touches[0].clientX, e.touches[0].clientY, e as any);
                          }}
                          className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 h-2 w-5 rounded-full bg-white border-2 border-blue-600 shadow-md cursor-s-resize z-30 transition-transform hover:scale-125 pointer-events-auto"
                          title="Tarik untuk atur ketebalan jalan"
                        />
                        {roads.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeRoad(road.id);
                            }}
                            className="absolute -top-3.5 -right-3.5 h-6 w-6 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-md hover:bg-rose-700 z-30 pointer-events-auto"
                            title="Hapus jalan ini"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                );
              })}

              {/* Dynamic FASOS Boxes (Bebas Geser & Tarik Ukuran dengan Mouse) */}
              {fasosList.map((fasos) => {
                const isSelected = selectedElement?.type === "fasos" && selectedElement?.id === fasos.id;

                return (
                  <div
                    key={fasos.id}
                    onMouseDown={(e) => handleElementMouseDown("fasos", fasos.id, e.clientX, e.clientY, e)}
                    onTouchStart={(e) => {
                      if (e.touches[0]) handleElementMouseDown("fasos", fasos.id, e.touches[0].clientX, e.touches[0].clientY, e);
                    }}
                    style={{
                      left: `${fasos.x}%`,
                      top: `${fasos.y}%`,
                      width: `${fasos.width}%`,
                      height: `${fasos.height}%`,
                      transform: "translate(-50%, -50%)",
                    }}
                    className={cn(
                      "absolute rounded-lg bg-amber-100 dark:bg-amber-950/60 border-2 border-amber-500 flex flex-col items-center justify-center shadow-xs select-none cursor-move transition-shadow",
                      isSelected ? "ring-2 ring-blue-500 shadow-xl z-20" : "hover:ring-1 hover:ring-amber-400"
                    )}
                    title="Klik dan seret untuk geser fasos. Tarik handle sudut untuk ubah ukuran."
                  >
                    <span className="text-xs font-black text-amber-800 dark:text-amber-300 pointer-events-none">{fasos.name}</span>
                    <span className="text-[9px] text-amber-700 dark:text-amber-400 font-semibold truncate max-w-[90%] pointer-events-none">Fasilitas Umum</span>

                    {/* Canva Resize Handles when Fasos is selected */}
                    {isSelected && (
                      <>
                        <div
                          onMouseDown={(e) => handleResizeHandleMouseDown("se", "fasos", fasos.id, e.clientX, e.clientY, e)}
                          onTouchStart={(e) => {
                            if (e.touches[0]) handleResizeHandleMouseDown("se", "fasos", fasos.id, e.touches[0].clientX, e.touches[0].clientY, e as any);
                          }}
                          className="absolute -bottom-1.5 -right-1.5 h-3.5 w-3.5 rounded-full bg-white border-2 border-blue-600 shadow-md cursor-se-resize z-30 transition-transform hover:scale-125"
                          title="Tarik untuk ubah lebar & tinggi fasos"
                        />
                        <div
                          onMouseDown={(e) => handleResizeHandleMouseDown("e", "fasos", fasos.id, e.clientX, e.clientY, e)}
                          onTouchStart={(e) => {
                            if (e.touches[0]) handleResizeHandleMouseDown("e", "fasos", fasos.id, e.touches[0].clientX, e.touches[0].clientY, e as any);
                          }}
                          className="absolute top-1/2 -translate-y-1/2 -right-1.5 h-5 w-2 rounded-full bg-white border-2 border-blue-600 shadow-md cursor-e-resize z-30 transition-transform hover:scale-125"
                          title="Tarik untuk ubah lebar fasos"
                        />
                        <div
                          onMouseDown={(e) => handleResizeHandleMouseDown("s", "fasos", fasos.id, e.clientX, e.clientY, e)}
                          onTouchStart={(e) => {
                            if (e.touches[0]) handleResizeHandleMouseDown("s", "fasos", fasos.id, e.touches[0].clientX, e.touches[0].clientY, e as any);
                          }}
                          className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 h-2 w-5 rounded-full bg-white border-2 border-blue-600 shadow-md cursor-s-resize z-30 transition-transform hover:scale-125"
                          title="Tarik untuk ubah tinggi fasos"
                        />
                      </>
                    )}
                  </div>
                );
              })}

              {/* Render Draggable & Resizable Kavling Units (Canva-style) */}
              {filteredItems.map((item) => {
                const pos = unitPositions[item.code] || { x: 50, y: 50 };
                const cfg = getUnitColorConfig(item);
                const isSelected = (selectedElement?.type === "unit" && selectedElement?.id === item.code) || selectedUnitCodes.includes(item.code);
                const isSoloSelected = selectedElement?.type === "unit" && selectedElement?.id === item.code && selectedUnitCodes.length <= 1;
                const isDragging = dragAction?.type === "unit" && (dragAction?.id === item.code || selectedUnitCodes.includes(item.code));

                return (
                  <div
                    key={item.id}
                    onMouseDown={(e) => handleElementMouseDown("unit", item.code, e.clientX, e.clientY, e)}
                    onTouchStart={(e) => {
                      if (e.touches[0]) handleElementMouseDown("unit", item.code, e.touches[0].clientX, e.touches[0].clientY, e);
                    }}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      openEditModal(item);
                    }}
                    style={{
                      left: `${pos.x}%`,
                      top: `${pos.y}%`,
                      width: `${unitSize.width}px`,
                      height: `${unitSize.height}px`,
                      transform: "translate(-50%, -50%)",
                    }}
                    className={cn(
                      "absolute rounded-lg border-2 flex flex-col items-center justify-between p-1 transition-shadow shadow-xs select-none cursor-move",
                      cfg.bg,
                      cfg.border,
                      cfg.text,
                      isSelected ? "ring-2 ring-blue-500 shadow-xl z-20 scale-105" : "hover:scale-105 hover:shadow-md",
                      isDragging && "scale-110 z-30 shadow-2xl opacity-90"
                    )}
                    title={`${item.code} - ${cfg.label}\n(Klik & seret untuk geser. Blok area untuk seleksi banyak. Klik 2x untuk ubah status)`}
                  >
                    <span className="text-xs font-black tracking-tight pointer-events-none">{item.code}</span>
                    <span className="text-[8.5px] font-bold opacity-90 truncate max-w-full pointer-events-none">
                      {item.houseType ? `T-${item.houseType}` : ""}
                    </span>

                    {/* Canva Resize Handles when Unit is single-selected */}
                    {isSoloSelected && (
                      <>
                        <div
                          onMouseDown={(e) => handleResizeHandleMouseDown("se", "unit", item.code, e.clientX, e.clientY, e)}
                          onTouchStart={(e) => {
                            if (e.touches[0]) handleResizeHandleMouseDown("se", "unit", item.code, e.touches[0].clientX, e.touches[0].clientY, e as any);
                          }}
                          className="absolute -bottom-1.5 -right-1.5 h-3.5 w-3.5 rounded-full bg-white border-2 border-blue-600 shadow-md cursor-se-resize z-30 transition-transform hover:scale-125 pointer-events-auto"
                          title="Tarik sudut untuk ubah ukuran kavling rumah"
                        />
                        <div
                          onMouseDown={(e) => handleResizeHandleMouseDown("e", "unit", item.code, e.clientX, e.clientY, e)}
                          onTouchStart={(e) => {
                            if (e.touches[0]) handleResizeHandleMouseDown("e", "unit", item.code, e.touches[0].clientX, e.touches[0].clientY, e as any);
                          }}
                          className="absolute top-1/2 -translate-y-1/2 -right-1.5 h-5 w-2 rounded-full bg-white border-2 border-blue-600 shadow-md cursor-e-resize z-30 transition-transform hover:scale-125 pointer-events-auto"
                          title="Tarik untuk ubah lebar kavling"
                        />
                        <div
                          onMouseDown={(e) => handleResizeHandleMouseDown("s", "unit", item.code, e.clientX, e.clientY, e)}
                          onTouchStart={(e) => {
                            if (e.touches[0]) handleResizeHandleMouseDown("s", "unit", item.code, e.touches[0].clientX, e.touches[0].clientY, e as any);
                          }}
                          className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 h-2 w-5 rounded-full bg-white border-2 border-blue-600 shadow-md cursor-s-resize z-30 transition-transform hover:scale-125 pointer-events-auto"
                          title="Tarik untuk ubah tinggi kavling"
                        />
                        {/* Quick edit status button badge */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(item);
                          }}
                          className="absolute -top-3 -right-3 h-5.5 px-1.5 rounded-full bg-blue-600 text-white flex items-center gap-1 shadow-md hover:bg-blue-700 text-[9px] font-bold z-30 pointer-events-auto"
                          title="Edit status unit kavling"
                        >
                          <Edit3 className="h-2.5 w-2.5" /> Edit
                        </button>
                      </>
                    )}
                  </div>
                );
              })}

              {/* Bottom Legend */}
              <div className="absolute inset-x-8 bottom-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm p-3 rounded-xl border flex flex-wrap items-center justify-between gap-3 text-xs pointer-events-none">
                <div className="flex flex-wrap items-center gap-4">
                  <span className="font-bold text-slate-800 dark:text-slate-100">LEGENDA STATUS:</span>
                  <div className="flex items-center gap-1.5"><span className="h-3.5 w-3.5 rounded bg-red-500 border border-red-700" /><span className="font-semibold">Sudah Terjual</span></div>
                  <div className="flex items-center gap-1.5"><span className="h-3.5 w-3.5 rounded bg-orange-500 border border-orange-600" /><span className="font-semibold">Proses Bank</span></div>
                  <div className="flex items-center gap-1.5"><span className="h-3.5 w-3.5 rounded bg-emerald-500 border border-emerald-600" /><span className="font-semibold">Unit Ready</span></div>
                  <div className="flex items-center gap-1.5"><span className="h-3.5 w-3.5 rounded bg-blue-500 border border-blue-700" /><span className="font-semibold">Rumah Contoh / Booking</span></div>
                  <div className="flex items-center gap-1.5"><span className="h-3.5 w-3.5 rounded bg-cyan-500 border border-cyan-600" /><span className="font-semibold">Konsumen Cash</span></div>
                </div>
                <div className="text-[11px] text-muted-foreground font-medium">
                  Total: {activeGroup.items?.length || 0} Kavling | Ready: {stats.available} | Terjual: {stats.occupied}
                </div>
              </div>
            </div>
          </div>
        </Card>
      ) : null}

      {/* Tampilan 2: Grid Matrix View */}
      {viewMode === "matrix" && (filteredItems.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">
            {!activeGroup
              ? "Belum ada perumahan. Klik 'Tambah Perumahan' di atas untuk memulai."
              : "Belum ada unit yang cocok dengan pencarian Anda."}
          </p>
        </Card>
      ) : (
        <>
          {/* Status Legend & Info Jenis */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs mb-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-emerald-500" /> Tersedia</span>
              <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-amber-500" /> Booking</span>
              <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-rose-500" /> Terjual</span>
              <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-zinc-800 dark:bg-zinc-200" /> Show Unit</span>
            </div>
            <div className="flex items-center gap-3 text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1 font-medium"><Home className="h-3.5 w-3.5 text-blue-500" /> Rumah: {stats.buildingCount}</span>
              <span className="flex items-center gap-1 font-medium"><LandPlot className="h-3.5 w-3.5 text-amber-500" /> Tanah: {stats.landCount}</span>
              <span className="flex items-center gap-1 font-medium"><Building2 className="h-3.5 w-3.5 text-emerald-500" /> Paket: {stats.landBuildingCount}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {filteredItems.map((item) => {
            const conf = STATUS_CONFIG[item.status as ResourceStatus] || STATUS_CONFIG.AVAILABLE;
            const Icon = conf.icon;

            return (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                aria-label={`Edit unit ${item.code} tipe ${item.houseType || "-"} status ${conf.label}`}
                onClick={() => openEditModal(item)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openEditModal(item); }}}
                className={`cursor-pointer rounded-xl border p-3.5 transition-colors relative flex flex-col justify-between gap-3 min-h-[44px] touch-manipulation hover:bg-opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ${conf.bg} ${conf.border}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-extrabold text-base tracking-tight">{item.code}</span>
                      {item.propertyType === "TANAH" ? (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                          Tanah
                        </span>
                      ) : item.propertyType === "TANAH_BANGUNAN" ? (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                          Tanah + Rumah
                        </span>
                      ) : null}
                    </div>
                    {item.houseType ? (
                      <p className="text-xs font-semibold text-muted-foreground">
                        {item.propertyType === "TANAH" ? "Luas " : "Tipe "}{item.houseType}
                      </p>
                    ) : item.name ? (
                      <p className="text-xs text-muted-foreground truncate max-w-[100px]">{item.name}</p>
                    ) : null}
                  </div>
                  <Icon aria-hidden="true" className={`h-4 w-4 shrink-0 ${conf.text}`} />
                </div>

                <div>
                  {item.customerName ? (
                    <div className="text-xs font-medium truncate flex items-center gap-1" title={item.customerName}>
                      <User className="h-3 w-3 shrink-0 text-muted-foreground" />
                      <span className="truncate">{item.customerName}</span>
                    </div>
                  ) : item.price ? (
                    <div className="text-xs font-semibold text-muted-foreground tabular-nums">
                      Rp {Number(item.price).toLocaleString("id-ID")}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">
                      {item.houseType ? `Tipe ${item.houseType}` : "Siap Dipilih"}
                    </div>
                  )}

                  <div className="mt-2 flex items-center justify-between gap-1 overflow-hidden">
                    <span className={`inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-normal px-1.5 py-0.5 rounded-md bg-background/80 truncate ${conf.text}`}>
                      <Icon aria-hidden="true" className="h-3 w-3 shrink-0" /> <span className="truncate">{conf.label}</span>
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Hapus unit ${item.code}`}
                      title={`Hapus ${item.code}`}
                      className="h-8 w-8 min-h-[36px] min-w-[36px] p-0 shrink-0 text-muted-foreground hover:text-destructive touch-manipulation hover:bg-black/5 dark:hover:bg-white/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteItem(item.id);
                      }}
                    >
                      <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        </>
      ))}

      {/* Galeri Foto & Video Properti (Di Bawah List Siteplan) */}
      {activeGroup && (
        <Card className="p-5 border shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                  <Image className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    Galeri Foto &amp; Video Properti ({mediaList.length})
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Koleksi media siteplan, foto rumah, dan video virtual tour. Beri nama pada tiap file agar bot AI WhatsApp dapat mengirimkan foto/video yang tepat saat diminta oleh calon pembeli.
                  </p>
                </div>
              </div>
            </div>

            <Button
              size="sm"
              onClick={() => {
                setUploadFile(null);
                setUploadName("");
                setUploadDesc("");
                setIsUploadModalOpen(true);
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 font-semibold h-9 px-4 shrink-0 shadow-2xs"
            >
              <Upload className="h-4 w-4" /> Upload Foto / Video
            </Button>
          </div>

          {mediaList.length === 0 ? (
            <div className="py-14 border border-dashed rounded-2xl text-center text-xs text-muted-foreground bg-muted/20">
              Belum ada foto atau video properti untuk cluster ini. Klik tombol di atas untuk mengunggah media baru.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {mediaList.map((m) => (
                <div
                  key={m.id}
                  onClick={() => openMediaDetail(m)}
                  className="group rounded-2xl border bg-card overflow-hidden cursor-pointer hover:border-emerald-500 hover:shadow-xs transition-all flex flex-col"
                >
                  {/* Thumbnail */}
                  <div className="h-28 w-full bg-muted relative overflow-hidden flex items-center justify-center">
                    {m.type === "video" ? (
                      <>
                        <video src={m.url} className="w-full h-full object-cover" preload="metadata" />
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/40 transition-colors">
                          <div className="h-8 w-8 rounded-full bg-white/95 text-blue-600 flex items-center justify-center shadow-xs">
                            <Play className="h-3.5 w-3.5 fill-current ml-0.5" />
                          </div>
                        </div>
                      </>
                    ) : (
                      <img
                        src={m.url}
                        alt={m.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                    )}

                    {/* Badge Tipe */}
                    <div className="absolute top-1.5 left-1.5 right-1.5 flex items-center justify-between gap-1 pointer-events-none">
                      <Badge
                        variant="secondary"
                        className={`text-[9px] font-bold px-1.5 py-0 shadow-2xs backdrop-blur-sm ${
                          m.type === "video"
                            ? "bg-blue-600/90 text-white"
                            : "bg-emerald-600/90 text-white"
                        }`}
                      >
                        {m.type === "video" ? "VIDEO" : "FOTO"}
                      </Badge>

                      {(() => {
                        const status = checkWahaMediaLink(m.url);
                        return (
                          <span
                            className={cn(
                              "text-[8px] font-bold px-1.5 py-0.5 rounded-full shadow-2xs backdrop-blur-sm inline-flex items-center gap-1",
                              status.isValid
                                ? "bg-emerald-600/95 text-white"
                                : "bg-amber-600/95 text-white",
                            )}
                            title={status.description}
                          >
                            {status.isValid ? (
                              <CheckCircle2 className="h-2.5 w-2.5" />
                            ) : (
                              <AlertTriangle className="h-2.5 w-2.5" />
                            )}
                            WAHA
                          </span>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Keterangan Singkat */}
                  <div className="p-2.5 flex-1 flex flex-col justify-between">
                    <p className="font-semibold text-xs text-foreground truncate group-hover:text-emerald-600 transition-colors" title={m.name}>
                      {m.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                      {m.description || "Klik untuk detail & kelola"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Modal Pengaturan Tata Letak (Jalan, Ukuran Rumah, Fasos) */}
      <Dialog open={isLayoutSettingsOpen} onOpenChange={setIsLayoutSettingsOpen}>
        <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5 text-emerald-600" />
              Pengaturan Tata Letak Siteplan
            </DialogTitle>
            <DialogDescription className="text-xs">
              Atur ukuran kavling rumah, garis jalan, dan fasos secara fleksibel.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* 1. Ukuran Rumah / Kavling */}
            <div className="p-3.5 border rounded-xl bg-muted/20 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Home className="h-3.5 w-3.5 text-blue-500" /> Ukuran Kotak Rumah (Kavling)
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Lebar: {unitSize.width}px</Label>
                  <input
                    type="range"
                    min="32"
                    max="68"
                    value={unitSize.width}
                    onChange={(e) => {
                      const width = Number(e.target.value);
                      const updated = { ...unitSize, width };
                      setUnitSize(updated);
                      saveFullLayout(unitPositions, updated, roads, fasosList);
                    }}
                    className="w-full accent-emerald-600 cursor-pointer"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Tinggi: {unitSize.height}px</Label>
                  <input
                    type="range"
                    min="40"
                    max="85"
                    value={unitSize.height}
                    onChange={(e) => {
                      const height = Number(e.target.value);
                      const updated = { ...unitSize, height };
                      setUnitSize(updated);
                      saveFullLayout(unitPositions, updated, roads, fasosList);
                    }}
                    className="w-full accent-emerald-600 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* 2. Pengaturan Garis Jalan */}
            <div className="p-3.5 border rounded-xl bg-muted/20 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Garis Jalan Komplek ({roads.length})
                </h4>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => addRoad()}
                  className="h-7 text-[11px] px-2.5 font-medium"
                >
                  + Tambah Jalan
                </Button>
              </div>

              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {roads.map((road) => (
                  <div key={road.id} className="p-2.5 border rounded-lg bg-background space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Input
                        value={road.name}
                        onChange={(e) => {
                          const name = e.target.value;
                          const updated = roads.map((r) => (r.id === road.id ? { ...r, name } : r));
                          setRoads(updated);
                          saveFullLayout(unitPositions, unitSize, updated, fasosList);
                        }}
                        className="h-7 text-xs font-bold"
                        placeholder="Nama Jalan"
                      />
                      {roads.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeRoad(road.id)}
                          className="h-7 w-7 text-rose-500 hover:text-rose-600 shrink-0"
                          title="Hapus Jalan"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-muted-foreground">Sudut Putar: {road.rotation || 0}°</span>
                        <input
                          type="range"
                          min="0"
                          max="360"
                          value={road.rotation || 0}
                          onChange={(e) => {
                            const rotation = Number(e.target.value);
                            const updated = roads.map((r) => (r.id === road.id ? { ...r, rotation } : r));
                            setRoads(updated);
                            saveFullLayout(unitPositions, unitSize, updated, fasosList);
                          }}
                          className="w-full accent-blue-600 cursor-pointer"
                        />
                      </div>
                      <div>
                        <span className="text-muted-foreground">Ketebalan: {Math.round(road.height)}%</span>
                        <input
                          type="range"
                          min="5"
                          max="25"
                          value={road.height}
                          onChange={(e) => {
                            const height = Number(e.target.value);
                            const updated = roads.map((r) => (r.id === road.id ? { ...r, height } : r));
                            setRoads(updated);
                            saveFullLayout(unitPositions, unitSize, updated, fasosList);
                          }}
                          className="w-full accent-slate-600 cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Fasilitas Umum (Fasos) */}
            <div className="p-3.5 border rounded-xl bg-muted/20 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Fasilitas Umum (FASOS)
              </h4>
              {fasosList.map((f) => (
                <div key={f.id} className="p-2.5 border rounded-lg bg-background space-y-2">
                  <Input
                    value={f.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      const updated = fasosList.map((item) => (item.id === f.id ? { ...item, name } : item));
                      setFasosList(updated);
                      saveFullLayout(unitPositions, unitSize, roads, updated);
                    }}
                    className="h-7 text-xs font-bold"
                    placeholder="Nama Fasos"
                  />
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-muted-foreground">Lebar: {Math.round(f.width)}%</span>
                      <input
                        type="range"
                        min="4"
                        max="20"
                        value={f.width}
                        onChange={(e) => {
                          const width = Number(e.target.value);
                          const updated = fasosList.map((item) => (item.id === f.id ? { ...item, width } : item));
                          setFasosList(updated);
                          saveFullLayout(unitPositions, unitSize, roads, updated);
                        }}
                        className="w-full accent-amber-500 cursor-pointer"
                      />
                    </div>
                    <div>
                      <span className="text-muted-foreground">Tinggi: {Math.round(f.height)}%</span>
                      <input
                        type="range"
                        min="6"
                        max="20"
                        value={f.height}
                        onChange={(e) => {
                          const height = Number(e.target.value);
                          const updated = fasosList.map((item) => (item.id === f.id ? { ...item, height } : item));
                          setFasosList(updated);
                          saveFullLayout(unitPositions, unitSize, roads, updated);
                        }}
                        className="w-full accent-amber-500 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              className="bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto"
              onClick={() => setIsLayoutSettingsOpen(false)}
            >
              Simpan &amp; Terapkan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: UPLOAD MEDIA BARU */}
      <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-emerald-600" />
              Upload Foto / Video Properti
            </DialogTitle>
            <DialogDescription>
              File akan disimpan ke storage VPS dan dapat diakses oleh bot AI WhatsApp.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-xs py-1">
            <div>
              <Label>Pilih File Foto atau Video (Wajib)</Label>
              <Input
                type="file"
                accept="image/*,video/*"
                onChange={handleSelectFile}
                className="mt-1 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 file:border-0 file:rounded-md file:mr-2"
              />
              {uploadFile && (
                <p className="text-[11px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
                  <Check className="h-3.5 w-3.5" /> File terpilih: {uploadFile.name} ({(uploadFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>

            <div>
              <Label>Nama File / Judul Media (Wajib)</Label>
              <Input
                value={uploadName}
                onChange={(e) => setUploadName(e.target.value)}
                placeholder="Contoh: Foto Fasad Tipe 36, Denah Siteplan Blok A, Video Virtual Tour"
                className="h-8 mt-1"
              />
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Beri nama yang jelas karena bot AI akan mencocokkan nama ini dengan permintaan pelanggan di WhatsApp.
              </p>
            </div>

            <div>
              <Label>Deskripsi / Keterangan untuk Bot AI (Opsional)</Label>
              <Textarea
                value={uploadDesc}
                onChange={(e) => setUploadDesc(e.target.value)}
                placeholder="Contoh: Tampilan tampak depan rumah minimalis 2 kamar tidur dengan carport luas."
                rows={3}
                className="mt-1 text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsUploadModalOpen(false)}>
              Batal
            </Button>
            <Button
              size="sm"
              onClick={handleUploadNewMedia}
              disabled={isUploading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              {isUploading ? "Mengunggah..." : "Unggah & Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: DETAIL & EDIT MEDIA (CRUD) */}
      <Dialog open={!!selectedMedia} onOpenChange={(open) => { if (!open) setSelectedMedia(null); }}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedMedia?.type === "video" ? <FileVideo className="h-5 w-5 text-blue-600" /> : <Image className="h-5 w-5 text-emerald-600" />}
              Detail &amp; Pengaturan Media
            </DialogTitle>
            <DialogDescription>
              Lihat pratinjau media, edit nama file untuk bot AI, atau hapus media ini.
            </DialogDescription>
          </DialogHeader>

          {selectedMedia && (
            <div className="space-y-4 text-xs">
              {/* Preview Media */}
              <div className="rounded-2xl border bg-black/5 dark:bg-black/30 overflow-hidden flex items-center justify-center p-2">
                {selectedMedia.type === "video" ? (
                  <video
                    controls
                    preload="metadata"
                    playsInline
                    src={selectedMedia.url}
                    className="w-full max-h-72 rounded-xl bg-black"
                  />
                ) : (
                  <img src={selectedMedia.url} alt={selectedMedia.name} className="w-full max-h-72 object-contain rounded-xl" />
                )}
              </div>

              {/* Form Edit */}
              <div className="space-y-3">
                <div>
                  <Label>Nama File / Judul Media</Label>
                  <Input
                    value={editMediaName}
                    onChange={(e) => setEditMediaName(e.target.value)}
                    className="h-8 mt-1"
                  />
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Nama yang digunakan oleh bot AI untuk mencocokkan pertanyaan customer di WhatsApp.
                  </p>
                </div>

                <div>
                  <Label>Deskripsi / Kata Kunci untuk Bot AI</Label>
                  <Textarea
                    value={editMediaDesc}
                    onChange={(e) => setEditMediaDesc(e.target.value)}
                    rows={2}
                    className="mt-1 text-xs"
                    placeholder="Keterangan gambar atau spesifikasi unit terkait..."
                  />
                </div>

                <div>
                  <Label>URL File di VPS Storage</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      readOnly
                      value={selectedMedia.url}
                      className="h-8 font-mono text-[11px] bg-muted/40"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs shrink-0 gap-1"
                      onClick={() => {
                        navigator.clipboard.writeText(window.location.origin + selectedMedia.url);
                        toast({ title: "Disalin!", description: "Link URL media disalin ke clipboard" });
                      }}
                    >
                      <Copy className="h-3.5 w-3.5" /> Salin URL
                    </Button>
                    <a
                      href={selectedMedia.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center h-8 px-2.5 rounded-md border text-xs text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 shrink-0 gap-1"
                    >
                      Buka <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>

                  {/* WAHA Link Validity Status */}
                  {(() => {
                    const status = checkWahaMediaLink(selectedMedia.url);
                    return (
                      <div
                        className={cn(
                          "flex items-center gap-2 p-2 rounded-lg border text-[11px] mt-1.5",
                          status.isValid
                            ? "bg-emerald-50/70 border-emerald-300 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300"
                            : "bg-amber-50/70 border-amber-300 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300",
                        )}
                      >
                        {status.isValid ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                        )}
                        <span className="font-semibold">{status.statusText}: </span>
                        <span className="opacity-90">{status.description}</span>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex items-center justify-between sm:justify-between w-full pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isSavingMedia}
              onClick={handleDeleteMedia}
              className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Hapus Media
            </Button>

            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setSelectedMedia(null)}>
                Tutup
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={isSavingMedia}
                onClick={handleUpdateMedia}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              >
                {isSavingMedia ? "Menyimpan..." : "Simpan Perubahan"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Tambah Perumahan */}
      <Dialog open={isGroupModalOpen} onOpenChange={setIsGroupModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Perumahan Baru</DialogTitle>
            <DialogDescription>
              Buat nama perumahan atau cluster proyek untuk denah siteplan.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="groupName">Nama Perumahan</Label>
              <Input
                id="groupName"
                placeholder="misal: Cluster Grand Harmoni, Griya Amanah 2"
                value={groupForm.name}
                onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="category">Kategori</Label>
              <Select
                value={groupForm.category}
                onValueChange={(val) => setGroupForm({ ...groupForm, category: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="properti">Properti / Perumahan</SelectItem>
                  <SelectItem value="lainnya">Lainnya</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="desc">Deskripsi Singkat</Label>
              <Textarea
                id="desc"
                placeholder="Catatan informasi seputar proyek atau area ini..."
                value={groupForm.description}
                onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })}
              />
            </div>
            {groupError && <p role="alert" className="text-xs text-destructive">{groupError}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsGroupModalOpen(false); setGroupError(""); }}>Batal</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleSaveGroup} disabled={isSaving}>{isSaving ? "Menyimpan..." : "Simpan"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Tambah / Edit Unit Siteplan */}
      <Dialog open={isItemModalOpen} onOpenChange={setIsItemModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? `Edit Unit (${editingItem.code})` : "Tambah Unit Baru"}</DialogTitle>
            <DialogDescription>
              Atur nama blok, tipe rumah, harga, dan status ketersediaan unit.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="unitCode">Nama Blok / Kode *</Label>
                <Input
                  id="unitCode"
                  placeholder="misal: Blok A-01, B-12"
                  value={itemForm.code}
                  aria-invalid={!!itemError}
                  onChange={(e) => { setItemForm({ ...itemForm, code: e.target.value }); if (itemError) setItemError(""); }}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={itemForm.status}
                  onValueChange={(val: ResourceStatus) => setItemForm({ ...itemForm, status: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AVAILABLE">
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                        <span>Unit Ready</span>
                      </span>
                    </SelectItem>
                    <SelectItem value="BOOKED">
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                        <span>Proses Bank</span>
                      </span>
                    </SelectItem>
                    <SelectItem value="OCCUPIED">
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
                        <span>Sudah Terjual</span>
                      </span>
                    </SelectItem>
                    <SelectItem value="MAINTENANCE">
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-slate-500 shrink-0" />
                        <span>Rumah Contoh</span>
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="propertyType">Jenis</Label>
                <Select
                  value={itemForm.propertyType}
                  onValueChange={handleItemPropertyTypeChange}
                >
                  <SelectTrigger id="propertyType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BANGUNAN">
                      <span className="flex items-center gap-2">
                        <Home className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                        <span>Bangunan Rumah</span>
                      </span>
                    </SelectItem>
                    <SelectItem value="TANAH">
                      <span className="flex items-center gap-2">
                        <LandPlot className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        <span>Tanah Kosong</span>
                      </span>
                    </SelectItem>
                    <SelectItem value="TANAH_BANGUNAN">
                      <span className="flex items-center gap-2">
                        <Building2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        <span>Tanah + Bangunan</span>
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="houseType">
                  {itemForm.propertyType === "TANAH" ? "Luas / Tipe Kavling" : itemForm.propertyType === "TANAH_BANGUNAN" ? "Tipe Rumah & Kavling" : "Tipe Rumah"}
                </Label>
                <Input
                  id="houseType"
                  placeholder={itemForm.propertyType === "TANAH" ? "misal: 10x15, 150m2" : "misal: 36/72, 45/90"}
                  value={itemForm.houseType}
                  onChange={(e) => setItemForm({ ...itemForm, houseType: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="unitPrice">Harga (Opsional)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">Rp</span>
                  <Input
                    id="unitPrice"
                    type="text"
                    placeholder="misal: 350.000.000"
                    value={itemForm.price}
                    onChange={(e) => handleItemPriceChange(e.target.value)}
                    className="pl-9 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="unitName">Nama Perumahan (Opsional)</Label>
                <Input
                  id="unitName"
                  placeholder="misal: Grand Harmoni, Griya Amanah"
                  value={itemForm.name}
                  onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                />
              </div>
            </div>

            {/* Jika Status Booking / Occupied */}
            {(itemForm.status === "BOOKED" || itemForm.status === "OCCUPIED") && (
              <div className="p-3 bg-secondary/50 rounded-lg space-y-3 border">
                <span className="text-xs font-bold text-muted-foreground uppercase">Informasi Pemesan / Penghuni</span>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="custName" className="text-xs">Nama Pembeli</Label>
                    <Input
                      id="custName"
                      placeholder="Bpk. Budi Santoso"
                      value={itemForm.customerName}
                      onChange={(e) => setItemForm({ ...itemForm, customerName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="custPhone" className="text-xs">Nomor WhatsApp</Label>
                    <Input
                      id="custPhone"
                      placeholder="08123456789"
                      value={itemForm.customerPhone}
                      onChange={(e) => setItemForm({ ...itemForm, customerPhone: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="notes">Catatan Tambahan</Label>
              <Textarea
                id="notes"
                placeholder="Catatan DP, progress bangunan, dll..."
                value={itemForm.notes}
                onChange={(e) => setItemForm({ ...itemForm, notes: e.target.value })}
              />
            </div>
            {itemError && <p role="alert" aria-live="polite" className="text-xs text-destructive">{itemError}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsItemModalOpen(false); setItemError(""); }}>Batal</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleSaveItem} disabled={isSaving}>{isSaving ? "Menyimpan..." : "Simpan Unit"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Batch Generator Siteplan */}
      <Dialog open={isBatchModalOpen} onOpenChange={(open) => { setIsBatchModalOpen(open); if (!open) setBatchError(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Batch Unit Siteplan</DialogTitle>
            <DialogDescription>
              Buat banyak blok sekaligus dengan urutan nomor otomatis (misal Blok A-01 s/d A-20).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={(e) => { e.preventDefault(); handleBatchGenerate(); }} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="prefix">Prefix Blok</Label>
              <Input
                id="prefix"
                placeholder="misal: Blok A-, Blok B-"
                value={batchForm.prefix}
                onChange={(e) => { setBatchForm({ ...batchForm, prefix: e.target.value }); if (batchError) setBatchError(""); }}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="startNum">Nomor Awal</Label>
                <Input
                  id="startNum"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="1"
                  value={batchForm.startNumber}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    setBatchForm({ ...batchForm, startNumber: val });
                    if (batchError) setBatchError("");
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="endNum">Nomor Akhir</Label>
                <Input
                  id="endNum"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="10"
                  value={batchForm.endNumber}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    setBatchForm({ ...batchForm, endNumber: val });
                    if (batchError) setBatchError("");
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="batchPropertyType">Jenis Default</Label>
                <Select
                  value={batchForm.propertyType}
                  onValueChange={handleBatchPropertyTypeChange}
                >
                  <SelectTrigger id="batchPropertyType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BANGUNAN">
                      <span className="flex items-center gap-2">
                        <Home className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                        <span>Bangunan Rumah</span>
                      </span>
                    </SelectItem>
                    <SelectItem value="TANAH">
                      <span className="flex items-center gap-2">
                        <LandPlot className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        <span>Tanah Kosong</span>
                      </span>
                    </SelectItem>
                    <SelectItem value="TANAH_BANGUNAN">
                      <span className="flex items-center gap-2">
                        <Building2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        <span>Tanah + Bangunan</span>
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="batchHouseType">
                  {batchForm.propertyType === "TANAH" ? "Luas / Tipe Default" : batchForm.propertyType === "TANAH_BANGUNAN" ? "Tipe Rumah & Kavling" : "Tipe Rumah Default"}
                </Label>
                <Input
                  id="batchHouseType"
                  placeholder={batchForm.propertyType === "TANAH" ? "misal: 10x15" : "misal: 36/72"}
                  value={batchForm.houseType}
                  onChange={(e) => setBatchForm({ ...batchForm, houseType: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="batchPrice">Harga Default (Opsional)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">Rp</span>
                <Input
                  id="batchPrice"
                  type="text"
                  placeholder="misal: 350.000.000"
                  value={batchForm.price}
                  onChange={(e) => handleBatchPriceChange(e.target.value)}
                  className="pl-9 font-mono"
                />
              </div>
            </div>
            {batchError && <p role="alert" className="text-xs text-destructive font-medium">{batchError}</p>}

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => { setIsBatchModalOpen(false); setBatchError(""); }}>Batal</Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={isSaving}>
                {isSaving ? "Memproses..." : "Generate Sekarang"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG: TAMBAH / EDIT KNOWLEDGE KHUSUS CLUSTER */}
      <Dialog open={isKnowledgeModalOpen} onOpenChange={setIsKnowledgeModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-emerald-600" />
              {editingKnowledgeId ? "Edit Topik Knowledge Cluster" : "Tambah Topik Knowledge Cluster"}
            </DialogTitle>
            <DialogDescription>
              Tuliskan informasi spesifik cluster <strong>{activeGroup?.name}</strong>. Bot AI WhatsApp otomatis memprioritaskan informasi ini saat calon pembeli bertanya.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 text-xs py-1">
            <div className="space-y-1">
              <Label>Judul Topik (Wajib)</Label>
              <Input
                value={knowledgeForm.title}
                onChange={(e) => setKnowledgeForm({ ...knowledgeForm, title: e.target.value })}
                placeholder="Contoh: Detail Spesifikasi Rumah Tipe 36, Fasilitas & Lingkungan Cluster"
                className="h-8 mt-1"
              />
            </div>

            <div className="space-y-1">
              <Label>Kategori Topik</Label>
              <Select value={knowledgeForm.category} onValueChange={(v) => setKnowledgeForm({ ...knowledgeForm, category: v })}>
                <SelectTrigger size="sm" className="mt-1 h-8 w-full text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="Spesifikasi Bangunan" className="text-xs">Spesifikasi Bangunan (Material, Pondasi, Listrik, Air)</SelectItem>
                  <SelectItem value="Fasilitas & Lingkungan" className="text-xs">Fasilitas &amp; Lingkungan (Keamanan, Taman, One Gate)</SelectItem>
                  <SelectItem value="Akses & Lokasi" className="text-xs">Akses &amp; Lokasi (Dekat Tol, Stasiun, Sekolah)</SelectItem>
                  <SelectItem value="Promo & Ketentuan KPR" className="text-xs">Promo &amp; Ketentuan KPR (DP 0%, Subsidi, Akad)</SelectItem>
                  <SelectItem value="Umum / Lainnya" className="text-xs">Umum / Lainnya</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Isi Penjelasan Knowledge (Wajib)</Label>
              <Textarea
                rows={7}
                value={knowledgeForm.content}
                onChange={(e) => setKnowledgeForm({ ...knowledgeForm, content: e.target.value })}
                placeholder="Tuliskan poin-poin informasi lengkap yang perlu diketahui calon pembeli..."
                className="font-sans leading-relaxed text-xs"
              />
            </div>

            <div className="p-3 bg-muted/40 rounded-xl border space-y-1 text-[11px] text-muted-foreground">
              <span className="font-semibold text-foreground flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5 text-emerald-600" /> Tips untuk AI yang Akurat:
              </span>
              <p>Tuliskan sedetail mungkin merek atau ukuran (misal: "Lantai granit 60x60, listrik 1300 Watt, air sumur bor jetpump dengan toren 500L").</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsKnowledgeModalOpen(false)}>
              Batal
            </Button>
            <Button
              size="sm"
              disabled={isSavingKnowledge}
              onClick={handleSaveKnowledgeItem}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              {isSavingKnowledge ? "Menyimpan..." : "Simpan Topik Knowledge"}
            </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* DIALOG: ACUAN TIPE & HARGA PERUMAHAN (1 Siteplan = 1 Template) */}
        <Dialog open={isTemplateModalOpen} onOpenChange={setIsTemplateModalOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader className="pb-1">
              <DialogTitle className="flex items-center gap-2 text-base font-bold">
                <SlidersHorizontal className="h-5 w-5 text-emerald-600" />
                Acuan Tipe &amp; Harga ({activeGroup?.name})
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
                Tentukan luas, tipe, dan harga acuan perumahan ini. Form unit otomatis mengisi nilai ini dan Bot AI WhatsApp menjadikannya acuan resmi.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* 1. Tanah Saja */}
              <div className="p-3.5 rounded-xl border bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 space-y-2.5">
                <div className="flex items-center gap-2">
                  <LandPlot className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <span className="font-bold text-xs text-amber-900 dark:text-amber-200">1. Tanah Kosong Saja</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="cfgLandArea" className="text-xs">Luas / Kavling</Label>
                    <Input
                      id="cfgLandArea"
                      placeholder="misal: 120 m² / 10x12"
                      value={pricingForm.landArea}
                      onChange={(e) => setPricingForm({ ...pricingForm, landArea: e.target.value })}
                      className="h-8 text-xs bg-background"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="cfgLandPrice" className="text-xs">Harga Tanah (Rp)</Label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">Rp</span>
                      <Input
                        id="cfgLandPrice"
                        placeholder="80.000.000"
                        value={pricingForm.landPrice}
                        onChange={(e) => setPricingForm({ ...pricingForm, landPrice: formatIdr(e.target.value) })}
                        className="h-8 pl-8 font-mono text-xs bg-background"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Bangunan Saja */}
              <div className="p-3.5 rounded-xl border bg-blue-50/40 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 space-y-2.5">
                <div className="flex items-center gap-2">
                  <Home className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span className="font-bold text-xs text-blue-900 dark:text-blue-200">2. Bangunan Rumah Saja</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="cfgBuildingType" className="text-xs">Tipe Bangunan</Label>
                    <Input
                      id="cfgBuildingType"
                      placeholder="misal: 36, 45, dsb"
                      value={pricingForm.buildingType}
                      onChange={(e) => setPricingForm({ ...pricingForm, buildingType: e.target.value })}
                      className="h-8 text-xs bg-background"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="cfgBuildingPrice" className="text-xs">Harga Bangunan (Rp)</Label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">Rp</span>
                      <Input
                        id="cfgBuildingPrice"
                        placeholder="102.000.000"
                        value={pricingForm.buildingPrice}
                        onChange={(e) => setPricingForm({ ...pricingForm, buildingPrice: formatIdr(e.target.value) })}
                        className="h-8 pl-8 font-mono text-xs bg-background"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Paket Tanah + Bangunan */}
              <div className="p-3.5 rounded-xl border bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 space-y-2.5">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="font-bold text-xs text-emerald-900 dark:text-emerald-200">3. Paket (Tanah + Bangunan)</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="cfgPackageType" className="text-xs">Tipe Rumah &amp; Kavling</Label>
                    <Input
                      id="cfgPackageType"
                      placeholder="misal: 36/120"
                      value={pricingForm.packageType}
                      onChange={(e) => setPricingForm({ ...pricingForm, packageType: e.target.value })}
                      className="h-8 text-xs bg-background"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="cfgPackagePrice" className="text-xs">Harga Paket (Rp)</Label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">Rp</span>
                      <Input
                        id="cfgPackagePrice"
                        placeholder="182.000.000"
                        value={pricingForm.packagePrice}
                        onChange={(e) => setPricingForm({ ...pricingForm, packagePrice: formatIdr(e.target.value) })}
                        className="h-8 pl-8 font-mono text-xs font-bold bg-background"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button variant="outline" size="sm" onClick={() => setIsTemplateModalOpen(false)}>
                Batal
              </Button>
              <Button
                size="sm"
                disabled={isSavingTemplates}
                onClick={handleSavePricingConfig}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs"
              >
                {isSavingTemplates ? "Menyimpan..." : "Simpan Acuan Harga"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <ConfirmDialog
          open={deleteConfirmState.open}
          onOpenChange={(open) => setDeleteConfirmState((prev) => ({ ...prev, open }))}
          title={deleteConfirmState.title}
          description={deleteConfirmState.description}
          confirmLabel="Ya, Hapus"
          onConfirm={deleteConfirmState.onConfirm}
        />
      </div>
    );
  }
