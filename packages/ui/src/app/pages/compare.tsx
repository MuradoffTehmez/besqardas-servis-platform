"use client";
import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeftRight, Plus, Scale, ShoppingCart, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@sp/utils";
import { post, qs, useApi, useQueryClient } from "@sp/api-client";
import { useI18n } from "../core/i18n";
import { Link, useRouter } from "../core/router";
import { useSession } from "../core/session";
import { useMedia } from "../core/nav";
import { EmptyState, ErrorState, Loading, Stars, errorText } from "../kit/base";
import { StockPill } from "../kit/domain";
import { ProductVisual } from "../kit/media";
import { useCartActions } from "./shop";

/**
 * Məhsulların müqayisəsi (§30). Müqayisə yalnız eyni əsas kateqoriya daxilində aparılır — fərqli kateqoriyalar
 * ayrıca tablarda göstərilir. Desktop cədvəl, mobil isə ayrıca qurulmuş iki-sütunlu interfeysdir.
 */

interface CompareRow { code: string; name: string; group: string; values: (string[] | null)[]; different: boolean }
interface CompareData {
  maxPerGroup: number;
  groups: { id: string; name: string; path: string[]; count: number }[];
  activeGroup: { id: string; name: string; path: string[] } | null;
  products: any[];
  rows: CompareRow[];
}

function useCompare() {
  const { query, setQuery } = useRouter();
  const qc = useQueryClient();
  const { t } = useI18n();
  const group = query.get("group");
  const q = useApi<CompareData>(`/compare${qs({ group })}`, { placeholderData: (p: any) => p });
  const mutate = async (body: Record<string, unknown>) => {
    try {
      await post("/compare", body);
      await qc.invalidateQueries({ queryKey: ["api"] });
    } catch (e) {
      toast.error(errorText(e, t("errors.generic")));
    }
  };
  return {
    q,
    setGroup: (id: string) => setQuery({ group: id }),
    remove: (productId: string) => mutate({ productId, action: "remove" }),
    clearGroup: (groupId: string) => mutate({ action: "clearGroup", group: groupId, productId: "" }),
  };
}

const valueText = (v: string[] | null) => (v?.length ? v.join(", ") : "—");

export function ComparePage() {
  const { t, text } = useI18n();
  const { user } = useSession();
  const mobile = useMedia("(max-width: 767px)");
  const { q, setGroup, remove, clearGroup } = useCompare();
  const [onlyDiff, setOnlyDiff] = useState(false);

  if (!user) {
    return (
      <div className="container py-8">
        <EmptyState icon={Scale} title={t("compare.loginTitle")} text={t("compare.emptyText")} action={<Link to="/login?next=/compare" className="btn primary">{t("login")}</Link>} />
      </div>
    );
  }
  if (q.isLoading) return <div className="container py-8"><Loading rows={8} /></div>;
  if (q.error) return <div className="container py-8"><ErrorState error={q.error} onRetry={() => q.refetch()} /></div>;
  const d = q.data!;
  if (!d.products.length) {
    return (
      <div className="container py-8">
        <EmptyState icon={Scale} title={t("compare.empty")} text={t("compare.emptyText")} action={<Link to="/shop" className="btn primary">{t("nav.shop")}</Link>} />
      </div>
    );
  }
  const group = d.activeGroup!;
  const shopHref = `/shop/${group.path.join("/")}`;
  const rows = onlyDiff ? d.rows.filter((r) => r.different) : d.rows;
  const diffCount = d.rows.filter((r) => r.different).length;
  const free = d.maxPerGroup - d.products.length;

  return (
    <div className={cn("container compare-page", mobile ? "py-4" : "py-6")}>
      <header className="compare-head">
        <div>
          <h1>{t("compare.title")}</h1>
          <p className="text-muted">{t("compare.subtitle", { category: text(group.name), count: d.products.length })}{d.products.length > 1 ? ` · ${t("compare.diffCount", { count: diffCount })}` : ""}</p>
        </div>
        {!mobile && (
          <div className="compare-head-actions">
            <label className="kit-toggle">
              <input type="checkbox" checked={onlyDiff} onChange={(e) => setOnlyDiff(e.target.checked)} />
              <span className="kit-toggle-track" aria-hidden />
              <span>{t("compare.onlyDiffLong")}</span>
            </label>
            <button type="button" className="btn ghost btn-sm" onClick={() => clearGroup(group.id)}><Trash2 size={15} /> {t("compare.clearGroup")}</button>
          </div>
        )}
      </header>

      {d.groups.length > 1 && (
        <nav className="compare-groups" aria-label={t("compare.groupsLabel")}>
          {d.groups.map((g) => (
            <button key={g.id} type="button" className={cn("chip", g.id === group.id && "active")} aria-pressed={g.id === group.id} onClick={() => setGroup(g.id)}>
              {text(g.name)} <small>{g.count}</small>
            </button>
          ))}
          <span className="compare-groups-hint">{t("compare.groupsHint")}</span>
        </nav>
      )}

      {mobile ? (
        <MobileCompare data={d} rows={rows} onlyDiff={onlyDiff} setOnlyDiff={setOnlyDiff} onRemove={remove} onClear={() => clearGroup(group.id)} shopHref={shopHref} />
      ) : (
        <DesktopCompare data={d} rows={rows} onRemove={remove} shopHref={shopHref} free={free} onlyDiff={onlyDiff} />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Desktop: sabit başlıqlı müqayisə cədvəli                             */
/* ------------------------------------------------------------------ */

function ProductHeadCard({ p, onRemove, compact }: { p: any; onRemove: () => void; compact?: boolean }) {
  const { t, money } = useI18n();
  const { add } = useCartActions();
  const discounted = p.price && p.price.basePrice.amount !== p.price.effectivePrice.amount;
  return (
    <div className={cn("compare-card", compact && "compact")}>
      <button type="button" className="compare-remove" aria-label={`${t("compare.remove")}: ${p.name}`} title={t("compare.remove")} onClick={onRemove}><X size={15} /></button>
      <Link to={`/product/${p.slug}`} className="compare-card-media" tabIndex={-1} aria-hidden>
        <ProductVisual kind={p.imageUrl} tone={p.imageTone} label={p.name} size="sm" />
      </Link>
      <span className="compare-card-brand">{p.brandName}</span>
      <Link to={`/product/${p.slug}`} className="compare-card-name">{p.name}</Link>
      <div className="compare-card-price">
        <strong className={cn(discounted && "is-sale")}>{money(p.price?.effectivePrice)}</strong>
        {discounted && <s>{money(p.price.basePrice)}</s>}
      </div>
      <button type="button" className="btn primary btn-sm compare-card-add" disabled={p.stockStatus === "OUT_OF_STOCK"} onClick={() => add(p.defaultVariantId, "1", p.baseUnit)}>
        <ShoppingCart size={15} aria-hidden /> {compact ? null : t("add")}
        {compact && <span className="sr-only">{t("add")}</span>}
      </button>
    </div>
  );
}

function groupRows(rows: CompareRow[], text: (v: unknown) => string) {
  const map = new Map<string, CompareRow[]>();
  for (const r of rows) {
    const key = text(r.group) || "";
    map.set(key, [...(map.get(key) ?? []), r]);
  }
  return [...map.entries()];
}

function DesktopCompare({ data, rows, onRemove, shopHref, free, onlyDiff }: { data: CompareData; rows: CompareRow[]; onRemove: (id: string) => void; shopHref: string; free: number; onlyDiff: boolean }) {
  const { t, text } = useI18n();
  const products = data.products;
  const cols = products.length + (free > 0 ? 1 : 0);
  const style = { "--compare-cols": cols } as React.CSSProperties;
  const grouped = groupRows(rows, text);
  return (
    <div className="compare-table-wrap">
      <div className="compare-grid" style={style} role="table" aria-label={t("compare.title")}>
        <div className="compare-row compare-row-head" role="row">
          <div className="compare-label" role="columnheader">
            <span className="compare-label-title">{t("compare.specs")}</span>
            {products.length < 2 && <small className="text-muted">{t("compare.needTwo")}</small>}
          </div>
          {products.map((p) => (
            <div key={p.id} className="compare-cell" role="columnheader"><ProductHeadCard p={p} onRemove={() => onRemove(p.id)} /></div>
          ))}
          {free > 0 && (
            <div className="compare-cell" role="columnheader">
              <Link to={shopHref} className="compare-add-slot">
                <span className="compare-add-icon"><Plus size={22} /></span>
                <strong>{t("compare.addProduct")}</strong>
                <small>{t("compare.addHint", { count: free })}</small>
              </Link>
            </div>
          )}
        </div>

        <div className="compare-section" role="row"><div role="cell">{t("compare.summary")}</div></div>
        <SummaryRow label={t("compare.brand")} products={products} free={free} render={(p) => p.brandName} />
        <SummaryRow label={t("compare.rating")} products={products} free={free} render={(p) => (p.reviewCount ? <Stars value={p.rating} count={p.reviewCount} /> : "—")} />
        <SummaryRow label={t("compare.availability")} products={products} free={free} render={(p) => <StockPill status={p.stockStatus} />} />

        {grouped.map(([name, list]) => (
          <React.Fragment key={name}>
            <div className="compare-section" role="row"><div role="cell">{name || t("compare.specs")}</div></div>
            {list.map((r) => (
              <div key={r.code} className={cn("compare-row", r.different && "is-diff")} role="row">
                <div className="compare-label" role="rowheader">
                  {r.name}
                  {r.different && <span className="compare-diff-dot" title={t("compare.differs")} aria-label={t("compare.differs")} />}
                </div>
                {r.values.map((v, i) => <div key={i} className={cn("compare-cell", !v && "is-empty")} role="cell">{valueText(v)}</div>)}
                {free > 0 && <div className="compare-cell is-slot" role="cell" />}
              </div>
            ))}
          </React.Fragment>
        ))}
        {onlyDiff && !rows.length && <p className="compare-nodiff">{t("compare.noDiff")}</p>}
      </div>
    </div>
  );
}

function SummaryRow({ label, products, free, render }: { label: string; products: any[]; free: number; render: (p: any) => React.ReactNode }) {
  return (
    <div className="compare-row" role="row">
      <div className="compare-label" role="rowheader">{label}</div>
      {products.map((p) => <div key={p.id} className="compare-cell" role="cell">{render(p)}</div>)}
      {free > 0 && <div className="compare-cell is-slot" role="cell" />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Mobil: iki məhsul yan-yana, seçilə bilən; xüsusiyyətlər kart şəklində */
/* ------------------------------------------------------------------ */

function MobileCompare({ data, rows, onlyDiff, setOnlyDiff, onRemove, onClear, shopHref }: { data: CompareData; rows: CompareRow[]; onlyDiff: boolean; setOnlyDiff: (v: boolean) => void; onRemove: (id: string) => void; onClear: () => void; shopHref: string }) {
  const { t, text } = useI18n();
  const products = data.products;
  const [pair, setPair] = useState<[number, number]>([0, 1]);
  // Siyahı dəyişəndə seçim mövcud məhsullar daxilində qalır
  useEffect(() => {
    setPair(([a, b]) => {
      const n = products.length;
      const na = Math.min(a, Math.max(n - 1, 0));
      let nb = Math.min(b, Math.max(n - 1, 0));
      if (nb === na && n > 1) nb = na === 0 ? 1 : 0;
      return [na, nb];
    });
  }, [products.length]);
  const left = products[pair[0]];
  const right = products.length > 1 ? products[pair[1]] : null;
  const visibleRows = useMemo(() => {
    const idx = [pair[0], pair[1]];
    return rows.filter((r) => !onlyDiff || (right && JSON.stringify(r.values[idx[0]!]) !== JSON.stringify(r.values[idx[1]!])));
  }, [rows, onlyDiff, pair, right]);
  const grouped = groupRows(visibleRows, text);
  const swap = () => setPair(([a, b]) => [b, a]);
  const picker = (slot: 0 | 1) => (
    <select
      className="form-input compare-m-select"
      aria-label={t("compare.slot", { n: slot + 1 })}
      value={pair[slot]}
      onChange={(e) => {
        const v = Number(e.target.value);
        setPair(([a, b]) => (slot === 0 ? [v, v === b ? a : b] : [v === a ? b : a, v]));
      }}
    >
      {products.map((p, i) => <option key={p.id} value={i}>{p.name}</option>)}
    </select>
  );
  return (
    <div className="compare-m">
      <div className="compare-m-sticky">
        <div className="compare-m-pickers">
          {picker(0)}
          {right && <button type="button" className="icon-button compare-m-swap" aria-label={t("compare.swap")} onClick={swap}><ArrowLeftRight size={16} /></button>}
          {right ? picker(1) : <Link to={shopHref} className="btn outline btn-sm compare-m-addbtn"><Plus size={15} /> {t("compare.addProduct")}</Link>}
        </div>
        <div className={cn("compare-m-cards", !right && "single")}>
          <ProductHeadCard p={left} compact onRemove={() => onRemove(left.id)} />
          {right && <ProductHeadCard p={right} compact onRemove={() => onRemove(right.id)} />}
        </div>
      </div>

      {!right && <p className="kit-note text-sm mt-3">{t("compare.needTwo")}</p>}

      <div className="compare-m-toolbar">
        <label className="kit-toggle">
          <input type="checkbox" checked={onlyDiff} onChange={(e) => setOnlyDiff(e.target.checked)} disabled={!right} />
          <span className="kit-toggle-track" aria-hidden />
          <span>{t("compare.onlyDiffLong")}</span>
        </label>
        {products.length > 2 && <small className="text-muted">{products.length} / {data.maxPerGroup}</small>}
      </div>

      <section className="compare-m-section">
        <h2>{t("compare.summary")}</h2>
        <MobileRow label={t("compare.rating")} a={left.reviewCount ? <Stars value={left.rating} count={left.reviewCount} /> : "—"} b={right ? (right.reviewCount ? <Stars value={right.rating} count={right.reviewCount} /> : "—") : undefined} />
        <MobileRow label={t("compare.availability")} a={<StockPill status={left.stockStatus} />} b={right ? <StockPill status={right.stockStatus} /> : undefined} />
      </section>

      {grouped.map(([name, list]) => (
        <section key={name} className="compare-m-section">
          <h2>{name || t("compare.specs")}</h2>
          {list.map((r) => {
            const a = r.values[pair[0]] ?? null;
            const b = right ? r.values[pair[1]] ?? null : null;
            const differs = !!right && JSON.stringify(a) !== JSON.stringify(b);
            return <MobileRow key={r.code} label={r.name} a={valueText(a)} b={right ? valueText(b) : undefined} differs={differs} />;
          })}
        </section>
      ))}
      {onlyDiff && !visibleRows.length && <p className="compare-nodiff">{t("compare.noDiff")}</p>}

      <button type="button" className="btn ghost w-full mt-4" onClick={onClear}><Trash2 size={15} /> {t("compare.clearGroup")}</button>
    </div>
  );
}

function MobileRow({ label, a, b, differs }: { label: string; a: React.ReactNode; b?: React.ReactNode; differs?: boolean }) {
  return (
    <div className={cn("compare-m-row", differs && "is-diff", b === undefined && "single")}>
      <div className="compare-m-label">{label}</div>
      <div className="compare-m-values">
        <div>{a}</div>
        {b !== undefined && <div>{b}</div>}
      </div>
    </div>
  );
}
