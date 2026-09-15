import * as S from "@sp/schemas";
import { db } from "../db/state";
import type { TicketRec } from "../db/types";
import { fullName, isInternal, userById, type Ctx } from "../engine/context";
import { audit } from "../engine/effects";
import { createServiceOrder } from "../engine/orders";
import {
  OPEN_STATUSES, addMessage, agentActions, customerActions, evaluateTickets, openTicket, portalBase, runAgentAction, runCustomerAction,
  slaView, supportAgents, ticketDto, ticketSummaryDto,
} from "../engine/support";
import { crud, required } from "../lib/crud";
import { apiError } from "../lib/errors";
import { find, list, notFound, parse, requireAuth, requirePerm, route, validationError } from "../lib/http";
import { L } from "../lib/i18n";
import { DOCUMENT_TYPES, checkDataUrl } from "../lib/upload";
import { newId } from "../lib/rng";
import { bakuDay, nowIso } from "../lib/time";

/** Help Desk API: müştəri/B2B/usta kabineti, saytın əlaqə forması və CRM növbəsi. */

const CONTACT_TOPIC_CATEGORY: Record<string, string> = { General: "GENERAL", Order: "ORDER_DELIVERY", Warranty: "WARRANTY", Business: "B2B_SALES", Feedback: "FEEDBACK" };

function attachmentsOf(files: { name: string; dataUrl?: string }[] | undefined) {
  return (files ?? []).map((f, i) => {
    if (f.dataUrl) checkDataUrl(f.dataUrl, `attachments.${i}`, { types: DOCUMENT_TYPES, maxMb: 5 });
    return { name: f.name, url: f.dataUrl ?? null };
  });
}

function category(id: string, customerFacing: boolean) {
  const cat = db.ticketCategories.find((c) => c.id === id && c.active && (!customerFacing || c.customerVisible));
  if (!cat) throw validationError({ categoryId: ["validation.required"] });
  return cat;
}

/** Bağlanan obyektin mövcudluğu və (müştəri üçün) sahiblik yoxlaması. */
function resolveRelated(ctx: Ctx, type: NonNullable<TicketRec["related"]>["type"], id: string, owner: boolean): TicketRec["related"] {
  const u = ctx.user!;
  const mine = (customerId: string | null | undefined, companyId?: string | null) => !owner || customerId === u.id || (!!u.companyId && companyId === u.companyId);
  const ok = (() => {
    switch (type) {
      case "SERVICE_ORDER": { const o = db.serviceOrders.find((x) => x.id === id); return !!o && (mine(o.customerId, o.companyId) || (!!u.companyId && o.partnerCompanyId === u.companyId)); }
      case "SALES_ORDER": { const o = db.salesOrders.find((x) => x.id === id); return !!o && mine(o.customerId, o.companyId); }
      case "WARRANTY": { const w = db.warranties.find((x) => x.id === id); return !!w && mine(w.customerId); }
      case "PAYMENT": { const p = db.payments.find((x) => x.id === id); return !!p && mine(p.payerId, p.payerId); }
      case "RETURN": { const r = db.returns.find((x) => x.id === id); return !!r && mine(r.customerId); }
    }
  })();
  if (!ok) throw validationError({ relatedId: ["validation.invalid"] });
  return { type, id };
}

function ownTicket(ctx: Ctx, id: string) {
  const u = requireAuth(ctx);
  const t = db.tickets.find((x) => x.id === id);
  if (!t) notFound();
  const company = !!u.companyId && t.companyId === u.companyId && ctx.role !== "TECHNICIAN";
  if (t.requesterId !== u.id && !company) notFound();
  return t;
}

function visibleToCustomer(ctx: Ctx) {
  const u = requireAuth(ctx);
  return db.tickets.filter((t) => t.requesterId === u.id || (!!u.companyId && t.companyId === u.companyId && ctx.role !== "TECHNICIAN"));
}

function agentView(ctx: Ctx, t: TicketRec) {
  const requester = userById(t.requesterId);
  const orders = requester ? db.serviceOrders.filter((o) => o.customerId === requester.id) : [];
  const sales = requester ? db.salesOrders.filter((o) => o.customerId === requester.id) : [];
  const sub = requester ? db.subscriptions.find((s) => s.subscriberId === requester.id && ["ACTIVE", "TRIAL", "PAST_DUE", "GRACE_PERIOD"].includes(s.status)) : null;
  return {
    ...ticketDto(t, ctx, "agent"),
    requester: requester
      ? {
          id: requester.id,
          name: fullName(requester),
          phone: requester.phone,
          email: requester.email,
          role: requester.roles[0],
          segment: requester.segment,
          customerLink: requester.roles.includes("CUSTOMER") ? `/customers/${requester.id}` : null,
          planName: sub ? db.plans.find((p) => p.id === sub.planId)?.name ?? null : null,
          since: requester.createdAt,
          serviceOrders: orders.length,
          salesOrders: sales.length,
          openTickets: db.tickets.filter((x) => x.requesterId === requester.id && OPEN_STATUSES.includes(x.status)).length,
          recentOrders: [...orders.map((o) => ({ id: o.id, number: o.number, type: "SERVICE_ORDER", status: o.status, createdAt: o.createdAt, link: `/service-orders/${o.id}` })), ...sales.map((o) => ({ id: o.id, number: o.number, type: "SALES_ORDER", status: o.status, createdAt: o.createdAt, link: `/sales-orders/${o.id}` }))]
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
            .slice(0, 5),
          devices: db.devices.filter((d) => d.ownerId === requester.id).map((d) => ({ id: d.id, name: d.nickname ?? d.modelName })),
          addresses: db.addresses.filter((a) => a.ownerId === requester.id).map((a) => ({ id: a.id, label: `${a.label} — ${a.city}, ${a.street}` })),
        }
      : null,
    otherTickets: t.requesterId ? db.tickets.filter((x) => x.requesterId === t.requesterId && x.id !== t.id).slice(0, 5).map(ticketSummaryDto) : [],
  };
}

function agentFilter(ctx: Ctx, url: URL, rows: TicketRec[]) {
  const view = url.searchParams.get("_view") ?? "open";
  const me = ctx.user!.id;
  const withSla = rows.map((t) => ({ t, sla: slaView(t) }));
  const keep = withSla.filter(({ t, sla }) => {
    switch (view) {
      case "mine": return t.assigneeId === me && OPEN_STATUSES.includes(t.status);
      case "unassigned": return !t.assigneeId && OPEN_STATUSES.includes(t.status);
      case "breached": return OPEN_STATUSES.includes(t.status) && sla.state === "BREACHED";
      case "at_risk": return OPEN_STATUSES.includes(t.status) && sla.state === "AT_RISK";
      case "pending": return t.status === "PENDING_CUSTOMER" || t.status === "ON_HOLD";
      case "resolved": return t.status === "RESOLVED" || t.status === "CLOSED";
      case "all": return true;
      default: return OPEN_STATUSES.includes(t.status);
    }
  });
  return keep.map(({ t }) => t);
}

function stats(ctx: Ctx) {
  const me = ctx.user!.id;
  const open = db.tickets.filter((t) => OPEN_STATUSES.includes(t.status));
  const views = open.map((t) => ({ t, sla: slaView(t), dto: ticketSummaryDto(t) }));
  const done = db.tickets.filter((t) => t.resolvedAt);
  const responded = db.tickets.filter((t) => t.firstRespondedAt);
  const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((s, x) => s + x, 0) / xs.length) : null);
  const minutes = (a: string, b: string) => (new Date(b).getTime() - new Date(a).getTime()) / 60000;
  const rated = db.tickets.filter((t) => t.csat);
  const today = bakuDay(nowIso());
  return {
    open: open.length,
    unassigned: open.filter((t) => !t.assigneeId).length,
    mine: open.filter((t) => t.assigneeId === me).length,
    awaitingAgent: views.filter((v) => v.dto.awaitingAgent).length,
    breached: views.filter((v) => v.sla.state === "BREACHED").length,
    atRisk: views.filter((v) => v.sla.state === "AT_RISK").length,
    pendingCustomer: open.filter((t) => t.status === "PENDING_CUSTOMER").length,
    resolvedToday: done.filter((t) => bakuDay(t.resolvedAt!) === today).length,
    avgFirstResponseMinutes: avg(responded.map((t) => minutes(t.createdAt, t.firstRespondedAt!))),
    avgResolutionMinutes: avg(done.map((t) => minutes(t.createdAt, t.resolvedAt!))),
    slaCompliance: done.length ? Math.round((done.filter((t) => slaView(t).state === "MET").length / done.length) * 1000) / 10 : null,
    csatAverage: rated.length ? Math.round((rated.reduce((s, t) => s + t.csat!.rating, 0) / rated.length) * 10) / 10 : null,
    csatCount: rated.length,
    byQueue: (["GENERAL", "SERVICE", "SALES", "BILLING", "WARRANTY", "TECHNICAL"] as const).map((queue) => ({ queue, open: views.filter((v) => v.dto.queue === queue).length, breached: views.filter((v) => v.dto.queue === queue && v.sla.state === "BREACHED").length })),
    byChannel: (["WEB_FORM", "PORTAL", "PHONE", "EMAIL", "WHATSAPP", "INTERNAL"] as const).map((channel) => ({ channel, count: db.tickets.filter((t) => t.channel === channel).length })),
    agents: supportAgents()
      .map((a) => {
        const mineRated = db.tickets.filter((t) => t.assigneeId === a.id && t.csat);
        return { id: a.id, name: fullName(a), open: open.filter((t) => t.assigneeId === a.id).length, resolved: done.filter((t) => t.assigneeId === a.id).length, csat: mineRated.length ? Math.round((mineRated.reduce((s, t) => s + t.csat!.rating, 0) / mineRated.length) * 10) / 10 : null };
      })
      .filter((a) => a.open || a.resolved)
      .sort((a, b) => b.open - a.open),
  };
}

export const supportHandlers = [
  /* ---------------- Public ---------------- */
  route.get("/support/categories", () =>
    db.ticketCategories.filter((c) => c.active && c.customerVisible).sort((a, b) => a.order - b.order).map((c) => ({ id: c.id, code: c.code, name: c.name, description: c.description, queue: c.queue, firstResponseMinutes: c.sla[c.defaultPriority].firstResponseMinutes })),
  ),

  /** Saytın əlaqə forması — qonaq da müraciət yarada bilər; daxil olubsa müraciət hesabına bağlanır. */
  route.post("/support/contact", async ({ ctx, body }) => {
    const data = parse(S.ContactTicketRequest, await body());
    if (!data.phone && !data.email && !ctx.user) throw validationError({ phone: ["validation.required"] });
    const cat = db.ticketCategories.find((c) => c.code === CONTACT_TOPIC_CATEGORY[data.topic]) ?? db.ticketCategories[0]!;
    const number = data.orderNumber.toUpperCase();
    const so = number ? db.serviceOrders.find((o) => o.number === number) : null;
    const sales = number && !so ? db.salesOrders.find((o) => o.number === number) : null;
    const u = ctx.user;
    // Qonaq başqasının sifarişinə bağlana bilməz — nömrə yalnız etiket kimi saxlanılır
    const related = so && (!u || so.customerId === u.id) ? { type: "SERVICE_ORDER" as const, id: so.id } : sales && (!u || sales.customerId === u.id) ? { type: "SALES_ORDER" as const, id: sales.id } : null;
    const t = openTicket(
      {
        categoryId: cat.id,
        subject: data.message.split(/\s+/).slice(0, 8).join(" ").slice(0, 80),
        body: data.message,
        channel: "WEB_FORM",
        requester: { id: u?.id ?? null, name: data.name, phone: data.phone || u?.phone || null, email: data.email || u?.email || null, companyId: u?.companyId ?? null },
        related: u ? related : null,
        tags: number ? [number] : [],
      },
      ctx,
    );
    if (!u && related) t.tags.push("unverified-order");
    return { id: t.id, number: t.number, trackLink: portalBase(t.requesterId) ? `${portalBase(t.requesterId)}/${t.id}` : null };
  }),

  /* ---------------- Kabinet (müştəri, B2B, usta) ---------------- */
  route.get("/support/tickets", ({ ctx, url }) => {
    evaluateTickets();
    const rows = visibleToCustomer(ctx).map((t) => ({ ...ticketSummaryDto(t), availableActions: customerActions(t) }));
    return list(url, rows, { defaultSort: "-updatedAt", search: (x) => `${x.number} ${x.subject}`, defaultPageSize: 20 });
  }),

  route.get("/support/related", ({ ctx }) => {
    const u = requireAuth(ctx);
    const mine = <T extends { customerId: string; companyId?: string | null }>(o: T) => o.customerId === u.id || (!!u.companyId && o.companyId === u.companyId);
    return [
      ...db.serviceOrders.filter(mine).slice(0, 15).map((o) => ({ type: "SERVICE_ORDER", id: o.id, number: o.number, label: db.services.find((s) => s.id === o.serviceId)?.name ?? L(o.number), createdAt: o.createdAt })),
      ...db.salesOrders.filter(mine).slice(0, 10).map((o) => ({ type: "SALES_ORDER", id: o.id, number: o.number, label: L(o.number), createdAt: o.createdAt })),
      ...db.warranties.filter((w) => w.customerId === u.id && !w.void).slice(0, 10).map((w) => ({ type: "WARRANTY", id: w.id, number: w.number, label: L(w.deviceName), createdAt: w.startsAt })),
    ];
  }),

  route.post("/support/tickets", async ({ ctx, body }) => {
    const u = requireAuth(ctx);
    const data = parse(S.CreateTicketRequest, await body());
    const cat = category(data.categoryId, true);
    const related = data.relatedType && data.relatedId ? resolveRelated(ctx, data.relatedType, data.relatedId, true) : null;
    const t = openTicket({ categoryId: cat.id, subject: data.subject, body: data.body, channel: "PORTAL", requester: { id: u.id, name: ctx.company && ctx.role !== "TECHNICIAN" ? `${fullName(u)} (${ctx.company.legalName})` : fullName(u), phone: u.phone, email: u.email, companyId: ctx.role === "TECHNICIAN" ? null : u.companyId }, related, attachments: attachmentsOf(data.attachments) }, ctx);
    return ticketDto(t, ctx, "customer");
  }),

  route.get("/support/tickets/:id", ({ ctx, params }) => {
    evaluateTickets();
    return ticketDto(ownTicket(ctx, params.id), ctx, "customer");
  }),

  route.post("/support/tickets/:id/messages", async ({ ctx, params, body }) => {
    const t = ownTicket(ctx, params.id);
    const raw = await body<Record<string, unknown>>();
    const data = parse(S.TicketReplyRequest, { ...raw, internal: false, statusAfter: undefined });
    if (t.status === "CLOSED") throw apiError(409, "ACTION_NOT_ALLOWED", "error.actionNotAllowed");
    addMessage(t, ctx, { body: data.body, internal: false, asCustomer: true, attachments: attachmentsOf(data.attachments) });
    return ticketDto(t, ctx, "customer");
  }),

  route.post("/support/tickets/:id/actions", async ({ ctx, params, body }) => {
    const t = ownTicket(ctx, params.id);
    const data = parse(S.TicketActionRequest, await body());
    if (!customerActions(t).some((a) => a.code === data.code)) throw apiError(409, "ACTION_NOT_ALLOWED", "error.actionNotAllowed");
    if (data.code === "rate" && !data.rating) throw validationError({ rating: ["validation.rating"] });
    runCustomerAction(t, ctx, data);
    return ticketDto(t, ctx, "customer");
  }),

  /* ---------------- CRM növbəsi ---------------- */
  route.get("/admin/tickets", ({ ctx, url }) => {
    requirePerm(ctx, "tickets:view");
    evaluateTickets();
    const rows = agentFilter(ctx, url, db.tickets).map(ticketSummaryDto);
    return list(url, rows, { defaultSort: "sla.remainingMinutes", search: (x) => `${x.number} ${x.subject} ${x.requesterName} ${x.tags.join(" ")} ${x.relatedNumber ?? ""}`, defaultPageSize: 25 });
  }),

  route.get("/admin/tickets/stats", ({ ctx }) => {
    requirePerm(ctx, "tickets:view");
    evaluateTickets();
    return stats(ctx);
  }),

  route.post("/admin/tickets", async ({ ctx, body }) => {
    requirePerm(ctx, "tickets:create");
    const data = parse(S.AdminCreateTicketRequest, await body());
    const cat = category(data.categoryId, false);
    const requester = data.requesterId ? userById(data.requesterId) : null;
    if (data.requesterId && !requester) throw validationError({ requesterId: ["validation.invalid"] });
    if (!requester && !data.requesterName) throw validationError({ requesterName: ["validation.required"] });
    if (data.assigneeId && !supportAgents().some((a) => a.id === data.assigneeId)) throw validationError({ assigneeId: ["validation.invalid"] });
    const related = data.relatedType && data.relatedId ? resolveRelated(ctx, data.relatedType, data.relatedId, false) : null;
    const t = openTicket(
      {
        categoryId: cat.id,
        subject: data.subject,
        body: data.body,
        channel: data.channel,
        priority: data.priority,
        requester: requester ? { id: requester.id, name: fullName(requester), phone: requester.phone, email: requester.email, companyId: requester.companyId } : { id: null, name: data.requesterName!, phone: data.requesterPhone || null, email: null, companyId: null },
        // Telefon zəngini qeyd edən operator müraciətin ilk mətnini müştərinin sözləri kimi yazır
        author: { id: requester?.id ?? null, name: requester ? fullName(requester) : data.requesterName!, role: "CUSTOMER", fromCustomer: true },
        assigneeId: data.assigneeId ?? null,
        related,
      },
      ctx,
    );
    audit(ctx, "create", "tickets", t.id, t.number);
    return agentView(ctx, t);
  }),

  route.get("/admin/tickets/:id", ({ ctx, params }) => {
    requirePerm(ctx, "tickets:view");
    evaluateTickets();
    return agentView(ctx, find(db.tickets, params.id));
  }),

  route.patch("/admin/tickets/:id", async ({ ctx, params, body }) => {
    requirePerm(ctx, "tickets:edit");
    const t = find(db.tickets, params.id);
    const data = await body<{ subject?: string; categoryId?: string; tags?: string[] }>();
    const changes: { field: string; from: string | null; to: string | null }[] = [];
    if (data.subject !== undefined) {
      if (data.subject.trim().length < 5) throw validationError({ subject: ["validation.subjectMin"] });
      changes.push({ field: "subject", from: t.subject, to: data.subject.trim() });
      t.subject = data.subject.trim();
    }
    if (data.categoryId && data.categoryId !== t.categoryId) {
      category(data.categoryId, false);
      changes.push({ field: "categoryId", from: t.categoryId, to: data.categoryId });
      t.categoryId = data.categoryId;
    }
    if (Array.isArray(data.tags)) {
      const tags = [...new Set(data.tags.map((x) => String(x).trim().toLowerCase()).filter(Boolean))].slice(0, 10);
      changes.push({ field: "tags", from: t.tags.join(","), to: tags.join(",") });
      t.tags = tags;
    }
    t.updatedAt = nowIso();
    if (changes.length) audit(ctx, "edit", "tickets", t.id, t.number, changes);
    return agentView(ctx, t);
  }),

  route.post("/admin/tickets/:id/messages", async ({ ctx, params, body }) => {
    requirePerm(ctx, "tickets:edit");
    const t = find(db.tickets, params.id);
    const data = parse(S.TicketReplyRequest, await body());
    if (t.status === "CLOSED") throw apiError(409, "ACTION_NOT_ALLOWED", "error.actionNotAllowed");
    if (data.cannedResponseId) {
      const canned = db.cannedResponses.find((c) => c.id === data.cannedResponseId);
      if (canned) canned.usageCount += 1;
    }
    addMessage(t, ctx, { body: data.body, internal: data.internal, statusAfter: data.internal ? undefined : data.statusAfter, asCustomer: false, attachments: attachmentsOf(data.attachments) });
    return agentView(ctx, t);
  }),

  route.post("/admin/tickets/:id/actions", async ({ ctx, params, body }) => {
    requirePerm(ctx, "tickets:edit");
    const t = find(db.tickets, params.id);
    const data = parse(S.TicketActionRequest, await body());
    const action = agentActions(t, ctx).find((a) => a.code === data.code);
    if (!action || data.code === "create_service_order") throw apiError(409, "ACTION_NOT_ALLOWED", "error.actionNotAllowed");
    if (action.requiresReason && !data.reasonCode) throw validationError({ reasonCode: ["validation.required"] });
    if (data.code === "assign" && data.assigneeId && !supportAgents().some((a) => a.id === data.assigneeId)) throw validationError({ assigneeId: ["validation.invalid"] });
    if (data.code === "change_priority" && !data.priority) throw validationError({ priority: ["validation.required"] });
    runAgentAction(t, ctx, data);
    audit(ctx, data.code, "tickets", t.id, t.number, [], data.note);
    return agentView(ctx, t);
  }),

  /** Müraciətdən servis sifarişi — müştərinin cihazı və ünvanı ilə. */
  route.post("/admin/tickets/:id/service-order", async ({ ctx, params, body }) => {
    requirePerm(ctx, "tickets:edit");
    requirePerm(ctx, "service_orders:create");
    const t = find(db.tickets, params.id);
    if (!agentActions(t, ctx).some((a) => a.code === "create_service_order")) throw apiError(409, "ACTION_NOT_ALLOWED", "error.actionNotAllowed");
    const data = await body<{ serviceId?: string; executionForm?: string; deviceId?: string; addressId?: string; urgent?: boolean }>();
    const service = db.services.find((s) => s.id === data.serviceId && s.active);
    const errors: Record<string, string[]> = {};
    if (!service) errors.serviceId = ["validation.required"];
    if (service && !service.executionForms.includes(data.executionForm as never)) errors.executionForm = ["validation.required"];
    const address = data.addressId ? db.addresses.find((a) => a.id === data.addressId && a.ownerId === t.requesterId) : null;
    if (data.executionForm === "ON_SITE" && !address) errors.addressId = ["validation.required"];
    if (data.deviceId && !db.devices.some((d) => d.id === data.deviceId && d.ownerId === t.requesterId)) errors.deviceId = ["validation.invalid"];
    if (Object.keys(errors).length) throw validationError(errors);
    const firstMessage = t.messages.find((m) => m.kind === "PUBLIC")?.body ?? t.subject;
    const order = createServiceOrder({
      serviceId: service!.id,
      executionForm: data.executionForm as never,
      customerId: t.requesterId!,
      companyId: t.companyId,
      deviceId: data.deviceId ?? null,
      description: `${t.number}: ${firstMessage}`.slice(0, 1000),
      address: address ? { ...address } : null,
      urgent: !!data.urgent || t.priority === "URGENT",
      source: "OPERATOR",
      operatorId: ctx.user!.id,
      contactChannel: t.channel === "WHATSAPP" ? "WHATSAPP" : "CALL",
    });
    t.serviceOrderId = order.id;
    t.related ??= { type: "SERVICE_ORDER", id: order.id };
    t.messages.push({ id: newId("tm"), kind: "SYSTEM", authorId: null, authorName: "Sistem", authorRole: "SYSTEM", fromCustomer: false, body: `service_order_created:${order.number}`, attachments: [], createdAt: nowIso() });
    t.updatedAt = nowIso();
    t.history.unshift({ id: newId("th"), at: nowIso(), actorName: fullName(ctx.user), actorRole: ctx.role, action: "service_order_created", note: order.number });
    audit(ctx, "create_service_order", "tickets", t.id, t.number, [], order.number);
    return { ticket: agentView(ctx, t), orderId: order.id, orderNumber: order.number };
  }),

  ...crud("/admin/ticket-categories", {
    perm: "tickets",
    get: () => db.ticketCategories,
    set: (x) => (db.ticketCategories = x),
    defaultSort: "order",
    label: (r) => r.code,
    toDto: (r) => ({ ...r, openTickets: db.tickets.filter((t) => t.categoryId === r.id && OPEN_STATUSES.includes(t.status)).length, firstResponseMinutes: r.sla.NORMAL.firstResponseMinutes, resolutionMinutes: r.sla.NORMAL.resolutionMinutes }),
    validate: (b, rec) => {
      const errors = rec ? null : required(b, "code", "nameI18n", "queue", "defaultPriority");
      if (errors) return errors;
      const sla = b.sla as Record<string, { firstResponseMinutes: number; resolutionMinutes: number }> | undefined;
      if (sla && (["LOW", "NORMAL", "HIGH", "URGENT"] as const).some((p) => !(Number(sla[p]?.firstResponseMinutes) > 0) || !(Number(sla[p]?.resolutionMinutes) > Number(sla[p]?.firstResponseMinutes)))) return { sla: ["validation.invalid"] };
      if (!rec && db.ticketCategories.some((c) => c.code === b.code)) return { code: ["validation.alreadyExists"] };
      return null;
    },
    create: (b) => ({
      id: newId("tcat"),
      code: String(b.code).toUpperCase(),
      name: b.name as never,
      description: (b.description as never) ?? L(""),
      queue: b.queue as never,
      defaultPriority: b.defaultPriority as never,
      sla: (b.sla as never) ?? { LOW: { firstResponseMinutes: 480, resolutionMinutes: 4320 }, NORMAL: { firstResponseMinutes: 240, resolutionMinutes: 2880 }, HIGH: { firstResponseMinutes: 60, resolutionMinutes: 1440 }, URGENT: { firstResponseMinutes: 30, resolutionMinutes: 480 } },
      customerVisible: b.customerVisible !== false,
      order: Number(b.order ?? db.ticketCategories.length + 1),
      active: b.active !== false,
    }),
    beforeDelete: (r) => {
      if (db.tickets.some((t) => t.categoryId === r.id)) throw apiError(409, "IN_USE", "error.actionNotAllowed");
    },
  }),

  ...crud("/admin/canned-responses", {
    perm: "tickets",
    get: () => db.cannedResponses,
    set: (x) => (db.cannedResponses = x),
    defaultSort: "-usageCount",
    label: (r) => r.shortcut,
    toDto: (r) => ({ ...r, categoryName: db.ticketCategories.find((c) => c.id === r.categoryId)?.name ?? null }),
    validate: (b, rec) => (rec ? null : required(b, "shortcut", "titleI18n", "bodyI18n")),
    create: (b) => ({ id: newId("canned"), shortcut: String(b.shortcut).replace(/^\/?/, "/").toLowerCase(), title: b.title as never, body: b.body as never, categoryId: (b.categoryId as string) || null, usageCount: 0, active: b.active !== false }),
  }),

  /** Cavab redaktoru üçün hazır cavablar və əməkdaşlar. */
  route.get("/admin/support-lookups", ({ ctx }) => {
    requirePerm(ctx, "tickets:view");
    return {
      agents: supportAgents().filter((u) => !u.roles.includes("SUPER_ADMIN") || isInternal(ctx)).map((u) => ({ id: u.id, name: fullName(u), role: u.roles[0], open: db.tickets.filter((t) => t.assigneeId === u.id && OPEN_STATUSES.includes(t.status)).length })),
      categories: db.ticketCategories.filter((c) => c.active).sort((a, b) => a.order - b.order).map((c) => ({ id: c.id, code: c.code, name: c.name, queue: c.queue, defaultPriority: c.defaultPriority, sla: c.sla })),
      cannedResponses: db.cannedResponses.filter((c) => c.active).map((c) => ({ id: c.id, shortcut: c.shortcut, title: c.title, body: c.body, bodyI18n: c.body, categoryId: c.categoryId })),
    };
  }),
];
