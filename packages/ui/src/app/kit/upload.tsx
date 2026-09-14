"use client";
import React, { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Camera, ImagePlus, Loader2, Star, Trash2, ZoomIn } from "lucide-react";
import { cn } from "@sp/utils";
import { useI18n } from "../core/i18n";
import { Avatar } from "./base";
import { Dialog } from "./actions";

/**
 * Şəkil yükləmə köməkçiləri: brauzerdə sıxma, kvadrat kəsmə (avatar/loqo) və məhsul qalereyası.
 * Fayllar data URL kimi API-yə göndərilir; real backend-də bu, imzalı yükləmə URL-i ilə əvəz olunur (PRD §66).
 */

export const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";

export function isImageUrl(url: string | null | undefined): url is string {
  return !!url && /^(data:image\/|https?:\/\/|blob:|\/)/.test(url);
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function readAsDataUrl(file: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/** Şəkli maksimum ölçüyə kiçildib JPEG/WebP kimi sıxır; PDF və digər fayllar olduğu kimi oxunur. */
export async function fileToDataUrl(file: File, opts: { maxDim?: number; quality?: number } = {}) {
  if (!file.type.startsWith("image/") || file.type === "image/gif" || file.type === "image/svg+xml") return readAsDataUrl(file);
  const original = await readAsDataUrl(file);
  const img = await loadImage(original);
  const maxDim = opts.maxDim ?? 1600;
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  // kiçik PNG-lər (loqo, şəffaf fon) olduğu kimi saxlanılır
  if (scale === 1 && file.type === "image/png" && file.size < 400_000) return original;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const g = canvas.getContext("2d");
  if (!g) return original;
  g.fillStyle = "#fff";
  g.fillRect(0, 0, canvas.width, canvas.height);
  g.drawImage(img, 0, 0, canvas.width, canvas.height);
  const out = canvas.toDataURL("image/jpeg", opts.quality ?? 0.85);
  return out.length < original.length ? out : original;
}

/** Faylın ölçü və tip yoxlaması — xəta mətni qaytarır. */
export function checkFile(file: File, t: (k: string, v?: Record<string, string | number>) => string, maxMb: number, accept = IMAGE_ACCEPT) {
  const types = accept.split(",").map((x) => x.trim());
  const okType = types.some((a) => (a.endsWith("/*") ? file.type.startsWith(a.slice(0, -1)) : file.type === a));
  if (!okType) return t("media.badType", { name: file.name });
  if (file.size > maxMb * 1024 * 1024) return t("media.tooLarge", { name: file.name, max: maxMb });
  return null;
}

/* ------------------------------------------------------------------ */
/* Kəsmə dialoqu                                                        */
/* ------------------------------------------------------------------ */

export function ImageCropDialog({ src, title, round = true, output = 400, onClose, onDone }: { src: string; title: string; round?: boolean; output?: number; onClose: () => void; onDone: (dataUrl: string) => Promise<unknown> | void }) {
  const { t } = useI18n();
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const VIEW = 280;
  useEffect(() => { void loadImage(src).then(setImg); }, [src]);
  // şəkil kəsmə sahəsini tam örtür; sürüşmə sərhəddən kənara çıxmır
  const base = img ? VIEW / Math.min(img.width, img.height) : 1;
  const w = img ? img.width * base * zoom : VIEW;
  const h = img ? img.height * base * zoom : VIEW;
  const clamp = (o: { x: number; y: number }) => ({ x: Math.max(-(w - VIEW) / 2, Math.min((w - VIEW) / 2, o.x)), y: Math.max(-(h - VIEW) / 2, Math.min((h - VIEW) / 2, o.y)) });
  const pos = clamp(offset);
  const save = async () => {
    if (!img) return;
    setBusy(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = output;
      canvas.height = output;
      const g = canvas.getContext("2d")!;
      g.fillStyle = "#fff";
      g.fillRect(0, 0, output, output);
      const k = output / VIEW;
      const left = (VIEW - w) / 2 + pos.x;
      const top = (VIEW - h) / 2 + pos.y;
      g.drawImage(img, left * k, top * k, w * k, h * k);
      await onDone(canvas.toDataURL("image/jpeg", 0.9));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open onClose={onClose} size="sm" title={title} footer={<><button type="button" className="btn outline" onClick={onClose}>{t("common.cancel")}</button><button type="button" className="btn primary" disabled={!img || busy} onClick={save}>{busy && <Loader2 size={14} className="kit-spin" />} {t("common.save")}</button></>}>
      <div
        className={cn("crop-view", round && "round")}
        style={{ width: VIEW, height: VIEW }}
        onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture(e.pointerId); drag.current = { x: e.clientX, y: e.clientY, ox: pos.x, oy: pos.y }; }}
        onPointerMove={(e) => { if (drag.current) setOffset(clamp({ x: drag.current.ox + e.clientX - drag.current.x, y: drag.current.oy + e.clientY - drag.current.y })); }}
        onPointerUp={() => (drag.current = null)}
        onKeyDown={(e) => {
          const step = e.shiftKey ? 20 : 5;
          const map: Record<string, [number, number]> = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
          const d = map[e.key];
          if (d) { e.preventDefault(); setOffset(clamp({ x: pos.x + d[0], y: pos.y + d[1] })); }
        }}
        tabIndex={0}
        role="application"
        aria-label={t("media.cropHint")}
      >
        {img && <img src={src} alt="" draggable={false} style={{ width: w, height: h, transform: `translate(${(VIEW - w) / 2 + pos.x}px, ${(VIEW - h) / 2 + pos.y}px)` }} />}
      </div>
      <label className="crop-zoom">
        <ZoomIn size={16} aria-hidden />
        <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} aria-label={t("media.zoom")} />
      </label>
      <p className="text-sm text-muted text-center">{t("media.cropHint")}</p>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Avatar / loqo yükləyici                                              */
/* ------------------------------------------------------------------ */

export function AvatarUploader({ src, name, tone, size = 112, square, onUpload, onRemove, disabled, title }: { src?: string | null; name: string; tone?: string; size?: number; square?: boolean; onUpload: (dataUrl: string) => Promise<unknown>; onRemove?: () => Promise<unknown>; disabled?: boolean; title?: string }) {
  const { t } = useI18n();
  const input = useRef<HTMLInputElement>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pick = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    const err = checkFile(file, t, 10);
    if (err) return setError(err);
    setPicked(await fileToDataUrl(file, { maxDim: 1200 }));
  };
  return (
    <div className="avatar-uploader">
      <div
        className={cn("avatar-drop", square && "square", !disabled && "editable")}
        style={{ width: size, height: size }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); if (!disabled) void pick(e.dataTransfer.files[0]); }}
      >
        {isImageUrl(src) ? <img src={src} alt={name} /> : <Avatar name={name} tone={tone} size={size} />}
        {!disabled && (
          <button type="button" className="avatar-cam" onClick={() => input.current?.click()} aria-label={src ? t("media.changePhoto") : t("media.uploadPhoto")}>
            <Camera size={16} />
          </button>
        )}
        {busy && <span className="avatar-busy"><Loader2 size={22} className="kit-spin" /></span>}
      </div>
      {!disabled && (
        <div className="avatar-actions">
          <button type="button" className="btn outline btn-sm" onClick={() => input.current?.click()}>{src ? t("media.changePhoto") : t("media.uploadPhoto")}</button>
          {src && onRemove && <button type="button" className="btn ghost btn-sm text-danger" disabled={busy} onClick={async () => { setBusy(true); try { await onRemove(); } finally { setBusy(false); } }}><Trash2 size={14} /> {t("common.remove")}</button>}
        </div>
      )}
      <small className="text-muted">{t("media.photoHint")}</small>
      {error && <p className="kit-field-error" role="alert">{error}</p>}
      <input ref={input} type="file" accept={IMAGE_ACCEPT} hidden onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ""; }} />
      {picked && (
        <ImageCropDialog
          src={picked}
          round={!square}
          title={title ?? t("media.cropTitle")}
          onClose={() => setPicked(null)}
          onDone={async (dataUrl) => {
            setBusy(true);
            try { await onUpload(dataUrl); setPicked(null); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
          }}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Məhsul qalereyası                                                    */
/* ------------------------------------------------------------------ */

export interface GalleryItem {
  id: string;
  url: string;
  name: string;
  primary: boolean;
  synthetic?: boolean;
  altI18n?: { az: string; ru: string; en: string } | null;
}

export function GalleryManager({ items, max = 12, onUpload, onPrimary, onDelete, onReorder, onAlt, renderFallback, disabled }: {
  items: GalleryItem[];
  max?: number;
  onUpload: (files: { dataUrl: string; name: string }[]) => Promise<unknown>;
  onPrimary: (id: string) => Promise<unknown>;
  onDelete: (id: string) => Promise<unknown>;
  onReorder: (ids: string[]) => Promise<unknown>;
  onAlt?: (item: GalleryItem) => void;
  renderFallback: (item: GalleryItem) => React.ReactNode;
  disabled?: boolean;
}) {
  const { t } = useI18n();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const real = items.filter((i) => !i.synthetic);
  const room = max - real.length;
  const add = async (list: FileList | File[] | null) => {
    if (!list) return;
    setError(null);
    const files = Array.from(list);
    if (files.length > room) { setError(t("media.tooMany", { max })); return; }
    const errs = files.map((f) => checkFile(f, t, 10)).filter(Boolean);
    if (errs.length) { setError(errs[0]!); return; }
    setBusy("upload");
    try {
      const payload = await Promise.all(files.map(async (f) => ({ name: f.name, dataUrl: await fileToDataUrl(f) })));
      await onUpload(payload);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };
  const run = async (key: string, fn: () => Promise<unknown>) => { setBusy(key); setError(null); try { await fn(); } catch (e) { setError((e as Error).message); } finally { setBusy(null); } };
  const move = (id: string, dir: -1 | 1) => {
    const ids = real.map((i) => i.id);
    const i = ids.indexOf(id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j]!, ids[i]!];
    void run(`move:${id}`, () => onReorder(ids));
  };
  return (
    <div className="gallery-manager">
      {items.some((i) => i.synthetic) && <p className="kit-note text-sm mb-3">{t("media.syntheticHint")}</p>}
      <ul className="gallery-grid">
        {items.map((item, idx) => (
          <li
            key={item.id}
            className={cn("gallery-item", item.primary && "primary", dragId === item.id && "dragging")}
            draggable={!item.synthetic && !disabled}
            onDragStart={() => setDragId(item.id)}
            onDragEnd={() => setDragId(null)}
            onDragOver={(e) => { if (dragId && !item.synthetic) e.preventDefault(); }}
            onDrop={(e) => {
              e.preventDefault();
              if (!dragId || dragId === item.id) return;
              const ids = real.map((i) => i.id).filter((x) => x !== dragId);
              ids.splice(ids.indexOf(item.id), 0, dragId);
              setDragId(null);
              void run("reorder", () => onReorder(ids));
            }}
          >
            <div className="gallery-thumb">{isImageUrl(item.url) ? <img src={item.url} alt={item.altI18n?.az ?? item.name} /> : renderFallback(item)}</div>
            {item.primary && <span className="gallery-badge"><Star size={11} /> {t("media.primary")}</span>}
            {!item.synthetic && !disabled && (
              <div className="gallery-tools">
                <button type="button" className="icon-button" disabled={idx === 0 || !!busy} onClick={() => move(item.id, -1)} aria-label={t("media.moveLeft")}><ArrowLeft size={14} /></button>
                <button type="button" className="icon-button" disabled={idx === real.length - 1 || !!busy} onClick={() => move(item.id, 1)} aria-label={t("media.moveRight")}><ArrowRight size={14} /></button>
                {!item.primary && <button type="button" className="icon-button" disabled={!!busy} onClick={() => run(`primary:${item.id}`, () => onPrimary(item.id))} aria-label={t("media.makePrimary")} title={t("media.makePrimary")}><Star size={14} /></button>}
                {onAlt && <button type="button" className="btn ghost btn-sm" onClick={() => onAlt(item)}>Alt</button>}
                <button type="button" className="icon-button text-danger" disabled={!!busy} onClick={() => run(`del:${item.id}`, () => onDelete(item.id))} aria-label={t("common.delete")}><Trash2 size={14} /></button>
              </div>
            )}
            <small className="gallery-name" title={item.name}>{item.name}</small>
          </li>
        ))}
        {!disabled && room > 0 && (
          <li className="gallery-item add">
            <button type="button" className="gallery-add" onClick={() => input.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); void add(e.dataTransfer.files); }} disabled={busy === "upload"}>
              {busy === "upload" ? <Loader2 size={26} className="kit-spin" /> : <ImagePlus size={26} />}
              <span>{t("media.addImages")}</span>
              <small>{t("media.limitsImages", { max: room })}</small>
            </button>
          </li>
        )}
      </ul>
      {error && <p className="kit-field-error" role="alert">{error}</p>}
      <input ref={input} type="file" accept={IMAGE_ACCEPT} multiple hidden onChange={(e) => { void add(e.target.files); e.target.value = ""; }} />
    </div>
  );
}

/** Yeni məhsul formunda serverə göndərilməmiş şəkillərin seçilməsi. */
export function ImagePicker({ images, onChange, max = 8 }: { images: { dataUrl: string; name: string }[]; onChange: (v: { dataUrl: string; name: string }[]) => void; max?: number }) {
  const items: GalleryItem[] = images.map((img, i) => ({ id: String(i), url: img.dataUrl, name: img.name, primary: i === 0 }));
  return (
    <GalleryManager
      items={items}
      max={max}
      renderFallback={() => null}
      onUpload={async (files) => onChange([...images, ...files])}
      onPrimary={async (id) => { const i = Number(id); onChange([images[i]!, ...images.filter((_, j) => j !== i)]); }}
      onDelete={async (id) => onChange(images.filter((_, j) => j !== Number(id)))}
      onReorder={async (ids) => onChange(ids.map((id) => images[Number(id)]!))}
    />
  );
}
