import { db, nextNumber } from "../db/state";
import type { GoodsReceiptRec } from "../db/types";
import type { ProductMediaRec } from "../data/catalog";
import { fullName, type Ctx } from "../engine/context";
import { audit } from "../engine/effects";
import { available, findVariant, move, stockRow } from "../engine/stock";
import { find, list, notFound, requirePerm, route, validationError } from "../lib/http";
import { apiError } from "../lib/errors";
import { L } from "../lib/i18n";
import { money, qty } from "../lib/money";
import { newId } from "../lib/rng";
import { nowIso } from "../lib/time";
import { DOCUMENT_TYPES, checkDataUrl } from "../lib/upload";
import { productGallery, productImageUrl, warehouseName } from "../dto";

/** Anbar: mal qəbulu qaimələri, məhsul axtarışı (barkod/SKU) və məhsul şəkilləri (PRD §24, §37–38). */

const MAX_MEDIA = 12;

type LineInput = { variantId: string; quantity: string | number; unit?: string; unitCost: string | number; purpose?: "SALES" | "SERVICE"; zone?: string; lot?: string; expiryDate?: string; serials?: string[] };
type ReceiptInput = { warehouseId: string; supplierId?: string | null; supplierName?: string | null; purchaseId?: string | null; invoiceNumber?: string | null; invoiceDate?: string | null; note?: string | null; lines: LineInput[]; attachments?: { name: string; dataUrl: string; url?: string }[]; post?: boolean };

function variantSearchDto(variantId: string) {
  const found = findVariant(variantId)!;
  const { product: p, variant: v } = found;
  const rows = db.stock.filter((s) => s.variantId === v.id);
  const lastReceipt = db.movements.find((m) => m.variantId === v.id && m.type === "RECEIPT");
  return {
    id: v.id,
    productId: p.id,
    sku: v.sku,
    barcode: v.barcode,
    name: p.name,
    variantName: Object.values(v.attributes).join(" · ") || null,
    baseUnit: p.baseUnit,
    units: [{ code: p.baseUnit, factor: 1 }, ...p.conversions.map((c) => ({ code: c.unit, factor: c.factor }))],
    imageUrl: productImageUrl(p),
    imageTone: p.imageTone,
    status: p.status,
    stockTotal: rows.reduce((s, r) => s + r.physical, 0),
    lastCost: money(lastReceipt?.unitCostCents ?? rows[0]?.avgCostCents ?? Math.round(v.prices.RETAIL * 0.62)),
  };
}

function receiptDto(r: GoodsReceiptRec) {
  const lines = r.lines.map((l) => {
    const found = findVariant(l.variantId);
    const factor = found?.product.conversions.find((c) => c.unit === l.unit)?.factor ?? 1;
    return {
      ...l,
      productId: found?.product.id ?? null,
      productName: found?.product.name ?? L("—"),
      sku: found?.variant.sku ?? "",
      barcode: found?.variant.barcode ?? "",
      imageUrl: found ? productImageUrl(found.product) : null,
      imageTone: found?.product.imageTone ?? "slate",
      quantityValue: String(l.quantity),
      quantity: qty(l.quantity, l.unit, 3),
      baseQuantity: qty(l.quantity * factor, found?.product.baseUnit ?? l.unit, 3),
      unitCost: money(l.unitCostCents),
      total: money(Math.round(l.unitCostCents * l.quantity)),
      movementNumber: l.movementId ? db.movements.find((m) => m.id === l.movementId)?.number ?? null : null,
      variant: found ? variantSearchDto(l.variantId) : null,
    };
  });
  const totalCents = r.lines.reduce((s, l) => s + Math.round(l.unitCostCents * l.quantity), 0);
  const actions =
    r.status === "DRAFT"
      ? [{ code: "post", variant: "primary" }, { code: "cancel", variant: "destructive", requiresReason: true, reasonCategory: "CANCELLED" }]
      : r.status === "POSTED"
        ? [{ code: "reverse", variant: "destructive", requiresReason: true, reasonCategory: "CANCELLED" }]
        : [];
  return {
    ...r,
    warehouseName: warehouseName(r.warehouseId),
    supplierDisplay: r.supplierId ? db.suppliers.find((s) => s.id === r.supplierId)?.name ?? r.supplierName : r.supplierName,
    purchaseNumber: r.purchaseId ? db.purchases.find((p) => p.id === r.purchaseId)?.number ?? null : null,
    lines,
    lineCount: lines.length,
    itemCount: r.lines.reduce((s, l) => s + l.quantity, 0),
    total: money(totalCents),
    availableActions: actions,
  };
}

/** Qaimə sətirlərinin yoxlanması — xətalar sətir indeksi ilə qaytarılır. */
function validateReceipt(b: ReceiptInput) {
  const errors: Record<string, string[]> = {};
  if (!b.warehouseId || !db.warehouses.some((w) => w.id === b.warehouseId)) errors.warehouseId = ["validation.required"];
  if (b.supplierId && !db.suppliers.some((s) => s.id === b.supplierId)) errors.supplierId = ["validation.invalid"];
  if (b.invoiceDate && Number.isNaN(Date.parse(b.invoiceDate))) errors.invoiceDate = ["validation.date"];
  if (!b.lines?.length) errors.lines = ["validation.linesRequired"];
  const seenSerials = new Set<string>();
  (b.lines ?? []).forEach((l, i) => {
    const found = l.variantId ? findVariant(l.variantId) : null;
    if (!found) errors[`lines.${i}.variantId`] = ["validation.required"];
    const q = Number(l.quantity);
    if (!(q > 0)) errors[`lines.${i}.quantity`] = ["validation.positive"];
    if (!(Number(l.unitCost) >= 0) || l.unitCost === "" || l.unitCost === undefined) errors[`lines.${i}.unitCost`] = ["validation.required"];
    if (found && l.unit && l.unit !== found.product.baseUnit && !found.product.conversions.some((c) => c.unit === l.unit)) errors[`lines.${i}.unit`] = ["validation.invalid"];
    if (l.expiryDate && Number.isNaN(Date.parse(l.expiryDate))) errors[`lines.${i}.expiryDate`] = ["validation.date"];
    const serials = (l.serials ?? []).map((s) => s.trim()).filter(Boolean);
    if (serials.length) {
      if (serials.length !== q) errors[`lines.${i}.serials`] = ["validation.serialsCount"];
      for (const s of serials) {
        if (seenSerials.has(s)) errors[`lines.${i}.serials`] = ["validation.serialsDuplicate"];
        seenSerials.add(s);
      }
    }
  });
  if (Object.keys(errors).length) throw validationError(errors);
}

function applyInput(r: GoodsReceiptRec, b: ReceiptInput) {
  r.warehouseId = b.warehouseId;
  r.supplierId = b.supplierId || null;
  r.supplierName = b.supplierId ? db.suppliers.find((s) => s.id === b.supplierId)?.name ?? null : b.supplierName?.trim() || null;
  r.purchaseId = b.purchaseId || null;
  r.invoiceNumber = b.invoiceNumber?.trim() || null;
  r.invoiceDate = b.invoiceDate || null;
  r.note = b.note?.trim() || null;
  r.lines = b.lines.map((l) => {
    const found = findVariant(l.variantId)!;
    return {
      id: newId("grl"),
      variantId: l.variantId,
      quantity: Number(l.quantity),
      unit: l.unit || found.product.baseUnit,
      unitCostCents: Math.round(Number(l.unitCost) * 100),
      purpose: l.purpose === "SERVICE" ? "SERVICE" : "SALES",
      zone: l.zone?.trim() || null,
      lot: l.lot?.trim() || null,
      expiryDate: l.expiryDate || null,
      serials: (l.serials ?? []).map((s) => s.trim()).filter(Boolean),
      movementId: null,
    };
  });
  if (b.attachments) {
    r.attachments = b.attachments.map((a, i) => {
      if (a.url && !a.dataUrl) {
        const existing = r.attachments.find((x) => x.url === a.url);
        if (existing) return existing;
      }
      const meta = checkDataUrl(a.dataUrl, `attachments.${i}`, { types: DOCUMENT_TYPES, maxMb: 8 });
      return { id: newId("att"), name: a.name || `qaime-${i + 1}`, mimeType: meta.mimeType, size: meta.size, url: a.dataUrl };
    });
  }
}

/** Təsdiq: hər sətir üçün RECEIPT hərəkəti, orta maya dəyəri və zona yenilənir. */
function postReceipt(ctx: Ctx, r: GoodsReceiptRec) {
  if (r.status !== "DRAFT") throw apiError(409, "ACTION_NOT_ALLOWED", "error.actionNotAllowed");
  const blocked = db.stockCounts.find((sc) => sc.warehouseId === r.warehouseId && sc.blockMovements && sc.status === "IN_PROGRESS");
  if (blocked) throw apiError(409, "WAREHOUSE_BLOCKED", "error.warehouseBlocked", { warehouseId: ["validation.warehouseBlocked"] });
  const actor = fullName(ctx.user);
  for (const l of r.lines) {
    const found = findVariant(l.variantId)!;
    const factor = found.product.conversions.find((c) => c.unit === l.unit)?.factor ?? 1;
    const mv = move({ type: "RECEIPT", warehouseId: r.warehouseId, variantId: l.variantId, baseQuantity: l.quantity * factor, quantity: String(l.quantity), unit: l.unit, direction: "IN", purpose: l.purpose, actorName: actor, relatedDocument: r.number, unitCostCents: Math.round(l.unitCostCents / factor), reason: [r.supplierName, r.invoiceNumber, l.lot ? `LOT ${l.lot}` : null].filter(Boolean).join(" · ") || null });
    l.movementId = mv.id;
    if (l.zone) stockRow(l.variantId, r.warehouseId, l.purpose).zone = l.zone;
    // qəbul edilmiş qaralama məhsul satışa hazır olur
    if (found.product.status === "DRAFT") found.product.status = "ACTIVE";
  }
  if (r.purchaseId) {
    const po = db.purchases.find((p) => p.id === r.purchaseId);
    if (po) {
      for (const l of r.lines) {
        const pl = po.lines.find((x) => x.variantId === l.variantId);
        if (pl) pl.receivedQuantity = Math.min(pl.quantity, pl.receivedQuantity + l.quantity);
      }
      po.status = po.lines.every((x) => x.receivedQuantity >= x.quantity) ? "RECEIVED" : "PARTIALLY_RECEIVED";
      if (r.invoiceNumber) po.invoiceNumber = r.invoiceNumber;
    }
  }
  if (r.supplierId) {
    const sup = db.suppliers.find((s) => s.id === r.supplierId);
    if (sup) for (const l of r.lines) { const pid = findVariant(l.variantId)!.product.id; if (!sup.productIds.includes(pid)) sup.productIds.push(pid); }
  }
  r.status = "POSTED";
  r.postedAt = nowIso();
  r.postedBy = actor;
  audit(ctx, "post", "inventory", r.id, r.number, [{ field: "status", from: "DRAFT", to: "POSTED" }]);
}

export function createProductMedia(ctx: Ctx, productId: string, files: { dataUrl: string; name?: string; alt?: Record<string, string> }[]) {
  const p = find(db.products, productId);
  const media = p.media ?? [];
  if (media.length + files.length > MAX_MEDIA) throw validationError({ images: ["validation.tooManyFiles"] });
  files.forEach((f, i) => {
    const meta = checkDataUrl(f.dataUrl, `images.${i}`, { maxMb: 5 });
    media.push({ id: newId("media"), url: f.dataUrl, name: f.name || `${p.slug}-${media.length + 1}`, mimeType: meta.mimeType, size: meta.size, alt: (f.alt as never) ?? p.name, primary: false, uploadedAt: nowIso(), uploadedBy: fullName(ctx.user) });
  });
  if (media.length && !media.some((m) => m.primary)) media[0]!.primary = true;
  p.media = media;
  return media;
}

export const warehouseHandlers = [
  /* ---------------- Məhsul axtarışı: ad, SKU, barkod ---------------- */
  route.get("/admin/variants/search", ({ ctx, url }) => {
    requirePerm(ctx, "inventory:view", "catalog:view", "purchases:view");
    const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
    const limit = Math.min(50, Number(url.searchParams.get("limit") ?? 20));
    const all = db.products.flatMap((p) => p.variants.map((v) => ({ p, v })));
    if (!q) return all.slice(0, limit).map(({ v }) => variantSearchDto(v.id));
    const exact = all.filter(({ v }) => v.barcode === q || v.sku.toLowerCase() === q);
    const partial = all.filter(({ p, v }) => !exact.some((e) => e.v.id === v.id) && `${v.sku} ${v.barcode} ${p.name.az} ${p.name.ru} ${p.name.en} ${db.brands.find((b) => b.id === p.brandId)?.name ?? ""}`.toLowerCase().includes(q));
    return [...exact, ...partial].slice(0, limit).map(({ v }) => ({ ...variantSearchDto(v.id), exact: exact.some((e) => e.v.id === v.id) }));
  }),

  /* ---------------- Mal qəbulu qaimələri ---------------- */
  route.get("/admin/goods-receipts", ({ ctx, url }) => {
    requirePerm(ctx, "inventory:view");
    const rows = db.goodsReceipts.map((r) => { const d = receiptDto(r); return { ...d, lines: undefined, attachments: undefined, attachmentCount: r.attachments.length, preview: d.lines.slice(0, 3).map((l) => ({ sku: l.sku, name: l.productName, quantity: l.quantity })) }; });
    return list(url, rows, { search: (r) => `${r.number} ${r.invoiceNumber ?? ""} ${r.supplierDisplay ?? ""} ${r.preview.map((l) => l.sku).join(" ")}`, defaultSort: "-createdAt" });
  }),

  route.get("/admin/goods-receipts/:id", ({ ctx, params }) => {
    requirePerm(ctx, "inventory:view");
    return receiptDto(find(db.goodsReceipts, params.id));
  }),

  route.post("/admin/goods-receipts", async ({ ctx, body }) => {
    requirePerm(ctx, "inventory:create", "inventory:edit");
    const b = await body<ReceiptInput>();
    validateReceipt(b);
    const r: GoodsReceiptRec = { id: newId("grn"), number: nextNumber("GRN", 3040), status: "DRAFT", warehouseId: "", supplierId: null, supplierName: null, purchaseId: null, invoiceNumber: null, invoiceDate: null, note: null, lines: [], attachments: [], createdAt: nowIso(), createdBy: fullName(ctx.user), postedAt: null, postedBy: null, cancelReason: null };
    applyInput(r, b);
    db.goodsReceipts.unshift(r);
    audit(ctx, "create", "inventory", r.id, r.number);
    if (b.post) postReceipt(ctx, r);
    return receiptDto(r);
  }),

  route.patch("/admin/goods-receipts/:id", async ({ ctx, params, body }) => {
    requirePerm(ctx, "inventory:edit", "inventory:create");
    const r = find(db.goodsReceipts, params.id);
    if (r.status !== "DRAFT") throw apiError(409, "ACTION_NOT_ALLOWED", "error.actionNotAllowed");
    const b = await body<ReceiptInput>();
    validateReceipt(b);
    applyInput(r, b);
    audit(ctx, "edit", "inventory", r.id, r.number);
    if (b.post) postReceipt(ctx, r);
    return receiptDto(r);
  }),

  route.post("/admin/goods-receipts/:id/:op", async ({ ctx, params, body }) => {
    requirePerm(ctx, "inventory:edit", "inventory:create");
    const r = find(db.goodsReceipts, params.id);
    const { note, reasonCode } = await body<{ note?: string; reasonCode?: string }>();
    if (params.op === "post") postReceipt(ctx, r);
    else if (params.op === "cancel") {
      if (r.status !== "DRAFT") throw apiError(409, "ACTION_NOT_ALLOWED", "error.actionNotAllowed");
      if (!note && !reasonCode) throw validationError({ note: ["validation.required"] });
      r.status = "CANCELLED";
      r.cancelReason = note || reasonCode || null;
      audit(ctx, "cancel", "inventory", r.id, r.number, [{ field: "status", from: "DRAFT", to: "CANCELLED" }], r.cancelReason ?? undefined);
    } else if (params.op === "reverse") {
      // təsdiqlənmiş qaimə silinmir — hər sətir əks hərəkətlə geri alınır (§38)
      if (r.status !== "POSTED") throw apiError(409, "ACTION_NOT_ALLOWED", "error.actionNotAllowed");
      if (!note && !reasonCode) throw validationError({ note: ["validation.required"] });
      for (const l of r.lines) {
        const found = findVariant(l.variantId)!;
        const factor = found.product.conversions.find((c) => c.unit === l.unit)?.factor ?? 1;
        if (available(stockRow(l.variantId, r.warehouseId, l.purpose)) < l.quantity * factor) throw apiError(409, "INSUFFICIENT_STOCK", "error.stock", { lines: ["validation.reverseStock"] });
      }
      for (const l of r.lines) {
        const found = findVariant(l.variantId)!;
        const factor = found.product.conversions.find((c) => c.unit === l.unit)?.factor ?? 1;
        move({ type: "RECEIPT", warehouseId: r.warehouseId, variantId: l.variantId, baseQuantity: l.quantity * factor, quantity: String(l.quantity), unit: l.unit, direction: "OUT", purpose: l.purpose, actorName: fullName(ctx.user), relatedDocument: r.number, reason: `Əks hərəkət: ${r.number}` });
      }
      r.status = "REVERSED";
      r.cancelReason = note || reasonCode || null;
      audit(ctx, "reverse", "inventory", r.id, r.number, [{ field: "status", from: "POSTED", to: "REVERSED" }], r.cancelReason ?? undefined);
    } else notFound();
    return receiptDto(r);
  }),

  /* ---------------- Məhsul şəkilləri ---------------- */
  route.post("/admin/products/:id/media", async ({ ctx, params, body }) => {
    requirePerm(ctx, "catalog:edit", "catalog:create");
    const b = await body<{ files: { dataUrl: string; name?: string }[] }>();
    if (!b.files?.length) throw validationError({ images: ["validation.required"] });
    const p = find(db.products, params.id);
    createProductMedia(ctx, p.id, b.files);
    audit(ctx, "upload_media", "catalog", p.id, p.slug, [{ field: "media", from: null, to: `+${b.files.length}` }]);
    return productGallery(p);
  }),

  route.patch("/admin/products/:id/media/:mediaId", async ({ ctx, params, body }) => {
    requirePerm(ctx, "catalog:edit");
    const p = find(db.products, params.id);
    const m = (p.media ?? []).find((x) => x.id === params.mediaId);
    if (!m) notFound();
    const b = await body<{ alt?: Record<string, string>; primary?: boolean }>();
    if (b.alt) m.alt = { az: b.alt.az ?? "", ru: b.alt.ru ?? "", en: b.alt.en ?? "" };
    if (b.primary) p.media!.forEach((x) => (x.primary = x.id === m.id));
    audit(ctx, "edit_media", "catalog", p.id, p.slug);
    return productGallery(p);
  }),

  route.put("/admin/products/:id/media-order", async ({ ctx, params, body }) => {
    requirePerm(ctx, "catalog:edit");
    const p = find(db.products, params.id);
    const { ids } = await body<{ ids: string[] }>();
    const media = p.media ?? [];
    if (!Array.isArray(ids) || ids.length !== media.length || ids.some((id) => !media.some((m) => m.id === id))) throw validationError({ ids: ["validation.invalid"] });
    p.media = ids.map((id) => media.find((m) => m.id === id)!) as ProductMediaRec[];
    return productGallery(p);
  }),

  route.delete("/admin/products/:id/media/:mediaId", ({ ctx, params }) => {
    requirePerm(ctx, "catalog:edit");
    const p = find(db.products, params.id);
    const media = p.media ?? [];
    const m = media.find((x) => x.id === params.mediaId);
    if (!m) notFound();
    p.media = media.filter((x) => x.id !== m.id);
    if (m.primary && p.media.length) p.media[0]!.primary = true;
    audit(ctx, "delete_media", "catalog", p.id, p.slug, [{ field: "media", from: m.name, to: null }]);
    return productGallery(p);
  }),
];
