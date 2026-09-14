import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { Platform } from "@sp/ui";
import { SITE_URL, languageAlternates, pageRequest, preparePage } from "@sp/ui/server";

/**
 * Bütün web route-ları üçün server səhifəsi (PRD §60, §72): data serverdə yüklənir və HTML-ə render olunur,
 * brauzerdə eyni tətbiq hidratasiya olunaraq SPA kimi davam edir.
 */

type Props = {
  params: Promise<{ path?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

async function load(props: Props) {
  const [{ path }, sp, h] = await Promise.all([props.params, props.searchParams, headers()]);
  const req = pageRequest(path, sp);
  const page = await preparePage(req.locale, req.path, req.search, h.get("cookie") ?? "");
  return { req, page };
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { req, page } = await load(props);
  const url = `${SITE_URL}/${req.locale}${page.canonicalPath === "/" ? "" : page.canonicalPath}`;
  return {
    title: page.absoluteTitle ? { absolute: page.title } : page.title,
    description: page.description ?? undefined,
    alternates: page.noindex ? undefined : { canonical: url, languages: languageAlternates(page.canonicalPath) },
    robots: page.noindex ? { index: false, follow: page.status !== 404 } : { index: true, follow: true },
    openGraph: {
      type: page.ogType,
      url,
      title: page.title,
      description: page.description ?? undefined,
      siteName: "besqardasServis.az",
      locale: { az: "az_AZ", ru: "ru_RU", en: "en_US" }[req.locale],
      ...(page.image ? { images: [page.image] } : {}),
    },
  };
}

export default async function Page(props: Props) {
  const { req, page } = await load(props);
  if (!req.localized) redirect(`/az${req.path === "/" ? "" : req.path}${req.search}`);
  if (page.status === 404) notFound();
  return (
    <>
      {page.jsonLd.map((data, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />
      ))}
      <Platform initial={{ locale: req.locale, path: req.path, search: req.search }} state={page.state} />
    </>
  );
}
