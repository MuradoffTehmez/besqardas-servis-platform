import "@sp/ui/styles.css";
import "@sp/ui/app.css";
export const metadata = { title: "Beş Qardaş — CRM", robots: { index: false, follow: false } };
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="az">
      <body>{children}</body>
    </html>
  );
}
