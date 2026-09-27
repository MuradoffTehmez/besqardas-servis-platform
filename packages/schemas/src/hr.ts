import { z } from "zod";
import { Id, IsoDateTime, LocalizedText, Money } from "./common";

/**
 * HRM: əməkdaş kartı, ştat cədvəli, növbələr və davamiyyət, məzuniyyət müraciətləri,
 * əmək haqqı hesablanması (gəlir vergisi, DSMF, işsizlikdən sığorta, icbari tibbi sığorta).
 * Bütün hesablamalar backend-dədir; dərəcələr admin tərəfindən konfiqurasiya olunur.
 */

export const EmployeeStatus = z.enum(["PROBATION", "ACTIVE", "ON_LEAVE", "SUSPENDED", "TERMINATED"]);
export const ContractType = z.enum(["PERMANENT", "FIXED_TERM", "PART_TIME", "INTERNSHIP"]);
export const LeaveType = z.enum(["ANNUAL", "SICK", "UNPAID", "MATERNITY", "STUDY", "SPECIAL"]);
export const LeaveStatus = z.enum(["PENDING", "APPROVED", "REJECTED", "CANCELLED"]);
export const AttendanceStatus = z.enum(["PRESENT", "LATE", "ABSENT", "LEAVE", "SICK", "BUSINESS_TRIP", "WEEKEND", "HOLIDAY"]);
export const PayrollStatus = z.enum(["DRAFT", "CALCULATED", "APPROVED", "PAID"]);
export const ShiftKind = z.enum(["DAY", "EVENING", "NIGHT", "FLEX"]);

export const Employee = z.object({
  id: Id,
  userId: Id.nullable(),
  personnelNumber: z.string(),
  fullName: z.string(),
  positionId: Id.nullable(),
  positionTitle: LocalizedText,
  department: z.string(),
  branchId: Id.nullable(),
  branchName: z.string().nullable(),
  managerId: Id.nullable(),
  managerName: z.string().nullable(),
  contractType: ContractType,
  contractNumber: z.string(),
  status: EmployeeStatus,
  hiredAt: IsoDateTime,
  probationUntil: IsoDateTime.nullable(),
  terminatedAt: IsoDateTime.nullable(),
  terminationReason: z.string().nullable(),
  salary: Money,
  /** Aylıq norma saat (tam ştat üçün ~167). */
  monthlyHours: z.number(),
  annualLeaveDays: z.number(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  iban: z.string().nullable(),
  roles: z.array(z.string()),
  tenureMonths: z.number(),
});

export const EmployeeInput = z.object({
  userId: Id.optional().nullable(),
  fullName: z.string().trim().min(3, "validation.required").max(80, "validation.tooLong"),
  positionId: Id.optional().nullable(),
  department: z.string().trim().min(2, "validation.required"),
  branchId: Id.optional().nullable(),
  managerId: Id.optional().nullable(),
  contractType: ContractType,
  contractNumber: z.string().trim().max(40).optional(),
  hiredAt: IsoDateTime,
  probationMonths: z.number().int().min(0).max(6).optional(),
  salary: z.string().regex(/^\d+(\.\d{1,2})?$/, "validation.number"),
  monthlyHours: z.number().min(1).max(320).optional(),
  annualLeaveDays: z.number().int().min(0).max(60).optional(),
  phone: z.string().trim().max(20).optional().nullable(),
  email: z.string().trim().max(120).optional().nullable(),
  iban: z.string().trim().max(34).optional().nullable(),
});

/** Ştat cədvəli sətri: vəzifə, planlaşdırılan ştat sayı və maaş aralığı. */
export const StaffPosition = z.object({
  id: Id,
  code: z.string(),
  title: LocalizedText,
  department: z.string(),
  branchId: Id.nullable(),
  branchName: z.string().nullable(),
  plannedCount: z.number().int(),
  occupiedCount: z.number().int(),
  vacantCount: z.number().int(),
  salaryFrom: Money,
  salaryTo: Money,
  active: z.boolean(),
});

export const ShiftTemplate = z.object({
  id: Id,
  code: z.string(),
  name: LocalizedText,
  kind: ShiftKind,
  startTime: z.string(),
  endTime: z.string(),
  breakMinutes: z.number().int(),
  hours: z.number(),
  active: z.boolean(),
});

export const ScheduleCell = z.object({
  date: z.string(),
  shiftId: Id.nullable(),
  shiftCode: z.string().nullable(),
  kind: ShiftKind.nullable(),
  hours: z.number(),
  dayOff: z.boolean(),
  leaveType: LeaveType.nullable(),
});

export const ScheduleRow = z.object({
  employeeId: Id,
  fullName: z.string(),
  positionTitle: LocalizedText,
  department: z.string(),
  cells: z.array(ScheduleCell),
  plannedHours: z.number(),
});

export const AttendanceRecord = z.object({
  id: Id,
  employeeId: Id,
  fullName: z.string(),
  date: z.string(),
  status: AttendanceStatus,
  checkIn: IsoDateTime.nullable(),
  checkOut: IsoDateTime.nullable(),
  workedHours: z.number(),
  plannedHours: z.number(),
  lateMinutes: z.number(),
  overtimeHours: z.number(),
  note: z.string().nullable(),
});

/** Aylıq tabel: hər əməkdaş üzrə yekunlar. */
export const TimesheetRow = z.object({
  employeeId: Id,
  fullName: z.string(),
  department: z.string(),
  plannedDays: z.number(),
  workedDays: z.number(),
  /** İşlənmiş + ödənişli məzuniyyət günləri (maaş bu nisbətlə hesablanır). */
  paidDays: z.number(),
  plannedHours: z.number(),
  workedHours: z.number(),
  overtimeHours: z.number(),
  lateCount: z.number(),
  absentDays: z.number(),
  leaveDays: z.number(),
  sickDays: z.number(),
});

export const LeaveBalance = z.object({
  employeeId: Id,
  fullName: z.string(),
  year: z.number(),
  entitlementDays: z.number(),
  usedDays: z.number(),
  pendingDays: z.number(),
  remainingDays: z.number(),
  sickDaysUsed: z.number(),
  unpaidDaysUsed: z.number(),
});

export const LeaveRequest = z.object({
  id: Id,
  number: z.string(),
  employeeId: Id,
  fullName: z.string(),
  department: z.string(),
  type: LeaveType,
  status: LeaveStatus,
  from: z.string(),
  to: z.string(),
  days: z.number(),
  paid: z.boolean(),
  reason: z.string().nullable(),
  attachmentName: z.string().nullable(),
  approverName: z.string().nullable(),
  decidedAt: IsoDateTime.nullable(),
  decisionNote: z.string().nullable(),
  createdAt: IsoDateTime,
  availableActions: z.array(z.object({ code: z.string(), variant: z.string().optional() })),
});

export const LeaveRequestInput = z.object({
  employeeId: Id.optional(),
  type: LeaveType,
  from: z.string().min(10, "validation.required"),
  to: z.string().min(10, "validation.required"),
  reason: z.string().trim().max(500).optional(),
  attachmentName: z.string().trim().max(120).optional(),
});

/** Əmək haqqı dərəcələri — qanunvericilik dəyişdikdə admin tərəfindən yenilənir. */
export const PayrollSettings = z.object({
  /** Gəlir vergisi: aylıq gəlir həddindən aşağı — 0%, yuxarı — faiz. */
  incomeTaxThreshold: Money,
  incomeTaxRateBelow: z.number(),
  incomeTaxRateAbove: z.number(),
  /** DSMF (məcburi dövlət sosial sığortası). */
  socialThreshold: Money,
  socialEmployeeRateBelow: z.number(),
  socialEmployeeRateAbove: z.number(),
  socialEmployerRateBelow: z.number(),
  socialEmployerRateAbove: z.number(),
  /** İşsizlikdən sığorta. */
  unemploymentEmployeeRate: z.number(),
  unemploymentEmployerRate: z.number(),
  /** İcbari tibbi sığorta. */
  healthThreshold: Money,
  healthEmployeeRateBelow: z.number(),
  healthEmployeeRateAbove: z.number(),
  healthEmployerRateBelow: z.number(),
  healthEmployerRateAbove: z.number(),
  /** İş vaxtından artıq saatın əmsalı (Əmək Məcəlləsi — ikiqat). */
  overtimeMultiplier: z.number(),
  nightShiftBonusPercent: z.number(),
  standardMonthlyHours: z.number(),
});

export const PayslipLine = z.object({
  employeeId: Id,
  fullName: z.string(),
  personnelNumber: z.string(),
  department: z.string(),
  positionTitle: LocalizedText,
  plannedDays: z.number(),
  workedDays: z.number(),
  paidDays: z.number(),
  overtimeHours: z.number(),
  baseSalary: Money,
  earnedSalary: Money,
  overtimePay: Money,
  nightBonus: Money,
  bonus: Money,
  gross: Money,
  incomeTax: Money,
  socialEmployee: Money,
  unemploymentEmployee: Money,
  healthEmployee: Money,
  totalDeductions: Money,
  net: Money,
  socialEmployer: Money,
  unemploymentEmployer: Money,
  healthEmployer: Money,
  employerCost: Money,
});

export const PayrollRun = z.object({
  id: Id,
  number: z.string(),
  period: z.string(),
  status: PayrollStatus,
  /** Ay bağlanmayıbsa hesablama proqnozdur — təsdiq/ödəniş əməliyyatları açılmır. */
  periodClosed: z.boolean(),
  employeeCount: z.number(),
  totalGross: Money,
  totalNet: Money,
  totalTaxes: Money,
  totalEmployerCost: Money,
  createdBy: z.string(),
  createdAt: IsoDateTime,
  calculatedAt: IsoDateTime.nullable(),
  approvedBy: z.string().nullable(),
  approvedAt: IsoDateTime.nullable(),
  paidAt: IsoDateTime.nullable(),
  availableActions: z.array(z.object({ code: z.string(), variant: z.string().optional() })),
});

export const PayrollRunDetail = PayrollRun.extend({
  lines: z.array(PayslipLine),
  settings: PayrollSettings,
});

export const HrDashboard = z.object({
  headcount: z.number(),
  vacancies: z.number(),
  plannedHeadcount: z.number(),
  probation: z.number(),
  onLeaveToday: z.number(),
  pendingLeaves: z.number(),
  attendanceToday: z.object({ present: z.number(), late: z.number(), absent: z.number(), leave: z.number(), planned: z.number() }),
  byDepartment: z.array(z.object({ department: z.string(), headcount: z.number(), planned: z.number(), salaryTotal: Money })),
  hiredThisYear: z.number(),
  leftThisYear: z.number(),
  turnoverPercent: z.number(),
  averageTenureMonths: z.number(),
  payroll: z.object({ period: z.string(), status: PayrollStatus.nullable(), gross: Money, net: Money, taxes: Money, employerCost: Money }),
  upcomingLeaves: z.array(z.object({ fullName: z.string(), type: LeaveType, from: z.string(), to: z.string() })),
});

export const MyHrProfile = z.object({
  employee: Employee.nullable(),
  balance: LeaveBalance.nullable(),
  requests: z.array(LeaveRequest),
  schedule: z.array(ScheduleCell),
  timesheet: TimesheetRow.nullable(),
  payslips: z.array(z.object({ period: z.string(), status: PayrollStatus, net: Money, gross: Money })),
});
