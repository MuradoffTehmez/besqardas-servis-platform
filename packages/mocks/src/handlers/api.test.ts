import { beforeEach, describe, expect, it } from "vitest";
import { getResponse } from "msw";
import { handlers } from "./index";
import { reset } from "../seed";

/** API müqaviləsinin inteqrasiya testləri: rollar üzrə endpoint-lər və PRD §75.1 workflow ssenariləri. */

type Res = { status: number; data: any; cookie?: string };

async function call(method: string, path: string, body?: unknown, cookie?: string): Promise<Res> {
  const response = await getResponse(
    handlers,
    new Request(`http://localhost/api${path}`, {
      method,
      headers: { "Content-Type": "application/json", "x-mock-delay": "0", ...(cookie ? { cookie } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    }),
  );
  if (!response) throw new Error(`Handler yoxdur: ${method} ${path}`);
  const text = await response.text();
  const cookies = response.headers.getSetCookie?.() ?? [];
  const sid = cookies.find((c) => c.startsWith("sid="));
  return { status: response.status, data: text ? JSON.parse(text) : null, cookie: sid?.split(";")[0] };
}

async function login(email: string): Promise<string> {
  const r = await call("POST", "/auth/login", { email, password: "Demo1234!" });
  expect(r.status).toBe(200);
  if (r.data.status === "TWO_FACTOR_REQUIRED") {
    const t = await call("POST", "/auth/2fa", { challengeId: r.data.challengeId, code: "123456" }, r.cookie);
    expect(t.status).toBe(200);
  }
  return r.cookie!;
}

async function courierLogin(phone: string): Promise<string> {
  const req = await call("POST", "/auth/otp/request", { phone, purpose: "LOGIN" });
  expect(req.status).toBe(200);
  const v = await call("POST", "/auth/otp/verify", { phone, code: "123456", challengeId: req.data.challengeId });
  expect(v.status).toBe(200);
  return v.cookie!;
}

const act = (id: string, cookie: string, body: Record<string, unknown>) => call("POST", `/service-orders/${id}/actions`, body, cookie);
const find = (order: any, code: string) => order.availableActions.find((a: any) => a.code === code);

describe("API endpoint-ləri rollar üzrə", () => {
  beforeEach(() => reset());

  it("public endpoint-lər", async () => {
    for (const p of ["/branding", "/home", "/services", "/services/kondisioner-temiri", "/technicians", "/plans?group=CUSTOMER", "/faq", "/categories", "/products?category=kondisionerler&attr.cooling_btu=12000", "/products/lg-dualcool-inverter", "/search?q=LG%2018000%20compressor", "/content/pages/about", "/branches", "/equipment-categories"]) {
      const r = await call("GET", p);
      expect(r.status, p).toBe(200);
    }
    const search = await call("GET", "/search?q=кондиционер");
    expect(search.data.total).toBeGreaterThan(0);
  });

  it("müştəri, usta, kuryer, B2B və admin endpoint-ləri 5xx qaytarmır", async () => {
    const matrix: [string, string[]][] = [
      ["aysel@demo.az", ["/account/dashboard", "/account/profile", "/account/addresses", "/account/devices", "/service-orders", "/account/orders", "/account/returns", "/account/subscription", "/account/payments", "/account/warranties", "/account/documents", "/notifications", "/notifications/preferences", "/account/reviews", "/account/family", "/account/security", "/favorites", "/cart", "/checkout/options"]],
      ["elvin@demo.az", ["/technician/dashboard", "/technician/offers", "/technician/jobs", "/technician/schedule", "/technician/specializations", "/technician/inventory", "/technician/reservations", "/technician/customers", "/technician/earnings", "/technician/reviews", "/technician/documents", "/technician/statistics", "/technician/settings", "/account/subscription"]],
      ["kamran@demo.az", ["/technician/dashboard", "/technician/inventory", "/technician/earnings"]],
      ["corporate@demo.az", ["/b2b/dashboard", "/b2b/sites", "/b2b/devices", "/service-orders", "/b2b/schedule", "/b2b/contracts", "/b2b/reports", "/b2b/users", "/b2b/balance"]],
      ["partner@demo.az", ["/b2b/dashboard", "/b2b/commissions", "/service-orders", "/products?pageSize=5"]],
      ["wholesale@demo.az", ["/b2b/dashboard", "/b2b/quotes", "/b2b/balance"]],
      ["superadmin@demo.az", ["/admin/dashboard", "/admin/dispatch", "/admin/estimates", "/admin/logistics", "/admin/warranty-claims", "/admin/workflow-templates", "/admin/fee-rules", "/admin/reason-codes", "/admin/services", "/admin/customers", "/admin/technicians", "/admin/technicians-verification", "/admin/licenses", "/admin/partnerships", "/admin/couriers", "/admin/employees", "/admin/b2b-accounts", "/admin/partner-types", "/admin/users", "/admin/roles", "/admin/products", "/admin/categories", "/admin/brands", "/admin/models", "/admin/attributes", "/admin/compatibility", "/admin/units", "/admin/unit-conversions", "/admin/sales-orders", "/admin/returns", "/admin/quotes", "/admin/price-lists", "/admin/promotions", "/admin/inventory", "/admin/warehouses", "/admin/warehouse-groups", "/admin/stock-movements", "/admin/reservations", "/admin/transfers", "/admin/stock-counts", "/admin/purchases", "/admin/suppliers", "/admin/subscription-plans", "/admin/subscriptions", "/admin/payments", "/admin/documents", "/admin/cash-desks", "/admin/technician-settlements", "/admin/partner-commissions", "/admin/finance", "/admin/costing-methods", "/admin/tax-settings", "/admin/notification-templates", "/admin/reviews", "/admin/content/pages", "/admin/content/faq", "/admin/content/banners", "/admin/branches", "/admin/service-zones", "/admin/settings", "/admin/branding", "/admin/integrations", "/admin/audit-logs", "/admin/reports", "/admin/kpi-targets", "/admin/lookups"]],
    ];
    for (const [email, paths] of matrix) {
      const cookie = await login(email);
      for (const p of paths) {
        const r = await call("GET", p, undefined, cookie);
        expect(r.status, `${email} ${p}: ${JSON.stringify(r.data)?.slice(0, 200)}`).toBe(200);
      }
    }
    const courier = await courierLogin("+994553334455");
    expect((await call("GET", "/courier/tasks", undefined, courier)).status).toBe(200);
  });

  it("RBAC: icazəsiz rol admin resurslarına çıxa bilmir", async () => {
    const warehouse = await login("warehouse@demo.az");
    expect((await call("GET", "/admin/inventory", undefined, warehouse)).status).toBe(200);
    expect((await call("GET", "/admin/payments", undefined, warehouse)).status).toBe(403);
    expect((await call("PUT", "/admin/roles/OPERATOR", { permissions: [] }, await login("admin@demo.az"))).status).toBe(403);
    const customer = await login("rashad@demo.az");
    expect((await call("GET", "/admin/dashboard", undefined, customer)).status).toBeLessThan(500);
    expect((await call("GET", "/admin/users", undefined, customer)).status).toBe(403);
  });
});

describe("Servis workflow ssenariləri (PRD §75.1)", () => {
  beforeEach(() => reset());

  it("B — ünvanda təmir: sifariş → təyinat → diaqnostika → smeta təsdiqi → təmir → ödəniş → bağlanma", async () => {
    const customer = await login("rashad@demo.az");
    const operator = await login("operator@demo.az");
    const dispatcher = await login("dispatcher@demo.az");
    const tech = await login("elvin@demo.az");
    const accountant = await login("accountant@demo.az");
    const services = await call("GET", "/services?pageSize=50");
    const svc = services.data.items.find((s: any) => s.slug === "kondisioner-temiri");
    const session = await call("GET", "/auth/session", undefined, customer);
    const slots = await call("GET", `/services/${svc.id}/slots?addressId=${session.data.addresses[0].id}`, undefined, customer);
    const slot = slots.data.flatMap((d: any) => d.slots).find((s: any) => s.available && !s.urgent);
    let r = await call("POST", "/service-orders", { serviceId: svc.id, executionForm: "ON_SITE", description: "Kondisioner soyutmur", addressId: session.data.addresses[0].id, slotStart: slot.start, contactChannel: "WHATSAPP", problemCode: "NOT_COOLING" }, customer);
    expect(r.status, JSON.stringify(r.data)).toBe(200);
    const id = r.data.id;
    expect(r.data.status).toBe("NEW");

    r = await act(id, operator, { action: "confirm" });
    expect(r.data.status).toBe("CONFIRMED");
    const assignStage = r.data.stages.find((s: any) => s.type === "ASSIGNMENT");
    r = await act(id, dispatcher, { action: "assign", stageId: assignStage.id, technicianId: (await call("GET", "/auth/session", undefined, tech)).data.user.id });
    expect(r.status, JSON.stringify(r.data)).toBe(200);

    const offers = await call("GET", "/technician/offers", undefined, tech);
    expect(offers.data.some((o: any) => o.orderId === id)).toBe(true);
    let o = (await call("GET", `/service-orders/${id}`, undefined, tech)).data;
    for (const code of ["accept", "start_travel", "arrive", "start"]) {
      const a = find(o, code);
      expect(a, `${code}: ${o.availableActions.map((x: any) => x.code)}`).toBeTruthy();
      o = (await act(id, tech, { action: code, stageId: a.stageId })).data;
    }
    const materials = await call("GET", `/technician/jobs/${id}/materials`, undefined, tech);
    const part = materials.data[0];
    const est = find(o, "submit_estimate");
    r = await act(id, tech, { action: "submit_estimate", stageId: est.stageId, lines: [{ type: "MATERIAL", productId: part.variantId, name: "x", quantity: "1", unit: part.baseUnit, optional: false, ownMaterial: false }, { type: "LABOR", name: "Usta xidməti", quantity: "1", unit: "pcs", unitPrice: "40.00", optional: false, ownMaterial: false }, { type: "EXTRA", name: "Filtr təmizliyi", quantity: "1", unit: "pcs", unitPrice: "15.00", optional: true, ownMaterial: false }], photos: [{ name: "d.jpg" }] });
    expect(r.status, JSON.stringify(r.data)).toBe(200);
    expect(r.data.status).toBe("WAITING_FOR_CUSTOMER");

    const customerView = (await call("GET", `/service-orders/${id}`, undefined, customer)).data;
    expect(customerView.stages.every((s: any) => s.customerName)).toBe(true);
    const optional = customerView.estimate.lines.find((l: any) => l.optional);
    r = await call("POST", `/service-orders/${id}/estimate/decision`, { decision: "PARTIAL", declinedLineIds: [optional.id], channel: "CABINET" }, customer);
    expect(r.status, JSON.stringify(r.data)).toBe(200);
    expect(r.data.estimate.status).toBe("PARTIALLY_APPROVED");

    for (let i = 0; i < 12; i++) {
      o = (await call("GET", `/service-orders/${id}`, undefined, tech)).data;
      if (o.status === "COMPLETED") break;
      const next = o.availableActions.find((a: any) => a.stageId && ["start", "complete_stage", "part_arrived", "accept"].includes(a.code));
      expect(next, `stuck: ${o.stages.map((s: any) => `${s.type}:${s.status}`).join(",")}`).toBeTruthy();
      const stage = o.stages.find((s: any) => s.id === next.stageId);
      r = await act(id, tech, { action: next.code, stageId: next.stageId, photos: [{ name: "p.jpg" }], signed: true, checklist: stage.checklist.map((c: any) => ({ ...c, done: true })) });
      expect(r.status, JSON.stringify(r.data)).toBe(200);
    }
    expect(o.status).toBe("COMPLETED");
    const pay = find((await call("GET", `/service-orders/${id}`, undefined, accountant)).data, "record_payment");
    r = await act(id, accountant, { action: "record_payment", payment: { method: "CARD_POS", amount: pay.payload.dueAmount } });
    expect(r.data.dueAmount.amount).toBe("0.00");
    r = await act(id, accountant, { action: "close" });
    expect(r.data.status).toBe("CLOSED");
    expect(r.data.documents.map((d: any) => d.type)).toEqual(expect.arrayContaining(["SERVICE_ACT", "INVOICE", "FISCAL_RECEIPT", "WARRANTY"]));
    const earnings = await call("GET", "/technician/earnings", undefined, tech);
    expect(earnings.data.lines.some((l: any) => l.orderId === id)).toBe(true);
  });

  it("D — götürmə-çatdırma: smetadan imtina → cihaz geri çatdırılır, haqq Premium üçün tətbiq olunmur", async () => {
    const admin = await login("superadmin@demo.az");
    const orders = await call("GET", "/service-orders?pageSize=200", undefined, admin);
    const sv = orders.data.items.find((x: any) => x.number === "SV-1070");
    let o = (await call("GET", `/service-orders/${sv.id}`, undefined, admin)).data;
    const returnStage = o.stages.find((s: any) => s.type === "LOGISTICS" && s.status === "READY");
    expect(returnStage).toBeTruthy();
    expect(o.fees.length).toBe(0);
    const couriers = await call("GET", "/admin/couriers-available", undefined, admin);
    o = (await act(sv.id, admin, { action: "assign_courier", stageId: returnStage.id, technicianId: couriers.data.find((c: any) => c.kind === "COURIER").id })).data;
    const courier = await courierLogin("+994553334455");
    const tasks = await call("GET", "/courier/tasks?view=today", undefined, courier);
    const upcoming = await call("GET", "/courier/tasks?view=upcoming", undefined, courier);
    const task = [...tasks.data.items, ...upcoming.data.items].find((t: any) => t.relatedOrderNumber === "SV-1070");
    expect(task).toBeTruthy();
    for (const action of ["start", "picked_up", "in_transit", "delivered"]) {
      const r = await call("POST", `/courier/tasks/${task.id}/status`, { action, photos: 1, signed: true }, courier);
      expect(r.status, `${action}: ${JSON.stringify(r.data)}`).toBe(200);
    }
    o = (await call("GET", `/service-orders/${sv.id}`, undefined, admin)).data;
    const handover = o.stages.find((s: any) => s.type === "HANDOVER");
    expect(handover.status).toBe("READY");
    o = (await act(sv.id, admin, { action: "complete_stage", stageId: handover.id, signed: true })).data;
    expect(o.status).toBe("COMPLETED");
    expect(o.device.location).toBe("DELIVERED");
  });

  it("A — quraşdırma: ölçü → material → smeta → anbar → çatdırılma → quraşdırma → zəmanət", async () => {
    const admin = await login("superadmin@demo.az");
    const customer = await login("aysel@demo.az");
    const orders = await call("GET", "/service-orders?pageSize=200", undefined, admin);
    const sv = orders.data.items.find((x: any) => x.number === "SV-1054");
    let o = (await act(sv.id, admin, { action: "confirm" })).data;
    const tech = await login("kamran@demo.az");
    // müştərinin seçdiyi ustaya təklif göndərilib
    const offers = await call("GET", "/technician/offers", undefined, tech);
    expect(offers.data.some((x: any) => x.orderId === sv.id)).toBe(true);
    for (let i = 0; i < 90 && !["COMPLETED", "CLOSED"].includes(o.status); i++) {
      o = (await call("GET", `/service-orders/${sv.id}`, undefined, admin)).data;
      if (o.status === "WAITING_FOR_CUSTOMER") {
        o = (await call("POST", `/service-orders/${sv.id}/estimate/decision`, { decision: "APPROVE", channel: "CABINET" }, customer)).data;
        continue;
      }
      const priority = ["accept", "start_travel", "arrive", "start", "submit_estimate", "complete_stage", "part_arrived", "skip", "assign_courier"];
      const a = o.availableActions.filter((x: any) => x.stageId && priority.includes(x.code)).sort((x: any, y: any) => priority.indexOf(x.code) - priority.indexOf(y.code))[0];
      expect(a, o.stages.map((s: any) => `${s.type}:${s.status}`).join(",")).toBeTruthy();
      const stage = o.stages.find((s: any) => s.id === a.stageId);
      const body: Record<string, unknown> = { action: a.code, stageId: a.stageId, photos: [{ name: "x.jpg" }], signed: true, checklist: stage.checklist.map((c: any) => ({ ...c, done: true })) };
      if (a.code === "submit_estimate") body.lines = [{ type: "LABOR", name: "Standart quraşdırma", quantity: "1", unit: "pcs", unitPrice: "80.00", optional: false, ownMaterial: false }];
      const r = await act(sv.id, admin, body);
      expect(r.status, `${a.code}: ${JSON.stringify(r.data)}`).toBe(200);
      o = r.data;
    }
    expect(o.status, o.stages.map((s: any) => `${s.type}:${s.status}`).join(",") + " " + o.availableActions.map((x: any) => x.code)).toBe("COMPLETED");
    expect(o.warrantyNumber).toBeTruthy();
  });

  it("smeta rəddi — ünvanda: səbəb məcburidir, sifariş ləğv olunur", async () => {
    const customer = await login("aysel@demo.az");
    const list = await call("GET", "/service-orders", undefined, customer);
    const sv = list.data.items.find((x: any) => x.number === "SV-1052");
    expect((await call("POST", `/service-orders/${sv.id}/estimate/decision`, { decision: "REJECT", channel: "CABINET" }, customer)).status).toBe(422);
    const r = await call("POST", `/service-orders/${sv.id}/estimate/decision`, { decision: "REJECT", reasonCode: "TOO_EXPENSIVE", channel: "CABINET" }, customer);
    expect(r.data.status).toBe("CANCELLED");
  });

  it("plan limitləri: Basic müştəri birdəfəlik ünvan və təcili servis istifadə edə bilmir", async () => {
    const basic = await login("rashad@demo.az");
    const svc = (await call("GET", "/services/kondisioner-temiri")).data;
    const r = await call("POST", "/service-orders", { serviceId: svc.id, executionForm: "ON_SITE", description: "Test sifarişi", oneTimeAddress: { city: "Bakı", street: "Test küç. 1" }, contactChannel: "CALL" }, basic);
    expect(r.status).toBe(403);
    const u = await call("POST", "/service-orders", { serviceId: svc.id, executionForm: "ON_SITE", description: "Test sifarişi", urgent: true, addressId: (await call("GET", "/account/addresses", undefined, basic)).data.items[0].id, contactChannel: "CALL" }, basic);
    expect(u.status).toBe(403);
    const addr = await call("POST", "/account/addresses", { label: "İkinci", city: "Bakı", street: "Nizami küç. 5", isDefault: false }, basic);
    expect(addr.status).toBe(403);
  });
});

describe("Kommersiya axınları", () => {
  beforeEach(() => reset());

  it("qonaq səbəti → giriş → birləşmə → kartla checkout → provayder callback", async () => {
    const product = (await call("GET", "/products/lg-dualcool-inverter")).data;
    const add = await call("POST", "/cart/items", { variantId: product.variants[0].id, quantity: "1", unit: "pcs", withInstallation: false });
    expect(add.status, JSON.stringify(add.data)).toBe(200);
    const response = await getResponse(handlers, new Request("http://localhost/api/cart/items", { method: "POST", headers: { "Content-Type": "application/json", "x-mock-delay": "0" }, body: JSON.stringify({ variantId: product.variants[0].id, quantity: "1", unit: "pcs", withInstallation: false }) }));
    const cid = response!.headers.getSetCookie().find((c) => c.startsWith("cid="))!.split(";")[0]!;
    const loginRes = await getResponse(handlers, new Request("http://localhost/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json", "x-mock-delay": "0", cookie: cid }, body: JSON.stringify({ email: "gunel@demo.az", password: "Demo1234!" }) }));
    const sid = loginRes!.headers.getSetCookie().find((c) => c.startsWith("sid="))!.split(";")[0]!;
    const cart = await call("GET", "/cart", undefined, sid);
    expect(cart.data.items.some((i: any) => i.variantId === product.variants[0].id)).toBe(true);
    const promo = await call("POST", "/cart/promo", { code: "PAYIZ20" }, sid);
    expect(promo.status).toBe(200);
    const options = await call("GET", "/checkout/options", undefined, sid);
    const r = await call("POST", "/checkout", { deliveryMethod: "COURIER", addressId: options.data.addresses[0].id, paymentMethod: "CARD_ONLINE", idempotencyKey: "test-key-1" }, sid);
    expect(r.status, JSON.stringify(r.data)).toBe(200);
    expect(r.data.redirectUrl).toContain("/checkout/pay");
    const again = await call("POST", "/checkout", { deliveryMethod: "COURIER", addressId: options.data.addresses[0].id, paymentMethod: "CARD_ONLINE", idempotencyKey: "test-key-1" }, sid);
    expect(again.data.salesOrderId).toBe(r.data.salesOrderId);
    const cb = await call("POST", `/payments/${r.data.paymentId}/provider-callback`, { outcome: "success" }, sid);
    expect(cb.data.status).toBe("PAID");
    const order = await call("GET", `/account/orders/${r.data.salesOrderId}`, undefined, sid);
    expect(order.data.status).toBe("CONFIRMED");
  });

  it("topdan sürətli sifariş SKU ilə yoxlanılır", async () => {
    const w = await login("wholesale@demo.az");
    const r = await call("POST", "/b2b/quick-order/validate", { lines: [{ sku: "MU-CU-952", quantity: "60" }, { sku: "YOXDUR", quantity: "1" }] }, w);
    expect(r.data.lines[0].found).toBe(true);
    expect(r.data.lines[1].found).toBe(false);
  });

  it("transfer: yaradılma → təsdiq → göndərmə → qəbul (uyğunsuzluq qeydi ilə)", async () => {
    const wh = await login("warehouse@demo.az");
    const lookups = (await call("GET", "/admin/lookups", undefined, wh)).data;
    const inv = (await call("GET", "/admin/inventory?pageSize=100", undefined, wh)).data.items.find((x: any) => Number(x.available.value) > 5 && x.warehouseType === "CENTRAL");
    const to = lookups.warehouses.find((x: any) => x.type === "MOBILE");
    let t = await call("POST", "/admin/transfers", { fromWarehouseId: inv.warehouseId, toWarehouseId: to.id, lines: [{ variantId: inv.variantId, quantity: "2", unit: inv.physical.unit }] }, wh);
    expect(t.status, JSON.stringify(t.data)).toBe(200);
    for (const op of ["approve", "ship"]) t = await call("POST", `/admin/transfers/${t.data.id}/${op}`, {}, wh);
    expect(t.data.status).toBe("IN_TRANSIT");
    const bad = await call("POST", `/admin/transfers/${t.data.id}/receive`, { received: { [t.data.lines[0].id]: "1" } }, wh);
    expect(bad.status).toBe(422);
    t = await call("POST", `/admin/transfers/${t.data.id}/receive`, { received: { [t.data.lines[0].id]: "1" }, note: "1 ədəd zədəli gəldi" }, wh);
    expect(t.data.status).toBe("DISCREPANCY");
  });
});
