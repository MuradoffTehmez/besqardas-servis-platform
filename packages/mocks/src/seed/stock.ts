import { db } from "../db/state";
import { createRng, idFor } from "../lib/rng";
import { atTime, daysAgo, daysFromNow } from "../lib/time";
import { WH } from "../data/org";
import { PROD } from "../data/catalog";
import { move, reserve, stockRow } from "../engine/stock";
import { uid } from "../data/people";

/** Anbar seed-i: qalıqlar, hərəkət tarixçəsi, transferlər, alışlar, sayımlar (PRD §34–40). */

export function seedStock() {
  const rng = createRng(4242);
  const saleWh = [WH.central, WH.yasamal, WH.sumqayit, WH.ganja];
  for (const product of db.products) {
    for (const variant of product.variants) {
      const isMaterial = product.type === "CONSUMABLE" || product.type === "SPARE_PART";
      const baseQty = product.baseUnit === "m" ? rng.int(200, 900) : product.baseUnit === "kg" ? rng.int(60, 200) : rng.int(2, 40);
      // satış stoku
      saleWh.forEach((wh, i) => {
        const qty = i === 0 ? baseQty : Math.round(baseQty * (0.15 + rng.next() * 0.35));
        if (!qty) return;
        const row = stockRow(variant.id, wh, "SALES");
        row.physical = qty;
        row.minLevel = product.baseUnit === "pcs" ? 3 : Math.round(baseQty * 0.1);
        row.avgCostCents = Math.round(variant.prices.RETAIL * (0.55 + rng.next() * 0.1));
        row.zone = i === 0 ? rng.pick(["A-01", "A-07", "B-03", "C-12"]) : null;
        row.damaged = i === 0 && rng.chance(0.1) ? 1 : 0;
        row.onOrder = i === 0 && rng.chance(0.2) ? Math.round(baseQty * 0.5) : 0;
      });
      // servis stoku
      if (isMaterial) {
        for (const wh of [WH.central, WH.serviceCenter, WH.van1, WH.van2]) {
          const row = stockRow(variant.id, wh, "SERVICE");
          row.physical = wh === WH.central ? Math.round(baseQty * 0.6) : product.baseUnit === "m" ? rng.int(20, 60) : product.baseUnit === "kg" ? rng.int(5, 24) : rng.int(1, 6);
          row.minLevel = product.baseUnit === "pcs" ? 2 : 10;
          row.avgCostCents = Math.round(variant.prices.RETAIL * 0.58);
        }
      }
    }
  }
  // aşağı stok nümunələri
  const lowRow = stockRow(PROD["compressor-lg18"]!.variants[0]!.id, WH.central, "SALES");
  lowRow.physical = 1;
  lowRow.minLevel = 3;
  const outRow = stockRow(PROD["gree-multi"]!.variants[1]!.id, WH.central, "SALES");
  outRow.physical = 0;
  for (const wh of [WH.yasamal, WH.sumqayit, WH.ganja]) stockRow(PROD["gree-multi"]!.variants[1]!.id, wh, "SALES").physical = 0;

  // hərəkət tarixçəsi
  const pipe = PROD["copper-pipe"]!;
  const r32 = PROD["r32"]!;
  const lg = PROD["lg-dualcool"]!;
  const hist: [number, Parameters<typeof move>[0]][] = [
    [30, { type: "RECEIPT", warehouseId: WH.central, variantId: pipe.variants[1]!.id, baseQuantity: 500, quantity: "10", unit: "roll", direction: "IN", actorName: "Rauf Nəsirov", relatedDocument: "PO-7001", unitCostCents: 340, reason: "Mis və Metal MMC" }],
    [28, { type: "RECEIPT", warehouseId: WH.central, variantId: r32.variants[0]!.id, baseQuantity: 120, quantity: "10", unit: "cylinder", direction: "IN", actorName: "Rauf Nəsirov", relatedDocument: "PO-7002", unitCostCents: 1650, reason: "Freon Trade MMC" }],
    [25, { type: "RECEIPT", warehouseId: WH.central, variantId: lg.variants[2]!.id, baseQuantity: 20, direction: "IN", actorName: "Rauf Nəsirov", relatedDocument: "PO-7003", unitCostCents: 105000, reason: "Klimat Distribution MMC" }],
    [20, { type: "PURPOSE_CHANGE", warehouseId: WH.central, variantId: pipe.variants[1]!.id, baseQuantity: 100, direction: "OUT", purpose: "SALES", actorName: "Rauf Nəsirov", reason: "Satış stoku → servis stoku" }],
    [20, { type: "PURPOSE_CHANGE", warehouseId: WH.central, variantId: pipe.variants[1]!.id, baseQuantity: 100, direction: "IN", purpose: "SERVICE", actorName: "Rauf Nəsirov", reason: "Satış stoku → servis stoku" }],
    [15, { type: "TRANSFER_OUT", warehouseId: WH.central, variantId: pipe.variants[1]!.id, baseQuantity: 50, quantity: "1", unit: "roll", direction: "OUT", purpose: "SERVICE", actorName: "Rauf Nəsirov", relatedDocument: "TR-2201" }],
    [15, { type: "TRANSFER_IN", warehouseId: WH.van1, variantId: pipe.variants[1]!.id, baseQuantity: 50, quantity: "1", unit: "roll", direction: "IN", purpose: "SERVICE", actorName: "Kamran Əliyev", relatedDocument: "TR-2201" }],
    [12, { type: "SALE_ISSUE", warehouseId: WH.central, variantId: lg.variants[2]!.id, baseQuantity: 2, direction: "OUT", actorName: "Rauf Nəsirov", relatedDocument: "SO-5003" }],
    [9, { type: "SERVICE_CONSUMPTION", warehouseId: WH.van1, variantId: r32.variants[0]!.id, baseQuantity: 1.2, quantity: "1.2", unit: "kg", direction: "OUT", purpose: "SERVICE", actorName: "Kamran Əliyev", relatedDocument: "SV-1044", reason: "Servis sərfiyyatı" }],
    [9, { type: "SERVICE_CONSUMPTION", warehouseId: WH.van1, variantId: pipe.variants[1]!.id, baseQuantity: 3.5, quantity: "3.5", unit: "m", direction: "OUT", purpose: "SERVICE", actorName: "Kamran Əliyev", relatedDocument: "SV-1044", reason: "Servis sərfiyyatı" }],
    [7, { type: "WRITE_OFF", warehouseId: WH.central, variantId: PROD["ntc-sensor"]!.variants[0]!.id, baseQuantity: 2, direction: "OUT", actorName: "Rauf Nəsirov", reason: "Zədə — qablaşdırma açılıb" }],
    [5, { type: "RETURN", warehouseId: WH.quarantine, variantId: PROD["ac-filter"]!.variants[0]!.id, baseQuantity: 1, quantity: "1", unit: "set", direction: "IN", actorName: "Rauf Nəsirov", reason: "Müştəri qaytarması — yoxlama gözləyir", relatedDocument: "QY-3001" }],
    [3, { type: "ADJUSTMENT", warehouseId: WH.van2, variantId: PROD["connector"]!.variants[0]!.id, baseQuantity: 4, direction: "OUT", purpose: "SERVICE", actorName: "Rauf Nəsirov", reason: "Sayım nəticəsi (SC-301)", relatedDocument: "SC-301" }],
  ];
  for (const [ago, m] of hist) atTime(daysAgo(ago), () => move(m));

  // transferlər
  const tline = (key: string, variantKey: string, vIdx: number, qty: number, received: number | null = null) => ({ id: idFor(`trl:${key}`), productId: PROD[variantKey]!.id, variantId: PROD[variantKey]!.variants[vIdx]!.id, quantity: qty, receivedQuantity: received });
  const h = (at: string, action: string, actor: string, from?: string, to?: string, note?: string) => ({ id: idFor(`th:${at}:${action}`), at, actorName: actor, action, fromStatus: from, toStatus: to, note });
  db.transfers = [
    { id: idFor("tr:2201"), number: "TR-2201", fromWarehouseId: WH.central, toWarehouseId: WH.van1, status: "RECEIVED", lines: [tline("2201a", "copper-pipe", 1, 50, 50), tline("2201b", "r32", 0, 12, 12)], createdAt: daysAgo(16), createdBy: "Rauf Nəsirov", shippedAt: daysAgo(15.5), receivedAt: daysAgo(15), discrepancyNote: null, history: [h(daysAgo(15), "received", "Kamran Əliyev", "IN_TRANSIT", "RECEIVED")] },
    { id: idFor("tr:2202"), number: "TR-2202", fromWarehouseId: WH.central, toWarehouseId: WH.van2, status: "IN_TRANSIT", lines: [tline("2202a", "connector", 0, 40), tline("2202b", "insulation", 0, 30), tline("2202c", "ac-filter", 0, 4)], createdAt: daysAgo(1), createdBy: "Rauf Nəsirov", shippedAt: daysAgo(0.3), receivedAt: null, discrepancyNote: null, history: [h(daysAgo(0.3), "shipped", "Rauf Nəsirov", "APPROVED", "IN_TRANSIT")] },
    { id: idFor("tr:2203"), number: "TR-2203", fromWarehouseId: WH.central, toWarehouseId: WH.ganja, status: "DRAFT", lines: [tline("2203a", "bosch-7000", 0, 4), tline("2203b", "baxi-luna", 0, 3)], createdAt: daysAgo(0.1), createdBy: "Rauf Nəsirov", shippedAt: null, receivedAt: null, discrepancyNote: null, history: [] },
    { id: idFor("tr:2204"), number: "TR-2204", fromWarehouseId: WH.yasamal, toWarehouseId: WH.serviceCenter, status: "APPROVED", lines: [tline("2204a", "compressor-lg", 0, 2)], createdAt: daysAgo(0.5), createdBy: "Kənan Məmmədli", shippedAt: null, receivedAt: null, discrepancyNote: null, history: [h(daysAgo(0.4), "approved", "Fərid Quliyev", "DRAFT", "APPROVED")] },
    { id: idFor("tr:2199"), number: "TR-2199", fromWarehouseId: WH.central, toWarehouseId: WH.sumqayit, status: "DISCREPANCY", lines: [tline("2199a", "midea-xtreme", 1, 6, 5)], createdAt: daysAgo(6), createdBy: "Rauf Nəsirov", shippedAt: daysAgo(5.8), receivedAt: daysAgo(5), discrepancyNote: "1 ədəd çatışmır — uyğunsuzluq aktı UA-114", history: [h(daysAgo(5), "discrepancy", "Tural Abbasov", "IN_TRANSIT", "DISCREPANCY", "1 əd. çatışmır")] },
  ];
  for (const tr of db.transfers.filter((t) => t.status === "IN_TRANSIT")) {
    for (const l of tr.lines) stockRow(l.variantId, tr.toWarehouseId, "SERVICE").inTransit += l.quantity;
  }

  db.purchases = [
    { id: idFor("po:7010"), number: "PO-7010", supplierId: idFor("sup:klimat"), warehouseId: WH.central, status: "SENT", lines: [{ id: idFor("pol:1"), variantId: PROD["lg-dualcool"]!.variants[0]!.id, quantity: 30, receivedQuantity: 0, unitCostCents: 82000 }, { id: idFor("pol:2"), variantId: PROD["samsung-windfree"]!.variants[0]!.id, quantity: 15, receivedQuantity: 0, unitCostCents: 112000 }], expectedAt: daysFromNow(6), createdAt: daysAgo(2), invoiceNumber: null },
    { id: idFor("po:7009"), number: "PO-7009", supplierId: idFor("sup:metal"), warehouseId: WH.central, status: "PARTIALLY_RECEIVED", lines: [{ id: idFor("pol:3"), variantId: PROD["copper-pipe"]!.variants[0]!.id, quantity: 500, receivedQuantity: 300, unitCostCents: 250 }, { id: idFor("pol:4"), variantId: PROD["copper-pipe"]!.variants[2]!.id, quantity: 300, receivedQuantity: 300, unitCostCents: 560 }], expectedAt: daysFromNow(1), createdAt: daysAgo(9), invoiceNumber: "MM-2026/991" },
    { id: idFor("po:7008"), number: "PO-7008", supplierId: idFor("sup:termo"), warehouseId: WH.central, status: "RECEIVED", lines: [{ id: idFor("pol:5"), variantId: PROD["bosch-7000"]!.variants[0]!.id, quantity: 10, receivedQuantity: 10, unitCostCents: 158000 }], expectedAt: daysAgo(14), createdAt: daysAgo(21), invoiceNumber: "TS-44120" },
    { id: idFor("po:7011"), number: "PO-7011", supplierId: idFor("sup:termo"), warehouseId: WH.ganja, status: "DRAFT", lines: [{ id: idFor("pol:6"), variantId: PROD["ariston-clas"]!.variants[0]!.id, quantity: 8, receivedQuantity: 0, unitCostCents: 99000 }], expectedAt: null, createdAt: daysAgo(0.2), invoiceNumber: null },
  ];

  // mal qəbulu qaimələri: təsdiqlənmiş (tarixçə üçün) və qaralama
  const grl = (key: string, variantKey: string, vIdx: number, quantity: number, unitCostCents: number, extra: Partial<(typeof db.goodsReceipts)[number]["lines"][number]> = {}) => ({ id: idFor(`grl:${key}`), variantId: PROD[variantKey]!.variants[vIdx]!.id, quantity, unit: PROD[variantKey]!.baseUnit, unitCostCents, purpose: "SALES" as const, zone: null, lot: null, expiryDate: null, serials: [], movementId: null, ...extra });
  db.goodsReceipts = [
    { id: idFor("grn:3040"), number: "GRN-3040", status: "POSTED", warehouseId: WH.central, supplierId: idFor("sup:termo"), supplierName: "TermoSistem ASC", purchaseId: idFor("po:7008"), invoiceNumber: "TS-44120", invoiceDate: daysAgo(14), note: null, lines: [grl("3040a", "bosch-7000", 0, 10, 158000, { zone: "B-03", serials: Array.from({ length: 10 }, (_, i) => `BSH7K-2609${String(i + 1).padStart(3, "0")}`) })], attachments: [], createdAt: daysAgo(14), createdBy: "Rauf Nəsirov", postedAt: daysAgo(14), postedBy: "Rauf Nəsirov", cancelReason: null },
    { id: idFor("grn:3041"), number: "GRN-3041", status: "POSTED", warehouseId: WH.central, supplierId: idFor("sup:metal"), supplierName: "Mis və Metal MMC", purchaseId: idFor("po:7009"), invoiceNumber: "MM-2026/991", invoiceDate: daysAgo(5), note: "2 partiya ilə gəldi", lines: [grl("3041a", "copper-pipe", 0, 300, 250, { zone: "C-12", lot: "CU-2609-A" }), grl("3041b", "copper-pipe", 2, 300, 560, { zone: "C-12", lot: "CU-2609-B" })], attachments: [], createdAt: daysAgo(5), createdBy: "Rauf Nəsirov", postedAt: daysAgo(5), postedBy: "Rauf Nəsirov", cancelReason: null },
    { id: idFor("grn:3042"), number: "GRN-3042", status: "DRAFT", warehouseId: WH.yasamal, supplierId: null, supplierName: "Pərakəndə tədarükçü", purchaseId: null, invoiceNumber: null, invoiceDate: null, note: "Fakturanın əslini gözləyirik", lines: [grl("3042a", "connector", 0, 40, 180), grl("3042b", "insulation", 0, 25, 320)], attachments: [], createdAt: daysAgo(0.2), createdBy: "Rauf Nəsirov", postedAt: null, postedBy: null, cancelReason: null },
  ];
  db.counters.GRN = 3042;

  db.stockCounts = [
    { id: idFor("sc:301"), number: "SC-301", scope: "MOBILE", warehouseId: WH.van2, status: "APPROVED", blockMovements: false, lines: [{ id: idFor("scl:1"), variantId: PROD["connector"]!.variants[0]!.id, system: 24, counted: 20 }, { id: idFor("scl:2"), variantId: PROD["insulation"]!.variants[0]!.id, system: 40, counted: 40 }], scheduledAt: daysAgo(3), createdBy: "Rauf Nəsirov" },
    { id: idFor("sc:302"), number: "SC-302", scope: "CATEGORY", warehouseId: WH.central, status: "IN_PROGRESS", blockMovements: true, lines: PROD["copper-pipe"]!.variants.map((v, i) => ({ id: idFor(`scl:p${i}`), variantId: v.id, system: stockRow(v.id, WH.central, "SALES").physical, counted: i < 2 ? stockRow(v.id, WH.central, "SALES").physical - (i === 1 ? 2 : 0) : null })), scheduledAt: daysAgo(0.1), createdBy: "Rauf Nəsirov" },
    { id: idFor("sc:303"), number: "SC-303", scope: "MOBILE", warehouseId: WH.van1, status: "DRAFT", blockMovements: false, lines: [], scheduledAt: daysFromNow(4), createdBy: "Rauf Nəsirov" },
  ];

  // ustanın sabahkı iş üçün rezervi (§39 nümunəsi)
  reserve({ source: "TECHNICIAN", sourceId: idFor("so-tomorrow-placeholder"), sourceNumber: "SV-1071", variantId: PROD["copper-pipe"]!.variants[1]!.id, warehouseId: WH.central, quantity: 20, purpose: "SERVICE", reservedForId: uid("kamran"), reservedForName: "Kamran Əliyev", ttlHours: 30, enforce: false });
}
