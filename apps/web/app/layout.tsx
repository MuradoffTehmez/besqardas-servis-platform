import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { isLocale } from "@sp/ui/locale";
import { SITE_URL } from "@sp/ui/server";
import "@sp/ui/styles.css";
import "@sp/ui/app.css";

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
    <html lang={isLocale(locale) ? locale : "az"}>
      <body>{children}</body>
    </html>
  );
}
