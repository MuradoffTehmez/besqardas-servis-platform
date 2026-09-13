"use client";
import React, { useEffect, useMemo, useState } from "react";
import { BadgeCheck, Heart, Scale, ShoppingCart, SlidersHorizontal, Star, Truck, Wrench, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@sp/utils";
import { ApiError, idempotencyKey, post, qs, useApi, useApiMutation, useQueryClient, del, patch } from "@sp/api-client";
import { useI18n } from "../core/i18n";
import { Link, useRouter } from "../core/router";
import { useSession } from "../core/session";
import { Card, Check, EmptyState, ErrorState, FormError, KeyValue, Loading, Pagination, QueryView, Radios, SearchBox, SelectField, Stars, TextArea, TextField, errorText, useFormState } from "../kit/base";
import { Dialog } from "../kit/actions";
import { PriceTag, StockPill } from "../kit/domain";
import { ProductVisual, QuantityInput } from "../kit/media";

/* ------------------------------------------------------------------ */
/* Səbət əməliyyatları                                                 */
/* ------------------------------------------------------------------ */

export function useCartActions() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ predicate: (q) => ["/cart", "/auth/session", "/checkout/options"].some((p) => String(q.queryKey[1] ?? "").startsWith(p)) });
  return {
    add: async (variantId: string, quantity = "1", unit = "pcs", withInstallation = false) => {
      try {
        await post("/cart/items", { variantId, quantity: String(quantity), unit, withInstallation });
        await refresh();
        toast.success(t("cart.added"));
      } catch (e) {
        toast.error(errorText(e, t("errors.generic")));
      }
    },
    refresh,
  };
}

export function ProductTile({ p, compatibleBadge }: { p: any; compatibleBadge?: boolean }) {
  const { t } = useI18n();
  const { add } = useCartActions();
  const { user } = useSession();
  const qc = useQueryClient();
  const toggleFav = async () => {
    if (!user) return toast.info(t("shop.loginForFavorites"));
    await post("/favorites", { productId: p.id });
    await qc.invalidateQueries({ queryKey: ["api"] });
    toast.success(t("shop.favoritesUpdated"));
  };
  return (
    <article className="shop-tile">
      <Link to={`/product/${p.slug}`} className="shop-tile-media" aria-label={p.name}>
        <ProductVisual kind={p.imageUrl} tone={p.imageTone} label={p.name} />
        <div className="shop-tile-flags">
          {p.isNew && <span className="badge badge-info">{t("shop.new")}</span>}
          {p.hasPromotion && <span className="badge badge-warning">{t("shop.sale")}</span>}
          {compatibleBadge && <span className="badge badge-success"><BadgeCheck size={12} /> {t("shop.fits")}</span>}
        </div>
      </Link>
      <div className="shop-tile-body">
        <span className="product-brand">{p.brandName}</span>
        <h3><Link to={`/product/${p.slug}`}>{p.name}</Link></h3>
        <div className="flex gap-2 items-center flex-wrap">
          <Stars value={p.rating} count={p.reviewCount} />
          <StockPill status={p.stockStatus} />
        </div>
        {p.highlights?.length > 0 && <ul className="shop-tile-hl">{p.highlights.slice(0, 2).map((h: string) => <li key={h}>{h}</li>)}</ul>}
      </div>
      <div className="shop-tile-foot">
        <PriceTag price={p.price} size="sm" />
        <div className="flex gap-1">
          <button type="button" className="icon-button" aria-label={t("shop.addFavorite")} onClick={toggleFav}><Heart size={16} /></button>
          <button type="button" className="icon-button add" aria-label={t("add")} disabled={p.stockStatus === "OUT_OF_STOCK"} onClick={() => add(p.defaultVariantId, "1", p.baseUnit)}><ShoppingCart size={16} /></button>
        </div>
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Kataloq (§24, §28)                                                   */
/* ------------------------------------------------------------------ */

export function ShopPage({ categoryPath }: { categoryPath?: string }) {
  const { t, text } = useI18n();
  const { query, setQuery, navigate } = useRouter();
  const { user } = useSession();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const categories = useApi<any[]>("/categories", { staleTime: 300_000 });
  const devices = useApi<any>(user && user.activeRole === "CUSTOMER" ? "/account/devices" : null);
  const params = Object.fromEntries(query.entries());
  const url = `/products${qs({ ...params, category: categoryPath, pageSize: 12 })}`;
  const list = useApi<any>(url, { placeholderData: (p: any) => p });
  const data = list.data;
  const activeChips = [...query.entries()].filter(([k]) => !["page", "sort", "q", "pageSize"].includes(k));
  const facetValue = (code: string) => query.get(code)?.split(",") ?? [];
  const toggleOption = (code: string, value: string) => {
    const cur = facetValue(code);
    const next = cur.includes(value) ? cur.filter((x) => x !== value) : [...cur, value];
    setQuery({ [code]: next.join(","), page: null });
  };
  const labelFor = (code: string, value: string) => {
    const f = data?.facets?.find((x: any) => x.code === code || x.code === code.replace(/_(min|max)$/, ""));
    const opt = f?.options?.find((o: any) => o.value === value);
    if (code === "deviceId") return t("shop.fitsMyDevice");
    return `${f?.name ?? code}: ${opt?.label ?? value}`;
  };
  const Tree = ({ nodes, depth = 0 }: { nodes: any[]; depth?: number }) => (
    <ul className={cn("shop-tree", depth && "nested")}>
      {nodes.map((n) => {
        const href = `/shop/${n.path.join("/")}`;
        const active = categoryPath === n.path.join("/");
        const open = categoryPath?.startsWith(n.path.join("/"));
        return (
          <li key={n.id}>
            <Link to={href} className={cn(active && "active")}>{n.name} <small>{n.productCount}</small></Link>
            {open && n.children?.length > 0 && <Tree nodes={n.children} depth={depth + 1} />}
          </li>
        );
      })}
    </ul>
  );
  const Facets = () => (
    <div className="shop-facets">
      {devices.data?.items?.length > 0 && (
        <SelectField label={t("shop.fitsMyDevice")} value={query.get("deviceId") ?? ""} onValue={(v) => setQuery({ deviceId: v, page: null })} placeholder={t("shop.anyDevice")} options={devices.data.items.map((d: any) => ({ value: d.id, label: `${d.nickname ?? d.modelName}` }))} />
      )}
      {data?.facets?.map((f: any) => (
        <fieldset key={f.code} className="shop-facet">
          <legend>{f.name}{f.unit && f.display !== "CHECKBOX" ? `, ${f.unit}` : ""}</legend>
          {f.display === "CHECKBOX" ? (
            f.options.map((o: any) => (
              <label key={o.value} className={cn("kit-check", o.count === 0 && !o.selected && "disabled")}>
                <input type="checkbox" checked={f.code === "rating" || f.code.startsWith("in") || f.code === "promo" || f.code === "isNew" ? query.get(f.code) === o.value : o.selected} disabled={o.count === 0 && !o.selected} onChange={() => (["inStock", "promo", "isNew", "rating"].includes(f.code) ? setQuery({ [f.code]: query.get(f.code) === o.value ? null : o.value, page: null }) : toggleOption(f.code, o.value))} />
                <span>{o.label}</span>
                <small className="text-muted">{o.count}</small>
              </label>
            ))
          ) : f.range ? (
            <RangeFacet facet={f} onApply={(min, max) => setQuery({ [f.code === "price" ? "priceMin" : `${f.code}_min`]: min, [f.code === "price" ? "priceMax" : `${f.code}_max`]: max, page: null })} />
          ) : null}
        </fieldset>
      ))}
    </div>
  );
  return (
    <div className="container py-6 shop-page">
      <nav className="pg-crumbs mb-2" aria-label={t("common.breadcrumbs")}>
        <Link to="/">{t("home")}</Link> › <Link to="/shop">{t("nav.shop")}</Link>
        {data?.breadcrumbs?.map((b: any) => <span key={b.slug}> › <Link to={b.href}>{b.name}</Link></span>)}
      </nav>
      <div className="flex justify-between items-end flex-wrap gap-3 mb-4">
        <div>
          <h1>{data?.category?.name ?? t("shop.title")}</h1>
          <p className="text-muted">{data ? t("shop.resultCount", { count: data.meta.total }) : t("common.loading")}{data?.compatibleWith ? ` · ${t("shop.compatibleWith", { model: data.compatibleWith })}` : ""}</p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <SearchBox value={query.get("q") ?? ""} onChange={(v) => setQuery({ q: v, page: null })} placeholder={t("shop.searchInCatalog")} />
          <SelectField value={query.get("sort") ?? ""} onValue={(v) => setQuery({ sort: v, page: null })} placeholder={t("shop.sortPopular")} options={[{ value: "price", label: t("shop.sortPriceAsc") }, { value: "-price", label: t("shop.sortPriceDesc") }, { value: "rating", label: t("shop.sortRating") }, { value: "new", label: t("shop.sortNew") }]} />
          <button type="button" className="btn outline shop-filter-btn" onClick={() => setFiltersOpen(true)}><SlidersHorizontal size={16} /> {t("shop.filters")}</button>
        </div>
      </div>
      {data?.children?.length > 0 && (
        <div className="category-chips mb-4">
          {data.children.map((c: any) => <Link key={c.id} to={`/shop/${c.path.join("/")}`} className="chip">{c.name} <small>{c.productCount}</small></Link>)}
        </div>
      )}
      {activeChips.length > 0 && (
        <div className="shop-active mb-3" aria-label={t("shop.activeFilters")}>
          {activeChips.flatMap(([k, v]) => (k.startsWith("attr.") && !k.match(/_(min|max)$/) || k === "brand" || k === "country" ? v.split(",").map((x) => [k, x]) : [[k, v]])).map(([k, v]) => (
            <button key={`${k}-${v}`} type="button" className="chip active" onClick={() => (k.startsWith("attr.") && !k.match(/_(min|max)$/) || k === "brand" || k === "country" ? toggleOption(k!, v!) : setQuery({ [k!]: null }))}>
              {labelFor(k!, v!)} <X size={12} />
            </button>
          ))}
          <button type="button" className="btn ghost btn-sm" onClick={() => navigate(categoryPath ? `/shop/${categoryPath}` : "/shop", { replace: true })}>{t("shop.resetAll")}</button>
        </div>
      )}
      <div className="shop-grid-layout">
        <aside className="shop-side" aria-label={t("shop.filters")}>
          <Card title={t("shop.categories")}>{categories.isLoading ? <Loading /> : <Tree nodes={categories.data ?? []} />}</Card>
          <Card title={t("shop.filters")}><Facets /></Card>
        </aside>
        <section aria-live="polite">
          {list.isLoading ? <Loading rows={6} /> : list.error ? <ErrorState error={list.error} onRetry={() => list.refetch()} /> : !data.items.length ? (
            <EmptyState title={t("shop.noProducts")} text={t("shop.noProductsText")} action={<button type="button" className="btn outline" onClick={() => navigate("/shop")}>{t("shop.resetAll")}</button>} />
          ) : (
            <>
              <div className={cn("shop-grid", list.isFetching && "is-fetching")}>
                {data.items.map((p: any) => <ProductTile key={p.id} p={p} compatibleBadge={!!query.get("deviceId")} />)}
              </div>
              <Pagination meta={data.meta} onPage={(page) => setQuery({ page }, { replace: false })} />
            </>
          )}
        </section>
      </div>
      <Dialog open={filtersOpen} onClose={() => setFiltersOpen(false)} title={t("shop.filters")} footer={<button type="button" className="btn primary w-full" onClick={() => setFiltersOpen(false)}>{t("shop.showResults", { count: data?.meta?.total ?? 0 })}</button>}>
        <Facets />
      </Dialog>
    </div>
  );
}

function RangeFacet({ facet, onApply }: { facet: any; onApply: (min: string | null, max: string | null) => void }) {
  const { t } = useI18n();
  const [min, setMin] = useState(facet.range.selectedMin ?? "");
  const [max, setMax] = useState(facet.range.selectedMax ?? "");
  return (
    <div className="shop-range">
      <input className="form-input" type="number" inputMode="decimal" placeholder={String(facet.range.min)} value={min} aria-label={t("shop.min")} onChange={(e) => setMin(e.target.value)} />
      <span>—</span>
      <input className="form-input" type="number" inputMode="decimal" placeholder={String(facet.range.max)} value={max} aria-label={t("shop.max")} onChange={(e) => setMax(e.target.value)} />
      <button type="button" className="btn outline btn-sm" onClick={() => onApply(min || null, max || null)}>{t("shop.apply")}</button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Məhsul səhifəsi (§30)                                                */
/* ------------------------------------------------------------------ */

export function ProductPage({ slug }: { slug: string }) {
  const { t, text, money, qty, date, unit: unitName } = useI18n();
  const { query, setQuery, navigate } = useRouter();
  const { user } = useSession();
  const { add } = useCartActions();
  const qc = useQueryClient();
  const q = useApi<any>(`/products/${slug}`);
  const devices = useApi<any>(user?.activeRole === "CUSTOMER" ? "/account/devices" : null);
  const [image, setImage] = useState(0);
  const [amount, setAmount] = useState("1");
  const [unit, setUnit] = useState<string | null>(null);
  const [install, setInstall] = useState(false);
  const [checkDevice, setCheckDevice] = useState("");
  const compat = useApi<any>(checkDevice && q.data ? `/products/${q.data.id}/compatibility?deviceId=${checkDevice}` : null);
  const [reviewOpen, setReviewOpen] = useState(false);
  if (q.isLoading) return <div className="container py-8"><Loading rows={8} /></div>;
  if (q.error) return <div className="container py-8"><ErrorState error={q.error} onRetry={() => q.refetch()} /></div>;
  const p = q.data;
  // Seçilmiş variant URL-də saxlanılır (§26)
  const selected: Record<string, string> = { ...(p.variants.find((v: any) => v.id === query.get("variant"))?.attributes ?? p.variants[0].attributes) };
  const variant = p.variants.find((v: any) => v.id === query.get("variant")) ?? p.variants[0];
  const pick = (code: string, value: string) => {
    const want = { ...selected, [code]: value };
    const match = p.variants.find((v: any) => Object.entries(want).every(([k, x]) => v.attributes[k] === x)) ?? p.variants.find((v: any) => v.attributes[code] === value);
    if (match) setQuery({ variant: match.id });
  };
  const currentUnit = unit ?? p.baseUnit;
  const unitPrice = variant.price.unitPrices?.find((u: any) => u.unit === currentUnit);
  const groups = p.attributes.reduce((acc: Record<string, any[]>, a: any) => ((acc[a.group] ||= []).push(a), acc), {});
  const jsonLd = { "@context": "https://schema.org", "@type": "Product", name: p.name, sku: variant.sku, brand: { "@type": "Brand", name: p.brandName }, aggregateRating: p.reviewCount ? { "@type": "AggregateRating", ratingValue: p.rating, reviewCount: p.reviewCount } : undefined, offers: { "@type": "Offer", priceCurrency: "AZN", price: variant.price.effectivePrice.amount, availability: variant.stockStatus === "OUT_OF_STOCK" ? "https://schema.org/OutOfStock" : "https://schema.org/InStock" } };
  return (
    <div className="container py-6 product-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav className="pg-crumbs mb-3" aria-label={t("common.breadcrumbs")}>
        <Link to="/">{t("home")}</Link> › <Link to="/shop">{t("nav.shop")}</Link> › <Link to={`/shop/${p.categoryPath.join("/")}`}>{p.categoryName}</Link> › <span aria-current="page">{p.name}</span>
      </nav>
      <div className="product-detail-grid">
        <section className="kit-card product-gallery">
          <div className="product-hero-visual">
            <ProductVisual kind={p.gallery[image]?.url ?? p.imageUrl} tone={image % 2 ? "slate" : p.imageTone} label={p.name} size="lg" />
            {p.videoUrl && <span className="badge badge-info product-video">{t("shop.video")}</span>}
          </div>
          <div className="product-thumbs" role="tablist" aria-label={t("shop.gallery")}>
            {p.gallery.map((g: any, i: number) => (
              <button key={g.id} type="button" role="tab" aria-selected={i === image} className={cn(i === image && "active")} onClick={() => setImage(i)}>
                <ProductVisual kind={g.url} tone={i % 2 ? "slate" : p.imageTone} size="sm" label={`${p.name} ${i + 1}`} />
              </button>
            ))}
          </div>
        </section>
        <section className="kit-card product-buy">
          <div className="kit-card-body">
            <span className="product-brand">{p.brandName}{p.modelName ? ` · ${p.modelName}` : ""}</span>
            <h1>{p.name}</h1>
            <div className="flex gap-3 items-center flex-wrap mb-3">
              <Stars value={p.rating} count={p.reviewCount} />
              <small className="text-muted">SKU: {variant.sku}</small>
              <StockPill status={variant.stockStatus} label={`${text(t(`enum.StockStatus.${variant.stockStatus}`))} · ${qty(variant.available)}`} />
            </div>
            {p.variantAttributes.map((va: any) => (
              <div key={va.code} className="mb-3">
                <span className="form-label">{va.name}</span>
                <div className="flex gap-2 flex-wrap">
                  {va.options.map((o: string) => {
                    const exists = p.variants.some((v: any) => v.attributes[va.code] === o);
                    return <button key={o} type="button" className={cn("chip", selected[va.code] === o && "active")} disabled={!exists} aria-pressed={selected[va.code] === o} onClick={() => pick(va.code, o)}>{p.attributes.find((a: any) => a.code === va.code)?.displayValue && va.code !== "color" ? `${o}` : o}</button>;
                  })}
                </div>
              </div>
            ))}
            <PriceTag price={variant.price} size="lg" showVat showInstallment />
            {variant.price.appliedDiscounts?.some((d: any) => d.applied) && (
              <ul className="product-discounts">
                {variant.price.appliedDiscounts.map((d: any) => <li key={d.code} className={cn(!d.applied && "text-muted")}>{d.applied ? "✓" : "—"} {d.label}{d.applied ? ` −${money(d.amount)}` : d.skippedReason ? ` (${d.skippedReason})` : ""}</li>)}
              </ul>
            )}
            {variant.price.unitPrices?.length > 1 && (
              <div className="product-units">
                {variant.price.unitPrices.map((u: any) => <span key={u.unit} className={cn("chip", currentUnit === u.unit && "active")}>{u.factor === "1" ? `1 ${unitName(u.unit)}` : `1 ${unitName(u.unit)} = ${u.factor} ${unitName(p.baseUnit)}`}: <strong>{money(u.price)}</strong></span>)}
              </div>
            )}
            {variant.price.tiers?.length > 0 && <p className="text-sm">{t("shop.tiers")}: {variant.price.tiers.map((tr: any) => `≥${tr.minQuantity}: ${money(tr.price)}`).join(" · ")}</p>}
            <div className="flex gap-3 items-center flex-wrap my-4">
              <QuantityInput value={amount} onValue={setAmount} unit={currentUnit} units={p.unitConversions.length ? [p.baseUnit, ...p.unitConversions.map((c: any) => c.unit)] : undefined} onUnit={setUnit} step={p.baseUnit === "pcs" || currentUnit !== p.baseUnit ? 1 : 0.5} />
              {unitPrice && <small className="text-muted">{t("shop.lineTotal")}: {money({ amount: (Number(unitPrice.price.amount) * Number(amount || 0)).toFixed(2), currency: "AZN" })}</small>}
            </div>
            {p.installationService && <Check checked={install} onValue={setInstall} label={t("shop.addInstallation", { name: p.installationService.name, price: money(p.installationService.price) })} />}
            {p.returnRestriction && <p className="kit-note text-sm">{p.returnRestriction}</p>}
            <div className="flex gap-2 flex-wrap mt-4">
              <button type="button" className="btn primary btn-lg flex-1" disabled={variant.stockStatus === "OUT_OF_STOCK" || !(Number(amount) > 0)} onClick={() => add(variant.id, amount, currentUnit, install)}><ShoppingCart size={18} /> {t("add")}</button>
              <button type="button" className={cn("icon-button", p.isFavorite && "active")} aria-pressed={p.isFavorite} aria-label={t("shop.addFavorite")} onClick={async () => { if (!user) return navigate(`/login?next=/product/${slug}`); await post("/favorites", { productId: p.id }); await qc.invalidateQueries({ queryKey: ["api"] }); }}><Heart size={18} fill={p.isFavorite ? "currentColor" : "none"} /></button>
              <button type="button" className={cn("icon-button", p.inCompare && "active")} aria-label={t("shop.compare")} onClick={async () => { if (!user) return navigate(`/login?next=/product/${slug}`); await post("/compare", { productId: p.id, action: p.inCompare ? "remove" : "add" }); await qc.invalidateQueries({ queryKey: ["api"] }); toast.success(t("shop.compareUpdated")); }}><Scale size={18} /></button>
            </div>
            <ul className="product-delivery mt-4">
              {p.deliveryOptions.map((d: any) => <li key={d.method}>{d.method === "WITH_INSTALLATION" ? <Wrench size={15} /> : <Truck size={15} />} <span>{d.label}</span> <small>{d.price ? (Number(d.price.amount) ? money(d.price) : t("shop.free")) : "—"} · {d.eta}</small></li>)}
            </ul>
            <p className="text-sm mt-2"><BadgeCheck size={14} /> {p.warranty.months ? t("shop.warrantyMonths", { months: p.warranty.months }) : t("shop.noWarranty")}</p>
          </div>
        </section>
      </div>

      <div className="kit-grid cols-2 mt-6">
        <Card title={t("shop.specs")}>
          {Object.entries(groups).map(([g, attrs]) => (
            <div key={g} className="mb-3">
              <h3 className="text-sm text-muted">{g}</h3>
              <KeyValue items={(attrs as any[]).map((a) => [a.name, a.displayValue])} />
            </div>
          ))}
        </Card>
        <Card title={t("shop.stockByBranch")}>
          <ul className="kit-list">
            {p.branchStock.map((b: any) => <li key={b.branchId} className="flex justify-between"><span>{b.branchName}</span><StockPill status={b.status} label={qty(b.available)} /></li>)}
          </ul>
        </Card>
        {(p.compatibleModels.length > 0 || p.type === "SPARE_PART") && (
          <Card title={t("shop.compatibleDevices")}>
            {p.compatibleModels.length ? <ul className="kit-chip-grid mb-3">{p.compatibleModels.map((m: any) => <li key={m.id} className="chip">{m.fullName}</li>)}</ul> : <p className="text-muted">{t("shop.noCompatibility")}</p>}
            {devices.data?.items?.length > 0 && (
              <div className="kit-note">
                <SelectField label={t("shop.fitsMyDeviceQ")} value={checkDevice} onValue={setCheckDevice} placeholder={t("common.choose")} options={devices.data.items.map((d: any) => ({ value: d.id, label: d.nickname ?? d.modelName }))} />
                {compat.data && <p className={compat.data.compatible ? "text-success" : "text-danger"}>{compat.data.compatible ? t("shop.fitsYes", { model: compat.data.modelName }) : t("shop.fitsNo", { model: compat.data.modelName ?? "—" })}</p>}
              </div>
            )}
            {p.analogs.length > 0 && <><h3 className="text-sm mt-3">{t("shop.analogs")}</h3><ul>{p.analogs.map((a: any) => <li key={a.id}><Link to={`/product/${a.slug}`} className="text-brand">{a.name}</Link>{a.oemCode ? ` · OEM ${a.oemCode}` : ""}</li>)}</ul></>}
          </Card>
        )}
        <Card title={t("shop.description")}><p style={{ whiteSpace: "pre-line" }}>{p.description}</p></Card>
      </div>

      <Card title={t("shop.reviews", { count: p.reviews.length })} className="mt-6" actions={p.canReview && <button type="button" className="btn outline btn-sm" onClick={() => setReviewOpen(true)}><Star size={14} /> {t("reviews.write")}</button>}>
        {!p.reviews.length ? <EmptyState title={t("shop.noReviews")} /> : (
          <ul className="kit-reviews">
            {p.reviews.map((r: any) => (
              <li key={r.id}>
                <div className="flex justify-between"><strong>{r.authorName}</strong><Stars value={r.rating} /></div>
                {r.verifiedPurchase && <small className="text-success">{t("shop.verifiedPurchase")}</small>}
                <p>{r.comment}</p>
                {(r.pros || r.cons) && <p className="text-sm">{r.pros && <>+ {r.pros} </>}{r.cons && <>− {r.cons}</>}</p>}
                {r.reply && <p className="kit-note text-sm">{r.reply}</p>}
                <small className="text-muted">{date(r.createdAt)}</small>
              </li>
            ))}
          </ul>
        )}
      </Card>
      {p.related.length > 0 && (
        <section className="mt-6">
          <h2>{t("shop.related")}</h2>
          <div className="shop-grid">{p.related.slice(0, 4).map((r: any) => <ProductTile key={r.id} p={r} />)}</div>
        </section>
      )}
      {reviewOpen && <ReviewDialog target="PRODUCT" targetId={p.id} onClose={() => setReviewOpen(false)} />}
    </div>
  );
}

export function ReviewDialog({ target, targetId, orderId, onClose, title }: { target: "PRODUCT" | "TECHNICIAN" | "SERVICE"; targetId: string; orderId?: string; onClose: () => void; title?: string }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const form = useFormState({ rating: 0, quality: 5, punctuality: 5, behavior: 5, pros: "", cons: "", comment: "" });
  const [error, setError] = useState<unknown>(null);
  const v = form.values;
  return (
    <Dialog open onClose={onClose} title={title ?? t("reviews.write")} footer={<><button type="button" className="btn outline" onClick={onClose}>{t("common.cancel")}</button><button type="button" className="btn primary" onClick={async () => { setError(null); try { await post("/reviews", { target, targetId, orderId, rating: v.rating, criteria: target === "PRODUCT" ? {} : { quality: v.quality, punctuality: v.punctuality, behavior: v.behavior }, pros: v.pros || undefined, cons: v.cons || undefined, comment: v.comment }); await qc.invalidateQueries({ queryKey: ["api"] }); toast.success(t("reviews.sent")); onClose(); } catch (e) { setError(e); form.fromError(e); } }}>{t("reviews.send")}</button></>}>
      <FormError error={error instanceof ApiError && !Object.keys(error.fieldErrors).length ? error : null} />
      <div className="kit-rate" role="radiogroup" aria-label={t("reviews.rating")}>
        {[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" role="radio" aria-checked={v.rating === n} aria-label={`${n}`} className={cn(n <= v.rating && "on")} onClick={() => form.set("rating", n)}><Star size={26} fill={n <= v.rating ? "currentColor" : "none"} /></button>)}
      </div>
      {form.errors.rating && <p className="kit-field-error">{t("validation.rating")}</p>}
      {target !== "PRODUCT" && (
        <div className="kit-grid cols-3">
          {(["quality", "punctuality", "behavior"] as const).map((c) => <SelectField key={c} label={t(`reviews.${c}`)} value={String(v[c])} onValue={(x) => form.set(c, Number(x))} options={[5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: "★".repeat(n) }))} />)}
        </div>
      )}
      {target === "PRODUCT" && (
        <div className="kit-grid cols-2">
          <TextField label={t("reviews.pros")} value={v.pros} onValue={(x) => form.set("pros", x)} />
          <TextField label={t("reviews.cons")} value={v.cons} onValue={(x) => form.set("cons", x)} />
        </div>
      )}
      <TextArea label={t("reviews.comment")} required value={v.comment} onValue={(x) => form.set("comment", x)} error={form.errors.comment} rows={4} />
      <p className="text-sm text-muted">{t("reviews.moderationNote")}</p>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Axtarış (§29)                                                        */
/* ------------------------------------------------------------------ */

export function SearchPage() {
  const { t } = useI18n();
  const { query, setQuery } = useRouter();
  const q = query.get("q") ?? "";
  const res = useApi<any>(q ? `/search?q=${encodeURIComponent(q)}&limit=12` : "/search?q=");
  const [recent, setRecent] = useState<string[]>([]);
  useEffect(() => {
    try { setRecent(JSON.parse(localStorage.getItem("recent-searches") ?? "[]")); } catch { setRecent([]); }
  }, []);
  useEffect(() => {
    if (!q) return;
    try {
      const next = [q, ...recent.filter((x) => x !== q)].slice(0, 6);
      localStorage.setItem("recent-searches", JSON.stringify(next));
      setRecent(next);
    } catch { /* yox */ }
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps
  const d = res.data;
  return (
    <div className="container py-6">
      <h1>{t("search.title")}</h1>
      <div className="max-w-xl"><SearchBox value={q} onChange={(v) => setQuery({ q: v })} placeholder={t("nav.searchPlaceholder")} autoFocus /></div>
      {d?.normalizedQuery && d.normalizedQuery !== q.toLowerCase() && <p className="text-sm text-muted mt-2">{t("search.normalized", { q: d.normalizedQuery })}</p>}
      {!q && (
        <div className="mt-4">
          {recent.length > 0 && <><h3>{t("search.recent")}</h3><div className="kit-chip-grid mb-3">{recent.map((r) => <button key={r} type="button" className="chip" onClick={() => setQuery({ q: r })}>{r}</button>)}</div></>}
          <h3>{t("search.popular")}</h3>
          <div className="kit-chip-grid">{d?.popular?.map((p: string) => <button key={p} type="button" className="chip" onClick={() => setQuery({ q: p })}>{p}</button>)}</div>
        </div>
      )}
      {q && (res.isLoading ? <Loading rows={6} /> : res.error ? <ErrorState error={res.error} onRetry={() => res.refetch()} /> : !d.total ? (
        <EmptyState title={t("search.none", { q })} text={t("search.tryThese")} action={<div className="kit-chip-grid">{d.suggestions.map((s: string) => <button key={s} type="button" className="chip" onClick={() => setQuery({ q: s })}>{s}</button>)}</div>} />
      ) : (
        <div className="mt-4 search-results">
          <p className="text-muted">{t("search.total", { count: d.total })}</p>
          {(d.brands.length > 0 || d.models.length > 0) && (
            <Card title={t("search.brandsModels")}>
              <div className="kit-chip-grid">
                {d.brands.map((b: any) => <Link key={b.id} to={`/shop?brand=${b.slug}`} className="chip">{b.name}</Link>)}
                {d.models.map((m: any) => <span key={m.id} className="chip">{m.fullName} <small>{t("search.partsFor", { count: m.compatiblePartCount })}</small></span>)}
              </div>
            </Card>
          )}
          {d.services.length > 0 && (
            <Card title={t("services")}>
              <ul className="kit-list">{d.services.map((s: any) => <li key={s.id}><Link to={`/services/${s.slug}`} className="text-brand">{s.name}</Link> <small className="text-muted">· {s.categoryName}</small></li>)}</ul>
            </Card>
          )}
          {d.products.length > 0 && <section><h2>{t("search.products")}</h2><div className="shop-grid">{d.products.map((p: any) => <ProductTile key={p.id} p={p} />)}</div></section>}
          {d.spareParts.length > 0 && <section><h2>{t("search.parts")}</h2><div className="shop-grid">{d.spareParts.map((p: any) => <ProductTile key={p.id} p={p} />)}</div></section>}
          {d.faq.length > 0 && <Card title="FAQ"><ul className="kit-list">{d.faq.map((f: any) => <li key={f.id}><Link to="/faq" className="text-brand">{f.question}</Link></li>)}</ul></Card>}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Müqayisə                                                             */
/* ------------------------------------------------------------------ */

export function ComparePage() {
  const { t } = useI18n();
  const { user } = useSession();
  const qc = useQueryClient();
  const [onlyDiff, setOnlyDiff] = useState(false);
  const q = useApi<any>(user ? "/compare" : null);
  if (!user) return <div className="container py-8"><EmptyState title={t("compare.loginTitle")} action={<Link to="/login?next=/compare" className="btn primary">{t("login")}</Link>} /></div>;
  return (
    <div className="container py-6">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h1>{t("compare.title")}</h1>
        <div className="flex gap-2">
          <Check checked={onlyDiff} onValue={setOnlyDiff} label={t("compare.onlyDiff")} />
          <button type="button" className="btn outline btn-sm" onClick={async () => { await post("/compare", { action: "clear", productId: "" }); await qc.invalidateQueries({ queryKey: ["api"] }); }}>{t("compare.clear")}</button>
        </div>
      </div>
      <QueryView query={q} isEmpty={(d: any) => !d.products.length} empty={<EmptyState title={t("compare.empty")} action={<Link to="/shop" className="btn primary">{t("nav.shop")}</Link>} />}>
        {(d: any) => (
          <div className="table-wrap">
            <table className="compare-table">
              <thead>
                <tr><th scope="col">{t("compare.feature")}</th>{d.products.map((p: any) => <th key={p.id} scope="col"><ProductVisual kind={p.imageUrl} tone={p.imageTone} size="sm" /><Link to={`/product/${p.slug}`}>{p.name}</Link><PriceTag price={p.price} size="sm" /><button type="button" className="btn ghost btn-sm" onClick={async () => { await post("/compare", { productId: p.id, action: "remove" }); await qc.invalidateQueries({ queryKey: ["api"] }); }}><X size={12} /> {t("common.remove")}</button></th>)}</tr>
              </thead>
              <tbody>
                {d.rows.filter((r: any) => !onlyDiff || r.different).map((r: any) => (
                  <tr key={r.code} className={cn(r.different && "diff")}><th scope="row">{r.name}</th>{r.values.map((v: any, i: number) => <td key={i}>{v ? v.join(", ") : "—"}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </QueryView>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Səbət (§31.1)                                                        */
/* ------------------------------------------------------------------ */

export function CartPage() {
  const { t, money, qty, unit } = useI18n();
  const { navigate } = useRouter();
  const { user } = useSession();
  const { refresh } = useCartActions();
  const cart = useApi<any>("/cart");
  const [promo, setPromo] = useState("");
  const update = async (id: string, body: Record<string, unknown>) => {
    try { await patch(`/cart/items/${id}`, body); await refresh(); } catch (e) { toast.error(errorText(e, t("errors.generic"))); }
  };
  return (
    <div className="container py-6">
      <h1>{t("cart.title")}</h1>
      <QueryView query={cart} isEmpty={(c: any) => !c.items.length} empty={<EmptyState icon={ShoppingCart} title={t("cart.empty")} action={<Link to="/shop" className="btn primary">{t("cart.goShopping")}</Link>} />}>
        {(c: any) => (
          <div className="cart-grid">
            <section className="kit-card">
              <ul className="cart-lines">
                {c.merged && <li className="alert alert-success">{t("cart.merged")}</li>}
                {c.items.map((i: any) => (
                  <li key={i.id} className="cart-line">
                    <Link to={`/product/${i.slug}`} className="cart-line-media"><ProductVisual kind={i.imageUrl} tone={i.imageTone} size="sm" label={i.name} /></Link>
                    <div className="cart-line-info">
                      <Link to={`/product/${i.slug}`} className="font-semibold">{i.name}</Link>
                      <small className="block text-muted">{i.variantName} · {i.sku}</small>
                      <small className="block">{money(i.unitPriceForUnit)} / {unit(i.quantity.unit)}{i.quantity.unit !== i.baseQuantity.unit ? ` · ${t("cart.baseEquivalent", { qty: qty(i.baseQuantity) })}` : ""}</small>
                      {i.warnings.map((w: any) => <small key={w.code} className={cn("block", w.code === "OUT_OF_STOCK" ? "text-danger" : "text-warning")}>⚠ {w.message}</small>)}
                      {i.installationAvailable && <Check checked={!!i.installation} onValue={(v) => update(i.id, { withInstallation: v })} label={t("cart.withInstallation", { price: money(i.installationAvailable.price) })} />}
                      {i.returnRestriction && <small className="block text-muted">{i.returnRestriction}</small>}
                    </div>
                    <div className="cart-line-qty">
                      <QuantityInput value={i.quantity.value} onValue={(v) => Number(v) > 0 && update(i.id, { quantity: v })} unit={i.quantity.unit} units={i.availableUnits.length > 1 ? i.availableUnits.map((u: any) => u.unit) : undefined} onUnit={(u) => update(i.id, { unit: u })} />
                    </div>
                    <div className="cart-line-total">
                      <strong>{money(i.lineTotal)}</strong>
                      <button type="button" className="btn ghost btn-sm" onClick={async () => { await del(`/cart/items/${i.id}`); await refresh(); }}>{t("common.remove")}</button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
            <aside className="kit-card cart-summary-card">
              <div className="kit-card-body">
                <h2>{t("cart.summary")}</h2>
                <form className="flex gap-2 mb-3" onSubmit={async (e) => { e.preventDefault(); await post("/cart/promo", { code: promo }); await refresh(); }}>
                  <input className="form-input" placeholder={t("cart.promoPlaceholder")} aria-label={t("cart.promo")} value={promo || c.promoCode || ""} onChange={(e) => setPromo(e.target.value.toUpperCase())} />
                  <button className="btn outline">{t("shop.apply")}</button>
                </form>
                {c.promoError && <p className="kit-field-error">{c.promoError}</p>}
                {c.promoCode && !c.promoError && <button type="button" className="btn ghost btn-sm mb-2" onClick={async () => { setPromo(""); await post("/cart/promo", { code: null }); await refresh(); }}>{t("cart.removePromo", { code: c.promoCode })}</button>}
                <dl className="kit-totals">
                  <div><dt>{t("cart.itemsTotal")}</dt><dd>{money(c.totals.subtotal)}</dd></div>
                  {c.totals.appliedDiscounts.map((d: any) => <div key={d.code} className={d.applied ? "text-success" : "text-muted"}><dt>{d.label}{!d.applied && d.skippedReason ? ` (${d.skippedReason})` : ""}</dt><dd>{d.applied ? `−${money(d.amount)}` : "—"}</dd></div>)}
                  {Number(c.totals.installationTotal.amount) > 0 && <div><dt>{t("cart.installation")}</dt><dd>{money(c.totals.installationTotal)}</dd></div>}
                  <div className="text-muted"><dt>{c.totals.vatIncluded ? t("estimate.vatIncluded") : t("cart.vatOnTop")}</dt><dd>{money(c.totals.vatTotal)}</dd></div>
                  <div className="grand"><dt>{t("common.total")}</dt><dd>{money(c.totals.total)}</dd></div>
                </dl>
                <p className="text-sm text-muted">{t("cart.deliveryAtCheckout")}</p>
                <button type="button" className="btn primary btn-lg w-full mt-3" disabled={c.items.some((i: any) => i.stockStatus === "OUT_OF_STOCK")} onClick={() => navigate(user ? "/checkout" : "/login?next=/checkout")}>{user ? t("cart.checkout") : t("cart.loginToCheckout")}</button>
                {!user && <p className="text-sm text-muted mt-2">{t("cart.guestNote")}</p>}
              </div>
            </aside>
          </div>
        )}
      </QueryView>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Checkout (§31.2)                                                     */
/* ------------------------------------------------------------------ */

export function CheckoutPage() {
  const { t, money, text, enumLabel, dateTime, time, date } = useI18n();
  const { navigate } = useRouter();
  const { session, refresh } = useSession();
  const [key] = useState(() => idempotencyKey());
  const form = useFormState({ deliveryMethod: "COURIER", addressMode: "saved" as "saved" | "oneTime", addressId: "", city: "Bakı", street: "", building: "", apartment: "", pickupBranchId: "", installationSlot: "", paymentMethod: "CARD_ONLINE", installmentMonths: 12, companyName: session?.user?.companyName ?? "", voen: "", bankAccount: "", note: "" });
  const v = form.values;
  const opts = useApi<any>(`/checkout/options?deliveryMethod=${v.deliveryMethod}`, { placeholderData: (p: any) => p });
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!opts.data) return;
    if (!v.addressId && opts.data.addresses[0]) form.set("addressId", opts.data.addresses.find((a: any) => a.isDefault)?.id ?? opts.data.addresses[0].id);
    if (opts.data.company && !v.companyName) { form.set("companyName", opts.data.company.name); form.set("voen", opts.data.company.voen); }
    const pm = opts.data.paymentMethods.find((m: any) => m.method === v.paymentMethod);
    if (pm && !pm.available) form.set("paymentMethod", opts.data.paymentMethods.find((m: any) => m.available)?.method ?? "CARD_ONLINE");
  }, [opts.data]); // eslint-disable-line react-hooks/exhaustive-deps
  if (opts.isLoading) return <div className="container py-8"><Loading rows={8} /></div>;
  if (opts.error) return <div className="container py-8"><ErrorState error={opts.error} onRetry={() => opts.refetch()} /></div>;
  const o = opts.data;
  const s = o.summary;
  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await post("/checkout", {
        deliveryMethod: v.deliveryMethod,
        addressId: v.deliveryMethod !== "PICKUP" && v.addressMode === "saved" ? v.addressId : null,
        oneTimeAddress: v.deliveryMethod !== "PICKUP" && v.addressMode === "oneTime" ? { city: v.city, street: v.street, building: v.building || undefined, apartment: v.apartment || undefined } : null,
        pickupBranchId: v.deliveryMethod === "PICKUP" ? v.pickupBranchId : null,
        installationSlot: o.needsInstallation ? v.installationSlot || null : null,
        paymentMethod: v.paymentMethod,
        installmentMonths: v.paymentMethod === "INSTALLMENT" ? v.installmentMonths : null,
        invoice: o.requiresInvoiceDetails ? { companyName: v.companyName, voen: v.voen, bankAccount: v.bankAccount || undefined } : null,
        note: v.note || undefined,
        idempotencyKey: key,
      });
      await refresh();
      if (r.redirectUrl) navigate(r.redirectUrl);
      else navigate(`/checkout/result?order=${r.salesOrderId}`);
    } catch (e) {
      setError(e);
      form.fromError(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="container py-6">
      <h1>{t("checkout.title")}</h1>
      <div className="cart-grid">
        <div className="grid gap-4">
          <FormError error={error} />
          <Card title={`1. ${t("checkout.delivery")}`}>
            <Radios name="delivery" value={v.deliveryMethod} onValue={(x) => form.set("deliveryMethod", x)} columns={3} options={o.deliveryMethods.map((d: any) => ({ value: d.method, label: d.label, hint: `${Number(d.price.amount) ? money(d.price) : t("shop.free")} · ${d.eta}`, disabled: !d.available }))} />
          </Card>
          {v.deliveryMethod === "PICKUP" ? (
            <Card title={`2. ${t("checkout.pickupBranch")}`}>
              <Radios name="branch" value={v.pickupBranchId} onValue={(x) => form.set("pickupBranchId", x)} options={o.pickupBranches.map((b: any) => ({ value: b.id, label: b.name, hint: `${b.address} · ${b.readyIn}`, badge: b.allInStock ? <span className="badge badge-success">{t("checkout.allInStock")}</span> : <span className="badge badge-warning">{t("checkout.partialStock")}</span> }))} />
              {form.errors.pickupBranchId && <p className="kit-field-error">{t("validation.required")}</p>}
            </Card>
          ) : (
            <Card title={`2. ${t("checkout.address")}`} subtitle={o.addressRules.oneTimeAllowed ? t("checkout.addressRulePro") : t("checkout.addressRuleBasic")}>
              {o.addresses.length > 0 && (
                <Radios name="addressMode" value={v.addressMode} onValue={(x) => form.set("addressMode", x)} columns={2} options={[{ value: "saved", label: t("checkout.savedAddress") }, { value: "oneTime", label: t("checkout.oneTimeAddress"), disabled: !o.addressRules.oneTimeAllowed, badge: !o.addressRules.oneTimeAllowed ? <span className="badge badge-warning">{t("plans.premiumBadge")}</span> : undefined }]} />
              )}
              <div className="mt-3">
                {v.addressMode === "saved" ? (
                  o.addresses.length ? <Radios name="address" value={v.addressId} onValue={(x) => form.set("addressId", x)} options={o.addresses.map((a: any) => ({ value: a.id, label: a.label, hint: `${a.city}, ${a.street}${a.apartment ? `, ${t("fields.apartment")} ${a.apartment}` : ""}` }))} /> : <EmptyState title={t("checkout.noAddress")} action={<Link to="/account/addresses" className="btn outline">{t("checkout.addAddress")}</Link>} />
                ) : (
                  <div className="kit-grid cols-2">
                    <TextField label={t("fields.city")} required value={v.city} onValue={(x) => form.set("city", x)} error={form.errors["oneTimeAddress.city"]} />
                    <TextField label={t("fields.street")} required value={v.street} onValue={(x) => form.set("street", x)} error={form.errors["oneTimeAddress.street"]} />
                    <TextField label={t("fields.building")} value={v.building} onValue={(x) => form.set("building", x)} />
                    <TextField label={t("fields.apartment")} value={v.apartment} onValue={(x) => form.set("apartment", x)} />
                    <p className="text-sm text-muted span-2">{t("checkout.oneTimeNotSaved")}</p>
                  </div>
                )}
                {(form.errors.oneTimeAddress || form.errors.addressId) && <p className="kit-field-error">{t(form.errors.oneTimeAddress?.[0] ?? "validation.required")}</p>}
              </div>
            </Card>
          )}
          {o.needsInstallation && (
            <Card title={`3. ${t("checkout.installationTime")}`}>
              <div className="kit-slot-days">
                {o.installationSlots.map((d: any) => (
                  <div key={d.date}>
                    <strong className="text-sm">{date(d.slots[0]?.start)}</strong>
                    <div className="kit-slot-grid">{d.slots.map((sl: any) => <button key={sl.start} type="button" disabled={!sl.available} className={cn("kit-slot", v.installationSlot === sl.start && "active")} onClick={() => form.set("installationSlot", sl.start)}>{time(sl.start)}–{time(sl.end)}</button>)}</div>
                  </div>
                ))}
              </div>
            </Card>
          )}
          <Card title={`${o.needsInstallation ? 4 : 3}. ${t("checkout.payment")}`}>
            <Radios name="payment" value={v.paymentMethod} onValue={(x) => form.set("paymentMethod", x)} columns={2} options={o.paymentMethods.map((m: any) => ({ value: m.method, label: m.label, hint: m.note, disabled: !m.available }))} />
            {v.paymentMethod === "INSTALLMENT" && o.installmentOffers.length > 0 && (
              <div className="mt-3"><Radios name="months" value={String(v.installmentMonths)} onValue={(x) => form.set("installmentMonths", Number(x))} columns={3} options={o.installmentOffers.map((i: any) => ({ value: String(i.months), label: `${i.months} ${t("checkout.months")}`, hint: `${money(i.monthly)} / ${t("checkout.month")} · ${i.provider}` }))} /></div>
            )}
            {o.company && <p className="text-sm mt-2">{t("checkout.creditAvailable", { amount: money(o.company.creditAvailable) })}</p>}
            <p className="text-sm text-muted mt-2">{t("checkout.cardSafety")}</p>
          </Card>
          {o.requiresInvoiceDetails && (
            <Card title={t("checkout.invoice")}>
              <div className="kit-grid cols-2">
                <TextField label={t("b2bApply.companyName")} required value={v.companyName} onValue={(x) => form.set("companyName", x)} />
                <TextField label={t("docs.voen")} required value={v.voen} onValue={(x) => form.set("voen", x)} />
                <TextField label={t("checkout.bankAccount")} value={v.bankAccount} onValue={(x) => form.set("bankAccount", x)} className="span-2" />
              </div>
            </Card>
          )}
          <Card title={t("common.note")}><TextArea value={v.note} onValue={(x) => form.set("note", x)} rows={2} /></Card>
        </div>
        <aside className="kit-card cart-summary-card">
          <div className="kit-card-body">
            <h2>{t("checkout.review")}</h2>
            <ul className="kit-list text-sm">{s.items.map((i: any) => <li key={i.id} className="flex justify-between gap-2"><span>{i.name} × {i.quantity.value}</span><strong>{money(i.lineTotal)}</strong></li>)}</ul>
            <dl className="kit-totals">
              <div><dt>{t("cart.itemsTotal")}</dt><dd>{money(s.totals.subtotal)}</dd></div>
              {s.totals.appliedDiscounts.filter((d: any) => d.applied).map((d: any) => <div key={d.code} className="text-success"><dt>{d.label}</dt><dd>−{money(d.amount)}</dd></div>)}
              {Number(s.totals.installationTotal.amount) > 0 && <div><dt>{t("cart.installation")}</dt><dd>{money(s.totals.installationTotal)}</dd></div>}
              <div><dt>{t("checkout.deliveryFee")}</dt><dd>{Number(s.totals.deliveryTotal.amount) ? money(s.totals.deliveryTotal) : t("shop.free")}</dd></div>
              <div className="grand"><dt>{t("common.total")}</dt><dd>{money(s.totals.total)}</dd></div>
            </dl>
            <p className="text-sm text-muted">{t("checkout.agree")} <Link to="/terms" className="text-brand">{t("legal.terms")}</Link></p>
            <button type="button" className="btn primary btn-lg w-full mt-3" disabled={busy} onClick={submit}>{v.paymentMethod === "CARD_ONLINE" || v.paymentMethod === "INSTALLMENT" ? t("checkout.payNow") : t("checkout.placeOrder")}</button>
            <Link to="/cart" className="btn ghost w-full mt-2">{t("checkout.backToCart")}</Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

/** Ödəniş provayderinin səhifəsinin simulyasiyası — real kart məlumatı daxil edilmir (§48). */
export function PayPage() {
  const { t, money, enumLabel } = useI18n();
  const { query, navigate } = useRouter();
  const id = query.get("paymentId");
  const p = useApi<any>(id ? `/payments/${id}` : null);
  const [busy, setBusy] = useState(false);
  const go = async (outcome: "success" | "fail" | "cancel") => {
    setBusy(true);
    try { await post(`/payments/${id}/provider-callback`, { outcome }); navigate(`/checkout/result?paymentId=${id}`, { replace: true }); } finally { setBusy(false); }
  };
  return (
    <div className="container py-10 max-w-lg mx-auto">
      <div className="kit-card provider-page">
        <div className="kit-card-body text-center">
          <span className="badge badge-warning">{t("pay.sandbox")}</span>
          <h1 className="mt-3">{p.data?.provider ?? "Epoint"}</h1>
          {p.isLoading ? <Loading /> : p.error ? <ErrorState error={p.error} /> : (
            <>
              <p>{t("pay.order", { number: p.data.orderNumber })}</p>
              <strong className="provider-amount">{money(p.data.amount)}</strong>
              <p className="text-sm text-muted">{enumLabel("PaymentMethod", p.data.method)}{p.data.installmentMonths ? ` · ${p.data.installmentMonths} ${t("checkout.months")}` : ""}</p>
              <p className="kit-note text-sm">{t("pay.noCardData")}</p>
              <div className="grid gap-2 mt-4">
                <button type="button" className="btn primary" disabled={busy} onClick={() => go("success")}>{t("pay.simulateSuccess")}</button>
                <button type="button" className="btn outline" disabled={busy} onClick={() => go("fail")}>{t("pay.simulateFail")}</button>
                <button type="button" className="btn ghost" disabled={busy} onClick={() => go("cancel")}>{t("pay.cancel")}</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** Nəticə səhifəsi statusu URL-dən yox, API-dən yoxlayır (§48). */
export function CheckoutResultPage() {
  const { t, money, enumLabel } = useI18n();
  const { query, navigate } = useRouter();
  const paymentId = query.get("paymentId");
  const orderId = query.get("order");
  const p = useApi<any>(paymentId ? `/payments/${paymentId}` : null, { refetchInterval: (q) => (["INITIATED", "PENDING"].includes((q.state.data as any)?.status) ? 2000 : false) });
  const order = useApi<any>(orderId ? `/account/orders/${orderId}` : null);
  const status = p.data?.status;
  const ok = status === "PAID" || (!paymentId && order.data);
  const salesId = p.data?.salesOrderId ?? orderId;
  return (
    <div className="container py-10 max-w-xl mx-auto text-center">
      {p.isLoading || order.isLoading ? <Loading /> : (
        <>
          <div className={cn("result-icon", ok ? "ok" : status === "PENDING" || status === "INITIATED" ? "wait" : "fail")}>{ok ? "✓" : status === "PENDING" ? "…" : "!"}</div>
          <h1>{ok ? t("result.successTitle") : status === "CANCELLED" ? t("result.cancelledTitle") : status === "FAILED" ? t("result.failTitle") : t("result.pendingTitle")}</h1>
          {p.data && <p>{enumLabel("PaymentStatus", p.data.status)} · {money(p.data.amount)} · {p.data.orderNumber}</p>}
          {p.data?.failureReason && <p className="text-danger">{p.data.failureReason}</p>}
          {order.data && <p>{t("result.orderCreated", { number: order.data.number })} · {enumLabel("PaymentMethod", order.data.paymentMethod)}</p>}
          <div className="flex gap-2 justify-center flex-wrap mt-4">
            {salesId && <Link to={`/account/orders/${salesId}`} className="btn primary">{t("result.viewOrder")}</Link>}
            {p.data?.serviceOrderId && <Link to={`/account/services/${p.data.serviceOrderId}`} className="btn primary">{t("result.viewOrder")}</Link>}
            {p.data?.subscriptionId && <Link to="/account/subscription" className="btn primary">{t("result.viewSubscription")}</Link>}
            {!ok && paymentId && p.data && p.data.orderId && (
              <button type="button" className="btn outline" onClick={async () => { const r = await post("/payments", { orderType: p.data.orderType, orderId: p.data.orderId, method: p.data.method === "INSTALLMENT" ? "INSTALLMENT" : "CARD_ONLINE", installmentMonths: p.data.installmentMonths ?? undefined, idempotencyKey: idempotencyKey() }); navigate(r.redirectUrl); }}>
                {t("result.retryPayment")}
              </button>
            )}
            <Link to="/shop" className="btn ghost">{t("cart.goShopping")}</Link>
          </div>
        </>
      )}
    </div>
  );
}
