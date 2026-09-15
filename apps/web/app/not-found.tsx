import type { Metadata } from "next";
import { WebApp } from "@sp/ui/web";

export const metadata: Metadata = { title: "404", robots: { index: false, follow: false } };

/** 404 statusu ilə cavab; görünüş tətbiqin sistem səhifəsidir (§60.7). */
export default function NotFound() {
  return <WebApp />;
}
