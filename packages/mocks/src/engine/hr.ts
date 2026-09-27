import { db, nextNumber } from "../db/state";
import type { HrAttendanceRec, HrEmployeeRec, HrLeaveRec, HrPayrollLineRec, HrPayrollRunRec, HrShiftRec } from "../db/types";
import { branchName } from "../dto";
import { L } from "../lib/i18n";
import { money } from "../lib/money";
import { newId } from "../lib/rng";
import { nowIso } from "../lib/time";
import { fullName, userById, type Ctx } from "./context";

/**
 * HRM mühərriki: iş cədvəli və davamiyyət, məzuniyyət balansı, əmək haqqının hesablanması.
 * Vergi və sığorta dərəcələri konfiqurasiyadadır (`db.hrPayrollSettings`) — qanun dəyişəndə admin yeniləyir.
 */

const DAY_MS = 86400_000;

export const dayKey = (d: Date) => d.toISOString().slice(0, 10);
export const parseDay = (s: string) => new Date(`${s}T00:00:00.000Z`);

export function monthDays(period: string): string[] {
  const [y, m] = period.split("-").map(Number);
  const out: string[] = [];
  const cursor = new Date(Date.UTC(y!, m! - 1, 1));
  while (cursor.getUTCMonth() === m! - 1) {
    out.push(dayKey(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out;
}

export function currentPeriod(iso = nowIso()) {
  return iso.slice(0, 7);
}

export function employeeOf(userId: string | null | undefined) {
  return userId ? db.hrEmployees.find((e) => e.userId === userId) ?? null : null;
}

export function shiftOf(employee: HrEmployeeRec): HrShiftRec | null {
  return employee.shiftId ? db.hrShifts.find((s) => s.id === employee.shiftId) ?? null : db.hrShifts.find((s) => s.kind === "DAY") ?? null;
}

export function shiftHours(shift: HrShiftRec | null) {
  if (!shift) return 8;
  const [sh, sm] = shift.startTime.split(":").map(Number);
  const [eh, em] = shift.endTime.split(":").map(Number);
  let minutes = (eh! * 60 + em!) - (sh! * 60 + sm!);
  if (minutes <= 0) minutes += 24 * 60;
  return Math.round(((minutes - shift.breakMinutes) / 60) * 100) / 100;
}

export function isWorkDay(employee: HrEmployeeRec, date: string) {
  return employee.workDays.includes(parseDay(date).getUTCDay());
}

/** Həmin tarixdə təsdiqlənmiş məzuniyyət. */
export function leaveOn(employeeId: string, date: string): HrLeaveRec | null {
  return db.hrLeaves.find((l) => l.employeeId === employeeId && l.status === "APPROVED" && l.from <= date && l.to >= date) ?? null;
}

/** İki tarix arasındakı iş günlərinin sayı (istirahət günləri çıxılmaqla). */
export function workingDaysBetween(employee: HrEmployeeRec, from: string, to: string) {
  let days = 0;
  for (let d = parseDay(from).getTime(); d <= parseDay(to).getTime(); d += DAY_MS) {
    if (isWorkDay(employee, dayKey(new Date(d)))) days += 1;
  }
  return days;
}

/* ------------------------------------------------------------------ */
/* Davamiyyət                                                           */
/* ------------------------------------------------------------------ */

export function attendanceOn(employeeId: string, date: string) {
  return db.hrAttendance.find((a) => a.employeeId === employeeId && a.date === date) ?? null;
}

/** Keçmiş günlər üçün davamiyyət qeydini yaradır (mock: deterministik simulyasiya). */
export function ensureAttendance(employee: HrEmployeeRec, date: string): HrAttendanceRec {
  const existing = attendanceOn(employee.id, date);
  if (existing) return existing;
  const shift = shiftOf(employee);
  const planned = isWorkDay(employee, date) ? shiftHours(shift) * 60 : 0;
  const leave = leaveOn(employee.id, date);
  const seed = [...`${employee.id}${date}`].reduce((s, ch) => (s * 31 + ch.charCodeAt(0)) % 9973, 7);
  let status: HrAttendanceRec["status"] = "PRESENT";
  let lateMinutes = 0;
  let workedMinutes = planned;
  let overtimeMinutes = 0;
  if (!planned) status = "WEEKEND";
  else if (leave) {
    status = leave.type === "SICK" ? "SICK" : "LEAVE";
    workedMinutes = 0;
  } else if (seed % 47 === 0) {
    status = "ABSENT";
    workedMinutes = 0;
  } else if (seed % 11 === 0) {
    status = "LATE";
    lateMinutes = 10 + (seed % 25);
    workedMinutes = planned - lateMinutes;
  } else if (seed % 17 === 0) {
    overtimeMinutes = 60 + (seed % 90);
    workedMinutes = planned + overtimeMinutes;
  }
  const [sh, sm] = (shift?.startTime ?? "09:00").split(":").map(Number);
  const start = new Date(`${date}T00:00:00.000Z`);
  start.setUTCMinutes(sh! * 60 + sm! - 240 + lateMinutes); // Bakı UTC+4
  const rec: HrAttendanceRec = {
    id: newId("att"),
    employeeId: employee.id,
    date,
    status,
    shiftId: shift?.id ?? null,
    checkIn: workedMinutes > 0 ? start.toISOString() : null,
    checkOut: workedMinutes > 0 ? new Date(start.getTime() + (workedMinutes + (shift?.breakMinutes ?? 60)) * 60_000).toISOString() : null,
    workedMinutes,
    plannedMinutes: planned,
    lateMinutes,
    overtimeMinutes,
    note: null,
  };
  db.hrAttendance.push(rec);
  return rec;
}

const WORKED_STATUSES = ["PRESENT", "LATE", "BUSINESS_TRIP"];
/** Ödənişli günlər: iş günləri + ödənişli məzuniyyət, xəstəlik vərəqəsi və bayram (yalnız ödənişsiz məzuniyyət çıxılır). */
const PAID_STATUSES = [...WORKED_STATUSES, "LEAVE", "SICK", "HOLIDAY"];

/**
 * Əməkdaşın həmin ayda davamiyyətə düşən intervalı: işə qəbuldan — bu gün, ayın sonu və işdən çıxma
 * tarixindən ən erkəninə qədər. İşdən çıxmış əməkdaşın son iş ayı da hesablanır ki, arxiv dövrün
 * əmək haqqı yenidən hesablananda sıfır gün qalmasın.
 */
export function coveredRange(employee: HrEmployeeRec, period: string) {
  const days = monthDays(period);
  const ends = [days[days.length - 1]!, dayKey(new Date(nowIso()))];
  if (employee.terminatedAt) ends.push(employee.terminatedAt.slice(0, 10));
  return { from: employee.hiredAt.slice(0, 10), to: ends.sort()[0]! };
}

/** Ayın keçmiş günləri üçün davamiyyəti tamamlayır. */
export function fillAttendance(period: string) {
  for (const employee of db.hrEmployees) {
    const { from, to } = coveredRange(employee, period);
    for (const date of monthDays(period)) {
      if (date > to || date < from) continue;
      ensureAttendance(employee, date);
    }
  }
}

export function timesheetRow(employee: HrEmployeeRec, period: string) {
  const rows = db.hrAttendance.filter((a) => a.employeeId === employee.id && a.date.startsWith(period));
  const { from, to } = coveredRange(employee, period);
  // Plan yalnız davamiyyət yaradılan interval üzrə sayılır — yarımçıq ay və ya işdən çıxma maaşı qırmasın
  const planned = monthDays(period).filter((d) => isWorkDay(employee, d) && d >= from && d <= to).length;
  const sum = (fn: (a: HrAttendanceRec) => number) => rows.reduce((s, a) => s + fn(a), 0);
  const unpaidLeave = (a: HrAttendanceRec) => a.status === "LEAVE" && leaveOn(employee.id, a.date)?.type === "UNPAID";
  return {
    employeeId: employee.id,
    fullName: employee.fullName,
    department: employee.department,
    plannedDays: planned,
    workedDays: rows.filter((a) => WORKED_STATUSES.includes(a.status)).length,
    paidDays: rows.filter((a) => PAID_STATUSES.includes(a.status) && !unpaidLeave(a)).length,
    plannedHours: Math.round((sum((a) => a.plannedMinutes) / 60) * 10) / 10,
    workedHours: Math.round((sum((a) => a.workedMinutes) / 60) * 10) / 10,
    overtimeHours: Math.round((sum((a) => a.overtimeMinutes) / 60) * 10) / 10,
    lateCount: rows.filter((a) => a.status === "LATE").length,
    absentDays: rows.filter((a) => a.status === "ABSENT").length,
    leaveDays: rows.filter((a) => a.status === "LEAVE").length,
    sickDays: rows.filter((a) => a.status === "SICK").length,
  };
}

/* ------------------------------------------------------------------ */
/* Məzuniyyət                                                           */
/* ------------------------------------------------------------------ */

export function leaveBalance(employee: HrEmployeeRec, year = new Date(nowIso()).getUTCFullYear()) {
  const mine = db.hrLeaves.filter((l) => l.employeeId === employee.id && l.from.startsWith(String(year)));
  const days = (type: HrLeaveRec["type"], status: HrLeaveRec["status"]) => mine.filter((l) => l.type === type && l.status === status).reduce((s, l) => s + l.days, 0);
  const used = days("ANNUAL", "APPROVED");
  const pending = days("ANNUAL", "PENDING");
  return {
    employeeId: employee.id,
    fullName: employee.fullName,
    year,
    entitlementDays: employee.annualLeaveDays,
    usedDays: used,
    pendingDays: pending,
    remainingDays: Math.max(0, employee.annualLeaveDays - used - pending),
    sickDaysUsed: days("SICK", "APPROVED"),
    unpaidDaysUsed: days("UNPAID", "APPROVED"),
  };
}

export function leaveActions(leave: HrLeaveRec, ctx: Ctx, canApprove: boolean) {
  const mine = employeeOf(ctx.user?.id)?.id === leave.employeeId;
  const out: { code: string; variant?: string }[] = [];
  if (leave.status === "PENDING") {
    if (canApprove) out.push({ code: "approve", variant: "primary" }, { code: "reject", variant: "destructive" });
    if (mine || canApprove) out.push({ code: "cancel", variant: "secondary" });
  }
  if (leave.status === "APPROVED" && leave.from > dayKey(new Date(nowIso())) && (mine || canApprove)) out.push({ code: "cancel", variant: "destructive" });
  return out;
}

/** Məzuniyyət təsdiqlənəndə həmin günlərin davamiyyəti yenilənir. */
export function applyLeaveToAttendance(leave: HrLeaveRec) {
  const employee = db.hrEmployees.find((e) => e.id === leave.employeeId);
  if (!employee) return;
  for (let d = parseDay(leave.from).getTime(); d <= parseDay(leave.to).getTime(); d += DAY_MS) {
    const date = dayKey(new Date(d));
    if (!isWorkDay(employee, date)) continue;
    const rec = attendanceOn(employee.id, date);
    const status: HrAttendanceRec["status"] = leave.type === "SICK" ? "SICK" : "LEAVE";
    if (rec) {
      rec.status = status;
      rec.workedMinutes = 0;
      rec.lateMinutes = 0;
      rec.overtimeMinutes = 0;
      rec.checkIn = null;
      rec.checkOut = null;
    } else if (date <= dayKey(new Date(nowIso()))) {
      ensureAttendance(employee, date);
      const created = attendanceOn(employee.id, date)!;
      created.status = status;
      created.workedMinutes = 0;
      created.checkIn = null;
      created.checkOut = null;
    }
  }
}

/* ------------------------------------------------------------------ */
/* Əmək haqqı                                                           */
/* ------------------------------------------------------------------ */

/** İki pilləli dərəcə: həddən aşağı bir faiz, yuxarı hissəyə digər faiz (DSMF, gəlir vergisi, tibbi sığorta). */
function progressive(baseCents: number, thresholdCents: number, rateBelow: number, rateAbove: number) {
  if (baseCents <= thresholdCents) return Math.round((baseCents * rateBelow) / 100);
  const below = Math.round((thresholdCents * rateBelow) / 100);
  return below + Math.round(((baseCents - thresholdCents) * rateAbove) / 100);
}

export function calculateLine(employee: HrEmployeeRec, period: string): HrPayrollLineRec {
  const s = db.hrPayrollSettings;
  const sheet = timesheetRow(employee, period);
  const base = employee.salaryCents;
  const ratio = sheet.plannedDays ? Math.min(1, sheet.paidDays / sheet.plannedDays) : 0;
  const earned = Math.round(base * ratio);
  const hourly = employee.monthlyHours ? base / employee.monthlyHours : base / s.standardMonthlyHours;
  const overtime = Math.round(hourly * sheet.overtimeHours * s.overtimeMultiplier);
  const shift = shiftOf(employee);
  const nightHours = shift?.kind === "NIGHT" ? sheet.workedHours : 0;
  const nightBonus = Math.round((hourly * nightHours * s.nightShiftBonusPercent) / 100);
  const gross = earned + overtime + nightBonus;
  const incomeTax = progressive(gross, s.incomeTaxThresholdCents, s.incomeTaxRateBelow, s.incomeTaxRateAbove);
  const socialEmployee = progressive(gross, s.socialThresholdCents, s.socialEmployeeRateBelow, s.socialEmployeeRateAbove);
  const socialEmployer = progressive(gross, s.socialThresholdCents, s.socialEmployerRateBelow, s.socialEmployerRateAbove);
  const unemploymentEmployee = Math.round((gross * s.unemploymentEmployeeRate) / 100);
  const unemploymentEmployer = Math.round((gross * s.unemploymentEmployerRate) / 100);
  const healthEmployee = progressive(gross, s.healthThresholdCents, s.healthEmployeeRateBelow, s.healthEmployeeRateAbove);
  const healthEmployer = progressive(gross, s.healthThresholdCents, s.healthEmployerRateBelow, s.healthEmployerRateAbove);
  return {
    employeeId: employee.id,
    plannedDays: sheet.plannedDays,
    workedDays: sheet.workedDays,
    paidDays: sheet.paidDays,
    overtimeHours: sheet.overtimeHours,
    nightHours,
    baseCents: base,
    earnedCents: earned,
    overtimeCents: overtime,
    nightBonusCents: nightBonus,
    bonusCents: 0,
    grossCents: gross,
    incomeTaxCents: incomeTax,
    socialEmployeeCents: socialEmployee,
    unemploymentEmployeeCents: unemploymentEmployee,
    healthEmployeeCents: healthEmployee,
    netCents: gross - incomeTax - socialEmployee - unemploymentEmployee - healthEmployee,
    socialEmployerCents: socialEmployer,
    unemploymentEmployerCents: unemploymentEmployer,
    healthEmployerCents: healthEmployer,
  };
}

export function calculateRun(run: HrPayrollRunRec) {
  fillAttendance(run.period);
  const active = db.hrEmployees.filter((e) => e.status !== "TERMINATED" || (e.terminatedAt ?? "").slice(0, 7) >= run.period);
  run.lines = active.filter((e) => e.hiredAt.slice(0, 7) <= run.period).map((e) => calculateLine(e, run.period));
  run.status = "CALCULATED";
  run.calculatedAt = nowIso();
  return run;
}

export function runTotals(lines: HrPayrollLineRec[]) {
  const sum = (fn: (l: HrPayrollLineRec) => number) => lines.reduce((s, l) => s + fn(l), 0);
  const gross = sum((l) => l.grossCents);
  const taxes = sum((l) => l.incomeTaxCents + l.socialEmployeeCents + l.unemploymentEmployeeCents + l.healthEmployeeCents);
  const employer = sum((l) => l.socialEmployerCents + l.unemploymentEmployerCents + l.healthEmployerCents);
  return { grossCents: gross, netCents: sum((l) => l.netCents), taxesCents: taxes, employerCostCents: gross + employer };
}

/** Dövr bağlanıb: ay tamamlanmayıbsa maaş yalnız proqnoz kimi hesablanır. */
export function periodClosed(run: HrPayrollRunRec) {
  return run.period < currentPeriod();
}

export function createRun(period: string, ctx: Ctx) {
  const run: HrPayrollRunRec = {
    id: newId("payroll"),
    number: nextNumber("PR", 100),
    period,
    status: "DRAFT",
    lines: [],
    createdBy: fullName(ctx.user),
    createdAt: nowIso(),
    calculatedAt: null,
    approvedBy: null,
    approvedAt: null,
    paidAt: null,
  };
  db.hrPayrollRuns.unshift(run);
  return calculateRun(run);
}

export function payrollActions(run: HrPayrollRunRec, canEdit: boolean, canApprove: boolean) {
  const out: { code: string; variant?: string }[] = [];
  if (run.status === "DRAFT" || run.status === "CALCULATED") {
    if (canEdit) out.push({ code: "recalculate", variant: "secondary" });
    // Bitməmiş ayın hesablanması yalnız proqnozdur — təsdiq və ödəniş ay bağlandıqdan sonra açılır
    if (canApprove && run.lines.length && periodClosed(run)) out.push({ code: "approve", variant: "primary" });
  }
  if (run.status === "APPROVED" && canApprove) out.push({ code: "pay", variant: "primary" });
  if (run.status !== "PAID" && canEdit) out.push({ code: "delete", variant: "destructive" });
  return out;
}

/* ------------------------------------------------------------------ */
/* DTO                                                                  */
/* ------------------------------------------------------------------ */

export function positionOf(employee: HrEmployeeRec) {
  return employee.positionId ? db.hrPositions.find((p) => p.id === employee.positionId) ?? null : null;
}

export function employeeDto(e: HrEmployeeRec) {
  const position = positionOf(e);
  const manager = e.managerId ? db.hrEmployees.find((x) => x.id === e.managerId) ?? null : null;
  const months = Math.max(0, Math.round((new Date(nowIso()).getTime() - new Date(e.hiredAt).getTime()) / (30 * DAY_MS)));
  return {
    id: e.id,
    userId: e.userId,
    personnelNumber: e.personnelNumber,
    fullName: e.fullName,
    positionId: e.positionId,
    positionTitle: position?.title ?? L("—"),
    department: e.department,
    branchId: e.branchId,
    branchName: e.branchId ? branchName(e.branchId) : null,
    managerId: e.managerId,
    managerName: manager?.fullName ?? null,
    contractType: e.contractType,
    contractNumber: e.contractNumber,
    status: e.status,
    hiredAt: e.hiredAt,
    probationUntil: e.probationUntil,
    terminatedAt: e.terminatedAt,
    terminationReason: e.terminationReason,
    salary: money(e.salaryCents),
    monthlyHours: e.monthlyHours,
    annualLeaveDays: e.annualLeaveDays,
    phone: e.phone,
    email: e.email,
    iban: e.iban,
    roles: userById(e.userId)?.roles ?? [],
    tenureMonths: months,
  };
}

export function positionDto(p: (typeof db.hrPositions)[number]) {
  const occupied = db.hrEmployees.filter((e) => e.positionId === p.id && e.status !== "TERMINATED").length;
  return {
    id: p.id,
    code: p.code,
    title: p.title,
    department: p.department,
    branchId: p.branchId,
    branchName: p.branchId ? branchName(p.branchId) : null,
    plannedCount: p.plannedCount,
    occupiedCount: occupied,
    vacantCount: Math.max(0, p.plannedCount - occupied),
    salaryFrom: money(p.salaryFromCents),
    salaryTo: money(p.salaryToCents),
    active: p.active,
  };
}

export function leaveDto(l: HrLeaveRec, ctx: Ctx, canApprove: boolean) {
  const employee = db.hrEmployees.find((e) => e.id === l.employeeId);
  return {
    id: l.id,
    number: l.number,
    employeeId: l.employeeId,
    fullName: employee?.fullName ?? "—",
    department: employee?.department ?? "—",
    type: l.type,
    status: l.status,
    from: l.from,
    to: l.to,
    days: l.days,
    paid: l.type !== "UNPAID",
    reason: l.reason,
    attachmentName: l.attachmentName,
    approverName: l.approverId ? fullName(userById(l.approverId)) : null,
    decidedAt: l.decidedAt,
    decisionNote: l.decisionNote,
    createdAt: l.createdAt,
    availableActions: leaveActions(l, ctx, canApprove),
  };
}

export function payslipDto(line: HrPayrollLineRec) {
  const employee = db.hrEmployees.find((e) => e.id === line.employeeId);
  const position = employee ? positionOf(employee) : null;
  return {
    employeeId: line.employeeId,
    fullName: employee?.fullName ?? "—",
    personnelNumber: employee?.personnelNumber ?? "—",
    department: employee?.department ?? "—",
    positionTitle: position?.title ?? L("—"),
    plannedDays: line.plannedDays,
    workedDays: line.workedDays,
    paidDays: line.paidDays,
    overtimeHours: line.overtimeHours,
    baseSalary: money(line.baseCents),
    earnedSalary: money(line.earnedCents),
    overtimePay: money(line.overtimeCents),
    nightBonus: money(line.nightBonusCents),
    bonus: money(line.bonusCents),
    gross: money(line.grossCents),
    incomeTax: money(line.incomeTaxCents),
    socialEmployee: money(line.socialEmployeeCents),
    unemploymentEmployee: money(line.unemploymentEmployeeCents),
    healthEmployee: money(line.healthEmployeeCents),
    totalDeductions: money(line.incomeTaxCents + line.socialEmployeeCents + line.unemploymentEmployeeCents + line.healthEmployeeCents),
    net: money(line.netCents),
    socialEmployer: money(line.socialEmployerCents),
    unemploymentEmployer: money(line.unemploymentEmployerCents),
    healthEmployer: money(line.healthEmployerCents),
    employerCost: money(line.grossCents + line.socialEmployerCents + line.unemploymentEmployerCents + line.healthEmployerCents),
  };
}

/** `lines` — çağıranın səlahiyyətinə düşən sətirlər; yekunlar da yalnız onlara görə hesablanır. */
export function runDto(run: HrPayrollRunRec, canEdit: boolean, canApprove: boolean, lines: HrPayrollLineRec[] = run.lines) {
  const totals = runTotals(lines);
  return {
    id: run.id,
    number: run.number,
    period: run.period,
    status: run.status,
    periodClosed: periodClosed(run),
    employeeCount: lines.length,
    totalGross: money(totals.grossCents),
    totalNet: money(totals.netCents),
    totalTaxes: money(totals.taxesCents),
    totalEmployerCost: money(totals.employerCostCents),
    createdBy: run.createdBy,
    createdAt: run.createdAt,
    calculatedAt: run.calculatedAt,
    approvedBy: run.approvedBy,
    approvedAt: run.approvedAt,
    paidAt: run.paidAt,
    availableActions: payrollActions(run, canEdit, canApprove),
  };
}

export function settingsDto() {
  const s = db.hrPayrollSettings;
  return {
    incomeTaxThreshold: money(s.incomeTaxThresholdCents),
    incomeTaxRateBelow: s.incomeTaxRateBelow,
    incomeTaxRateAbove: s.incomeTaxRateAbove,
    socialThreshold: money(s.socialThresholdCents),
    socialEmployeeRateBelow: s.socialEmployeeRateBelow,
    socialEmployeeRateAbove: s.socialEmployeeRateAbove,
    socialEmployerRateBelow: s.socialEmployerRateBelow,
    socialEmployerRateAbove: s.socialEmployerRateAbove,
    unemploymentEmployeeRate: s.unemploymentEmployeeRate,
    unemploymentEmployerRate: s.unemploymentEmployerRate,
    healthThreshold: money(s.healthThresholdCents),
    healthEmployeeRateBelow: s.healthEmployeeRateBelow,
    healthEmployeeRateAbove: s.healthEmployeeRateAbove,
    healthEmployerRateBelow: s.healthEmployerRateBelow,
    healthEmployerRateAbove: s.healthEmployerRateAbove,
    overtimeMultiplier: s.overtimeMultiplier,
    nightShiftBonusPercent: s.nightShiftBonusPercent,
    standardMonthlyHours: s.standardMonthlyHours,
  };
}
