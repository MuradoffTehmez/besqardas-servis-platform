import { db } from "../db/state";
import { L } from "../lib/i18n";
import { createRng, idFor } from "../lib/rng";
import { daysAgo, daysFromNow, hoursFromNow, periodLabel } from "../lib/time";
import { PROD } from "../data/catalog";
import { COMPANY, uid } from "../data/people";
import { SVC } from "../data/services";
import { audit, notify } from "../engine/effects";

/** Rəylər, bildirişlər, audit, səbət, hesablaşma statusları, korporativ planlı vizitlər. */

export function seedMisc() {
  const rng = createRng(555);

  // --- Rəylər (§55) ---
  const comments = [
    ["Usta vaxtında gəldi, işi səliqəli gördü. Tövsiyə edirəm!", 5],
    ["Diaqnostika sürətli oldu, smeta aydın idi.", 5],
    ["Yaxşı iş, amma 20 dəqiqə gecikmə oldu.", 4],
    ["Kondisioner indi səssiz işləyir, çox sağ olun.", 5],
    ["Qiymət bir az baha gəldi, keyfiyyət yaxşıdır.", 4],
    ["Əla xidmət, kabinetdən hər mərhələni izlədim.", 5],
    ["Təmirdən sonra yenidən problem yarandı, zəmanətlə həll etdilər.", 3],
  ] as const;
  const closed = db.serviceOrders.filter((o) => (o.status === "CLOSED" || o.status === "COMPLETED") && o.technicianId && !o.companyId);
  closed.forEach((o, i) => {
    if (i % 3 === 2) return;
    const [comment, rating] = comments[i % comments.length]!;
    const author = db.users.find((u) => u.id === o.customerId)!;
    const base = { orderId: o.id, authorId: author.id, authorName: `${author.firstName} ${author.lastName.slice(0, 1)}.`, pros: null, cons: null, photos: i % 4 === 0 ? 2 : 0, reported: false, createdAt: o.closedAt ?? o.updatedAt };
    db.reviews.push({ ...base, id: idFor(`review:t:${o.id}`), target: "TECHNICIAN", targetId: o.technicianId!, rating, criteria: { quality: rating, punctuality: Math.max(3, rating - (i % 2)), behavior: 5 }, comment, status: i === 4 ? "PENDING" : "PUBLISHED", reply: i % 5 === 0 ? "Rəyiniz üçün təşəkkür edirik!" : null });
    db.reviews.push({ ...base, id: idFor(`review:s:${o.id}`), target: "SERVICE", targetId: o.serviceId, rating, criteria: {}, comment, status: "PUBLISHED", reply: null });
  });
  const productReview = (key: string, author: string, rating: number, comment: string, pros: string, cons: string, days: number, status: "PUBLISHED" | "PENDING" = "PUBLISHED") =>
    db.reviews.push({ id: idFor(`review:p:${key}:${author}`), target: "PRODUCT", targetId: PROD[key]!.id, orderId: null, authorId: uid(author), authorName: db.users.find((u) => u.id === uid(author))!.firstName + " " + db.users.find((u) => u.id === uid(author))!.lastName.slice(0, 1) + ".", rating, criteria: {}, pros, cons, comment, photos: 0, status, reply: null, reported: false, createdAt: daysAgo(days) });
  productReview("lg-dualcool", "aysel", 5, "Çox sakit işləyir, Wi-Fi ilə idarə rahatdır.", "Səssiz, qənaətli", "Pult bir az kiçikdir", 180);
  productReview("lg-dualcool", "gunel", 4, "Yaxşı soyudur, quraşdırma ilə birlikdə aldım.", "Sürətli soyutma", "Qiymət", 120);
  productReview("samsung-windfree", "gunel", 5, "Küləksiz rejim həqiqətən fərqlidir.", "WindFree rejimi", "—", 140);
  productReview("midea-xtreme", "rashad", 4, "Qiymətinə görə əladır.", "Ucuz", "Bir az səs-küylüdür", 60);
  productReview("ac-filter", "aysel", 2, "Biri qüsurlu gəldi, qaytardım.", "—", "Keyfiyyət", 30, "PENDING");
  db.reviews.find((r) => r.target === "PRODUCT" && r.rating === 2)!.reported = true;

  // --- Səbət (Aysel) ---
  db.carts.push({ id: idFor("cart:aysel"), ownerKey: uid("aysel"), items: [{ id: idFor("ci:1"), variantId: PROD["copper-pipe"]!.variants[1]!.id, productId: PROD["copper-pipe"]!.id, quantity: "10", unit: "m", withInstallation: false, priceSnapshotCents: 620 }, { id: idFor("ci:2"), variantId: PROD["samsung-windfree"]!.variants[0]!.id, productId: PROD["samsung-windfree"]!.id, quantity: "1", unit: "pcs", withInstallation: true, priceSnapshotCents: 149000 }], promoCode: null, merged: false, updatedAt: hoursFromNow(-5) });
  db.users.find((u) => u.id === uid("aysel"))!.favorites = [PROD["lg-artcool"]!.id, PROD["grundfos-scala2"]!.id, PROD["daikin-sensira"]!.id];
  db.users.find((u) => u.id === uid("aysel"))!.compare = [PROD["lg-dualcool"]!.id, PROD["samsung-windfree"]!.id];

  // --- Hesablaşma statusları ---
  const lines = db.settlementLines;
  lines.forEach((l, i) => {
    const age = (Date.now() - new Date(l.closedAt).getTime()) / 86400_000;
    if (age > 30) { l.status = "PAID"; l.paidAt = new Date(new Date(l.closedAt).getTime() + 14 * 86400_000).toISOString(); l.approvedBy = "Səbinə Axundova"; l.period = periodLabel(new Date(l.closedAt)); }
    else if (age > 14) { l.status = "APPROVED"; l.approvedBy = "Səbinə Axundova"; l.period = periodLabel(new Date(l.closedAt)); }
    if (i === 2) { l.status = "ON_HOLD"; l.holdReason = "Zəmanət iddiası araşdırılır"; }
  });
  db.commissions.forEach((c) => { if (Date.now() - new Date(c.createdAt).getTime() > 10 * 86400_000) { c.status = "APPROVED"; } });
  db.commissions.push({ id: idFor("com:old"), partnerId: COMPANY.klima, orderId: idFor("salesorder:5013"), orderNumber: "SO-5013", orderType: "SALES", baseCents: 1240000, model: "PERCENT", rate: "3", amountCents: 37200, status: "PAID", createdAt: daysAgo(13), paidAt: daysAgo(3) });

  // --- Korporativ planlı vizitlər ---
  const corpDevices = db.devices.filter((d) => d.ownerId === COMPANY.azer);
  corpDevices.slice(0, 14).forEach((d, i) => {
    db.periodicVisits.push({ id: idFor(`visit:${i}`), companyId: COMPANY.azer, siteId: d.siteId!, deviceId: d.id, serviceId: d.categoryId === db.equipmentCategories[0]!.id ? SVC["ac-periodic"]! : SVC["boiler-periodic"]!, plannedAt: i < 3 ? daysAgo(20 - i * 5) : daysFromNow(i * 6), status: i < 2 ? "DONE" : i === 2 ? "MISSED" : i === 3 ? "ORDER_CREATED" : "PLANNED", orderId: null });
  });

  // --- Bildirişlər ---
  const n = (user: string, event: string, title: string, body: ReturnType<typeof L>, link: string | null, hoursAgo: number, read = false) => {
    notify(uid(user), event, title, body, link);
    db.notifications[0]!.createdAt = hoursFromNow(-hoursAgo);
    db.notifications[0]!.read = read;
  };
  n("aysel", "SUBSCRIPTION_EXPIRING", "notif.orderConfirmed", L("Premium abunəliyiniz 65 gün sonra yenilənəcək", "Подписка Premium продлится через 65 дней", "Your Premium renews in 65 days"), "/account/subscription", 72, true);
  n("aysel", "WARRANTY_EXPIRING", "notif.orderConfirmed", L("LG DualCool X123 cihazının periodik servis vaxtı yaxınlaşır", "Скоро плановое обслуживание LG DualCool X123", "Periodic service for LG DualCool X123 is due soon"), "/account/devices", 30, false);
  n("elvin", "SETTLEMENT_APPROVED", "notif.paymentOk", L("Hesablaşma təsdiqləndi", "Выплата одобрена", "Settlement approved"), "/technician/earnings", 50, false);
  n("warehouse", "LOW_STOCK", "notif.orderConfirmed", L("LG kompressor 18000 BTU minimum qalıqdan aşağıdır", "Компрессор LG 18000 BTU ниже минимума", "LG compressor 18000 BTU is below minimum"), "/inventory", 5, false);
  n("dispatcher", "SLA_BREACH", "notif.orderConfirmed", L("SV-1080: operator yoxlamasının SLA-sı aşıldı", "SV-1080: нарушен SLA проверки", "SV-1080: operator check SLA breached"), "/service-orders", 3, false);
  n("manager", "LOW_RATING", "notif.orderConfirmed", L("Aşağı reytinqli rəy: 3 ulduz", "Отзыв с низкой оценкой: 3 звезды", "Low-rated review: 3 stars"), "/reviews", 20, false);
  n("tural-t", "SUBSCRIPTION_PAST_DUE", "notif.paymentFail", L("Abunə ödənişi alınmadı — güzəşt müddəti 5 gün", "Оплата подписки не прошла — льготный период 5 дней", "Subscription payment failed — 5-day grace period"), "/technician/subscription", 30, false);
  n("admin", "DOCUMENT_EXPIRING", "notif.orderConfirmed", L("Fərid Nağıyev: qaz işləri sertifikatının müddəti bitib", "Фарид Нагиев: истёк сертификат на газовые работы", "Farid Naghiyev: gas certificate expired"), "/technicians/verification", 240, false);

  for (const u of db.users) {
    db.notificationPrefs.set(u.id, {
      channels: Object.fromEntries(["ORDER_STATUS", "ESTIMATE", "PAYMENT", "REMINDERS", "MARKETING"].map((g) => [g, { IN_APP: true, PUSH: g !== "MARKETING", EMAIL: g !== "ORDER_STATUS", SMS: g === "ORDER_STATUS" || g === "ESTIMATE", WHATSAPP: g === "ESTIMATE" }])) as Record<string, Record<"IN_APP" | "PUSH" | "EMAIL" | "SMS" | "WHATSAPP", boolean>>,
      marketingConsent: u.marketingConsent,
      quietHours: { enabled: true, from: "22:00", to: "08:00" },
    });
  }

  // --- Audit log ---
  const actors = [
    ["Admin İstifadəçi", "ADMIN"],
    ["Tahmaz Muradov", "SUPER_ADMIN"],
    ["Səbinə Axundova", "ACCOUNTANT"],
    ["Fərid Quliyev", "MANAGER"],
  ] as const;
  const events: [string, string, string, string, { field: string; from: string | null; to: string | null }[], string?][] = [
    ["edit", "workflow_templates", "TPL-A", "Kondisioner quraşdırma — Ünvanda v3", [{ field: "stages[8].mandatory", from: "true", to: "false" }]],
    ["edit", "subscription_plans", "CUSTOMER_PRO", "Pro", [{ field: "prices.MONTH_12", from: "95.00", to: "89.90" }]],
    ["edit", "roles", "MANAGER", "Menecer", [{ field: "fee_rules:approve", from: null, to: "BRANCH" }]],
    ["edit", "costing_methods", "CATEGORY:borular", "Borular", [{ field: "method", from: "WEIGHTED_AVERAGE", to: "FIFO" }], "Mühasiblə razılaşdırılıb"],
    ["waive_fee", "service_orders", "SV-1031", "SV-1031", [], "Müştəri loyallığı"],
    ["edit", "settings", "branding", "Brend ayarları", [{ field: "colors.accent", from: "#f97316", to: "#f59e0b" }]],
    ["create", "fee_rules", "fee:pickup-diag", "Götürmə-çatdırma logistika haqqı", []],
    ["approve", "technician_settlements", "2026-08", "Elvin Həsənov — 2026-08", [{ field: "status", from: "PENDING", to: "APPROVED" }]],
    ["delete", "catalog", "product:old-ac", "Köhnə model (arxiv)", [{ field: "status", from: "ACTIVE", to: "ARCHIVED" }]],
    ["edit", "integrations", "SMS:LSIM", "LSIM", [{ field: "mode", from: "SANDBOX", to: "SANDBOX" }]],
  ];
  events.forEach(([action, resource, resourceId, label, changes, reason], i) => {
    audit(null, action, resource, resourceId, label, changes, reason);
    const rec = db.auditLogs[0]!;
    const [actor, role] = actors[i % actors.length]!;
    rec.actorName = actor;
    rec.actorRole = role;
    rec.at = daysAgo(i * 1.7 + rng.next());
  });

  db.technicianApplications.push({ id: idFor("app:zaur"), userId: uid("zaur"), createdAt: daysAgo(2) });
}
