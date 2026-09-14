import { normalizeSearchText, searchScore, compactKey } from "@sp/utils";
import { db } from "../db/state";
import type { ProductRec } from "../data/catalog";
import type { Ctx } from "../engine/context";
import { categoryAncestors, productVisible, stockSummary, variantPrice } from "../engine/pricing";
import { find, list, notFound, requireAuth, route } from "../lib/http";
import { L, tr } from "../lib/i18n";
import { attributeDisplay, inheritedAttributeCodes, productCategoryDto, productDto, productSummaryDto, serviceDto } from "../dto";

/** Kataloq, dinamik filtrlər (facets), axtarış, müqayisə, favoritlər, uyğunluq (PRD §24–30). */

function productHaystack(p: ProductRec) {
  const brand = db.brands.find((b) => b.id === p.brandId)!;
  const model = db.models.find((m) => m.id === p.modelId);
  const cat = db.productCategories.find((c) => c.id === p.categoryId)!;
  const compat = p.compatibleModelIds.map((id) => db.models.find((m) => m.id === id)).map((m) => (m ? `${m.name} ${m.code}` : "")).join(" ");
  return [p.name.az, p.name.ru, p.name.en, brand.name, model?.name, model?.code, cat.name.az, cat.name.ru, cat.name.en, p.variants.map((v) => v.sku).join(" "), p.oemCode, compat, Object.values(p.attributes).join(" "), p.variants.map((v) => Object.values(v.attributes).join(" ")).join(" ")].filter(Boolean).join(" ");
}

function numericAttr(p: ProductRec, code: string): number | null {
  const values = [p.attributes[code], ...p.variants.map((v) => v.attributes[code])].filter((x) => x !== undefined).map(Number).filter((n) => Number.isFinite(n));
  return values.length ? Math.min(...values) : null;
}

function attrValues(p: ProductRec, code: string): string[] {
  return [...new Set([p.attributes[code], ...p.variants.map((v) => v.attributes[code])].filter((x): x is string => x !== undefined))];
}

function compatibleModelFor(sp: URLSearchParams, ctx: Ctx): string | null {
  const deviceId = sp.get("deviceId");
  if (deviceId) return db.devices.find((d) => d.id === deviceId && (d.ownerId === ctx.user?.id || d.ownerId === ctx.user?.companyId))?.modelId ?? null;
  return sp.get("modelId");
}

type Filter = (p: ProductRec) => boolean;

function buildFilters(sp: URLSearchParams, ctx: Ctx): Record<string, Filter> {
  const f: Record<string, Filter> = {};
  const brand = sp.get("brand");
  if (brand) f.brand = (p) => brand.split(",").includes(db.brands.find((b) => b.id === p.brandId)!.slug);
  const priceMin = sp.get("priceMin");
  const priceMax = sp.get("priceMax");
  if (priceMin || priceMax) {
    f.price = (p) => {
      const price = Number(variantPrice(p, p.variants[0]!, ctx).effectivePrice.amount);
      return (!priceMin || price >= Number(priceMin)) && (!priceMax || price <= Number(priceMax));
    };
  }
  if (sp.get("inStock") === "true") f.inStock = (p) => p.variants.some((v) => stockSummary(v.id).available > 0);
  if (sp.get("rating")) f.rating = (p) => p.rating >= Number(sp.get("rating"));
  if (sp.get("country")) f.country = (p) => sp.get("country")!.split(",").includes(p.country);
  if (sp.get("promo") === "true") f.promo = (p) => variantPrice(p, p.variants[0]!, ctx).appliedDiscounts.some((d) => d.applied);
  if (sp.get("isNew") === "true") f.isNew = (p) => p.isNew;
  if (sp.get("type")) f.type = (p) => sp.get("type")!.split(",").includes(p.type);
  const model = compatibleModelFor(sp, ctx);
  if (model) f.compatible = (p) => p.compatibleModelIds.includes(model) || p.modelId === model;
  for (const [key, value] of sp.entries()) {
    if (!key.startsWith("attr.")) continue;
    const code = key.slice(5);
    if (code.endsWith("_min") || code.endsWith("_max")) {
      const base = code.replace(/_(min|max)$/, "");
      const isMin = code.endsWith("_min");
      const prev = f[`attr.${base}`];
      f[`attr.${base}`] = (p) => {
        const n = numericAttr(p, base);
        if (n === null) return false;
        return (prev ? prev(p) : true) && (isMin ? n >= Number(value) : n <= Number(value));
      };
    } else {
      f[`attr.${code}`] = (p) => attrValues(p, code).some((v) => value.split(",").includes(v));
    }
  }
  return f;
}

function applyAll(products: ProductRec[], filters: Record<string, Filter>, except?: string) {
  return products.filter((p) => Object.entries(filters).every(([k, fn]) => k === except || fn(p)));
}

function collectCategoryIds(slugPath: string[] | null): string[] | null {
  if (!slugPath?.length) return null;
  const leaf = db.productCategories.find((c) => c.slug === slugPath[slugPath.length - 1]);
  if (!leaf) notFound();
  return db.productCategories.filter((c) => categoryAncestors(c.id).includes(leaf.id)).map((c) => c.id);
}

const COMPARE_PER_GROUP = 4;

/** Müqayisə qrupu — məhsulun əsas (kök) kateqoriyası. */
function compareGroupOf(p: ProductRec) {
  let c = db.productCategories.find((x) => x.id === p.categoryId)!;
  while (c.parentId) c = db.productCategories.find((x) => x.id === c.parentId)!;
  return c;
}

export const catalogHandlers = [
  route.get("/categories", () => {
    const all = db.productCategories.filter((c) => c.active).sort((a, b) => a.order - b.order).map(productCategoryDto);
    const build = (parentId: string | null): unknown[] => all.filter((c) => c.parentId === parentId).map((c) => ({ ...c, children: build(c.id) }));
    return build(null);
  }),

  route.get("/brands", ({ url }) => list(url, db.brands.filter((b) => b.active).map((b) => ({ ...b, productCount: db.products.filter((p) => p.brandId === b.id && p.status === "ACTIVE").length, modelCount: db.models.filter((m) => m.brandId === b.id).length, seriesCount: db.series.filter((s) => s.brandId === b.id).length, logoText: b.name })), { search: (b) => b.name, ignoreEmpty: true })),

  route.get("/models", ({ url }) => {
    const items = db.models.map((m) => ({ id: m.id, brandId: m.brandId, brandName: db.brands.find((b) => b.id === m.brandId)!.name, seriesId: m.seriesId, seriesName: db.series.find((s) => s.id === m.seriesId)?.name ?? null, categoryId: m.categoryId, categoryName: db.equipmentCategories.find((c) => c.id === m.categoryId)?.name ?? L("—"), name: m.name, fullName: `${db.brands.find((b) => b.id === m.brandId)!.name} ${m.name}`, code: m.code, compatiblePartCount: db.products.filter((p) => p.compatibleModelIds.includes(m.id)).length }));
    return list(url, items, { search: (m) => `${m.fullName} ${m.code}`, ignoreEmpty: true, defaultSort: "fullName" });
  }),

  route.get("/products", ({ url, ctx }) => {
    const sp = url.searchParams;
    const categoryPath = sp.get("category")?.split("/").filter(Boolean) ?? null;
    const catIds = collectCategoryIds(categoryPath);
    let base = db.products.filter((p) => productVisible(p, ctx) && (!catIds || catIds.includes(p.categoryId)));
    const q = sp.get("q")?.trim();
    if (q) base = base.map((p) => ({ p, s: searchScore(q, productHaystack(p)) })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s).map((x) => x.p);
    const filters = buildFilters(sp, ctx);
    let rows = applyAll(base, filters);
    const sort = sp.get("sort") ?? (q ? "relevance" : "popular");
    const priceOf = (p: ProductRec) => Number(variantPrice(p, p.variants[0]!, ctx).effectivePrice.amount);
    if (sort === "price") rows = [...rows].sort((a, b) => priceOf(a) - priceOf(b));
    if (sort === "-price") rows = [...rows].sort((a, b) => priceOf(b) - priceOf(a));
    if (sort === "rating") rows = [...rows].sort((a, b) => b.rating - a.rating);
    if (sort === "new") rows = [...rows].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (sort === "popular") rows = [...rows].sort((a, b) => b.reviewCount - a.reviewCount);

    // Facets — hər facet öz filtri istisna olmaqla hesablanır
    const leafCat = categoryPath ? db.productCategories.find((c) => c.slug === categoryPath[categoryPath.length - 1]) ?? null : null;
    const attrCodes = leafCat ? inheritedAttributeCodes(leafCat.id) : [];
    const facets: unknown[] = [];
    const brandPool = applyAll(base, filters, "brand");
    const brandSel = sp.get("brand")?.split(",") ?? [];
    facets.push({ code: "brand", name: L("Marka", "Бренд", "Brand"), display: "CHECKBOX", unit: null, range: null, options: db.brands.map((b) => ({ value: b.slug, label: b.name, count: brandPool.filter((p) => p.brandId === b.id).length, selected: brandSel.includes(b.slug) })).filter((o) => o.count > 0 || o.selected) });
    const pricePool = applyAll(base, filters, "price").map(priceOf);
    facets.push({ code: "price", name: L("Qiymət", "Цена", "Price"), display: "RANGE", unit: "AZN", options: [], range: { min: Math.floor(Math.min(...pricePool, 0)), max: Math.ceil(Math.max(...pricePool, 0)), selectedMin: sp.get("priceMin") ? Number(sp.get("priceMin")) : null, selectedMax: sp.get("priceMax") ? Number(sp.get("priceMax")) : null } });
    for (const code of attrCodes) {
      const a = db.attributes.find((x) => x.code === code);
      if (!a || !a.filterable) continue;
      const pool = applyAll(base, filters, `attr.${code}`);
      if (a.filterDisplay === "RANGE" || a.filterDisplay === "SLIDER") {
        const nums = pool.map((p) => numericAttr(p, code)).filter((n): n is number => n !== null);
        if (!nums.length) continue;
        facets.push({ code: `attr.${code}`, name: a.name, display: a.filterDisplay, unit: a.unit, options: [], range: { min: Math.min(...nums), max: Math.max(...nums), selectedMin: sp.get(`attr.${code}_min`) ? Number(sp.get(`attr.${code}_min`)) : null, selectedMax: sp.get(`attr.${code}_max`) ? Number(sp.get(`attr.${code}_max`)) : null } });
      } else {
        const sel = sp.get(`attr.${code}`)?.split(",") ?? [];
        const values = a.type === "BOOLEAN" ? [{ value: "true", label: L("Bəli", "Да", "Yes") }, { value: "false", label: L("Xeyr", "Нет", "No") }] : a.options;
        const options = values.map((o) => ({ value: o.value, label: a.unit && a.type !== "BOOLEAN" ? { az: `${o.label.az} ${a.unit}`, ru: `${o.label.ru} ${a.unit}`, en: `${o.label.en} ${a.unit}` } : o.label, count: pool.filter((p) => attrValues(p, code).includes(o.value)).length, selected: sel.includes(o.value) })).filter((o) => o.count > 0 || o.selected);
        if (options.length) facets.push({ code: `attr.${code}`, name: a.name, display: "CHECKBOX", unit: a.unit, options, range: null });
      }
    }
    const flag = (code: string, name: ReturnType<typeof L>, fn: (p: ProductRec) => boolean) => {
      const pool = applyAll(base, filters, code);
      facets.push({ code, name, display: "CHECKBOX", unit: null, range: null, options: [{ value: "true", label: name, count: pool.filter(fn).length, selected: sp.get(code) === "true" }] });
    };
    flag("inStock", L("Stokda var", "В наличии", "In stock"), (p) => p.variants.some((v) => stockSummary(v.id).available > 0));
    flag("promo", L("Kampaniya", "Акция", "On sale"), (p) => variantPrice(p, p.variants[0]!, ctx).appliedDiscounts.some((d) => d.applied));
    flag("isNew", L("Yeni məhsul", "Новинка", "New"), (p) => p.isNew);
    const ratingPool = applyAll(base, filters, "rating");
    facets.push({ code: "rating", name: L("Reytinq", "Рейтинг", "Rating"), display: "CHECKBOX", unit: null, range: null, options: ["4.5", "4"].map((r) => ({ value: r, label: `${r}+`, count: ratingPool.filter((p) => p.rating >= Number(r)).length, selected: sp.get("rating") === r })) });
    const countryPool = applyAll(base, filters, "country");
    const countries = [...new Set(base.map((p) => p.country))];
    facets.push({ code: "country", name: L("İstehsal ölkəsi", "Страна производства", "Country of origin"), display: "CHECKBOX", unit: null, range: null, options: countries.map((c) => ({ value: c, label: c, count: countryPool.filter((p) => p.country === c).length, selected: (sp.get("country")?.split(",") ?? []).includes(c) })) });

    const page = Math.max(1, Number(sp.get("page") ?? 1));
    const pageSize = Math.min(60, Number(sp.get("pageSize") ?? 12));
    const empty = db.mockConfig.emptyLists;
    const total = empty ? 0 : rows.length;
    const breadcrumbs = (categoryPath ?? []).map((slug, i) => {
      const c = db.productCategories.find((x) => x.slug === slug)!;
      return { slug, name: c.name, href: `/shop/${categoryPath!.slice(0, i + 1).join("/")}` };
    });
    return {
      items: empty ? [] : rows.slice((page - 1) * pageSize, page * pageSize).map((p) => productSummaryDto(p, ctx)),
      meta: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
      facets,
      category: leafCat ? productCategoryDto(leafCat) : null,
      breadcrumbs,
      children: db.productCategories.filter((c) => c.parentId === (leafCat?.id ?? null) && c.active).map(productCategoryDto),
      compatibleWith: compatibleModelFor(sp, ctx) ? (() => { const m = db.models.find((x) => x.id === compatibleModelFor(sp, ctx)); return m ? `${db.brands.find((b) => b.id === m.brandId)!.name} ${m.name}` : null; })() : null,
    };
  }),

  route.get("/products/:slug", ({ params, ctx }) => {
    const p = db.products.find((x) => x.slug === params.slug || x.id === params.slug);
    if (!p || !productVisible(p, ctx)) notFound();
    const reviews = db.reviews.filter((r) => r.target === "PRODUCT" && r.targetId === p.id && r.status === "PUBLISHED").map((r) => ({ id: r.id, authorName: r.authorName, rating: r.rating, pros: r.pros, cons: r.cons, comment: r.comment, createdAt: r.createdAt, reply: r.reply, verifiedPurchase: true }));
    const user = ctx.user;
    return { ...productDto(p, ctx), reviews, isFavorite: !!user?.favorites.includes(p.id), inCompare: !!user?.compare.includes(p.id), canReview: !!user && db.salesOrders.some((s) => s.customerId === user.id && ["DELIVERED", "COMPLETED"].includes(s.status) && s.lines.some((l) => l.productId === p.id)) && !db.reviews.some((r) => r.targetId === p.id && r.authorId === user.id) };
  }),

  route.get("/products/:id/compatibility", ({ params, url, ctx }) => {
    const p = db.products.find((x) => x.id === params.id || x.slug === params.id);
    if (!p) notFound();
    const modelId = compatibleModelFor(url.searchParams, ctx);
    const model = db.models.find((m) => m.id === modelId);
    return { compatible: !!model && (p.compatibleModelIds.includes(model.id) || p.modelId === model.id), modelName: model ? `${db.brands.find((b) => b.id === model.brandId)!.name} ${model.name}` : null, alternatives: model ? db.products.filter((x) => x.compatibleModelIds.includes(model.id) && x.id !== p.id).slice(0, 4).map((x) => productSummaryDto(x, ctx)) : [] };
  }),

  route.get("/search", ({ url, ctx }) => {
    const q = url.searchParams.get("q")?.trim() ?? "";
    const limit = Number(url.searchParams.get("limit") ?? 8);
    const score = <T,>(items: T[], hay: (x: T) => string) => items.map((x) => ({ x, s: q ? searchScore(q, hay(x)) : 0 })).filter((r) => r.s > 0).sort((a, b) => b.s - a.s).map((r) => r.x);
    const visible = db.products.filter((p) => productVisible(p, ctx));
    const products = score(visible.filter((p) => p.type !== "SPARE_PART"), productHaystack);
    const parts = score(visible.filter((p) => p.type === "SPARE_PART"), productHaystack);
    const brands = score(db.brands, (b) => b.name);
    const models = score(db.models, (m) => `${db.brands.find((b) => b.id === m.brandId)!.name} ${m.name} ${m.code} ${compactKey(m.name)}`);
    // model adı ilə axtarışda uyğun ehtiyat hissələri (§27.3)
    for (const m of models.slice(0, 3)) for (const p of db.products.filter((x) => x.compatibleModelIds.includes(m.id))) if (!parts.includes(p)) parts.push(p);
    const services = score(db.services, (s) => `${s.name.az} ${s.name.ru} ${s.name.en} ${tr(db.equipmentCategories.find((c) => c.id === s.categoryId)!.name, "az")}`);
    const faq = score(db.faq, (f) => `${f.question.az} ${f.question.ru} ${f.question.en}`);
    const empty = db.mockConfig.emptyLists;
    const total = empty ? 0 : products.length + parts.length + brands.length + models.length + services.length + faq.length;
    return {
      query: q,
      normalizedQuery: normalizeSearchText(q),
      products: empty ? [] : products.slice(0, limit).map((p) => productSummaryDto(p, ctx)),
      spareParts: empty ? [] : parts.slice(0, limit).map((p) => productSummaryDto(p, ctx)),
      brands: empty ? [] : brands.slice(0, 6).map((b) => ({ id: b.id, slug: b.slug, name: b.name })),
      models: empty ? [] : models.slice(0, 6).map((m) => ({ id: m.id, fullName: `${db.brands.find((b) => b.id === m.brandId)!.name} ${m.name}`, compatiblePartCount: db.products.filter((p) => p.compatibleModelIds.includes(m.id)).length })),
      services: empty ? [] : services.slice(0, 6).map((s) => ({ id: s.id, slug: s.slug, name: s.name, categoryName: db.equipmentCategories.find((c) => c.id === s.categoryId)!.name })),
      faq: empty ? [] : faq.slice(0, 4).map((f) => ({ id: f.id, question: f.question })),
      suggestions: total === 0 ? [L("kondisioner"), L("LG DualCool"), L("kombi təmiri"), L("mis boru"), L("R32")] : [],
      popular: [L("Kondisioner 12000 BTU"), L("Kombi təmiri", "Ремонт котла", "Boiler repair"), L("LG 18000 kompressor"), L("Freon R32"), L("Mis boru")],
      total,
    };
  }),

  // Müqayisə yalnız eyni əsas kateqoriya daxilində aparılır (§30): kondisioner nasosla müqayisə olunmur
  route.get("/compare", ({ ctx, url }) => {
    const ids = url.searchParams.get("ids")?.split(",").filter(Boolean) ?? ctx.user?.compare ?? [];
    const all = ids.map((id) => db.products.find((p) => p.id === id)).filter((p): p is ProductRec => !!p && productVisible(p, ctx));
    const countOf = (gid: string) => all.filter((p) => compareGroupOf(p).id === gid).length;
    // Ən çox məhsulu olan qrup öndə; bərabər olduqda ən son əlavə edilən
    const groupIds = [...new Set([...all].reverse().map((p) => compareGroupOf(p).id))].sort((a, b) => countOf(b) - countOf(a));
    const requested = url.searchParams.get("group");
    const activeGroup = requested && groupIds.includes(requested) ? requested : groupIds[0] ?? null;
    const products = all.filter((p) => compareGroupOf(p).id === activeGroup);
    const codes = [...new Set(products.flatMap((p) => inheritedAttributeCodes(p.categoryId)))].filter((c) => db.attributes.find((a) => a.code === c)?.comparable);
    const group = activeGroup ? db.productCategories.find((c) => c.id === activeGroup)! : null;
    return {
      maxPerGroup: COMPARE_PER_GROUP,
      groups: groupIds.map((gid) => {
        const c = db.productCategories.find((x) => x.id === gid)!;
        return { id: c.id, slug: c.slug, name: c.name, path: productCategoryDto(c).path, count: all.filter((p) => compareGroupOf(p).id === gid).length };
      }),
      activeGroup: group ? { id: group.id, name: group.name, path: productCategoryDto(group).path } : null,
      products: products.map((p) => productSummaryDto(p, ctx)),
      rows: codes
        .map((code) => {
          const a = db.attributes.find((x) => x.code === code)!;
          const values = products.map((p) => {
            const v = attrValues(p, code);
            return v.length ? v.map((x) => attributeDisplay(code, x)) : null;
          });
          return { code, name: a.name, group: a.group, values, different: products.length > 1 && new Set(values.map((v) => JSON.stringify(v))).size > 1 };
        })
        // Heç bir məhsulda dəyəri olmayan xüsusiyyət göstərilmir
        .filter((r) => r.values.some((v) => v !== null)),
    };
  }),

  route.post("/compare", async ({ ctx, body }) => {
    const user = requireAuth(ctx);
    const { productId, action, group } = await body<{ productId: string; action: "add" | "remove" | "clear" | "clearGroup"; group?: string }>();
    const product = productId ? db.products.find((p) => p.id === productId) : undefined;
    let replaced = false;
    if (action === "clear") user.compare = [];
    else if (action === "clearGroup") user.compare = user.compare.filter((id) => { const p = db.products.find((x) => x.id === id); return !p || compareGroupOf(p).id !== group; });
    else if (action === "remove") user.compare = user.compare.filter((x) => x !== productId);
    else if (product && !user.compare.includes(productId)) {
      const gid = compareGroupOf(product).id;
      const same = user.compare.filter((id) => { const p = db.products.find((x) => x.id === id); return p && compareGroupOf(p).id === gid; });
      // Hər kateqoriyada ən çox 4 məhsul: ən köhnəsi çıxarılır
      if (same.length >= COMPARE_PER_GROUP) { user.compare = user.compare.filter((id) => id !== same[0]); replaced = true; }
      user.compare = [...user.compare, productId];
    }
    const gid = product ? compareGroupOf(product).id : null;
    const groupCount = gid ? user.compare.filter((id) => { const p = db.products.find((x) => x.id === id); return p && compareGroupOf(p).id === gid; }).length : 0;
    return { ids: user.compare, groupId: gid, groupName: gid ? db.productCategories.find((c) => c.id === gid)!.name : null, groupCount, replaced };
  }),

  route.get("/favorites", ({ ctx, url }) => {
    const user = requireAuth(ctx);
    return list(url, user.favorites.map((id) => db.products.find((p) => p.id === id)).filter((p): p is ProductRec => !!p).map((p) => productSummaryDto(p, ctx)));
  }),

  route.post("/favorites", async ({ ctx, body }) => {
    const user = requireAuth(ctx);
    const { productId } = await body<{ productId: string }>();
    find(db.products, productId);
    user.favorites = user.favorites.includes(productId) ? user.favorites.filter((x) => x !== productId) : [...user.favorites, productId];
    return { ids: user.favorites, isFavorite: user.favorites.includes(productId) };
  }),

  route.get("/equipment-categories", () => db.equipmentCategories.filter((c) => c.active).map((c) => ({ ...c, nameI18n: c.name, serviceCount: db.services.filter((s) => s.categoryId === c.id).length }))),

  route.get("/services", ({ url }) => {
    const items = db.services.filter((s) => s.active).map(serviceDto);
    return list(url, items, { search: (s) => `${(s.name as { az: string }).az} ${(s.name as { ru: string }).ru} ${(s.name as { en: string }).en}`, ignoreEmpty: false, defaultSort: "-completedCount" });
  }),
];
