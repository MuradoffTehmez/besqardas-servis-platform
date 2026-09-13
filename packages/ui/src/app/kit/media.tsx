"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Camera, FileUp, MapPin, Minus, Plus, Trash2, Upload } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { cn, formatAzPhone, normalizeAzPhone } from "@sp/utils";
import { useI18n } from "../core/i18n";
import { Field } from "./base";

/* ------------------------------------------------------------------ */
/* Məhsul illüstrasiyası (real şəkil yoxdur — mock media)               */
/* ------------------------------------------------------------------ */

const TONES: Record<string, [string, string]> = {
  sky: ["#e0f2fe", "#0284c7"], cyan: ["#cffafe", "#0891b2"], teal: ["#ccfbf1", "#0f766e"], indigo: ["#e0e7ff", "#4f46e5"],
  slate: ["#e2e8f0", "#334155"], zinc: ["#e4e4e7", "#3f3f46"], stone: ["#e7e5e4", "#57534e"], orange: ["#ffedd5", "#ea580c"],
  amber: ["#fef3c7", "#d97706"], rose: ["#ffe4e6", "#e11d48"], red: ["#fee2e2", "#dc2626"], emerald: ["#d1fae5", "#059669"],
  green: ["#dcfce7", "#16a34a"], blue: ["#dbeafe", "#2563eb"], violet: ["#ede9fe", "#7c3aed"], yellow: ["#fef9c3", "#ca8a04"],
  primary: ["#ccfbf1", "#0f766e"], pink: ["#fce7f3", "#db2777"], lime: ["#ecfccb", "#65a30d"],
};

export function ProductVisual({ kind, tone = "slate", label, className, size = "md" }: { kind?: string | null; tone?: string; label?: string; className?: string; size?: "sm" | "md" | "lg" }) {
  const k = (kind ?? "box").replace(/^illu:/, "").split(":")[0];
  const [bg, fg] = TONES[tone] ?? TONES.slate!;
  const shapes: Record<string, React.ReactNode> = {
    ac: (<><rect x="18" y="34" width="84" height="30" rx="8" fill="#fff" stroke={fg} strokeWidth="3" /><line x1="28" y1="54" x2="92" y2="54" stroke={fg} strokeWidth="2" opacity=".5" /><circle cx="88" cy="44" r="3" fill="#10b981" /><path d="M36 74c4 6 4 12 0 18M60 74c4 6 4 12 0 18M84 74c4 6 4 12 0 18" stroke={fg} strokeWidth="2.5" fill="none" strokeLinecap="round" opacity=".55" /></>),
    boiler: (<><rect x="34" y="18" width="52" height="76" rx="8" fill="#fff" stroke={fg} strokeWidth="3" /><rect x="44" y="30" width="32" height="14" rx="3" fill={bg} stroke={fg} strokeWidth="2" /><circle cx="60" cy="64" r="10" fill="none" stroke={fg} strokeWidth="3" /><path d="M60 58c4 4 3 9 0 12-3-3-4-8 0-12z" fill={fg} /><line x1="48" y1="94" x2="48" y2="104" stroke={fg} strokeWidth="3" /><line x1="72" y1="94" x2="72" y2="104" stroke={fg} strokeWidth="3" /></>),
    pipe: (<><circle cx="60" cy="60" r="34" fill="none" stroke={fg} strokeWidth="8" /><circle cx="60" cy="60" r="22" fill="none" stroke={fg} strokeWidth="6" opacity=".6" /><circle cx="60" cy="60" r="10" fill="none" stroke={fg} strokeWidth="4" opacity=".35" /></>),
    compressor: (<><rect x="32" y="30" width="56" height="62" rx="26" fill="#fff" stroke={fg} strokeWidth="3" /><rect x="50" y="18" width="20" height="14" rx="3" fill={fg} /><line x1="40" y1="60" x2="80" y2="60" stroke={fg} strokeWidth="2" opacity=".5" /><rect x="28" y="92" width="64" height="8" rx="3" fill={fg} opacity=".7" /></>),
    pump: (<><circle cx="52" cy="62" r="24" fill="#fff" stroke={fg} strokeWidth="3" /><rect x="74" y="50" width="30" height="24" rx="5" fill={bg} stroke={fg} strokeWidth="3" /><path d="M52 44v-18h22" stroke={fg} strokeWidth="5" fill="none" /><circle cx="52" cy="62" r="8" fill={fg} opacity=".6" /></>),
    gas: (<><rect x="40" y="30" width="40" height="70" rx="18" fill="#fff" stroke={fg} strokeWidth="3" /><rect x="52" y="16" width="16" height="14" rx="3" fill={fg} /><text x="60" y="72" textAnchor="middle" fontSize="14" fontWeight="800" fill={fg}>R32</text></>),
    filter: (<><rect x="24" y="30" width="72" height="56" rx="6" fill="#fff" stroke={fg} strokeWidth="3" />{[36, 48, 60, 72, 84].map((x) => <line key={x} x1={x} y1="36" x2={x} y2="80" stroke={fg} strokeWidth="2" opacity=".5" />)}</>),
    sensor: (<><rect x="30" y="54" width="44" height="14" rx="7" fill="#fff" stroke={fg} strokeWidth="3" /><path d="M74 61h24" stroke={fg} strokeWidth="3" /><circle cx="36" cy="61" r="3" fill={fg} /><path d="M98 61c6-10 6-20 0-30" stroke={fg} strokeWidth="2.5" fill="none" /></>),
    radiator: (<>{[28, 42, 56, 70, 84].map((x) => <rect key={x} x={x} y="28" width="10" height="64" rx="5" fill="#fff" stroke={fg} strokeWidth="2.5" />)}<line x1="22" y1="40" x2="100" y2="40" stroke={fg} strokeWidth="3" /><line x1="22" y1="80" x2="100" y2="80" stroke={fg} strokeWidth="3" /></>),
    board: (<><rect x="22" y="30" width="76" height="56" rx="4" fill="#fff" stroke={fg} strokeWidth="3" /><rect x="34" y="42" width="20" height="16" fill={bg} stroke={fg} strokeWidth="2" /><path d="M60 50h26M60 62h18M34 72h50" stroke={fg} strokeWidth="2" /></>),
    cable: (<><path d="M20 80c20-40 40 20 60-20s20-20 20-20" stroke={fg} strokeWidth="7" fill="none" strokeLinecap="round" /><circle cx="100" cy="40" r="6" fill={fg} /></>),
    fitting: (<><polygon points="60,26 88,42 88,74 60,90 32,74 32,42" fill="#fff" stroke={fg} strokeWidth="3" /><circle cx="60" cy="58" r="12" fill="none" stroke={fg} strokeWidth="4" /></>),
    fan: (<><circle cx="60" cy="60" r="36" fill="#fff" stroke={fg} strokeWidth="3" /><path d="M60 60c0-16 10-22 18-18-2 10-8 16-18 18zM60 60c14 8 14 20 6 24-6-8-8-16-6-24zM60 60c-14 8-24 2-24-6 10-4 18-2 24 6z" fill={fg} opacity=".7" /></>),
    box: (<><rect x="30" y="38" width="60" height="50" rx="4" fill="#fff" stroke={fg} strokeWidth="3" /><path d="M30 50h60M60 38v50" stroke={fg} strokeWidth="2" opacity=".5" /></>),
  };
  return (
    <div className={cn("kit-visual", `size-${size}`, className)} style={{ background: bg }} role="img" aria-label={label ?? k}>
      <svg viewBox="0 0 120 120" width="100%" height="100%" aria-hidden>
        {shapes[k!] ?? shapes.box}
      </svg>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Xəritə — provayderdən asılı olmayan adapter (PRD §59, Əlavə E)        */
/* ------------------------------------------------------------------ */

export interface MapPoint {
  id: string;
  lat: number;
  lng: number;
  label?: string;
  tone?: "brand" | "accent" | "danger" | "info" | "muted";
  onClick?: () => void;
}

function project(lat: number, lng: number, zoom: number) {
  const n = 2 ** zoom;
  const x = ((lng + 180) / 360) * n * 256;
  const latRad = (lat * Math.PI) / 180;
  const y = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n * 256;
  return { x, y };
}

function unproject(x: number, y: number, zoom: number) {
  const n = 2 ** zoom * 256;
  const lng = (x / n) * 360 - 180;
  const latRad = Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n)));
  return { lat: (latRad * 180) / Math.PI, lng };
}

/** OpenStreetMap plitələri ilə yüngül xəritə. Plitələr yüklənməsə, sxematik fon göstərilir. */
export function MapView({ points = [], center, zoom = 12, height = 320, onPick, polygons = [], className }: { points?: MapPoint[]; center?: { lat: number; lng: number }; zoom?: number; height?: number; onPick?: (p: { lat: number; lng: number }) => void; polygons?: { id: string; points: { lat: number; lng: number }[]; tone?: string }[]; className?: string }) {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver((e) => setWidth(e[0]!.contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  const c = center ?? (points.length ? { lat: points.reduce((s, p) => s + p.lat, 0) / points.length, lng: points.reduce((s, p) => s + p.lng, 0) / points.length } : { lat: 40.4093, lng: 49.8671 });
  const origin = project(c.lat, c.lng, zoom);
  const left = origin.x - width / 2;
  const top = origin.y - height / 2;
  const tiles = useMemo(() => {
    const out: { key: string; x: number; y: number; url: string }[] = [];
    const n = 2 ** zoom;
    for (let tx = Math.floor(left / 256); tx <= Math.floor((left + width) / 256); tx++) {
      for (let ty = Math.floor(top / 256); ty <= Math.floor((top + height) / 256); ty++) {
        if (ty < 0 || ty >= n) continue;
        const wx = ((tx % n) + n) % n;
        out.push({ key: `${tx}-${ty}`, x: tx * 256 - left, y: ty * 256 - top, url: `https://tile.openstreetmap.org/${zoom}/${wx}/${ty}.png` });
      }
    }
    return out;
  }, [left, top, width, height, zoom]);
  return (
    <div ref={ref} className={cn("kit-map", onPick && "pickable", className)} style={{ height }} onClick={(e) => { if (!onPick) return; const r = e.currentTarget.getBoundingClientRect(); onPick(unproject(left + e.clientX - r.left, top + e.clientY - r.top, zoom)); }} role={onPick ? "button" : "img"} aria-label={onPick ? t("map.pick") : t("map.label")}>
      {tiles.map((tile) => (
        <img key={tile.key} src={tile.url} alt="" className="kit-map-tile" style={{ left: tile.x, top: tile.y }} draggable={false} onError={(e) => ((e.target as HTMLImageElement).style.visibility = "hidden")} />
      ))}
      <svg className="kit-map-overlay" width={width} height={height} aria-hidden>
        {polygons.map((poly) => (
          <polygon key={poly.id} points={poly.points.map((p) => { const q = project(p.lat, p.lng, zoom); return `${q.x - left},${q.y - top}`; }).join(" ")} className={cn("kit-map-poly", poly.tone && `tone-${poly.tone}`)} />
        ))}
      </svg>
      {points.map((p) => {
        const q = project(p.lat, p.lng, zoom);
        return (
          <button key={p.id} type="button" className={cn("kit-map-pin", `tone-${p.tone ?? "brand"}`)} style={{ left: q.x - left, top: q.y - top }} onClick={(e) => { e.stopPropagation(); p.onClick?.(); }} title={p.label} aria-label={p.label}>
            <MapPin size={22} />
            {p.label && <span className="kit-map-label">{p.label}</span>}
          </button>
        );
      })}
      <span className="kit-map-attr">© OpenStreetMap</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* İmza, fayl, OTP, telefon, miqdar                                     */
/* ------------------------------------------------------------------ */

export function SignaturePad({ onChange, signed }: { onChange: (signed: boolean) => void; signed?: boolean }) {
  const { t } = useI18n();
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasInk, setHasInk] = useState(!!signed);
  const pos = (e: React.PointerEvent) => {
    const r = canvas.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * canvas.current!.width, y: ((e.clientY - r.top) / r.height) * canvas.current!.height };
  };
  return (
    <div className="kit-signature">
      <canvas
        ref={canvas}
        width={600}
        height={180}
        aria-label={t("media.signatureArea")}
        onPointerDown={(e) => { drawing.current = true; const ctx = canvas.current!.getContext("2d")!; const p = pos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); canvas.current!.setPointerCapture(e.pointerId); }}
        onPointerMove={(e) => { if (!drawing.current) return; const ctx = canvas.current!.getContext("2d")!; ctx.lineWidth = 3; ctx.lineCap = "round"; ctx.strokeStyle = "#0f172a"; const p = pos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); if (!hasInk) { setHasInk(true); onChange(true); } }}
        onPointerUp={() => (drawing.current = false)}
      />
      <div className="flex justify-between items-center mt-2">
        <span className="text-sm text-muted">{hasInk ? t("media.signed") : t("media.signHere")}</span>
        <button type="button" className="btn btn-sm ghost" onClick={() => { canvas.current!.getContext("2d")!.clearRect(0, 0, 600, 180); setHasInk(false); onChange(false); }}>
          {t("common.clear")}
        </button>
      </div>
    </div>
  );
}

export interface PickedFile {
  name: string;
  size: number;
  mimeType: string;
  preview?: string;
}

/** Drag & drop yükləmə (PRD §33). Real storage yoxdur — fayl metadata-sı API-yə göndərilir. */
export function FileDrop({ files, onChange, accept = "image/*,application/pdf", maxSizeMb = 10, max = 8, label, capture }: { files: PickedFile[]; onChange: (f: PickedFile[]) => void; accept?: string; maxSizeMb?: number; max?: number; label?: string; capture?: boolean }) {
  const { t } = useI18n();
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const add = (list: FileList | null) => {
    if (!list) return;
    const next = [...files];
    for (const f of Array.from(list)) {
      if (next.length >= max) { setError(t("media.tooMany", { max })); break; }
      if (f.size > maxSizeMb * 1024 * 1024) { setError(t("media.tooLarge", { name: f.name, max: maxSizeMb })); continue; }
      const okType = accept.split(",").some((a) => (a.endsWith("/*") ? f.type.startsWith(a.slice(0, -1)) : f.type === a.trim()));
      if (!okType) { setError(t("media.badType", { name: f.name })); continue; }
      next.push({ name: f.name, size: f.size, mimeType: f.type, preview: f.type.startsWith("image/") ? URL.createObjectURL(f) : undefined });
    }
    setProgress(0);
    const timer = setInterval(() => setProgress((p) => { if (p === null || p >= 100) { clearInterval(timer); return null; } return p + 25; }), 80);
    onChange(next);
  };
  return (
    <div>
      <div className="kit-drop" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); setError(null); add(e.dataTransfer.files); }}>
        <Upload size={22} aria-hidden />
        <p>{label ?? t("media.dropHere")}</p>
        <div className="flex gap-2 flex-wrap justify-center">
          <button type="button" className="btn outline btn-sm" onClick={() => input.current?.click()}>
            <FileUp size={14} /> {t("media.choose")}
          </button>
          {capture && (
            <label className="btn outline btn-sm">
              <Camera size={14} /> {t("media.camera")}
              <input type="file" accept="image/*" capture="environment" hidden onChange={(e) => add(e.target.files)} />
            </label>
          )}
        </div>
        <input ref={input} type="file" accept={accept} multiple hidden onChange={(e) => { setError(null); add(e.target.files); }} />
        <small className="text-muted">{t("media.limits", { size: maxSizeMb, max })}</small>
      </div>
      {progress !== null && <div className="kit-progress" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${progress}%` }} /></div>}
      {error && <p className="kit-field-error" role="alert">{error}</p>}
      {files.length > 0 && (
        <ul className="kit-files">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`}>
              {f.preview ? <img src={f.preview} alt="" /> : <span className="kit-file-icon">PDF</span>}
              <span className="flex-1">{f.name}<small className="block text-muted">{Math.round(f.size / 1024)} KB</small></span>
              {i === 0 && files.length > 1 && <span className="badge badge-info">{t("media.primary")}</span>}
              <button type="button" className="icon-button" aria-label={t("common.remove")} onClick={() => onChange(files.filter((_, j) => j !== i))}>
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function OtpInput({ value, onChange, length = 6, autoFocus }: { value: string; onChange: (v: string) => void; length?: number; autoFocus?: boolean }) {
  const { t } = useI18n();
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  return (
    <div className="kit-otp" role="group" aria-label={t("auth.otpCode")}>
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={length}
          autoFocus={autoFocus && i === 0}
          aria-label={t("auth.otpDigit", { n: i + 1 })}
          value={value[i] ?? ""}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, "");
            if (digits.length > 1) { onChange(digits.slice(0, length)); refs.current[Math.min(digits.length, length) - 1]?.focus(); return; }
            const next = (value.slice(0, i) + digits + value.slice(i + 1)).slice(0, length);
            onChange(next);
            if (digits && i < length - 1) refs.current[i + 1]?.focus();
          }}
          onKeyDown={(e) => { if (e.key === "Backspace" && !value[i] && i > 0) refs.current[i - 1]?.focus(); }}
        />
      ))}
    </div>
  );
}

/** +994 formatında maskalı telefon (PRD §62). */
export function PhoneField({ label, value, onValue, error, required, hint }: { label?: React.ReactNode; value: string; onValue: (normalized: string) => void; error?: string | string[] | null; required?: boolean; hint?: React.ReactNode }) {
  const [display, setDisplay] = useState(value ? formatAzPhone(value) : "+994 ");
  useEffect(() => { if (value && normalizeAzPhone(display) !== value) setDisplay(formatAzPhone(value)); }, [value]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Field label={label} error={error} required={required} hint={hint}>
      {(id, d) => <input id={id} aria-describedby={d} type="tel" inputMode="tel" autoComplete="tel" className={cn("form-input", error && "input-error")} value={display} placeholder="+994 (50) 123-45-67" onChange={(e) => { const f = formatAzPhone(e.target.value); setDisplay(f); onValue(normalizeAzPhone(f)); }} />}
    </Field>
  );
}

/** Vahid seçimi ilə miqdar (PRD §31.1) — çevirmə backend-dədir, burada yalnız daxiletmə. */
export function QuantityInput({ value, onValue, unit, units, onUnit, min = 1, step = 1, label }: { value: string; onValue: (v: string) => void; unit?: string; units?: string[]; onUnit?: (u: string) => void; min?: number; step?: number; label?: string }) {
  const { t, unit: unitLabel } = useI18n();
  const n = Number(value) || 0;
  return (
    <div className="kit-qty" role="group" aria-label={label ?? t("common.quantity")}>
      <button type="button" className="icon-button" aria-label={t("common.decrease")} disabled={n - step < min} onClick={() => onValue(String(+(n - step).toFixed(3)))}>
        <Minus size={14} />
      </button>
      <input type="number" inputMode="decimal" min={min} step={step} value={value} aria-label={label ?? t("common.quantity")} onChange={(e) => onValue(e.target.value)} />
      <button type="button" className="icon-button" aria-label={t("common.increase")} onClick={() => onValue(String(+(n + step).toFixed(3)))}>
        <Plus size={14} />
      </button>
      {units && units.length > 1 && onUnit ? (
        <select className="form-input" value={unit} onChange={(e) => onUnit(e.target.value)} aria-label={t("common.unit")}>
          {units.map((u) => <option key={u} value={u}>{unitLabel(u)}</option>)}
        </select>
      ) : unit ? (
        <span className="kit-qty-unit">{unitLabel(unit)}</span>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Qrafiklər                                                            */
/* ------------------------------------------------------------------ */

const CHART_COLORS = ["#0f766e", "#f59e0b", "#3b82f6", "#e11d48", "#7c3aed", "#059669", "#64748b"];

export function ChartBox({ height = 260, children }: { height?: number; children: React.ReactElement }) {
  return (
    <div className="kit-chart" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}

export function BarsChart({ data, xKey, bars, height, stacked }: { data: Record<string, unknown>[]; xKey: string; bars: { key: string; label: string }[]; height?: number; stacked?: boolean }) {
  return (
    <ChartBox height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey={xKey} tick={{ fontSize: 11 }} tickLine={false} />
        <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <Tooltip />
        {bars.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
        {bars.map((b, i) => <Bar key={b.key} dataKey={b.key} name={b.label} fill={CHART_COLORS[i % CHART_COLORS.length]} radius={stacked ? 0 : [4, 4, 0, 0]} stackId={stacked ? "s" : undefined} />)}
      </BarChart>
    </ChartBox>
  );
}

export function LinesChart({ data, xKey, lines, height, area }: { data: Record<string, unknown>[]; xKey: string; lines: { key: string; label: string }[]; height?: number; area?: boolean }) {
  return (
    <ChartBox height={height}>
      {area ? (
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey={xKey} tick={{ fontSize: 11 }} tickLine={false} />
          <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
          <Tooltip />
          {lines.map((l, i) => <Area key={l.key} type="monotone" dataKey={l.key} name={l.label} stroke={CHART_COLORS[i]} fill={CHART_COLORS[i]} fillOpacity={0.15} strokeWidth={2} />)}
        </AreaChart>
      ) : (
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey={xKey} tick={{ fontSize: 11 }} tickLine={false} />
          <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {lines.map((l, i) => <Line key={l.key} type="monotone" dataKey={l.key} name={l.label} stroke={CHART_COLORS[i]} strokeWidth={2} dot={false} />)}
        </LineChart>
      )}
    </ChartBox>
  );
}

export function DonutChart({ data, height = 240 }: { data: { name: string; value: number }[]; height?: number }) {
  return (
    <ChartBox height={height}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="80%" paddingAngle={2}>
          {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
        </Pie>
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ChartBox>
  );
}
