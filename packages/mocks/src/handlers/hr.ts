import * as S from "@sp/schemas";
import { db, nextNumber } from "../db/state";
import type { HrEmployeeRec, HrLeaveRec } from "../db/types";
import { can, fullName, isInternal, userById, type Ctx } from "../engine/context";
import { audit, notify } from "../engine/effects";
import {
  applyLeaveToAttendance, attendanceOn, calculateRun, createRun, currentPeriod, dayKey, employeeDto, employeeOf, ensureAttendance, fillAttendance,
  isWorkDay, leaveBalance, leaveDto, leaveOn, monthDays, parseDay, payrollActions, payslipDto, positionDto, runDto, runTotals, settingsDto,
  shiftHours, shiftOf, timesheetRow, workingDaysBetween,
} from "../engine/hr";
import { crud, required } from "../lib/crud";
import { apiError } from "../lib/errors";
import { find, list, notFound, parse, requireAuth, requirePerm, route, validationError } from "../lib/http";
import { L } from "../lib/i18n";
import { money } from "../lib/money";
import { newId } from "../lib/rng";
import { nowIso } from "../lib/time";

/** HRM API: əməkdaşlar, ştat cədvəli, növbələr, davamiyyət, məzuniyyət və əmək haqqı. */

const DAY_MS = 86400_000;

function canApproveLeave(ctx: Ctx) {
  return can(ctx, "hr:approve") || can(ctx, "hr:edit");
}

function requireEmployee(id: string) {
  const e = db.hrEmployees.find((x) => x.id === id);
  if (!e) notFound();
  return e;
}

/** Cari istifadəçinin əməkdaş kartı (self-service). */
function myEmployee(ctx: Ctx) {
  const u = requireAuth(ctx);
  return employeeOf(u.id);
}

function validateEmployee(body: Record<string, unknown>, existing: HrEmployeeRec | null) {
  const errors = existing ? {} : (required(body, "fullName", "department", "hiredAt", "salary") ?? {});
  const salary = body.salary === undefined ? null : Number(body.salary);
  if (salary !== null && (!Number.isFinite(salary) || salary <= 0)) (errors as Record<string, string[]>).salary = ["validation.positive"];
  if (body.positionId && !db.hrPositions.some((p) => p.id === body.positionId)) (errors as Record<string, string[]>).positionId = ["validation.invalid"];
  if (body.managerId && !db.hrEmployees.some((e) => e.id === body.managerId)) (errors as Record<string, string[]>).managerId = ["validation.invalid"];
  if (body.userId && !userById(String(body.userId))) (errors as Record<string, string[]>).userId = ["validation.invalid"];
  if (body.userId && db.hrEmployees.some((e) => e.userId === body.userId && e.id !== existing?.id)) (errors as Record<string, string[]>).userId = ["validation.alreadyExists"];
  return Object.keys(errors).length ? (errors as Record<string, string[]>) : null;
}

function dashboard(ctx: Ctx) {
  const period = currentPeriod();
  fillAttendance(period);
  const today = dayKey(new Date(nowIso()));
  const active = db.hrEmployees.filter((e) => e.status !== "TERMINATED");
  const planned = db.hrPositions.filter((p) => p.active).reduce((s, p) => s + p.plannedCount, 0);
  const todayRows = active.map((e) => attendanceOn(e.id, today)).filter(Boolean);
  const year = new Date(nowIso()).getUTCFullYear();
  const hired = db.hrEmployees.filter((e) => e.hiredAt.startsWith(String(year))).length;
  const left = db.hrEmployees.filter((e) => e.terminatedAt?.startsWith(String(year))).length;
  const departments = [...new Set(active.map((e) => e.department))];
  const run = db.hrPayrollRuns.find((r) => r.period === period) ?? null;
  const totals = run ? runTotals(run) : { grossCents: 0, netCents: 0, taxesCents: 0, employerCostCents: 0 };
  return {
    headcount: active.length,
    plannedHeadcount: planned,
    vacancies: Math.max(0, planned - active.length),
    probation: active.filter((e) => e.status === "PROBATION").length,
    onLeaveToday: active.filter((e) => leaveOn(e.id, today)).length,
    pendingLeaves: db.hrLeaves.filter((l) => l.status === "PENDING").length,
    attendanceToday: {
      present: todayRows.filter((a) => a!.status === "PRESENT").length,
      late: todayRows.filter((a) => a!.status === "LATE").length,
      absent: todayRows.filter((a) => a!.status === "ABSENT").length,
      leave: todayRows.filter((a) => a!.status === "LEAVE" || a!.status === "SICK").length,
      planned: active.filter((e) => isWorkDay(e, today)).length,
    },
    byDepartment: departments.map((department) => ({
      department,
      headcount: active.filter((e) => e.department === department).length,
      planned: db.hrPositions.filter((p) => p.department === department && p.active).reduce((s, p) => s + p.plannedCount, 0),
      salaryTotal: money(active.filter((e) => e.department === department).reduce((s, e) => s + e.salaryCents, 0)),
    })),
    hiredThisYear: hired,
    leftThisYear: left,
    turnoverPercent: active.length ? Math.round((left / (active.length + left)) * 1000) / 10 : 0,
    averageTenureMonths: active.length ? Math.round(active.reduce((s, e) => s + Math.max(0, (new Date(nowIso()).getTime() - new Date(e.hiredAt).getTime()) / (30 * DAY_MS)), 0) / active.length) : 0,
    payroll: { period, status: run?.status ?? null, gross: money(totals.grossCents), net: money(totals.netCents), taxes: money(totals.taxesCents), employerCost: money(totals.employerCostCents) },
    upcomingLeaves: db.hrLeaves
      .filter((l) => l.status === "APPROVED" && l.from >= today)
      .sort((a, b) => a.from.localeCompare(b.from))
      .slice(0, 6)
      .map((l) => ({ fullName: db.hrEmployees.find((e) => e.id === l.employeeId)?.fullName ?? "—", type: l.type, from: l.from, to: l.to })),
    canApprove: canApproveLeave(ctx),
  };
}

export const hrHandlers = [
  /* ---------------- İcmal ---------------- */
  route.get("/admin/hr/dashboard", ({ ctx }) => {
    requirePerm(ctx, "hr:view");
    return dashboard(ctx);
  }),

  /* ---------------- Əməkdaşlar ---------------- */
  route.get("/admin/hr/employees", ({ ctx, url }) => {
    requirePerm(ctx, "hr:view");
    const rows = db.hrEmployees.map(employeeDto);
    return list(url, rows, { defaultSort: "fullName", search: (e) => `${e.fullName} ${e.personnelNumber} ${e.department}`, dateField: "hiredAt", defaultPageSize: 25 });
  }),

  route.get("/admin/hr/employees/:id", ({ ctx, params }) => {
    requirePerm(ctx, "hr:view");
    const e = requireEmployee(params.id);
    const period = currentPeriod();
    fillAttendance(period);
    const payslips = db.hrPayrollRuns
      .filter((r) => r.lines.some((l) => l.employeeId === e.id))
      .slice(0, 12)
      .map((r) => ({ runId: r.id, period: r.period, status: r.status, ...payslipDto(r.lines.find((l) => l.employeeId === e.id)!) }));
    return {
      ...employeeDto(e),
      balance: leaveBalance(e),
      timesheet: timesheetRow(e, period),
      shift: shiftOf(e),
      workDays: e.workDays,
      leaves: db.hrLeaves.filter((l) => l.employeeId === e.id).slice(0, 10).map((l) => leaveDto(l, ctx, canApproveLeave(ctx))),
      payslips: can(ctx, "payroll:view") ? payslips : [],
      attendance: db.hrAttendance.filter((a) => a.employeeId === e.id && a.date.startsWith(period)).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 31),
    };
  }),

  route.post("/admin/hr/employees", async ({ ctx, body }) => {
    requirePerm(ctx, "hr:create", "hr:edit");
    const data = await body<Record<string, unknown>>();
    const errors = validateEmployee(data, null);
    if (errors) throw validationError(errors);
    const hiredAt = String(data.hiredAt);
    const probationMonths = Number(data.probationMonths ?? 3);
    const probationUntil = probationMonths ? new Date(new Date(hiredAt).getTime() + probationMonths * 30 * DAY_MS).toISOString() : null;
    const e: HrEmployeeRec = {
      id: newId("emp"),
      userId: (data.userId as string) || null,
      personnelNumber: nextNumber("EMP", 1000),
      fullName: String(data.fullName).trim(),
      positionId: (data.positionId as string) || null,
      department: String(data.department).trim(),
      branchId: (data.branchId as string) || null,
      managerId: (data.managerId as string) || null,
      contractType: (data.contractType as HrEmployeeRec["contractType"]) ?? "PERMANENT",
      contractNumber: String(data.contractNumber ?? `ƏM-${nextNumber("CT", 500).split("-")[1]}`),
      status: probationUntil ? "PROBATION" : "ACTIVE",
      hiredAt,
      probationUntil,
      terminatedAt: null,
      terminationReason: null,
      salaryCents: Math.round(Number(data.salary) * 100),
      monthlyHours: Number(data.monthlyHours ?? 167),
      annualLeaveDays: Number(data.annualLeaveDays ?? 21),
      phone: (data.phone as string) || null,
      email: (data.email as string) || null,
      iban: (data.iban as string) || null,
      workDays: Array.isArray(data.workDays) ? (data.workDays as number[]) : [1, 2, 3, 4, 5],
      shiftId: (data.shiftId as string) || db.hrShifts.find((s) => s.kind === "DAY")?.id || null,
    };
    db.hrEmployees.push(e);
    audit(ctx, "create", "hr", e.id, e.fullName);
    return employeeDto(e);
  }),

  route.patch("/admin/hr/employees/:id", async ({ ctx, params, body }) => {
    requirePerm(ctx, "hr:edit");
    const e = requireEmployee(params.id);
    const data = await body<Record<string, unknown>>();
    const errors = validateEmployee(data, e);
    if (errors) throw validationError(errors);
    const changes: { field: string; from: string | null; to: string | null }[] = [];
    const set = <K extends keyof HrEmployeeRec>(key: K, value: HrEmployeeRec[K]) => {
      if (value === undefined || JSON.stringify(e[key]) === JSON.stringify(value)) return;
      changes.push({ field: String(key), from: String(e[key] ?? ""), to: String(value ?? "") });
      e[key] = value;
    };
    if (data.fullName !== undefined) set("fullName", String(data.fullName).trim() as never);
    if (data.department !== undefined) set("department", String(data.department).trim() as never);
    if (data.positionId !== undefined) set("positionId", ((data.positionId as string) || null) as never);
    if (data.branchId !== undefined) set("branchId", ((data.branchId as string) || null) as never);
    if (data.managerId !== undefined) set("managerId", ((data.managerId as string) || null) as never);
    if (data.contractType !== undefined) set("contractType", data.contractType as never);
    if (data.contractNumber !== undefined) set("contractNumber", String(data.contractNumber) as never);
    if (data.salary !== undefined) set("salaryCents", Math.round(Number(data.salary) * 100) as never);
    if (data.monthlyHours !== undefined) set("monthlyHours", Number(data.monthlyHours) as never);
    if (data.annualLeaveDays !== undefined) set("annualLeaveDays", Number(data.annualLeaveDays) as never);
    if (data.phone !== undefined) set("phone", ((data.phone as string) || null) as never);
    if (data.email !== undefined) set("email", ((data.email as string) || null) as never);
    if (data.iban !== undefined) set("iban", ((data.iban as string) || null) as never);
    if (data.status !== undefined && data.status !== "TERMINATED") set("status", data.status as never);
    if (Array.isArray(data.workDays)) set("workDays", data.workDays as never);
    if (data.shiftId !== undefined) set("shiftId", ((data.shiftId as string) || null) as never);
    if (changes.length) audit(ctx, "edit", "hr", e.id, e.fullName, changes);
    return employeeDto(e);
  }),

  route.post("/admin/hr/employees/:id/terminate", async ({ ctx, params, body }) => {
    requirePerm(ctx, "hr:edit");
    const e = requireEmployee(params.id);
    if (e.status === "TERMINATED") throw apiError(409, "ACTION_NOT_ALLOWED", "error.actionNotAllowed");
    const { reason, date } = await body<{ reason?: string; date?: string }>();
    if (!reason?.trim()) throw validationError({ reason: ["validation.required"] });
    e.status = "TERMINATED";
    e.terminatedAt = date ? new Date(date).toISOString() : nowIso();
    e.terminationReason = reason.trim();
    // Gələcək məzuniyyət müraciətləri ləğv olunur
    for (const l of db.hrLeaves.filter((x) => x.employeeId === e.id && x.status === "PENDING")) l.status = "CANCELLED";
    audit(ctx, "terminate", "hr", e.id, e.fullName, [], reason);
    return employeeDto(e);
  }),

  /* ---------------- Ştat cədvəli və növbələr ---------------- */
  ...crud("/admin/hr/positions", {
    perm: "hr",
    get: () => db.hrPositions,
    set: (x) => (db.hrPositions = x),
    defaultSort: "department",
    label: (p) => p.code,
    toDto: (p) => positionDto(p),
    validate: (b, rec) => {
      const errors = rec ? null : required(b, "code", "titleI18n", "department");
      if (errors) return errors;
      if (b.plannedCount !== undefined && Number(b.plannedCount) < 0) return { plannedCount: ["validation.positive"] };
      if (!rec && db.hrPositions.some((p) => p.code === String(b.code).toUpperCase())) return { code: ["validation.alreadyExists"] };
      return null;
    },
    create: (b) => ({
      id: newId("pos"),
      code: String(b.code).toUpperCase(),
      title: b.title as never,
      department: String(b.department),
      branchId: (b.branchId as string) || null,
      plannedCount: Number(b.plannedCount ?? 1),
      salaryFromCents: Math.round(Number(b.salaryFrom ?? 0) * 100),
      salaryToCents: Math.round(Number(b.salaryTo ?? 0) * 100),
      active: b.active !== false,
    }),
    beforeDelete: (p) => {
      if (db.hrEmployees.some((e) => e.positionId === p.id && e.status !== "TERMINATED")) throw apiError(409, "IN_USE", "error.actionNotAllowed");
    },
  }),

  ...crud("/admin/hr/shifts", {
    perm: "hr",
    get: () => db.hrShifts,
    set: (x) => (db.hrShifts = x),
    defaultSort: "code",
    label: (s) => s.code,
    toDto: (s) => ({ ...s, hours: shiftHours(s), employees: db.hrEmployees.filter((e) => e.shiftId === s.id && e.status !== "TERMINATED").length }),
    validate: (b, rec) => (rec ? null : required(b, "code", "nameI18n", "startTime", "endTime")),
    create: (b) => ({
      id: newId("shift"),
      code: String(b.code).toUpperCase(),
      name: b.name as never,
      kind: (b.kind as never) ?? "DAY",
      startTime: String(b.startTime),
      endTime: String(b.endTime),
      breakMinutes: Number(b.breakMinutes ?? 60),
      active: b.active !== false,
    }),
  }),

  /* ---------------- Cədvəl və davamiyyət ---------------- */
  route.get("/admin/hr/schedule", ({ ctx, url }) => {
    requirePerm(ctx, "hr:view");
    const period = url.searchParams.get("period") || currentPeriod();
    const department = url.searchParams.get("department");
    const days = monthDays(period);
    const rows = db.hrEmployees
      .filter((e) => e.status !== "TERMINATED" && (!department || e.department === department))
      .map((e) => {
        const shift = shiftOf(e);
        const cells = days.map((date) => {
          const leave = leaveOn(e.id, date);
          const work = isWorkDay(e, date) && date >= e.hiredAt.slice(0, 10);
          return {
            date,
            shiftId: work && !leave ? shift?.id ?? null : null,
            shiftCode: work && !leave ? shift?.code ?? null : null,
            kind: work && !leave ? shift?.kind ?? null : null,
            hours: work && !leave ? shiftHours(shift) : 0,
            dayOff: !work,
            leaveType: leave?.type ?? null,
          };
        });
        return {
          employeeId: e.id,
          fullName: e.fullName,
          positionTitle: employeeDto(e).positionTitle,
          department: e.department,
          cells,
          plannedHours: Math.round(cells.reduce((s, c) => s + c.hours, 0) * 10) / 10,
        };
      });
    return { period, days, rows, departments: [...new Set(db.hrEmployees.filter((e) => e.status !== "TERMINATED").map((e) => e.department))] };
  }),

  route.get("/admin/hr/timesheet", ({ ctx, url }) => {
    requirePerm(ctx, "hr:view");
    const period = url.searchParams.get("period") || currentPeriod();
    fillAttendance(period);
    const rows = db.hrEmployees.filter((e) => e.status !== "TERMINATED").map((e) => timesheetRow(e, period));
    return { period, ...list(url, rows, { defaultSort: "fullName", search: (r) => `${r.fullName} ${r.department}`, defaultPageSize: 50 }) };
  }),

  route.get("/admin/hr/attendance", ({ ctx, url }) => {
    requirePerm(ctx, "hr:view");
    const period = url.searchParams.get("period") || currentPeriod();
    fillAttendance(period);
    const rows = db.hrAttendance
      .filter((a) => a.date.startsWith(period))
      .map((a) => {
        const e = db.hrEmployees.find((x) => x.id === a.employeeId);
        return {
          id: a.id,
          employeeId: a.employeeId,
          fullName: e?.fullName ?? "—",
          department: e?.department ?? "—",
          date: a.date,
          status: a.status,
          checkIn: a.checkIn,
          checkOut: a.checkOut,
          workedHours: Math.round((a.workedMinutes / 60) * 10) / 10,
          plannedHours: Math.round((a.plannedMinutes / 60) * 10) / 10,
          lateMinutes: a.lateMinutes,
          overtimeHours: Math.round((a.overtimeMinutes / 60) * 10) / 10,
          note: a.note,
        };
      });
    return list(url, rows, { defaultSort: "-date", search: (r) => `${r.fullName} ${r.department}`, dateField: "date", defaultPageSize: 50 });
  }),

  /** Davamiyyət düzəlişi — tabel təsdiqlənməmişdən əvvəl (§A4). */
  route.patch("/admin/hr/attendance/:id", async ({ ctx, params, body }) => {
    requirePerm(ctx, "hr:edit");
    const rec = find(db.hrAttendance, params.id);
    const data = await body<{ status?: string; checkIn?: string; checkOut?: string; note?: string }>();
    const employee = db.hrEmployees.find((e) => e.id === rec.employeeId);
    if (db.hrPayrollRuns.some((r) => r.period === rec.date.slice(0, 7) && ["APPROVED", "PAID"].includes(r.status))) {
      throw apiError(409, "PAYROLL_LOCKED", "error.actionNotAllowed");
    }
    if (data.status) {
      const allowed = ["PRESENT", "LATE", "ABSENT", "LEAVE", "SICK", "BUSINESS_TRIP", "WEEKEND", "HOLIDAY"];
      if (!allowed.includes(data.status)) throw validationError({ status: ["validation.invalid"] });
      rec.status = data.status as never;
      if (["ABSENT", "LEAVE", "SICK", "WEEKEND", "HOLIDAY"].includes(data.status)) {
        rec.workedMinutes = 0;
        rec.lateMinutes = 0;
        rec.overtimeMinutes = 0;
      } else if (rec.workedMinutes === 0) {
        rec.workedMinutes = rec.plannedMinutes || shiftHours(shiftOf(employee!)) * 60;
      }
    }
    if (data.checkIn !== undefined) rec.checkIn = data.checkIn || null;
    if (data.checkOut !== undefined) rec.checkOut = data.checkOut || null;
    if (data.note !== undefined) rec.note = data.note || null;
    audit(ctx, "edit", "hr", rec.id, `${employee?.fullName ?? "—"} · ${rec.date}`);
    return { ok: true };
  }),

  /* ---------------- Məzuniyyət ---------------- */
  route.get("/admin/hr/leaves", ({ ctx, url }) => {
    requirePerm(ctx, "hr:view");
    const rows = db.hrLeaves.map((l) => leaveDto(l, ctx, canApproveLeave(ctx)));
    return list(url, rows, { defaultSort: "-createdAt", search: (l) => `${l.fullName} ${l.number}`, dateField: "from", defaultPageSize: 25 });
  }),

  route.get("/admin/hr/leave-balances", ({ ctx, url }) => {
    requirePerm(ctx, "hr:view");
    const rows = db.hrEmployees.filter((e) => e.status !== "TERMINATED").map((e) => leaveBalance(e));
    return list(url, rows, { defaultSort: "-remainingDays", search: (r) => r.fullName, defaultPageSize: 50 });
  }),

  route.post("/admin/hr/leaves", async ({ ctx, body }) => {
    const u = requireAuth(ctx);
    const data = parse(S.LeaveRequestInput, await body());
    const mine = employeeOf(u.id);
    const employee = data.employeeId ? requireEmployee(data.employeeId) : mine;
    if (!employee) throw apiError(403, "NO_EMPLOYEE_CARD", "error.forbidden");
    if (employee.id !== mine?.id) requirePerm(ctx, "hr:edit");
    if (data.from > data.to) throw validationError({ to: ["validation.invalid"] });
    const days = workingDaysBetween(employee, data.from, data.to);
    if (!days) throw validationError({ from: ["validation.noWorkingDays"] });
    const overlap = db.hrLeaves.some((l) => l.employeeId === employee.id && ["PENDING", "APPROVED"].includes(l.status) && l.from <= data.to && l.to >= data.from);
    if (overlap) throw validationError({ from: ["validation.leaveOverlap"] });
    if (data.type === "ANNUAL") {
      const balance = leaveBalance(employee);
      if (days > balance.remainingDays) throw validationError({ type: ["validation.leaveBalance"] });
    }
    const leave: HrLeaveRec = {
      id: newId("leave"),
      number: nextNumber("MZ", 400),
      employeeId: employee.id,
      type: data.type,
      status: "PENDING",
      from: data.from,
      to: data.to,
      days,
      reason: data.reason?.trim() || null,
      attachmentName: data.attachmentName ?? null,
      approverId: null,
      decidedAt: null,
      decisionNote: null,
      createdAt: nowIso(),
    };
    db.hrLeaves.unshift(leave);
    for (const m of db.users.filter((x) => x.roles.includes("MANAGER") && x.status === "ACTIVE")) {
      notify(m.id, "HR_LEAVE_REQUEST", "notif.hrLeaveRequest", L(`${employee.fullName}: ${days} günlük müraciət`, `${employee.fullName}: заявка на ${days} дн.`, `${employee.fullName}: ${days}-day request`), "/hr/leaves");
    }
    audit(ctx, "create", "hr", leave.id, `${leave.number} · ${employee.fullName}`);
    return leaveDto(leave, ctx, canApproveLeave(ctx));
  }),

  route.post("/admin/hr/leaves/:id/actions", async ({ ctx, params, body }) => {
    const u = requireAuth(ctx);
    const leave = find(db.hrLeaves, params.id);
    const data = await body<{ code: string; note?: string }>();
    const approver = canApproveLeave(ctx);
    const actions = leaveDto(leave, ctx, approver).availableActions;
    if (!actions.some((a) => a.code === data.code)) throw apiError(409, "ACTION_NOT_ALLOWED", "error.actionNotAllowed");
    const employee = db.hrEmployees.find((e) => e.id === leave.employeeId);
    if (data.code === "approve") {
      leave.status = "APPROVED";
      leave.approverId = u.id;
      leave.decidedAt = nowIso();
      leave.decisionNote = data.note ?? null;
      applyLeaveToAttendance(leave);
      if (employee?.userId) notify(employee.userId, "HR_LEAVE_DECISION", "notif.hrLeaveApproved", L(`${leave.number} məzuniyyət müraciətiniz təsdiqləndi`, `Заявка ${leave.number} одобрена`, `Leave request ${leave.number} approved`), "/hr/my");
    } else if (data.code === "reject") {
      if (!data.note?.trim()) throw validationError({ note: ["validation.required"] });
      leave.status = "REJECTED";
      leave.approverId = u.id;
      leave.decidedAt = nowIso();
      leave.decisionNote = data.note.trim();
      if (employee?.userId) notify(employee.userId, "HR_LEAVE_DECISION", "notif.hrLeaveRejected", L(`${leave.number} müraciətiniz rədd edildi: ${data.note}`, `Заявка ${leave.number} отклонена: ${data.note}`, `Leave request ${leave.number} rejected: ${data.note}`), "/hr/my");
    } else if (data.code === "cancel") {
      leave.status = "CANCELLED";
      leave.decidedAt = nowIso();
      // Təsdiqlənmiş məzuniyyət ləğv olunanda davamiyyət bərpa olunur
      for (let d = parseDay(leave.from).getTime(); d <= parseDay(leave.to).getTime(); d += DAY_MS) {
        const rec = attendanceOn(leave.employeeId, dayKey(new Date(d)));
        if (rec && ["LEAVE", "SICK"].includes(rec.status)) {
          db.hrAttendance = db.hrAttendance.filter((a) => a.id !== rec.id);
          if (employee && rec.date <= dayKey(new Date(nowIso()))) ensureAttendance(employee, rec.date);
        }
      }
    }
    audit(ctx, data.code, "hr", leave.id, leave.number, [], data.note);
    return leaveDto(leave, ctx, approver);
  }),

  /* ---------------- Əmək haqqı ---------------- */
  route.get("/admin/hr/payroll", ({ ctx, url }) => {
    requirePerm(ctx, "payroll:view");
    const rows = db.hrPayrollRuns.map((r) => runDto(r, can(ctx, "payroll:edit"), can(ctx, "payroll:approve")));
    return list(url, rows, { defaultSort: "-period", search: (r) => `${r.number} ${r.period}`, defaultPageSize: 25 });
  }),

  route.get("/admin/hr/payroll/:id", ({ ctx, params }) => {
    requirePerm(ctx, "payroll:view");
    const run = find(db.hrPayrollRuns, params.id);
    return { ...runDto(run, can(ctx, "payroll:edit"), can(ctx, "payroll:approve")), lines: run.lines.map(payslipDto), settings: settingsDto() };
  }),

  route.post("/admin/hr/payroll", async ({ ctx, body }) => {
    requirePerm(ctx, "payroll:create", "payroll:edit");
    const { period } = await body<{ period?: string }>();
    const target = period || currentPeriod();
    if (!/^\d{4}-\d{2}$/.test(target)) throw validationError({ period: ["validation.invalid"] });
    if (target > currentPeriod()) throw validationError({ period: ["validation.futurePeriod"] });
    if (db.hrPayrollRuns.some((r) => r.period === target)) throw validationError({ period: ["validation.alreadyExists"] });
    const run = createRun(target, ctx);
    audit(ctx, "create", "payroll", run.id, `${run.number} · ${run.period}`);
    return { ...runDto(run, can(ctx, "payroll:edit"), can(ctx, "payroll:approve")), lines: run.lines.map(payslipDto), settings: settingsDto() };
  }),

  route.post("/admin/hr/payroll/:id/actions", async ({ ctx, params, body }) => {
    requirePerm(ctx, "payroll:view");
    const run = find(db.hrPayrollRuns, params.id);
    const { code, note } = await body<{ code: string; note?: string }>();
    const actions = payrollActions(run, can(ctx, "payroll:edit"), can(ctx, "payroll:approve"));
    if (!actions.some((a) => a.code === code)) throw apiError(409, "ACTION_NOT_ALLOWED", "error.actionNotAllowed");
    if (code === "recalculate") calculateRun(run);
    else if (code === "approve") {
      run.status = "APPROVED";
      run.approvedBy = fullName(ctx.user);
      run.approvedAt = nowIso();
    } else if (code === "pay") {
      run.status = "PAID";
      run.paidAt = nowIso();
      for (const line of run.lines) {
        const employee = db.hrEmployees.find((e) => e.id === line.employeeId);
        if (employee?.userId) {
          notify(employee.userId, "HR_PAYSLIP", "notif.hrPayslip", L(`${run.period} dövrü üzrə əmək haqqı ödənildi: ${money(line.netCents).amount} ₼`, `Зарплата за ${run.period} выплачена: ${money(line.netCents).amount} ₼`, `Salary for ${run.period} paid: ${money(line.netCents).amount} ₼`), "/hr/my");
        }
      }
    } else if (code === "delete") {
      db.hrPayrollRuns = db.hrPayrollRuns.filter((r) => r.id !== run.id);
      audit(ctx, "delete", "payroll", run.id, run.number, [], note);
      return { deleted: true };
    }
    audit(ctx, code, "payroll", run.id, `${run.number} · ${run.period}`, [], note);
    return { ...runDto(run, can(ctx, "payroll:edit"), can(ctx, "payroll:approve")), lines: run.lines.map(payslipDto), settings: settingsDto() };
  }),

  route.get("/admin/hr/settings", ({ ctx }) => {
    requirePerm(ctx, "payroll:view", "hr:view");
    return settingsDto();
  }),

  route.put("/admin/hr/settings", async ({ ctx, body }) => {
    requirePerm(ctx, "payroll:edit");
    const data = await body<Record<string, unknown>>();
    const s = db.hrPayrollSettings;
    const errors: Record<string, string[]> = {};
    const rate = (key: string, max = 100) => {
      if (data[key] === undefined) return undefined;
      const v = Number(data[key]);
      if (!Number.isFinite(v) || v < 0 || v > max) errors[key] = ["validation.invalid"];
      return v;
    };
    const cents = (key: string) => {
      if (data[key] === undefined) return undefined;
      const v = Math.round(Number(data[key]) * 100);
      if (!Number.isFinite(v) || v < 0) errors[key] = ["validation.invalid"];
      return v;
    };
    const next: Partial<typeof s> = {
      incomeTaxThresholdCents: cents("incomeTaxThreshold"),
      incomeTaxRateBelow: rate("incomeTaxRateBelow"),
      incomeTaxRateAbove: rate("incomeTaxRateAbove"),
      socialThresholdCents: cents("socialThreshold"),
      socialEmployeeRateBelow: rate("socialEmployeeRateBelow"),
      socialEmployeeRateAbove: rate("socialEmployeeRateAbove"),
      socialEmployerRateBelow: rate("socialEmployerRateBelow"),
      socialEmployerRateAbove: rate("socialEmployerRateAbove"),
      unemploymentEmployeeRate: rate("unemploymentEmployeeRate", 10),
      unemploymentEmployerRate: rate("unemploymentEmployerRate", 10),
      healthThresholdCents: cents("healthThreshold"),
      healthEmployeeRateBelow: rate("healthEmployeeRateBelow"),
      healthEmployeeRateAbove: rate("healthEmployeeRateAbove"),
      healthEmployerRateBelow: rate("healthEmployerRateBelow"),
      healthEmployerRateAbove: rate("healthEmployerRateAbove"),
      overtimeMultiplier: rate("overtimeMultiplier", 5),
      nightShiftBonusPercent: rate("nightShiftBonusPercent"),
      standardMonthlyHours: rate("standardMonthlyHours", 320),
    };
    if (Object.keys(errors).length) throw validationError(errors);
    const changes: { field: string; from: string | null; to: string | null }[] = [];
    for (const [key, value] of Object.entries(next)) {
      if (value === undefined) continue;
      const before = (s as unknown as Record<string, number>)[key];
      if (before === value) continue;
      changes.push({ field: key, from: String(before), to: String(value) });
      (s as unknown as Record<string, number>)[key] = value as number;
    }
    if (changes.length) audit(ctx, "edit", "payroll", "settings", "Əmək haqqı dərəcələri", changes);
    return settingsDto();
  }),

  /* ---------------- Self-service ---------------- */
  route.get("/admin/hr/me", ({ ctx }) => {
    const u = requireAuth(ctx);
    if (!isInternal(ctx) && ctx.role !== "TECHNICIAN") throw apiError(403, "FORBIDDEN", "error.forbidden");
    const employee = myEmployee(ctx);
    if (!employee) return { employee: null, balance: null, requests: [], schedule: [], timesheet: null, payslips: [] };
    const period = currentPeriod();
    fillAttendance(period);
    const shift = shiftOf(employee);
    return {
      employee: employeeDto(employee),
      balance: leaveBalance(employee),
      requests: db.hrLeaves.filter((l) => l.employeeId === employee.id).map((l) => leaveDto(l, ctx, canApproveLeave(ctx))),
      schedule: monthDays(period).map((date) => {
        const leave = leaveOn(employee.id, date);
        const work = isWorkDay(employee, date);
        return { date, shiftId: work && !leave ? shift?.id ?? null : null, shiftCode: work && !leave ? shift?.code ?? null : null, kind: work && !leave ? shift?.kind ?? null : null, hours: work && !leave ? shiftHours(shift) : 0, dayOff: !work, leaveType: leave?.type ?? null };
      }),
      timesheet: timesheetRow(employee, period),
      payslips: db.hrPayrollRuns
        .filter((r) => ["APPROVED", "PAID"].includes(r.status) && r.lines.some((l) => l.employeeId === employee.id))
        .slice(0, 12)
        .map((r) => ({ runId: r.id, period: r.period, status: r.status, ...payslipDto(r.lines.find((l) => l.employeeId === employee.id)!) })),
      userId: u.id,
    };
  }),
];
