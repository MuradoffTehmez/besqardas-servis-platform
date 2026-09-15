import type { Metadata, Viewport } from "next";
import { Manrope, Plus_Jakarta_Sans } from "next/font/google";
import { headers } from "next/headers";
import { isLocale } from "@sp/ui/locale";
import { SITE_URL } from "@sp/ui/server";
import "@sp/ui/styles.css";
import "@sp/ui/app.css";

// Şriftlər build zamanı yüklənib self-host olunur — render-bloklayan Google Fonts sorğusu yoxdur (Core Web Vitals)
const sans = Plus_Jakarta_Sans({ subsets: ["latin", "latin-ext"], weight: ["400", "500", "600", "700", "800"], variable: "--font-sans", display: "swap" });
const display = Manrope({ subsets: ["latin", "latin-ext", "cyrillic"], weight: ["500", "600", "700", "800"], variable: "--font-display", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "besqardasServis.az", template: "%s | besqardasServis.az" },
  description: "Kondisioner, kombi və digər avadanlıqlar üçün servis xidmətləri.",
  applicationName: "besqardasServis.az",
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b5cad",
};

export default async function Layout({ children }: { children: React.ReactNode }) {
  // Dil proxy tərəfindən başlığa yazılır (proxy.ts); <html lang> ekran oxuyucular və SEO üçün vacibdir (§71, §72)
  const locale = (await headers()).get("x-locale");
  return (
    <html lang={isLocale(locale) ? locale : "az"} className={`${sans.variable} ${display.variable}`}>
      <body>{children}</body>
    </html>
  );
}
