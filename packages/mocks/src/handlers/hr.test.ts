import { beforeEach, describe, expect, it } from "vitest";
import { getResponse } from "msw";
import { handlers } from "./index";
import { reset } from "../seed";

/** HRM testləri: əməkdaş kartı, məzuniyyət axını, tabel, əmək haqqı hesablanması və icazələr. */

type Res = { status: number; data: any; cookie?: string };

async function call(method: string, path: string, body?: unknown, cookie?: string): Promise<Res> {
  const response = await getResponse(handlers, new Request(`http://localhost/api${path}`, { method, headers: { "Content-Type": "application/json", "x-mock-delay": "0", ...(cookie ? { cookie } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) }));
  if (!response) throw new Error(`Handler yoxdur: ${method} ${path}`);
  const text = await response.text();
  const sid = (response.headers.getSetCookie?.() ?? []).find((c) => c.startsWith("sid="));
  return { status: response.status, data: text ? JSON.parse(text) : null, cookie: sid?.split(";")[0] };
}

async function login(email: string) {
  const r = await call("POST", "/auth/login", { email, password: "Demo1234!" });
  if (r.data.status === "TWO_FACTOR_REQUIRED") await call("POST", "/auth/2fa", { challengeId: r.data.challengeId, code: "123456" }, r.cookie);
  return r.cookie!;
}

const day = (offset: number) => new Date(Date.now() + offset * 86400_000).toISOString().slice(0, 10);
const money = (m: any) => Number(m.amount);

describe("HRM", () => {
  beforeEach(() => reset());

  it("icmal, əməkdaş siyahısı və kart", async () => {
    const manager = await login("manager@demo.az");
    const dash = await call("GET", "/admin/hr/dashboard", undefined, manager);
    expect(dash.status, JSON.stringify(dash.data)).toBe(200);
    expect(dash.data.headcount).toBeGreaterThan(8);
    expect(dash.data.plannedHeadcount).toBeGreaterThanOrEqual(dash.data.headcount);
    // Bazar günü heç kimin növbəsi yoxdur; digər günlərdə plan boş qala bilməz
    const weekday = new Date().getUTCDay();
    if (weekday === 0) expect(dash.data.attendanceToday.planned).toBe(0);
    else expect(dash.data.attendanceToday.planned).toBeGreaterThan(0);
    expect(dash.data.byDepartment.length).toBeGreaterThan(3);
    expect(dash.data.pendingLeaves).toBeGreaterThan(0);

    const list = (await call("GET", "/admin/hr/employees?pageSize=50", undefined, manager)).data;
    expect(list.items.some((e: any) => e.status === "TERMINATED")).toBe(true);
    const kamran = list.items.find((e: any) => e.fullName === "Kamran Əliyev");
    expect(kamran.department).toBe("Servis");
    expect(money(kamran.salary)).toBe(1800);

    const card = (await call("GET", `/admin/hr/employees/${kamran.id}`, undefined, manager)).data;
    expect(card.balance.entitlementDays).toBe(21);
    expect(card.timesheet.plannedDays).toBeGreaterThan(0);
    expect(card.attendance.length).toBeGreaterThan(0);
    expect(card.leaves.some((l: any) => l.type === "SICK")).toBe(true);
    // Menecerdə payroll:view var — keçmiş dövrlərin payslip-ləri görünür
    expect(card.payslips.length).toBeGreaterThan(0);
    expect(card.payslips[0].period).toMatch(/^\d{4}-\d{2}$/);
    expect(Number(card.payslips[0].net.amount)).toBeGreaterThan(0);
  });

  it("məzuniyyət: balans yoxlanışı, üst-üstə düşmə, təsdiq və davamiyyətə təsir", async () => {
    const manager = await login("manager@demo.az");
    const employees = (await call("GET", "/admin/hr/employees?pageSize=50", undefined, manager)).data.items;
    const target = employees.find((e: any) => e.fullName === "Rauf Nəsirov");

    const tooLong = await call("POST", "/admin/hr/leaves", { employeeId: target.id, type: "ANNUAL", from: day(10), to: day(60) }, manager);
    expect(tooLong.status).toBe(422);
    expect(tooLong.data.fieldErrors.type).toEqual(["validation.leaveBalance"]);

    const created = await call("POST", "/admin/hr/leaves", { employeeId: target.id, type: "ANNUAL", from: day(7), to: day(11), reason: "İstirahət" }, manager);
    expect(created.status, JSON.stringify(created.data)).toBe(200);
    expect(created.data.status).toBe("PENDING");
    expect(created.data.days).toBeGreaterThan(0);
    expect(created.data.number).toMatch(/^MZ-/);

    const overlap = await call("POST", "/admin/hr/leaves", { employeeId: target.id, type: "UNPAID", from: day(8), to: day(9) }, manager);
    expect(overlap.status).toBe(422);
    expect(overlap.data.fieldErrors.from).toEqual(["validation.leaveOverlap"]);

    const balanceBefore = (await call("GET", "/admin/hr/leave-balances?pageSize=50", undefined, manager)).data.items.find((b: any) => b.employeeId === target.id);
    expect(balanceBefore.pendingDays).toBe(created.data.days);

    const rejectNoNote = await call("POST", `/admin/hr/leaves/${created.data.id}/actions`, { code: "reject" }, manager);
    expect(rejectNoNote.status).toBe(422);

    const approved = await call("POST", `/admin/hr/leaves/${created.data.id}/actions`, { code: "approve" }, manager);
    expect(approved.data.status).toBe("APPROVED");
    expect(approved.data.approverName).toBe("Fərid Quliyev");

    const balanceAfter = (await call("GET", "/admin/hr/leave-balances?pageSize=50", undefined, manager)).data.items.find((b: any) => b.employeeId === target.id);
    expect(balanceAfter.usedDays).toBe(balanceBefore.usedDays + created.data.days);
    expect(balanceAfter.remainingDays).toBe(balanceBefore.remainingDays);

    // Təsdiqlənmiş məzuniyyət cədvəldə görünür
    const schedule = (await call("GET", `/admin/hr/schedule?period=${created.data.from.slice(0, 7)}`, undefined, manager)).data;
    const row = schedule.rows.find((r: any) => r.employeeId === target.id);
    expect(row.cells.some((c: any) => c.leaveType === "ANNUAL")).toBe(true);

    const cancelled = await call("POST", `/admin/hr/leaves/${created.data.id}/actions`, { code: "cancel" }, manager);
    expect(cancelled.data.status).toBe("CANCELLED");
  });

  it("əmək haqqı: hesablanma, vergi/tutulmalar, təsdiq və ödəniş", async () => {
    const accountant = await login("accountant@demo.az");
    const manager = await login("manager@demo.az");

    // Menecerin yaratmaq icazəsi yoxdur
    expect((await call("POST", "/admin/hr/payroll", { period: new Date().toISOString().slice(0, 7) }, manager)).status).toBe(403);

    const period = new Date().toISOString().slice(0, 7);
    const run = await call("POST", "/admin/hr/payroll", { period }, accountant);
    expect(run.status, JSON.stringify(run.data)).toBe(200);
    expect(run.data.status).toBe("CALCULATED");
    expect(run.data.lines.length).toBeGreaterThan(8);
    expect((await call("POST", "/admin/hr/payroll", { period }, accountant)).status).toBe(422);
    expect((await call("POST", "/admin/hr/payroll", { period: "2099-01" }, accountant)).status).toBe(422);

    const line = run.data.lines.find((l: any) => l.fullName === "Səbinə Axundova");
    const gross = money(line.gross);
    // 2100 ₼ aylıq maaş: gəlir vergisi 0 (8000-dən aşağı), DSMF 3%/10%, işsizlik 0.5%, tibbi 2%
    expect(money(line.incomeTax)).toBe(0);
    expect(money(line.socialEmployee)).toBeCloseTo(6 + (gross - 200) * 0.1, 1);
    expect(money(line.unemploymentEmployee)).toBeCloseTo(gross * 0.005, 1);
    expect(money(line.healthEmployee)).toBeCloseTo(gross * 0.02, 1);
    expect(money(line.net)).toBeCloseTo(gross - money(line.incomeTax) - money(line.socialEmployee) - money(line.unemploymentEmployee) - money(line.healthEmployee), 1);
    expect(money(line.employerCost)).toBeGreaterThan(gross);

    // Yüksək maaşda gəlir vergisi 8000 ₼-dən yuxarı hissəyə 14%
    const settings = (await call("GET", "/admin/hr/settings", undefined, accountant)).data;
    expect(money(settings.incomeTaxThreshold)).toBe(8000);
    expect(settings.incomeTaxRateAbove).toBe(14);

    const approved = await call("POST", `/admin/hr/payroll/${run.data.id}/actions`, { code: "approve" }, accountant);
    expect(approved.data.status).toBe("APPROVED");
    // Təsdiqlənmiş dövrdə davamiyyət düzəlişi bağlıdır
    const attendance = (await call("GET", "/admin/hr/attendance?pageSize=5", undefined, manager)).data.items[0];
    const locked = await call("PATCH", `/admin/hr/attendance/${attendance.id}`, { status: "ABSENT" }, manager);
    expect(locked.status).toBe(409);

    const paid = await call("POST", `/admin/hr/payroll/${run.data.id}/actions`, { code: "pay" }, accountant);
    expect(paid.data.status).toBe("PAID");
    expect(paid.data.paidAt).toBeTruthy();
    expect(paid.data.availableActions).toEqual([]);
  });

  it("self-service: əməkdaş öz kartını görür və müraciət göndərir", async () => {
    const operator = await login("operator@demo.az");
    const me = await call("GET", "/admin/hr/me", undefined, operator);
    expect(me.status).toBe(200);
    expect(me.data.employee.fullName).toBe("Nərmin Səfərova");
    expect(me.data.balance.usedDays).toBeGreaterThan(0);
    expect(me.data.schedule.length).toBeGreaterThan(27);

    const request = await call("POST", "/admin/hr/leaves", { type: "ANNUAL", from: day(30), to: day(34), reason: "Şəxsi" }, operator);
    expect(request.status, JSON.stringify(request.data)).toBe(200);
    // Operator öz müraciətini təsdiqləyə bilmir, yalnız ləğv edə bilər
    expect(request.data.availableActions.map((a: any) => a.code)).toEqual(["cancel"]);
    expect((await call("POST", `/admin/hr/leaves/${request.data.id}/actions`, { code: "approve" }, operator)).status).toBe(409);

    // Başqasının adına müraciət yaratmaq üçün icazə lazımdır
    const others = (await call("GET", "/admin/hr/employees?pageSize=50", undefined, await login("manager@demo.az"))).data.items;
    const other = others.find((e: any) => e.fullName === "Samir Qasımov");
    expect((await call("POST", "/admin/hr/leaves", { employeeId: other.id, type: "ANNUAL", from: day(40), to: day(42) }, operator)).status).toBe(403);
    expect((await call("GET", "/admin/hr/employees", undefined, operator)).status).toBe(403);
    expect((await call("GET", "/admin/hr/payroll", undefined, operator)).status).toBe(403);
  });

  it("ştat cədvəli və növbələr: CRUD, vakansiya hesabı və istifadədə olan vəzifənin silinməməsi", async () => {
    const admin = await login("admin@demo.az");
    const positions = (await call("GET", "/admin/hr/positions?pageSize=50", undefined, admin)).data.items;
    const tech = positions.find((p: any) => p.code === "TCH");
    expect(tech.occupiedCount).toBeGreaterThan(0);
    expect(tech.vacantCount).toBe(tech.plannedCount - tech.occupiedCount);
    expect((await call("DELETE", `/admin/hr/positions/${tech.id}`, undefined, admin)).status).toBe(409);

    const created = await call("POST", "/admin/hr/positions", { code: "hr_spec", titleI18n: { az: "HR mütəxəssisi", ru: "", en: "" }, department: "İdarəetmə", plannedCount: 2, salaryFrom: "1200", salaryTo: "1800" }, admin);
    expect(created.status, JSON.stringify(created.data)).toBe(200);
    expect(created.data.code).toBe("HR_SPEC");
    expect(created.data.vacantCount).toBe(2);
    expect((await call("POST", "/admin/hr/positions", { code: "hr_spec", titleI18n: { az: "Təkrar", ru: "", en: "" }, department: "İdarəetmə" }, admin)).status).toBe(422);

    const hire = await call("POST", "/admin/hr/employees", { fullName: "Aygün Nəsirli", positionId: created.data.id, department: "İdarəetmə", hiredAt: day(-5), salary: "1500", probationMonths: 3 }, admin);
    expect(hire.status, JSON.stringify(hire.data)).toBe(200);
    expect(hire.data.status).toBe("PROBATION");
    expect(hire.data.personnelNumber).toMatch(/^EMP-/);

    const afterHire = (await call("GET", "/admin/hr/positions?pageSize=50", undefined, admin)).data.items.find((p: any) => p.code === "HR_SPEC");
    expect(afterHire.occupiedCount).toBe(1);

    const terminated = await call("POST", `/admin/hr/employees/${hire.data.id}/terminate`, { reason: "Sınaq müddətini keçmədi" }, admin);
    expect(terminated.data.status).toBe("TERMINATED");
    expect(terminated.data.terminationReason).toBe("Sınaq müddətini keçmədi");
    const shifts = (await call("GET", "/admin/hr/shifts?pageSize=20", undefined, admin)).data.items;
    expect(shifts.find((s: any) => s.code === "N1").hours).toBeGreaterThan(7);
  });
});
