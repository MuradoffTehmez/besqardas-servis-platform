import type { Role, ServiceOrderActionRequest } from "@sp/types";
import { db } from "../db/state";
import type { ServiceOrderRec } from "../db/types";
import { permissionsFor } from "../data/rbac";
import type { Ctx } from "../engine/context";
import { planForUser } from "../engine/context";
import { applyAction, availableActions, isDone, syncStageFromTask } from "../engine/workflow";
import { atTime } from "../lib/time";
import { idFor } from "../lib/rng";

/** Seed simulyatoru: sifarişləri real workflow əməliyyatları ilə istənilən vəziyyətə qədər irəlilədir. */

export function ctxFor(userKeyOrId: string, role?: Role): Ctx {
  const user = db.users.find((u) => u.id === userKeyOrId || u.id === idFor(`user:${userKeyOrId}`))!;
  const r = role ?? user.roles[0]!;
  const { codes, scopes } = permissionsFor(r);
  const company = user.companyId ? db.b2bAccounts.find((c) => c.id === user.companyId) ?? null : null;
  return {
    locale: "az",
    session: null,
    user,
    role: r,
    permissions: codes,
    scopes,
    plan: planForUser(user, r, company),
    entitlements: {},
    priceType: "RETAIL",
    company,
    technician: db.technicians.find((t) => t.userId === user.id) ?? null,
    guestKey: null,
  };
}

export interface SimOptions {
  technician?: string; // user key
  courier?: string;
  estimate?: ServiceOrderActionRequest["lines"];
  decision?: "APPROVE" | "PARTIAL" | "REJECT";
  declineOptional?: boolean;
  rejectReason?: string;
  paymentMethod?: "CASH" | "CARD_POS" | "CARD_ONLINE" | "BANK_TRANSFER";
  close?: boolean;
  skipOptional?: boolean;
  stop?: (order: ServiceOrderRec) => boolean;
  start: string; // ISO
  stepMinutes?: number;
  maxSteps?: number;
}

const photo = [{ name: "foto-1.jpg" }, { name: "foto-2.jpg" }];

export function simulate(order: ServiceOrderRec, opts: SimOptions) {
  const operator = ctxFor("operator");
  const dispatcher = ctxFor("dispatcher");
  const warehouse = ctxFor("warehouse");
  const accountant = ctxFor("accountant");
  const tech = opts.technician ? ctxFor(opts.technician, "TECHNICIAN") : null;
  const customer = ctxFor(order.customerId, db.users.find((u) => u.id === order.customerId)!.roles[0]!);
  const courierId = idFor(`user:${opts.courier ?? "orxan"}`);
  let clock = new Date(opts.start).getTime();
  const step = (opts.stepMinutes ?? 45) * 60_000;
  const at = <T>(fn: () => T) => {
    clock += step;
    return atTime(new Date(Math.min(clock, Date.now() - 60_000)).toISOString(), fn);
  };
  const run = (ctx: Ctx, req: ServiceOrderActionRequest) => at(() => applyAction(order, req, ctx));
  const has = (ctx: Ctx, code: string, stageId?: string) => availableActions(order, ctx).some((a) => a.code === code && (!stageId || a.stageId === stageId));

  for (let i = 0; i < (opts.maxSteps ?? 80); i++) {
    if (opts.stop?.(order)) return;
    if (["CANCELLED", "REJECTED", "CLOSED"].includes(order.status)) return;
    if (order.status === "NEW" && has(operator, "confirm")) { run(operator, { action: "confirm" }); continue; }
    if (order.status === "COMPLETED") {
      const pay = availableActions(order, accountant).find((a) => a.code === "record_payment");
      if (pay) { run(accountant, { action: "record_payment", payment: { method: opts.paymentMethod ?? "CARD_POS", amount: String((pay.payload as { dueAmount: string }).dueAmount) } }); continue; }
      if (opts.close && has(accountant, "close")) { run(accountant, { action: "close" }); }
      return;
    }
    const stage = order.stages.find((s) => !isDone(s) && s.status !== "PENDING");
    if (!stage) return;
    const sid = stage.id;
    if (!stage.mandatory && (opts.skipOptional ?? true) && stage.status === "READY") { run(dispatcher, { action: "skip", stageId: sid }); continue; }
    switch (stage.executor) {
      case "OPERATOR":
        run(operator, { action: "complete_stage", stageId: sid, photos: photo, signed: true, checklist: stage.checklist.map((c) => ({ ...c, done: true })) });
        continue;
      case "WAREHOUSE_EMPLOYEE":
        if (stage.status === "WAITING_FOR_PART") run(warehouse, { action: "part_arrived", stageId: sid });
        else run(warehouse, { action: "complete_stage", stageId: sid });
        continue;
      case "DISPATCHER":
      case "TECHNICIAN": {
        if (stage.status === "READY") { run(dispatcher, { action: "assign", stageId: sid, technicianId: idFor(`user:${opts.technician}`) }); continue; }
        if (!tech) return;
        if (stage.status === "ASSIGNED") { run(tech, { action: "accept", stageId: sid }); continue; }
        if (stage.status === "ACCEPTED") { run(tech, { action: has(tech, "start_travel", sid) ? "start_travel" : "start", stageId: sid }); continue; }
        if (stage.status === "ON_THE_WAY") { run(tech, { action: "arrive", stageId: sid }); continue; }
        if (stage.status === "ARRIVED") { run(tech, { action: "start", stageId: sid }); continue; }
        if (stage.status === "WAITING_FOR_PART") { run(warehouse, { action: "part_arrived", stageId: sid }); continue; }
        if (stage.status === "IN_PROGRESS") {
          if (has(tech, "submit_estimate", sid)) { run(tech, { action: "submit_estimate", stageId: sid, lines: opts.estimate ?? [], photos: photo, note: "Diaqnostika aparıldı" }); continue; }
          run(tech, { action: "complete_stage", stageId: sid, photos: photo, signed: true, note: "İş tamamlandı", checklist: stage.checklist.map((c) => ({ ...c, done: true })) });
          continue;
        }
        return;
      }
      case "CUSTOMER": {
        if (stage.status !== "WAITING_FOR_APPROVAL") return;
        const decision = opts.decision ?? "APPROVE";
        if (decision === "REJECT") { run(customer, { action: "reject_estimate", stageId: sid, reasonCode: opts.rejectReason ?? "TOO_EXPENSIVE" }); continue; }
        if (decision === "PARTIAL") {
          const est = order.estimates[order.estimates.length - 1]!;
          run(customer, { action: "partial_approve", stageId: sid, declinedLineIds: est.lines.filter((l) => l.optional).map((l) => l.id) });
          continue;
        }
        run(customer, { action: "approve_estimate", stageId: sid });
        continue;
      }
      case "COURIER": {
        if (stage.type === "HANDOVER") {
          at(() => applyAction(order, { action: "complete_stage", stageId: sid, signed: true }, ctxFor("admin")));
          continue;
        }
        const task = db.logisticsTasks.find((t) => t.id === stage.logisticsTaskId);
        if (stage.status === "READY") { run(dispatcher, { action: "assign_courier", stageId: sid, technicianId: courierId }); continue; }
        if (!task) return;
        const next = { ASSIGNED: "ON_THE_WAY", ON_THE_WAY: "PICKED_UP", PICKED_UP: "IN_TRANSIT", IN_TRANSIT: "DELIVERED" } as const;
        const to = next[task.status as keyof typeof next];
        if (!to) return;
        at(() => {
          task.status = to;
          if (to === "DELIVERED") { task.signed = true; task.photos = 2; }
          task.history.unshift({ at: new Date(clock).toISOString(), status: to, actor: "Orxan Məmmədli", note: null });
          syncStageFromTask(task, ctxFor(opts.courier ?? "orxan", "COURIER"));
        });
        continue;
      }
      default:
        return;
    }
  }
}
