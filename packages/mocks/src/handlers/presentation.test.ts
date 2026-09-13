import { beforeEach, describe, expect, it } from "vitest";
import { getResponse } from "msw";
import { handlers } from "./index";
import { ensureSeeded, reset } from "../seed";

async function request(path: string, body?: unknown, cookie?: string) {
  const response = await getResponse(
    handlers,
    new Request(`http://localhost/api${path}`, {
      method: body ? "POST" : "GET",
      headers: {
        "Content-Type": "application/json",
        "x-mock-delay": "0",
        ...(cookie ? { cookie } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    }),
  );
  if (!response) throw new Error(`Missing handler: ${path}`);
  return {
    status: response.status,
    data: await response.json(),
    cookie: response.headers.get("set-cookie")?.split(";")[0],
  };
}
describe("presentation API", () => {
  beforeEach(() => {
    ensureSeeded();
    reset();
  });
  it("rejects anonymous order access", async () => {
    expect((await request("/service-orders")).status).toBe(401);
  });
  it("serves a catalog detail with the original service ID", async () => {
    const catalog = await request("/services");
    const service = catalog.data.items[0];
    expect((await request(`/services/${service.slug}`)).data.id).toBe(service.id);
  });
  it("creates one customer order and keeps it isolated from another customer", async () => {
    const login = await request("/auth/login", { email: "aysel@demo.az", password: "Demo1234!" });
    expect(login.status).toBe(200);
    const services = await request("/services");
    const before = await request("/service-orders", undefined, login.cookie);
    const service = services.data.items[0];
    const created = await request(
      "/service-orders",
      {
        serviceId: service.id,
        executionForm: service.executionForms[0],
        description: "Test: cihaz işə düşmür.",
        addressId: login.data.session.addresses[0].id,
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
      },
      login.cookie,
    );
    expect(created.status).toBe(200);
    const after = await request("/service-orders", undefined, login.cookie);
    expect(after.data.items.length).toBe(before.data.items.length + 1);
    expect(after.data.items.filter((o: { id: string }) => o.id === created.data.id)).toHaveLength(
      1,
    );
    const other = await request("/auth/login", { email: "rashad@demo.az", password: "Demo1234!" });
    expect(
      (await request("/service-orders", undefined, other.cookie)).data.items.some(
        (o: { id: string }) => o.id === created.data.id,
      ),
    ).toBe(false);
  });
});
