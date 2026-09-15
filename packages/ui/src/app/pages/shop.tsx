"use client";
import React, { useEffect, useState } from "react";
import { BadgeCheck, Banknote, ChevronDown, ChevronLeft, ChevronRight, CreditCard, Flag, Heart, Scale, ShieldCheck, ShoppingCart, SlidersHorizontal, Star, Tag, Trash2, Truck, Wrench, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@sp/utils";
import { ApiError, idempotencyKey, post, qs, useApi, useQueryClient, del, patch } from "@sp/api-client";
import { useI18n } from "../core/i18n";
import { Link, useRouter } from "../core/router";
import { useSession } from "../core/session";
import { Card, EmptyState, ErrorState, FormError, Loading, Radios, SearchBox, SelectField, Stars, TextArea, TextField, errorText, useFormState } from "../kit/base";
import { ConfirmDialog, Dialog } from "../kit/actions";
import { StockPill } from "../kit/domain";
import { ProductVisual, QuantityInput } from "../kit/media";
import { ServiceIcon, productCategoryIcon } from "../../components/domain/service-icon";

/* ------------------------------------------------------------------ */
/* Səbət əməliyyatları                                                 */
/* ------------------------------------------------------------------ */

export function useCartActions() {
  const { t } = useI18n();
  const { navigate } = useRouter();
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ predicate: (q) => ["/cart", "/auth/session", "/checkout/options"].some((p) => String(q.queryKey[1] ?? "").startsWith(p)) });
  return {
    add: async (variantId: string, quantity = "1", unit = "pcs", withInstallation = false) => {
      try {
        await post("/cart/items", { variantId, quantity: String(quantity), unit, withInstallation });
        await refresh();
        toast.success(t("cart.added"), { action: { label: t("cart.title"), onClick: () => navigate("/cart") } });
      } catch (e) {
        toast.error(errorText(e, t("errors.generic")));
      }
    },
    refresh,
  };
}

/**
 * Favorit və müqayisə əməliyyatları. Hər əməliyyatdan sonra toast-da müvafiq səhifəyə keçid verilir —
 * istifadəçi siyahının harada olduğunu itirmir; qonaq girişə yönləndirilir və geri qaytarılır.
 */
export function useProductActions() {
  const { t, text } = useI18n();
  const { navigate, path, search } = useRouter();
  const { user, role } = useSession();
  const qc = useQueryClient();
  const requireLogin = () => {
    if (user) return false;
    toast.info(t("shop.loginRequired"));
    navigate(`/login?next=${encodeURIComponent(path + search)}`);
    return true;
  };
  const refresh = () => qc.invalidateQueries({ queryKey: ["api"] });
  return {
    toggleFavorite: async (p: { id: string; isFavorite?: boolean }) => {
      if (requireLogin()) return;
      try {
        const r = await post("/favorites", { productId: p.id });
        await refresh();
        const favoritesPage = role === "CUSTOMER" ? "/account/favorites" : null;
        toast.success(r.isFavorite ? t("shop.favoriteAdded") : t("shop.favoriteRemoved"), favoritesPage && r.isFavorite ? { action: { label: t("shop.viewFavorites"), onClick: () => navigate(favoritesPage) } } : undefined);
      } catch (e) {
        toast.error(errorText(e, t("errors.generic")));
      }
    },
    toggleCompare: async (p: { id: string; inCompare?: boolean }) => {
      if (requireLogin()) return;
      try {
        const r = await post("/compare", { productId: p.id, action: p.inCompare ? "remove" : "add" });
        await refresh();
        if (p.inCompare) toast.success(t("shop.compareRemoved"));
        else {
          const vars = { category: text(r.groupName), count: r.groupCount };
          toast.success(r.replaced ? t("shop.compareFull", vars) : t("shop.compareAdded", vars), { action: { label: t("shop.viewCompare"), onClick: () => navigate(`/compare?group=${r.groupId}`) } });
        }
      } catch (e) {
        toast.error(errorText(e, t("errors.generic")));
      }
    },
  };
}

export function ProductTile({ p, compatibleBadge }: { p: any; compatibleBadge?: boolean }) {
  const { t, money } = useI18n();
  const { add } = useCartActions();
  const { toggleFavorite, toggleCompare } = useProductActions();
  const discounted = p.price && p.price.basePrice.amount !== p.price.effectivePrice.amount;
  const pct = discounted ? Math.round((1 - Number(p.price.effectivePrice.amount) / Number(p.price.basePrice.amount)) * 100) : 0;
  const outOfStock = p.stockStatus === "OUT_OF_STOCK";
  return (
    <article className="shop-tile">
      <div className="shop-tile-media">
        <Link to={`/product/${p.slug}`} tabIndex={-1} aria-hidden>
          <ProductVisual kind={p.imageUrl} tone={p.imageTone} label={p.name} />
        </Link>
        <div className="shop-tile-flags">
          {pct > 0 && <span className="shop-tile-pct">{t("shop.discountPct", { pct })}</span>}
          {p.isNew && <span className="badge badge-info">{t("shop.new")}</span>}
          {p.hasPromotion && !pct && <span className="badge badge-warning">{t("shop.sale")}</span>}
          {compatibleBadge && <span className="badge badge-success"><BadgeCheck size={12} /> {t("shop.fits")}</span>}
        </div>
        <div className="shop-tile-tools">
          <button type="button" className={cn("shop-tile-fav", p.isFavorite && "active")} aria-pressed={!!p.isFavorite} aria-label={`${t("shop.addFavorite")}: ${p.name}`} title={t("shop.addFavorite")} onClick={() => toggleFavorite(p)}>
            <Heart size={16} fill={p.isFavorite ? "currentColor" : "none"} />
          </button>
          <button type="button" className={cn("shop-tile-fav is-compare", p.inCompare && "active")} aria-pressed={!!p.inCompare} aria-label={`${p.inCompare ? t("shop.inCompare") : t("shop.addCompare")}: ${p.name}`} title={p.inCompare ? t("shop.inCompare") : t("shop.addCompare")} onClick={() => toggleCompare(p)}>
            <Scale size={16} />
          </button>
        </div>
      </div>
      <div className="shop-tile-body">
        {p.brandName && <span className="shop-tile-brand">{p.brandName}</span>}
        <h3 className="shop-tile-title"><Link to={`/product/${p.slug}`}>{p.name}</Link></h3>
        <div className="shop-tile-meta">
          {p.reviewCount > 0 && <Stars value={p.rating} count={p.reviewCount} />}
          <StockPill status={p.stockStatus} />
        </div>
      </div>
      <div className="shop-tile-foot">
        <div className="shop-tile-price">
          {discounted && <s>{money(p.price.basePrice)}</s>}
          <strong className={cn(discounted && "is-sale")}>{p.price ? money(p.price.effectivePrice) : "—"}</strong>
        </div>
        <button type="button" className="shop-tile-add" aria-label={`${t("add")}: ${p.name}`} title={t("add")} disabled={outOfStock} onClick={() => add(p.defaultVariantId, "1", p.baseUnit)}>
          <ShoppingCart size={17} aria-hidden />
        </button>
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Kataloq (§24, §28)                                                   */
/* ------------------------------------------------------------------ */

/** Kataloqda bir səhifədə göstərilən məhsul sayı (server render ilə eyni olmalıdır — `server.ts`). */
export const SHOP_PAGE_SIZE = 24;
const TOP_CATEGORIES_VISIBLE = 8;
const FACET_OPTIONS_VISIBLE = 6;

/** Yan paneldə yığcam kateqoriya naviqasiyası: kökdə ilk 8 kateqoriya, daxildə yalnız seçilmiş budaq. */
function CategoryNav({ nodes, categoryPath, base }: { nodes: any[]; categoryPath?: string; base: string }) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const current = categoryPath?.split("/") ?? [];
  const Branch = ({ list, depth }: { list: any[]; depth: number }) => (
    <ul className={cn("shop-tree", depth > 0 && "nested")}>
      {list.map((n) => {
        const key = n.path.join("/");
        const active = categoryPath === key;
        const open = !!categoryPath && (categoryPath === key || categoryPath.startsWith(`${key}/`));
        return (
          <li key={n.id}>
            <Link to={`${base}/${key}`} className={cn(active && "active", open && !active && "open")} aria-current={active ? "page" : undefined}><span>{n.name}</span> <small>{n.productCount}</small></Link>
            {open && n.children?.length > 0 && <Branch list={n.children} depth={depth + 1} />}
          </li>
        );
      })}
    </ul>
  );
  if (current.length) {
    const top = nodes.filter((n) => n.path[0] === current[0]);
    return (
      <>
        <Link to={base} className="shop-tree-back"><ChevronLeft size={15} aria-hidden /> {t("shop.allCategories")}</Link>
        <Branch list={top} depth={0} />
      </>
    );
  }
  const visible = expanded ? nodes : nodes.slice(0, TOP_CATEGORIES_VISIBLE);
  return (
    <>
      <Branch list={visible} depth={0} />
      {nodes.length > TOP_CATEGORIES_VISIBLE && (
        <button type="button" className="shop-more" aria-expanded={expanded} onClick={() => setExpanded((x) => !x)}>
          {expanded ? t("shop.lessCategories") : t("shop.moreCategories", { count: nodes.length - TOP_CATEGORIES_VISIBLE })}
          <ChevronDown size={14} className={cn(expanded && "rotate-180")} aria-hidden />
        </button>
      )}
    </>
  );
}

/** Uzun seçim siyahılarında ilk 6 variant və seçilmişlər göstərilir, qalanı "Daha çox" ilə açılır. */
function FacetOptions({ facet, isChecked, onToggle }: { facet: any; isChecked: (o: any) => boolean; onToggle: (o: any) => void }) {
  const { t } = useI18n();
  const [all, setAll] = useState(false);
  const options: any[] = facet.options;
  const hidden = options.length - FACET_OPTIONS_VISIBLE;
  const shown = all || hidden <= 1 ? options : options.filter((o, i) => i < FACET_OPTIONS_VISIBLE || isChecked(o));
  return (
    <>
      {shown.map((o) => (
        <label key={o.value} className={cn("kit-check", o.count === 0 && !isChecked(o) && "disabled")}>
          <input type="checkbox" checked={isChecked(o)} disabled={o.count === 0 && !isChecked(o)} onChange={() => onToggle(o)} />
          <span className="grow">{o.label}</span>
          <small className="shop-count">{o.count}</small>
        </label>
      ))}
      {hidden > 1 && (
        <button type="button" className="shop-more" aria-expanded={all} onClick={() => setAll((x) => !x)}>
          {all ? t("shop.lessCategories") : t("shop.showMoreOptions", { count: hidden })}
          <ChevronDown size={14} className={cn(all && "rotate-180")} aria-hidden />
        </button>
      )}
    </>
  );
}

/**
 * Kataloq. `base` B2B kabinetlərində kataloqun öz ünvanıdır (`/partner/catalog`) — kateqoriya keçidləri
 * istifadəçini kabinetdən çıxarmır.
 */
export function ShopPage({ categoryPath, base = "/shop" }: { categoryPath?: string; base?: string }) {
  const { t, num } = useI18n();
  const { query, setQuery, navigate } = useRouter();
  const { user } = useSession();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const categories = useApi<any[]>("/categories", { staleTime: 300_000 });
  const devices = useApi<any>(user && user.activeRole === "CUSTOMER" ? "/account/devices" : null);
  const params = Object.fromEntries(query.entries());
  const url = `/products${qs({ ...params, category: categoryPath, pageSize: SHOP_PAGE_SIZE })}`;
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
  const selectedIn = (f: any) => (f.range ? f.range.selectedMin != null || f.range.selectedMax != null : f.options?.some((o: any) => o.selected) || !!query.get(f.code));
  const renderFacets = (mobile = false) => (
    <div className="shop-facets">
      {devices.data?.items?.length > 0 && (
        <SelectField label={t("shop.fitsMyDevice")} value={query.get("deviceId") ?? ""} onValue={(v) => setQuery({ deviceId: v, page: null })} placeholder={t("shop.anyDevice")} options={devices.data.items.map((d: any) => ({ value: d.id, label: `${d.nickname ?? d.modelName}` }))} />
      )}
      {data?.facets?.map((f: any, i: number) => (
        <details key={f.code} className="shop-facet" open={mobile ? selectedIn(f) || i < 2 : i < 4 || selectedIn(f)}>
          <summary>
            <span>{f.name}{f.unit && f.display !== "CHECKBOX" ? `, ${f.unit}` : ""}</span>
            {selectedIn(f) && <i className="shop-facet-dot" aria-hidden />}
            <ChevronDown size={16} aria-hidden />
          </summary>
          <div className="shop-facet-body" role="group" aria-label={f.name}>
            {f.display === "CHECKBOX" ? (
              <FacetOptions
                facet={f}
                isChecked={(o) => (f.code === "rating" || f.code.startsWith("in") || f.code === "promo" || f.code === "isNew" ? query.get(f.code) === o.value : o.selected)}
                onToggle={(o) => (["inStock", "promo", "isNew", "rating"].includes(f.code) ? setQuery({ [f.code]: query.get(f.code) === o.value ? null : o.value, page: null }) : toggleOption(f.code, o.value))}
              />
            ) : f.range ? (
              <RangeFacet facet={f} onApply={(min, max) => setQuery({ [f.code === "price" ? "priceMin" : `${f.code}_min`]: min, [f.code === "price" ? "priceMax" : `${f.code}_max`]: max, page: null })} />
            ) : null}
          </div>
        </details>
      ))}
    </div>
  );
  const chips = activeChips.flatMap(([k, v]) => (k.startsWith("attr.") && !k.match(/_(min|max)$/) || k === "brand" || k === "country" ? v.split(",").map((x) => [k, x]) : [[k, v]]));
  const isShop = base === "/shop";
  const meta = data?.meta;
  const from = meta ? (meta.page - 1) * meta.pageSize + 1 : 0;
  const to = meta ? Math.min(meta.page * meta.pageSize, meta.total) : 0;
  const rootCats = !categoryPath ? (categories.data ?? []) : [];
  const subcats: any[] = categoryPath ? data?.children ?? [] : [];
  const showPromo = isShop && !query.get("q") && !chips.length && (meta?.page ?? 1) === 1;

  return (
    <div className="shop-page">
      <section className="shop-hero">
        <div className="container">
          <nav className="pg-crumbs" aria-label={t("common.breadcrumbs")}>
            {isShop && <><Link to="/">{t("home")}</Link> › </>}<Link to={base}>{isShop ? t("nav.shop") : t("b2b.nav.catalog")}</Link>
            {data?.breadcrumbs?.map((b: any) => <span key={b.slug}> › <Link to={b.href.replace(/^\/shop/, base)}>{b.name}</Link></span>)}
          </nav>
          <div className="shop-hero-row">
            <div className="shop-hero-copy">
              <h1>{data?.category?.name ?? t("shop.title")}</h1>
              <p>
                {data ? <strong>{t("shop.resultCount", { count: num(data.meta.total) })}</strong> : t("common.loading")}
                {data?.compatibleWith ? <span className="shop-compat"><BadgeCheck size={15} aria-hidden /> {t("shop.compatibleWith", { model: data.compatibleWith })}</span> : null}
              </p>
              {isShop && !categoryPath && <p className="shop-hero-lead">{t("shop.heroText")}</p>}
            </div>
            {isShop && (
              <ul className="shop-trust">
                <li><ShieldCheck size={17} aria-hidden /> {t("shop.trustOriginal")}</li>
                <li><Truck size={17} aria-hidden /> {t("shop.trustDelivery")}</li>
                <li><CreditCard size={17} aria-hidden /> {t("shop.trustInstallment")}</li>
                <li><Wrench size={17} aria-hidden /> {t("shop.trustInstall")}</li>
              </ul>
            )}
          </div>
          {(rootCats.length > 0 || subcats.length > 0) && (
            <nav className="shop-cats" aria-label={t("shop.browseCategories")}>
              {(rootCats.length ? rootCats : subcats).map((c: any) => {
                const slug = c.path?.[0] ?? c.slug;
                return (
                  <Link key={c.id} to={`${base}/${c.path.join("/")}`} className={cn("shop-cat", `svc-tone-${String(c.imageUrl ?? "illu:teal").replace("illu:", "")}`)}>
                    <span className="shop-cat-icon"><ServiceIcon name={productCategoryIcon(slug)} size={20} /></span>
                    <span className="shop-cat-name">{c.name}</span>
                    <small>{c.productCount}</small>
                  </Link>
                );
              })}
            </nav>
          )}
        </div>
      </section>

      <div className="container shop-main">
        <div className="shop-grid-layout">
          <aside className="shop-side" aria-label={t("shop.filters")}>
            <section className="shop-panel">
              <h2 className="shop-panel-title">{t("shop.categories")}</h2>
              {categories.isLoading ? <Loading /> : <CategoryNav nodes={categories.data ?? []} categoryPath={categoryPath} base={base} />}
            </section>
            {data?.facets?.length > 0 && (
              <section className="shop-panel">
                <div className="shop-panel-head">
                  <h2 className="shop-panel-title"><SlidersHorizontal size={16} aria-hidden /> {t("shop.filters")}</h2>
                  {chips.length > 0 && <button type="button" className="shop-reset" onClick={() => navigate(categoryPath ? `${base}/${categoryPath}` : base, { replace: true })}>{t("shop.resetAll")}</button>}
                </div>
                {renderFacets()}
              </section>
            )}
          </aside>

          <section className="shop-results" aria-live="polite">
            <div className="shop-toolbar">
              <SearchBox value={query.get("q") ?? ""} onChange={(v) => setQuery({ q: v, page: null })} placeholder={t("shop.searchInCatalog")} />
              <label className="shop-sort">
                <span>{t("shop.sortLabel")}</span>
                <select className="form-input" value={query.get("sort") ?? ""} onChange={(e) => setQuery({ sort: e.target.value, page: null })}>
                  {[["", t("shop.sortPopular")], ["price", t("shop.sortPriceAsc")], ["-price", t("shop.sortPriceDesc")], ["rating", t("shop.sortRating")], ["new", t("shop.sortNew")]].map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <button type="button" className="btn outline shop-filter-btn" onClick={() => setFiltersOpen(true)}><SlidersHorizontal size={16} /> {t("shop.filters")}{chips.length > 0 && <span className="shop-count on">{chips.length}</span>}</button>
            </div>

            <div className="shop-status">
              {meta && meta.total > 0 && <span className="shop-showing">{t("shop.showing", { from, to, total: num(meta.total) })}</span>}
              {chips.length > 0 && (
                <div className="shop-active" aria-label={t("shop.activeFilters")}>
                  {chips.map(([k, v]) => (
                    <button key={`${k}-${v}`} type="button" className="shop-chip" onClick={() => (k!.startsWith("attr.") && !k!.match(/_(min|max)$/) || k === "brand" || k === "country" ? toggleOption(k!, v!) : setQuery({ [k!]: null }))}>
                      {labelFor(k!, v!)} <X size={13} aria-hidden />
                    </button>
                  ))}
                  <button type="button" className="shop-reset" onClick={() => navigate(categoryPath ? `${base}/${categoryPath}` : base, { replace: true })}>{t("shop.resetAll")}</button>
                </div>
              )}
            </div>

            {list.isLoading ? <Loading rows={6} /> : list.error ? <ErrorState error={list.error} onRetry={() => list.refetch()} /> : !data.items.length ? (
              <EmptyState title={t("shop.noProducts")} text={t("shop.noProductsText")} action={<button type="button" className="btn outline" onClick={() => navigate(base)}>{t("shop.resetAll")}</button>} />
            ) : (
              <>
                <div className={cn("shop-grid", list.isFetching && "is-fetching")}>
                  {data.items.map((p: any, i: number) => (
                    <React.Fragment key={p.id}>
                      {showPromo && i === 8 && (
                        <aside className="shop-promo">
                          <span className="shop-promo-icon"><Wrench size={26} aria-hidden /></span>
                          <div className="shop-promo-copy">
                            <h2>{t("shop.promoTitle")}</h2>
                            <p>{t("shop.promoText")}</p>
                          </div>
                          <Link to="/services" className="btn">{t("shop.promoCta")}</Link>
                        </aside>
                      )}
                      <ProductTile p={p} compatibleBadge={!!query.get("deviceId")} />
                    </React.Fragment>
                  ))}
                </div>
                <ShopPager meta={data.meta} onPage={(page) => { setQuery({ page }, { replace: false }); if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" }); }} />
              </>
            )}
          </section>
        </div>
      </div>
      <Dialog open={filtersOpen} onClose={() => setFiltersOpen(false)} title={t("shop.filters")} footer={<button type="button" className="btn primary w-full" onClick={() => setFiltersOpen(false)}>{t("shop.showResults", { count: data?.meta?.total ?? 0 })}</button>}>
        <div className="shop-dialog-cats">
          <h3 className="h4">{t("shop.categories")}</h3>
          <CategoryNav nodes={categories.data ?? []} categoryPath={categoryPath} base={base} />
        </div>
        {renderFacets(true)}
      </Dialog>
    </div>
  );
}

/** Nömrəli səhifələmə: ilk, son, cari və qonşu səhifələr; aralarda "…". */
function ShopPager({ meta, onPage }: { meta: { page: number; totalPages: number; total: number; pageSize: number }; onPage: (page: number) => void }) {
  const { t } = useI18n();
  if (!meta || meta.totalPages <= 1) return null;
  const { page, totalPages } = meta;
  const nums = [...new Set([1, page - 1, page, page + 1, totalPages])].filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b);
  const items: (number | "gap")[] = [];
  nums.forEach((n, i) => { if (i && n - nums[i - 1]! > 1) items.push("gap"); items.push(n); });
  return (
    <nav className="shop-pager" aria-label={t("common.pagination")}>
      <button type="button" className="shop-pager-btn" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label={t("common.prev")}><ChevronLeft size={16} /></button>
      {items.map((n, i) => n === "gap" ? <span key={`g${i}`} className="shop-pager-gap">…</span> : (
        <button key={n} type="button" className={cn("shop-pager-btn", n === page && "active")} aria-current={n === page ? "page" : undefined} aria-label={t("shop.page", { page: n })} onClick={() => onPage(n)}>{n}</button>
      ))}
      <button type="button" className="shop-pager-btn" disabled={page >= totalPages} onClick={() => onPage(page + 1)} aria-label={t("common.next")}><ChevronRight size={16} /></button>
    </nav>
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

/** Mobil ekranda yığıla bilən bölmə; desktopda həmişə açıq qalır (CSS). */
function PdpSection({ id, title, badge, defaultOpen = false, children, className }: { id: string; title: string; badge?: React.ReactNode; defaultOpen?: boolean; children: React.ReactNode; className?: string }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section id={id} className={cn("pdp-section", !open && "is-collapsed", className)} aria-labelledby={`${id}-title`}>
      <h2 className="pdp-section-title" id={`${id}-title`}>
        <button type="button" aria-expanded={open} aria-controls={`${id}-body`} onClick={() => setOpen((x) => !x)}>
          <span>{title}</span>
          {badge}
          <ChevronDown size={18} className="pdp-chevron" aria-hidden />
        </button>
      </h2>
      <div className="pdp-section-body" id={`${id}-body`}>{children}</div>
    </section>
  );
}

export function ProductPage({ slug }: { slug: string }) {
  const { t, text, money, qty, date, num, unit: unitName } = useI18n();
  const { query, setQuery } = useRouter();
  const { user } = useSession();
  const { add } = useCartActions();
  const { toggleFavorite, toggleCompare } = useProductActions();
  const q = useApi<any>(`/products/${slug}`);
  const devices = useApi<any>(user?.activeRole === "CUSTOMER" ? "/account/devices" : null);
  const [image, setImage] = useState(0);
  const [amount, setAmount] = useState("1");
  const [unit, setUnit] = useState<string | null>(null);
  const [install, setInstall] = useState(false);
  const [checkDevice, setCheckDevice] = useState("");
  const compat = useApi<any>(checkDevice && q.data ? `/products/${q.data.id}/compatibility?deviceId=${checkDevice}` : null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [payMode, setPayMode] = useState<"cash" | "credit">("cash");
  const [months, setMonths] = useState(12);
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
  const price = variant.price;
  const discounted = price.basePrice.amount !== price.effectivePrice.amount;
  const pct = discounted ? Math.round((1 - Number(price.effectivePrice.amount) / Number(price.basePrice.amount)) * 100) : 0;
  const saving = discounted ? { amount: (Number(price.basePrice.amount) - Number(price.effectivePrice.amount)).toFixed(2), currency: price.effectivePrice.currency } : null;
  const outOfStock = variant.stockStatus === "OUT_OF_STOCK";
  const canAdd = !outOfStock && Number(amount) > 0;
  const plans: any[] = price.installmentPlans ?? [];
  const credit = payMode === "credit" ? plans.find((x) => x.months === months) ?? plans[plans.length - 1] : null;
  const qtyFactor = currentUnit === p.baseUnit ? Math.max(Number(amount) || 1, 1) : 1;
  const addToCart = async () => {
    await add(variant.id, amount, currentUnit, install);
    // Kredit seçimi checkout-da ödəniş üsulu kimi əvvəlcədən seçilir
    try {
      if (credit) sessionStorage.setItem(CREDIT_KEY, String(credit.months));
      else sessionStorage.removeItem(CREDIT_KEY);
    } catch {
      /* brauzer yaddaşı bağlıdır */
    }
  };
  const branchesWithStock = p.branchStock.filter((b: any) => Number(b.available.value) > 0).length;
  const gallery = p.gallery.length ? p.gallery : [{ id: "main", url: p.imageUrl }];
  const jsonLd = { "@context": "https://schema.org", "@type": "Product", name: p.name, sku: variant.sku, brand: { "@type": "Brand", name: p.brandName }, aggregateRating: p.reviewCount ? { "@type": "AggregateRating", ratingValue: p.rating, reviewCount: p.reviewCount } : undefined, offers: { "@type": "Offer", priceCurrency: "AZN", price: price.effectivePrice.amount, availability: outOfStock ? "https://schema.org/OutOfStock" : "https://schema.org/InStock" } };
  const sections = [
    ["pdp-overview", t("shop.overview")],
    ["pdp-specs", t("shop.specs")],
    ...(p.compatibleModels.length > 0 || p.type === "SPARE_PART" ? [["pdp-compat", t("shop.compatibleDevices")]] : []),
    ["pdp-stock", t("shop.stockByBranch")],
    ["pdp-reviews", t("shop.reviews", { count: p.reviews.length })],
  ];

  return (
    <div className="container pdp">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav className="pg-crumbs pdp-crumbs" aria-label={t("common.breadcrumbs")}>
        <Link to="/">{t("home")}</Link> › <Link to="/shop">{t("nav.shop")}</Link> › <Link to={`/shop/${p.categoryPath.join("/")}`}>{p.categoryName}</Link> › <span aria-current="page">{p.name}</span>
      </nav>

      <div className="pdp-hero">
        {/* Qalereya: desktopda əsas şəkil + miniatürlər, mobildə sürüşdürülən lent */}
        <section className="pdp-gallery" aria-label={t("shop.gallery")}>
          <div className="pdp-main-image">
            <ProductVisual kind={gallery[image]?.url ?? p.imageUrl} tone={image % 2 ? "slate" : p.imageTone} label={text(gallery[image]?.altI18n ?? gallery[image]?.alt) || p.name} size="lg" />
            <div className="pdp-flags">
              {discounted && <span className="pdp-badge-sale">{t("shop.discountPct", { pct })}</span>}
              {p.isNew && <span className="badge badge-info">{t("shop.new")}</span>}
              {p.videoUrl && <span className="badge badge-info">{t("shop.video")}</span>}
            </div>
          </div>
          {gallery.length > 1 && (
            <div className="pdp-thumbs" role="tablist" aria-label={t("shop.gallery")}>
              {gallery.map((g: any, i: number) => (
                <button key={g.id} type="button" role="tab" aria-selected={i === image} aria-label={t("shop.photo", { n: i + 1 })} className={cn(i === image && "active")} onClick={() => setImage(i)}>
                  <ProductVisual kind={g.url} tone={i % 2 ? "slate" : p.imageTone} size="sm" />
                </button>
              ))}
            </div>
          )}
          <div className="pdp-swipe" aria-hidden={false}>
            {gallery.map((g: any, i: number) => (
              <div key={g.id} className="pdp-swipe-item">
                <ProductVisual kind={g.url} tone={i % 2 ? "slate" : p.imageTone} size="lg" label={`${p.name} — ${t("shop.photo", { n: i + 1 })}`} />
              </div>
            ))}
          </div>
        </section>

        {/* Alış bloku */}
        <section className="pdp-buy" aria-label={p.name}>
          <div className="pdp-brand">
            <Link to={`/shop?brand=${p.brandSlug}`}>{p.brandName}</Link>
            {p.modelName && <span>{p.modelName}</span>}
          </div>
          <h1 className="pdp-title">{p.name}</h1>
          <div className="pdp-meta">
            {p.reviewCount > 0 && <a href="#pdp-reviews" className="pdp-rating"><Stars value={p.rating} count={p.reviewCount} /></a>}
            <StockPill status={variant.stockStatus} label={`${t(`enum.StockStatus.${variant.stockStatus}`)} · ${qty(variant.available)}`} />
            <span className="pdp-sku">SKU {variant.sku}</span>
          </div>

          {p.variantAttributes.map((va: any) => (
            <div key={va.code} className="pdp-variant">
              <span className="pdp-label">{va.name}: <strong>{selected[va.code]}</strong></span>
              <div className="pdp-variant-options">
                {va.options.map((o: string) => {
                  const exists = p.variants.some((v: any) => v.attributes[va.code] === o);
                  return <button key={o} type="button" className={cn("pdp-option", selected[va.code] === o && "active")} disabled={!exists} aria-pressed={selected[va.code] === o} onClick={() => pick(va.code, o)}>{o}</button>;
                })}
              </div>
            </div>
          ))}

          <div className="pdp-price-box">
            <div className="pdp-price-row">
              <strong className={cn("pdp-price", discounted && "is-sale")}>{money(price.effectivePrice)}</strong>
              {discounted && <s className="pdp-price-old">{money(price.basePrice)}</s>}
              {saving && <span className="pdp-saving">{t("shop.youSave", { amount: money(saving) })}</span>}
              {price.priceType !== "RETAIL" && <span className="badge badge-info">{t(`enum.PriceType.${price.priceType}`)}</span>}
            </div>
            <small className="text-muted">{price.vat.included ? t("price.vatIncluded", { rate: Number(price.vat.rate) }) : t("price.vatExcluded", { rate: Number(price.vat.rate) })}</small>
            {price.appliedDiscounts?.some((d: any) => d.applied) && (
              <ul className="pdp-discounts">
                {price.appliedDiscounts.filter((d: any) => d.applied).map((d: any) => <li key={d.code}><BadgeCheck size={14} aria-hidden /> {d.label} <strong>−{money(d.amount)}</strong></li>)}
              </ul>
            )}
            {price.unitPrices?.length > 1 && (
              <div className="pdp-units">
                {price.unitPrices.map((u: any) => <span key={u.unit} className={cn("chip", currentUnit === u.unit && "active")}>{u.factor === "1" ? `1 ${unitName(u.unit)}` : `1 ${unitName(u.unit)} = ${u.factor} ${unitName(p.baseUnit)}`}: <strong>{money(u.price)}</strong></span>)}
              </div>
            )}
            {price.tiers?.length > 0 && <p className="text-sm m-0">{t("shop.tiers")}: {price.tiers.map((tr: any) => `≥${tr.minQuantity}: ${money(tr.price)}`).join(" · ")}</p>}
          </div>

          {price.priceType === "RETAIL" && <PaymentChooser price={price} quantity={qtyFactor} mode={payMode} months={credit?.months ?? months} onMode={setPayMode} onMonths={setMonths} />}

          {p.installationService && (
            <label className={cn("pdp-install", install && "active")}>
              <input type="checkbox" checked={install} onChange={(e) => setInstall(e.target.checked)} />
              <Wrench size={18} aria-hidden />
              <span className="grow">{t("shop.addInstallation", { name: p.installationService.name, price: money(p.installationService.price) })}</span>
            </label>
          )}

          <div className="pdp-actions">
            <div className="pdp-qty">
              <span className="pdp-label">{t("shop.quantity")}</span>
              <QuantityInput value={amount} onValue={setAmount} unit={currentUnit} units={p.unitConversions.length ? [p.baseUnit, ...p.unitConversions.map((c: any) => c.unit)] : undefined} onUnit={setUnit} step={p.baseUnit === "pcs" || currentUnit !== p.baseUnit ? 1 : 0.5} />
              {unitPrice && Number(amount) > 1 && <small className="text-muted">{t("shop.lineTotal")}: {money({ amount: (Number(unitPrice.price.amount) * Number(amount || 0)).toFixed(2), currency: "AZN" })}</small>}
            </div>
            <div className="pdp-cta">
              <button type="button" className="btn primary btn-lg pdp-add" disabled={!canAdd} onClick={addToCart}><ShoppingCart size={19} /> {t("add")}</button>
              <button type="button" className={cn("pdp-icon-btn", p.isFavorite && "is-fav")} aria-pressed={!!p.isFavorite} aria-label={t("shop.addFavorite")} title={t("shop.addFavorite")} onClick={() => toggleFavorite(p)}><Heart size={19} fill={p.isFavorite ? "currentColor" : "none"} /></button>
              <button type="button" className={cn("pdp-icon-btn", p.inCompare && "is-compare")} aria-pressed={!!p.inCompare} aria-label={p.inCompare ? t("shop.inCompare") : t("shop.addCompare")} title={p.inCompare ? t("shop.inCompare") : t("shop.addCompare")} onClick={() => toggleCompare(p)}><Scale size={19} /></button>
            </div>
            {p.inCompare && <Link to="/compare" className="pdp-compare-link">{t("shop.viewCompare")} →</Link>}
          </div>
          {p.returnRestriction && <p className="kit-note text-sm m-0">{p.returnRestriction}</p>}

          <div className="pdp-delivery">
            <strong className="pdp-label">{t("shop.deliveryTitle")}</strong>
            <ul>
              {p.deliveryOptions.map((d: any) => (
                <li key={d.method}>
                  <span className="pdp-delivery-icon">{d.method === "WITH_INSTALLATION" ? <Wrench size={16} /> : <Truck size={16} />}</span>
                  <span className="grow">{d.label}<small>{d.eta}</small></span>
                  <strong>{d.price ? (Number(d.price.amount) ? money(d.price) : t("shop.free")) : "—"}</strong>
                </li>
              ))}
            </ul>
          </div>
          <ul className="pdp-trust">
            <li><BadgeCheck size={16} aria-hidden /> {p.warranty.months ? t("shop.warrantyMonths", { months: p.warranty.months }) : t("shop.noWarranty")}</li>
            {branchesWithStock > 0 && <li><Truck size={16} aria-hidden /> {t("shop.availableAt", { count: branchesWithStock })}</li>}
            {p.installable && <li><Wrench size={16} aria-hidden /> {t("shop.trustInstall")}</li>}
          </ul>
        </section>
      </div>

      <nav className="pdp-tabs" aria-label={t("shop.sections")}>
        {sections.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}
      </nav>

      <div className="pdp-body">
        <div className="pdp-main">
          <PdpSection id="pdp-overview" title={t("shop.overview")} defaultOpen>
            {p.highlights?.length > 0 && <ul className="pdp-highlights">{p.highlights.map((h: string) => <li key={h}><BadgeCheck size={16} aria-hidden /> {h}</li>)}</ul>}
            <p className="pdp-description">{p.description}</p>
          </PdpSection>

          <PdpSection id="pdp-specs" title={t("shop.specs")}>
            <div className="pdp-specs">
              {Object.entries(groups).map(([g, attrs]) => (
                <div key={g} className="pdp-spec-group">
                  <h3>{g}</h3>
                  <dl>
                    {(attrs as any[]).map((a) => <div key={a.code}><dt>{a.name}</dt><dd>{a.displayValue}</dd></div>)}
                  </dl>
                </div>
              ))}
            </div>
          </PdpSection>

          {(p.compatibleModels.length > 0 || p.type === "SPARE_PART") && (
            <PdpSection id="pdp-compat" title={t("shop.compatibleDevices")} badge={p.compatibleModels.length ? <span className="pdp-count">{p.compatibleModels.length}</span> : undefined}>
              {p.compatibleModels.length ? <ul className="kit-chip-grid mb-3">{p.compatibleModels.map((m: any) => <li key={m.id} className="chip">{m.fullName}</li>)}</ul> : <p className="text-muted">{t("shop.noCompatibility")}</p>}
              {devices.data?.items?.length > 0 && (
                <div className="kit-note">
                  <SelectField label={t("shop.fitsMyDeviceQ")} value={checkDevice} onValue={setCheckDevice} placeholder={t("common.choose")} options={devices.data.items.map((d: any) => ({ value: d.id, label: d.nickname ?? d.modelName }))} />
                  {compat.data && <p className={compat.data.compatible ? "text-success" : "text-danger"}>{compat.data.compatible ? t("shop.fitsYes", { model: compat.data.modelName }) : t("shop.fitsNo", { model: compat.data.modelName ?? "—" })}</p>}
                </div>
              )}
              {p.analogs.length > 0 && <><h3 className="text-sm mt-3">{t("shop.analogs")}</h3><ul>{p.analogs.map((a: any) => <li key={a.id}><Link to={`/product/${a.slug}`} className="text-brand">{a.name}</Link>{a.oemCode ? ` · OEM ${a.oemCode}` : ""}</li>)}</ul></>}
            </PdpSection>
          )}

          <PdpSection id="pdp-reviews" title={t("shop.reviews", { count: p.reviews.length })}>
            <div className="pdp-reviews-head">
              <div className="pdp-score">
                <strong>{p.reviewCount ? num(p.rating, 1) : "—"}</strong>
                <span className="pdp-stars" role="img" aria-label={t("common.ratingOf", { value: p.rating })}>{[1, 2, 3, 4, 5].map((n) => <span key={n} className={cn(n > Math.round(p.rating) && "off")}>★</span>)}</span>
                <small className="text-muted">{t("shop.reviewsBased", { count: p.reviewCount })}</small>
              </div>
              {p.canReview && <button type="button" className="btn outline" onClick={() => setReviewOpen(true)}><Star size={15} /> {t("reviews.write")}</button>}
            </div>
            {!p.reviews.length ? <EmptyState title={t("shop.noReviews")} /> : (
              <ul className="pdp-reviews">
                {p.reviews.map((r: any) => (
                  <li key={r.id}>
                    <div className="pdp-review-top">
                      <span className="pdp-avatar" aria-hidden>{r.authorName?.[0]}</span>
                      <div className="grow">
                        <strong>{r.authorName}</strong>
                        <div className="flex items-center gap-2 flex-wrap"><Stars value={r.rating} /><small className="text-muted">{date(r.createdAt)}</small>{r.verifiedPurchase && <small className="text-success">✓ {t("shop.verifiedPurchase")}</small>}</div>
                      </div>
                    </div>
                    <p>{r.comment}</p>
                    {(r.pros || r.cons) && (
                      <div className="pdp-proscons">
                        {r.pros && <span className="is-pro">+ {r.pros}</span>}
                        {r.cons && <span className="is-con">− {r.cons}</span>}
                      </div>
                    )}
                    {r.reply && <p className="kit-note text-sm">{r.reply}</p>}
                    <div className="flex justify-end"><ReportReviewButton reviewId={r.id} reported={r.reported} /></div>
                  </li>
                ))}
              </ul>
            )}
          </PdpSection>
        </div>

        <aside className="pdp-aside">
          <PdpSection id="pdp-stock" title={t("shop.stockByBranch")}>
            <ul className="pdp-stock">
              {p.branchStock.map((b: any) => <li key={b.branchId}><span className="grow">{b.branchName}</span><StockPill status={b.status} label={qty(b.available)} /></li>)}
            </ul>
          </PdpSection>
        </aside>
      </div>

      {p.related.length > 0 && (
        <section className="pdp-related">
          <h2>{t("shop.related")}</h2>
          <div className="shop-grid">{p.related.slice(0, 5).map((r: any) => <ProductTile key={r.id} p={r} />)}</div>
        </section>
      )}

      {/* Mobil alış paneli — ekranın altında sabit */}
      <div className="pdp-buybar">
        <div className="pdp-buybar-price">
          {credit ? (
            <>
              <small>{t("shop.payCredit")} · {t("shop.monthsShort", { months: credit.months })}</small>
              <strong>{t("shop.installment", { amount: money(scaleMoney(credit.monthly, qtyFactor)) })}</strong>
            </>
          ) : (
            <>
              {discounted && <s>{money(price.basePrice)}</s>}
              <strong className={cn(discounted && "is-sale")}>{money(price.effectivePrice)}</strong>
            </>
          )}
        </div>
        <button type="button" className={cn("pdp-icon-btn", p.isFavorite && "is-fav")} aria-label={t("shop.addFavorite")} onClick={() => toggleFavorite(p)}><Heart size={19} fill={p.isFavorite ? "currentColor" : "none"} /></button>
        <button type="button" className="btn primary pdp-buybar-add" disabled={!canAdd} onClick={addToCart}><ShoppingCart size={18} /> {t("add")}</button>
      </div>

      {reviewOpen && <ReviewDialog target="PRODUCT" targetId={p.id} onClose={() => setReviewOpen(false)} />}
    </div>
  );
}

/** Məhsul detalında seçilən kredit müddəti — checkout ödəniş üsulunu əvvəlcədən doldurur. */
const CREDIT_KEY = "sp.credit.months";

const scaleMoney = (m: { amount: string; currency: string }, factor: number) => ({ amount: (Number(m.amount) * factor).toFixed(2), currency: m.currency });

/** Nağd və ya kredit alış: kredit seçiləndə müddət, aylıq ödəniş, ümumi məbləğ və nağd qiymətdən fərq göstərilir. */
function PaymentChooser({ price, quantity, mode, months, onMode, onMonths }: { price: any; quantity: number; mode: "cash" | "credit"; months: number; onMode: (m: "cash" | "credit") => void; onMonths: (m: number) => void }) {
  const { t, money } = useI18n();
  const plans: any[] = price.installmentPlans ?? [];
  const plan = plans.find((x) => x.months === months) ?? plans[plans.length - 1];
  const lowest = plans.length ? plans.reduce((a, b) => (Number(a.monthly.amount) <= Number(b.monthly.amount) ? a : b)) : null;
  const k = (m: { amount: string; currency: string }) => money(scaleMoney(m, quantity));
  return (
    <div className="pdp-pay">
      <span className="pdp-label">{t("shop.paymentType")}</span>
      <div className="pdp-pay-modes" role="radiogroup" aria-label={t("shop.paymentType")}>
        <button type="button" role="radio" aria-checked={mode === "cash"} className={cn("pdp-pay-mode", mode === "cash" && "active")} onClick={() => onMode("cash")}>
          <span className="pdp-pay-icon"><Banknote size={20} aria-hidden /></span>
          <span className="pdp-pay-copy"><strong>{t("shop.payCash")}</strong><small>{k(price.effectivePrice)} · {t("shop.payCashHint")}</small></span>
        </button>
        <button type="button" role="radio" aria-checked={mode === "credit"} disabled={!plans.length} className={cn("pdp-pay-mode", mode === "credit" && "active")} onClick={() => onMode("credit")}>
          <span className="pdp-pay-icon"><CreditCard size={20} aria-hidden /></span>
          <span className="pdp-pay-copy"><strong>{t("shop.payCredit")}</strong><small>{lowest ? t("shop.payCreditHint", { amount: k(lowest.monthly) }) : t("shop.creditUnavailable", { amount: money({ amount: "300.00", currency: "AZN" }) })}</small></span>
        </button>
      </div>
      {mode === "credit" && plan && (
        <div className="pdp-credit">
          <span className="pdp-label">{t("shop.creditTerm")}</span>
          <div className="pdp-credit-terms" role="radiogroup" aria-label={t("shop.creditTerm")}>
            {plans.map((x) => (
              <button key={x.months} type="button" role="radio" aria-checked={plan.months === x.months} className={cn("pdp-credit-term", plan.months === x.months && "active")} onClick={() => onMonths(x.months)}>
                <strong>{t("shop.monthsShort", { months: x.months })}</strong>
                <small>+{x.markupPercent}%</small>
              </button>
            ))}
          </div>
          <dl className="pdp-credit-sum">
            <div className="is-main"><dt>{t("shop.creditMonthly")}</dt><dd>{k(plan.monthly)} <small>× {plan.months}</small></dd></div>
            <div><dt>{t("shop.creditTotal")}</dt><dd>{k(plan.total)}</dd></div>
            <div><dt>{t("shop.creditDiff")}</dt><dd className="is-diff">+{k(plan.difference)}</dd></div>
          </dl>
          <p className="pdp-credit-note">{t("shop.creditProvider", { provider: plan.provider, pct: plan.markupPercent })}. {t("shop.creditNote")}</p>
        </div>
      )}
    </div>
  );
}

/** Rəyə şikayət (§55): moderasiyaya göndərilir, rəy dərhal gizlədilmir. */
export function ReportReviewButton({ reviewId, reported }: { reviewId: string; reported?: boolean }) {
  const { t } = useI18n();
  const { user } = useSession();
  const { navigate, path, search } = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(!!reported);
  if (done) return <small className="text-muted review-report"><Flag size={12} aria-hidden /> {t("reviews.reported")}</small>;
  return (
    <>
      <button type="button" className="btn ghost btn-sm review-report" onClick={() => (user ? setOpen(true) : navigate(`/login?next=${encodeURIComponent(path + search)}`))}>
        <Flag size={13} aria-hidden /> {t("reviews.report")}
      </button>
      <ConfirmDialog
        open={open}
        busy={busy}
        danger
        title={t("reviews.report")}
        text={t("reviews.reportConfirm")}
        confirmLabel={t("reviews.report")}
        onClose={() => setOpen(false)}
        onConfirm={async () => {
          setBusy(true);
          try {
            await post(`/reviews/${reviewId}/report`);
            setDone(true);
            setOpen(false);
            toast.success(t("reviews.reported"));
          } catch (e) {
            toast.error(errorText(e, t("errors.generic")));
          } finally {
            setBusy(false);
          }
        }}
      />
    </>
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
/* Səbət (§31.1)                                                        */
/* ------------------------------------------------------------------ */

export function CartPage() {
  const { t, money, qty, unit } = useI18n();
  const { navigate } = useRouter();
  const { user } = useSession();
  const { refresh } = useCartActions();
  const cart = useApi<any>("/cart");
  const [promo, setPromo] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const update = async (id: string, body: Record<string, unknown>) => {
    setBusy(id);
    try { await patch(`/cart/items/${id}`, body); await refresh(); } catch (e) { toast.error(errorText(e, t("errors.generic"))); } finally { setBusy(null); }
  };
  const remove = async (id: string) => {
    setBusy(id);
    try { await del(`/cart/items/${id}`); await refresh(); } catch (e) { toast.error(errorText(e, t("errors.generic"))); } finally { setBusy(null); }
  };
  const applyPromo = async (code: string | null) => {
    try { await post("/cart/promo", { code }); await refresh(); } catch (e) { toast.error(errorText(e, t("errors.generic"))); }
  };
  if (cart.isLoading) return <div className="container py-8"><Loading rows={6} /></div>;
  if (cart.error) return <div className="container py-8"><ErrorState error={cart.error} onRetry={() => cart.refetch()} /></div>;
  const c = cart.data;
  if (!c?.items?.length) {
    return <div className="container py-10"><EmptyState icon={ShoppingCart} title={t("cart.empty")} action={<Link to="/shop" className="btn primary">{t("cart.goShopping")}</Link>} /></div>;
  }
  const count = c.items.length;
  const savings = c.totals.appliedDiscounts.filter((d: any) => d.applied).reduce((s: number, d: any) => s + Number(d.amount.amount), 0);
  const blocked = c.items.some((i: any) => i.stockStatus === "OUT_OF_STOCK");
  const goCheckout = () => navigate(user ? "/checkout" : "/login?next=/checkout");
  const checkoutLabel = user ? t("cart.checkout") : t("cart.loginToCheckout");

  return (
    <div className="container cartx">
      <header className="cartx-head">
        <div>
          <h1>{t("cart.title")}</h1>
          <p className="text-muted">{t("cart.itemCount", { count })}</p>
        </div>
        <Link to="/shop" className="btn ghost cartx-continue">← {t("cart.continueShopping")}</Link>
      </header>

      <div className="cartx-grid">
        <section className="cartx-lines" aria-label={t("cart.title")}>
          {c.merged && <div className="alert alert-success">{t("cart.merged")}</div>}
          {c.items.map((i: any) => (
            <article key={i.id} className={cn("cartx-line", busy === i.id && "is-busy")}>
              <Link to={`/product/${i.slug}`} className="cartx-media" tabIndex={-1} aria-hidden>
                <ProductVisual kind={i.imageUrl} tone={i.imageTone} size="sm" label={i.name} />
              </Link>
              <div className="cartx-info">
                <Link to={`/product/${i.slug}`} className="cartx-name">{i.name}</Link>
                <span className="cartx-variant">{[i.variantName, i.sku].filter(Boolean).join(" · ")}</span>
                <span className="cartx-unit">{t("cart.unitPrice", { price: money(i.unitPriceForUnit), unit: unit(i.quantity.unit) })}{i.quantity.unit !== i.baseQuantity.unit ? ` · ${t("cart.baseEquivalent", { qty: qty(i.baseQuantity) })}` : ""}</span>
                {i.warnings.length > 0 && (
                  <div className="cartx-warnings">
                    {i.warnings.map((w: any) => <span key={w.code} className={cn("cartx-warning", w.code === "OUT_OF_STOCK" && "is-danger")}>{w.message}</span>)}
                  </div>
                )}
                {i.installationAvailable && (
                  <label className={cn("cartx-install", i.installation && "active")}>
                    <input type="checkbox" checked={!!i.installation} disabled={busy === i.id} onChange={(e) => update(i.id, { withInstallation: e.target.checked })} />
                    <Wrench size={15} aria-hidden />
                    <span>{t("cart.withInstallation", { price: money(i.installationAvailable.price) })}</span>
                  </label>
                )}
                {i.returnRestriction && <small className="cartx-note">{i.returnRestriction}</small>}
              </div>
              <div className="cartx-qty">
                <QuantityInput value={i.quantity.value} onValue={(v) => Number(v) > 0 && update(i.id, { quantity: v })} unit={i.quantity.unit} units={i.availableUnits.length > 1 ? i.availableUnits.map((u: any) => u.unit) : undefined} onUnit={(u) => update(i.id, { unit: u })} />
              </div>
              <div className="cartx-total">
                <strong>{money(i.lineTotal)}</strong>
              </div>
              <button type="button" className="cartx-remove" aria-label={`${t("cart.removeItem")}: ${i.name}`} title={t("cart.removeItem")} disabled={busy === i.id} onClick={() => remove(i.id)}>
                <Trash2 size={17} />
              </button>
            </article>
          ))}
        </section>

        <aside className="cartx-summary" aria-label={t("cart.summary")}>
          <div className="cartx-summary-card">
            <h2>{t("cart.summary")}</h2>
            <details className="cartx-promo" open={!!c.promoCode || !!c.promoError}>
              <summary><Tag size={15} aria-hidden /> {t("cart.havePromo")}</summary>
              <form className="cartx-promo-form" onSubmit={(e) => { e.preventDefault(); void applyPromo(promo || c.promoCode || ""); }}>
                <input className="form-input" placeholder={t("cart.promoPlaceholder")} aria-label={t("cart.promo")} value={promo || c.promoCode || ""} onChange={(e) => setPromo(e.target.value.toUpperCase())} />
                <button className="btn outline">{t("shop.apply")}</button>
              </form>
              {c.promoError && <p className="kit-field-error">{c.promoError}</p>}
              {c.promoCode && !c.promoError && <button type="button" className="btn ghost btn-sm" onClick={() => { setPromo(""); void applyPromo(null); }}>{t("cart.removePromo", { code: c.promoCode })}</button>}
            </details>
            <dl className="cartx-totals">
              <div><dt>{t("cart.itemsTotal")} ({count})</dt><dd>{money(c.totals.subtotal)}</dd></div>
              {c.totals.appliedDiscounts.map((d: any) => <div key={d.code} className={d.applied ? "is-discount" : "is-muted"}><dt>{d.label}{!d.applied && d.skippedReason ? ` (${d.skippedReason})` : ""}</dt><dd>{d.applied ? `−${money(d.amount)}` : "—"}</dd></div>)}
              {Number(c.totals.installationTotal.amount) > 0 && <div><dt>{t("cart.installationShort")}</dt><dd>{money(c.totals.installationTotal)}</dd></div>}
              <div className="is-muted"><dt>{c.totals.vatIncluded ? t("estimate.vatIncluded") : t("cart.vatOnTop")}</dt><dd>{money(c.totals.vatTotal)}</dd></div>
            </dl>
            <div className="cartx-grand">
              <span>{t("cart.total")}</span>
              <strong>{money(c.totals.total)}</strong>
            </div>
            {savings > 0 && <div className="cartx-savings">{t("cart.savings")}: <strong>{money({ amount: savings.toFixed(2), currency: "AZN" })}</strong></div>}
            <button type="button" className="btn primary btn-lg w-full" disabled={blocked} onClick={goCheckout}>{checkoutLabel}</button>
            <p className="cartx-hint"><Truck size={14} aria-hidden /> {t("cart.deliveryAtCheckout")}</p>
            <p className="cartx-hint"><ShieldCheck size={14} aria-hidden /> {t("cart.securePayment")}</p>
            {!user && <p className="cartx-hint">{t("cart.guestNote")}</p>}
          </div>
        </aside>
      </div>

      {/* Mobil: ekranın altında sabit yekun və rəsmiləşdirmə düyməsi */}
      <div className="cartx-bar">
        <div>
          <small>{t("cart.total")}</small>
          <strong>{money(c.totals.total)}</strong>
        </div>
        <button type="button" className="btn primary" disabled={blocked} onClick={goCheckout}>{checkoutLabel}</button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Checkout (§31.2)                                                     */
/* ------------------------------------------------------------------ */

export function CheckoutPage() {
  const { t, money, time, date } = useI18n();
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
  // Məhsul səhifəsində kredit seçilibsə, taksit və müddət əvvəlcədən seçilir
  const optsReady = !!opts.data;
  useEffect(() => {
    if (!opts.data) return;
    let saved: string | null = null;
    try {
      saved = sessionStorage.getItem(CREDIT_KEY);
    } catch {
      /* yaddaş bağlıdır */
    }
    const months = Number(saved);
    if (months && opts.data.paymentMethods.some((m: any) => m.method === "INSTALLMENT" && m.available) && opts.data.installmentOffers.some((i: any) => i.months === months)) {
      form.set("paymentMethod", "INSTALLMENT");
      form.set("installmentMonths", months);
    }
  }, [optsReady]); // eslint-disable-line react-hooks/exhaustive-deps
  if (opts.isLoading) return <div className="container py-8"><Loading rows={8} /></div>;
  if (opts.error instanceof ApiError && opts.error.code === "CART_EMPTY") return <div className="container py-8"><EmptyState icon={ShoppingCart} title={t("cart.empty")} action={<Link to="/shop" className="btn primary">{t("cart.goShopping")}</Link>} /></div>;
  if (opts.error) return <div className="container py-8"><ErrorState error={opts.error} onRetry={() => opts.refetch()} /></div>;
  const o = opts.data;
  const s = o.summary;
  const creditOffer = v.paymentMethod === "INSTALLMENT" ? o.installmentOffers.find((i: any) => i.months === v.installmentMonths && i.total) : null;
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
              <div className="mt-3"><Radios name="months" value={String(v.installmentMonths)} onValue={(x) => form.set("installmentMonths", Number(x))} columns={3} options={o.installmentOffers.map((i: any) => ({ value: String(i.months), label: `${i.months} ${t("checkout.months")}`, hint: `${money(i.monthly)} / ${t("checkout.month")} · ${i.provider}${i.total ? ` · ${t("shop.creditTotal")}: ${money(i.total)} (+${i.markupPercent}%)` : ""}` }))} /></div>
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
          <Card title={t("common.note")}><TextArea aria-label={t("common.note")} value={v.note} onValue={(x) => form.set("note", x)} rows={2} /></Card>
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
              {creditOffer && <div><dt>{t("shop.creditDiff")} ({t("shop.monthsShort", { months: creditOffer.months })})</dt><dd>+{money(creditOffer.difference)}</dd></div>}
              <div className="grand"><dt>{t("common.total")}</dt><dd>{money(creditOffer ? creditOffer.total : s.totals.total)}</dd></div>
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
