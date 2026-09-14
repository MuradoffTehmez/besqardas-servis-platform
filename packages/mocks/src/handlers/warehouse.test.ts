import { beforeEach, describe, expect, it } from "vitest";
import { getResponse } from "msw";
import { handlers } from "./index";
import { reset } from "../seed";

/** Mal qəbulu, məhsul şəkilləri, profil şəkli və şirkət profili üzrə API testləri. */

type Res = { status: number; data: any; cookie?: string };

// 1×1 PNG
const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

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

describe("Anbar, media və profil", () => {
  beforeEach(() => reset());

  it("mal qəbulu: qaralama → təsdiq qalığı artırır → əks hərəkət", async () => {
    const wh = await login("warehouse@demo.az");
    const lookups = (await call("GET", "/admin/lookups", undefined, wh)).data;
    // SC-302 sayımı mərkəzi anbarı bloklayır — filial anbarından istifadə olunur
    const central = lookups.warehouses.find((w: any) => w.type !== "CENTRAL" && w.type !== "MOBILE");
    const found = (await call("GET", "/admin/variants/search?q=LG", undefined, wh)).data[0];
    const before = (await call("GET", `/admin/inventory?pageSize=500&warehouseId=${central.id}`, undefined, wh)).data.items.filter((r: any) => r.variantId === found.id && r.purpose === "SALES").reduce((s: number, r: any) => s + Number(r.physical.value), 0);

    const invalid = await call("POST", "/admin/goods-receipts", { warehouseId: central.id, lines: [{ variantId: found.id, quantity: "2", unitCost: "", serials: ["A"] }] }, wh);
    expect(invalid.status).toBe(422);
    expect(Object.keys(invalid.data.fieldErrors)).toEqual(expect.arrayContaining(["lines.0.unitCost", "lines.0.serials"]));

    const draft = await call("POST", "/admin/goods-receipts", { warehouseId: central.id, supplierName: "Test MMC", invoiceNumber: "INV-1", lines: [{ variantId: found.id, quantity: "3", unitCost: "450", zone: "A-02", serials: ["S1", "S2", "S3"] }], attachments: [{ name: "qaime.png", dataUrl: PNG }] }, wh);
    expect(draft.status, JSON.stringify(draft.data)).toBe(200);
    expect(draft.data.status).toBe("DRAFT");
    expect(draft.data.attachments).toHaveLength(1);

    const posted = await call("POST", `/admin/goods-receipts/${draft.data.id}/post`, {}, wh);
    expect(posted.data.status).toBe("POSTED");
    expect(posted.data.lines[0].movementNumber).toMatch(/^MV-/);
    const after = (await call("GET", `/admin/inventory?pageSize=500&warehouseId=${central.id}`, undefined, wh)).data.items.filter((r: any) => r.variantId === found.id && r.purpose === "SALES").reduce((s: number, r: any) => s + Number(r.physical.value), 0);
    expect(after).toBe(before + 3);

    const noReason = await call("POST", `/admin/goods-receipts/${draft.data.id}/reverse`, {}, wh);
    expect(noReason.status).toBe(422);
    const reversed = await call("POST", `/admin/goods-receipts/${draft.data.id}/reverse`, { note: "Səhv qaimə" }, wh);
    expect(reversed.data.status).toBe("REVERSED");
  });

  it("sayım bloku olan anbarda qaimə təsdiqlənmir", async () => {
    const wh = await login("warehouse@demo.az");
    const lookups = (await call("GET", "/admin/lookups", undefined, wh)).data;
    const central = lookups.warehouses.find((w: any) => w.type === "CENTRAL");
    const v = (await call("GET", "/admin/variants/search?limit=1", undefined, wh)).data[0];
    const r = await call("POST", "/admin/goods-receipts", { warehouseId: central.id, lines: [{ variantId: v.id, quantity: "1", unitCost: "1" }], post: true }, wh);
    expect(r.status).toBe(409);
    expect(r.data.code).toBe("WAREHOUSE_BLOCKED");
  });

  it("barkodla dəqiq axtarış ilk nəticəni qaytarır", async () => {
    const wh = await login("warehouse@demo.az");
    const any = (await call("GET", "/admin/variants/search?limit=1", undefined, wh)).data[0];
    const r = await call("GET", `/admin/variants/search?q=${any.barcode}`, undefined, wh);
    expect(r.data[0].id).toBe(any.id);
    expect(r.data[0].exact).toBe(true);
  });

  it("yeni məhsul şəkil və ilkin qalıqla yaradılır, şəkillər idarə olunur", async () => {
    const admin = await login("superadmin@demo.az");
    const lookups = (await call("GET", "/admin/lookups", undefined, admin)).data;
    const r = await call("POST", "/admin/products", { nameI18n: { az: "Test filtr", ru: "Тест", en: "Test" }, slug: "test-filtr", sku: "TST-001", barcode: "4760000999999", brandId: lookups.brands[0].id, categoryId: lookups.categories[0].id, baseUnit: "pcs", type: "CONSUMABLE", status: "ACTIVE", retailPrice: "25", images: [{ dataUrl: PNG, name: "a.png" }, { dataUrl: PNG, name: "b.png" }], initialStock: { warehouseId: lookups.warehouses[0].id, quantity: "12", unitCost: "14" } }, admin);
    expect(r.status, JSON.stringify(r.data)).toBe(200);
    expect(r.data.movementNumber).toMatch(/^MV-/);
    let p = (await call("GET", `/admin/products/${r.data.id}`, undefined, admin)).data;
    expect(p.gallery).toHaveLength(2);
    expect(p.imageUrl.startsWith("data:image/png")).toBe(true);
    const second = p.gallery[1].id;
    let g = await call("PATCH", `/admin/products/${r.data.id}/media/${second}`, { primary: true }, admin);
    expect(g.data[0].id).toBe(second);
    g = await call("DELETE", `/admin/products/${r.data.id}/media/${second}`, undefined, admin);
    expect(g.data).toHaveLength(1);
    expect(g.data[0].primary).toBe(true);
    const bad = await call("POST", `/admin/products/${r.data.id}/media`, { files: [{ dataUrl: "data:text/plain;base64,aGVsbG8=" }] }, admin);
    expect(bad.status).toBe(422);
    p = (await call("GET", "/products/test-filtr", undefined, admin)).data;
    expect(p.gallery[0].url.startsWith("data:image/png")).toBe(true);
  });

  it("profil şəkli və əlavə profil sahələri", async () => {
    const sid = await login("aysel@demo.az");
    const up = await call("PUT", "/account/avatar", { dataUrl: PNG }, sid);
    expect(up.status).toBe(200);
    const session = await call("GET", "/auth/session", undefined, sid);
    expect(session.data.user.avatarUrl).toBe(PNG);
    const bad = await call("PUT", "/account/avatar", { dataUrl: "not-an-image" }, sid);
    expect(bad.status).toBe(422);
    const patch = await call("PATCH", "/account/profile", { firstName: "Aysel", lastName: "Məmmədova", locale: "az", city: "Gəncə", gender: "FEMALE", preferredChannel: "WHATSAPP" }, sid);
    expect(patch.status).toBe(200);
    const prof = (await call("GET", "/account/profile", undefined, sid)).data;
    expect(prof).toMatchObject({ city: "Gəncə", gender: "FEMALE", preferredChannel: "WHATSAPP" });
    expect(prof.completeness).toBeGreaterThan(50);
    const activity = await call("GET", "/account/activity", undefined, sid);
    expect(activity.data.items.some((e: any) => e.action === "upload_avatar")).toBe(true);
    await call("DELETE", "/account/avatar", undefined, sid);
    expect((await call("GET", "/auth/session", undefined, sid)).data.user.avatarUrl).toBeNull();
  });

  it("şirkət profili: yalnız səlahiyyətli rol redaktə edir, IBAN yoxlanılır", async () => {
    const sid = await login("corporate@demo.az");
    const c = await call("GET", "/b2b/company", undefined, sid);
    expect(c.status).toBe(200);
    const bad = await call("PATCH", "/b2b/company", { bankDetails: { bank: "Kapital", iban: "123", swift: "AIIBAZ2X" } }, sid);
    expect(bad.status).toBe(c.data.canEdit ? 422 : 403);
    if (c.data.canEdit) {
      const ok = await call("PATCH", "/b2b/company", { website: "https://azerholding.az", bankDetails: { bank: "Kapital Bank", iban: "AZ21NABZ00000000137010001944", swift: "aiibaz2x" } }, sid);
      expect(ok.status, JSON.stringify(ok.data)).toBe(200);
      expect((await call("GET", "/b2b/company", undefined, sid)).data.bankDetails.swift).toBe("AIIBAZ2X");
    }
  });
});
