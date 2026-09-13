import { db } from "../db/state";
import type { LogisticsTaskRec } from "../db/types";
import { fullName, type Ctx } from "../engine/context";
import { syncStageFromTask } from "../engine/workflow";
import { notify, recordPayment } from "../engine/effects";
import { list, notFound, route, requireAuth, validationError } from "../lib/http";
import { apiError } from "../lib/errors";
import { L } from "../lib/i18n";
import { bakuAt, nowIso } from "../lib/time";
import { logisticsTaskDto } from "../dto";

/** Kuryer interfeysi (PRD §21.6): yalnız özünə təyin olunmuş tapşırıqlar və status yeniləmə. */

const FLOW: Record<string, { from: LogisticsTaskRec["status"][]; to: LogisticsTaskRec["status"] }> = {
  start: { from: ["ASSIGNED"], to: "ON_THE_WAY" },
  picked_up: { from: ["ON_THE_WAY"], to: "PICKED_UP" },
  in_transit: { from: ["PICKED_UP"], to: "IN_TRANSIT" },
  delivered: { from: ["IN_TRANSIT", "ON_THE_WAY"], to: "DELIVERED" },
  fail: { from: ["ON_THE_WAY", "PICKED_UP", "IN_TRANSIT"], to: "FAILED" },
};

function myTasks(ctx: Ctx) {
  const u = requireAuth(ctx);
  if (ctx.role !== "COURIER" && ctx.role !== "TECHNICIAN") throw apiError(403, "FORBIDDEN", "error.forbidden");
  return db.logisticsTasks.filter((t) => t.assigneeId === u.id);
}

/** Status keçidi — kuryer və ya icazəli daxili istifadəçi tərəfindən. */
export function transitionTask(task: LogisticsTaskRec, ctx: Ctx, input: { action: string; photos?: number; signed?: boolean; reasonCode?: string; note?: string; cashCollected?: string }) {
  const rule = FLOW[input.action];
  if (!rule || !rule.from.includes(task.status)) throw apiError(409, "ACTION_NOT_ALLOWED", "error.actionNotAllowed");
  if (input.action === "fail" && !input.reasonCode) throw validationError({ reasonCode: ["validation.required"] });
  const needsProof = (input.action === "picked_up" && task.type === "PICKUP") || input.action === "delivered";
  if (needsProof && !input.signed) throw validationError({ signed: ["validation.signatureRequired"] });
  if (needsProof && !(input.photos ?? task.photos)) throw validationError({ photos: ["validation.photoRequired"] });
  if (input.action === "delivered" && task.collectCashCents && Math.round(Number(input.cashCollected ?? 0) * 100) !== task.collectCashCents) throw validationError({ cashCollected: ["validation.cashMismatch"] });
  task.status = rule.to;
  if (input.photos) task.photos += input.photos;
  if (input.signed) task.signed = true;
  const reason = input.reasonCode ? db.reasonCodes.find((r) => r.code === input.reasonCode)?.label.az ?? input.reasonCode : null;
  if (input.action === "fail") task.failReason = reason;
  task.history.unshift({ at: nowIso(), status: rule.to, actor: fullName(ctx.user), note: input.note ?? reason });
  if (input.action === "delivered" && task.collectCashCents && task.relatedOrderId) {
    const so = db.salesOrders.find((s) => s.id === task.relatedOrderId);
    if (so) {
      recordPayment({ payerId: so.customerId, payerName: fullName(db.users.find((u) => u.id === so.customerId)), orderType: "SALES", orderId: so.id, orderNumber: so.number, method: "CASH", amountCents: task.collectCashCents, collectedById: ctx.user!.id });
    }
  }
  if (task.relatedOrderKind === "SALES" && task.relatedOrderId) {
    const so = db.salesOrders.find((s) => s.id === task.relatedOrderId);
    if (so && input.action === "delivered") { so.status = "DELIVERED"; so.history.unshift({ at: nowIso(), id: `h-${Date.now()}`, actorName: fullName(ctx.user), action: "delivered", toStatus: "DELIVERED" }); }
    if (so && input.action === "start") notify(so.customerId, "COURIER_ON_WAY", "notif.technicianOnWay", L(`${so.number}: kuryer yoldadır`, `${so.number}: курьер в пути`, `${so.number}: courier is on the way`), `/account/orders/${so.id}`, "SMS");
  }
  syncStageFromTask(task, ctx);
  if (input.action === "fail") notify(db.users.find((u) => u.roles.includes("DISPATCHER"))?.id, "TASK_FAILED", "notif.newTask", L(`${task.number}: tapşırıq uğursuz oldu — ${reason}`), "/logistics");
}

export const courierHandlers = [
  route.get("/courier/tasks", ({ ctx, url }) => {
    const tasks = myTasks(ctx);
    const view = url.searchParams.get("view") ?? "today";
    const endOfToday = bakuAt(1, 0);
    const rows = tasks.filter((t) =>
      view === "done" ? ["DELIVERED", "FAILED", "CANCELLED"].includes(t.status) : view === "upcoming" ? !["DELIVERED", "FAILED", "CANCELLED"].includes(t.status) && t.windowStart >= endOfToday : !["DELIVERED", "FAILED", "CANCELLED"].includes(t.status) && t.windowStart < endOfToday,
    );
    const u2 = new URL(url);
    u2.searchParams.delete("view");
    return { ...list(u2, rows.map((t) => logisticsTaskDto(t, ctx)), { defaultSort: view === "done" ? "-windowStart" : "windowStart", defaultPageSize: 50 }), counts: { today: tasks.filter((t) => !["DELIVERED", "FAILED", "CANCELLED"].includes(t.status) && t.windowStart < endOfToday).length, upcoming: tasks.filter((t) => !["DELIVERED", "FAILED", "CANCELLED"].includes(t.status) && t.windowStart >= endOfToday).length, done: tasks.filter((t) => ["DELIVERED", "FAILED", "CANCELLED"].includes(t.status)).length } };
  }),

  route.get("/courier/tasks/:id", ({ ctx, params }) => {
    const task = myTasks(ctx).find((t) => t.id === params.id);
    if (!task) notFound();
    return logisticsTaskDto(task, ctx);
  }),

  route.post("/courier/tasks/:id/status", async ({ ctx, params, body }) => {
    const task = myTasks(ctx).find((t) => t.id === params.id);
    if (!task) notFound();
    transitionTask(task, ctx, await body());
    return logisticsTaskDto(task, ctx);
  }),

  route.get("/courier/summary", ({ ctx }) => {
    const u = requireAuth(ctx);
    const desk = db.cashDesks.find((d) => d.holderId === u.id);
    const tasks = myTasks(ctx);
    return { delivered: tasks.filter((t) => t.status === "DELIVERED").length, open: tasks.filter((t) => !["DELIVERED", "FAILED", "CANCELLED"].includes(t.status)).length, cashBalance: desk ? { amount: (desk.balanceCents / 100).toFixed(2), currency: "AZN" } : null };
  }),
];
