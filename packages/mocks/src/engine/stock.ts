import { db, nextNumber } from "../db/state";
import type { MovementRec, StockRec } from "../db/types";
import { newId } from "../lib/rng";
import { hoursFromNow, nowIso } from "../lib/time";
import { apiError } from "../lib/errors";

/** Anbar mühərriki (PRD §37–40): qalıqlar, hərəkətlər, rezervasiya, transfer. Hərəkətlər silinmir. */

export function findVariant(variantId: string) {
  for (const product of db.products) {
    const variant = product.variants.find((v) => v.id === variantId);
    if (variant) return { product, variant };
  }
  return null;
}

export function stockRow(variantId: string, warehouseId: string, purpose: "SALES" | "SERVICE"): StockRec {
  let row = db.stock.find((s) => s.variantId === variantId && s.warehouseId === warehouseId && s.purpose === purpose);
  if (!row) {
    const found = findVariant(variantId);
    row = {
      id: newId("stock"),
      productId: found?.product.id ?? "",
      variantId,
      warehouseId,
      purpose,
      physical: 0,
      reserved: 0,
      damaged: 0,
      inTransit: 0,
      onOrder: 0,
      minLevel: 0,
      avgCostCents: Math.round((found?.variant.prices.RETAIL ?? 0) * 0.62),
      zone: null,
    };
    db.stock.push(row);
  }
  return row;
}

export function available(row: StockRec) {
  return row.physical - row.reserved - row.damaged;
}

export function move(input: {
  type: MovementRec["type"];
  warehouseId: string;
  variantId: string;
  baseQuantity: number;
  quantity?: string;
  unit?: string;
  direction: "IN" | "OUT";
  purpose?: "SALES" | "SERVICE";
  reason?: string | null;
  actorName: string;
  relatedDocument?: string | null;
  unitCostCents?: number;
  at?: string;
  enforce?: boolean;
}) {
  const found = findVariant(input.variantId);
  if (!found) throw apiError(404, "NOT_FOUND", "error.notFound");
  const row = stockRow(input.variantId, input.warehouseId, input.purpose ?? "SALES");
  if (input.direction === "OUT") {
    if (input.enforce && row.physical - row.damaged < input.baseQuantity) throw apiError(409, "INSUFFICIENT_STOCK", "error.stock");
    row.physical = Math.max(0, +(row.physical - input.baseQuantity).toFixed(3));
  } else {
    // orta çəkili maya dəyərinin yenidən hesablanması
    const cost = input.unitCostCents ?? row.avgCostCents;
    const total = row.physical * row.avgCostCents + input.baseQuantity * cost;
    row.physical = +(row.physical + input.baseQuantity).toFixed(3);
    row.avgCostCents = row.physical ? Math.round(total / row.physical) : cost;
  }
  const movement: MovementRec = {
    id: newId("mv"),
    number: nextNumber("MV", 80000),
    type: input.type,
    at: input.at ?? nowIso(),
    warehouseId: input.warehouseId,
    productId: found.product.id,
    variantId: input.variantId,
    quantity: input.quantity ?? String(input.baseQuantity),
    unit: input.unit ?? found.product.baseUnit,
    baseQuantity: input.baseQuantity,
    direction: input.direction,
    unitCostCents: input.unitCostCents ?? row.avgCostCents,
    reason: input.reason ?? null,
    actorName: input.actorName,
    relatedDocument: input.relatedDocument ?? null,
    reversalOf: null,
  };
  db.movements.unshift(movement);
  return movement;
}

export function reserve(input: {
  source: "SERVICE_ORDER" | "SALES_ORDER" | "TECHNICIAN" | "TRANSFER";
  sourceId: string;
  sourceNumber: string;
  variantId: string;
  warehouseId: string;
  quantity: number;
  purpose: "SALES" | "SERVICE";
  reservedForId: string;
  reservedForName: string;
  ttlHours?: number;
  enforce?: boolean;
}) {
  const found = findVariant(input.variantId);
  if (!found) throw apiError(404, "NOT_FOUND", "error.notFound");
  const row = stockRow(input.variantId, input.warehouseId, input.purpose);
  // Eyni stokun iki dəfə rezerv edilməsinin qarşısı (backend-də tranzaksiya ilə)
  if (input.enforce !== false && available(row) < input.quantity) throw apiError(409, "INSUFFICIENT_STOCK", "error.stock");
  row.reserved = +(row.reserved + input.quantity).toFixed(3);
  const rec = {
    id: newId("res"),
    number: nextNumber("RZ", 6000),
    source: input.source,
    sourceId: input.sourceId,
    sourceNumber: input.sourceNumber,
    productId: found.product.id,
    variantId: input.variantId,
    warehouseId: input.warehouseId,
    quantity: input.quantity,
    status: "ACTIVE" as const,
    reservedForId: input.reservedForId,
    reservedForName: input.reservedForName,
    expiresAt: hoursFromNow(input.ttlHours ?? db.settings.reservationTtlHours),
    createdAt: nowIso(),
  };
  db.reservations.unshift(rec);
  return rec;
}

export function releaseReservation(id: string, status: "RELEASED" | "CONSUMED" | "EXPIRED" = "RELEASED") {
  const rec = db.reservations.find((r) => r.id === id);
  if (!rec || rec.status !== "ACTIVE") return;
  const purpose = rec.source === "SALES_ORDER" ? "SALES" : "SERVICE";
  const row = stockRow(rec.variantId, rec.warehouseId, purpose);
  row.reserved = Math.max(0, +(row.reserved - rec.quantity).toFixed(3));
  rec.status = status;
}

/** Müddəti bitmiş rezervlərin avtomatik buraxılması (§39). */
export function expireReservations() {
  const now = Date.now();
  for (const r of db.reservations) {
    if (r.status === "ACTIVE" && new Date(r.expiresAt).getTime() < now) releaseReservation(r.id, "EXPIRED");
  }
}
