import { beforeEach, describe, expect, it } from "vitest";
import { getResponse } from "msw";
import { handlers } from "./index";
import { reset } from "../seed";

/** Help Desk API testləri: müştəri ↔ əməkdaş axını, SLA pauzası, eskalasiya, RBAC və sahiblik yoxlaması. */

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

describe("Help Desk", () => {
  beforeEach(() => reset());

  it("müştəri müraciəti → götürmə → cavab (SLA pauza) → müştəri cavabı → həll → qiymətləndirmə", async () => {
    const customer = await login("rashad@demo.az");
    const operator = await login("operator@demo.az");
    const categories = (await call("GET", "/support/categories")).data;
    expect(categories.length).toBeGreaterThan(5);

    const invalid = await call("POST", "/support/tickets", { categoryId: "", subject: "abc", body: "qısa" }, customer);
    expect(invalid.status).toBe(422);
    expect(Object.keys(invalid.data.fieldErrors)).toEqual(expect.arrayContaining(["categoryId", "subject", "body"]));
    expect(invalid.data.fieldErrors.subject).toEqual(["validation.subjectMin"]);

    const service = categories.find((c: any) => c.code === "SERVICE_ISSUE");
    const created = await call("POST", "/support/tickets", { categoryId: service.id, subject: "Usta gəlmədi, zəng də etmədi", body: "Sifariş saat 14:00-a idi, heç kim gəlmədi və zəng etmədi." }, customer);
    expect(created.status, JSON.stringify(created.data)).toBe(200);
    expect(created.data).toMatchObject({ status: "NEW", channel: "PORTAL", priority: "NORMAL" });
    expect(created.data.availableActions.map((a: any) => a.code)).toEqual(["mark_resolved"]);
    const id = created.data.id;

    const queue = (await call("GET", "/admin/tickets?_view=unassigned&pageSize=100", undefined, operator)).data;
    expect(queue.items.some((t: any) => t.id === id)).toBe(true);

    let t = (await call("POST", `/admin/tickets/${id}/actions`, { code: "take" }, operator)).data;
    expect(t.status).toBe("OPEN");
    expect(t.assigneeName).toBe("Nərmin Səfərova");

    t = (await call("POST", `/admin/tickets/${id}/messages`, { body: "Daxili: dispetçerlə yoxlanılır", internal: true }, operator)).data;
    expect(t.sla.firstRespondedAt).toBeNull();
    t = (await call("POST", `/admin/tickets/${id}/messages`, { body: "Üzr istəyirik, sabah üçün yeni vaxt təklif edirik. Uyğundurmu?", statusAfter: "PENDING_CUSTOMER" }, operator)).data;
    expect(t.status).toBe("PENDING_CUSTOMER");
    expect(t.sla.state).toBe("PAUSED");
    expect(t.sla.firstRespondedAt).not.toBeNull();

    const mine = (await call("GET", `/support/tickets/${id}`, undefined, customer)).data;
    expect(mine.messages.some((m: any) => m.kind === "INTERNAL")).toBe(false);
    expect(mine.messages.at(-1).authorName).toContain("Nərmin ·");
    expect(mine.history).toEqual([]);

    const replied = (await call("POST", `/support/tickets/${id}/messages`, { body: "Sabah saat 11:00 uyğundur." }, customer)).data;
    expect(replied.status).toBe("OPEN");
    expect(replied.sla.state).not.toBe("PAUSED");

    t = (await call("POST", `/admin/tickets/${id}/actions`, { code: "resolve" }, operator)).data;
    expect(t.status).toBe("RESOLVED");
    const rateable = (await call("GET", `/support/tickets/${id}`, undefined, customer)).data;
    expect(rateable.availableActions.map((a: any) => a.code)).toEqual(expect.arrayContaining(["reopen", "rate"]));

    expect((await call("POST", `/support/tickets/${id}/actions`, { code: "rate" }, customer)).status).toBe(422);
    const rated = (await call("POST", `/support/tickets/${id}/actions`, { code: "rate", rating: 5, comment: "Tez həll etdilər" }, customer)).data;
    expect(rated.csat).toMatchObject({ rating: 5 });
    expect((await call("POST", `/support/tickets/${id}/actions`, { code: "rate", rating: 1 }, customer)).status).toBe(409);

    const stats = (await call("GET", "/admin/tickets/stats", undefined, operator)).data;
    expect(stats.csatCount).toBeGreaterThan(0);
    expect(stats.byQueue).toHaveLength(6);
  });

  it("sahiblik: başqasının müraciəti və sifarişi görünmür", async () => {
    const aysel = await login("aysel@demo.az");
    const rashad = await login("rashad@demo.az");
    const own = (await call("GET", "/support/tickets", undefined, aysel)).data.items;
    expect(own.length).toBeGreaterThan(0);
    expect((await call("GET", `/support/tickets/${own[0].id}`, undefined, rashad)).status).toBe(404);

    const related = (await call("GET", "/support/related", undefined, aysel)).data;
    const order = related.find((r: any) => r.type === "SERVICE_ORDER");
    const categories = (await call("GET", "/support/categories")).data;
    const bad = await call("POST", "/support/tickets", { categoryId: categories[0].id, subject: "Başqasının sifarişi", body: "Bu sifariş mənə aid deyil, amma bağlamağa çalışıram.", relatedType: "SERVICE_ORDER", relatedId: order.id }, rashad);
    expect(bad.status).toBe(422);
    expect(bad.data.fieldErrors.relatedId).toBeDefined();
    const ok = await call("POST", "/support/tickets", { categoryId: categories[0].id, subject: "Öz sifarişim üzrə sual", body: "Sifarişimdə usta hansı hissəni dəyişdi?", relatedType: "SERVICE_ORDER", relatedId: order.id }, aysel);
    expect(ok.data.related).toMatchObject({ type: "SERVICE_ORDER", number: order.number });
    // Premium müştərinin müraciəti bir pillə yüksək prioritetlə açılır
    expect(ok.data.priority).toBe("HIGH");
  });

  it("qonaq əlaqə forması və RBAC", async () => {
    const noContact = await call("POST", "/support/contact", { topic: "General", name: "Qonaq", message: "Filial ünvanı haradadır?" });
    expect(noContact.status).toBe(422);
    const guest = await call("POST", "/support/contact", { topic: "Warranty", name: "Qonaq İstifadəçi", phone: "+994501234567", orderNumber: "sv-1052", message: "Zəmanət müddətim nə vaxt bitir?" });
    expect(guest.status).toBe(200);
    expect(guest.data.number).toMatch(/^TK-/);
    expect(guest.data.trackLink).toBeNull();

    const warehouse = await login("warehouse@demo.az");
    const operator = await login("operator@demo.az");
    const found = (await call("GET", "/admin/tickets?_view=all&q=Qonaq&pageSize=50", undefined, operator)).data.items.find((x: any) => x.id === guest.data.id);
    expect(found).toMatchObject({ channel: "WEB_FORM", queue: "WARRANTY", relatedNumber: null, tags: ["SV-1052", "unverified-order"] });

    expect((await call("GET", `/admin/tickets/${guest.data.id}`, undefined, warehouse)).status).toBe(200);
    expect((await call("POST", `/admin/tickets/${guest.data.id}/messages`, { body: "Salam" }, warehouse)).status).toBe(403);
    expect((await call("GET", "/admin/tickets", undefined, await login("rashad@demo.az"))).status).toBe(403);

    const hold = await call("POST", `/admin/tickets/${guest.data.id}/actions`, { code: "hold" }, operator);
    expect(hold.status).toBe(422);
    expect((await call("POST", `/admin/tickets/${guest.data.id}/actions`, { code: "rate" }, operator)).status).toBe(409);
    const sales = await login("sales@demo.az");
    expect((await call("POST", `/admin/tickets/${guest.data.id}/actions`, { code: "assign", assigneeId: guest.data.id }, sales)).status).toBe(409);
  });

  it("SLA pozuntusu eskalasiya olunur, avtomatik təyinat və servis sifarişi yaradılır", async () => {
    const manager = await login("manager@demo.az");
    const breached = (await call("GET", "/admin/tickets?_view=breached&pageSize=50", undefined, manager)).data.items;
    expect(breached.length).toBeGreaterThan(0);
    expect(breached.every((t: any) => t.sla.state === "BREACHED" && t.sla.escalationLevel >= 1)).toBe(true);
    const notifications = (await call("GET", "/notifications?pageSize=100", undefined, manager)).data;
    const items = notifications.items ?? notifications;
    expect(items.some((n: any) => n.event === "TICKET_SLA_BREACH")).toBe(true);

    const unassigned = (await call("GET", "/admin/tickets?_view=unassigned&pageSize=50", undefined, manager)).data.items.find((t: any) => t.requesterId);
    const assigned = (await call("POST", `/admin/tickets/${unassigned.id}/actions`, { code: "auto_assign" }, manager)).data;
    expect(assigned.assigneeId).toBeTruthy();
    expect(assigned.status).toBe("OPEN");

    const operator = await login("operator@demo.az");
    const detail = (await call("GET", `/admin/tickets/${unassigned.id}`, undefined, operator)).data;
    expect(detail.requester).toBeTruthy();
    const lookups = (await call("GET", "/admin/lookups", undefined, operator)).data;
    const onSite = lookups.services.find((s: any) => s.executionForms.includes("ON_SITE"));
    const missing = await call("POST", `/admin/tickets/${unassigned.id}/service-order`, { serviceId: onSite.id, executionForm: "ON_SITE" }, operator);
    expect(detail.requester.addresses.length).toBeGreaterThan(0);
    {
      expect(missing.status).toBe(422);
      const r = await call("POST", `/admin/tickets/${unassigned.id}/service-order`, { serviceId: onSite.id, executionForm: "ON_SITE", addressId: detail.requester.addresses[0].id }, operator);
      expect(r.status, JSON.stringify(r.data)).toBe(200);
      expect(r.data.orderNumber).toMatch(/^SV-/);
      expect(r.data.ticket.serviceOrderNumber).toBe(r.data.orderNumber);
      expect(r.data.ticket.availableActions.some((a: any) => a.code === "create_service_order")).toBe(false);
    }
  });

  it("kateqoriya və hazır cavab CRUD, SLA qaydası yoxlanılır", async () => {
    const admin = await login("admin@demo.az");
    const bad = await call("POST", "/admin/ticket-categories", { code: "X", nameI18n: { az: "X", ru: "", en: "" }, queue: "GENERAL", defaultPriority: "NORMAL", sla: { LOW: { firstResponseMinutes: 60, resolutionMinutes: 30 }, NORMAL: { firstResponseMinutes: 60, resolutionMinutes: 120 }, HIGH: { firstResponseMinutes: 30, resolutionMinutes: 60 }, URGENT: { firstResponseMinutes: 10, resolutionMinutes: 30 } } }, admin);
    expect(bad.status).toBe(422);
    const created = await call("POST", "/admin/ticket-categories", { code: "delivery_damage", nameI18n: { az: "Çatdırılmada zədə", ru: "", en: "" }, queue: "SALES", defaultPriority: "HIGH" }, admin);
    expect(created.status).toBe(200);
    expect(created.data.code).toBe("DELIVERY_DAMAGE");
    const canned = await call("POST", "/admin/canned-responses", { shortcut: "test", titleI18n: { az: "Test", ru: "", en: "" }, bodyI18n: { az: "Salam", ru: "", en: "" } }, admin);
    expect(canned.data.shortcut).toBe("/test");
    const inUse = (await call("GET", "/admin/ticket-categories?pageSize=50", undefined, admin)).data.items.find((c: any) => c.code === "SERVICE_ISSUE");
    expect((await call("DELETE", `/admin/ticket-categories/${inUse.id}`, undefined, admin)).status).toBe(409);
  });
});
