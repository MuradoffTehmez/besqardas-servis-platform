import "@sp/ui/styles.css";
export const metadata = {
  title: "Beş Qardaş — Evinizin texniki qayğısı",
  description: "Kondisioner, kombi və digər avadanlıqlar üçün servis xidmətləri. Frontend demo.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="az">
      <body>{children}</body>
    </html>
  );
}
