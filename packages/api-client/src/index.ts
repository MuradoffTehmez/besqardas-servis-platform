import { useMutation, useQuery, useQueryClient, type QueryKey, type UseQueryOptions } from "@tanstack/react-query";

/**
 * API client (PRD §65). Bütün data `/api/*` sorğuları ilə gəlir — backend gələndə yalnız mock layer söndürülür.
 * Xətalar vahid formatdadır: { code, message, fieldErrors }.
 */

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fieldErrors: Record<string, string[]> = {},
  ) {
    super(message);
  }
}

let currentLocale = "az";
export function setApiLocale(locale: string) {
  currentLocale = locale;
}

function detectLocale() {
  if (typeof window === "undefined") return currentLocale;
  const seg = window.location.pathname.split("/")[1];
  return seg === "ru" || seg === "en" || seg === "az" ? seg : currentLocale;
}

export async function apiFetch<T = any>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, headers, ...rest } = init;
  const res = await fetch(`/api${path}`, {
    credentials: "include",
    ...rest,
    headers: { "Content-Type": "application/json", "Accept-Language": detectLocale(), ...(headers as Record<string, string>) },
    ...(json !== undefined ? { body: JSON.stringify(json) } : {}),
  });
  if (res.status === 204) return undefined as T;
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) throw new ApiError(res.status, data?.code ?? "HTTP_" + res.status, data?.message ?? res.statusText, data?.fieldErrors ?? {});
  return data as T;
}

/** Köhnə demo görünüşləri üçün uyğunluq */
export const api = <T = any>(path: string, init?: RequestInit) => apiFetch<T>(path, init);

export const get = <T = any>(path: string) => apiFetch<T>(path);
export const post = <T = any>(path: string, json?: unknown) => apiFetch<T>(path, { method: "POST", json: json ?? {} });
export const patch = <T = any>(path: string, json?: unknown) => apiFetch<T>(path, { method: "PATCH", json: json ?? {} });
export const put = <T = any>(path: string, json?: unknown) => apiFetch<T>(path, { method: "PUT", json: json ?? {} });
export const del = <T = any>(path: string) => apiFetch<T>(path, { method: "DELETE" });

export function idempotencyKey() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

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

/** GET sorğusu — açar path-in özüdür, beləliklə invalidasiya sadədir. */
export function useApi<T = any>(path: string | null, options: Omit<UseQueryOptions<T, ApiError>, "queryKey" | "queryFn"> = {}) {
  return useQuery<T, ApiError>({
    queryKey: ["api", path] as QueryKey,
    queryFn: () => apiFetch<T>(path!),
    enabled: !!path && (options.enabled ?? true),
    retry: (count, err) => err.status >= 500 && count < 1,
    ...options,
  });
}

export function useApiMutation<TBody = any, TResult = any>(fn: (body: TBody) => Promise<TResult>, opts: { invalidate?: string[]; onSuccess?: (r: TResult) => void; onError?: (e: ApiError) => void } = {}) {
  const qc = useQueryClient();
  return useMutation<TResult, ApiError, TBody>({
    mutationFn: fn,
    onSuccess: async (r) => {
      if (opts.invalidate?.length) {
        await qc.invalidateQueries({ predicate: (q) => q.queryKey[0] === "api" && opts.invalidate!.some((p) => String(q.queryKey[1] ?? "").startsWith(p)) });
      }
      opts.onSuccess?.(r);
    },
    onError: opts.onError,
  });
}

export { useQueryClient, QueryClient, QueryClientProvider } from "@tanstack/react-query";
