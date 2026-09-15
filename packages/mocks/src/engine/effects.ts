import type { LocalizedText } from "@sp/types";
import { db, nextNumber } from "../db/state";
import type { DocumentRec, PaymentRec, WarrantyRec } from "../db/types";
import { L, t } from "../lib/i18n";
import { idFor, newId } from "../lib/rng";
import { addMinutes, nowIso } from "../lib/time";
import type { Ctx } from "./context";
import { fullName } from "./context";
import { earnForPayment } from "./loyalty";

/** Yan təsirlər: bildiriş, audit, sənəd, ödəniş, zəmanət, kassa (PRD §49, §50, §58). */

const all = (key: string): LocalizedText => ({ az: t(key, "az"), ru: t(key, "ru"), en: t(key, "en") });

export function notify(userId: string | null | undefined, event: string, titleKey: string, body: LocalizedText, link: string | null, channel: "IN_APP" | "PUSH" | "EMAIL" | "SMS" | "WHATSAPP" = "IN_APP") {
  if (!userId) return;
  db.notifications.unshift({
    id: newId("notif"),
    userId,
    event,
    title: all(titleKey),
    body,
    link,
    read: false,
    createdAt: nowIso(),
    channel,
  });
}

export function audit(ctx: Ctx | null, action: string, resource: string, resourceId: string, resourceLabel: string, changes: { field: string; from: string | null; to: string | null }[] = [], reason?: string) {
  db.auditLogs.unshift({
    id: newId("audit"),
    at: nowIso(),
    actorName: ctx?.user ? fullName(ctx.user) : "Sistem",
    actorRole: ctx?.role ?? "SYSTEM",
    action,
    resource,
    resourceId,
    resourceLabel,
    ip: "10.0.0." + ((resourceId.charCodeAt(0) % 200) + 10),
    changes,
    reason,
  });
}

const series: Record<DocumentRec["type"], string> = {
  FISCAL_RECEIPT: "FC",
  INVOICE: "HF",
  E_INVOICE: "EQ",
  SERVICE_ACT: "SA",
  WARRANTY: "ZM",
  RECONCILIATION_ACT: "UA",
  INTAKE_ACT: "QA",
  HANDOVER_ACT: "TA",
  SETTLEMENT_ACT: "HA",
};

export function issueDocument(input: Omit<DocumentRec, "id" | "number" | "series" | "status" | "issuedAt" | "syncStatus" | "qrCode" | "fiscalNumber" | "correctionOf" | "meta"> & Partial<Pick<DocumentRec, "meta" | "fiscalNumber" | "issuedAt">>): DocumentRec {
  const s = series[input.type];
  const number = nextNumber(s, 20260000);
  const doc: DocumentRec = {
    ...input,
    id: newId("doc"),
    number,
    series: s,
    status: "ISSUED",
    issuedAt: input.issuedAt ?? nowIso(),
    syncStatus: input.type === "E_INVOICE" ? "SENT" : "NOT_SENT",
    qrCode: input.type === "WARRANTY" || input.type === "FISCAL_RECEIPT" ? `${s}${number.replace(/\D/g, "")}` : null,
    fiscalNumber: input.fiscalNumber ?? null,
    correctionOf: null,
    meta: input.meta ?? {},
  };
  db.documents.unshift(doc);
  return doc;
}

export function recordPayment(input: {
  payerId: string;
  payerName: string;
  orderType: PaymentRec["orderType"];
  orderId: string | null;
  orderNumber: string;
  method: PaymentRec["method"];
  amountCents: number;
  status?: PaymentRec["status"];
  kind?: PaymentRec["kind"];
  collectedById?: string | null;
  idempotencyKey?: string | null;
  installmentMonths?: number | null;
  createdAt?: string;
}): PaymentRec {
  if (input.idempotencyKey) {
    const existing = db.payments.find((p) => p.idempotencyKey === input.idempotencyKey);
    if (existing) return existing;
  }
  const status = input.status ?? "PAID";
  const provider =
    input.method === "CARD_ONLINE" ? "Epoint" : input.method === "INSTALLMENT" ? "BirKart" : input.method === "CARD_POS" ? "Kapital Bank POS" : input.method === "BANK_TRANSFER" ? "Bank" : null;
  const payment: PaymentRec = {
    id: newId("pay"),
    number: nextNumber("PAY", 50000),
    status,
    method: input.method,
    kind: input.kind ?? "FULL",
    amountCents: input.amountCents,
    refundedCents: 0,
    payerId: input.payerId,
    payerName: input.payerName,
    orderType: input.orderType,
    orderId: input.orderId,
    orderNumber: input.orderNumber,
    provider,
    fiscalNumber: null,
    collectedById: input.collectedById ?? null,
    createdAt: input.createdAt ?? nowIso(),
    paidAt: status === "PAID" ? input.createdAt ?? nowIso() : null,
    failureReason: null,
    installmentMonths: input.installmentMonths ?? null,
    idempotencyKey: input.idempotencyKey ?? null,
  };
  db.payments.unshift(payment);
  if (status === "PAID") onPaymentPaid(payment);
  return payment;
}

/** Ödəniş uğurlu olduqda: fiskal çek (nağd/kart), nağd kassası balansı, loyallıq xalı və keşbek. */
export function onPaymentPaid(payment: PaymentRec) {
  payment.paidAt ??= nowIso();
  earnForPayment(payment);
  if (["CASH", "CARD_ONLINE", "CARD_POS", "INSTALLMENT"].includes(payment.method)) {
    const fiscal = `NKA${String(700000 + db.documents.length).padStart(8, "0")}`;
    payment.fiscalNumber = fiscal;
    issueDocument({
      type: "FISCAL_RECEIPT",
      ownerId: payment.payerId,
      counterpartyName: payment.payerName,
      counterpartyVoen: null,
      orderType: payment.orderType === "B2B_INVOICE" ? "B2B" : payment.orderType,
      orderId: payment.orderId,
      orderNumber: payment.orderNumber,
      lines: [{ name: L(`Ödəniş — ${payment.orderNumber}`, `Оплата — ${payment.orderNumber}`, `Payment — ${payment.orderNumber}`), quantity: "1", unit: "pcs", unitCents: payment.amountCents, vatRate: 18 }],
      vatIncluded: true,
      fiscalNumber: fiscal,
      meta: { method: payment.method, paymentNumber: payment.number },
      issuedAt: payment.paidAt ?? undefined,
    });
  }
  if (payment.method === "CASH" && payment.collectedById) {
    const desk = db.cashDesks.find((d) => d.holderId === payment.collectedById);
    if (desk) {
      desk.balanceCents += payment.amountCents;
      db.cashOperations.unshift({
        id: newId("cashop"),
        deskId: desk.id,
        kind: "COLLECTION",
        amountCents: payment.amountCents,
        orderNumber: payment.orderNumber,
        fiscalNumber: payment.fiscalNumber,
        actorName: desk.holderName,
        at: payment.paidAt!,
        status: "CONFIRMED",
        note: null,
      });
    }
  }
}

export function createWarranty(input: Omit<WarrantyRec, "id" | "number" | "code" | "void">): WarrantyRec {
  const number = nextNumber("ZM", 30000);
  const w: WarrantyRec = { ...input, id: newId("warranty"), number, code: `W${number.replace(/\D/g, "")}${idFor(number).slice(0, 4).toUpperCase()}`, void: false };
  db.warranties.unshift(w);
  return w;
}

export function monthsFrom(iso: string, months: number): string {
  const d = new Date(iso);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString();
}

export function offerExpiry(fromIso: string | null) {
  return addMinutes(fromIso ?? nowIso(), db.settings.offerResponseMinutes);
}
