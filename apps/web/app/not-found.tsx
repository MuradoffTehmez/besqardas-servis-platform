import type { Metadata } from "next";
import { Platform } from "@sp/ui";

export const metadata: Metadata = { title: "404", robots: { index: false, follow: false } };

/** 404 statusu ilə cavab; görünüş tətbiqin sistem səhifəsidir (§60.7). */
export default function NotFound() {
  return <Platform />;
}
