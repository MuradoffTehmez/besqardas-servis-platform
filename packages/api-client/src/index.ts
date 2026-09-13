export async function api<T = any>(path: string, init?: RequestInit): Promise<T> {
  const locale = typeof window === 'undefined' ? 'az' : window.location.pathname.split('/')[1] || 'az';
  const res = await fetch(`/api${path}`, { ...init, headers: { 'Content-Type': 'application/json', 'Accept-Language':locale, ...init?.headers } });
  if(res.status === 204) return undefined as T;
  const data = await res.json();
  if(!res.ok) throw new Error(data.message || 'Sorğu yerinə yetirilmədi');
  return data;
}
