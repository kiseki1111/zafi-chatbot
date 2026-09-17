"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Bus,
  Armchair,
  Plus,
  Move,
  Save,
  RotateCcw,
  Edit2,
  Trash2,
  Phone,
  Calendar,
  MapPin,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type SeatStatus = "AVAILABLE" | "BOOKED" | "OCCUPIED";

export interface DragSeat {
  id: string;
  label: string;
  x: number; // percentage (0 - 100)
  y: number; // percentage (0 - 100)
  status: SeatStatus;
  price: number;
  passengerName?: string;
  passengerPhone?: string;
}

export interface BusFleet {
  id: string;
  name: string;
  route: string;
  totalSeats: number;
  seats: DragSeat[];
}

// Generate posisi default (grid 1 - 2)
function generateInitialSeats(count: number, defaultPrice: number = 250000): DragSeat[] {
  const seats: DragSeat[] = [];
  
  // Seat 1 di depan samping sopir jika ada
  let seatIdx = 1;
  if (count >= 1) {
    seats.push({
      id: "s-1",
      label: "01",
      x: 75,
      y: 12,
      status: "AVAILABLE",
      price: defaultPrice,
    });
    seatIdx++;
  }

  // Sisa kursi dibagi per baris: kiri 1 kursi, kanan 2 kursi (format 1-2)
  const remaining = count - (count >= 1 ? 1 : 0);
  const rowsNeeded = Math.ceil(remaining / 3);
  const rowHeight = 70 / Math.max(rowsNeeded, 1);

  let curY = 25;
  for (let r = 0; r < rowsNeeded; r++) {
    // Kiri (1 kursi)
    if (seatIdx <= count) {
      seats.push({
        id: `s-${seatIdx}`,
        label: String(seatIdx).padStart(2, "0"),
        x: 18,
        y: Math.min(curY, 90),
        status: "AVAILABLE",
        price: defaultPrice,
      });
      seatIdx++;
    }

    // Kanan 1
    if (seatIdx <= count) {
      seats.push({
        id: `s-${seatIdx}`,
        label: String(seatIdx).padStart(2, "0"),
        x: 60,
        y: Math.min(curY, 90),
        status: "AVAILABLE",
        price: defaultPrice,
      });
      seatIdx++;
    }

    // Kanan 2
    if (seatIdx <= count) {
      seats.push({
        id: `s-${seatIdx}`,
        label: String(seatIdx).padStart(2, "0"),
        x: 82,
        y: Math.min(curY, 90),
        status: "AVAILABLE",
        price: defaultPrice,
      });
      seatIdx++;
    }

    curY += rowHeight;
  }

  return seats;
}

const DEFAULT_FLEETS: BusFleet[] = [
  {
    id: "fleet-17",
    name: "Executive Microbus 17 Seat",
    route: "Jakarta - Bandung - Garut (PP)",
    totalSeats: 17,
    seats: [
      { id: "s-1", label: "01", x: 78, y: 12, status: "AVAILABLE", price: 250000 },
      { id: "s-2", label: "02", x: 18, y: 28, status: "AVAILABLE", price: 250000 },
      { id: "s-3", label: "03", x: 60, y: 28, status: "BOOKED", passengerName: "Hendra Wijaya", passengerPhone: "08123456789", price: 250000 },
      { id: "s-4", label: "04", x: 82, y: 28, status: "OCCUPIED", passengerName: "Siti Rahma", passengerPhone: "08198765432", price: 250000 },
      { id: "s-5", label: "05", x: 18, y: 44, status: "AVAILABLE", price: 250000 },
      { id: "s-6", label: "06", x: 60, y: 44, status: "AVAILABLE", price: 250000 },
      { id: "s-7", label: "07", x: 82, y: 44, status: "AVAILABLE", price: 250000 },
      { id: "s-8", label: "08", x: 18, y: 60, status: "AVAILABLE", price: 250000 },
      { id: "s-9", label: "09", x: 60, y: 60, status: "OCCUPIED", passengerName: "Budi Santoso", passengerPhone: "08523334445", price: 250000 },
      { id: "s-10", label: "10", x: 82, y: 60, status: "AVAILABLE", price: 250000 },
      { id: "s-11", label: "11", x: 18, y: 76, status: "AVAILABLE", price: 250000 },
      { id: "s-12", label: "12", x: 60, y: 76, status: "BOOKED", passengerName: "Dewi Lestari", passengerPhone: "08778889990", price: 250000 },
      { id: "s-13", label: "13", x: 82, y: 76, status: "AVAILABLE", price: 250000 },
      { id: "s-14", label: "14", x: 15, y: 92, status: "AVAILABLE", price: 250000 },
      { id: "s-15", label: "15", x: 38, y: 92, status: "AVAILABLE", price: 250000 },
      { id: "s-16", label: "16", x: 62, y: 92, status: "AVAILABLE", price: 250000 },
      { id: "s-17", label: "17", x: 85, y: 92, status: "AVAILABLE", price: 250000 },
    ],
  },
];

const SEAT_STATUS_CONFIG: Record<SeatStatus, { label: string; badge: string; border: string; bg: string; text: string }> = {
  AVAILABLE: {
    label: "Tersedia",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
    border: "border-emerald-300 dark:border-emerald-700",
    bg: "bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40",
    text: "text-emerald-800 dark:text-emerald-200",
  },
  BOOKED: {
    label: "Dipesan (DP)",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
    border: "border-amber-300 dark:border-amber-700",
    bg: "bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40",
    text: "text-amber-800 dark:text-amber-200",
  },
  OCCUPIED: {
    label: "Terisi / Lunas",
    badge: "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
    border: "border-rose-300 dark:border-rose-700",
    bg: "bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40",
    text: "text-rose-800 dark:text-rose-200",
  },
};

export function BusLayoutView() {
  const [fleets, setFleets] = useState<BusFleet[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("custom-bus-fleets");
      if (saved) {
        try { return JSON.parse(saved); } catch (e) {}
      }
    }
    return DEFAULT_FLEETS;
  });

  const [activeFleetId, setActiveFleetId] = useState<string>(DEFAULT_FLEETS[0].id);
  const [isEditMode, setIsEditMode] = useState<boolean>(false); // Mode geser kursi (Drag and Drop)
  const [selectedSeat, setSelectedSeat] = useState<DragSeat | null>(null);

  // Dialogs
  const [isNewBusOpen, setIsNewBusOpen] = useState<boolean>(false);
  const [isSeatModalOpen, setIsSeatModalOpen] = useState<boolean>(false);

  // Form Buat Bus Baru
  const [newBusForm, setNewBusForm] = useState({
    name: "",
    route: "",
    seatCount: 17,
    price: 250000,
  });

  // Form Edit Tiket Kursi
  const [seatForm, setSeatForm] = useState({
    status: "AVAILABLE" as SeatStatus,
    passengerName: "",
    passengerPhone: "",
    price: 250000,
  });

  const canvasRef = useRef<HTMLDivElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const activeFleet = fleets.find((f) => f.id === activeFleetId) || fleets[0];

  // Simpan ke localStorage saat berubah
  const saveFleets = (newFleets: BusFleet[]) => {
    setFleets(newFleets);
    if (typeof window !== "undefined") {
      localStorage.setItem("custom-bus-fleets", JSON.stringify(newFleets));
    }
  };

  // Mouse & Touch Drag Handlers (Cross-platform, no lag)
  const handleDragStart = (seatId: string, clientX: number, clientY: number, e: any) => {
    if (!isEditMode) return;
    e.preventDefault?.();
    setDraggingId(seatId);
  };

  const handlePointerMove = (clientX: number, clientY: number) => {
    if (!draggingId || !canvasRef.current || !isEditMode) return;
    const rect = canvasRef.current.getBoundingClientRect();

    const rawX = ((clientX - rect.left) / rect.width) * 100;
    const rawY = ((clientY - rect.top) / rect.height) * 100;

    const clampedX = Math.max(8, Math.min(92, Math.round(rawX)));
    const clampedY = Math.max(6, Math.min(94, Math.round(rawY)));

    setFleets((prev) =>
      prev.map((fleet) =>
        fleet.id === activeFleet.id
          ? {
              ...fleet,
              seats: fleet.seats.map((s) =>
                s.id === draggingId ? { ...s, x: clampedX, y: clampedY } : s,
              ),
            }
          : fleet,
      ),
    );
  };

  const handlePointerUp = () => {
    if (draggingId) {
      setDraggingId(null);
      saveFleets(fleets);
    }
  };

  const handleCreateBus = () => {
    if (!newBusForm.name.trim()) return;
    const count = Number(newBusForm.seatCount) || 17;
    const generatedSeats = generateInitialSeats(count, Number(newBusForm.price) || 250000);
    const newFleet: BusFleet = {
      id: "fleet-" + Date.now(),
      name: newBusForm.name,
      route: newBusForm.route || "Rute Belum Ditentukan",
      totalSeats: count,
      seats: generatedSeats,
    };

    const updated = [...fleets, newFleet];
    saveFleets(updated);
    setActiveFleetId(newFleet.id);
    setIsNewBusOpen(false);
    setNewBusForm({ name: "", route: "", seatCount: 17, price: 250000 });
    setIsEditMode(true); // Otomatis aktifkan mode susun kursi
  };

  const handleDeleteBus = (fleetId: string) => {
    if (fleets.length <= 1) {
      alert("Harus ada minimal 1 armada bus.");
      return;
    }
    if (!confirm("Hapus armada bus ini beserta denah kursinya?")) return;
    const updated = fleets.filter((f) => f.id !== fleetId);
    saveFleets(updated);
    setActiveFleetId(updated[0].id);
  };

  const handleSaveSeatData = () => {
    if (!selectedSeat) return;
    const updatedSeats = activeFleet.seats.map((s) =>
      s.id === selectedSeat.id
        ? {
            ...s,
            status: seatForm.status,
            passengerName: seatForm.status === "AVAILABLE" ? undefined : seatForm.passengerName,
            passengerPhone: seatForm.status === "AVAILABLE" ? undefined : seatForm.passengerPhone,
            price: Number(seatForm.price),
          }
        : s,
    );

    const updatedFleets = fleets.map((f) =>
      f.id === activeFleet.id ? { ...f, seats: updatedSeats } : f,
    );

    saveFleets(updatedFleets);
    setSelectedSeat(updatedSeats.find((s) => s.id === selectedSeat.id) || null);
    setIsSeatModalOpen(false);
  };

  const availableCount = activeFleet.seats.filter((s) => s.status === "AVAILABLE").length;
  const bookedCount = activeFleet.seats.filter((s) => s.status === "BOOKED").length;
  const occupiedCount = activeFleet.seats.filter((s) => s.status === "OCCUPIED").length;

    return (
    <div
      className="space-y-6 select-none"
      onMouseUp={handlePointerUp}
      onTouchEnd={handlePointerUp}
      onMouseMove={(e) => handlePointerMove(e.clientX, e.clientY)}
      onTouchMove={(e) => {
        if (e.touches[0]) {
          handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
        }
      }}
    >
      {/* Header Info & Pilihan Armada Bus */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-700 via-blue-700 to-slate-900 p-6 text-white shadow-xl">
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/20 p-3 backdrop-blur-sm">
              <Bus className="h-7 w-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight">{activeFleet.name}</h1>
                <Badge className="bg-emerald-500 text-white font-semibold">
                  {activeFleet.totalSeats} Kursi
                </Badge>
              </div>
              <p className="mt-0.5 text-xs text-blue-100 flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-rose-300" /> {activeFleet.route}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20 text-xs gap-1.5"
              onClick={() => setIsNewBusOpen(true)}
            >
              <Plus className="h-4 w-4" /> Tambah Bus Baru
            </Button>
            {fleets.length > 1 && (
              <Button
                size="sm"
                variant="ghost"
                className="text-rose-200 hover:text-rose-100 hover:bg-rose-500/20 text-xs"
                onClick={() => handleDeleteBus(activeFleet.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Tab Pilihan Armada jika lebih dari 1 */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/10 overflow-x-auto">
          {fleets.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => {
                setActiveFleetId(f.id);
                setSelectedSeat(null);
              }}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0",
                f.id === activeFleet.id
                  ? "bg-white text-blue-900 shadow-sm"
                  : "bg-white/10 text-white hover:bg-white/20",
              )}
            >
              {f.name} ({f.totalSeats} Seat)
            </button>
          ))}
        </div>
      </div>

      {/* Toolbar: Toggle Mode Drag & Drop vs Mode Booking */}
      <Card className="p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={isEditMode ? "default" : "outline"}
              className={cn(
                "text-xs gap-1.5 h-8 font-semibold",
                isEditMode
                  ? "bg-amber-600 hover:bg-amber-700 text-white shadow-sm"
                  : "border-slate-300 dark:border-slate-700",
              )}
              onClick={() => {
                setIsEditMode(!isEditMode);
                setSelectedSeat(null);
              }}
            >
              <Move className="h-3.5 w-3.5" />
              {isEditMode ? "Selesai Atur Posisi (Simpan)" : "Atur Posisi Kursi (Drag & Drop)"}
            </Button>
            <span className="text-[11px] text-muted-foreground">
              {isEditMode
                ? "💡 Geser/tarik nomor kursi secara bebas ke posisi denah yang Anda inginkan."
                : "💡 Mode Reservasi: Klik kursi untuk melihat/mengubah status penumpang."}
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-emerald-500" />
              <span className="text-[11px] text-muted-foreground">{availableCount} Kosong</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-amber-500" />
              <span className="text-[11px] text-muted-foreground">{bookedCount} Booking</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-rose-500" />
              <span className="text-[11px] text-muted-foreground">{occupiedCount} Terisi</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Main Grid: Denah Drag-n-Drop (Kiri) + Info Kursi (Kanan) */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Kanvas Denah Bus */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base font-bold flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Armchair className="h-5 w-5 text-blue-600" />
                Denah Kursi: {activeFleet.name}
              </div>
              {isEditMode && (
                <Badge className="bg-amber-500 text-white animate-pulse">Mode Drag &amp; Drop Aktif</Badge>
              )}
            </CardTitle>
            <CardDescription className="text-xs">
              Visualisasi kabin bus. Posisi kursi dapat disesuaikan secara presisi dengan bentuk asli armada.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div
              ref={canvasRef}
              className={cn(
                "relative max-w-lg mx-auto h-[620px] rounded-3xl border-4 border-slate-700/50 dark:border-slate-600 bg-slate-100/70 dark:bg-slate-900/40 shadow-inner overflow-hidden",
                isEditMode && "cursor-crosshair ring-2 ring-amber-500/50",
              )}
            >
              {/* Bagian Depan Bus / Sopir */}
              <div className="absolute top-0 inset-x-0 h-16 border-b border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-between px-6 bg-slate-200/40 dark:bg-slate-800/40">
                <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold px-2.5 py-1 rounded-md bg-white/70 dark:bg-slate-800 shadow-sm">
                  <Bus className="h-4 w-4 text-blue-600" /> Depan / Kemudi Sopir
                </div>
                <div className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">
                  Pintu Masuk
                </div>
              </div>

              {/* Garis-garis Pembantu (Aisle Guide) */}
              <div className="absolute inset-y-16 left-1/2 -translate-x-1/2 w-8 border-x border-dashed border-slate-300/40 dark:border-slate-800/60 pointer-events-none flex items-center justify-center">
                <span className="[writing-mode:vertical-rl] text-[9px] font-mono tracking-widest text-slate-300 dark:text-slate-700 uppercase">
                  G A N G
                </span>
              </div>

              {/* Elemen-elemen Kursi yang bisa di Drag & Drop */}
              {activeFleet.seats.map((seat) => {
                const cfg = SEAT_STATUS_CONFIG[seat.status];
                const isSelected = selectedSeat?.id === seat.id;
                const isDragging = draggingId === seat.id;

                return (
                  <div
                    key={seat.id}
                    onMouseDown={(e) => handleDragStart(seat.id, e.clientX, e.clientY, e)}
                    onTouchStart={(e) => {
                      if (e.touches[0]) {
                        handleDragStart(seat.id, e.touches[0].clientX, e.touches[0].clientY, e);
                      }
                    }}
                    onClick={() => {
                      if (!isEditMode) {
                        setSelectedSeat(seat);
                      }
                    }}
                    style={{
                      left: `${seat.x}%`,
                      top: `${seat.y}%`,
                      transform: "translate(-50%, -50%)",
                    }}
                    className={cn(
                      "absolute flex flex-col items-center justify-center h-13 w-13 rounded-xl border-2 transition-transform shadow-md select-none",
                      cfg.bg,
                      cfg.border,
                      isEditMode
                        ? "cursor-grab active:cursor-grabbing hover:scale-110 ring-1 ring-amber-400"
                        : "cursor-pointer hover:scale-105",
                      isSelected && "ring-2 ring-blue-600 scale-110 z-20",
                      isDragging && "scale-125 z-30 shadow-xl opacity-90",
                    )}
                  >
                    <Armchair className={cn("h-4 w-4", cfg.text)} />
                    <span className={cn("text-xs font-black", cfg.text)}>{seat.label}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Panel Detail Kursi */}
        <Card className="flex flex-col">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base font-bold">Detail Tiket Kursi</CardTitle>
            <CardDescription className="text-xs">Informasi pemesan dan tarif kursi terpilih.</CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-4 flex-1">
            {selectedSeat ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-black text-xl grid place-items-center border border-blue-200">
                      {selectedSeat.label}
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Nomor Kursi</p>
                      <Badge className={cn("text-[10px] mt-0.5", SEAT_STATUS_CONFIG[selectedSeat.status].badge)}>
                        {SEAT_STATUS_CONFIG[selectedSeat.status].label}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1.5 text-xs"
                    onClick={() => {
                      setSeatForm({
                        status: selectedSeat.status,
                        passengerName: selectedSeat.passengerName || "",
                        passengerPhone: selectedSeat.passengerPhone || "",
                        price: selectedSeat.price || 250000,
                      });
                      setIsSeatModalOpen(true);
                    }}
                  >
                    <Edit2 className="h-3.5 w-3.5" /> Ubah
                  </Button>
                </div>

                <div className="rounded-xl border p-3.5 space-y-2.5 bg-muted/20 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Harga Tiket:</span>
                    <span className="font-bold text-foreground">Rp {selectedSeat.price.toLocaleString("id-ID")}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-muted-foreground">Nama Penumpang:</span>
                    <span className="font-semibold text-foreground">{selectedSeat.passengerName || "-"}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-muted-foreground">No. WhatsApp:</span>
                    <span className="font-mono text-foreground">{selectedSeat.passengerPhone ? `+${selectedSeat.passengerPhone}` : "-"}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2 text-[10px] text-muted-foreground">
                    <span>Posisi Denah (X, Y):</span>
                    <span>{selectedSeat.x}%, {selectedSeat.y}%</span>
                  </div>
                </div>

                {selectedSeat.passengerPhone && (
                  <Button
                    variant="outline"
                    className="w-full text-xs h-9 gap-2 border-emerald-600 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                    onClick={() => {
                      window.open(`https://wa.me/${selectedSeat.passengerPhone?.replace(/\D/g, "")}`, "_blank");
                    }}
                  >
                    <Phone className="h-4 w-4" /> Hubungi Penumpang
                  </Button>
                )}
              </div>
            ) : (
              <div className="h-full grid place-items-center text-center py-12 text-muted-foreground text-xs">
                <div>
                  <Armchair className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  {isEditMode
                    ? "Tarik kursi ke posisi presisi yang diinginkan."
                    : "Klik salah satu kursi di denah untuk melihat atau mengubah status reservasi."}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal Tambah Armada Bus Baru */}
      <Dialog open={isNewBusOpen} onOpenChange={setIsNewBusOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bus className="h-5 w-5 text-indigo-600" />
              Tambah Armada Bus &amp; Generate Kursi
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3.5 text-xs">
            <div>
              <Label className="font-medium">Nama Armada / Tipe Bus</Label>
              <Input
                value={newBusForm.name}
                onChange={(e) => setNewBusForm({ ...newBusForm, name: e.target.value })}
                placeholder="Misal: Big Bus Pariwisata 31 Seat"
                className="h-8 mt-1 text-xs"
              />
            </div>
            <div>
              <Label className="font-medium">Rute Perjalanan</Label>
              <Input
                value={newBusForm.route}
                onChange={(e) => setNewBusForm({ ...newBusForm, route: e.target.value })}
                placeholder="Misal: Jakarta - Surabaya (PP)"
                className="h-8 mt-1 text-xs"
              />
            </div>
            <div>
              <Label className="font-medium">Jumlah / Rentang Kursi (Total Seats)</Label>
              <Input
                type="number"
                min="4"
                max="60"
                value={newBusForm.seatCount}
                onChange={(e) => setNewBusForm({ ...newBusForm, seatCount: Number(e.target.value) })}
                className="h-8 mt-1 text-xs font-mono"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Sistem akan membuatkan posisi awal kursi secara otomatis, kemudian Anda dapat menggeser (drag &amp; drop) posisinya sesuai tata letak asli bus.
              </p>
            </div>
            <div>
              <Label className="font-medium">Harga Tiket Default (Rp)</Label>
              <Input
                type="number"
                value={newBusForm.price}
                onChange={(e) => setNewBusForm({ ...newBusForm, price: Number(e.target.value) })}
                className="h-8 mt-1 text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsNewBusOpen(false)}>
              Batal
            </Button>
            <Button size="sm" onClick={handleCreateBus} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5">
              <Sparkles className="h-3.5 w-3.5" /> Generate &amp; Susun Denah
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Edit Status Kursi */}
      <Dialog open={isSeatModalOpen} onOpenChange={setIsSeatModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Armchair className="h-5 w-5 text-blue-600" />
              Kelola Kursi #{selectedSeat?.label}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3.5 text-xs">
            <div>
              <Label className="font-medium">Status Ketersediaan</Label>
              <select
                value={seatForm.status}
                onChange={(e) => setSeatForm({ ...seatForm, status: e.target.value as SeatStatus })}
                className="w-full h-8 mt-1 rounded-md border bg-background px-2 text-xs"
              >
                <option value="AVAILABLE">Tersedia (Kosong)</option>
                <option value="BOOKED">Dipesan (Menunggu Pelunasan/DP)</option>
                <option value="OCCUPIED">Terisi / Lunas</option>
              </select>
            </div>

            {seatForm.status !== "AVAILABLE" && (
              <>
                <div>
                  <Label className="font-medium">Nama Penumpang</Label>
                  <Input
                    value={seatForm.passengerName}
                    onChange={(e) => setSeatForm({ ...seatForm, passengerName: e.target.value })}
                    placeholder="Nama lengkap penumpang"
                    className="h-8 mt-1 text-xs"
                  />
                </div>
                <div>
                  <Label className="font-medium">Nomor WhatsApp Penumpang</Label>
                  <Input
                    value={seatForm.passengerPhone}
                    onChange={(e) => setSeatForm({ ...seatForm, passengerPhone: e.target.value })}
                    placeholder="081234567890"
                    className="h-8 mt-1 text-xs font-mono"
                  />
                </div>
              </>
            )}

            <div>
              <Label className="font-medium">Harga Tiket (Rp)</Label>
              <Input
                type="number"
                value={seatForm.price}
                onChange={(e) => setSeatForm({ ...seatForm, price: Number(e.target.value) })}
                className="h-8 mt-1 text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsSeatModalOpen(false)}>
              Batal
            </Button>
            <Button size="sm" onClick={handleSaveSeatData} className="bg-blue-600 hover:bg-blue-700 text-white">
              Simpan Perubahan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
