import { db } from "../db/state";
import type { HrEmployeeRec, HrLeaveRec, HrPayrollSettingsRec, HrPositionRec, HrShiftRec } from "../db/types";
import { BR } from "../data/org";
import { uid } from "../data/people";
import { calculateRun, dayKey, workingDaysBetween } from "../engine/hr";
import { L } from "../lib/i18n";
import { idFor } from "../lib/rng";
import { atTime, daysAgo, daysFromNow, nowIso } from "../lib/time";

/** HRM demo məlumatları: ştat cədvəli, növbələr, əməkdaş kartları, məzuniyyətlər və əmək haqqı dövrləri. */

const POS = (code: string) => idFor(`hr-position:${code}`);

export function seedHr() {
  // Əmək haqqı dərəcələri — qeyri-neft özəl sektor (2026); admin panelindən dəyişdirilə bilər
  const settings: HrPayrollSettingsRec = {
    incomeTaxThresholdCents: 800000,
    incomeTaxRateBelow: 0,
    incomeTaxRateAbove: 14,
    socialThresholdCents: 20000,
    socialEmployeeRateBelow: 3,
    socialEmployeeRateAbove: 10,
    socialEmployerRateBelow: 22,
    socialEmployerRateAbove: 15,
    unemploymentEmployeeRate: 0.5,
    unemploymentEmployerRate: 0.5,
    healthThresholdCents: 800000,
    healthEmployeeRateBelow: 2,
    healthEmployeeRateAbove: 0.5,
    healthEmployerRateBelow: 2,
    healthEmployerRateAbove: 0.5,
    overtimeMultiplier: 2,
    nightShiftBonusPercent: 20,
    standardMonthlyHours: 167,
  };
  db.hrPayrollSettings = settings;

  const shift = (code: string, kind: HrShiftRec["kind"], startTime: string, endTime: string, name: ReturnType<typeof L>, breakMinutes = 60): HrShiftRec => ({
    id: idFor(`hr-shift:${code}`),
    code,
    name,
    kind,
    startTime,
    endTime,
    breakMinutes,
    active: true,
  });
  db.hrShifts = [
    shift("G1", "DAY", "09:00", "18:00", L("Gündüz (09:00–18:00)", "Дневная (09:00–18:00)", "Day (09:00–18:00)")),
    shift("G2", "DAY", "08:00", "17:00", L("Erkən gündüz (08:00–17:00)", "Ранняя дневная (08:00–17:00)", "Early day (08:00–17:00)")),
    shift("A1", "EVENING", "14:00", "23:00", L("Axşam (14:00–23:00)", "Вечерняя (14:00–23:00)", "Evening (14:00–23:00)")),
    shift("N1", "NIGHT", "22:00", "07:00", L("Gecə (22:00–07:00)", "Ночная (22:00–07:00)", "Night (22:00–07:00)"), 45),
    shift("F1", "FLEX", "10:00", "19:00", L("Çevik (10:00–19:00)", "Гибкая (10:00–19:00)", "Flexible (10:00–19:00)")),
  ];

  const position = (code: string, department: string, planned: number, from: number, to: number, title: ReturnType<typeof L>, branchId: string | null = BR.narimanov): HrPositionRec => ({
    id: POS(code),
    code,
    title,
    department,
    branchId,
    plannedCount: planned,
    salaryFromCents: from * 100,
    salaryToCents: to * 100,
    active: true,
  });
  db.hrPositions = [
    position("OPR", "Əməliyyat", 4, 900, 1400, L("Operator", "Оператор", "Operator")),
    position("DSP", "Əməliyyat", 2, 1100, 1600, L("Dispetçer", "Диспетчер", "Dispatcher")),
    position("TCH", "Servis", 12, 1000, 2200, L("Usta (ştat)", "Мастер (штат)", "Staff technician")),
    position("WHS", "Anbar", 3, 900, 1300, L("Anbar əməkdaşı", "Сотрудник склада", "Warehouse employee")),
    position("CUR", "Logistika", 4, 800, 1200, L("Kuryer", "Курьер", "Courier")),
    position("SLS", "Satış", 3, 1000, 1800, L("Satış meneceri", "Менеджер по продажам", "Sales manager")),
    position("ACC", "Maliyyə", 2, 1500, 2400, L("Mühasib", "Бухгалтер", "Accountant")),
    position("MNG", "İdarəetmə", 2, 2500, 4000, L("Filial meneceri", "Менеджер филиала", "Branch manager")),
    position("ADM", "İdarəetmə", 1, 3000, 5000, L("Sistem administratoru", "Системный администратор", "System administrator")),
  ];

  let counter = 1000;
  const employee = (key: string, fullName: string, positionCode: string, department: string, salary: number, opts: Partial<HrEmployeeRec> = {}): HrEmployeeRec => {
    counter += 1;
    const hiredAt = opts.hiredAt ?? daysAgo(500);
    return {
      id: idFor(`hr-employee:${key}`),
      userId: opts.userId === undefined ? uid(key) : opts.userId,
      personnelNumber: `EMP-${counter}`,
      fullName,
      positionId: POS(positionCode),
      department,
      branchId: opts.branchId ?? BR.narimanov,
      managerId: opts.managerId ?? null,
      contractType: opts.contractType ?? "PERMANENT",
      contractNumber: `ƏM-${counter}`,
      status: opts.status ?? "ACTIVE",
      hiredAt,
      probationUntil: opts.probationUntil ?? null,
      terminatedAt: opts.terminatedAt ?? null,
      terminationReason: opts.terminationReason ?? null,
      salaryCents: salary * 100,
      monthlyHours: opts.monthlyHours ?? 167,
      annualLeaveDays: opts.annualLeaveDays ?? 21,
      phone: db.users.find((u) => u.id === (opts.userId === undefined ? uid(key) : opts.userId))?.phone ?? null,
      email: db.users.find((u) => u.id === (opts.userId === undefined ? uid(key) : opts.userId))?.email ?? null,
      iban: `AZ21NABZ00000000137010001${(counter % 1000).toString().padStart(3, "0")}`,
      workDays: opts.workDays ?? [1, 2, 3, 4, 5],
      shiftId: opts.shiftId ?? idFor("hr-shift:G1"),
    };
  };

  const manager = employee("manager", "Fərid Quliyev", "MNG", "İdarəetmə", 3200, { hiredAt: daysAgo(900) });
  db.hrEmployees = [
    manager,
    employee("admin", "Admin İstifadəçi", "ADM", "İdarəetmə", 3400, { hiredAt: daysAgo(800), managerId: manager.id }),
    employee("operator", "Nərmin Səfərova", "OPR", "Əməliyyat", 1200, { hiredAt: daysAgo(420), managerId: manager.id }),
    employee("dispatcher", "Rüstəm Bağırov", "DSP", "Əməliyyat", 1450, { hiredAt: daysAgo(610), managerId: manager.id }),
    employee("warehouse", "Rauf Nəsirov", "WHS", "Anbar", 1100, { hiredAt: daysAgo(380), managerId: manager.id }),
    employee("sales", "Kənan Vəliyev", "SLS", "Satış", 1500, { hiredAt: daysAgo(300), managerId: manager.id }),
    employee("accountant", "Səbinə Axundova", "ACC", "Maliyyə", 2100, { hiredAt: daysAgo(700), managerId: manager.id }),
    employee("kamran", "Kamran Əliyev", "TCH", "Servis", 1800, { hiredAt: daysAgo(900), managerId: manager.id, shiftId: idFor("hr-shift:G2"), workDays: [1, 2, 3, 4, 5, 6] }),
    employee("samir", "Samir Qasımov", "TCH", "Servis", 1550, { hiredAt: daysAgo(540), managerId: manager.id, branchId: BR.yasamal }),
    employee("ramil", "Ramil Sadıqov", "TCH", "Servis", 1400, { hiredAt: daysAgo(260), managerId: manager.id }),
    employee("farid-t", "Fərid Nağıyev", "TCH", "Servis", 1350, { hiredAt: daysAgo(150), managerId: manager.id, branchId: BR.sumqayit, shiftId: idFor("hr-shift:A1") }),
    employee("anar", "Anar Cəfərov", "TCH", "Servis", 1300, { hiredAt: daysAgo(70), managerId: manager.id, branchId: BR.ganja, status: "PROBATION", probationUntil: daysFromNow(20) }),
    employee("orxan", "Orxan Məmmədli", "CUR", "Logistika", 950, { hiredAt: daysAgo(330), managerId: manager.id, workDays: [1, 2, 3, 4, 5, 6] }),
    employee("elnur", "Elnur Paşayev", "CUR", "Logistika", 950, { hiredAt: daysAgo(210), managerId: manager.id, shiftId: idFor("hr-shift:N1"), workDays: [1, 2, 3, 4, 5] }),
    employee("ex-operator", "Günay Rzayeva", "OPR", "Əməliyyat", 1150, { userId: null, hiredAt: daysAgo(640), managerId: manager.id, status: "TERMINATED", terminatedAt: daysAgo(40), terminationReason: "Öz arzusu ilə" }),
  ];

  // Məzuniyyət müraciətləri: təsdiqlənmiş, gözləyən və rədd edilmiş
  let leaveNo = 400;
  const leave = (key: string, type: HrLeaveRec["type"], fromDays: number, toDays: number, status: HrLeaveRec["status"], reason: string | null, decisionNote: string | null = null): void => {
    const employeeRec = db.hrEmployees.find((e) => e.id === idFor(`hr-employee:${key}`));
    if (!employeeRec) return;
    leaveNo += 1;
    const from = dayKey(new Date(fromDays >= 0 ? daysFromNow(fromDays) : daysAgo(-fromDays)));
    const to = dayKey(new Date(toDays >= 0 ? daysFromNow(toDays) : daysAgo(-toDays)));
    db.hrLeaves.push({
      id: idFor(`hr-leave:${key}:${leaveNo}`),
      number: `MZ-${leaveNo}`,
      employeeId: employeeRec.id,
      type,
      status,
      from,
      to,
      days: workingDaysBetween(employeeRec, from, to),
      reason,
      attachmentName: type === "SICK" ? "xestelik-vereqesi.pdf" : null,
      approverId: status === "APPROVED" || status === "REJECTED" ? uid("manager") : null,
      decidedAt: status === "APPROVED" || status === "REJECTED" ? daysAgo(Math.max(1, Math.abs(fromDays) - 5)) : null,
      decisionNote,
      createdAt: daysAgo(Math.max(2, Math.abs(fromDays) + 3)),
    });
  };
  leave("operator", "ANNUAL", -30, -21, "APPROVED", "İllik məzuniyyət");
  leave("kamran", "SICK", -12, -9, "APPROVED", "Soyuqdəymə");
  leave("sales", "ANNUAL", 10, 21, "PENDING", "Ailə ilə istirahət");
  leave("dispatcher", "UNPAID", 6, 8, "PENDING", "Şəxsi işlər");
  leave("samir", "ANNUAL", -3, 4, "APPROVED", "Planlı məzuniyyət");
  leave("warehouse", "STUDY", -60, -56, "REJECTED", "İmtahan sessiyası", "Anbar sayımı dövrü ilə üst-üstə düşür");
  leave("ramil", "ANNUAL", 25, 32, "PENDING", "Toy mərasimi");

  // Keçmiş iki dövr üçün əmək haqqı: biri ödənilib, biri təsdiqlənib
  const period = (offsetMonths: number) => {
    const d = new Date(nowIso());
    d.setUTCMonth(d.getUTCMonth() - offsetMonths, 1);
    return d.toISOString().slice(0, 7);
  };
  const runFor = (offset: number, status: "APPROVED" | "PAID") => {
    const p = period(offset);
    atTime(daysAgo(offset * 30 - 2), () => {
      const run = {
        id: idFor(`hr-payroll:${p}`),
        number: `PR-${100 + offset}`,
        period: p,
        status: "DRAFT" as const,
        lines: [],
        createdBy: "Səbinə Axundova",
        createdAt: nowIso(),
        calculatedAt: null,
        approvedBy: null,
        approvedAt: null,
        paidAt: null,
      };
      db.hrPayrollRuns.unshift(run);
      calculateRun(run);
      const finished = db.hrPayrollRuns.find((r) => r.id === run.id)!;
      finished.status = status;
      finished.approvedBy = "Fərid Quliyev";
      finished.approvedAt = nowIso();
      if (status === "PAID") finished.paidAt = nowIso();
    });
  };
  runFor(2, "PAID");
  runFor(1, "PAID");

  db.hrPayrollRuns.sort((a, b) => b.period.localeCompare(a.period));
}
