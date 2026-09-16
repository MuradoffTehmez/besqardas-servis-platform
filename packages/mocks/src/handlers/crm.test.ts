import { beforeEach, describe, expect, it } from "vitest";
import { getResponse } from "msw";
import { handlers } from "./index";
import { reset } from "../seed";
import { db } from "../db/state";

type Res = { status: number; data: any; cookie?: string };
async function call(method: string, path: string, body?: unknown, cookie?: string): Promise<Res> {
  const response = await getResponse(handlers, new Request(`http://localhost/api${path}`, { method, headers: { "Content-Type": "application/json", "x-mock-delay": "0", ...(cookie ? { cookie } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) }));
  if (!response) throw new Error(`Handler yoxdur: ${method} ${path}`);
  const text = await response.text();
  const sid = (response.headers.getSetCookie?.() ?? []).find((c) => c.startsWith("sid="));
  return { status: response.status, data: text ? JSON.parse(text) : null, cookie: sid?.split(";")[0] };
}
async function login(email: string) {
  const first = await call("POST", "/auth/login", { email, password: "Demo1234!" });
  if (first.data.status !== "TWO_FACTOR_REQUIRED") return first.cookie!;
  await call("POST", "/auth/2fa", { challengeId: first.data.challengeId, code: "123456" }, first.cookie);
  return first.cookie!;
}

describe("CRM satış qıfı", () => {
  beforeEach(() => reset());

  it("qıfın bütün mərhələlərini, dəyərini və fəaliyyət tarixçəsini qaytarır", async () => {
    const cookie = await login("manager@demo.az");
    const overview = await call("GET", "/admin/crm", undefined, cookie);
    expect(overview.status).toBe(200);
    expect(overview.data.stages.map((s: any) => s.code)).toEqual(["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"]);
    expect(overview.data.stats.open).toBeGreaterThan(0);
    expect(Number(overview.data.stats.pipelineValue.amount)).toBeGreaterThan(0);
    const lead = overview.data.stages.find((s: any) => s.leads.length).leads[0];
    const detail = await call("GET", `/admin/crm/leads/${lead.id}`, undefined, cookie);
    expect(detail.data.activities.length).toBeGreaterThan(0);
  });

  it("lead yaradır, mərhələni dəyişir, fəaliyyəti və telefoniya zəngini qeydə alır", async () => {
    const cookie = await login("sales@demo.az");
    const ownerId = db.users.find((u) => u.email === "sales@demo.az")!.id;
    const created = await call("POST", "/admin/crm/leads", { name: "Test Potensial", phone: "+994501112233", email: "potensial@example.az", source: "WEBSITE", estimatedValue: 3500, ownerId, note: "Üç kondisioner" }, cookie);
    expect(created.status, JSON.stringify(created.data)).toBe(200);
    expect(created.data.stage).toBe("NEW");
    expect(db.crmLeads.filter((lead) => lead.number === created.data.number)).toHaveLength(1);

    const callResult = await call("POST", `/admin/crm/leads/${created.data.id}/calls`, { outcome: "INTERESTED", durationSeconds: 245, note: "Görüş təyin edildi" }, cookie);
    expect(callResult.data.adapter.provider).toBe("MOCK_TELEPHONY");
    expect((await call("GET", `/admin/crm/leads/${created.data.id}`, undefined, cookie)).data.stage).toBe("CONTACTED");

    expect((await call("POST", `/admin/crm/leads/${created.data.id}/activities`, { type: "MEETING", subject: "Obyektə baxış", completed: false }, cookie)).status).toBe(200);
    const moved = await call("PATCH", `/admin/crm/leads/${created.data.id}`, { stage: "QUALIFIED" }, cookie);
    expect(moved.data.stage).toBe("QUALIFIED");
    expect(moved.data.probability).toBe(45);
  });

  it("lead-i təklifə və müştəriyə çevirir, itirilmiş lead üçün səbəb tələb edir", async () => {
    const cookie = await login("manager@demo.az");
    const proposalLead = db.crmLeads.find((l) => l.stage === "QUALIFIED")!;
    const quote = await call("POST", `/admin/crm/leads/${proposalLead.id}/convert`, { target: "QUOTE" }, cookie);
    expect(quote.data.stage).toBe("PROPOSAL");
    expect(quote.data.quoteNumber).toMatch(/^KT-CRM-/);

    const newLead = db.crmLeads.find((l) => l.stage === "NEW")!;
    const usersBefore = db.users.length;
    const converted = await call("POST", `/admin/crm/leads/${newLead.id}/convert`, { target: "CUSTOMER" }, cookie);
    expect(converted.data.stage).toBe("WON");
    expect(converted.data.customerId).toBeTruthy();
    expect(db.users.length).toBe(usersBefore + 1);

    const open = db.crmLeads.find((l) => l.stage === "CONTACTED")!;
    expect((await call("PATCH", `/admin/crm/leads/${open.id}`, { stage: "LOST" }, cookie)).status).toBe(422);
    expect((await call("PATCH", `/admin/crm/leads/${open.id}`, { stage: "LOST", lostReason: "Qiymət uyğun deyil" }, cookie)).data.stage).toBe("LOST");
  });

  it("CRM icazəsi olmayan rol qıfı görə bilmir", async () => {
    expect((await call("GET", "/admin/crm", undefined, await login("warehouse@demo.az"))).status).toBe(403);
  });
});
