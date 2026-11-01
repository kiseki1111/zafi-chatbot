"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuthStore } from "@/lib/auth-store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  Layers,
  Sparkles,
  RefreshCw,
  AlertCircle,
  Tag,
  CheckCircle2,
  Boxes,
  Image as ImageIcon,
  Lock,
  Upload,
  Play,
  FileText,
  X,
  Video,
} from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useBackgroundTasksStore } from "@/lib/background-tasks-store";

export interface VariationOption {
  id: string;
  name: string;
  price: number;
  stock: number;
}

export interface ProductImage {
  url: string;
  description: string;
}

// Format angka ke gaya Indonesia: 250000000 -> "250.000.000"
const formatIdr = (n: number | string): string => {
  const num = Number(n) || 0;
  return num.toLocaleString("id-ID");
};

// Parse "250.000.000" / "250000000" -> 250000000
const parseIdr = (s: string): number => {
  const digits = s.replace(/[^\d]/g, "");
  return digits ? parseInt(digits, 10) : 0;
};

// Normalisasi format lama (string[]) dan baru (objek {url, description})
const normalizeImages = (imgs: any[] | undefined | null): ProductImage[] => {
  if (!Array.isArray(imgs)) return [];
  return imgs
    .map((img) =>
      typeof img === "string"
        ? { url: img, description: "" }
        : { url: img?.url || "", description: img?.description || "" }
    )
    .filter((img) => img.url);
};

// ponytail: satu helper untuk daftar gambar produk — attributes.images jika ada,
// fallback ke imageUrl legacy. Menghindari dobel-panggil normalizeImages per baris.
const productImages = (p: { attributes?: any; imageUrl?: string }): ProductImage[] => {
  const imgs = normalizeImages(p.attributes?.images);
  return imgs.length > 0
    ? imgs
    : p.imageUrl
    ? [{ url: p.imageUrl, description: "" }]
    : [];
};

// Hitung total stok & harga minimum dari daftar variasi.
// ponytail: harga 0 di-skip saat hitung min — dianggap belum diisi, bukan harga gratis.
const calcVariationTotals = (vars: VariationOption[]): { totalStock: number; minPrice: number } => {
  const totalStock = vars.reduce((acc, v) => acc + (Number(v.stock) || 0), 0);
  const prices = vars.map((v) => Number(v.price) || 0).filter((p) => p > 0);
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  return { totalStock, minPrice };
};

export interface ProductItem {
  id: string;
  name: string;
  category: string;
  price: number | string;
  stock: number;
  description?: string;
  imageUrl?: string;
  attributes?: {
    images?: (string | ProductImage)[];
    videoUrl?: string;
    hasVariations?: boolean;
    variationType?: string;
    variations?: VariationOption[];
    [key: string]: any;
  } | any;
  createdAt?: string;
  updatedAt?: string;
}

const MOCK_DEMO_PRODUCTS: ProductItem[] = [
  {
    id: "prod-1",
    name: "Kemeja Flanel Casual Premium",
    category: "Pakaian",
    price: 135000,
    stock: 42,
    description: "Kemeja flanel lengan panjang bahan katun wol premium, adem dan tidak mudah kusut. Sangat cocok dipakai kuliah, kerja santai, maupun hangout. Tersedia berbagai kombinasi warna dan ukuran.",
    imageUrl: "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=500",
    attributes: {
      images: [
        "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=500",
        "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=500",
      ],
      videoUrl: "",
      hasVariations: true,
      variationType: "Ukuran & Warna",
      variations: [
        { id: "v1", name: "Hitam - M", price: 135000, stock: 15 },
        { id: "v2", name: "Hitam - L", price: 135000, stock: 12 },
        { id: "v3", name: "Merah Navy - M", price: 140000, stock: 8 },
        { id: "v4", name: "Merah Navy - XL", price: 145000, stock: 7 },
      ],
    },
  },
  {
    id: "prod-2",
    name: "Kopi Arabika Gayo Natural 250gr",
    category: "Makanan & Minuman",
    price: 85000,
    stock: 3,
    description: "Biji kopi single origin Arabika Aceh Gayo dengan proses natural, cupping notes floral & fruity dengan keasaman seimbang.",
    attributes: {
      images: [],
      hasVariations: true,
      variationType: "Gilingan",
      variations: [
        { id: "v5", name: "Biji Utuh (Beans)", price: 85000, stock: 2 },
        { id: "v6", name: "Bubuk Halus (Espresso)", price: 85000, stock: 1 },
      ],
    },
  },
  {
    id: "prod-3",
    name: "Tumbler Stainless Steel Vacuum 500ml",
    category: "Aksesoris",
    price: 99000,
    stock: 0,
    description: "Termos botol minum tahan panas hingga 12 jam dan dingin 24 jam dengan material SUS304 food grade.",
    attributes: {
      images: [],
      hasVariations: false,
    },
  },
];

export function ProductsPage() {
  const { user } = useAuthStore();

  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "low" | "out">("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);

  // Background task runner (seperti knowledge base) — simpan/hapus produk tidak memblokir UI
  const { runProductMutation } = useBackgroundTasksStore();

  // Form State: Multi-foto & Video terikat langsung ke produk
  const [formData, setFormData] = useState({
    name: "",
    category: "General",
    price: 0,
    stock: 0,
    description: "",
    images: [] as ProductImage[],
    videoUrl: "",
    hasVariations: false,
    variationType: "Ukuran",
    variations: [] as VariationOption[],
  });

  // Modal Full Description Viewer
  const [selectedDescription, setSelectedDescription] = useState<{ title: string; desc: string } | null>(null);

  // Modal View Product Media (Foto & Video)
  const [selectedProductMedia, setSelectedProductMedia] = useState<ProductItem | null>(null);

  // Modal View Variations Popover
  const [viewingVariations, setViewingVariations] = useState<ProductItem | null>(null);

  // Modal Delete
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Uploading state inside form
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [manualPhotoUrl, setManualPhotoUrl] = useState("");

  const targetId =
    user?.tenantId ||
    (user?.id && !user.id.startsWith("u-") && user.role !== "superadmin" ? user.id : "demo");

  const isDemo =
    user?.id?.startsWith("u-") ||
    user?.email?.includes("demo") ||
    (process.env.NODE_ENV !== "production" && !user?.tenantId);

  // Tier Gating Plan — ponytail: cache per-tenant di localStorage supaya render awal
  // tidak flash "lite" (gating video salah) saat quota lambat/gagal dimuat
  const planCacheKey = `zafi-product-plan:${targetId}`;
  const [tenantPlan, setTenantPlan] = useState<string>(() => {
    if (typeof window === "undefined") return "lite";
    try {
      return localStorage.getItem(planCacheKey) || "lite";
    } catch {
      return "lite";
    }
  });

  // Feature Gating Rules: Video produk eksklusif untuk Silver, Gold, Enterprise, Superadmin
  const canUseMediaGallery =
    tenantPlan === "silver" ||
    tenantPlan === "gold" ||
    tenantPlan === "enterprise" ||
    tenantPlan === "developer" ||
    user?.role === "superadmin";

  // ponytail: soft=true untuk refresh setelah save background — tanpa skeleton flash
  const fetchProducts = async (soft = false) => {
    if (!soft) setLoading(true);
    try {
      if (isDemo && !user?.tenantId) {
        setProducts(MOCK_DEMO_PRODUCTS);
        return;
      }

      const res = await fetch(`/api/v1/tenant/${targetId}/products`);
      if (res.ok) {
        const json = await res.json();
        const list = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
        setProducts(list.length > 0 ? list : (isDemo ? MOCK_DEMO_PRODUCTS : []));
      } else {
        if (isDemo) setProducts(MOCK_DEMO_PRODUCTS);
        else toast.error("Gagal memuat katalog produk dari server");
      }
    } catch {
      if (isDemo) setProducts(MOCK_DEMO_PRODUCTS);
      else toast.error("Gagal memuat katalog produk");
    } finally {
      if (!soft) setLoading(false);
    }
  };

  // Fetch Tenant Plan
  const fetchTenantPlan = async () => {
    try {
      const quotaRes = await fetch(`/api/v1/tenant/clients/${targetId}/quota`);
      if (quotaRes.ok) {
        const qJson = await quotaRes.json();
        const qData = qJson?.data || qJson;
        if (qData?.plan) {
          const plan = qData.plan.toLowerCase();
          setTenantPlan(plan);
          try {
            localStorage.setItem(`zafi-product-plan:${targetId}`, plan);
          } catch {}
        }
      }
    } catch {}
  };

  useEffect(() => {
    fetchProducts();
    fetchTenantPlan();
  }, [user?.tenantId, user?.id]);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  // Stats calculation
  const stats = useMemo(() => {
    let totalStock = 0;
    let lowStock = 0;
    let outOfStock = 0;
    let activeStock = 0;

    products.forEach((p) => {
      const s = Number(p.stock) || 0;
      totalStock += s;
      if (s === 0) outOfStock += 1;
      else if (s < 5) lowStock += 1;
      else activeStock += 1;
    });

    return {
      total: products.length,
      totalStock,
      active: activeStock,
      low: lowStock,
      out: outOfStock,
    };
  }, [products]);

  // Filtering
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const s = Number(p.stock) || 0;
      if (statusFilter === "active" && s === 0) return false;
      if (statusFilter === "low" && (s >= 5 || s === 0)) return false;
      if (statusFilter === "out" && s > 0) return false;

      if (categoryFilter !== "all" && p.category !== categoryFilter) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const nameMatch = p.name?.toLowerCase().includes(q);
        const catMatch = p.category?.toLowerCase().includes(q);
        const descMatch = p.description?.toLowerCase().includes(q);
        const varMatch = p.attributes?.variations?.some(
          (v: any) => v.name?.toLowerCase().includes(q)
        );
        return nameMatch || catMatch || descMatch || varMatch;
      }

      return true;
    });
  }, [products, statusFilter, categoryFilter, search]);

  // Open Add Dialog
  const handleOpenAdd = () => {
    setEditingProduct(null);
    setManualPhotoUrl("");
    setFormData({
      name: "",
      category: "General",
      price: 0,
      stock: 0,
      description: "",
      images: [],
      videoUrl: "",
      hasVariations: false,
      variationType: "Ukuran",
      variations: [
        { id: "1", name: "Standar", price: 0, stock: 0 },
      ],
    });
    setIsModalOpen(true);
  };

  // Open Edit Dialog
  const handleOpenEdit = (p: ProductItem) => {
    setEditingProduct(p);
    setManualPhotoUrl("");
    const attrs = p.attributes || {};
    const hasVars = Boolean(attrs.hasVariations && attrs.variations?.length);
    const existingImages = productImages(p);

    setFormData({
      name: p.name || "",
      category: p.category || "General",
      price: Number(p.price) || 0,
      stock: Number(p.stock) || 0,
      description: p.description || "",
      images: existingImages,
      videoUrl: attrs.videoUrl || "",
      hasVariations: hasVars,
      variationType: attrs.variationType || "Ukuran",
      variations: hasVars
        ? attrs.variations.map((v: any, idx: number) => ({
            id: v.id || String(idx + 1),
            name: v.name || "",
            price: Number(v.price) || 0,
            stock: Number(v.stock) || 0,
          }))
        : [{ id: "1", name: "Standar", price: Number(p.price) || 0, stock: Number(p.stock) || 0 }],
    });
    setIsModalOpen(true);
  };

  // Handler: Upload multi-foto produk langsung di form (paralel, endpoint khusus produk)
  const handleUploadPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingPhoto(true);
    const fileArr = Array.from(files);

    const results = await Promise.allSettled(
      fileArr.map(async (file) => {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch(`/api/v1/tenant/${targetId}/products/upload`, {
          method: "POST",
          body: fd,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const url = json?.url || json?.data?.url;
        if (!url) throw new Error("no url");
        return url as string;
      })
    );

    const newImages: ProductImage[] = [];
    let failedCount = 0;
    for (const r of results) {
      if (r.status === "fulfilled") newImages.push({ url: r.value, description: "" });
      else failedCount++;
    }

    // ponytail: JANGAN fallback ke blob: URL — itu temporary & pecah setelah reload.
    // Gagal upload dilaporkan jujur agar user ulangi, bukan simpan data rusak.
    if (newImages.length > 0) {
      setFormData((prev) => ({ ...prev, images: [...prev.images, ...newImages] }));
      toast.success(`${newImages.length} foto berhasil ditambahkan`);
    }
    if (failedCount > 0) {
      toast.error(`${failedCount} foto gagal diunggah. Silakan coba lagi.`);
    }
    setIsUploadingPhoto(false);
    e.target.value = "";
  };

  // Handler: Tambah foto via URL langsung
  const handleAddPhotoUrl = () => {
    const url = manualPhotoUrl.trim();
    if (!url) return;
    if (!/^(https?:\/\/|\/)/.test(url)) {
      toast.error("URL tidak valid. Harus diawali http://, https://, atau /");
      return;
    }
    setFormData((prev) => ({
      ...prev,
      images: [...prev.images, { url, description: "" }],
    }));
    setManualPhotoUrl("");
    toast.success("Foto berhasil ditambahkan");
  };

  // Handler: Update deskripsi foto (untuk konteks chatbot AI)
  const handleUpdatePhotoDescription = (index: number, desc: string) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.map((img, i) => (i === index ? { ...img, description: desc } : img)),
    }));
  };

  // Handler: Hapus foto tertentu dari form
  const handleRemovePhoto = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  // Handler: Upload video produk langsung di form (Gated Silver+)
  const handleUploadVideo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!canUseMediaGallery) {
      toast.error("Fitur upload video produk eksklusif untuk paket Silver ke atas.");
      return;
    }

    setIsUploadingVideo(true);
    const fd = new FormData();
    fd.append("file", file);

    try {
      const res = await fetch(`/api/v1/tenant/${targetId}/products/upload`, { method: "POST", body: fd });
      if (res.ok) {
        const json = await res.json();
        const url = json?.url || json?.data?.url;
        if (url) {
          setFormData((prev) => ({ ...prev, videoUrl: url }));
          toast.success("Video produk berhasil diunggah!");
        } else {
          toast.error("Server tidak mengembalikan URL video. Silakan coba lagi.");
        }
      } else {
        const errJson = await res.json().catch(() => null);
        toast.error(errJson?.message || "Upload video gagal. Silakan coba lagi.");
      }
    } catch {
      toast.error("Upload video gagal. Periksa koneksi lalu coba lagi.");
    } finally {
      setIsUploadingVideo(false);
      e.target.value = "";
    }
  };

  // Add Variation Row
  const handleAddVariationOption = () => {
    setFormData((prev) => ({
      ...prev,
      variations: [
        ...prev.variations,
        {
          id: String(Date.now()),
          name: "",
          price: prev.price || 0,
          stock: 0,
        },
      ],
    }));
  };

  // Remove Variation Row — total stok & harga termurah wajib dihitung ulang
  const handleRemoveVariationOption = (id: string) => {
    setFormData((prev) => {
      const nextVars = prev.variations.filter((v) => v.id !== id);
      const { totalStock, minPrice } = calcVariationTotals(nextVars);
      return {
        ...prev,
        variations: nextVars,
        stock: totalStock,
        price: minPrice || prev.price,
      };
    });
  };

  // Update Variation Field
  const handleUpdateVariationOption = (id: string, field: keyof VariationOption, val: any) => {
    setFormData((prev) => {
      const nextVars = prev.variations.map((v) => (v.id === id ? { ...v, [field]: val } : v));
      const { totalStock, minPrice } = calcVariationTotals(nextVars);

      return {
        ...prev,
        variations: nextVars,
        stock: totalStock,
        price: minPrice || prev.price,
      };
    });
  };

  // Save Product — background: modal langsung tutup, task muncul di panel kanan bawah
  const handleSave = () => {
    if (!formData.name.trim()) {
      toast.error("Nama produk wajib diisi.");
      return;
    }

    let finalStock = Number(formData.stock) || 0;
    let finalPrice = Number(formData.price) || 0;

    if (formData.hasVariations && formData.variations.length > 0) {
      const totals = calcVariationTotals(formData.variations);
      finalStock = totals.totalStock;
      finalPrice = totals.minPrice || finalPrice;
    }

    const payload = {
      name: formData.name.trim(),
      category: formData.category.trim() || "General",
      price: finalPrice,
      stock: finalStock,
      imageUrl: formData.images[0]?.url || undefined,
      description: formData.description.trim(),
      attributes: {
        images: formData.images,
        videoUrl: formData.videoUrl.trim() || undefined,
        hasVariations: formData.hasVariations,
        variationType: formData.hasVariations ? formData.variationType : undefined,
        variations: formData.hasVariations ? formData.variations : undefined,
      },
    };

    // Demo mode: langsung mutate lokal tanpa API
    if (isDemo) {
      if (editingProduct) {
        setProducts((prev) => prev.map((p) => (p.id === editingProduct.id ? { ...p, ...payload, id: p.id } : p)));
        toast.success("Produk berhasil diperbarui (Demo Mode)!");
      } else {
        const newProd: ProductItem = { id: `demo-${Date.now()}`, ...payload };
        setProducts((prev) => [newProd, ...prev]);
        toast.success("Produk baru ditambahkan (Demo Mode)!");
      }
      setIsModalOpen(false);
      return;
    }

    setIsModalOpen(false);
    void runProductMutation({
      mode: editingProduct ? "update" : "create",
      targetId,
      productId: editingProduct?.id,
      payload,
      onSuccess: () => fetchProducts(true),
    });
  };

  // Delete Product — background
  const handleDelete = () => {
    if (!deleteId) return;
    setDeleteId(null);

    if (isDemo) {
      setProducts((prev) => prev.filter((p) => p.id !== deleteId));
      toast.success("Produk berhasil dihapus!");
      return;
    }

    const victim = products.find((p) => p.id === deleteId);
    void runProductMutation({
      mode: "delete",
      targetId,
      productId: deleteId,
      payload: { name: victim?.name },
      onSuccess: () => {
        setProducts((prev) => prev.filter((p) => p.id !== deleteId));
        fetchProducts(true);
      },
    });
  };

  // Helper format harga
  const formatRupiah = (amount: number | string) => {
    const num = Number(amount) || 0;
    return `Rp ${num.toLocaleString("id-ID")}`;
  };

  // Helper rentang harga jika ada variasi
  const getDisplayPrice = (p: ProductItem) => {
    const vars = p.attributes?.variations;
    if (p.attributes?.hasVariations && Array.isArray(vars) && vars.length > 1) {
      const prices = vars.map((v: any) => Number(v.price) || 0).filter((pr: number) => pr > 0);
      if (prices.length > 1) {
        const min = Math.min(...prices);
        const max = Math.max(...prices);
        if (min !== max) {
          return `${formatRupiah(min)} - ${formatRupiah(max)}`;
        }
      }
    }
    return formatRupiah(p.price);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-card border rounded-xl shadow-2xs">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Package className="h-5 w-5 text-emerald-600" /> Katalog & Stok Produk
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Kelola data produk, foto, video, variasi harga & stok. Otomatis disinkronisasi ke Asisten AI WhatsApp untuk menjawab pelanggan.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchProducts()}
            disabled={loading}
            className="h-8 text-xs gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button
            size="sm"
            onClick={handleOpenAdd}
            className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs font-semibold"
          >
            <Plus className="h-3.5 w-3.5" /> Tambah Produk Baru
          </Button>
        </div>
      </div>

      {/* Shopee-like Status Filter Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card
          onClick={() => setStatusFilter("all")}
          className={`cursor-pointer transition-all border p-3.5 ${
            statusFilter === "all" ? "border-emerald-600 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-xs" : "hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span className="font-medium">Semua Produk</span>
            <Boxes className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-1 text-2xl font-bold text-foreground">{stats.total}</div>
          <p className="text-[11px] text-muted-foreground mt-0.5">Total produk terdaftar</p>
        </Card>

        <Card
          onClick={() => setStatusFilter("active")}
          className={`cursor-pointer transition-all border p-3.5 ${
            statusFilter === "active" ? "border-emerald-600 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-xs" : "hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span className="font-medium">Stok Tersedia</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-1 text-2xl font-bold text-emerald-600">{stats.active}</div>
          <p className="text-[11px] text-muted-foreground mt-0.5">Stok aman (≥ 5 unit)</p>
        </Card>

        <Card
          onClick={() => setStatusFilter("low")}
          className={`cursor-pointer transition-all border p-3.5 ${
            statusFilter === "low" ? "border-amber-500 bg-amber-50/40 dark:bg-amber-950/20 shadow-xs" : "hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span className="font-medium">Stok Menipis</span>
            <AlertCircle className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-1 text-2xl font-bold text-amber-600">{stats.low}</div>
          <p className="text-[11px] text-muted-foreground mt-0.5">Sisa &lt; 5 unit (segera restock)</p>
        </Card>

        <Card
          onClick={() => setStatusFilter("out")}
          className={`cursor-pointer transition-all border p-3.5 ${
            statusFilter === "out" ? "border-rose-500 bg-rose-50/40 dark:bg-rose-950/20 shadow-xs" : "hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span className="font-medium">Habis Terjual</span>
            <Tag className="h-4 w-4 text-rose-500" />
          </div>
          <div className="mt-1 text-2xl font-bold text-rose-600">{stats.out}</div>
          <p className="text-[11px] text-muted-foreground mt-0.5">Stok 0 (bot AI akan beritahu habis)</p>
        </Card>
      </div>

      {/* Shopee-style Table Toolbar */}
      <Card className="shadow-2xs overflow-hidden">
        <div className="p-3.5 border-b bg-muted/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama produk atau kategori..."
                className="pl-8 h-8 text-xs bg-background"
              />
            </div>
            {categories.length > 0 && (
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="h-8 text-xs rounded-md border bg-background px-2 font-medium"
              >
                <option value="all">Semua Kategori</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>
              Menampilkan <strong>{filteredProducts.length}</strong> produk
            </span>
          </div>
        </div>

        {/* Shopee-style Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/50 text-muted-foreground font-semibold border-b">
              <tr>
                <th className="py-3 px-4 min-w-[260px]">Info Produk</th>
                <th className="py-3 px-3 min-w-[140px]">Variasi</th>
                <th className="py-3 px-3 min-w-[130px]">Harga</th>
                <th className="py-3 px-3 min-w-[110px]">Total Stok</th>
                <th className="py-3 px-3 min-w-[110px]">Status AI</th>
                <th className="py-3 px-4 text-right min-w-[100px]">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                [1, 2, 3, 4].map((i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-3 px-4">
                      <Skeleton className="h-8 w-44" />
                    </td>
                    <td className="py-3 px-3">
                      <Skeleton className="h-6 w-20" />
                    </td>
                    <td className="py-3 px-3">
                      <Skeleton className="h-6 w-24" />
                    </td>
                    <td className="py-3 px-3">
                      <Skeleton className="h-6 w-16" />
                    </td>
                    <td className="py-3 px-3">
                      <Skeleton className="h-6 w-20" />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Skeleton className="h-6 w-16 ml-auto" />
                    </td>
                  </tr>
                ))
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Package className="h-8 w-8 text-muted-foreground/30" />
                      <p className="font-semibold text-foreground text-sm">Belum ada produk ditemukan</p>
                      <p className="text-[11px] max-w-sm text-muted-foreground">
                        Tambahkan produk pertama Anda untuk mulai mengotomasi respon harga & stok via WhatsApp AI.
                      </p>
                      <Button
                        size="sm"
                        onClick={handleOpenAdd}
                        className="mt-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" /> Tambah Produk
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const hasVars = Boolean(
                    p.attributes?.hasVariations && p.attributes?.variations?.length
                  );
                  const varCount = hasVars ? p.attributes.variations.length : 0;
                  const stockNum = Number(p.stock) || 0;
                  const images = productImages(p);
                  const coverImage = images[0]?.url || p.imageUrl;
                  const hasVideo = Boolean(p.attributes?.videoUrl);

                  return (
                    <tr key={p.id} className="hover:bg-muted/40 transition-colors">
                      {/* 1. Info Produk & Media Thumbnail */}
                      <td className="py-3 px-4">
                        <div className="flex items-start gap-3">
                          <div
                            onClick={() => (images.length > 0 || hasVideo) && setSelectedProductMedia(p)}
                            className={`h-11 w-11 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-600 flex items-center justify-center shrink-0 overflow-hidden relative ${
                              images.length > 0 || hasVideo ? "cursor-pointer hover:ring-2 hover:ring-emerald-500" : ""
                            }`}
                          >
                            {coverImage ? (
                              <img src={coverImage} alt={p.name} className="h-full w-full object-cover" />
                            ) : (
                              <Package className="h-5 w-5" />
                            )}
                            {images.length > 1 && (
                              <span className="absolute bottom-0.5 right-0.5 bg-black/70 text-white text-[8px] font-mono px-1 rounded">
                                +{images.length - 1}
                              </span>
                            )}
                            {hasVideo && (
                              <span className="absolute top-0.5 right-0.5 bg-emerald-600 text-white p-0.5 rounded-full">
                                <Play className="h-2 w-2" />
                              </span>
                            )}
                          </div>
                          <div className="space-y-0.5 min-w-0 max-w-sm">
                            <p className="font-semibold text-foreground text-xs leading-snug line-clamp-1">
                              {p.name}
                            </p>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-normal">
                                {p.category || "General"}
                              </Badge>
                              {images.length > 0 && (
                                <span
                                  onClick={() => setSelectedProductMedia(p)}
                                  className="cursor-pointer text-[10px] text-muted-foreground hover:text-emerald-600 flex items-center gap-0.5"
                                >
                                  <ImageIcon className="h-2.5 w-2.5" /> {images.length} foto
                                </span>
                              )}
                              {hasVideo && (
                                <span
                                  onClick={() => setSelectedProductMedia(p)}
                                  className="cursor-pointer text-[10px] text-emerald-600 font-medium flex items-center gap-0.5"
                                >
                                  <Video className="h-2.5 w-2.5" /> Video
                                </span>
                              )}
                            </div>
                            {/* Deskripsi Panjang dengan Proteksi Clamping & Modal Viewer */}
                            {p.description && (
                              <div className="text-[11px] text-muted-foreground">
                                <p className="line-clamp-2 break-words max-w-[280px]">
                                  {p.description}
                                </p>
                                {p.description.length > 70 && (
                                  <button
                                    type="button"
                                    onClick={() => setSelectedDescription({ title: p.name, desc: p.description || "" })}
                                    className="text-[10px] text-emerald-600 hover:underline font-medium inline-block mt-0.5"
                                  >
                                    Baca selengkapnya
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 2. Variasi */}
                      <td className="py-3 px-3">
                        {hasVars ? (
                          <button
                            type="button"
                            onClick={() => setViewingVariations(p)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[11px] font-medium transition-colors"
                          >
                            <Layers className="h-3 w-3" />
                            {varCount} Variasi
                          </button>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">Standar (1 Varian)</span>
                        )}
                      </td>

                      {/* 3. Harga */}
                      <td className="py-3 px-3 font-semibold font-mono text-xs text-foreground">
                        {getDisplayPrice(p)}
                      </td>

                      {/* 4. Total Stok */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`h-2 w-2 rounded-full ${
                              stockNum === 0
                                ? "bg-rose-500"
                                : stockNum < 5
                                ? "bg-amber-500 animate-pulse"
                                : "bg-emerald-500"
                            }`}
                          />
                          <span className="font-mono font-semibold text-xs">{stockNum}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {stockNum === 0 ? "(Habis)" : stockNum < 5 ? "(Menipis)" : ""}
                          </span>
                        </div>
                      </td>

                      {/* 5. Status AI */}
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full">
                          <Sparkles className="h-2.5 w-2.5 text-emerald-600" /> Aktif di AI
                        </span>
                      </td>

                      {/* 6. Aksi */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEdit(p)}
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteId(p.id)}
                            className="h-7 w-7 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* DIALOG: VIEW MEDIA DETAIL PRODUK (FOTO-FOTO & VIDEO) */}
      <Dialog open={!!selectedProductMedia} onOpenChange={() => setSelectedProductMedia(null)}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-emerald-600" /> Media Produk: {selectedProductMedia?.name}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Foto dan video produk ini otomatis dikirimkan oleh asisten AI WhatsApp kepada pelanggan saat diminta.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Foto-foto Produk */}
            {(() => {
              const imgs = selectedProductMedia ? productImages(selectedProductMedia) : [];

              return (
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <ImageIcon className="h-3.5 w-3.5 text-emerald-600" /> Galeri Foto ({imgs.length})
                  </span>
                  {imgs.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">Belum ada foto yang diunggah.</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {imgs.map((img, idx: number) => (
                        <div key={idx} className="rounded-lg overflow-hidden border bg-muted/40">
                          <div className="aspect-square flex items-center justify-center">
                            <img src={img.url} alt={`${selectedProductMedia?.name} ${idx + 1}`} className="h-full w-full object-cover" />
                          </div>
                          {img.description && (
                            <p className="text-[10px] text-muted-foreground p-1.5 leading-snug">{img.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Video Produk */}
            {selectedProductMedia?.attributes?.videoUrl && (
              <div className="space-y-2 pt-2 border-t">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Play className="h-3.5 w-3.5 text-emerald-600" /> Video Demo Produk
                </span>
                <div className="rounded-lg overflow-hidden border bg-black max-h-56 flex items-center justify-center">
                  <video src={selectedProductMedia.attributes.videoUrl} controls className="max-h-56 w-full" />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button size="sm" variant="secondary" onClick={() => setSelectedProductMedia(null)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: VIEW FULL DESCRIPTION (PROTEKSI DESKRIPSI PANJANG) */}
      <Dialog open={!!selectedDescription} onOpenChange={() => setSelectedDescription(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm font-bold">
              <FileText className="h-4 w-4 text-emerald-600" /> Deskripsi Lengkap Produk
            </DialogTitle>
            <DialogDescription className="text-xs font-semibold text-foreground">
              {selectedDescription?.title}
            </DialogDescription>
          </DialogHeader>

          <div className="p-3 bg-muted/30 border rounded-lg max-h-60 overflow-y-auto text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed">
            {selectedDescription?.desc}
          </div>

          <DialogFooter>
            <Button size="sm" variant="outline" onClick={() => setSelectedDescription(null)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: VIEW VARIATIONS DETAIL (SHOPEE STYLE - TANPA SKU) */}
      <Dialog open={!!viewingVariations} onOpenChange={() => setViewingVariations(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm font-bold">
              <Layers className="h-4 w-4 text-indigo-600" /> Rincian Variasi Produk
            </DialogTitle>
            <DialogDescription className="text-xs">
              {viewingVariations?.name} ({viewingVariations?.attributes?.variationType || "Variasi"})
            </DialogDescription>
          </DialogHeader>

          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted text-muted-foreground font-semibold border-b">
                <tr>
                  <th className="p-2.5">Pilihan Variasi</th>
                  <th className="p-2.5 text-right">Harga</th>
                  <th className="p-2.5 text-right">Stok</th>
                </tr>
              </thead>
              <tbody className="divide-y font-mono">
                {viewingVariations?.attributes?.variations?.map((v: any, idx: number) => (
                  <tr key={idx} className="hover:bg-muted/30">
                    <td className="p-2.5 font-sans font-medium">{v.name}</td>
                    <td className="p-2.5 text-right font-semibold">{formatRupiah(v.price)}</td>
                    <td className="p-2.5 text-right">
                      <span className={v.stock === 0 ? "text-rose-600 font-bold" : "text-foreground"}>
                        {v.stock}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <DialogFooter>
            <Button size="sm" variant="outline" onClick={() => setViewingVariations(null)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: TAMBAH / EDIT PRODUK (UPLOAD FOTO MULTI & VIDEO TERIKAT LANGSUNG) */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Package className="h-5 w-5 text-emerald-600" />
              {editingProduct ? "Edit Produk & Variasi" : "Tambah Produk Baru"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Upload foto & video langsung untuk produk ini. Asisten AI WhatsApp akan otomatis melampirkan media saat menjawab pelanggan.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-xs py-1">
            {/* Bagian 1: Info Dasar */}
            <div className="space-y-2.5">
              <div>
                <Label className="text-xs">
                  Nama Produk <span className="text-rose-500">*</span>
                </Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contoh: Kemeja Flanel Casual Pria"
                  className="h-8 text-xs mt-1"
                />
              </div>

              <div>
                <Label className="text-xs">Kategori Produk</Label>
                <Input
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="Contoh: Pakaian, Makanan & Minuman, Aksesoris"
                  className="h-8 text-xs mt-1"
                />
              </div>

              <div>
                <Label className="text-xs">Deskripsi & Catatan untuk AI</Label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  placeholder="Bahan, cara penggunaan, keunggulan produk yang bisa dijelaskan bot AI ke pelanggan..."
                  className="w-full text-xs p-2 rounded-md border bg-background mt-1"
                />
              </div>
            </div>

            {/* Bagian 2: Media Foto & Video Terikat Produk (Shopee Style) */}
            <div className="pt-3 border-t space-y-3">
              <div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <ImageIcon className="h-3.5 w-3.5 text-emerald-600" /> Foto Produk (Bisa &gt; 1 Foto)
                  </Label>
                  <span className="text-[10px] text-muted-foreground">
                    {formData.images.length} foto terpilih
                  </span>
                </div>

                {/* Upload Foto Input & URL */}
                <div className="flex items-center gap-2 mt-1.5">
                  <label className="cursor-pointer inline-flex items-center gap-1.5 h-8 px-3 rounded-md border bg-muted/50 hover:bg-muted text-xs font-medium text-foreground transition-colors shrink-0">
                    <Upload className="h-3.5 w-3.5 text-emerald-600" />
                    <span>{isUploadingPhoto ? "Mengunggah..." : "+ Pilih / Upload Foto"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleUploadPhotos}
                      disabled={isUploadingPhoto}
                      className="hidden"
                    />
                  </label>
                  <div className="flex-1 flex gap-1">
                    <Input
                      value={manualPhotoUrl}
                      onChange={(e) => setManualPhotoUrl(e.target.value)}
                      placeholder="Atau tempel link URL foto..."
                      className="h-8 text-xs"
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddPhotoUrl())}
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleAddPhotoUrl}
                      className="h-8 text-xs px-2.5 shrink-0"
                    >
                      Tambah
                    </Button>
                  </div>
                </div>

                {/* List foto + deskripsi (untuk konteks chatbot AI) */}
                {formData.images.length > 0 && (
                  <div className="space-y-1.5 p-2 bg-muted/20 border rounded-lg mt-2">
                    {formData.images.map((img, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <div className="relative h-11 w-11 rounded-md border overflow-hidden shrink-0 bg-card">
                          <img src={img.url} alt={`Foto ${idx + 1}`} className="h-full w-full object-cover" />
                          {idx === 0 && (
                            <span className="absolute bottom-0 left-0 right-0 bg-emerald-600/90 text-white text-[7px] font-semibold text-center">
                              Utama
                            </span>
                          )}
                        </div>
                        <Input
                          value={img.description}
                          onChange={(e) => handleUpdatePhotoDescription(idx, e.target.value)}
                          placeholder="Deskripsi foto (agar AI tahu kapan mengirim foto ini)..."
                          className="h-8 text-[11px] flex-1"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(idx)}
                          className="h-6 w-6 bg-rose-600 text-white rounded-full flex items-center justify-center shrink-0 opacity-80 hover:opacity-100"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Video Produk (Gated Silver+) */}
              <div className="pt-2 border-t space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <Video className="h-3.5 w-3.5 text-emerald-600" /> Video Demo Produk (Opsional)
                  </Label>
                  {!canUseMediaGallery && (
                    <Badge variant="outline" className="border-amber-400 text-amber-700 bg-amber-50 text-[10px] gap-1 py-0.5">
                      <Lock className="h-2.5 w-2.5 text-amber-500" /> Paket Silver+
                    </Badge>
                  )}
                </div>

                {canUseMediaGallery ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <label className="cursor-pointer inline-flex items-center gap-1.5 h-8 px-3 rounded-md border bg-muted/50 hover:bg-muted text-xs font-medium text-foreground transition-colors shrink-0">
                        <Upload className="h-3.5 w-3.5 text-emerald-600" />
                        <span>{isUploadingVideo ? "Mengunggah..." : "Pilih File Video (.mp4)"}</span>
                        <input
                          type="file"
                          accept="video/mp4,video/*"
                          onChange={handleUploadVideo}
                          disabled={isUploadingVideo}
                          className="hidden"
                        />
                      </label>
                      <Input
                        value={formData.videoUrl}
                        onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                        placeholder="Atau input URL video (.mp4)..."
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                    {formData.videoUrl && (
                      <div className="relative rounded-lg overflow-hidden border bg-black max-h-36 flex items-center justify-center">
                        <video src={formData.videoUrl} controls className="max-h-36 w-full" />
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, videoUrl: "" })}
                          className="absolute top-1 right-1 h-5 w-5 bg-rose-600 text-white rounded-full flex items-center justify-center opacity-90 hover:opacity-100"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-2.5 rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
                    <Lock className="h-4 w-4 shrink-0 text-amber-500" />
                    <span>Upload video produk tersedia mulai paket Silver. Tingkatkan paket untuk menyertakan video demo.</span>
                  </div>
                )}
              </div>
            </div>

            {/* Bagian 3: Variasi Switch (Shopee style) */}
            <div className="pt-3 border-t space-y-3">
              <div className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/40">
                <div className="space-y-0.5">
                  <span className="font-semibold text-xs flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-indigo-600" /> Aktifkan Variasi Produk
                  </span>
                  <p className="text-[11px] text-muted-foreground">
                    Aktifkan jika produk memiliki opsi warna, ukuran, atau rasa.
                  </p>
                </div>
                <Switch
                  checked={formData.hasVariations}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      hasVariations: checked,
                      variations: checked && formData.variations.length === 0
                        ? [{ id: "1", name: "Opsi 1", price: formData.price || 0, stock: formData.stock || 0 }]
                        : formData.variations,
                    })
                  }
                />
              </div>

              {/* Jika TANPA variasi */}
              {!formData.hasVariations ? (
                <div className="grid grid-cols-2 gap-2.5 p-3 rounded-lg border bg-muted/20">
                  <div>
                    <Label className="text-xs">
                      Harga Satuan (Rp) <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={formData.price ? formatIdr(formData.price) : ""}
                      onChange={(e) => setFormData({ ...formData, price: parseIdr(e.target.value) })}
                      placeholder="0"
                      className="h-8 text-xs mt-1 font-mono font-semibold"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">
                      Jumlah Stok <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      type="number"
                      value={formData.stock || ""}
                      onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) || 0 })}
                      placeholder="0"
                      className="h-8 text-xs mt-1 font-mono font-semibold"
                    />
                  </div>
                </div>
              ) : (
                /* Jika DENGAN variasi (Shopee Style - Tanpa SKU) */
                <div className="space-y-2.5 p-3 rounded-lg border bg-muted/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-xs font-semibold">Tipe Variasi</Label>
                      <Input
                        value={formData.variationType}
                        onChange={(e) => setFormData({ ...formData, variationType: e.target.value })}
                        placeholder="Contoh: Ukuran, Warna, Rasa"
                        className="h-7 text-xs mt-0.5 max-w-[200px]"
                      />
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleAddVariationOption}
                      className="h-7 text-xs gap-1 border-indigo-300 text-indigo-700 hover:bg-indigo-50"
                    >
                      <Plus className="h-3 w-3" /> Tambah Pilihan
                    </Button>
                  </div>

                  {/* List Pilihan Variasi */}
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {formData.variations.map((v) => (
                      <div
                        key={v.id}
                        className="flex items-center gap-2 p-2 rounded-md border bg-card text-xs shadow-2xs"
                      >
                        <div className="flex-1 min-w-0">
                          <Input
                            value={v.name}
                            onChange={(e) => handleUpdateVariationOption(v.id, "name", e.target.value)}
                            placeholder={`Nama opsi (e.g. Hitam - XL)`}
                            className="h-7 text-xs"
                          />
                        </div>
                        <div className="w-32">
                          <Input
                            type="text"
                            inputMode="numeric"
                            value={v.price ? formatIdr(v.price) : ""}
                            onChange={(e) =>
                              handleUpdateVariationOption(v.id, "price", parseIdr(e.target.value))
                            }
                            placeholder="Harga (Rp)"
                            className="h-7 text-xs font-mono font-medium"
                          />
                        </div>
                        <div className="w-24">
                          <Input
                            type="number"
                            value={v.stock || ""}
                            onChange={(e) =>
                              handleUpdateVariationOption(v.id, "stock", Number(e.target.value) || 0)
                            }
                            placeholder="Stok"
                            className="h-7 text-xs font-mono"
                          />
                        </div>
                        {formData.variations.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveVariationOption(v.id)}
                            className="h-7 w-7 text-rose-500 hover:text-rose-700 shrink-0"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t font-mono">
                    <span>
                      Total Stok Variasi: <strong>{formData.stock} unit</strong>
                    </span>
                    <span>
                      Harga Termurah: <strong>{formatRupiah(formData.price)}</strong>
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
            <Button size="sm" variant="outline" onClick={() => setIsModalOpen(false)}>
              Batal
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={false}
              className="h-9 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {editingProduct ? "Simpan Perubahan" : "Simpan Produk"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: HAPUS PRODUK — pola ConfirmDialog sama dengan Availability/Siteplan */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => { if (!open) setDeleteId(null); }}
        title="Hapus Produk Ini?"
        description="Produk yang dihapus tidak akan lagi dikenali oleh bot AI saat pelanggan bertanya di WhatsApp."
        confirmLabel="Ya, Hapus Produk"
        onConfirm={handleDelete}
      />
    </div>
  );
}
