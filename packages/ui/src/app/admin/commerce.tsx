"use client";
import React, { useEffect, useState } from "react";
import { AlertTriangle, ArrowRightLeft, ClipboardCheck, PackagePlus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@sp/utils";
import { del, patch, post, useApi } from "@sp/api-client";
import { useI18n } from "../core/i18n";
import { Link, useRouter } from "../core/router";
import { useSession } from "../core/session";
import { Card, Check, EmptyState, EnumBadge, FormError, Grid, KeyValue, Loading, PageHeader, QueryView, SelectField, Stat, Tabs, TextArea, TextField, Toggle, errorText } from "../kit/base";
import { ActionBar, Dialog, ReasonDialog, ResourceTable, type ApiAction } from "../kit/actions";
import { PriceTag } from "../kit/domain";
import { ProductVisual } from "../kit/media";
import { HistoryList, DocumentsList, useRefresh } from "../pages/common";
import { I18nInput, enumKeys, useLookups } from "./crud";

/** Kataloq/PIM, satış sifarişləri, kommersiya təklifləri və anbar əməliyyatları (PRD §24–40, §61). */

/* ------------------------------------------------------------------ */
/* Məhsullar                                                            */
/* ------------------------------------------------------------------ */

export function ProductsAdminPage() {
  const { t, text, money, enumLabel } = useI18n();
  const { can } = useSession();
  const lookups = useLookups();
  const [creating, setCreating] = useState(false);
  return (
    <>
      <PageHeader title={t("adm.nav.products")} actions={can("catalog:create") || can("catalog:edit") ? <button type="button" className="btn primary" onClick={() => setCreating(true)}><Plus size={16} /> {t("common.create")}</button> : null} />
      <ResourceTable
        path="/admin/products"
        rowTo={(p: any) => `/products/${p.id}`}
        filters={[
          { key: "status", label: t("common.status"), options: enumKeys("ProductStatus").map((s) => ({ value: s, label: enumLabel("ProductStatus", s) })) },
          { key: "type", label: t("adm.f.type"), options: enumKeys("ProductType").map((s) => ({ value: s, label: enumLabel("ProductType", s) })) },
          { key: "brandId", label: t("adm.f.brand"), options: (lookups.data?.brands ?? []).map((b: any) => ({ value: b.id, label: b.name })) },
          { key: "stockStatus", label: t("adm.f.stock"), options: enumKeys("StockStatus").map((s) => ({ value: s, label: enumLabel("StockStatus", s) })) },
        ]}
        columns={[
          { key: "name", header: t("adm.f.name"), render: (p: any) => <span className="entity-row"><ProductVisual kind={p.imageUrl} tone={p.imageTone} size="sm" /><span><strong>{text(p.name)}</strong><small>{p.sku} · {p.skuCount} SKU</small></span></span> },
          { key: "brandName", header: t("adm.f.brand"), render: (p: any) => <span>{p.brandName}<small className="block">{p.categoryName}</small></span> },
          { key: "type", header: t("adm.f.type"), hideOnMobile: true, render: (p: any) => enumLabel("ProductType", p.type) },
          { key: "retailPrice", header: t("adm.f.retailPrice"), className: "num", render: (p: any) => <span>{money(p.retailPrice)}{p.hasPromotion && <small className="block text-success">{money(p.price.effectivePrice)}</small>}</span> },
          { key: "stockTotal", header: t("adm.f.stock"), className: "num", sortKey: "stockTotal", render: (p: any) => <span>{p.stockTotal}<small className="block"><EnumBadge group="StockStatus" code={p.stockStatus} /></small></span> },
          { key: "visibility", header: t("adm.f.visibility"), hideOnMobile: true, render: (p: any) => (p.visibility?.length ? p.visibility.map((v: string) => enumLabel("Segment", v)).join(", ") : t("adm.products.allSegments")) },
          { key: "status", header: t("common.status"), render: (p: any) => <EnumBadge group="ProductStatus" code={p.status} /> },
        ]}
      />
      {creating && <ProductCreateDialog onClose={() => setCreating(false)} />}
    </>
  );
}

function ProductCreateDialog({ onClose }: { onClose: () => void }) {
  const { t, text, enumLabel } = useI18n();
  const lookups = useLookups();
  const { navigate } = useRouter();
  const [v, setV] = useState<any>({ nameI18n: { az: "", ru: "", en: "" }, slug: "", brandId: "", categoryId: "", baseUnit: "pcs", type: "PHYSICAL", sku: "", retailPrice: "" });
  const [error, setError] = useState<any>(null);
  const fe = error?.fieldErrors ?? {};
  return (
    <Dialog open onClose={onClose} size="lg" title={t("adm.products.create")} footer={<><button type="button" className="btn outline" onClick={onClose}>{t("common.cancel")}</button><button type="button" className="btn primary" onClick={async () => { setError(null); try { const r = await post("/admin/products", v); toast.success(t("common.saved")); navigate(`/products/${r.id}`); } catch (e) { setError(e); } }}>{t("common.create")}</button></>}>
      <FormError error={error} />
      <I18nInput label={t("adm.f.name")} required value={v.nameI18n} onChange={(x) => setV({ ...v, nameI18n: x, slug: v.slug || x.az.toLowerCase().replace(/[^a-z0-9]+/g, "-") })} error={fe.nameI18n} />
      <div className="kit-form-grid">
        <TextField label={t("adm.f.slug")} required value={v.slug} onValue={(x) => setV({ ...v, slug: x })} error={fe.slug} />
        <TextField label="SKU" required value={v.sku} onValue={(x) => setV({ ...v, sku: x })} error={fe.sku} />
        <SelectField label={t("adm.f.brand")} required value={v.brandId} onValue={(x) => setV({ ...v, brandId: x })} placeholder={t("common.choose")} options={(lookups.data?.brands ?? []).map((b: any) => ({ value: b.id, label: b.name }))} error={fe.brandId} />
        <SelectField label={t("adm.f.category")} required value={v.categoryId} onValue={(x) => setV({ ...v, categoryId: x })} placeholder={t("common.choose")} options={(lookups.data?.categories ?? []).map((c: any) => ({ value: c.id, label: text(c.name) }))} error={fe.categoryId} />
        <SelectField label={t("adm.f.type")} value={v.type} onValue={(x) => setV({ ...v, type: x })} options={enumKeys("ProductType").map((x) => ({ value: x, label: enumLabel("ProductType", x) }))} />
        <SelectField label={t("adm.f.baseUnit")} value={v.baseUnit} onValue={(x) => setV({ ...v, baseUnit: x })} options={(lookups.data?.units ?? []).map((u: any) => ({ value: u.code, label: text(u.name) }))} />
        <TextField label={t("adm.f.retailPrice")} required inputMode="decimal" value={v.retailPrice} onValue={(x) => setV({ ...v, retailPrice: x.replace(",", ".") })} error={fe.retailPrice} hint="AZN, ƏDV daxil" />
      </div>
    </Dialog>
  );
}

export function ProductEditorPage({ id }: { id: string }) {
  const { t, text, enumLabel, money, qty } = useI18n();
  const q = useApi<any>(`/admin/products/${id}`);
  const lookups = useLookups();
  const refresh = useRefresh();
  const { query, setQuery } = useRouter();
  const tab = query.get("tab") ?? "main";
  const [draft, setDraft] = useState<any | null>(null);
  const [error, setError] = useState<any>(null);
  useEffect(() => {
    if (!q.data) return;
    const p = q.data;
    setDraft({ nameI18n: p.nameI18n, descriptionI18n: p.descriptionI18n, status: p.status ?? "ACTIVE", categoryId: p.categoryId, brandId: p.brandId, warrantyMonths: p.warrantyMonths, attributes: { ...p.rawAttributes }, variants: p.variantsAdmin.map((v: any) => ({ id: v.id, sku: v.sku, barcode: v.barcode ?? "", prices: Object.fromEntries(Object.entries(v.prices).map(([k, m]: any) => [k, m.amount])) })), conversions: p.conversions.map((c: any) => ({ unit: c.unit, factor: String(c.factor), packagePrice: c.packagePrice?.amount ?? "" })), compatibleModelIds: [...p.compatibleModelIds] });
  }, [q.data]);
  if (q.isLoading || !draft) return <Loading rows={10} />;
  const p = q.data;
  const fe = error?.fieldErrors ?? {};
  const save = async (part: string[]) => {
    setError(null);
    try { await patch(`/admin/products/${id}`, Object.fromEntries(part.map((k) => [k, draft[k]]))); await refresh(); toast.success(t("common.saved")); } catch (e) { setError(e); }
  };
  const priceTypes = Object.keys(draft.variants[0]?.prices ?? {});
  return (
    <>
      <PageHeader back="/products" title={text(p.name)} badge={<EnumBadge group="ProductStatus" code={draft.status} />} subtitle={`${p.brandName} · ${p.categoryName} · ${enumLabel("ProductType", p.type)}`} actions={<Link to={`/product/${p.slug}`} className="btn outline" target="_blank">{t("adm.products.onSite")}</Link>} />
      <FormError error={error} />
      <Tabs value={tab} onChange={(v) => setQuery({ tab: v })} tabs={[{ id: "main", label: t("adm.products.main") }, { id: "attributes", label: t("adm.nav.attributes"), badge: p.attributeSchema.length }, { id: "variants", label: t("adm.products.variants"), badge: p.variantsAdmin.length }, { id: "units", label: t("adm.nav.units") }, { id: "compatibility", label: t("adm.nav.compatibility"), badge: draft.compatibleModelIds.length }, { id: "stock", label: t("adm.f.stock") }, { id: "media", label: t("adm.products.media") }]} />
      {tab === "main" && (
        <div className="kit-split">
          <Card>
            <I18nInput label={t("adm.f.name")} value={draft.nameI18n} onChange={(x) => setDraft({ ...draft, nameI18n: x })} error={fe.nameI18n} />
            <I18nInput label={t("adm.f.description")} multiline value={draft.descriptionI18n} onChange={(x) => setDraft({ ...draft, descriptionI18n: x })} />
            <div className="kit-form-grid">
              <SelectField label={t("common.status")} value={draft.status} onValue={(x) => setDraft({ ...draft, status: x })} options={enumKeys("ProductStatus").map((s) => ({ value: s, label: enumLabel("ProductStatus", s) }))} />
              <SelectField label={t("adm.f.category")} value={draft.categoryId} onValue={(x) => setDraft({ ...draft, categoryId: x })} options={(lookups.data?.categories ?? []).map((c: any) => ({ value: c.id, label: text(c.name) }))} />
              <SelectField label={t("adm.f.brand")} value={draft.brandId} onValue={(x) => setDraft({ ...draft, brandId: x })} options={(lookups.data?.brands ?? []).map((b: any) => ({ value: b.id, label: b.name }))} />
              <TextField label={t("adm.f.warrantyMonths")} type="number" value={String(draft.warrantyMonths ?? "")} onValue={(x) => setDraft({ ...draft, warrantyMonths: Number(x) })} />
            </div>
            <button type="button" className="btn primary" onClick={() => save(["nameI18n", "descriptionI18n", "status", "categoryId", "brandId", "warrantyMonths"])}>{t("common.save")}</button>
          </Card>
          <Card title={t("adm.products.preview")}>
            <ProductVisual kind={p.imageUrl} tone={p.imageTone} label={text(p.name)} />
            <div className="mt-3"><PriceTag price={p.price} showVat showInstallment /></div>
            <p className="text-sm text-muted mt-2">{t("adm.products.previewHint")}</p>
          </Card>
        </div>
      )}
      {tab === "attributes" && (
        <Card>
          {!p.attributeSchema.length ? <EmptyState title={t("adm.products.noAttributes")} /> : (
            <div className="kit-form-grid">
              {p.attributeSchema.map((a: any) => {
                const val = draft.attributes[a.code] ?? "";
                const set = (x: string) => setDraft({ ...draft, attributes: { ...draft.attributes, [a.code]: x } });
                const err = fe[`attributes.${a.code}`];
                if (a.type === "SELECT" || a.type === "MULTISELECT") return <SelectField key={a.code} label={`${text(a.nameI18n)}${a.unit ? ` (${a.unit})` : ""}`} required={a.required} value={val} onValue={set} placeholder="—" options={(a.options ?? []).map((o: any) => ({ value: o.value, label: text(o.label) }))} error={err} />;
                if (a.type === "BOOLEAN") return <div key={a.code} className="kit-field"><Toggle label={text(a.nameI18n)} checked={val === "true"} onValue={(c) => set(String(c))} /></div>;
                return <TextField key={a.code} label={`${text(a.nameI18n)}${a.unit ? ` (${a.unit})` : ""}`} required={a.required} value={val} inputMode={a.type.startsWith("NUMBER") ? "decimal" : undefined} onValue={set} error={err} hint={a.filterable ? t("adm.products.filterable") : undefined} />;
              })}
            </div>
          )}
          <button type="button" className="btn primary" onClick={() => save(["attributes"])}>{t("common.save")}</button>
        </Card>
      )}
      {tab === "variants" && (
        <Card flush>
          <div className="table-wrap">
            <table>
              <thead><tr><th>SKU</th><th>{t("adm.products.barcode")}</th><th>{t("adm.products.variant")}</th>{priceTypes.map((pt) => <th key={pt} className="num">{enumLabel("PriceType", pt)}</th>)}</tr></thead>
              <tbody>
                {draft.variants.map((v: any, i: number) => {
                  const src = p.variantsAdmin[i];
                  return (
                    <tr key={v.id}>
                      <td><input className="form-input" value={v.sku} aria-label="SKU" onChange={(e) => setDraft({ ...draft, variants: draft.variants.map((x: any, j: number) => (j === i ? { ...x, sku: e.target.value } : x)) })} /></td>
                      <td><input className="form-input" value={v.barcode} aria-label={t("adm.products.barcode")} onChange={(e) => setDraft({ ...draft, variants: draft.variants.map((x: any, j: number) => (j === i ? { ...x, barcode: e.target.value } : x)) })} /></td>
                      <td>{text(src.name)}</td>
                      {priceTypes.map((pt) => <td key={pt} style={{ minWidth: 110 }}><input className={cn("form-input", fe[`variants.${v.id}.${pt}`] && "input-error")} inputMode="decimal" value={v.prices[pt]} aria-label={enumLabel("PriceType", pt)} onChange={(e) => setDraft({ ...draft, variants: draft.variants.map((x: any, j: number) => (j === i ? { ...x, prices: { ...x.prices, [pt]: e.target.value.replace(",", ".") } } : x)) })} /></td>)}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="kit-card-body flex justify-between items-center gap-2 flex-wrap"><small className="text-muted">{t("adm.products.pricesHint")}</small><button type="button" className="btn primary" onClick={() => save(["variants"])}>{t("common.save")}</button></div>
        </Card>
      )}
      {tab === "units" && (
        <Card title={t("adm.products.conversions", { base: p.baseUnit })}>
          {draft.conversions.map((c: any, i: number) => (
            <div key={i} className="flex gap-2 items-end flex-wrap">
              <SelectField label={t("adm.f.unit")} value={c.unit} onValue={(x) => setDraft({ ...draft, conversions: draft.conversions.map((y: any, j: number) => (j === i ? { ...y, unit: x } : y)) })} options={(lookups.data?.units ?? []).map((u: any) => ({ value: u.code, label: text(u.name) }))} />
              <TextField label={t("adm.f.factor")} inputMode="decimal" value={c.factor} onValue={(x) => setDraft({ ...draft, conversions: draft.conversions.map((y: any, j: number) => (j === i ? { ...y, factor: x } : y)) })} hint={`1 ${c.unit} = ${c.factor || "?"} ${p.baseUnit}`} />
              <TextField label={t("adm.f.packagePrice")} inputMode="decimal" value={c.packagePrice} onValue={(x) => setDraft({ ...draft, conversions: draft.conversions.map((y: any, j: number) => (j === i ? { ...y, packagePrice: x } : y)) })} />
              <button type="button" className="icon-button mb-4" aria-label={t("common.remove")} onClick={() => setDraft({ ...draft, conversions: draft.conversions.filter((_: any, j: number) => j !== i) })}><Trash2 size={14} /></button>
            </div>
          ))}
          <div className="flex gap-2 mt-2">
            <button type="button" className="btn outline btn-sm" onClick={() => setDraft({ ...draft, conversions: [...draft.conversions, { unit: "box", factor: "1", packagePrice: "" }] })}><Plus size={14} /> {t("common.add")}</button>
            <button type="button" className="btn primary btn-sm" onClick={() => save(["conversions"])}>{t("common.save")}</button>
          </div>
        </Card>
      )}
      {tab === "compatibility" && (
        <Card title={t("adm.nav.compatibility")} subtitle={t("adm.products.compatHint")}>
          <div className="kit-form-grid">
            {(lookups.data?.models ?? []).map((m: any) => <Check key={m.id} label={`${m.name} (${m.code})`} checked={draft.compatibleModelIds.includes(m.id)} onValue={(c) => setDraft({ ...draft, compatibleModelIds: c ? [...draft.compatibleModelIds, m.id] : draft.compatibleModelIds.filter((x: string) => x !== m.id) })} />)}
          </div>
          <button type="button" className="btn primary mt-3" onClick={() => save(["compatibleModelIds"])}>{t("common.save")}</button>
        </Card>
      )}
      {tab === "stock" && (
        <Card flush>
          <div className="table-wrap">
            <table>
              <thead><tr><th>SKU</th><th>{t("adm.f.warehouse")}</th><th>{t("adm.inv.purpose")}</th><th className="num">{t("tech.inv.physical")}</th><th className="num">{t("tech.inv.reserved")}</th><th className="num">{t("tech.inv.available")}</th><th className="num">{t("adm.inv.avgCost")}</th></tr></thead>
              <tbody>{p.variantsAdmin.flatMap((v: any) => v.stock.map((s: any) => <tr key={s.id}><td>{v.sku}</td><td>{text(s.warehouseName)}</td><td>{enumLabel("StockPurpose", s.purpose)}</td><td className="num">{qty(s.physical)}</td><td className="num">{qty(s.reserved)}</td><td className={cn("num", s.belowMin && "text-danger")}>{qty(s.available)}</td><td className="num">{money(s.avgCost)}</td></tr>))}</tbody>
            </table>
          </div>
        </Card>
      )}
      {tab === "media" && (
        <Card title={t("adm.products.media")} subtitle={t("adm.products.mediaHint")}>
          <div className="photo-grid">{p.gallery.map((g: any) => <div key={g.id} style={{ padding: 0 }}><ProductVisual kind={g.url} tone={p.imageTone} label={text(g.altI18n)} />{g.primary && <span className="badge badge-info">{t("media.primary")}</span>}</div>)}</div>
        </Card>
      )}
    </>
  );
}

export function CompatibilityPage() {
  const { t, dateTime, text } = useI18n();
  const lookups = useLookups();
  const refresh = useRefresh();
  const [adding, setAdding] = useState(false);
  return (
    <>
      <PageHeader title={t("adm.nav.compatibility")} subtitle={t("adm.products.compatHint")} actions={<button type="button" className="btn primary" onClick={() => setAdding(true)}><Plus size={16} /> {t("common.add")}</button>} />
      <ResourceTable
        path="/admin/compatibility"
        columns={[
          { key: "productName", header: t("adm.f.product"), render: (r: any) => <span><strong>{text(r.productName)}</strong><small className="block">{r.sku}</small></span> },
          { key: "modelFullName", header: t("adm.f.model") },
          { key: "source", header: t("adm.f.source") },
          { key: "createdAt", header: t("adm.f.createdAt"), render: (r: any) => dateTime(r.createdAt), hideOnMobile: true },
          { key: "_a", header: "", render: (r: any) => <button type="button" className="icon-button" aria-label={t("common.delete")} onClick={async () => { await del(`/admin/compatibility/${r.id}`); await refresh(); }}><Trash2 size={14} /></button> },
        ]}
      />
      {adding && <CompatDialog lookups={lookups.data} onClose={() => setAdding(false)} />}
    </>
  );
}

function CompatDialog({ lookups, onClose }: { lookups: any; onClose: () => void }) {
  const { t } = useI18n();
  const refresh = useRefresh();
  const [mode, setMode] = useState("manual");
  const [productId, setProductId] = useState("");
  const [modelIds, setModelIds] = useState<string[]>([]);
  const [seriesId, setSeriesId] = useState("");
  const [csv, setCsv] = useState("");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<unknown>(null);
  return (
    <Dialog open onClose={onClose} size="lg" title={t("adm.nav.compatibility")} footer={<><button type="button" className="btn outline" onClick={onClose}>{t("common.close")}</button><button type="button" className="btn primary" onClick={async () => { setError(null); try { const r = await post("/admin/compatibility", mode === "csv" ? { csv } : { productId, modelIds, seriesId: seriesId || undefined }); setResult(r); await refresh(); toast.success(t("adm.products.linked", { count: r.added })); } catch (e) { setError(e); } }}>{t("common.save")}</button></>}>
      <FormError error={error} />
      <Tabs value={mode} onChange={setMode} tabs={[{ id: "manual", label: t("adm.products.manual") }, { id: "csv", label: t("adm.products.csv") }]} />
      {mode === "manual" ? (
        <>
          <ProductPicker lookups={lookups} value={productId} onValue={setProductId} />
          <SelectField label={t("adm.nav.series")} value={seriesId} onValue={setSeriesId} placeholder={t("adm.products.orModels")} options={(lookups?.series ?? []).map((s: any) => ({ value: s.id, label: s.name }))} />
          {!seriesId && <div className="kit-form-grid">{(lookups?.models ?? []).map((m: any) => <Check key={m.id} label={m.name} checked={modelIds.includes(m.id)} onValue={(c) => setModelIds(c ? [...modelIds, m.id] : modelIds.filter((x) => x !== m.id))} />)}</div>}
        </>
      ) : (
        <TextArea label={t("adm.products.csvLabel")} rows={8} value={csv} onValue={setCsv} hint="LG-CMP-18R32;S12EQ" />
      )}
      {result?.errors?.length > 0 && <div className="kit-note danger mt-3"><strong>{t("adm.products.csvErrors")}</strong><ul>{result.errors.map((e: string) => <li key={e}>{e}</li>)}</ul></div>}
    </Dialog>
  );
}

/** Lookup-dakı variantlardan məhsul seçimi — məhsul id-si variantın məhsuluna görə API tərəfindən həll olunur. */
function ProductPicker({ lookups, value, onValue, label }: { lookups: any; value: string; onValue: (v: string) => void; label?: string }) {
  const { t, text } = useI18n();
  const products = useApi<any>("/admin/products?pageSize=200");
  return <SelectField label={label ?? t("adm.f.product")} value={value} onValue={onValue} placeholder={t("common.choose")} options={(products.data?.items ?? []).map((p: any) => ({ value: p.id, label: `${text(p.name)} · ${p.sku}` }))} disabled={!lookups && !products.data} />;
}

/* ------------------------------------------------------------------ */
/* Satış sifarişi (§37)                                                  */
/* ------------------------------------------------------------------ */

export function SalesOrderAdminDetailPage({ id }: { id: string }) {
  const { t, text, money, qty, enumLabel, dateTime } = useI18n();
  const q = useApi<any>(`/admin/sales-orders/${id}`);
  const refresh = useRefresh();
  const [cancel, setCancel] = useState(false);
  const run = async (a: ApiAction, extra: { note?: string; reasonCode?: string } = {}) => { await post(`/admin/sales-orders/${id}/actions`, { action: a.code, note: extra.note || extra.reasonCode }); await refresh(); };
  return (
    <QueryView query={q} rows={10}>
      {(o) => (
        <>
          <PageHeader back="/sales-orders" title={o.number} badge={<EnumBadge group="SalesOrderStatus" code={o.status} />} subtitle={`${dateTime(o.createdAt)} · ${o.channel} · ${o.branchName}`} actions={<ActionBar actions={o.availableActions} run={run} custom={{ cancel: () => setCancel(true) }} />} />
          <div className="kit-split">
            <div className="kit-stack">
              <Card title={t("acc.orders.items")} flush>
                <div className="table-wrap"><table><thead><tr><th>{t("docs.item")}</th><th className="num">{t("common.quantity")}</th><th className="num">{t("estimate.unitPrice")}</th><th className="num">{t("common.total")}</th></tr></thead><tbody>
                  {o.lines.map((l: any) => <tr key={l.id}><td><div className="entity-row"><ProductVisual kind={l.imageUrl} tone={l.imageTone} size="sm" /><span><strong>{text(l.name)}</strong><small>{l.sku}</small></span></div></td><td className="num">{qty(l.quantity)}</td><td className="num">{money(l.unitPrice)}</td><td className="num">{money(l.total)}</td></tr>)}
                </tbody></table></div>
                <div className="kit-card-body">
                  <dl className="kit-totals">
                    <div><dt>{t("estimate.subtotal")}</dt><dd>{money(o.subtotal)}</dd></div>
                    {o.appliedDiscounts.map((d: any) => <div key={d.code} className="text-success"><dt>{text(d.label)}</dt><dd>−{money(d.amount)}</dd></div>)}
                    <div><dt>{t("checkout.deliveryFee")}</dt><dd>{money(o.deliveryTotal)}</dd></div>
                    <div><dt>{t("cart.installation")}</dt><dd>{money(o.installationTotal)}</dd></div>
                    <div className="text-muted"><dt>{t("docs.vatTotal")}</dt><dd>{money(o.vatTotal)}</dd></div>
                    <div className="grand"><dt>{t("common.total")}</dt><dd>{money(o.total)}</dd></div>
                  </dl>
                </div>
              </Card>
              <Card title={t("acc.orders.history")}><HistoryList items={o.history} /></Card>
            </div>
            <div className="kit-stack">
              <Card title={t("adm.f.customer")}>
                <KeyValue cols={1} items={[[t("adm.f.fullName"), o.customerName], [t("adm.f.company"), o.companyName], [t("adm.f.phone"), o.customerPhone], [t("acc.orders.delivery"), enumLabel("DeliveryMethod", o.deliveryMethod)], [t("adm.f.address"), o.address ? `${o.address.city}, ${o.address.street}` : o.pickupBranchName], [t("acc.orders.paymentMethod"), enumLabel("PaymentMethod", o.paymentMethod)], [t("acc.orders.paymentStatus"), <EnumBadge key="p" group="PaymentStatus" code={o.paymentStatus} />], [t("acc.orders.serviceOrder"), o.serviceOrderId ? <Link key="s" to={`/service-orders/${o.serviceOrderId}`} className="text-brand">{o.serviceOrderNumber}</Link> : null]]} />
              </Card>
              <Card title={t("adm.nav.payments")}>{o.payments.length ? <ul className="kit-list">{o.payments.map((p: any) => <li key={p.id}><span className="grow">{p.number}<small className="block text-muted">{enumLabel("PaymentMethod", p.method)}</small></span><strong>{money(p.amount)}</strong><EnumBadge group="PaymentStatus" code={p.status} /></li>)}</ul> : <EmptyState />}</Card>
              <Card title={t("adm.nav.reservations")}>{o.reservations.length ? <ul className="kit-list">{o.reservations.map((r: any) => <li key={r.id}><span className="grow">{r.number} · {text(r.productName)}<small className="block text-muted">{text(r.warehouseName)} · {qty(r.quantity)}</small></span><EnumBadge group="ReservationStatus" code={r.status} /></li>)}</ul> : <EmptyState />}</Card>
              <Card title={t("acc.orders.logistics")}>{o.logistics.length ? <ul className="kit-list">{o.logistics.map((l: any) => <li key={l.id}><Link to={`/logistics?task=${l.id}`} className="grow">{l.number}</Link><EnumBadge group="LogisticsStatus" code={l.status} /></li>)}</ul> : <EmptyState />}</Card>
              <Card title={t("acc.orders.documents")}><DocumentsList docs={o.documents} /></Card>
            </div>
          </div>
          {cancel && <ReasonDialog open category="CANCELLED" title={t("acc.orders.cancelOrder")} onClose={() => setCancel(false)} onSubmit={async (code, note) => { try { await run({ code: "cancel" }, { note: note || code }); setCancel(false); } catch (e) { toast.error(errorText(e, t("errors.generic"))); } }} />}
        </>
      )}
    </QueryView>
  );
}

export function QuotesAdminPage() {
  const { t, date, money, text, qty, enumLabel } = useI18n();
  const [send, setSend] = useState<any | null>(null);
  return (
    <>
      <PageHeader title={t("adm.nav.quotes")} />
      <ResourceTable
        path="/admin/quotes"
        filters={[{ key: "status", label: t("common.status"), options: enumKeys("QuoteStatus").map((s) => ({ value: s, label: enumLabel("QuoteStatus", s) })) }]}
        columns={[
          { key: "number", header: t("adm.f.number"), render: (r: any) => <span><strong>{r.number}</strong><small className="block">{date(r.requestedAt)}</small></span> },
          { key: "companyName", header: t("adm.f.company"), render: (r: any) => <span>{r.companyName}<small className="block">{r.managerName}</small></span> },
          { key: "lines", header: t("acc.orders.items"), render: (r: any) => r.lines.map((l: any, i: number) => <small key={i} className="block">{l.sku} · {text(l.name)} × {qty(l.quantity)}</small>) },
          { key: "total", header: t("common.total"), className: "num", render: (r: any) => (r.total ? money(r.total) : "—") },
          { key: "validUntil", header: t("adm.f.validUntil"), render: (r: any) => (r.validUntil ? date(r.validUntil) : "—"), hideOnMobile: true },
          { key: "status", header: t("common.status"), render: (r: any) => <EnumBadge group="QuoteStatus" code={r.status} /> },
          { key: "_a", header: "", render: (r: any) => (r.availableActions.length ? <button type="button" className="btn primary btn-sm" onClick={() => setSend(r)}>{t("adm.quotes.price")}</button> : null) },
        ]}
      />
      {send && <QuoteSendDialog quote={send} onClose={() => setSend(null)} />}
    </>
  );
}

function QuoteSendDialog({ quote, onClose }: { quote: any; onClose: () => void }) {
  const { t, text, qty, money } = useI18n();
  const refresh = useRefresh();
  const [prices, setPrices] = useState<string[]>(quote.lines.map(() => ""));
  const [days, setDays] = useState("7");
  const [error, setError] = useState<unknown>(null);
  const total = quote.lines.reduce((s: number, l: any, i: number) => s + Number(prices[i] || 0) * Number(l.quantity.value), 0);
  return (
    <Dialog open onClose={onClose} size="lg" title={t("adm.quotes.priceTitle", { number: quote.number })} footer={<><strong className="flex-1">{money({ amount: total.toFixed(2), currency: "AZN" })}</strong><button type="button" className="btn outline" onClick={onClose}>{t("common.cancel")}</button><button type="button" className="btn primary" onClick={async () => { setError(null); try { await post(`/admin/quotes/${quote.id}/send`, { prices, validDays: Number(days) }); await refresh(); toast.success(t("adm.quotes.sent")); onClose(); } catch (e) { setError(e); } }}>{t("common.send")}</button></>}>
      <FormError error={error} />
      <div className="table-wrap"><table><thead><tr><th>SKU</th><th>{t("docs.item")}</th><th className="num">{t("common.quantity")}</th><th>{t("estimate.unitPrice")}</th></tr></thead><tbody>
        {quote.lines.map((l: any, i: number) => <tr key={i}><td>{l.sku}</td><td>{text(l.name)}</td><td className="num">{qty(l.quantity)}</td><td><input className="form-input" inputMode="decimal" value={prices[i]} aria-label={t("estimate.unitPrice")} onChange={(e) => setPrices(prices.map((p, j) => (j === i ? e.target.value.replace(",", ".") : p)))} /></td></tr>)}
      </tbody></table></div>
      <TextField label={t("adm.quotes.validDays")} type="number" value={days} onValue={setDays} />
      {quote.note && <p className="kit-note text-sm">{quote.note}</p>}
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Anbar (§34–40)                                                       */
/* ------------------------------------------------------------------ */

export function InventoryPage() {
  const { t, text, qty, money, enumLabel } = useI18n();
  const { query, setQuery } = useRouter();
  const lookups = useLookups();
  const totals = useApi<any>("/admin/inventory?pageSize=1");
  const refresh = useRefresh();
  const [movement, setMovement] = useState<string | null>(null);
  const [minEdit, setMinEdit] = useState<any | null>(null);
  const belowMin = query.get("belowMin") === "true";
  return (
    <>
      <PageHeader title={t("adm.nav.inventory")} actions={<><button type="button" className="btn outline" onClick={() => setMovement("RECEIPT")}><PackagePlus size={16} /> {t("adm.inv.receipt")}</button><button type="button" className="btn outline" onClick={() => setMovement("WRITE_OFF")}>{t("adm.inv.writeOff")}</button><button type="button" className="btn outline" onClick={() => setMovement("PURPOSE_CHANGE")}>{t("adm.inv.purposeChange")}</button><Link to="/transfers" className="btn primary"><ArrowRightLeft size={16} /> {t("adm.nav.transfers")}</Link></>} />
      {totals.data && (
        <Grid cols={4}>
          <Stat label="SKU" value={totals.data.totals.skus} />
          <Stat label={t("adm.inv.value")} value={money(totals.data.totals.value)} tone="success" />
          <Stat label={t("adm.dash.lowStock")} value={totals.data.totals.belowMin} tone="danger" icon={AlertTriangle} />
          <Stat label={t("adm.inv.reservations")} value={totals.data.totals.reserved} tone="info" to="/reservations" />
        </Grid>
      )}
      <div className="mb-3"><Toggle label={t("adm.inv.onlyBelowMin")} checked={belowMin} onValue={(v) => setQuery({ belowMin: v ? "true" : null, page: null })} /></div>
      <ResourceTable
        key={String(belowMin)}
        path="/admin/inventory"
        pageSize={30}
        extraQuery={{ belowMin: belowMin ? "true" : undefined }}
        filters={[{ key: "warehouseId", label: t("adm.f.warehouse"), options: (lookups.data?.warehouses ?? []).map((w: any) => ({ value: w.id, label: text(w.name) })) }, { key: "purpose", label: t("adm.inv.purpose"), options: enumKeys("StockPurpose").map((s) => ({ value: s, label: enumLabel("StockPurpose", s) })) }, { key: "warehouseType", label: t("adm.f.type"), options: enumKeys("WarehouseType").map((s) => ({ value: s, label: enumLabel("WarehouseType", s) })) }]}
        columns={[
          { key: "productName", header: t("adm.f.product"), render: (r: any) => <span><strong>{text(r.productName)}</strong><small className="block">{r.sku} · {r.categoryName}</small></span> },
          { key: "warehouseName", header: t("adm.f.warehouse"), render: (r: any) => <span>{text(r.warehouseName)}<small className="block">{enumLabel("WarehouseType", r.warehouseType)}{r.zone ? ` · ${r.zone}` : ""}</small></span> },
          { key: "purpose", header: t("adm.inv.purpose"), hideOnMobile: true, render: (r: any) => enumLabel("StockPurpose", r.purpose) },
          { key: "physical", header: t("tech.inv.physical"), className: "num", render: (r: any) => qty(r.physical) },
          { key: "reserved", header: t("tech.inv.reserved"), className: "num", hideOnMobile: true, render: (r: any) => qty(r.reserved) },
          { key: "damaged", header: t("adm.inv.damaged"), className: "num", hideOnMobile: true, render: (r: any) => qty(r.damaged) },
          { key: "inTransit", header: t("adm.inv.inTransit"), className: "num", hideOnMobile: true, render: (r: any) => qty(r.inTransit) },
          { key: "available", header: t("tech.inv.available"), className: "num", render: (r: any) => <strong className={cn(r.belowMin && "text-danger")}>{qty(r.available)}</strong> },
          { key: "minLevel", header: t("tech.inv.min"), className: "num", render: (r: any) => <button type="button" className="btn ghost btn-sm" onClick={() => setMinEdit(r)}>{qty(r.minLevel)}{r.belowMin && <AlertTriangle size={12} className="text-danger" />}</button> },
          { key: "avgCost", header: t("adm.inv.avgCost"), className: "num", hideOnMobile: true, render: (r: any) => money(r.avgCost) },
        ]}
      />
      {movement && <MovementDialog type={movement} lookups={lookups.data} onClose={() => setMovement(null)} />}
      {minEdit && <MinLevelDialog row={minEdit} onClose={() => setMinEdit(null)} onSaved={refresh} />}
    </>
  );
}

function MinLevelDialog({ row, onClose, onSaved }: { row: any; onClose: () => void; onSaved: () => void }) {
  const { t, text } = useI18n();
  const [min, setMin] = useState(row.minLevel.value);
  const [zone, setZone] = useState(row.zone ?? "");
  const [error, setError] = useState<unknown>(null);
  return (
    <Dialog open onClose={onClose} size="sm" title={`${text(row.productName)} · ${text(row.warehouseName)}`} footer={<><button type="button" className="btn outline" onClick={onClose}>{t("common.cancel")}</button><button type="button" className="btn primary" onClick={async () => { try { await patch(`/admin/inventory/${row.id}`, { minLevel: Number(min), zone }); onSaved(); onClose(); } catch (e) { setError(e); } }}>{t("common.save")}</button></>}>
      <FormError error={error} />
      <TextField label={`${t("tech.inv.min")} (${row.minLevel.unit})`} type="number" value={min} onValue={setMin} />
      <TextField label={t("adm.inv.zone")} value={zone} onValue={setZone} />
    </Dialog>
  );
}

function MovementDialog({ type, lookups, onClose }: { type: string; lookups: any; onClose: () => void }) {
  const { t, text, enumLabel, unit } = useI18n();
  const refresh = useRefresh();
  const [v, setV] = useState({ type, warehouseId: "", variantId: "", quantity: "1", unit: "pcs", direction: type === "WRITE_OFF" ? "OUT" : "IN", purpose: "SALES", reason: "", unitCost: "" });
  const [error, setError] = useState<unknown>(null);
  const variant = lookups?.variants?.find((x: any) => x.id === v.variantId);
  return (
    <Dialog open onClose={onClose} size="lg" title={enumLabel("MovementType", type)} footer={<><button type="button" className="btn outline" onClick={onClose}>{t("common.cancel")}</button><button type="button" className="btn primary" onClick={async () => { setError(null); try { await post("/admin/stock-movements", { ...v, unitCost: v.unitCost || undefined, reason: v.reason || undefined }); await refresh(); toast.success(t("adm.inv.movementDone")); onClose(); } catch (e) { setError(e); } }}>{t("common.confirm")}</button></>}>
      <FormError error={error} />
      <p className="text-sm text-muted mb-3">{t("adm.inv.immutableHint")}</p>
      <div className="kit-form-grid">
        <SelectField label={t("adm.f.type")} value={v.type} onValue={(x) => setV({ ...v, type: x })} options={["RECEIPT", "WRITE_OFF", "ADJUSTMENT", "PURPOSE_CHANGE", "RETURN"].map((x) => ({ value: x, label: enumLabel("MovementType", x) }))} />
        <SelectField label={t("adm.f.warehouse")} required value={v.warehouseId} onValue={(x) => setV({ ...v, warehouseId: x })} placeholder={t("common.choose")} options={(lookups?.warehouses ?? []).map((w: any) => ({ value: w.id, label: text(w.name) }))} />
        <SelectField className="span-2" label={t("adm.f.product")} required value={v.variantId} onValue={(x) => { const vr = lookups?.variants?.find((y: any) => y.id === x); setV({ ...v, variantId: x, unit: vr?.baseUnit ?? "pcs" }); }} placeholder={t("common.choose")} options={(lookups?.variants ?? []).map((x: any) => ({ value: x.id, label: `${x.sku} · ${text(x.name)}` }))} />
        <TextField label={t("common.quantity")} inputMode="decimal" value={v.quantity} onValue={(x) => setV({ ...v, quantity: x })} />
        <SelectField label={t("adm.f.unit")} value={v.unit} onValue={(x) => setV({ ...v, unit: x })} options={(variant?.units ?? [v.unit]).map((u: string) => ({ value: u, label: unit(u) }))} />
        {v.type === "ADJUSTMENT" && <SelectField label={t("adm.f.direction")} value={v.direction} onValue={(x) => setV({ ...v, direction: x })} options={[{ value: "IN", label: t("adm.f.in") }, { value: "OUT", label: t("adm.f.out") }]} />}
        <SelectField label={v.type === "PURPOSE_CHANGE" ? t("adm.inv.targetPurpose") : t("adm.inv.purpose")} value={v.purpose} onValue={(x) => setV({ ...v, purpose: x })} options={enumKeys("StockPurpose").map((x) => ({ value: x, label: enumLabel("StockPurpose", x) }))} />
        {v.type === "RECEIPT" && <TextField label={t("adm.f.unitCost")} inputMode="decimal" value={v.unitCost} onValue={(x) => setV({ ...v, unitCost: x })} />}
      </div>
      <TextArea label={t("common.reason")} required={["WRITE_OFF", "ADJUSTMENT", "PURPOSE_CHANGE"].includes(v.type)} value={v.reason} onValue={(x) => setV({ ...v, reason: x })} rows={2} />
    </Dialog>
  );
}

export function TransfersPage() {
  const { t, dateTime, text, qty, enumLabel } = useI18n();
  const refresh = useRefresh();
  const lookups = useLookups();
  const [creating, setCreating] = useState(false);
  const [receive, setReceive] = useState<any | null>(null);
  return (
    <>
      <PageHeader title={t("adm.nav.transfers")} actions={<button type="button" className="btn primary" onClick={() => setCreating(true)}><Plus size={16} /> {t("adm.inv.newTransfer")}</button>} />
      <ResourceTable
        path="/admin/transfers"
        defaultSort="-createdAt"
        filters={[{ key: "status", label: t("common.status"), options: enumKeys("TransferStatus").map((s) => ({ value: s, label: enumLabel("TransferStatus", s) })) }]}
        columns={[
          { key: "number", header: t("adm.f.number"), render: (r: any) => <span><strong>{r.number}</strong><small className="block">{dateTime(r.createdAt)} · {r.createdBy}</small></span> },
          { key: "route", header: t("adm.logistics.route"), render: (r: any) => <span>{text(r.fromWarehouseName)} → {text(r.toWarehouseName)}</span> },
          { key: "lines", header: t("acc.orders.items"), render: (r: any) => r.lines.map((l: any) => <small key={l.id} className="block">{l.sku} × {qty(l.quantity)}{l.receivedQuantity ? ` (${t("adm.inv.received")}: ${qty(l.receivedQuantity)})` : ""}</small>) },
          { key: "shippedAt", header: t("adm.inv.shipped"), hideOnMobile: true, render: (r: any) => (r.shippedAt ? dateTime(r.shippedAt) : "—") },
          { key: "status", header: t("common.status"), render: (r: any) => <span><EnumBadge group="TransferStatus" code={r.status} />{r.discrepancyNote && <small className="block text-danger">{r.discrepancyNote}</small>}</span> },
          { key: "_a", header: "", render: (r: any) => <ActionBar size="sm" actions={r.availableActions} custom={{ receive: () => setReceive(r) }} run={async (a) => { await post(`/admin/transfers/${r.id}/${a.code}`); await refresh(); }} /> },
        ]}
      />
      {creating && <TransferDialog lookups={lookups.data} onClose={() => setCreating(false)} />}
      {receive && <ReceiveDialog title={t("adm.inv.receiveTransfer", { number: receive.number })} lines={receive.lines.map((l: any) => ({ id: l.id, label: `${l.sku} · ${text(l.productName)}`, expected: l.quantity }))} onClose={() => setReceive(null)} onSubmit={async (received, note) => { await post(`/admin/transfers/${receive.id}/receive`, { received, note }); await refresh(); }} />}
    </>
  );
}

function TransferDialog({ lookups, onClose }: { lookups: any; onClose: () => void }) {
  const { t, text, unit } = useI18n();
  const refresh = useRefresh();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState([{ variantId: "", quantity: "1", unit: "pcs" }]);
  const [error, setError] = useState<unknown>(null);
  return (
    <Dialog open onClose={onClose} size="lg" title={t("adm.inv.newTransfer")} footer={<><button type="button" className="btn outline" onClick={onClose}>{t("common.cancel")}</button><button type="button" className="btn primary" onClick={async () => { setError(null); try { await post("/admin/transfers", { fromWarehouseId: from, toWarehouseId: to, lines: lines.filter((l) => l.variantId), note }); await refresh(); toast.success(t("common.saved")); onClose(); } catch (e) { setError(e); } }}>{t("common.create")}</button></>}>
      <FormError error={error} />
      <div className="kit-form-grid">
        <SelectField label={t("courier.from")} value={from} onValue={setFrom} placeholder={t("common.choose")} options={(lookups?.warehouses ?? []).map((w: any) => ({ value: w.id, label: text(w.name) }))} />
        <SelectField label={t("courier.to")} value={to} onValue={setTo} placeholder={t("common.choose")} options={(lookups?.warehouses ?? []).filter((w: any) => w.id !== from).map((w: any) => ({ value: w.id, label: text(w.name) }))} />
      </div>
      {lines.map((l, i) => {
        const vr = lookups?.variants?.find((x: any) => x.id === l.variantId);
        return (
          <div key={i} className="flex gap-2 items-end flex-wrap">
            <SelectField className="flex-1" label={t("adm.f.product")} value={l.variantId} onValue={(x) => setLines(lines.map((y, j) => (j === i ? { ...y, variantId: x, unit: lookups?.variants?.find((z: any) => z.id === x)?.baseUnit ?? "pcs" } : y)))} placeholder={t("common.choose")} options={(lookups?.variants ?? []).map((x: any) => ({ value: x.id, label: `${x.sku} · ${text(x.name)}` }))} />
            <TextField label={t("common.quantity")} inputMode="decimal" value={l.quantity} onValue={(x) => setLines(lines.map((y, j) => (j === i ? { ...y, quantity: x } : y)))} />
            <SelectField label={t("adm.f.unit")} value={l.unit} onValue={(x) => setLines(lines.map((y, j) => (j === i ? { ...y, unit: x } : y)))} options={(vr?.units ?? [l.unit]).map((u: string) => ({ value: u, label: unit(u) }))} />
            <button type="button" className="icon-button mb-4" aria-label={t("common.remove")} onClick={() => setLines(lines.filter((_, j) => j !== i))}><Trash2 size={14} /></button>
          </div>
        );
      })}
      <button type="button" className="btn outline btn-sm mb-3" onClick={() => setLines([...lines, { variantId: "", quantity: "1", unit: "pcs" }])}><Plus size={14} /> {t("b2b.quick.addRow")}</button>
      <TextArea label={t("common.note")} value={note} onValue={setNote} rows={2} />
    </Dialog>
  );
}

function ReceiveDialog({ title, lines, onClose, onSubmit, extra }: { title: string; lines: { id: string; label: string; expected: { value: string; unit: string } }[]; onClose: () => void; onSubmit: (received: Record<string, string>, note: string) => Promise<unknown>; extra?: React.ReactNode }) {
  const { t, qty } = useI18n();
  const [received, setReceived] = useState<Record<string, string>>(Object.fromEntries(lines.map((l) => [l.id, l.expected.value])));
  const [note, setNote] = useState("");
  const [error, setError] = useState<unknown>(null);
  const diff = lines.some((l) => Number(received[l.id]) !== Number(l.expected.value));
  return (
    <Dialog open onClose={onClose} size="lg" title={title} footer={<><button type="button" className="btn outline" onClick={onClose}>{t("common.cancel")}</button><button type="button" className="btn primary" onClick={async () => { setError(null); try { await onSubmit(received, note); toast.success(t("common.saved")); onClose(); } catch (e) { setError(e); } }}>{t("adm.inv.confirmReceipt")}</button></>}>
      <FormError error={error} />
      {extra}
      <div className="table-wrap"><table><thead><tr><th>{t("docs.item")}</th><th className="num">{t("adm.inv.expected")}</th><th>{t("adm.inv.received")}</th></tr></thead><tbody>
        {lines.map((l) => <tr key={l.id} className={cn(Number(received[l.id]) !== Number(l.expected.value) && "diff")}><td>{l.label}</td><td className="num">{qty(l.expected)}</td><td><input className="form-input" inputMode="decimal" value={received[l.id]} aria-label={t("adm.inv.received")} onChange={(e) => setReceived({ ...received, [l.id]: e.target.value })} /></td></tr>)}
      </tbody></table></div>
      {diff && <TextArea label={t("adm.inv.discrepancy")} required value={note} onValue={setNote} rows={2} hint={t("adm.inv.discrepancyHint")} />}
    </Dialog>
  );
}

export function StockCountsPage() {
  const { t, dateTime, text, enumLabel } = useI18n();
  const lookups = useLookups();
  const refresh = useRefresh();
  const [creating, setCreating] = useState(false);
  return (
    <>
      <PageHeader title={t("adm.nav.stockCounts")} actions={<button type="button" className="btn primary" onClick={() => setCreating(true)}><ClipboardCheck size={16} /> {t("adm.inv.newCount")}</button>} />
      <ResourceTable
        path="/admin/stock-counts"
        rowTo={(r: any) => `/stock-counts/${r.id}`}
        filters={[{ key: "status", label: t("common.status"), options: enumKeys("StockCountStatus").map((s) => ({ value: s, label: enumLabel("StockCountStatus", s) })) }]}
        columns={[
          { key: "number", header: t("adm.f.number"), render: (r: any) => <span><strong>{r.number}</strong><small className="block">{r.createdBy}</small></span> },
          { key: "warehouseName", header: t("adm.f.warehouse"), render: (r: any) => text(r.warehouseName) },
          { key: "scope", header: t("adm.inv.scope"), render: (r: any) => enumLabel("CountScope", r.scope) },
          { key: "scheduledAt", header: t("adm.f.scheduledAt"), render: (r: any) => dateTime(r.scheduledAt) },
          { key: "progress", header: t("adm.inv.progress"), render: (r: any) => `${r.progress}%` },
          { key: "accuracy", header: t("adm.inv.accuracy"), render: (r: any) => (r.accuracy === null ? "—" : `${r.accuracy}%`) },
          { key: "blockMovements", header: t("adm.inv.block"), hideOnMobile: true, render: (r: any) => (r.blockMovements ? t("common.yes") : t("common.no")) },
          { key: "status", header: t("common.status"), render: (r: any) => <EnumBadge group="StockCountStatus" code={r.status} /> },
        ]}
      />
      {creating && <CountCreateDialog lookups={lookups.data} onClose={() => setCreating(false)} onDone={refresh} />}
    </>
  );
}

function CountCreateDialog({ lookups, onClose, onDone }: { lookups: any; onClose: () => void; onDone: () => void }) {
  const { t, text, enumLabel } = useI18n();
  const [v, setV] = useState({ warehouseId: "", scope: "FULL", scheduledAt: "", blockMovements: false });
  const [error, setError] = useState<unknown>(null);
  return (
    <Dialog open onClose={onClose} title={t("adm.inv.newCount")} footer={<><button type="button" className="btn outline" onClick={onClose}>{t("common.cancel")}</button><button type="button" className="btn primary" onClick={async () => { try { await post("/admin/stock-counts", { ...v, scheduledAt: v.scheduledAt ? new Date(v.scheduledAt).toISOString() : new Date().toISOString() }); onDone(); onClose(); } catch (e) { setError(e); } }}>{t("common.create")}</button></>}>
      <FormError error={error} />
      <SelectField label={t("adm.f.warehouse")} value={v.warehouseId} onValue={(x) => setV({ ...v, warehouseId: x })} placeholder={t("common.choose")} options={(lookups?.warehouses ?? []).map((w: any) => ({ value: w.id, label: text(w.name) }))} />
      <SelectField label={t("adm.inv.scope")} value={v.scope} onValue={(x) => setV({ ...v, scope: x })} options={enumKeys("CountScope").map((x) => ({ value: x, label: enumLabel("CountScope", x) }))} />
      <TextField label={t("adm.f.scheduledAt")} type="datetime-local" value={v.scheduledAt} onValue={(x) => setV({ ...v, scheduledAt: x })} />
      <Toggle label={t("adm.inv.blockMovements")} checked={v.blockMovements} onValue={(x) => setV({ ...v, blockMovements: x })} />
    </Dialog>
  );
}

export function StockCountDetailPage({ id }: { id: string }) {
  const { t, text, qty, enumLabel, dateTime } = useI18n();
  const q = useApi<any>(`/admin/stock-counts/${id}`);
  const refresh = useRefresh();
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [error, setError] = useState<unknown>(null);
  useEffect(() => { if (q.data) setCounts(Object.fromEntries(q.data.lines.map((l: any) => [l.id, l.counted?.value ?? ""]))); }, [q.data]);
  const send = async (action?: string) => { setError(null); try { await patch(`/admin/stock-counts/${id}`, { counts, action }); await refresh(); toast.success(t("common.saved")); } catch (e) { setError(e); } };
  return (
    <QueryView query={q} rows={8}>
      {(sc) => (
        <>
          <PageHeader back="/stock-counts" title={sc.number} badge={<EnumBadge group="StockCountStatus" code={sc.status} />} subtitle={`${text(sc.warehouseName)} · ${enumLabel("CountScope", sc.scope)} · ${dateTime(sc.scheduledAt)}`} actions={<>{sc.status === "IN_PROGRESS" && <button type="button" className="btn outline" onClick={() => send()}>{t("adm.inv.saveCounts")}</button>}<ActionBar actions={sc.availableActions} run={async (a) => send(a.code)} /></>} />
          <FormError error={error} />
          <Grid cols={3}><Stat label={t("adm.inv.progress")} value={`${sc.progress}%`} /><Stat label={t("adm.inv.accuracy")} value={sc.accuracy === null ? "—" : `${sc.accuracy}%`} tone="success" /><Stat label={t("adm.inv.lines")} value={sc.lines.length} /></Grid>
          {sc.blockMovements && <p className="kit-note warning mb-4">{t("adm.inv.blockedHint")}</p>}
          <Card flush>
            {!sc.lines.length ? <EmptyState title={t("adm.inv.noLines")} text={t("adm.inv.noLinesHint")} /> : (
              <div className="table-wrap"><table><thead><tr><th>{t("adm.f.product")}</th><th className="num">{t("adm.inv.system")}</th><th>{t("adm.inv.counted")}</th><th className="num">{t("adm.inv.difference")}</th></tr></thead><tbody>
                {sc.lines.map((l: any) => { const d = counts[l.id] === "" ? null : Number(counts[l.id]) - Number(l.system.value); return <tr key={l.id} className={cn(d && "diff")}><td><strong>{text(l.productName)}</strong><small className="block">{l.sku}</small></td><td className="num">{qty(l.system)}</td><td style={{ maxWidth: 140 }}><input className="form-input" inputMode="decimal" value={counts[l.id] ?? ""} disabled={sc.status !== "IN_PROGRESS"} aria-label={t("adm.inv.counted")} onChange={(e) => setCounts({ ...counts, [l.id]: e.target.value })} /></td><td className={cn("num", d ? (d > 0 ? "text-success" : "text-danger") : "")}>{d === null ? "—" : `${d > 0 ? "+" : ""}${d}`}</td></tr>; })}
              </tbody></table></div>
            )}
          </Card>
        </>
      )}
    </QueryView>
  );
}

export function PurchasesPage() {
  const { t, date, text, money, qty, enumLabel } = useI18n();
  const lookups = useLookups();
  const refresh = useRefresh();
  const [creating, setCreating] = useState(false);
  const [receive, setReceive] = useState<any | null>(null);
  const [invoice, setInvoice] = useState("");
  return (
    <>
      <PageHeader title={t("adm.nav.purchases")} actions={<><Link to="/suppliers" className="btn outline">{t("adm.nav.suppliers")}</Link><button type="button" className="btn primary" onClick={() => setCreating(true)}><Plus size={16} /> {t("adm.inv.newPurchase")}</button></>} />
      <ResourceTable
        path="/admin/purchases"
        filters={[{ key: "status", label: t("common.status"), options: enumKeys("PurchaseStatus").map((s) => ({ value: s, label: enumLabel("PurchaseStatus", s) })) }]}
        columns={[
          { key: "number", header: t("adm.f.number"), render: (r: any) => <span><strong>{r.number}</strong><small className="block">{date(r.createdAt)}{r.invoiceNumber ? ` · ${r.invoiceNumber}` : ""}</small></span> },
          { key: "supplierName", header: t("adm.f.supplier") },
          { key: "warehouseName", header: t("adm.f.warehouse"), render: (r: any) => text(r.warehouseName) },
          { key: "lines", header: t("acc.orders.items"), render: (r: any) => r.lines.map((l: any) => <small key={l.id} className="block">{l.sku} × {qty(l.quantity)} ({t("adm.inv.received")}: {qty(l.receivedQuantity)})</small>) },
          { key: "total", header: t("common.total"), className: "num", render: (r: any) => money(r.total) },
          { key: "expectedAt", header: t("adm.inv.expectedAt"), hideOnMobile: true, render: (r: any) => (r.expectedAt ? date(r.expectedAt) : "—") },
          { key: "status", header: t("common.status"), render: (r: any) => <EnumBadge group="PurchaseStatus" code={r.status} /> },
          { key: "_a", header: "", render: (r: any) => <ActionBar size="sm" actions={r.availableActions} custom={{ receive: () => setReceive(r) }} run={async (a) => { await post(`/admin/purchases/${r.id}/${a.code}`); await refresh(); }} /> },
        ]}
      />
      {creating && <PurchaseDialog lookups={lookups.data} onClose={() => setCreating(false)} />}
      {receive && <ReceiveDialog title={t("adm.inv.receivePurchase", { number: receive.number })} extra={<TextField label={t("adm.inv.invoice")} value={invoice} onValue={setInvoice} />} lines={receive.lines.map((l: any) => ({ id: l.id, label: `${l.sku} · ${text(l.productName)}`, expected: { value: String(l.remaining), unit: l.quantity.unit } }))} onClose={() => setReceive(null)} onSubmit={async (received) => { await post(`/admin/purchases/${receive.id}/receive`, { received, invoiceNumber: invoice || undefined }); await refresh(); }} />}
    </>
  );
}

function PurchaseDialog({ lookups, onClose }: { lookups: any; onClose: () => void }) {
  const { t, text } = useI18n();
  const refresh = useRefresh();
  const [v, setV] = useState({ supplierId: "", warehouseId: "", expectedAt: "" });
  const [lines, setLines] = useState([{ variantId: "", quantity: "1", unitCost: "" }]);
  const [error, setError] = useState<unknown>(null);
  return (
    <Dialog open onClose={onClose} size="lg" title={t("adm.inv.newPurchase")} footer={<><button type="button" className="btn outline" onClick={onClose}>{t("common.cancel")}</button><button type="button" className="btn primary" onClick={async () => { setError(null); try { await post("/admin/purchases", { ...v, expectedAt: v.expectedAt || undefined, lines: lines.filter((l) => l.variantId) }); await refresh(); toast.success(t("common.saved")); onClose(); } catch (e) { setError(e); } }}>{t("common.create")}</button></>}>
      <FormError error={error} />
      <div className="kit-form-grid">
        <SelectField label={t("adm.f.supplier")} value={v.supplierId} onValue={(x) => setV({ ...v, supplierId: x })} placeholder={t("common.choose")} options={(lookups?.suppliers ?? []).map((s: any) => ({ value: s.id, label: s.name }))} />
        <SelectField label={t("adm.f.warehouse")} value={v.warehouseId} onValue={(x) => setV({ ...v, warehouseId: x })} placeholder={t("common.choose")} options={(lookups?.warehouses ?? []).map((w: any) => ({ value: w.id, label: text(w.name) }))} />
        <TextField label={t("adm.inv.expectedAt")} type="date" value={v.expectedAt} onValue={(x) => setV({ ...v, expectedAt: x })} />
      </div>
      {lines.map((l, i) => (
        <div key={i} className="flex gap-2 items-end flex-wrap">
          <SelectField className="flex-1" label={t("adm.f.product")} value={l.variantId} onValue={(x) => setLines(lines.map((y, j) => (j === i ? { ...y, variantId: x } : y)))} placeholder={t("common.choose")} options={(lookups?.variants ?? []).map((x: any) => ({ value: x.id, label: `${x.sku} · ${text(x.name)}` }))} />
          <TextField label={t("common.quantity")} inputMode="decimal" value={l.quantity} onValue={(x) => setLines(lines.map((y, j) => (j === i ? { ...y, quantity: x } : y)))} />
          <TextField label={t("adm.f.unitCost")} inputMode="decimal" value={l.unitCost} onValue={(x) => setLines(lines.map((y, j) => (j === i ? { ...y, unitCost: x.replace(",", ".") } : y)))} />
          <button type="button" className="icon-button mb-4" aria-label={t("common.remove")} onClick={() => setLines(lines.filter((_, j) => j !== i))}><Trash2 size={14} /></button>
        </div>
      ))}
      <button type="button" className="btn outline btn-sm" onClick={() => setLines([...lines, { variantId: "", quantity: "1", unitCost: "" }])}><Plus size={14} /> {t("b2b.quick.addRow")}</button>
    </Dialog>
  );
}

export function CostingMethodsPage() {
  const { t, text, date, enumLabel } = useI18n();
  const q = useApi<any[]>("/admin/costing-methods");
  const lookups = useLookups();
  const refresh = useRefresh();
  const [v, setV] = useState({ level: "CATEGORY", targetId: "", method: "FIFO" });
  const [error, setError] = useState<unknown>(null);
  const targets = v.level === "CATEGORY" ? lookups.data?.categories : v.level === "WAREHOUSE_GROUP" ? [] : v.level === "PRODUCT" ? lookups.data?.variants : [];
  return (
    <>
      <PageHeader title={t("adm.nav.costingMethods")} subtitle={t("adm.inv.costingHint")} />
      <div className="kit-split">
        <Card flush>
          <QueryView query={q}>
            {(list) => (
              <ul className="kit-list px-4">
                {list.map((r) => <li key={r.id}><span className="grow"><strong>{text(r.targetName)}</strong><small className="block text-muted">{enumLabel("CostingLevel", r.level)} · {t("adm.inv.effective", { date: date(r.effectiveFrom) })} · {r.updatedBy}</small></span><span className="badge badge-info">{enumLabel("CostingMethod", r.method)}</span>{r.level !== "COMPANY" && <button type="button" className="icon-button" aria-label={t("common.delete")} onClick={async () => { await del(`/admin/costing-methods/${r.id}`); await refresh(); }}><Trash2 size={14} /></button>}</li>)}
              </ul>
            )}
          </QueryView>
        </Card>
        <Card title={t("adm.inv.addRule")}>
          <FormError error={error} />
          <SelectField label={t("adm.inv.level")} value={v.level} onValue={(x) => setV({ ...v, level: x, targetId: "" })} options={enumKeys("CostingLevel").map((x) => ({ value: x, label: enumLabel("CostingLevel", x) }))} />
          {v.level !== "COMPANY" && v.level !== "WAREHOUSE_GROUP" && <SelectField label={t("adm.inv.target")} value={v.targetId} onValue={(x) => setV({ ...v, targetId: x })} placeholder={t("common.choose")} options={(targets ?? []).map((x: any) => ({ value: x.id, label: text(x.name ?? x.sku) }))} />}
          <SelectField label={t("adm.nav.costingMethods")} value={v.method} onValue={(x) => setV({ ...v, method: x })} options={enumKeys("CostingMethod").map((x) => ({ value: x, label: enumLabel("CostingMethod", x) }))} />
          <p className="text-sm text-muted mb-3">{t("adm.inv.nextPeriod")}</p>
          <button type="button" className="btn primary" onClick={async () => { setError(null); try { await post("/admin/costing-methods", { ...v, targetId: v.targetId || null }); await refresh(); toast.success(t("common.saved")); } catch (e) { setError(e); } }}>{t("common.save")}</button>
        </Card>
      </div>
    </>
  );
}
