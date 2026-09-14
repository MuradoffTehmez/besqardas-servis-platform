"use client";
import React, { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, ClipboardPaste, FileText, PackagePlus, Pencil, Plus, Printer, ScanBarcode, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@sp/utils";
import { get, patch, post, useApi } from "@sp/api-client";
import { useI18n } from "../core/i18n";
import { Link, useRouter } from "../core/router";
import { useSession } from "../core/session";
import { Card, EmptyState, EnumBadge, FormError, Grid, KeyValue, Loading, PageHeader, QueryView, SelectField, Stat, TextArea, TextField, errorText } from "../kit/base";
import { ActionBar, Dialog, ResourceTable } from "../kit/actions";
import { FileDrop, ProductVisual, type PickedFile } from "../kit/media";
import { ImagePicker, isImageUrl } from "../kit/upload";
import { useRefresh } from "../pages/common";
import { I18nInput, enumKeys, useLookups } from "./crud";

/**
 * Mal qəbulu (PRD §37–38): barkod/SKU ilə sürətli daxiletmə, alış sifarişindən doldurma, yeni məhsulun yerində yaradılması,
 * partiya/seriya nömrələri və qaimə sənədləri. Qalıq yalnız təsdiqdən sonra dəyişir; təsdiqlənmiş qaimə əks hərəkətlə geri alınır.
 */

interface VariantHit {
  id: string;
  productId: string;
  sku: string;
  barcode: string;
  name: any;
  variantName: string | null;
  baseUnit: string;
  units: { code: string; factor: number }[];
  imageUrl: string;
  imageTone: string;
  status: string;
  stockTotal: number;
  lastCost: { amount: string };
  exact?: boolean;
}

interface Line {
  key: string;
  variant: VariantHit;
  quantity: string;
  unit: string;
  unitCost: string;
  purpose: "SALES" | "SERVICE";
  zone: string;
  lot: string;
  expiryDate: string;
  serials: string;
  open: boolean;
}

let lineSeq = 0;
const newLine = (v: VariantHit, extra: Partial<Line> = {}): Line => ({ key: `l${++lineSeq}`, variant: v, quantity: "1", unit: v.baseUnit, unitCost: v.lastCost?.amount ?? "", purpose: "SALES", zone: "", lot: "", expiryDate: "", serials: "", open: false, ...extra });
const serialList = (s: string) => s.split(/[\n,;]+/).map((x) => x.trim()).filter(Boolean);

/* ------------------------------------------------------------------ */
/* Siyahı                                                               */
/* ------------------------------------------------------------------ */

export function GoodsReceiptsPage() {
  const { t, text, dateTime, money, qty, enumLabel } = useI18n();
  const { can } = useSession();
  const lookups = useLookups();
  const drafts = useApi<any>("/admin/goods-receipts?status=DRAFT&pageSize=1");
  const posted = useApi<any>("/admin/goods-receipts?status=POSTED&pageSize=1");
  const canCreate = can("inventory:create") || can("inventory:edit");
  return (
    <>
      <PageHeader
        title={t("adm.nav.goodsReceipts")}
        subtitle={t("adm.grn.subtitle")}
        actions={canCreate ? <Link to="/goods-receipts/new" className="btn primary"><PackagePlus size={16} /> {t("adm.grn.new")}</Link> : null}
      />
      <Grid cols={3}>
        <Stat label={t("adm.grn.drafts")} value={drafts.data?.meta?.total ?? "—"} tone="warning" to="/goods-receipts?status=DRAFT" hint={t("adm.grn.draftsHint")} />
        <Stat label={t("adm.grn.posted")} value={posted.data?.meta?.total ?? "—"} tone="success" to="/goods-receipts?status=POSTED" />
        <Stat label={t("adm.nav.purchases")} value={t("adm.grn.fromPurchase")} to="/purchases" />
      </Grid>
      <ResourceTable
        path="/admin/goods-receipts"
        rowTo={(r: any) => `/goods-receipts/${r.id}`}
        filters={[
          { key: "status", label: t("common.status"), options: enumKeys("GoodsReceiptStatus").map((s) => ({ value: s, label: enumLabel("GoodsReceiptStatus", s) })) },
          { key: "warehouseId", label: t("adm.f.warehouse"), options: (lookups.data?.warehouses ?? []).map((w: any) => ({ value: w.id, label: text(w.name) })) },
          { key: "supplierId", label: t("adm.f.supplier"), options: (lookups.data?.suppliers ?? []).map((s: any) => ({ value: s.id, label: s.name })) },
        ]}
        empty={<EmptyState icon={PackagePlus} title={t("adm.grn.empty")} text={t("adm.grn.emptyHint")} action={canCreate ? <Link to="/goods-receipts/new" className="btn primary">{t("adm.grn.new")}</Link> : undefined} />}
        columns={[
          { key: "number", header: t("adm.f.number"), render: (r: any) => <span><strong>{r.number}</strong><small className="block">{dateTime(r.createdAt)} · {r.createdBy}</small></span> },
          { key: "supplierDisplay", header: t("adm.f.supplier"), render: (r: any) => <span>{r.supplierDisplay ?? "—"}<small className="block">{[r.invoiceNumber, r.purchaseNumber].filter(Boolean).join(" · ") || t("adm.grn.noInvoice")}</small></span> },
          { key: "warehouseName", header: t("adm.f.warehouse"), render: (r: any) => text(r.warehouseName) },
          { key: "preview", header: t("acc.orders.items"), hideOnMobile: true, render: (r: any) => <span>{r.preview.map((l: any, i: number) => <small key={i} className="block">{l.sku} × {qty(l.quantity)}</small>)}{r.lineCount > 3 && <small className="block text-muted">+{r.lineCount - 3}</small>}</span> },
          { key: "total", header: t("common.total"), className: "num", render: (r: any) => money(r.total) },
          { key: "status", header: t("common.status"), render: (r: any) => <EnumBadge group="GoodsReceiptStatus" code={r.status} /> },
        ]}
      />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Barkod / SKU / ad ilə axtarış                                         */
/* ------------------------------------------------------------------ */

function VariantScanner({ onPick, onCreate }: { onPick: (v: VariantHit) => void; onCreate: (query: string) => void }) {
  const { t, text, unit: unitLabel } = useI18n();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<VariantHit[]>([]);
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const seq = useRef(0);
  const hitsFor = useRef("");
  const search = async (value: string) => {
    const id = ++seq.current;
    setLoading(true);
    try {
      const r = await get<VariantHit[]>(`/admin/variants/search?q=${encodeURIComponent(value)}&limit=8`);
      if (id === seq.current) { setHits(r); setIndex(0); hitsFor.current = value; }
      return r;
    } finally {
      if (id === seq.current) setLoading(false);
    }
  };
  useEffect(() => {
    if (!q.trim()) { setHits([]); return; }
    const timer = setTimeout(() => void search(q.trim()), 220);
    return () => clearTimeout(timer);
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const onDown = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);
  const pick = (v: VariantHit) => { onPick(v); setQ(""); setHits([]); setOpen(false); input.current?.focus(); };
  return (
    <div className="scan-box" ref={box}>
      <div className="scan-input">
        <ScanBarcode size={18} aria-hidden />
        <input
          ref={input}
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={t("adm.grn.scanPlaceholder")}
          aria-label={t("adm.grn.scanPlaceholder")}
          role="combobox"
          aria-expanded={open && hits.length > 0}
          aria-controls="scan-results"
          autoComplete="off"
          onKeyDown={async (e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setIndex((i) => Math.min(hits.length - 1, i + 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setIndex((i) => Math.max(0, i - 1)); }
            else if (e.key === "Escape") setOpen(false);
            else if (e.key === "Enter") {
              e.preventDefault();
              const value = q.trim();
              if (!value) return;
              // skaner Enter göndərir: dəqiq barkod/SKU uyğunluğu dərhal əlavə olunur
              // nəticələr cari mətnə aid deyilsə (skaner debounce-dan tez yazır) yenidən axtarılır
              const list = hitsFor.current === value && open ? hits : await search(value);
              const exact = list.find((h) => h.exact);
              if (exact) pick(exact);
              else if (list.length === 1) pick(list[0]!);
              else if (list[index]) pick(list[index]!);
              else toast.error(t("adm.grn.notFound", { q: value }));
            }
          }}
        />
        {loading && <span className="kit-spin-dot" aria-hidden />}
      </div>
      {open && q.trim() && (
        <ul className="scan-results" id="scan-results" role="listbox">
          {hits.map((h, i) => (
            <li key={h.id} role="option" aria-selected={i === index} className={cn(i === index && "active")} onMouseEnter={() => setIndex(i)} onMouseDown={(e) => { e.preventDefault(); pick(h); }}>
              <ProductVisual kind={h.imageUrl} tone={h.imageTone} size="sm" />
              <span className="grow">
                <strong>{text(h.name)}{h.variantName ? ` · ${h.variantName}` : ""}</strong>
                <small className="block text-muted">{h.sku} · {h.barcode || "—"} · {t("adm.grn.inStock", { qty: h.stockTotal, unit: unitLabel(h.baseUnit) })}</small>
              </span>
              {h.exact && <span className="badge badge-success">{t("adm.grn.exact")}</span>}
              {h.status === "DRAFT" && <EnumBadge group="ProductStatus" code="DRAFT" />}
            </li>
          ))}
          {!loading && !hits.length && <li className="scan-empty">{t("adm.grn.notFound", { q })}</li>}
          <li className="scan-create" onMouseDown={(e) => { e.preventDefault(); setOpen(false); onCreate(q.trim()); }}>
            <Plus size={15} /> {t("adm.grn.createProduct", { q: q.trim() })}
          </li>
        </ul>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Redaktor                                                             */
/* ------------------------------------------------------------------ */

export function GoodsReceiptEditorPage({ id }: { id?: string }) {
  const { t, text, money, enumLabel, unit: unitLabel } = useI18n();
  const { navigate, query } = useRouter();
  const lookups = useLookups();
  const existing = useApi<any>(id ? `/admin/goods-receipts/${id}` : null);
  const purchases = useApi<any>("/admin/purchases?pageSize=100");
  const [head, setHead] = useState({ warehouseId: "", supplierId: "", supplierName: "", purchaseId: "", invoiceNumber: "", invoiceDate: "", note: "" });
  const [lines, setLines] = useState<Line[]>([]);
  const [files, setFiles] = useState<PickedFile[]>([]);
  const [kept, setKept] = useState<{ name: string; url: string; mimeType: string }[]>([]);
  const [error, setError] = useState<any>(null);
  const [busy, setBusy] = useState<"draft" | "post" | null>(null);
  const [creating, setCreating] = useState<string | null>(null);
  const [pasting, setPasting] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const loaded = useRef(false);

  useEffect(() => {
    if (!existing.data || loaded.current) return;
    const r = existing.data;
    loaded.current = true;
    setHead({ warehouseId: r.warehouseId, supplierId: r.supplierId ?? "", supplierName: r.supplierId ? "" : r.supplierName ?? "", purchaseId: r.purchaseId ?? "", invoiceNumber: r.invoiceNumber ?? "", invoiceDate: r.invoiceDate?.slice(0, 10) ?? "", note: r.note ?? "" });
    setLines(r.lines.filter((l: any) => l.variant).map((l: any) => newLine(l.variant, { quantity: l.quantityValue, unit: l.unit, unitCost: l.unitCost.amount, purpose: l.purpose, zone: l.zone ?? "", lot: l.lot ?? "", expiryDate: l.expiryDate?.slice(0, 10) ?? "", serials: l.serials.join("\n"), open: !!(l.lot || l.expiryDate || l.serials.length) })));
    setKept(r.attachments.map((a: any) => ({ name: a.name, url: a.url, mimeType: a.mimeType })));
  }, [existing.data]);

  // anbar seçilməyibsə mərkəzi anbar təklif olunur; ?warehouseId= ilə gələn dəyər üstündür
  useEffect(() => {
    if (id || head.warehouseId || !lookups.data) return;
    const open = lookups.data.warehouses.filter((w: any) => !w.blocked);
    const preset = query.get("warehouseId") ?? (open.find((w: any) => w.type === "CENTRAL") ?? open.find((w: any) => w.type !== "MOBILE") ?? open[0])?.id ?? "";
    setHead((h) => ({ ...h, warehouseId: preset }));
  }, [lookups.data]); // eslint-disable-line react-hooks/exhaustive-deps

  if (id && existing.isLoading) return <Loading rows={8} />;
  if (id && existing.data && existing.data.status !== "DRAFT") {
    return <EmptyState title={t("adm.grn.notEditable")} action={<Link to={`/goods-receipts/${id}`} className="btn primary">{t("common.back")}</Link>} />;
  }
  const fe = error?.fieldErrors ?? {};
  const openPos = (purchases.data?.items ?? []).filter((p: any) => ["SENT", "CONFIRMED", "PARTIALLY_RECEIVED"].includes(p.status));

  // eyni məhsul təkrar skan olunanda yeni sətir yox, miqdar artırılır
  const addVariant = (v: VariantHit) => {
    const same = lines.find((l) => l.variant.id === v.id && l.unit === v.baseUnit && !l.serials);
    if (same) {
      setLines(lines.map((l) => (l.key === same.key ? { ...l, quantity: String(Number(l.quantity || 0) + 1) } : l)));
      setFlash(same.key);
    } else {
      const line = newLine(v);
      setLines([...lines, line]);
      setFlash(line.key);
    }
    setTimeout(() => setFlash(null), 900);
  };
  const setLine = (key: string, patchLine: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patchLine } : l)));
  const fillFromPurchase = async (poId: string) => {
    setHead((h) => ({ ...h, purchaseId: poId }));
    const po = openPos.find((p: any) => p.id === poId);
    if (!po) return;
    const hits = await Promise.all(po.lines.filter((l: any) => l.remaining > 0).map(async (l: any) => ({ l, v: (await get<VariantHit[]>(`/admin/variants/search?q=${encodeURIComponent(l.sku)}&limit=3`)).find((h) => h.id === l.variantId) })));
    setHead((h) => ({ ...h, purchaseId: poId, warehouseId: po.warehouseId, supplierId: po.supplierId, supplierName: "", invoiceNumber: h.invoiceNumber || po.invoiceNumber || "" }));
    setLines(hits.filter((x) => x.v).map(({ l, v }) => newLine(v!, { quantity: String(l.remaining), unitCost: l.unitCost.amount })));
    toast.success(t("adm.grn.filledFromPo", { number: po.number }));
  };
  const totals = lines.reduce((s, l) => ({ qty: s.qty + (Number(l.quantity) || 0), cost: s.cost + (Number(l.quantity) || 0) * (Number(l.unitCost) || 0) }), { qty: 0, cost: 0 });

  const save = async (postIt: boolean) => {
    setError(null);
    setBusy(postIt ? "post" : "draft");
    const payload = {
      warehouseId: head.warehouseId,
      supplierId: head.supplierId || null,
      supplierName: head.supplierId ? null : head.supplierName || null,
      purchaseId: head.purchaseId || null,
      invoiceNumber: head.invoiceNumber || null,
      invoiceDate: head.invoiceDate || null,
      note: head.note || null,
      lines: lines.map((l) => ({ variantId: l.variant.id, quantity: l.quantity.replace(",", "."), unit: l.unit, unitCost: l.unitCost.replace(",", "."), purpose: l.purpose, zone: l.zone, lot: l.lot, expiryDate: l.expiryDate || undefined, serials: serialList(l.serials) })),
      attachments: [...kept.map((k) => ({ name: k.name, url: k.url })), ...files.filter((f) => f.dataUrl).map((f) => ({ name: f.name, dataUrl: f.dataUrl! }))],
      post: postIt,
    };
    try {
      const r = id ? await patch(`/admin/goods-receipts/${id}`, payload) : await post("/admin/goods-receipts", payload);
      toast.success(postIt ? t("adm.grn.postedToast", { number: r.number }) : t("adm.grn.savedToast", { number: r.number }));
      navigate(`/goods-receipts/${r.id}`);
    } catch (e) {
      setError(e);
      toast.error(errorText(e, t("errors.generic")));
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <PageHeader
        back={id ? `/goods-receipts/${id}` : "/goods-receipts"}
        title={id ? t("adm.grn.editTitle", { number: existing.data?.number ?? "" }) : t("adm.grn.new")}
        subtitle={t("adm.grn.editorHint")}
        actions={
          <>
            <button type="button" className="btn outline" disabled={!!busy || !lines.length} onClick={() => save(false)}>{t("adm.grn.saveDraft")}</button>
            <button type="button" className="btn primary" disabled={!!busy || !lines.length} onClick={() => save(true)}><PackagePlus size={16} /> {t("adm.grn.postNow")}</button>
          </>
        }
      />
      <FormError error={error && !Object.keys(fe).length ? error : null} />
      <div className="grn-layout">
        <div className="kit-stack">
          <Card title={t("adm.grn.items")} subtitle={t("adm.grn.itemsHint")} actions={<><button type="button" className="btn outline btn-sm" onClick={() => setPasting(true)}><ClipboardPaste size={14} /> {t("adm.grn.paste")}</button><button type="button" className="btn outline btn-sm" onClick={() => setCreating("")}><Plus size={14} /> {t("adm.grn.newProduct")}</button></>}>
            <VariantScanner onPick={addVariant} onCreate={(q) => setCreating(q)} />
            {fe.lines && <p className="kit-field-error">{t("validation.linesRequired")}</p>}
            {!lines.length ? (
              <EmptyState icon={ScanBarcode} title={t("adm.grn.noLines")} text={t("adm.grn.noLinesHint")} />
            ) : (
              <div className="table-wrap mt-3">
                <table className="grn-table">
                  <thead>
                    <tr><th>{t("adm.f.product")}</th><th style={{ width: 110 }}>{t("common.quantity")}</th><th style={{ width: 110 }}>{t("adm.f.unit")}</th><th style={{ width: 130 }}>{t("adm.f.unitCost")}</th><th style={{ width: 130 }}>{t("adm.inv.purpose")}</th><th className="num">{t("common.total")}</th><th aria-label={t("common.actions")} /></tr>
                  </thead>
                  <tbody>
                    {lines.map((l, i) => {
                      const err = (f: string) => fe[`lines.${i}.${f}`];
                      const serials = serialList(l.serials);
                      return (
                        <React.Fragment key={l.key}>
                          <tr className={cn(flash === l.key && "flash", Object.keys(fe).some((k) => k.startsWith(`lines.${i}.`)) && "diff")}>
                            <td>
                              <div className="entity-row">
                                <ProductVisual kind={l.variant.imageUrl} tone={l.variant.imageTone} size="sm" />
                                <span><strong>{text(l.variant.name)}</strong><small>{l.variant.sku}{l.variant.barcode ? ` · ${l.variant.barcode}` : ""}</small></span>
                              </div>
                            </td>
                            <td><input className={cn("form-input", err("quantity") && "input-error")} inputMode="decimal" value={l.quantity} aria-label={t("common.quantity")} onChange={(e) => setLine(l.key, { quantity: e.target.value })} /></td>
                            <td>
                              <select className="form-input" value={l.unit} aria-label={t("adm.f.unit")} onChange={(e) => setLine(l.key, { unit: e.target.value })}>
                                {l.variant.units.map((u) => <option key={u.code} value={u.code}>{unitLabel(u.code)}{u.factor !== 1 ? ` (${u.factor} ${unitLabel(l.variant.baseUnit)})` : ""}</option>)}
                              </select>
                            </td>
                            <td><input className={cn("form-input", err("unitCost") && "input-error")} inputMode="decimal" value={l.unitCost} aria-label={t("adm.f.unitCost")} onChange={(e) => setLine(l.key, { unitCost: e.target.value })} /></td>
                            <td>
                              <select className="form-input" value={l.purpose} aria-label={t("adm.inv.purpose")} onChange={(e) => setLine(l.key, { purpose: e.target.value as Line["purpose"] })}>
                                {enumKeys("StockPurpose").map((p) => <option key={p} value={p}>{enumLabel("StockPurpose", p)}</option>)}
                              </select>
                            </td>
                            <td className="num"><strong>{money({ amount: ((Number(l.quantity) || 0) * (Number(l.unitCost.replace(",", ".")) || 0)).toFixed(2), currency: "AZN" })}</strong></td>
                            <td className="grn-row-tools">
                              <button type="button" className={cn("icon-button", (l.lot || l.expiryDate || l.serials || l.zone) && "text-brand")} aria-expanded={l.open} aria-label={t("adm.grn.details")} title={t("adm.grn.details")} onClick={() => setLine(l.key, { open: !l.open })}>{l.open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}</button>
                              <button type="button" className="icon-button" aria-label={t("common.remove")} onClick={() => setLines(lines.filter((x) => x.key !== l.key))}><Trash2 size={14} /></button>
                            </td>
                          </tr>
                          {l.open && (
                            <tr className="grn-extra">
                              <td colSpan={7}>
                                <div className="kit-form-grid">
                                  <TextField label={t("adm.inv.zone")} value={l.zone} onValue={(v) => setLine(l.key, { zone: v })} placeholder="A-01" />
                                  <TextField label={t("adm.grn.lot")} value={l.lot} onValue={(v) => setLine(l.key, { lot: v })} />
                                  <TextField label={t("adm.grn.expiry")} type="date" value={l.expiryDate} onValue={(v) => setLine(l.key, { expiryDate: v })} error={err("expiryDate")} />
                                  <TextArea className="span-2" label={t("adm.grn.serials")} rows={3} value={l.serials} onValue={(v) => setLine(l.key, { serials: v })} error={err("serials")} hint={t("adm.grn.serialsHint", { count: serials.length, qty: l.quantity || 0 })} />
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
          <Card title={t("adm.grn.documents")} subtitle={t("adm.grn.documentsHint")}>
            {kept.length > 0 && (
              <ul className="kit-files mb-3">
                {kept.map((k) => (
                  <li key={k.url}>
                    {isImageUrl(k.url) && k.mimeType.startsWith("image/") ? <img src={k.url} alt="" /> : <span className="kit-file-icon">PDF</span>}
                    <span className="flex-1">{k.name}</span>
                    <button type="button" className="icon-button" aria-label={t("common.remove")} onClick={() => setKept(kept.filter((x) => x.url !== k.url))}><Trash2 size={14} /></button>
                  </li>
                ))}
              </ul>
            )}
            <FileDrop files={files} onChange={setFiles} accept="image/*,application/pdf" max={6} maxSizeMb={8} capture label={t("adm.grn.dropInvoice")} />
          </Card>
        </div>
        <div className="kit-stack grn-side">
          <Card title={t("adm.grn.header")}>
            <SelectField label={t("adm.f.warehouse")} required value={head.warehouseId} onValue={(v) => setHead({ ...head, warehouseId: v })} placeholder={t("common.choose")} options={(lookups.data?.warehouses ?? []).map((w: any) => ({ value: w.id, label: `${text(w.name)} · ${enumLabel("WarehouseType", w.type)}${w.blocked ? ` · ${t("adm.grn.blocked")}` : ""}` }))} error={fe.warehouseId} />
            {lookups.data?.warehouses.find((w: any) => w.id === head.warehouseId)?.blocked && <p className="kit-note warning text-sm mb-3">{t("validation.warehouseBlocked")}</p>}
            <SelectField label={t("adm.grn.purchaseOrder")} value={head.purchaseId} onValue={(v) => (v ? void fillFromPurchase(v) : setHead({ ...head, purchaseId: "" }))} placeholder={t("adm.grn.noPurchase")} options={openPos.map((p: any) => ({ value: p.id, label: `${p.number} · ${p.supplierName} · ${enumLabel("PurchaseStatus", p.status)}` }))} />
            <SelectField label={t("adm.f.supplier")} value={head.supplierId} onValue={(v) => setHead({ ...head, supplierId: v })} placeholder={t("adm.grn.otherSupplier")} options={(lookups.data?.suppliers ?? []).map((s: any) => ({ value: s.id, label: s.name }))} error={fe.supplierId} />
            {!head.supplierId && <TextField label={t("adm.grn.supplierName")} value={head.supplierName} onValue={(v) => setHead({ ...head, supplierName: v })} />}
            <div className="kit-form-grid">
              <TextField label={t("adm.inv.invoice")} value={head.invoiceNumber} onValue={(v) => setHead({ ...head, invoiceNumber: v })} />
              <TextField label={t("adm.grn.invoiceDate")} type="date" value={head.invoiceDate} onValue={(v) => setHead({ ...head, invoiceDate: v })} error={fe.invoiceDate} />
            </div>
            <TextArea label={t("common.note")} rows={2} value={head.note} onValue={(v) => setHead({ ...head, note: v })} />
          </Card>
          <Card title={t("adm.grn.summary")}>
            <dl className="kit-totals">
              <div><dt>{t("adm.inv.lines")}</dt><dd>{lines.length}</dd></div>
              <div><dt>{t("adm.grn.totalQty")}</dt><dd>{totals.qty}</dd></div>
              <div className="grand"><dt>{t("adm.grn.totalCost")}</dt><dd>{money({ amount: totals.cost.toFixed(2), currency: "AZN" })}</dd></div>
            </dl>
            <p className="text-sm text-muted mt-3">{t("adm.grn.postHint")}</p>
            <div className="grid gap-2 mt-3">
              <button type="button" className="btn primary" disabled={!!busy || !lines.length} onClick={() => save(true)}><PackagePlus size={16} /> {t("adm.grn.postNow")}</button>
              <button type="button" className="btn outline" disabled={!!busy || !lines.length} onClick={() => save(false)}>{t("adm.grn.saveDraft")}</button>
            </div>
          </Card>
        </div>
      </div>
      {creating !== null && <QuickProductDialog initial={creating} onClose={() => setCreating(null)} onCreated={(v) => { addVariant(v); setCreating(null); }} />}
      {pasting && <PasteLinesDialog onClose={() => setPasting(false)} onAdd={(ls) => { setLines([...lines, ...ls]); setPasting(false); }} />}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Yeni məhsulun qəbul zamanı yaradılması                               */
/* ------------------------------------------------------------------ */

/** EAN-13: 476 (Azərbaycan) prefiksi + təsadüfi rəqəmlər + yoxlama rəqəmi. */
export function generateEan13() {
  const digits = [4, 7, 6, ...Array.from({ length: 9 }, () => Math.floor(Math.random() * 10))];
  const sum = digits.reduce((s, d, i) => s + d * (i % 2 ? 3 : 1), 0);
  return [...digits, (10 - (sum % 10)) % 10].join("");
}

function QuickProductDialog({ initial, onClose, onCreated }: { initial: string; onClose: () => void; onCreated: (v: VariantHit) => void }) {
  const { t, text, enumLabel } = useI18n();
  const lookups = useLookups();
  const isCode = /^\d{8,14}$/.test(initial);
  const [v, setV] = useState({ nameI18n: { az: isCode ? "" : initial, ru: "", en: "" }, sku: "", barcode: isCode ? initial : "", brandId: "", categoryId: "", type: "PHYSICAL", baseUnit: "pcs", retailPrice: "", status: "ACTIVE" });
  const [images, setImages] = useState<{ dataUrl: string; name: string }[]>([]);
  const [error, setError] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const fe = error?.fieldErrors ?? {};
  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      const slug = `${v.nameI18n.az}-${v.sku}`.toLowerCase().replace(/ə/g, "e").replace(/ı/g, "i").replace(/ö/g, "o").replace(/ü/g, "u").replace(/ş/g, "s").replace(/ç/g, "c").replace(/ğ/g, "g").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const r = await post("/admin/products", { ...v, slug, barcode: v.barcode || undefined, retailPrice: v.retailPrice.replace(",", "."), images });
      const hits = await get<VariantHit[]>(`/admin/variants/search?q=${encodeURIComponent(v.sku)}&limit=5`);
      const hit = hits.find((h) => h.id === r.variantId);
      if (hit) onCreated({ ...hit, lastCost: { amount: "" } });
      toast.success(t("adm.grn.productCreated"));
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open onClose={onClose} size="lg" title={t("adm.grn.newProduct")} subtitle={t("adm.grn.newProductHint")} footer={<><button type="button" className="btn outline" onClick={onClose}>{t("common.cancel")}</button><button type="button" className="btn primary" disabled={busy} onClick={submit}>{t("adm.grn.createAndAdd")}</button></>}>
      <FormError error={error && !Object.keys(fe).length ? error : null} />
      <I18nInput label={t("adm.f.name")} required value={v.nameI18n} onChange={(x) => setV({ ...v, nameI18n: x })} error={fe.nameI18n} />
      <div className="kit-form-grid">
        <TextField label="SKU" required value={v.sku} onValue={(x) => setV({ ...v, sku: x.toUpperCase() })} error={fe.sku} />
        <div className="kit-field">
          <TextField label={t("adm.products.barcode")} inputMode="numeric" value={v.barcode} onValue={(x) => setV({ ...v, barcode: x.replace(/\D/g, "") })} error={fe.barcode} />
          <button type="button" className="btn ghost btn-sm" onClick={() => setV({ ...v, barcode: generateEan13() })}>{t("adm.pnew.generateBarcode")}</button>
        </div>
        <SelectField label={t("adm.f.category")} required value={v.categoryId} onValue={(x) => setV({ ...v, categoryId: x })} placeholder={t("common.choose")} options={categoryOptions(lookups.data?.categories ?? [], text)} error={fe.categoryId} />
        <SelectField label={t("adm.f.brand")} required value={v.brandId} onValue={(x) => setV({ ...v, brandId: x })} placeholder={t("common.choose")} options={(lookups.data?.brands ?? []).map((b: any) => ({ value: b.id, label: b.name }))} error={fe.brandId} />
        <SelectField label={t("adm.f.type")} value={v.type} onValue={(x) => setV({ ...v, type: x })} options={enumKeys("ProductType").map((x) => ({ value: x, label: enumLabel("ProductType", x) }))} />
        <SelectField label={t("adm.f.baseUnit")} value={v.baseUnit} onValue={(x) => setV({ ...v, baseUnit: x })} options={(lookups.data?.units ?? []).map((u: any) => ({ value: u.code, label: text(u.name) }))} />
        <TextField label={t("adm.f.retailPrice")} required inputMode="decimal" value={v.retailPrice} onValue={(x) => setV({ ...v, retailPrice: x })} error={fe.retailPrice} hint={t("adm.pnew.vatIncluded")} />
      </div>
      <div className="kit-field"><span className="kit-label">{t("adm.products.media")}</span><ImagePicker images={images} onChange={setImages} max={4} /></div>
    </Dialog>
  );
}

/** Kateqoriyaları iyerarxiya ilə göstərir: "Kondisionerlər › Split". */
export function categoryOptions(categories: any[], text: (v: unknown) => string) {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const path = (c: any): string => (c.parentId && byId.get(c.parentId) ? `${path(byId.get(c.parentId))} › ${text(c.name)}` : text(c.name));
  return categories.map((c) => ({ value: c.id, label: path(c) })).sort((a, b) => a.label.localeCompare(b.label, "az"));
}

function PasteLinesDialog({ onClose, onAdd }: { onClose: () => void; onAdd: (lines: Line[]) => void }) {
  const { t } = useI18n();
  const [raw, setRaw] = useState("");
  const [result, setResult] = useState<{ ok: Line[]; missing: string[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const parse = async () => {
    setBusy(true);
    const ok: Line[] = [];
    const missing: string[] = [];
    for (const row of raw.split(/\n+/).map((r) => r.trim()).filter(Boolean)) {
      const [code, quantity = "1", cost = ""] = row.split(/[;\t,]/).map((x) => x.trim());
      if (!code) continue;
      const hits = await get<VariantHit[]>(`/admin/variants/search?q=${encodeURIComponent(code)}&limit=3`);
      const hit = hits.find((h) => h.exact);
      if (hit) ok.push(newLine(hit, { quantity: quantity.replace(",", "."), unitCost: cost ? cost.replace(",", ".") : hit.lastCost.amount }));
      else missing.push(code);
    }
    setResult({ ok, missing });
    setBusy(false);
  };
  return (
    <Dialog open onClose={onClose} size="lg" title={t("adm.grn.paste")} footer={<><button type="button" className="btn outline" onClick={onClose}>{t("common.cancel")}</button>{result ? <button type="button" className="btn primary" disabled={!result.ok.length} onClick={() => onAdd(result.ok)}>{t("adm.grn.addLines", { count: result.ok.length })}</button> : <button type="button" className="btn primary" disabled={busy || !raw.trim()} onClick={parse}>{t("adm.grn.check")}</button>}</>}>
      <TextArea label={t("adm.grn.pasteLabel")} rows={8} value={raw} onValue={(v) => { setRaw(v); setResult(null); }} hint={t("adm.grn.pasteHint")} />
      {result && (
        <div className="kit-note text-sm">
          <strong>{t("adm.grn.pasteFound", { count: result.ok.length })}</strong>
          {result.missing.length > 0 && <p className="text-danger mt-1">{t("adm.grn.pasteMissing", { codes: result.missing.join(", ") })}</p>}
        </div>
      )}
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Detal                                                                */
/* ------------------------------------------------------------------ */

export function GoodsReceiptDetailPage({ id }: { id: string }) {
  const { t, text, dateTime, date, money, qty, enumLabel } = useI18n();
  const q = useApi<any>(`/admin/goods-receipts/${id}`);
  const refresh = useRefresh();
  const { can } = useSession();
  const canEdit = can("inventory:edit") || can("inventory:create");
  const openFile = (a: { url: string; mimeType: string }) => {
    // data URL yeni pəncərədə bloklanır — Blob ünvanı ilə açılır
    const [meta, b64] = a.url.split(",");
    const bytes = Uint8Array.from(atob(b64 ?? ""), (c) => c.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([bytes], { type: meta?.slice(5).split(";")[0] || a.mimeType }));
    window.open(url, "_blank", "noopener");
  };
  return (
    <QueryView query={q} rows={8}>
      {(r) => (
        <>
          <PageHeader
            back="/goods-receipts"
            title={r.number}
            badge={<EnumBadge group="GoodsReceiptStatus" code={r.status} />}
            subtitle={`${text(r.warehouseName)} · ${r.supplierDisplay ?? t("adm.grn.noSupplier")} · ${dateTime(r.createdAt)}`}
            actions={
              <>
                {r.status === "DRAFT" && canEdit && <Link to={`/goods-receipts/${r.id}/edit`} className="btn outline"><Pencil size={15} /> {t("common.edit")}</Link>}
                <button type="button" className="btn outline no-print" onClick={() => window.print()}><Printer size={15} /> {t("common.print")}</button>
                {canEdit && <ActionBar actions={r.availableActions} labelPrefix="adm.grn.actions" run={async (a, extra) => { await post(`/admin/goods-receipts/${r.id}/${a.code}`, { note: extra.note, reasonCode: extra.reasonCode }); await refresh(); }} />}
              </>
            }
          />
          {r.status === "DRAFT" && <div className="kit-note warning mb-4">{t("adm.grn.draftNote")}</div>}
          {r.cancelReason && <div className="kit-note danger mb-4">{t("common.reason")}: {r.cancelReason}</div>}
          <Grid cols={4}>
            <Stat label={t("adm.inv.lines")} value={r.lineCount} />
            <Stat label={t("adm.grn.totalQty")} value={r.itemCount} />
            <Stat label={t("adm.grn.totalCost")} value={money(r.total)} tone="success" />
            <Stat label={t("adm.grn.postedAt")} value={r.postedAt ? date(r.postedAt) : "—"} hint={r.postedBy ?? undefined} />
          </Grid>
          <div className="kit-stack">
            <Card title={t("adm.grn.items")} flush>
              <div className="table-wrap">
                <table className="grn-table">
                  <thead><tr><th>{t("adm.f.product")}</th><th className="num">{t("common.quantity")}</th><th className="num">{t("adm.f.unitCost")}</th><th className="num">{t("common.total")}</th><th>{t("adm.grn.details")}</th></tr></thead>
                  <tbody>
                    {r.lines.map((l: any) => (
                      <tr key={l.id}>
                        <td>
                          <div className="entity-row">
                            <ProductVisual kind={l.imageUrl} tone={l.imageTone} size="sm" />
                            <span>{l.productId ? <Link to={`/products/${l.productId}`} className="text-brand"><strong>{text(l.productName)}</strong></Link> : <strong>{text(l.productName)}</strong>}<small>{l.sku} · {enumLabel("StockPurpose", l.purpose)}</small></span>
                          </div>
                        </td>
                        <td className="num">{qty(l.quantity)}{l.unit !== l.baseQuantity.unit && <small className="block text-muted">= {qty(l.baseQuantity)}</small>}</td>
                        <td className="num">{money(l.unitCost)}</td>
                        <td className="num"><strong>{money(l.total)}</strong></td>
                        <td>
                          <small className="block">{[l.zone && `${t("adm.inv.zone")}: ${l.zone}`, l.lot && `LOT ${l.lot}`, l.expiryDate && `${t("adm.grn.expiry")}: ${date(l.expiryDate)}`].filter(Boolean).join(" · ") || "—"}</small>
                          {l.serials.length > 0 && <details><summary className="text-sm text-brand">{t("adm.grn.serialCount", { count: l.serials.length })}</summary><small className="block">{l.serials.join(", ")}</small></details>}
                          {l.movementNumber && <Link to={`/stock-movements?q=${l.movementNumber}`} className="text-sm text-brand">{l.movementNumber}</Link>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
            <Grid cols={2}>
              <Card title={t("adm.grn.header")}>
                <KeyValue cols={2} items={[
                  [t("adm.f.warehouse"), text(r.warehouseName)],
                  [t("adm.f.supplier"), r.supplierDisplay],
                  [t("adm.grn.purchaseOrder"), r.purchaseNumber ? <Link key="po" to="/purchases" className="text-brand">{r.purchaseNumber}</Link> : null],
                  [t("adm.inv.invoice"), r.invoiceNumber],
                  [t("adm.grn.invoiceDate"), r.invoiceDate ? date(r.invoiceDate) : null],
                  [t("adm.f.createdBy"), `${r.createdBy} · ${dateTime(r.createdAt)}`],
                  [t("common.note"), r.note],
                ]} />
              </Card>
              <Card title={t("adm.grn.documents")}>
                {!r.attachments.length ? <EmptyState icon={FileText} title={t("adm.grn.noDocuments")} /> : (
                  <ul className="grn-docs">
                    {r.attachments.map((a: any) => (
                      <li key={a.id}>
                        <button type="button" onClick={() => openFile(a)}>
                          {a.mimeType.startsWith("image/") ? <img src={a.url} alt={a.name} /> : <span className="kit-file-icon">PDF</span>}
                          <small>{a.name}</small>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </Grid>
          </div>
        </>
      )}
    </QueryView>
  );
}
