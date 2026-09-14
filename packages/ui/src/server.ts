import { cache } from "react";
import { QueryClient, dehydrate, type DehydratedState } from "@tanstack/react-query";
import { loadMessages, lookup, type AppLocale } from "@sp/i18n";
import { qs, serverGet } from "@sp/api-client/server";

/**
 * Public saytın server tərəfi (PRD §72): route-a görə API datasını əvvəlcədən yükləyir, TanStack Query
 * cache-ini brauzerə ötürür (məzmun HTML-də gəlir), metadata, canonical/hreflang, JSON-LD və indeksləmə
 * qaydalarını qurur. Səhifə komponentləri eyni `["api", path]` açarları ilə datanı cache-dən oxuyur.
 */

import { DEFAULT_LOCALE, LOCALES, isLocale } from "./locale";

export { DEFAULT_LOCALE, LOCALES, isLocale, pickLocale } from "./locale";
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://besqardasservis.az").replace(/\/+$/, "");

export interface PageRequest {
  locale: AppLocale;
  /** Dil prefiksi olmadan, məs. `/shop/kondisionerler` */
  path: string;
  /** `?` ilə başlayan və ya boş sətir */
  search: string;
  localized: boolean;
}

type SearchParams = Record<string, string | string[] | undefined>;

/** Next.js catch-all parametrlərindən dil, yol və sorğu sətrini çıxarır (brauzer router-i ilə eyni qayda). */
export function pageRequest(segments: string[] | undefined, searchParams: SearchParams = {}): PageRequest {
  const parts = (segments ?? []).map((s) => decodeURIComponent(s));
  const localized = isLocale(parts[0]);
  const locale = localized ? (parts[0] as AppLocale) : DEFAULT_LOCALE;
  const rest = localized ? parts.slice(1) : parts;
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(searchParams)) {
    if (Array.isArray(v)) v.forEach((x) => sp.append(k, x));
    else if (v !== undefined) sp.append(k, v);
  }
  const s = sp.toString();
  const path = ("/" + rest.filter(Boolean).map(encodeURIComponent).join("/")).replace(/\/+$/, "") || "/";
  return { locale, path, search: s ? `?${s}` : "", localized };
}

export interface PreparedPage {
  status: 200 | 404;
  title: string;
  /** true olduqda başlıq şablonsuz (sayt adı əlavə edilmədən) istifadə olunur */
  absoluteTitle: boolean;
  description: string | null;
  noindex: boolean;
  /** Dil prefiksi olmadan canonical yol (sorğu sətri daxil ola bilər) */
  canonicalPath: string;
  image: string | null;
  ogType: "website" | "article";
  jsonLd: Record<string, unknown>[];
  state: DehydratedState;
}

/** Kabinetlər, panellər, auth və tranzaksiya səhifələri indekslənmir (§72). */
const PRIVATE_PREFIXES = ["/account", "/technician", "/corporate", "/partner", "/wholesale", "/courier", "/login", "/register", "/forgot-password", "/reset-password", "/verify", "/2fa", "/select-mode", "/cart", "/checkout", "/compare", "/search", "/demo", "/403", "/500", "/maintenance", "/warranty/verify/"];

const PRIVATE_TITLES: [string, string][] = [
  ["/login", "auth.loginTitle"], ["/register", "auth.registerTitle"], ["/forgot-password", "auth.forgotTitle"], ["/reset-password", "auth.resetTitle"], ["/verify", "auth.verifyTitle"],
  ["/2fa", "auth.twoFactorTitle"], ["/select-mode", "auth.selectModeTitle"], ["/cart", "cart.title"], ["/checkout", "checkout.title"], ["/compare", "compare.title"], ["/search", "search.title"],
  ["/demo", "demo.title"], ["/account", "acc.title"], ["/technician", "tech.title"], ["/corporate", "b2b.corporate"], ["/partner", "b2b.partner"], ["/wholesale", "b2b.wholesale"],
  ["/courier", "courier.title"], ["/warranty/verify", "warrantyVerify.title"], ["/services", "booking.title"],
];

function isPrivate(path: string) {
  return PRIVATE_PREFIXES.some((p) => (p.endsWith("/") ? path.startsWith(p) : path === p || path.startsWith(`${p}/`))) || /^\/services\/[^/]+\/book$/.test(path);
}

/** Brauzer router-indəki `matchRoute` ilə eyni sadə uyğunlaşdırma (server modulunda client kodu import olunmur). */
function match(pattern: string, path: string): Record<string, string> | null {
  const p = pattern.split("/").filter(Boolean);
  const s = path.split("/").filter(Boolean);
  const params: Record<string, string> = {};
  for (let i = 0; i < p.length; i++) {
    if (p[i] === "*") { params["*"] = s.slice(i).join("/"); return params; }
    if (s[i] === undefined) return null;
    if (p[i]!.startsWith(":")) params[p[i]!.slice(1)] = decodeURIComponent(s[i]!);
    else if (p[i] !== s[i]) return null;
  }
  return p.length === s.length ? params : null;
}

/** Tətbiqdə mövcud olan bütün web route-ları — tanınmayan yol 404 statusu alır. */
const KNOWN_PATTERNS = [
  "/", "/services", "/services/:slug", "/services/:slug/book", "/shop", "/shop/*", "/product/:slug", "/search", "/compare", "/cart", "/checkout", "/checkout/pay", "/checkout/result",
  "/technicians", "/technicians/:id", "/pricing", "/warranty/verify", "/warranty/verify/:code", "/branches", "/about", "/terms", "/privacy", "/faq", "/contact", "/become-technician", "/business", "/demo",
  "/login", "/register", "/forgot-password", "/reset-password", "/verify", "/2fa", "/select-mode", "/403", "/500", "/maintenance",
  "/account", "/account/*", "/technician", "/technician/*", "/corporate", "/corporate/*", "/partner", "/partner/*", "/wholesale", "/wholesale/*", "/courier", "/courier/*",
];

const clip = (s: unknown, n = 160) => {
  const v = typeof s === "string" ? s.replace(/\s+/g, " ").trim() : "";
  return v.length > n ? `${v.slice(0, n - 1).trimEnd()}…` : v || null;
};

function breadcrumbs(locale: AppLocale, items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: `${SITE_URL}/${locale}${it.path === "/" ? "" : it.path}` })),
  };
}

async function prepare(locale: AppLocale, path: string, search: string, cookie: string): Promise<PreparedPage> {
  const messages = loadMessages(locale);
  const t = (key: string, vars?: Record<string, string | number>) => {
    let s = lookup(messages, key) ?? key;
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
    return s;
  };
  const qc = new QueryClient();
  const load = async <T = any>(p: string): Promise<T | null | undefined> => {
    const data = await serverGet<T>(p, { locale, cookie });
    if (data !== null && data !== undefined) qc.setQueryData(["api", p], data);
    return data;
  };
  const query = new URLSearchParams(search);
  const siteName = t("seo.siteName");
  const page: Omit<PreparedPage, "state"> = {
    status: 200,
    title: siteName,
    absoluteTitle: false,
    description: t("seo.homeDescription"),
    noindex: isPrivate(path),
    canonicalPath: path,
    image: null,
    ogType: "website",
    jsonLd: [],
  };
  const home = { name: t("home"), path: "/" };
  const common = Promise.all([load("/auth/session"), load("/branding")]);
  const known = KNOWN_PATTERNS.some((p) => match(p, path));
  if (!known) page.status = 404;

  let params: Record<string, string> | null;
  if (path === "/") {
    page.title = t("seo.homeTitle");
    page.absoluteTitle = true;
    await Promise.all([load("/home"), load("/equipment-categories")]);
    page.jsonLd.push({ "@context": "https://schema.org", "@type": "WebSite", name: siteName, url: `${SITE_URL}/${locale}`, inLanguage: locale, potentialAction: { "@type": "SearchAction", target: `${SITE_URL}/${locale}/search?q={search_term_string}`, "query-input": "required name=search_term_string" } });
  } else if (path === "/services") {
    page.title = t("services");
    page.description = t("seo.servicesDescription");
    await Promise.all([load("/services?pageSize=100"), load("/equipment-categories")]);
    if (query.has("category")) page.noindex = true;
  } else if ((params = match("/services/:slug", path))) {
    const s = await load<any>(`/services/${params.slug}`);
    if (s === null) page.status = 404;
    else if (s) {
      await load(`/services/${s.id}/fees`);
      // Admin paneldə yazılmış SEO başlığı sayt adını artıq ehtiva edir
      page.title = s.seoTitle || t("seo.serviceTitle", { name: s.name });
      page.absoluteTitle = !!s.seoTitle;
      page.description = clip(s.seoDescription || s.shortDescription || s.description);
      page.jsonLd.push(breadcrumbs(locale, [home, { name: t("services"), path: "/services" }, { name: s.name, path }]));
    }
  } else if (path === "/shop" || (params = match("/shop/*", path))) {
    const categoryPath = path === "/shop" ? undefined : path.slice("/shop/".length).split("/").map(decodeURIComponent).join("/");
    const listUrl = `/products${qs({ ...Object.fromEntries(query.entries()), category: categoryPath, pageSize: 24 })}`;
    const [, list] = await Promise.all([load("/categories"), load<any>(listUrl)]);
    const crumbs: { name: string; path: string }[] = (list?.breadcrumbs ?? []).map((b: any) => ({ name: b.name, path: b.href }));
    const current = list?.category;
    if (categoryPath && list === null) page.status = 404;
    page.title = current?.name ? t("seo.categoryTitle", { name: current.name }) : t("nav.shop");
    page.description = t("seo.shopDescription");
    page.jsonLd.push(breadcrumbs(locale, [home, { name: t("nav.shop"), path: "/shop" }, ...crumbs]));
    // Filtr və sıralama kombinasiyaları indekslənmir; səhifələmə canonical-da qalır (§72)
    const filtered = [...query.keys()].some((k) => k !== "page");
    if (filtered) page.noindex = true;
    const pageNo = query.get("page");
    page.canonicalPath = pageNo && pageNo !== "1" ? `${path}?page=${encodeURIComponent(pageNo)}` : path;
  } else if ((params = match("/product/:slug", path))) {
    const p = await load<any>(`/products/${params.slug}`);
    if (p === null) page.status = 404;
    else if (p) {
      page.title = t("seo.productTitle", { name: p.name });
      page.description = clip(p.shortDescription || p.description);
      page.ogType = "article";
      const img = p.images?.find((i: any) => /^https?:\/\//.test(i.url ?? ""))?.url ?? (/^https?:\/\//.test(p.imageUrl ?? "") ? p.imageUrl : null);
      page.image = img;
      page.canonicalPath = path; // variant parametri canonical-a daxil edilmir
      page.jsonLd.push(breadcrumbs(locale, [home, { name: t("nav.shop"), path: "/shop" }, ...(p.categoryPath?.length ? [{ name: p.categoryName, path: `/shop/${p.categoryPath.join("/")}` }] : []), { name: p.name, path }]));
    }
  } else if (path === "/technicians") {
    page.title = t("technicians");
    page.description = t("seo.techniciansDescription");
    await Promise.all([load("/specializations"), load(`/technicians${qs({ q: query.get("q"), pageSize: 30, sort: query.get("sort") })}`)]);
    if (query.has("q") || query.has("sort")) page.noindex = true;
  } else if ((params = match("/technicians/:id", path))) {
    const [tech] = await Promise.all([load<any>(`/technicians/${params.id}`), load("/services?pageSize=100")]);
    if (tech === null) page.status = 404;
    else if (tech) {
      page.title = t("seo.technicianTitle", { name: tech.fullName });
      page.description = clip(t("seo.technicianDescription", { name: tech.fullName, specs: (tech.specializations ?? []).slice(0, 3).map((s: any) => (typeof s === "string" ? s : s.name)).join(", "), rating: tech.rating ?? "—", jobs: tech.completedJobs ?? 0 }));
      page.ogType = "article";
      page.image = /^https?:\/\//.test(tech.avatarUrl ?? "") ? tech.avatarUrl : null;
      page.jsonLd.push(breadcrumbs(locale, [home, { name: t("technicians"), path: "/technicians" }, { name: tech.fullName, path }]));
    }
  } else if (path === "/pricing") {
    page.title = t("nav.pricing");
    page.description = t("seo.pricingDescription");
    await Promise.all([load(`/plans?group=${query.get("group") ?? "CUSTOMER"}`), load("/entitlement-definitions")]);
  } else if (path === "/branches") {
    page.title = t("nav.branches");
    page.description = t("seo.branchesDescription");
    await load("/branches");
  } else if (path === "/about" || path === "/terms" || path === "/privacy") {
    const c = await load<any>(`/content/pages${path}`);
    page.title = c?.title ?? t(path === "/about" ? "about" : `legal.${path.slice(1)}`);
    page.description = clip(c?.body);
    page.ogType = "article";
  } else if (path === "/faq") {
    page.title = t("faqPage.title");
    page.description = t("seo.faqDescription");
    await load(`/faq${qs({ q: query.get("q"), pageSize: 100 })}`);
    if (query.has("q")) page.noindex = true;
  } else if (path === "/contact") {
    page.title = t("contact");
    page.description = t("seo.contactDescription");
  } else if (path === "/become-technician") {
    page.title = t("techApply.title");
    page.description = t("seo.becomeTechnicianDescription");
  } else if (path === "/business") {
    page.title = t("b2bApply.title");
    page.description = t("seo.businessDescription");
  } else if (path === "/warranty/verify") {
    page.title = t("warrantyVerify.title");
    page.description = t("seo.warrantyDescription");
  }
  await common;
  if (page.noindex && page.title === siteName) {
    // İndekslənməyən səhifələrdə yalnız brauzer sekmesi üçün başlıq (kabinet, auth, səbət və s.)
    const titled = PRIVATE_TITLES.find(([p]) => path === p || path.startsWith(`${p}/`));
    if (titled) page.title = t(titled[1]);
    page.description = null;
  }
  if (page.status === 404) page.noindex = true;
  return { ...page, state: dehydrate(qc) };
}

/** Eyni sorğuda `generateMetadata` və səhifə komponenti datanı bir dəfə yükləyir. */
export const preparePage = cache((locale: AppLocale, path: string, search: string, cookie: string) => prepare(locale, path, search, cookie));

/** hreflang üçün dil variantları (x-default AZ versiyasıdır, §62). */
export function languageAlternates(canonicalPath: string) {
  const suffix = canonicalPath === "/" ? "" : canonicalPath;
  return { ...Object.fromEntries(LOCALES.map((l) => [l, `${SITE_URL}/${l}${suffix}`])), "x-default": `${SITE_URL}/${DEFAULT_LOCALE}${suffix}` };
}

/** Sitemap üçün public URL-lər (§72): statik səhifələr, xidmətlər, kateqoriyalar, məhsullar və ustalar. */
export async function sitemapEntries(): Promise<{ path: string; lastModified?: string; changeFrequency: "daily" | "weekly" | "monthly"; priority: number }[]> {
  const opts = { locale: DEFAULT_LOCALE, timeoutMs: 5000 };
  const entries: Awaited<ReturnType<typeof sitemapEntries>> = [
    { path: "/", changeFrequency: "daily", priority: 1 },
    ...["/services", "/shop", "/technicians"].map((path) => ({ path, changeFrequency: "daily" as const, priority: 0.9 })),
    ...["/pricing", "/branches", "/faq", "/contact", "/become-technician", "/business", "/warranty/verify"].map((path) => ({ path, changeFrequency: "monthly" as const, priority: 0.6 })),
    ...["/about", "/terms", "/privacy"].map((path) => ({ path, changeFrequency: "monthly" as const, priority: 0.3 })),
  ];
  const [services, categories, technicians] = await Promise.all([
    serverGet<any>("/services?pageSize=100", opts),
    serverGet<any[]>("/categories", opts),
    serverGet<any>("/technicians?pageSize=60", opts),
  ]);
  for (const s of services?.items ?? []) entries.push({ path: `/services/${s.slug}`, changeFrequency: "weekly", priority: 0.8 });
  for (const c of categories ?? []) if (c.active !== false && c.path?.length) entries.push({ path: `/shop/${c.path.join("/")}`, changeFrequency: "daily", priority: 0.7 });
  for (const tech of technicians?.items ?? []) entries.push({ path: `/technicians/${tech.id}`, changeFrequency: "weekly", priority: 0.5 });
  for (let pageNo = 1, pages = 1; pageNo <= pages && pageNo <= 50; pageNo++) {
    const list = await serverGet<any>(`/products?pageSize=60&page=${pageNo}`, opts);
    if (!list) break;
    pages = list.meta?.totalPages ?? 1;
    for (const p of list.items ?? []) entries.push({ path: `/product/${p.slug}`, lastModified: p.updatedAt, changeFrequency: "weekly", priority: 0.7 });
  }
  return entries;
}
