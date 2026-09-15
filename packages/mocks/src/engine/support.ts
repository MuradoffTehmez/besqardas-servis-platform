import type { AvailableAction, LocalizedText, Role } from "@sp/types";
import { db, nextNumber } from "../db/state";
import type { TicketCategoryRec, TicketMessageRec, TicketPriorityCode, TicketRec } from "../db/types";
import type { UserRec } from "../data/people";
import { permissionsFor } from "../data/rbac";
import { L, tr } from "../lib/i18n";
import { newId } from "../lib/rng";
import { addMinutes, nowIso } from "../lib/time";
import { can, fullName, userById, type Ctx } from "./context";
import { notify } from "./effects";

/**
 * Help Desk mühərriki: SLA hədəfləri, müştəri gözlənilərkən SLA pauzası, pozuntu və eskalasiya,
 * avtomatik bağlanma, yük balansı ilə təyinat və status keçidləri (`availableActions`).
 */

const MINUTE = 60_000;
/** Həll olunmuş müraciət bu müddətdən sonra avtomatik bağlanır. */
export const AUTO_CLOSE_HOURS = 72;
/** Müştəri həll olunmuş müraciəti bu müddət ərzində yenidən aça bilər. */
export const REOPEN_DAYS = 7;
/** SLA-nın bu hissəsi qalanda müraciət "risk altında" sayılır. */
const AT_RISK_SHARE = 0.25;

export const OPEN_STATUSES: TicketRec["status"][] = ["NEW", "OPEN", "PENDING_CUSTOMER", "ON_HOLD"];
const PAUSED_STATUSES: TicketRec["status"][] = ["PENDING_CUSTOMER", "ON_HOLD"];
const PRIORITY_RANK: Record<TicketPriorityCode, number> = { LOW: 0, NORMAL: 1, HIGH: 2, URGENT: 3 };

/** Növbə → onu işləyən daxili rollar (avtomatik təyinat üçün). */
export const QUEUE_ROLES: Record<TicketCategoryRec["queue"], Role[]> = {
  GENERAL: ["OPERATOR"],
  SERVICE: ["OPERATOR", "DISPATCHER"],
  SALES: ["SALES_EMPLOYEE"],
  BILLING: ["ACCOUNTANT"],
  WARRANTY: ["OPERATOR", "MANAGER"],
  TECHNICAL: ["DISPATCHER", "MANAGER"],
};

const ms = (iso: string) => new Date(iso).getTime();

export function categoryOf(t: TicketRec): TicketCategoryRec {
  return db.ticketCategories.find((c) => c.id === t.categoryId) ?? db.ticketCategories[0]!;
}

export function slaTargets(categoryId: string, priority: TicketPriorityCode) {
  const cat = db.ticketCategories.find((c) => c.id === categoryId) ?? db.ticketCategories[0]!;
  return cat.sla[priority];
}

/** Müraciəti işləyə bilən daxili əməkdaşlar. */
export function supportAgents(): UserRec[] {
  return db.users.filter((u) => u.status === "ACTIVE" && u.roles.some((r) => r === "SUPER_ADMIN" || permissionsFor(r).codes.includes("tickets:edit")));
}

function agentRole(u: UserRec) {
  return u.roles.find((r) => r !== "CUSTOMER") ?? u.roles[0]!;
}

function history(t: TicketRec, ctx: Ctx | null, action: string, extra: { from?: string; to?: string; reason?: string; note?: string } = {}) {
  t.history.unshift({
    id: newId("th"),
    at: nowIso(),
    actorName: ctx?.user ? fullName(ctx.user) : "Sistem",
    actorRole: ctx?.role ?? "SYSTEM",
    action,
    ...(extra.from ? { fromStatus: extra.from } : {}),
    ...(extra.to ? { toStatus: extra.to } : {}),
    ...(extra.reason ? { reason: extra.reason } : {}),
    ...(extra.note ? { note: extra.note } : {}),
  });
}

function systemMessage(t: TicketRec, body: string, at = nowIso()) {
  t.messages.push({ id: newId("tm"), kind: "SYSTEM", authorId: null, authorName: "Sistem", authorRole: "SYSTEM", fromCustomer: false, body, attachments: [], createdAt: at });
}

/** Müştəri tərəfində müraciətin açıldığı kabinet yolu. */
export function portalBase(userId: string | null): string | null {
  const u = userById(userId);
  if (!u) return null;
  if (u.roles.includes("CUSTOMER")) return "/account/support";
  if (u.roles.includes("CORPORATE_CUSTOMER")) return "/corporate/support";
  if (u.roles.includes("PARTNER")) return "/partner/support";
  if (u.roles.includes("WHOLESALE_CUSTOMER")) return "/wholesale/support";
  if (u.roles.includes("TECHNICIAN")) return "/technician/support";
  return null;
}

function notifyRequester(t: TicketRec, event: string, titleKey: string, body: LocalizedText) {
  const base = portalBase(t.requesterId);
  if (base) notify(t.requesterId, event, titleKey, body, `${base}/${t.id}`);
}

/* ------------------------------------------------------------------ */
/* SLA                                                                  */
/* ------------------------------------------------------------------ */

function initDueDates(t: TicketRec) {
  const s = slaTargets(t.categoryId, t.priority);
  t.firstResponseDueAt = addMinutes(t.createdAt, s.firstResponseMinutes);
  t.resolutionDueAt = addMinutes(t.createdAt, s.resolutionMinutes);
}

/** Pauza bitəndə son tarixlər dayanma müddəti qədər irəli çəkilir. */
function resumeSla(t: TicketRec) {
  if (!t.slaPausedAt) return;
  const paused = Math.max(0, ms(nowIso()) - ms(t.slaPausedAt));
  t.resolutionDueAt = new Date(ms(t.resolutionDueAt) + paused).toISOString();
  if (!t.firstRespondedAt) t.firstResponseDueAt = new Date(ms(t.firstResponseDueAt) + paused).toISOString();
  t.slaPausedAt = null;
}

export function slaView(t: TicketRec) {
  const s = slaTargets(t.categoryId, t.priority);
  const ref = t.resolvedAt ? ms(t.resolvedAt) : t.slaPausedAt ? ms(t.slaPausedAt) : Date.now();
  const breachedFirstResponse = t.firstRespondedAt ? ms(t.firstRespondedAt) > ms(t.firstResponseDueAt) : ref > ms(t.firstResponseDueAt) && t.status !== "CLOSED";
  const breachedResolution = ref > ms(t.resolutionDueAt);
  const done = t.status === "RESOLVED" || t.status === "CLOSED";
  const remaining = Math.round((ms(t.resolutionDueAt) - ref) / MINUTE);
  const firstRemaining = t.firstRespondedAt ? Infinity : (ms(t.firstResponseDueAt) - ref) / MINUTE;
  let state: "ON_TRACK" | "AT_RISK" | "BREACHED" | "PAUSED" | "MET";
  if (done) state = breachedResolution || breachedFirstResponse ? "BREACHED" : "MET";
  else if (breachedResolution || breachedFirstResponse) state = "BREACHED";
  else if (t.slaPausedAt) state = "PAUSED";
  else if (remaining < s.resolutionMinutes * AT_RISK_SHARE || firstRemaining < s.firstResponseMinutes * AT_RISK_SHARE) state = "AT_RISK";
  else state = "ON_TRACK";
  return {
    state,
    firstResponseDueAt: t.firstResponseDueAt,
    resolutionDueAt: t.resolutionDueAt,
    firstRespondedAt: t.firstRespondedAt,
    remainingMinutes: done ? null : remaining,
    breachedFirstResponse,
    breachedResolution,
    escalationLevel: t.escalationLevel,
  };
}

function managers(): UserRec[] {
  return db.users.filter((u) => u.status === "ACTIVE" && u.roles.includes("MANAGER"));
}

/**
 * Tənbəl (lazy) qiymətləndirmə — hər sorğudan əvvəl çağırılır: pozuntu olan müraciət eskalasiya olunur,
 * həll olunmuş və müddəti keçmiş müraciət bağlanır. Real backend-də bu, planlaşdırılmış iş (cron) olacaq.
 */
export function evaluateTickets() {
  const now = Date.now();
  for (const t of db.tickets) {
    if (t.status === "RESOLVED" && t.resolvedAt && now - ms(t.resolvedAt) > AUTO_CLOSE_HOURS * 3600_000) {
      t.status = "CLOSED";
      t.closedAt = addMinutes(t.resolvedAt, AUTO_CLOSE_HOURS * 60);
      t.updatedAt = t.closedAt;
      history(t, null, "auto_closed", { from: "RESOLVED", to: "CLOSED" });
      systemMessage(t, `auto_closed:${AUTO_CLOSE_HOURS}`, t.closedAt);
      continue;
    }
    if (!OPEN_STATUSES.includes(t.status) || t.slaPausedAt || t.breachNotified) continue;
    const v = slaView(t);
    if (v.state !== "BREACHED") continue;
    t.breachNotified = true;
    t.escalationLevel = Math.min(3, t.escalationLevel + 1);
    history(t, null, "sla_breached", { note: v.breachedFirstResponse && !t.firstRespondedAt ? "first_response" : "resolution" });
    const body = L(`${t.number}: müraciətin SLA müddəti keçdi — eskalasiya səviyyəsi ${t.escalationLevel}`, `${t.number}: нарушен SLA обращения — уровень эскалации ${t.escalationLevel}`, `${t.number}: ticket SLA breached — escalation level ${t.escalationLevel}`);
    for (const m of managers()) notify(m.id, "TICKET_SLA_BREACH", "notif.ticketSlaBreach", body, `/tickets/${t.id}`);
    if (t.assigneeId) notify(t.assigneeId, "TICKET_SLA_BREACH", "notif.ticketSlaBreach", body, `/tickets/${t.id}`);
  }
}

/* ------------------------------------------------------------------ */
/* Yaradılma, mesaj, status                                             */
/* ------------------------------------------------------------------ */

export interface OpenTicketInput {
  categoryId: string;
  subject: string;
  body: string;
  channel: TicketRec["channel"];
  priority?: TicketPriorityCode;
  requester: { id: string | null; name: string; phone: string | null; email: string | null; companyId: string | null };
  author?: { id: string | null; name: string; role: string; fromCustomer: boolean };
  assigneeId?: string | null;
  related?: TicketRec["related"];
  attachments?: { name: string; url: string | null }[];
  tags?: string[];
  createdAt?: string;
}

export function openTicket(input: OpenTicketInput, ctx: Ctx | null): TicketRec {
  const cat = db.ticketCategories.find((c) => c.id === input.categoryId)!;
  const createdAt = input.createdAt ?? nowIso();
  // Aktiv abunəsi olan müştərinin müraciəti bir pillə yüksək prioritetlə açılır (PRD §42 — prioritet dəstək)
  const premium = input.requester.id ? db.subscriptions.some((s) => s.subscriberId === input.requester.id && s.status === "ACTIVE" && /PREMIUM/.test(db.plans.find((p) => p.id === s.planId)?.code ?? "")) : false;
  let priority = input.priority ?? cat.defaultPriority;
  if (!input.priority && premium && PRIORITY_RANK[priority] < PRIORITY_RANK.HIGH) priority = (Object.keys(PRIORITY_RANK) as TicketPriorityCode[])[PRIORITY_RANK[priority] + 1]!;
  const author = input.author ?? { id: input.requester.id, name: input.requester.name, role: "CUSTOMER", fromCustomer: true };
  const t: TicketRec = {
    id: newId("ticket"),
    number: nextNumber("TK", 2000),
    subject: input.subject,
    status: input.assigneeId ? "OPEN" : "NEW",
    priority,
    channel: input.channel,
    categoryId: cat.id,
    requesterId: input.requester.id,
    requesterName: input.requester.name,
    requesterPhone: input.requester.phone,
    requesterEmail: input.requester.email,
    companyId: input.requester.companyId,
    assigneeId: input.assigneeId ?? null,
    related: input.related ?? null,
    serviceOrderId: null,
    tags: [...(input.tags ?? []), ...(premium ? ["premium"] : [])],
    messages: [{ id: newId("tm"), kind: "PUBLIC", authorId: author.id, authorName: author.name, authorRole: author.role, fromCustomer: author.fromCustomer, body: input.body, attachments: input.attachments ?? [], createdAt }],
    history: [],
    firstResponseDueAt: createdAt,
    resolutionDueAt: createdAt,
    firstRespondedAt: null,
    slaPausedAt: null,
    escalationLevel: 0,
    breachNotified: false,
    csat: null,
    resolvedAt: null,
    closedAt: null,
    createdAt,
    updatedAt: createdAt,
  };
  initDueDates(t);
  t.history.push({ id: newId("th"), at: createdAt, actorName: ctx?.user ? fullName(ctx.user) : input.requester.name, actorRole: ctx?.role ?? "GUEST", action: "created", toStatus: t.status });
  db.tickets.unshift(t);
  notifyRequester(t, "TICKET_CREATED", "notif.ticketCreated", L(`${t.number} nömrəli müraciətiniz qəbul edildi`, `Обращение ${t.number} принято`, `Your request ${t.number} was received`));
  const body = L(`${t.number}: ${t.subject}`);
  if (t.assigneeId) notify(t.assigneeId, "TICKET_ASSIGNED", "notif.ticketAssigned", body, `/tickets/${t.id}`);
  else for (const agent of supportAgents().filter((u) => u.roles.some((r) => QUEUE_ROLES[cat.queue].includes(r)))) notify(agent.id, "TICKET_CREATED", "notif.ticketNew", body, `/tickets/${t.id}`);
  return t;
}

function applyStatus(t: TicketRec, ctx: Ctx | null, to: TicketRec["status"], extra: { reason?: string; note?: string; action?: string } = {}) {
  const from = t.status;
  if (from === to) return;
  const wasPaused = PAUSED_STATUSES.includes(from);
  const willPause = PAUSED_STATUSES.includes(to);
  if (wasPaused && !willPause) resumeSla(t);
  if (!wasPaused && willPause) t.slaPausedAt = nowIso();
  if (to === "RESOLVED") {
    if (t.slaPausedAt) resumeSla(t);
    t.resolvedAt = nowIso();
  }
  if (to === "CLOSED") {
    t.closedAt = nowIso();
    t.resolvedAt ??= t.closedAt;
    t.slaPausedAt = null;
  }
  if ((from === "RESOLVED" || from === "CLOSED") && OPEN_STATUSES.includes(to)) {
    // Yenidən açılanda həll müddətinin yarısı qədər əlavə vaxt verilir
    const s = slaTargets(t.categoryId, t.priority);
    t.resolutionDueAt = new Date(Math.max(ms(t.resolutionDueAt), ms(nowIso()) + (s.resolutionMinutes / 2) * MINUTE)).toISOString();
    t.resolvedAt = null;
    t.closedAt = null;
    t.breachNotified = false;
  }
  t.status = to;
  t.updatedAt = nowIso();
  history(t, ctx, extra.action ?? "status_changed", { from, to, reason: extra.reason, note: extra.note });
}

export function addMessage(t: TicketRec, ctx: Ctx, input: { body: string; internal: boolean; attachments?: { name: string; url: string | null }[]; statusAfter?: "OPEN" | "PENDING_CUSTOMER" | "RESOLVED"; asCustomer: boolean }) {
  const u = ctx.user!;
  const msg: TicketMessageRec = {
    id: newId("tm"),
    kind: input.internal ? "INTERNAL" : "PUBLIC",
    authorId: u.id,
    authorName: fullName(u),
    authorRole: input.asCustomer ? ctx.role : agentRole(u),
    fromCustomer: input.asCustomer,
    body: input.body,
    attachments: input.attachments ?? [],
    createdAt: nowIso(),
  };
  t.messages.push(msg);
  t.updatedAt = msg.createdAt;
  if (input.internal) {
    history(t, ctx, "internal_note");
    return msg;
  }
  if (input.asCustomer) {
    if (t.status === "PENDING_CUSTOMER" || t.status === "RESOLVED") applyStatus(t, ctx, "OPEN", { action: t.status === "RESOLVED" ? "reopened" : "customer_replied" });
    if (t.assigneeId) notify(t.assigneeId, "TICKET_REPLY", "notif.ticketCustomerReply", L(`${t.number}: müştəri cavab yazdı`, `${t.number}: ответ клиента`, `${t.number}: customer replied`), `/tickets/${t.id}`);
    return msg;
  }
  if (!t.firstRespondedAt) t.firstRespondedAt = msg.createdAt;
  if (!t.assigneeId) {
    t.assigneeId = u.id;
    history(t, ctx, "assigned", { note: fullName(u) });
  }
  const target = input.statusAfter ?? (t.status === "NEW" ? "OPEN" : t.status === "ON_HOLD" ? "ON_HOLD" : "OPEN");
  applyStatus(t, ctx, target, { action: target === "RESOLVED" ? "resolved" : "replied" });
  notifyRequester(t, "TICKET_REPLY", "notif.ticketReply", L(`${t.number}: dəstək xidmətindən yeni cavab`, `${t.number}: новый ответ поддержки`, `${t.number}: new reply from support`));
  return msg;
}

export function assign(t: TicketRec, ctx: Ctx | null, assigneeId: string | null) {
  const prev = t.assigneeId;
  t.assigneeId = assigneeId;
  t.updatedAt = nowIso();
  if (t.status === "NEW" && assigneeId) applyStatus(t, ctx, "OPEN", { action: "assigned" });
  history(t, ctx, "assigned", { note: assigneeId ? fullName(userById(assigneeId)) : "—" });
  if (assigneeId && assigneeId !== prev && assigneeId !== ctx?.user?.id) notify(assigneeId, "TICKET_ASSIGNED", "notif.ticketAssigned", L(`${t.number}: ${t.subject}`), `/tickets/${t.id}`);
}

/** Növbəyə uyğun, ən az açıq müraciəti olan əməkdaşı seçir. */
export function pickAgent(t: TicketRec): UserRec | null {
  const roles = QUEUE_ROLES[categoryOf(t).queue];
  const pool = supportAgents().filter((u) => u.roles.some((r) => roles.includes(r)));
  if (!pool.length) return null;
  const load = (id: string) => db.tickets.filter((x) => x.assigneeId === id && OPEN_STATUSES.includes(x.status)).length;
  return [...pool].sort((a, b) => load(a.id) - load(b.id) || a.firstName.localeCompare(b.firstName))[0]!;
}

/* ------------------------------------------------------------------ */
/* Əməliyyatlar                                                         */
/* ------------------------------------------------------------------ */

export function agentActions(t: TicketRec, ctx: Ctx): AvailableAction[] {
  if (!can(ctx, "tickets:edit")) return [];
  const me = ctx.user?.id;
  const canAssign = can(ctx, "tickets:assign");
  const out: AvailableAction[] = [];
  if (OPEN_STATUSES.includes(t.status)) {
    if (t.assigneeId !== me) out.push({ code: "take", variant: t.assigneeId ? "secondary" : "primary" });
    if (canAssign) out.push({ code: "assign", variant: "secondary" });
    if (canAssign && !t.assigneeId) out.push({ code: "auto_assign", variant: "secondary" });
    out.push({ code: "change_priority", variant: "secondary" });
    if (t.status === "ON_HOLD") out.push({ code: "resume", variant: "primary" });
    else out.push({ code: "hold", variant: "secondary", requiresReason: true, reasonCategory: "ON_HOLD" });
    out.push({ code: "resolve", variant: t.assigneeId === me ? "primary" : "secondary" });
    if (!t.serviceOrderId && t.requesterId && can(ctx, "service_orders:create")) out.push({ code: "create_service_order", variant: "secondary" });
    if (t.escalationLevel < 3) out.push({ code: "escalate", variant: "secondary" });
    out.push({ code: "close", variant: "destructive", requiresReason: true, reasonCategory: "CANCELLED" });
  } else if (t.status === "RESOLVED") {
    out.push({ code: "reopen", variant: "secondary" }, { code: "close", variant: "primary" });
  } else if (t.status === "CLOSED" && can(ctx, "tickets:approve")) {
    out.push({ code: "reopen", variant: "secondary" });
  }
  return out;
}

export function customerActions(t: TicketRec): AvailableAction[] {
  const out: AvailableAction[] = [];
  if (OPEN_STATUSES.includes(t.status)) out.push({ code: "mark_resolved", variant: "secondary" });
  if (t.status === "RESOLVED" && t.resolvedAt && Date.now() - ms(t.resolvedAt) < REOPEN_DAYS * 86400_000) out.push({ code: "reopen", variant: "secondary" });
  if ((t.status === "RESOLVED" || t.status === "CLOSED") && !t.csat) out.push({ code: "rate", variant: "primary" });
  return out;
}

export function runAgentAction(t: TicketRec, ctx: Ctx, req: { code: string; assigneeId?: string; priority?: TicketPriorityCode; reasonCode?: string; note?: string }) {
  const code = req.code;
  const reason = req.reasonCode ? tr(db.reasonCodes.find((r) => r.code === req.reasonCode)?.label, ctx.locale) || req.reasonCode : undefined;
  switch (code) {
    case "take":
      return assign(t, ctx, ctx.user!.id);
    case "assign":
      return assign(t, ctx, req.assigneeId ?? null);
    case "auto_assign": {
      const agent = pickAgent(t);
      return assign(t, ctx, agent?.id ?? null);
    }
    case "change_priority": {
      const prev = t.priority;
      if (!req.priority || prev === req.priority) return;
      const before = slaTargets(t.categoryId, prev);
      const after = slaTargets(t.categoryId, req.priority);
      // Prioritet dəyişəndə son tarixlər yeni hədəflə yenidən hesablanır
      t.resolutionDueAt = addMinutes(t.resolutionDueAt, after.resolutionMinutes - before.resolutionMinutes);
      if (!t.firstRespondedAt) t.firstResponseDueAt = addMinutes(t.firstResponseDueAt, after.firstResponseMinutes - before.firstResponseMinutes);
      t.priority = req.priority;
      t.breachNotified = false;
      t.updatedAt = nowIso();
      return history(t, ctx, "priority_changed", { from: prev, to: req.priority, note: req.note });
    }
    case "hold":
      return applyStatus(t, ctx, "ON_HOLD", { reason, note: req.note, action: "held" });
    case "resume":
      return applyStatus(t, ctx, "OPEN", { action: "resumed" });
    case "resolve":
      applyStatus(t, ctx, "RESOLVED", { note: req.note, action: "resolved" });
      return notifyRequester(t, "TICKET_RESOLVED", "notif.ticketResolved", L(`${t.number} həll olundu — xidməti qiymətləndirin`, `${t.number} решено — оцените работу`, `${t.number} resolved — rate our support`));
    case "reopen":
      return applyStatus(t, ctx, "OPEN", { note: req.note, action: "reopened" });
    case "close":
      return applyStatus(t, ctx, "CLOSED", { reason, note: req.note, action: "closed" });
    case "escalate": {
      t.escalationLevel = Math.min(3, t.escalationLevel + 1);
      if (PRIORITY_RANK[t.priority] < PRIORITY_RANK.HIGH) runAgentAction(t, ctx, { code: "change_priority", priority: "HIGH" });
      history(t, ctx, "escalated", { note: req.note });
      for (const m of managers()) notify(m.id, "TICKET_ESCALATED", "notif.ticketEscalated", L(`${t.number}: eskalasiya (səviyyə ${t.escalationLevel})`, `${t.number}: эскалация (уровень ${t.escalationLevel})`, `${t.number}: escalated (level ${t.escalationLevel})`), `/tickets/${t.id}`);
      return;
    }
  }
}

export function runCustomerAction(t: TicketRec, ctx: Ctx, req: { code: string; rating?: number; comment?: string }) {
  switch (req.code) {
    case "mark_resolved":
      return applyStatus(t, ctx, "RESOLVED", { action: "customer_resolved" });
    case "reopen":
      applyStatus(t, ctx, "OPEN", { note: req.comment, action: "reopened" });
      if (req.comment) addMessage(t, ctx, { body: req.comment, internal: false, asCustomer: true });
      if (t.assigneeId) notify(t.assigneeId, "TICKET_REPLY", "notif.ticketReopened", L(`${t.number}: müştəri müraciəti yenidən açdı`, `${t.number}: клиент переоткрыл обращение`, `${t.number}: customer reopened the ticket`), `/tickets/${t.id}`);
      return;
    case "rate":
      t.csat = { rating: req.rating!, comment: req.comment?.trim() || null, at: nowIso() };
      t.updatedAt = t.csat.at;
      history(t, ctx, "rated", { note: `${req.rating}/5` });
      if (req.rating! <= 2) for (const m of managers()) notify(m.id, "LOW_RATING", "notif.lowRating", L(`${t.number}: dəstək xidmətinə ${req.rating} ulduz`, `${t.number}: оценка поддержки ${req.rating}`, `${t.number}: support rated ${req.rating} stars`), `/tickets/${t.id}`);
      return;
  }
}

/* ------------------------------------------------------------------ */
/* DTO                                                                  */
/* ------------------------------------------------------------------ */

export function relatedView(t: TicketRec, audience: "agent" | "customer") {
  const r = t.related;
  if (!r) return null;
  const base = portalBase(t.requesterId) ?? "/account/support";
  const portal = base.replace(/\/support$/, "");
  switch (r.type) {
    case "SERVICE_ORDER": {
      const o = db.serviceOrders.find((x) => x.id === r.id);
      return o ? { type: r.type, id: o.id, number: o.number, link: audience === "agent" ? `/service-orders/${o.id}` : `${portal}/services/${o.id}` } : null;
    }
    case "SALES_ORDER": {
      const o = db.salesOrders.find((x) => x.id === r.id);
      return o ? { type: r.type, id: o.id, number: o.number, link: audience === "agent" ? `/sales-orders/${o.id}` : portal.startsWith("/account") || portal.startsWith("/partner") || portal.startsWith("/wholesale") ? `${portal}/orders/${o.id}` : null } : null;
    }
    case "WARRANTY": {
      const w = db.warranties.find((x) => x.id === r.id);
      return w ? { type: r.type, id: w.id, number: w.number, link: audience === "agent" ? "/warranty-claims" : "/account/warranties" } : null;
    }
    case "PAYMENT": {
      const p = db.payments.find((x) => x.id === r.id);
      return p ? { type: r.type, id: p.id, number: p.number, link: audience === "agent" ? "/payments" : "/account/payments" } : null;
    }
    case "RETURN": {
      const x = db.returns.find((y) => y.id === r.id);
      return x ? { type: r.type, id: x.id, number: x.number, link: audience === "agent" ? "/returns" : "/account/returns" } : null;
    }
  }
}

export function ticketSummaryDto(t: TicketRec) {
  const cat = categoryOf(t);
  const assignee = userById(t.assigneeId);
  const lastPublic = [...t.messages].reverse().find((m) => m.kind === "PUBLIC");
  const company = t.companyId ? db.b2bAccounts.find((c) => c.id === t.companyId) : null;
  return {
    id: t.id,
    number: t.number,
    subject: t.subject,
    status: t.status,
    priority: t.priority,
    channel: t.channel,
    queue: cat.queue,
    categoryId: cat.id,
    categoryName: cat.name,
    requesterName: t.requesterName,
    requesterId: t.requesterId,
    companyName: company?.legalName ?? null,
    assigneeId: t.assigneeId,
    assigneeName: assignee ? fullName(assignee) : null,
    relatedNumber: relatedView(t, "agent")?.number ?? null,
    tags: t.tags,
    sla: slaView(t),
    messageCount: t.messages.filter((m) => m.kind === "PUBLIC").length,
    lastMessageAt: t.messages[t.messages.length - 1]?.createdAt ?? t.createdAt,
    awaitingAgent: OPEN_STATUSES.includes(t.status) && t.status !== "PENDING_CUSTOMER" && !!lastPublic?.fromCustomer,
    csatRating: t.csat?.rating ?? null,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

export function ticketDto(t: TicketRec, ctx: Ctx, audience: "agent" | "customer") {
  const order = t.serviceOrderId ? db.serviceOrders.find((o) => o.id === t.serviceOrderId) : null;
  const portal = (portalBase(t.requesterId) ?? "/account/support").replace(/\/support$/, "");
  const messages = t.messages
    .filter((m) => audience === "agent" || m.kind !== "INTERNAL")
    .map((m) => ({
      id: m.id,
      kind: m.kind,
      // Müştəriyə əməkdaşın yalnız adı göstərilir
      authorName: audience === "customer" && !m.fromCustomer && m.kind === "PUBLIC" ? `${m.authorName.split(" ")[0]} · ${tr(L("Dəstək xidməti", "Служба поддержки", "Support team"), ctx.locale)}` : m.authorName,
      authorRole: m.authorRole,
      fromCustomer: m.fromCustomer,
      body: m.body,
      attachments: m.attachments,
      createdAt: m.createdAt,
    }));
  return {
    ...ticketSummaryDto(t),
    requesterPhone: audience === "agent" ? t.requesterPhone : null,
    requesterEmail: audience === "agent" ? t.requesterEmail : null,
    related: relatedView(t, audience),
    serviceOrderId: order?.id ?? null,
    serviceOrderNumber: order?.number ?? null,
    serviceOrderLink: order ? (audience === "agent" ? `/service-orders/${order.id}` : `${portal}/services/${order.id}`) : null,
    messages,
    history: audience === "agent" ? t.history : [],
    csat: t.csat,
    resolvedAt: t.resolvedAt,
    closedAt: t.closedAt,
    canReply: audience === "agent" ? can(ctx, "tickets:edit") && t.status !== "CLOSED" : t.status !== "CLOSED",
    availableActions: audience === "agent" ? agentActions(t, ctx) : customerActions(t),
  };
}
