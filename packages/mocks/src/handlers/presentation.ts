import { db } from "../db/state";
import { find, list, notFound, route } from "../lib/http";
import { L } from "../lib/i18n";
import { money } from "../lib/money";
import { maskPhone } from "@sp/utils";
import { planDto, serviceDto, specName, technicianDto, technicianSummaryDto, warrantyDto } from "../dto";
import { computeSlots, matchingTechnicians } from "../engine/slots";
import { rankTechnicians, describeFees } from "../engine/workflow";
import { productSummaryDto } from "../dto";
import { productVisible } from "../engine/pricing";

/** Public endpoint-lər (PRD §60.1): brend, filiallar, servislər, slotlar, ustalar, planlar, məzmun, zəmanət yoxlaması. */

export const demoHandlers = [
  route.get("/branding", () => db.branding),

  route.get("/branches", ({ url }) => list(url, db.branches.filter((b) => b.active), { ignoreEmpty: true })),

  route.get("/zones", () => db.zones.filter((z) => z.active)),

  route.get("/specializations", () => db.specializations.map((s) => ({ id: s.id, name: specName(s.id), categoryId: s.categoryId, serviceType: s.serviceType, requiresCertificate: s.requiresCertificate }))),

  route.get("/home", ({ ctx }) => ({
    banners: db.banners.filter((b) => b.status === "PUBLISHED"),
    stats: {
      completedServices: db.services.reduce((s, x) => s + x.completedCount, 0),
      technicians: db.technicians.filter((t) => t.status === "ACTIVE").length,
      branches: db.branches.length,
      rating: 4.8,
    },
    popularServices: [...db.services].sort((a, b) => b.completedCount - a.completedCount).slice(0, 6).map(serviceDto),
    featuredProducts: db.products.filter((p) => productVisible(p, ctx) && p.type !== "CONSUMABLE").slice(0, 8).map((p) => productSummaryDto(p, ctx)),
    topTechnicians: [...db.technicians].filter((t) => t.status === "ACTIVE").sort((a, b) => Number(b.promoted) - Number(a.promoted) || b.rating - a.rating).slice(0, 4).map(technicianSummaryDto),
    reviews: db.reviews.filter((r) => r.status === "PUBLISHED" && r.target === "TECHNICIAN" && r.rating >= 4).slice(0, 6).map((r) => ({ id: r.id, authorName: r.authorName, rating: r.rating, comment: r.comment, createdAt: r.createdAt })),
  })),

  route.get("/services/:slug", ({ params }) => {
    const s = db.services.find((x) => x.slug === params.slug || x.id === params.slug);
    if (!s) notFound();
    const related = db.services.filter((x) => x.categoryId === s.categoryId && x.id !== s.id).map(serviceDto);
    return { ...serviceDto(s), related, reviews: db.reviews.filter((r) => r.target === "SERVICE" && r.targetId === s.id && r.status === "PUBLISHED").slice(0, 6).map((r) => ({ id: r.id, authorName: r.authorName, rating: r.rating, comment: r.comment, createdAt: r.createdAt })) };
  }),

  route.get("/services/:id/slots", ({ params, url, ctx }) => {
    const s = db.services.find((x) => x.id === params.id || x.slug === params.id);
    if (!s) notFound();
    const addressId = url.searchParams.get("addressId");
    const city = (addressId ? db.addresses.find((a) => a.id === addressId)?.city : url.searchParams.get("city")) ?? "Bakı";
    return computeSlots(s, { city, days: Number(url.searchParams.get("days") ?? 7), technicianId: url.searchParams.get("technicianId"), ctx, form: url.searchParams.get("executionForm") ?? "ON_SITE" });
  }),

  route.get("/services/:id/technicians", ({ params, url }) => {
    const s = db.services.find((x) => x.id === params.id || x.slug === params.id);
    if (!s) notFound();
    const addressId = url.searchParams.get("addressId");
    const city = (addressId ? db.addresses.find((a) => a.id === addressId)?.city : null) ?? "Bakı";
    const slot = url.searchParams.get("slot");
    let techs = matchingTechnicians(s, city);
    if (slot) {
      const slots = computeSlots(s, { city, days: 14, ctx: { entitlements: {} } as never, form: "ON_SITE" });
      const ids = slots.flatMap((d) => d.slots).find((x) => x.start === slot)?.technicianIds;
      if (ids) techs = techs.filter((t) => ids.includes(t.id));
    }
    // Promote olunan ustalar "Reklam" nişanı ilə önə çıxır (§15.4)
    return techs.map(technicianSummaryDto).sort((a, b) => Number(b.promoted) - Number(a.promoted) || b.rating - a.rating);
  }),

  route.get("/services/:id/fees", ({ params, ctx }) => {
    const s = db.services.find((x) => x.id === params.id || x.slug === params.id);
    if (!s) notFound();
    const fake = { serviceId: s.id, executionForm: s.executionForms[0], createdAt: new Date().toISOString(), address: null, customerId: ctx.user?.id ?? "", scheduledAt: null } as never;
    return { fees: describeFees(fake, ctx.locale), priceModel: s.priceModel, price: s.priceCents !== null ? money(s.priceCents) : null, cancellationTerms: L("Ləğv pulsuzdur. Usta yola çıxdıqdan sonra ləğv edilərsə çağırış haqqı tətbiq oluna bilər.", "Отмена бесплатна. После выезда мастера может взиматься плата за вызов.", "Cancellation is free. A call-out fee may apply once the technician is on the way.") };
  }),

  route.get("/technicians", ({ url, ctx }) => {
    const items = db.technicians.filter((t) => t.status === "ACTIVE" && db.users.find((u) => u.id === t.userId)).map((t) => technicianDto(t, ctx));
    return list(url, items, { search: (t) => `${t.fullName} ${JSON.stringify(t.specializations)}`, ignoreEmpty: false, defaultSort: "-rating" });
  }),

  route.get("/technicians/:id", ({ params, ctx }) => {
    const t = find(db.technicians, params.id);
    const dto = technicianDto(t, ctx);
    return { ...dto, phone: dto.phone ? maskPhone(dto.phone) : null, email: null };
  }),

  route.get("/plans", ({ url }) => {
    const group = url.searchParams.get("group");
    return db.plans.filter((p) => p.visibility === "PUBLIC" && (!group || p.group === group)).sort((a, b) => a.tier - b.tier).map(planDto);
  }),

  route.get("/entitlement-definitions", () => db.entitlementDefinitions),

  route.get("/faq", ({ url }) => list(url, db.faq.filter((f) => f.status === "PUBLISHED").sort((a, b) => a.order - b.order), { search: (f) => `${f.question.az} ${f.question.ru} ${f.question.en}`, ignoreEmpty: true, defaultSort: "order" })),

  route.get("/content/pages/:slug", ({ params }) => {
    const page = db.contentPages.find((p) => p.slug === params.slug && p.status === "PUBLISHED");
    if (!page) notFound();
    return page;
  }),

  route.get("/banners", () => db.banners.filter((b) => b.status === "PUBLISHED")),

  route.get("/reason-codes", ({ url }) => {
    const category = url.searchParams.get("category");
    return db.reasonCodes.filter((r) => r.active && (!category || r.category === category));
  }),

  // QR ilə zəmanət yoxlaması — fərdi məlumatlar göstərilmir (§23.3)
  route.get("/warranty/verify/:code", ({ params }) => {
    const w = db.warranties.find((x) => x.code.toUpperCase() === params.code.toUpperCase() || x.number === params.code);
    if (!w) return { valid: false, code: params.code, status: null, type: null, deviceName: null, serialMasked: null, coverage: null, startsAt: null, endsAt: null, issuer: null };
    const dto = warrantyDto(w);
    return { valid: dto.status === "ACTIVE", code: w.code, status: dto.status, type: w.type, deviceName: w.deviceName, serialMasked: w.serialNumber ? `${w.serialNumber.slice(0, 3)}•••${w.serialNumber.slice(-3)}` : null, coverage: w.coverage, startsAt: w.startsAt, endsAt: w.endsAt, issuer: db.branding.legalName };
  }),

  route.get("/technicians-ranking/:orderId", ({ params }) => {
    const order = find(db.serviceOrders, params.orderId);
    return rankTechnicians(order, null).map((r) => ({ ...r, technician: technicianSummaryDto(db.technicians.find((t) => t.id === r.id)!) }));
  }),
];
