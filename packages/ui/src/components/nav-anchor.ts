import type React from "react";

/**
 * Keçidlər `<a href>` kimi render olunur ki, axtarış sistemləri və ekran oxuyucular onları görsün (§71, §72);
 * adi klik SPA naviqasiyası ilə işləyir, Ctrl/⌘ + klik isə yeni sekmədə açır.
 */
export function anchorProps(locale: string, href: string, onNavigate: (href: string) => void, after?: () => void) {
  const external = /^https?:\/\//.test(href);
  return {
    href: external ? href : `/${locale}${href === "/" ? "" : href}`,
    onClick: (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (external || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      after?.();
      onNavigate(href);
    },
  };
}
