// ===== Core Auth & RBAC =====
export type Role = "superadmin" | "operator" | "user";

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
}

export type ViewKey =
  | "overview"
  | "chatbot"
  | "settings";

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
  isAI?: boolean;
}

export interface Contact {
  id: string;
  name: string;
  phone: string;
  avatar?: string;
  tags: string[];
  lastMessage?: string;
  lastMessageAt?: string;
  unread: number;
  stage: "lead" | "prospect" | "negotiation" | "customer";
  assignedTo?: string;
  propertyInterest?: string;
  instanceName?: string;
}

export interface WhatsAppSession {
  id: string;
  name: string;
  phone: string;
  status: ChatSessionStatus;
  battery?: number;
  lastSeen?: string;
}

// ===== Properties =====
export type PropertyType = "rumah" | "apartemen" | "ruko" | "tanah" | "gudang";
export type PropertyStatus = "tersedia" | "terjual" | "tersewa" | "draft";

export interface Property {
  id: string;
  title: string;
  type: PropertyType;
  price: number;
  location: string;
  bedrooms?: number;
  bathrooms?: number;
  area: number;
  status: PropertyStatus;
  image?: string;
  agent: string;
  createdAt: string;
}

// ===== Orders =====
export type OrderStatus =
  | "baru"
  | "diproses"
  | "negosiasi"
  | "deal"
  | "gagal"
  | "dibatalkan";
export type OrderType = "jual" | "sewa";

export interface Order {
  id: string;
  code: string;
  contactId: string;
  contactName: string;
  propertyId: string;
  propertyTitle: string;
  type: OrderType;
  amount: number;
  status: OrderStatus;
  agent: string;
  createdAt: string;
  updatedAt: string;
}

// ===== Marketing =====
export type CampaignStatus = "draft" | "dijadwalkan" | "aktif" | "selesai" | "gagal";
export type CampaignChannel = "whatsapp" | "email" | "sms";

export interface Campaign {
  id: string;
  name: string;
  channel: CampaignChannel;
  status: CampaignStatus;
  audience: number;
  sent: number;
  delivered: number;
  read: number;
  replied: number;
  scheduledAt?: string;
  createdAt: string;
  message: string;
}

export interface MessageTemplate {
  id: string;
  name: string;
  category: string;
  body: string;
  createdAt: string;
}

// ===== Finance =====
export type InvoiceStatus = "lunas" | "belum-bayar" | "jatuh-tempo" | "dibatalkan";
export type PaymentMethod = "transfer" | "cash" | "cicilan" | "qris";

export interface Invoice {
  id: string;
  number: string;
  orderId: string;
  contactName: string;
  amount: number;
  status: InvoiceStatus;
  method: PaymentMethod;
  issuedAt: string;
  dueAt: string;
  paidAt?: string;
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
