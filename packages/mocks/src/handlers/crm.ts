import * as S from "@sp/schemas";
import { normalizeAzPhone } from "@sp/utils";
import { db, nextNumber } from "../db/state";
import type { CrmActivityRec, CrmLeadRec, CrmLeadStageCode } from "../db/types";
import { fullName } from "../engine/context";
import { audit } from "../engine/effects";
import { find, list, parse, requirePerm, route, validationError } from "../lib/http";
import { money } from "../lib/money";
import { newId } from "../lib/rng";
import { nowIso } from "../lib/time";

/** CRM satış qıfı: lead, fəaliyyət, zəng jurnalı və çevrilmə axınları (§A3). */

const STAGES: { code: CrmLeadStageCode; probability: number }[] = [
  { code: "NEW", probability: 10 }, { code: "CONTACTED", probability: 25 }, { code: "QUALIFIED", probability: 45 },
  { code: "PROPOSAL", probability: 60 }, { code: "NEGOTIATION", probability: 80 }, { code: "WON", probability: 100 }, { code: "LOST", probability: 0 },
];

function ownerName(id: string) {
  return fullName(db.users.find((u) => u.id === id));
}

function leadDto(lead: CrmLeadRec) {
  return { ...lead, estimatedValue: money(lead.estimatedValueCents), ownerName: ownerName(lead.ownerId), activitiesCount: db.crmActivities.filter((a) => a.leadId === lead.id).length };
}

function activityDto(a: CrmActivityRec) {
  return { ...a, actorName: ownerName(a.actorId) };
}

function addActivity(lead: CrmLeadRec, actorId: string, input: Omit<CrmActivityRec, "id" | "leadId" | "actorId" | "createdAt">) {
  const activity: CrmActivityRec = { ...input, id: newId("crm-act"), leadId: lead.id, actorId, createdAt: nowIso() };
  db.crmActivities.unshift(activity);
  lead.updatedAt = nowIso();
  return activity;
}

function overview() {
  const open = db.crmLeads.filter((l) => !["WON", "LOST"].includes(l.stage));
  const closed = db.crmLeads.filter((l) => ["WON", "LOST"].includes(l.stage));
  const won = db.crmLeads.filter((l) => l.stage === "WON");
  return {
    total: db.crmLeads.length,
    open: open.length,
    overdue: open.filter((l) => l.nextActionAt && l.nextActionAt < nowIso()).length,
    pipelineValue: money(open.reduce((sum, l) => sum + l.estimatedValueCents, 0)),
    weightedValue: money(open.reduce((sum, l) => sum + Math.round(l.estimatedValueCents * l.probability / 100), 0)),
    wonValue: money(won.reduce((sum, l) => sum + l.estimatedValueCents, 0)),
    conversionRate: closed.length ? Math.round(won.length / closed.length * 1000) / 10 : 0,
    bySource: [...new Set(db.crmLeads.map((l) => l.source))].map((source) => ({ source, count: db.crmLeads.filter((l) => l.source === source).length })),
  };
}

export const crmHandlers = [
  route.get("/admin/crm", ({ ctx }) => {
    requirePerm(ctx, "crm:view");
    return {
      stats: overview(),
      stages: STAGES.map((stage) => ({ ...stage, leads: db.crmLeads.filter((l) => l.stage === stage.code).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map(leadDto) })),
      owners: db.users.filter((u) => u.roles.some((r) => ["SALES_EMPLOYEE", "MANAGER", "ADMIN", "SUPER_ADMIN"].includes(r))).map((u) => ({ id: u.id, name: fullName(u) })),
    };
  }),

  route.get("/admin/crm/leads", ({ ctx, url }) => {
    requirePerm(ctx, "crm:view");
    return list(url, db.crmLeads.map(leadDto), { search: (l) => `${l.number} ${l.name} ${l.companyName ?? ""} ${l.phone} ${l.email ?? ""}`, defaultSort: "-updatedAt", dateField: "createdAt" });
  }),

  route.get("/admin/crm/leads/:id", ({ ctx, params }) => {
    requirePerm(ctx, "crm:view");
    const lead = find(db.crmLeads, params.id);
    return { ...leadDto(lead), activities: db.crmActivities.filter((a) => a.leadId === lead.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(activityDto) };
  }),

  route.post("/admin/crm/leads", async ({ ctx, body }) => {
    requirePerm(ctx, "crm:create", "crm:edit");
    const data = parse(S.CreateCrmLeadRequest, await body());
    if (!db.users.some((u) => u.id === data.ownerId)) throw validationError({ ownerId: ["validation.required"] });
    const lead: CrmLeadRec = {
      id: newId("lead"), number: nextNumber("LD", 1007), stage: "NEW", source: data.source, name: data.name,
      companyName: data.companyName ?? null, phone: data.phone, email: data.email ?? null,
      estimatedValueCents: Math.round(data.estimatedValue * 100), probability: 10, ownerId: data.ownerId,
      nextActionAt: data.nextActionAt ?? null, note: data.note ?? null, lostReason: null, customerId: null, quoteNumber: null,
      createdAt: nowIso(), updatedAt: nowIso(),
    };
    db.crmLeads.unshift(lead);
    addActivity(lead, ctx.user!.id, { type: "NOTE", subject: "Lead yaradıldı", note: lead.note, outcome: null, durationSeconds: null, scheduledAt: lead.nextActionAt, completedAt: nowIso() });
    audit(ctx, "create", "crm", lead.id, lead.number);
    return leadDto(lead);
  }),

  route.patch("/admin/crm/leads/:id", async ({ ctx, params, body }) => {
    requirePerm(ctx, "crm:edit");
    const lead = find(db.crmLeads, params.id);
    const data = parse(S.UpdateCrmLeadRequest, await body());
    if (data.stage === "LOST" && !data.lostReason?.trim() && !lead.lostReason) throw validationError({ lostReason: ["validation.required"] });
    if (data.ownerId && !db.users.some((u) => u.id === data.ownerId)) throw validationError({ ownerId: ["validation.required"] });
    const beforeStage = lead.stage;
    if (data.name !== undefined) lead.name = data.name;
    if (data.companyName !== undefined) lead.companyName = data.companyName ?? null;
    if (data.phone !== undefined) lead.phone = data.phone;
    if (data.email !== undefined) lead.email = data.email ?? null;
    if (data.source !== undefined) lead.source = data.source;
    if (data.estimatedValue !== undefined) lead.estimatedValueCents = Math.round(data.estimatedValue * 100);
    if (data.ownerId !== undefined) lead.ownerId = data.ownerId;
    if (data.nextActionAt !== undefined) lead.nextActionAt = data.nextActionAt ?? null;
    if (data.note !== undefined) lead.note = data.note ?? null;
    if (data.lostReason !== undefined) lead.lostReason = data.lostReason ?? null;
    if (data.stage !== undefined) lead.stage = data.stage;
    lead.probability = data.probability ?? (data.stage ? STAGES.find((s) => s.code === data.stage)!.probability : lead.probability);
    lead.updatedAt = nowIso();
    if (beforeStage !== lead.stage) addActivity(lead, ctx.user!.id, { type: "STAGE_CHANGE", subject: `${beforeStage} → ${lead.stage}`, note: lead.lostReason, outcome: null, durationSeconds: null, scheduledAt: null, completedAt: nowIso() });
    audit(ctx, "edit", "crm", lead.id, lead.number, beforeStage !== lead.stage ? [{ field: "stage", from: beforeStage, to: lead.stage }] : []);
    return leadDto(lead);
  }),

  route.post("/admin/crm/leads/:id/activities", async ({ ctx, params, body }) => {
    requirePerm(ctx, "crm:edit");
    const lead = find(db.crmLeads, params.id);
    const data = parse(S.CreateCrmActivityRequest, await body());
    const activity = addActivity(lead, ctx.user!.id, { type: data.type, subject: data.subject, note: data.note ?? null, outcome: null, durationSeconds: null, scheduledAt: data.scheduledAt ?? null, completedAt: data.completed ? nowIso() : null });
    audit(ctx, "activity", "crm", lead.id, lead.number);
    return activityDto(activity);
  }),

  route.post("/admin/crm/leads/:id/calls", async ({ ctx, params, body }) => {
    requirePerm(ctx, "crm:edit");
    const lead = find(db.crmLeads, params.id);
    const data = parse(S.CreateCrmCallRequest, await body());
    const activity = addActivity(lead, ctx.user!.id, { type: "CALL", subject: `Zəng: ${lead.phone}`, note: data.note ?? null, outcome: data.outcome, durationSeconds: data.durationSeconds, scheduledAt: null, completedAt: nowIso() });
    if (lead.stage === "NEW") { lead.stage = "CONTACTED"; lead.probability = 25; }
    audit(ctx, "call", "crm", lead.id, lead.number, [], data.outcome);
    return { activity: activityDto(activity), adapter: { provider: "MOCK_TELEPHONY", callId: `call_${activity.id}`, status: "COMPLETED" } };
  }),

  route.post("/admin/crm/leads/:id/convert", async ({ ctx, params, body }) => {
    requirePerm(ctx, "crm:edit");
    const lead = find(db.crmLeads, params.id);
    const { target } = parse(S.ConvertCrmLeadRequest, await body());
    if (target === "CUSTOMER") {
      let customer = db.users.find((u) => (lead.email && u.email?.toLowerCase() === lead.email.toLowerCase()) || (u.phone && normalizeAzPhone(u.phone) === normalizeAzPhone(lead.phone)));
      if (!customer) {
        const { createCustomer } = await import("./auth");
        const names = lead.name.trim().split(/\s+/);
        customer = createCustomer({ firstName: names[0]!, lastName: names.slice(1).join(" ") || "—", phone: lead.phone, email: lead.email, password: "", locale: "az", marketingConsent: false });
        customer.status = "PENDING_VERIFICATION";
      }
      lead.customerId = customer.id;
      lead.stage = "WON";
      lead.probability = 100;
      addActivity(lead, ctx.user!.id, { type: "CONVERSION", subject: "Müştəriyə çevrildi", note: fullName(customer), outcome: null, durationSeconds: null, scheduledAt: null, completedAt: nowIso() });
    } else {
      if (!lead.quoteNumber) lead.quoteNumber = nextNumber("KT-CRM", 902);
      lead.stage = "PROPOSAL";
      lead.probability = 60;
      addActivity(lead, ctx.user!.id, { type: "CONVERSION", subject: "Kommersiya təklifi yaradıldı", note: lead.quoteNumber, outcome: null, durationSeconds: null, scheduledAt: null, completedAt: nowIso() });
    }
    lead.updatedAt = nowIso();
    audit(ctx, "convert", "crm", lead.id, lead.number, [], target);
    return leadDto(lead);
  }),
];
