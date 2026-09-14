/** Sorğu parametrlərini vahid formatda qurur (PRD §65.2). Server və brauzer eyni sətri almalıdır — cache açarı budur. */
export function qs(params: Record<string, unknown> | undefined) {
  if (!params) return "";
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "" || (Array.isArray(v) && !v.length)) continue;
    sp.set(k, Array.isArray(v) ? v.join(",") : String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}
