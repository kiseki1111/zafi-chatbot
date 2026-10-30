// ===== Core Auth & RBAC =====
export type Role = "superadmin" | "manager" | "administrator" | "operator" | "marketing" | string;

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: Role;
  avatar?: string;
  status: "active" | "suspended";
  createdAt: string;
  lastLogin?: string;
  division?: string;
  tenantId?: string | null;
}

export type ViewKey =
  | "overview"
  | "clients"
  | "availability"
  | "bus_layout"
  | "chatbot"
  | "knowledge"
  | "followup"
  | "settings"
  | "crm"
  // Superadmin modules
  | "platform_overview"
  | "waha_monitor"
  | "quota_monitor"
  | "pricing_plans"
  | "ai_config"
  | "system_logs";

// ===== Resource & Availability (Generic Units / Slots) =====
export type ResourceStatus = "AVAILABLE" | "BOOKED" | "OCCUPIED" | "MAINTENANCE";
export type PropertyType = "BANGUNAN" | "TANAH" | "TANAH_BANGUNAN";

export interface SiteplanPricingConfig {
  landArea?: string; // Luas tanah / kavling (misal: "120 m²" atau "10x12")
  landPrice?: number; // Harga tanah saja (Rp)
  buildingType?: string; // Tipe bangunan saja (misal: "36" atau "45")
  buildingPrice?: number; // Harga bangunan saja (Rp)
  packageType?: string; // Tipe rumah & kavling (misal: "36/120")
  packagePrice?: number; // Harga paket lengkap tanah + bangunan (Rp)
}

export type PricingTemplate = SiteplanPricingConfig;

export interface ResourceItem {
  id: string;
  groupId: string;
  code: string; // Misal: "Blok A-01", "Blok B-05"
  name?: string; // Nama blok / keterangan
  propertyType?: PropertyType | string; // "BANGUNAN" (Bangunan Rumah) | "TANAH" (Tanah Kosong) | "TANAH_BANGUNAN" (Paket Tanah + Bangunan)
  houseType?: string; // Tipe rumah: "36/72", "45/90", dll
  status: ResourceStatus;
  capacity?: number;
  price?: number;
  notes?: string;
  customerName?: string;
  customerPhone?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ResourceGroup {
  id: string;
  name: string; // Misal: "Cluster Grand Harmoni", "Bus Eksekutif 01", "Lantai 1 Utama"
  category?: string; // "properti", "transport", "resto", "lainnya"
  description?: string;
  siteplanImage?: string; // URL layout denah (opsional)
  pricingTemplates?: SiteplanPricingConfig | any;
  tenantId?: string;
  items: ResourceItem[];
  createdAt?: string;
  updatedAt?: string;
}

// ===== WhatsApp / Chatbot =====
export type ChatSessionStatus = "connected" | "disconnected" | "connecting";
export type MessageDirection = "in" | "out";
export type MessageStatus = "sent" | "delivered" | "read" | "failed";

export interface ChatMessage {
  id: string;
  contactId: string;
  direction: MessageDirection;
  text: string;
  status: MessageStatus;
  timestamp: string;
  createdAt?: string;
  isAI?: boolean;
  isFollowUp?: boolean;
  mediaUrl?: string;
  messageType?: string;
  senderName?: string;
}

export interface Contact {
  id: string;
  name: string;
  phone: string;
  avatar?: string;
  about?: string;
  tags: string[];
  lastMessage?: string;
  lastMessageAt?: string;
  unread: number;
  stage: "lead" | "prospect" | "negotiation" | "customer";
  assignedTo?: string;
  assignedToName?: string;
  propertyInterest?: string;
  instanceName?: string;
  mode?: "bot" | "human";
}

export interface WhatsAppSession {
  id: string;
  name: string;
  phone: string;
  status: ChatSessionStatus;
  battery?: number;
  lastSeen?: string;
}

// ===== Dashboard =====
export interface StatCard {
  key: string;
  label: string;
  value: string;
  delta: number;
  icon: string;
}

export interface ChartPoint {
  label: string;
  value: number;
  value2?: number;
}
