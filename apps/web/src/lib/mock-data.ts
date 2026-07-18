export type Role = "superadmin" | "admin" | "manager" | "operator" | "marketing" | "keuangan";
export type User = any;
export type Contact = any;
export type Property = any;
export type Order = any;
export type Campaign = any;
export type Invoice = any;
export type ChatMessage = any;
export type WhatsAppSession = any;
export type MessageTemplate = any;
import type { ChartPoint } from "./types";

export const DEMO_ACCOUNTS: { email: string; password: string; role: Role; name: string }[] = [];
export const ALL_USERS: User[] = [];
export const WA_SESSIONS: WhatsAppSession[] = [];
export const CONTACTS: Contact[] = [];
export const CHAT_MESSAGES: ChatMessage[] = [];
export const PROPERTIES: Property[] = [];
export const ORDERS: Order[] = [];
export const CAMPAIGNS: Campaign[] = [];
export const MESSAGE_TEMPLATES: MessageTemplate[] = [];
export const INVOICES: Invoice[] = [];

export const REVENUE_TREND: ChartPoint[] = [];
export const LEAD_SOURCE: ChartPoint[] = [];
export const FUNNEL_DATA: ChartPoint[] = [];

export function formatCurrency(n: number): string {
  if (!n) return "Rp 0";
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1).replace(".", ",")} M`;
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(0)} jt`;
  if (n >= 1_000) return `Rp ${(n / 1_000).toFixed(0)} rb`;
  return `Rp ${n}`;
}

export function formatFullCurrency(n: number): string {
  if (!n) return "Rp 0";
  return "Rp " + n.toLocaleString("id-ID");
}
