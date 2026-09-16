import {
  AlertTriangle, BadgeCheck, Bell, Briefcase, LifeBuoy, CalendarClock, CheckCircle2, ClipboardList, CreditCard, Crown, FileText, Mail, MessageCircle, MessageSquare, PackageCheck,
  Receipt, RotateCcw, ShieldCheck, Smartphone, Star, Truck, Wallet, Wrench, XCircle, type LucideIcon,
} from "lucide-react";

export type NotificationCategory = "orders" | "estimates" | "payments" | "care" | "alerts" | "work" | "other";
export type NotificationTone = "teal" | "blue" | "amber" | "green" | "red" | "violet" | "indigo" | "slate" | "orange";

export interface NotificationMeta {
  icon: LucideIcon;
  tone: NotificationTone;
  category: NotificationCategory;
}

/** Bildiriş hadisəsinə görə ikon, rəng tonu və kateqoriya (bildiriş paneli və zəng menyusu üçün). */
const EVENTS: Record<string, NotificationMeta> = {
  ORDER_CREATED: { icon: ClipboardList, tone: "blue", category: "orders" },
  ORDER_CONFIRMED: { icon: CheckCircle2, tone: "teal", category: "orders" },
  ORDER_COMPLETED: { icon: BadgeCheck, tone: "green", category: "orders" },
  TECHNICIAN_ASSIGNED: { icon: Wrench, tone: "indigo", category: "orders" },
  TECHNICIAN_ON_WAY: { icon: Truck, tone: "blue", category: "orders" },
  COURIER_ON_WAY: { icon: Truck, tone: "blue", category: "orders" },
  DEVICE_READY: { icon: PackageCheck, tone: "green", category: "orders" },
  RESCHEDULED: { icon: CalendarClock, tone: "orange", category: "orders" },
  FORM_CHANGED: { icon: RotateCcw, tone: "orange", category: "orders" },
  SALES_STATUS: { icon: PackageCheck, tone: "teal", category: "orders" },
  ESTIMATE_READY: { icon: FileText, tone: "amber", category: "estimates" },
  ESTIMATE_QUESTION: { icon: MessageSquare, tone: "amber", category: "estimates" },
  QUOTE_REQUEST: { icon: FileText, tone: "amber", category: "estimates" },
  QUOTE_SENT: { icon: FileText, tone: "amber", category: "estimates" },
  PAYMENT_OK: { icon: CreditCard, tone: "green", category: "payments" },
  PAYMENT_FAIL: { icon: XCircle, tone: "red", category: "payments" },
  REFUND: { icon: Receipt, tone: "violet", category: "payments" },
  SETTLEMENT_PAID: { icon: Wallet, tone: "green", category: "payments" },
  SETTLEMENT_APPROVED: { icon: Wallet, tone: "green", category: "payments" },
  CASH_HANDOVER: { icon: Wallet, tone: "teal", category: "payments" },
  SUBSCRIPTION_EXPIRING: { icon: Crown, tone: "violet", category: "care" },
  SUBSCRIPTION_PAST_DUE: { icon: Crown, tone: "red", category: "care" },
  WARRANTY_EXPIRING: { icon: ShieldCheck, tone: "orange", category: "care" },
  WARRANTY_CLAIM: { icon: ShieldCheck, tone: "amber", category: "care" },
  WARRANTY_APPROVED: { icon: ShieldCheck, tone: "green", category: "care" },
  LOW_STOCK: { icon: AlertTriangle, tone: "orange", category: "alerts" },
  SLA_BREACH: { icon: AlertTriangle, tone: "red", category: "alerts" },
  LOW_RATING: { icon: Star, tone: "red", category: "alerts" },
  DOCUMENT_EXPIRING: { icon: AlertTriangle, tone: "orange", category: "alerts" },
  TASK_FAILED: { icon: XCircle, tone: "red", category: "alerts" },
  CASH_DISCREPANCY: { icon: AlertTriangle, tone: "red", category: "alerts" },
  NEW_OFFER: { icon: Briefcase, tone: "indigo", category: "work" },
  NEW_TASK: { icon: Briefcase, tone: "indigo", category: "work" },
  VERIFICATION: { icon: BadgeCheck, tone: "teal", category: "work" },
  LIMIT_REQUEST: { icon: Wallet, tone: "amber", category: "work" },
  TICKET_CREATED: { icon: LifeBuoy, tone: "blue", category: "care" },
  TICKET_REPLY: { icon: MessageSquare, tone: "teal", category: "care" },
  TICKET_RESOLVED: { icon: CheckCircle2, tone: "green", category: "care" },
  TICKET_ASSIGNED: { icon: LifeBuoy, tone: "indigo", category: "work" },
  TICKET_ESCALATED: { icon: AlertTriangle, tone: "orange", category: "alerts" },
  TICKET_SLA_BREACH: { icon: AlertTriangle, tone: "red", category: "alerts" },
  LOYALTY_TIER_UP: { icon: Crown, tone: "violet", category: "care" },
  LOYALTY_REFERRAL: { icon: Star, tone: "amber", category: "care" },
};

export function notificationMeta(event?: string | null): NotificationMeta {
  return (event && EVENTS[event]) || { icon: Bell, tone: "slate", category: "other" };
}

const CATEGORIES: Record<NotificationCategory, { icon: LucideIcon; tone: NotificationTone }> = {
  orders: { icon: ClipboardList, tone: "teal" },
  estimates: { icon: FileText, tone: "amber" },
  payments: { icon: CreditCard, tone: "green" },
  care: { icon: ShieldCheck, tone: "violet" },
  alerts: { icon: AlertTriangle, tone: "red" },
  work: { icon: Briefcase, tone: "indigo" },
  other: { icon: Bell, tone: "slate" },
};

export const categoryMeta = (c: NotificationCategory) => CATEGORIES[c];

export const CHANNEL_ICONS: Record<string, LucideIcon> = { SMS: Smartphone, PUSH: Bell, EMAIL: Mail, WHATSAPP: MessageCircle, IN_APP: Bell };
