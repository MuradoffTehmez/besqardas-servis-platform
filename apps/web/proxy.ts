import { NextResponse, type NextRequest } from "next/server";
import { LOCALES, pickLocale } from "@sp/ui/locale";

/**
 * Dil prefiksi (PRD §62): `/` və prefikssiz ünvanlar istifadəçinin seçdiyi (cookie) və ya brauzerin dilinə
 * yönləndirilir; prefiksli sorğularda dil `x-locale` başlığı ilə layout-a ötürülür.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const first = pathname.split("/")[1] ?? "";
  if ((LOCALES as string[]).includes(first)) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-locale", first);
    return NextResponse.next({ request: { headers: requestHeaders } });
  }
  const locale = pickLocale(request.cookies.get("locale")?.value, request.headers.get("accept-language"));
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!api|_next|favicon.ico|robots.txt|sitemap.xml|.*\\.[a-zA-Z0-9]+$).*)"],
};
