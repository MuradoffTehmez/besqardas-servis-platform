import { db } from "../db/state";
import type { SalesOrderRec } from "../db/types";
import { createRng, idFor } from "../lib/rng";
import { atTime, bakuAt, daysAgo, daysFromNow, hoursFromNow } from "../lib/time";
import { vatIncluded } from "../lib/money";
import { PROD } from "../data/catalog";
import { ADDR, COMPANY, aid, uid } from "../data/people";
import { issueDocument, recordPayment } from "../engine/effects";
import { move } from "../engine/stock";
import { WH } from "../data/org";

/** Satış sifarişləri, ödənişlər, qaytarmalar, kommersiya təklifləri, çatdırılma tapşırıqları (PRD §31–32, §45.2). */

type LineDef = [productKey: string, variantIdx: number, quantity: string, unit: string];

function lines(defs: LineDef[], priceType: "RETAIL" | "PARTNER" | "WHOLESALE" | "CORPORATE", discountPct = 0) {
  return defs.map(([key, idx, quantity, unit], i) => {
    const p = PROD[key]!;
    const v = p.variants[idx]!;
    const conv = p.conversions.find((c) => c.unit === unit);
    const base = priceType === "CORPORATE" ? v.prices.RETAIL : v.prices[priceType];
    const unitCents = Math.round((conv?.packagePriceCents ?? base * (conv?.factor ?? 1)) * (1 - discountPct / 100));
    return { id: idFor(`sol:${key}:${i}:${quantity}`), productId: p.id, variantId: v.id, name: p.name, sku: v.sku, quantity, unit, baseQuantity: String(Number(quantity) * (conv?.factor ?? 1)), unitCents, totalCents: Math.round(unitCents * Number(quantity)), returnedQuantity: "0" };
  });
}

export function seedCommerce() {
  const rng = createRng(3131);
  const mk = (n: number, input: Partial<SalesOrderRec> & { customerId: string; defs: LineDef[]; priceType?: "RETAIL" | "PARTNER" | "WHOLESALE" | "CORPORATE"; created: string; addressId?: string | null }) => {
    const ls = lines(input.defs, input.priceType ?? "RETAIL", input.priceType === "CORPORATE" ? 12 : 0);
    const subtotal = ls.reduce((s, l) => s + l.totalCents, 0);
    const delivery = input.deliveryMethod === "PICKUP" ? 0 : subtotal >= 50000 ? 0 : 1000;
    const discount = input.discountCents ?? 0;
    const b2b = input.priceType && input.priceType !== "RETAIL";
    const total = subtotal - discount + delivery + (input.installationCents ?? 0);
    const a = input.addressId ? ADDR[input.addressId] : null;
    const so: SalesOrderRec = {
      id: idFor(`salesorder:${n}`),
      number: `SO-${n}`,
      status: input.status ?? "COMPLETED",
      customerId: input.customerId,
      companyId: input.companyId ?? null,
      lines: ls,
      subtotalCents: subtotal,
      discountCents: discount,
      deliveryCents: delivery,
      installationCents: input.installationCents ?? 0,
      vatCents: b2b ? Math.round(total * 0.18) : vatIncluded(total),
      totalCents: b2b ? Math.round(total * 1.18) : total,
      vatIncluded: !b2b,
      deliveryMethod: input.deliveryMethod ?? "COURIER",
      address: a ? { id: a.id, label: a.label, city: a.city, street: a.street, building: a.building, apartment: a.apartment, location: a.location, isDefault: a.isDefault } : null,
      pickupBranchId: input.deliveryMethod === "PICKUP" ? db.branches[0]!.id : null,
      paymentMethod: input.paymentMethod ?? "CARD_ONLINE",
      serviceOrderId: input.serviceOrderId ?? null,
      history: [{ id: idFor(`soh:${n}`), at: input.created, actorName: "Sistem", action: "created", toStatus: "PENDING_PAYMENT" }],
      channel: input.channel ?? "WEB",
      branchId: db.branches[0]!.id,
      createdAt: input.created,
      idempotencyKey: null,
      appliedDiscounts: discount ? [{ code: "AUTUMN_AC", label: { az: "Payız kampaniyası", ru: "Осенняя акция", en: "Autumn sale" }, cents: discount }] : [],
    };
    db.salesOrders.push(so);
    const paid = !["PENDING_PAYMENT", "CANCELLED"].includes(so.status) || input.paymentMethod === "BANK_TRANSFER";
    const payer = db.users.find((u) => u.id === so.customerId)!;
    const company = so.companyId ? db.b2bAccounts.find((c) => c.id === so.companyId) : null;
    if (paid && so.status !== "PENDING_PAYMENT") {
      atTime(input.created, () => {
        recordPayment({ payerId: company?.id ?? payer.id, payerName: company?.legalName ?? `${payer.firstName} ${payer.lastName}`, orderType: "SALES", orderId: so.id, orderNumber: so.number, method: so.paymentMethod === "BALANCE" ? "BANK_TRANSFER" : so.paymentMethod, amountCents: so.totalCents, installmentMonths: so.paymentMethod === "INSTALLMENT" ? 12 : null });
        issueDocument({ type: "INVOICE", ownerId: company?.id ?? payer.id, counterpartyName: company?.legalName ?? `${payer.firstName} ${payer.lastName}`, counterpartyVoen: company?.voen ?? null, orderType: "SALES", orderId: so.id, orderNumber: so.number, lines: so.lines.map((l) => ({ name: l.name, quantity: l.quantity, unit: l.unit, unitCents: l.unitCents, vatRate: 18 })), vatIncluded: !company, meta: {} });
        if (company?.eInvoiceRequired) issueDocument({ type: "E_INVOICE", ownerId: company.id, counterpartyName: company.legalName, counterpartyVoen: company.voen, orderType: "SALES", orderId: so.id, orderNumber: so.number, lines: so.lines.map((l) => ({ name: l.name, quantity: l.quantity, unit: l.unit, unitCents: l.unitCents, vatRate: 18 })), vatIncluded: false, meta: {} });
      });
    }
    if (["SHIPPED", "DELIVERED", "COMPLETED", "RETURN_REQUESTED", "RETURNED", "READY_FOR_PICKUP"].includes(so.status)) {
      for (const l of so.lines) atTime(input.created, () => move({ type: "SALE_ISSUE", warehouseId: WH.central, variantId: l.variantId, baseQuantity: Number(l.baseQuantity), quantity: l.quantity, unit: l.unit, direction: "OUT", actorName: "Rauf Nəsirov", relatedDocument: so.number }));
    }
    return so;
  };

  // Aysel (Premium)
  mk(5001, { customerId: uid("aysel"), defs: [["lg-dualcool", 1, "1", "pcs"]], created: daysAgo(215), addressId: aid("aysel-office"), status: "COMPLETED", deliveryMethod: "WITH_INSTALLATION", installationCents: 8000 });
  mk(5002, { customerId: uid("aysel"), defs: [["ac-filter", 0, "2", "set"]], created: daysAgo(35), addressId: aid("aysel-home"), status: "COMPLETED" });
  const so5003 = mk(5003, { customerId: uid("aysel"), defs: [["lg-dualcool", 2, "1", "pcs"]], created: daysAgo(3), addressId: aid("aysel-summer"), status: "PROCESSING", deliveryMethod: "WITH_INSTALLATION", installationCents: 8000, discountCents: 18900, paymentMethod: "INSTALLMENT" });
  const sv1054 = db.serviceOrders.find((o) => o.number === "SV-1054");
  if (sv1054) { so5003.serviceOrderId = sv1054.id; sv1054.salesOrderId = so5003.id; sv1054.source = "PRODUCT_PURCHASE"; }
  mk(5004, { customerId: uid("aysel"), defs: [["wilo-star", 0, "1", "pcs"]], created: daysAgo(1), addressId: aid("aysel-home"), status: "SHIPPED" });
  // Rəşad (Basic)
  mk(5005, { customerId: uid("rashad"), defs: [["kermi-radiator", 1, "2", "pcs"]], created: daysAgo(18), addressId: aid("rashad-home"), status: "DELIVERED", paymentMethod: "CASH" });
  mk(5006, { customerId: uid("rashad"), defs: [["midea-xtreme", 0, "1", "pcs"]], created: hoursFromNow(-2), addressId: aid("rashad-home"), status: "PENDING_PAYMENT", paymentMethod: "CARD_ONLINE" });
  // Günel
  mk(5007, { customerId: uid("gunel"), defs: [["samsung-windfree", 0, "1", "pcs"]], created: daysAgo(150), addressId: aid("gunel-home"), status: "COMPLETED", deliveryMethod: "WITH_INSTALLATION", installationCents: 8000 });
  mk(5008, { customerId: uid("gunel"), defs: [["ac-filter", 0, "1", "set"], ["ntc-sensor", 0, "1", "pcs"]], created: daysAgo(9), status: "RETURN_REQUESTED", deliveryMethod: "PICKUP" });
  mk(5009, { customerId: uid("gunel"), defs: [["grundfos-scala2", 0, "1", "pcs"]], created: daysAgo(0.5), status: "READY_FOR_PICKUP", deliveryMethod: "PICKUP" });
  // Leyla, John, Murad
  mk(5010, { customerId: uid("leyla"), defs: [["daikin-sensira", 0, "1", "pcs"]], created: daysAgo(260), addressId: aid("leyla-home"), status: "COMPLETED" });
  mk(5011, { customerId: uid("john"), defs: [["lg-artcool", 0, "1", "pcs"]], created: daysAgo(90), addressId: aid("john-home"), status: "COMPLETED" });
  mk(5012, { customerId: uid("murad"), defs: [["baxi-luna", 0, "1", "pcs"]], created: daysAgo(4), addressId: aid("murad-home"), status: "CANCELLED", paymentMethod: "CARD_ONLINE" });
  // B2B
  mk(5013, { customerId: uid("partner"), companyId: COMPANY.klima, priceType: "PARTNER", defs: [["lg-dualcool", 2, "6", "pcs"], ["copper-pipe", 1, "4", "roll"]], created: daysAgo(14), addressId: null, status: "COMPLETED", deliveryMethod: "PICKUP", channel: "B2B", paymentMethod: "BALANCE" });
  mk(5014, { customerId: uid("partner"), companyId: COMPANY.klima, priceType: "PARTNER", defs: [["gree-multi", 0, "2", "pcs"], ["cable", 1, "1", "roll"]], created: daysAgo(2), status: "CONFIRMED", deliveryMethod: "COURIER", channel: "B2B", paymentMethod: "BALANCE" });
  mk(5015, { customerId: uid("wholesale"), companyId: COMPANY.texno, priceType: "WHOLESALE", defs: [["copper-pipe", 0, "20", "roll"], ["copper-pipe", 1, "20", "roll"], ["connector", 0, "30", "box"], ["r32", 0, "15", "cylinder"]], created: daysAgo(11), status: "DELIVERED", deliveryMethod: "COURIER", channel: "B2B", paymentMethod: "BANK_TRANSFER" });
  mk(5016, { customerId: uid("wholesale"), companyId: COMPANY.texno, priceType: "WHOLESALE", defs: [["midea-xtreme", 1, "25", "pcs"]], created: daysAgo(0.8), status: "PENDING_PAYMENT", deliveryMethod: "COURIER", channel: "B2B", paymentMethod: "BANK_TRANSFER" });
  mk(5017, { customerId: uid("corporate"), companyId: COMPANY.azer, priceType: "CORPORATE", defs: [["daikin-sensira", 0, "3", "pcs"]], created: daysAgo(7), status: "PROCESSING", deliveryMethod: "WITH_INSTALLATION", channel: "B2B", paymentMethod: "BALANCE", installationCents: 24000 });
  for (let i = 0; i < 14; i++) {
    const c = rng.pick(["aysel", "rashad", "gunel", "leyla", "john", "murad"]);
    const prod = rng.pick(["ac-filter", "wilo-star", "ntc-sensor", "kermi-radiator", "midea-xtreme", "cable", "insulation"]);
    mk(4980 + i, { customerId: uid(c), defs: [[prod, 0, prod === "cable" || prod === "insulation" ? String(rng.int(5, 20)) : "1", PROD[prod]!.baseUnit]], created: daysAgo(100 - i * 6), status: "COMPLETED", paymentMethod: rng.pick(["CARD_ONLINE", "CASH", "CARD_POS"]) });
  }
  db.counters.SO = 5100;

  // Onlayn ödənişi uğursuz olmuş sifariş
  atTime(hoursFromNow(-1.9), () => recordPayment({ payerId: uid("rashad"), payerName: "Rəşad Kərimov", orderType: "SALES", orderId: idFor("salesorder:5006"), orderNumber: "SO-5006", method: "CARD_ONLINE", amountCents: db.salesOrders.find((s) => s.number === "SO-5006")!.totalCents, status: "FAILED" }));
  const failed = db.payments[0]!;
  failed.failureReason = "Kartda kifayət qədər vəsait yoxdur (51)";

  // Qaytarma
  const so5008 = db.salesOrders.find((s) => s.number === "SO-5008")!;
  db.returns = [
    { id: idFor("ret:3002"), number: "QY-3002", salesOrderId: so5008.id, customerId: uid("gunel"), status: "REQUESTED", lines: [{ lineId: so5008.lines[1]!.id, quantity: "1", reason: "Modelə uyğun gəlmədi" }], reason: "Modelə uyğun gəlmədi", inspectionResult: null, refundCents: null, refundMethod: null, createdAt: daysAgo(1), history: [{ id: idFor("reth:1"), at: daysAgo(1), actorName: "Günel Əliyeva", action: "created", toStatus: "REQUESTED" }] },
    { id: idFor("ret:3001"), number: "QY-3001", salesOrderId: db.salesOrders.find((s) => s.number === "SO-5002")!.id, customerId: uid("aysel"), status: "REFUNDED", lines: [{ lineId: db.salesOrders.find((s) => s.number === "SO-5002")!.lines[0]!.id, quantity: "1", reason: "Qüsurlu məhsul" }], reason: "Qüsurlu məhsul", inspectionResult: "DAMAGED", refundCents: 1500, refundMethod: "ORIGINAL", createdAt: daysAgo(30), history: [{ id: idFor("reth:2"), at: daysAgo(30), actorName: "Aysel Məmmədova", action: "created", toStatus: "REQUESTED" }, { id: idFor("reth:3"), at: daysAgo(28), actorName: "Kənan Vəliyev", action: "approved", fromStatus: "REQUESTED", toStatus: "APPROVED" }, { id: idFor("reth:4"), at: daysAgo(25), actorName: "Səbinə Axundova", action: "refunded", fromStatus: "INSPECTED", toStatus: "REFUNDED" }] },
  ];
  const refunded = db.payments.find((p) => p.orderNumber === "SO-5002");
  if (refunded) { refunded.refundedCents = 1500; refunded.status = "PARTIALLY_REFUNDED"; }

  // Kommersiya təklifləri (Topdan)
  db.quotes = [
    { id: idFor("quote:1"), number: "KT-801", companyId: COMPANY.texno, status: "SENT", lines: [{ variantId: PROD["lg-dualcool"]!.variants[0]!.id, quantity: 40, unitCents: 76000 }, { variantId: PROD["lg-dualcool"]!.variants[2]!.id, quantity: 20, unitCents: 124000 }], validUntil: daysFromNow(5), requestedAt: daysAgo(3), note: "Sezon sonu üçün toplu alış" },
    { id: idFor("quote:2"), number: "KT-802", companyId: COMPANY.texno, status: "REQUESTED", lines: [{ variantId: PROD["bosch-7000"]!.variants[0]!.id, quantity: 15, unitCents: null }], validUntil: null, requestedAt: hoursFromNow(-6), note: "Qış öncəsi stok" },
    { id: idFor("quote:3"), number: "KT-790", companyId: COMPANY.texno, status: "ACCEPTED", lines: [{ variantId: PROD["copper-pipe"]!.variants[1]!.id, quantity: 1000, unitCents: 390 }], validUntil: daysAgo(10), requestedAt: daysAgo(20), note: null },
  ];

  // Satış çatdırılma tapşırıqları
  const courierTask = (n: number, soNumber: string, status: "PLANNED" | "ASSIGNED" | "ON_THE_WAY" | "DELIVERED", assignee: string | null, windowDay: number, hour: number, addressId: string, cargo: string, cash: number | null) => {
    const so = db.salesOrders.find((s) => s.number === soNumber)!;
    const a = ADDR[addressId]!;
    const c = db.users.find((u) => u.id === so.customerId)!;
    db.logisticsTasks.push({
      id: idFor(`lt:${n}`), number: `LT-${n}`, type: "DELIVERY", status, from: { label: "Mərkəzi anbar", address: "Bakı, Təbriz küç. 44 (anbar girişi)", location: db.branches[0]!.location }, to: { label: `${c.firstName} ${c.lastName}`, address: `${a.city}, ${a.street}${a.apartment ? `, mənzil ${a.apartment}` : ""}`, location: a.location ?? null },
      windowStart: bakuAt(windowDay, hour), windowEnd: bakuAt(windowDay, hour + 2), assigneeId: assignee ? uid(assignee) : null, assigneeKind: assignee ? "COURIER" : null,
      cargo: [{ kind: "PRODUCT", name: cargo, quantity: "1", note: null }], relatedOrderId: so.id, relatedOrderNumber: so.number, relatedOrderKind: "SALES", stageId: null,
      contact: { name: `${c.firstName} ${c.lastName}`, phone: c.phone ?? "" }, note: "Zəng edib gəlin", collectCashCents: cash, photos: status === "DELIVERED" ? 1 : 0, signed: status === "DELIVERED", failReason: null,
      history: [{ at: daysAgo(0.3), status, actor: "Rüstəm Bağırov", note: null }], branchId: db.branches[0]!.id, createdAt: daysAgo(0.5),
    });
  };
  courierTask(3990, "SO-5004", "ON_THE_WAY", "orxan", 0, 13, aid("aysel-home"), "Wilo Star-RS 25/6", null);
  courierTask(3991, "SO-5014", "ASSIGNED", "orxan", 0, 17, aid("klima-office"), "Gree Free Match ×2, kabel rulonu", null);
  courierTask(3992, "SO-5006", "PLANNED", null, 1, 11, aid("rashad-home"), "Midea Xtreme Save 09", 69000);
  courierTask(3993, "SO-5005", "DELIVERED", "elnur", -17, 15, aid("rashad-home"), "Kermi radiator ×2", null);
  courierTask(3994, "SO-5016", "PLANNED", null, 2, 10, aid("texno-warehouse"), "Midea Xtreme Save 12 ×25 (pallet)", null);
  db.counters.LT = Math.max(db.counters.LT ?? 4000, 4100);
}
