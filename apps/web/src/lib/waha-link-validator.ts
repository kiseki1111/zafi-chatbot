/**
 * Utilitas Validasi Link Media untuk Pengiriman via WhatsApp (WAHA)
 * Memverifikasi apakah suatu URL gambar/video/dokumen dapat dikirim dengan sukses oleh gateway WAHA.
 */

export interface WahaLinkStatus {
  isValid: boolean;
  statusText: string;
  badgeVariant: "success" | "warning" | "destructive" | "secondary";
  description: string;
}

export function checkWahaMediaLink(url?: string | null): WahaLinkStatus {
  if (!url || typeof url !== "string" || !url.trim()) {
    return {
      isValid: false,
      statusText: "Tanpa Link",
      badgeVariant: "warning",
      description: "Item ini tidak memiliki URL/link media.",
    };
  }

  const clean = url.trim();

  // Local uploads (/uploads/...)
  if (clean.startsWith("/uploads/")) {
    const isSupported =
      /\.(jpg|jpeg|png|webp|gif|bmp|mp4|mov|webm|pdf|doc|docx|xls|xlsx|txt)$/i.test(
        clean,
      );
    if (!isSupported) {
      return {
        isValid: false,
        statusText: "Format Belum Didukung",
        badgeVariant: "warning",
        description:
          "Ekstensi file ini belum didukung untuk pengiriman otomatis via WhatsApp.",
      };
    }
    return {
      isValid: true,
      statusText: "Siap Kirim WAHA",
      badgeVariant: "success",
      description:
        "File tersimpan di server lokal dan siap dikirim otomatis oleh bot WhatsApp.",
    };
  }

  // External URLs
  try {
    const parsed = new URL(clean);
    const host = parsed.hostname.toLowerCase();

    // Check private / unreachable hosts
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host.startsWith("192.168.") ||
      host.startsWith("10.") ||
      host.startsWith("172.")
    ) {
      return {
        isValid: false,
        statusText: "IP Lokal (Tidak Terjangkau WAHA)",
        badgeVariant: "destructive",
        description:
          "Link menggunakan IP privat/localhost. Gateway WAHA tidak bisa mengunduh file ini dari internet.",
      };
    }

    if (host.includes("example.com")) {
      return {
        isValid: false,
        statusText: "Link Dummy (example.com)",
        badgeVariant: "destructive",
        description: "Link placeholder example.com tidak bisa dikirim.",
      };
    }

    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return {
        isValid: false,
        statusText: "Protokol Tidak Valid",
        badgeVariant: "destructive",
        description:
          "Hanya protokol HTTP/HTTPS yang didukung oleh WhatsApp gateway.",
      };
    }

    const isSocialOrWeb =
      host.includes("instagram.com") ||
      host.includes("instagr.am") ||
      host.includes("tiktok.com") ||
      host.includes("youtube.com") ||
      host.includes("youtu.be") ||
      host.includes("facebook.com") ||
      host.includes("fb.watch") ||
      host.includes("drive.google.com") ||
      host.includes("dropbox.com") ||
      !/\.(jpg|jpeg|png|webp|gif|bmp|mp4|mov|webm|pdf|doc|docx|xls|xlsx|txt)($|\?)/i.test(clean);

    if (isSocialOrWeb) {
      return {
        isValid: true,
        statusText: "Tautan Sosial Media (Preview Teks)",
        badgeVariant: "secondary",
        description:
          "Tautan sosial media/web akan otomatis dikirim sebagai pesan teks dengan rich preview oleh WhatsApp (bukan file biner download).",
      };
    }

    return {
      isValid: true,
      statusText: "Siap Kirim WAHA (Public URL)",
      badgeVariant: "success",
      description:
        "URL publik aktif dan dapat diakses gateway WAHA untuk dikirim ke pelanggan.",
    };
  } catch {
    return {
      isValid: false,
      statusText: "Link Tidak Valid",
      badgeVariant: "destructive",
      description: "Format URL tidak memenuhi standar web.",
    };
  }
}
