import { Manrope, Plus_Jakarta_Sans } from "next/font/google";
import "@sp/ui/styles.css";
import "@sp/ui/app.css";

// Şriftlər build zamanı yüklənib self-host olunur — render-bloklayan Google Fonts sorğusu yoxdur
const sans = Plus_Jakarta_Sans({ subsets: ["latin", "latin-ext"], weight: ["400", "500", "600", "700", "800"], variable: "--font-sans", display: "swap" });
const display = Manrope({ subsets: ["latin", "latin-ext", "cyrillic"], weight: ["500", "600", "700", "800"], variable: "--font-display", display: "swap" });

export const metadata = { title: "Beş Qardaş — CRM", robots: { index: false, follow: false } };
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="az" className={`${sans.variable} ${display.variable}`}>
      <body>{children}</body>
    </html>
  );
}
