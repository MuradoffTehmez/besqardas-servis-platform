"use client";
import React, { createContext, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { ChevronRight, CornerDownLeft, LogOut, Search, Repeat } from "lucide-react";
import { cn } from "@sp/utils";
import { post, useApiMutation } from "@sp/api-client";
import { useI18n } from "./i18n";
import { Link, useRouter, type RouteDef } from "./router";
import { useSession } from "./session";
import { Avatar } from "../kit/base";

/**
 * Naviqasiya köməkçiləri: cari route konteksti, sürətli keçid palitrası (Ctrl+K), istifadəçi menyusu və breadcrumb.
 */

const RouteCtx = createContext<RouteDef | null>(null);
export const CurrentRouteProvider = RouteCtx.Provider;
export function useCurrentRoute() {
  return useContext(RouteCtx);
}

/** Media sorğusu. Serverdə və hidratasiya zamanı `false` qaytarır, sonra brauzerin dəyərinə keçir (SSR ilə uyğunsuzluq olmur). */
export function useMedia(query: string) {
  return useSyncExternalStore(
    (onChange) => {
      const m = window.matchMedia(query);
      m.addEventListener("change", onChange);
      return () => m.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Kənara klik və Escape ilə bağlanma. */
export function useDismiss(ref: React.RefObject<HTMLElement | null>, open: boolean, close: () => void) {
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) close(); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
}

/** Azərbaycan hərflərini sadələşdirərək axtarış üçün normallaşdırır. */
export function fold(s: string) {
  return s
    .toLocaleLowerCase("az")
    .replace(/ə/g, "e").replace(/ı/g, "i").replace(/ö/g, "o").replace(/ü/g, "u").replace(/ş/g, "s").replace(/ç/g, "c").replace(/ğ/g, "g")
    .normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export interface Command {
  id: string;
  label: string;
  group: string;
  hint?: string;
  icon?: React.ComponentType<{ size?: number }>;
  run: () => void;
}

export function CommandPalette({ open, onClose, commands }: { open: boolean; onClose: () => void; commands: Command[] }) {
  const { t } = useI18n();
  const [q, setQ] = useState("");
  const [index, setIndex] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);
  useEffect(() => {
    if (!open) return;
    setQ("");
    setIndex(0);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    setTimeout(() => input.current?.focus(), 0);
    return () => { document.body.style.overflow = overflow; };
  }, [open]);
  const filtered = useMemo(() => {
    const needle = fold(q.trim());
    if (!needle) return commands;
    const words = needle.split(/\s+/);
    return commands.filter((c) => { const hay = fold(`${c.label} ${c.group} ${c.hint ?? ""}`); return words.every((w) => hay.includes(w)); });
  }, [q, commands]);
  useEffect(() => setIndex(0), [q]);
  useEffect(() => { list.current?.querySelector<HTMLElement>(`[data-index="${index}"]`)?.scrollIntoView({ block: "nearest" }); }, [index]);
  if (!open) return null;
  const pick = (c: Command | undefined) => { if (!c) return; onClose(); c.run(); };
  let lastGroup = "";
  return (
    <div className="cmdk-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="cmdk" role="dialog" aria-modal="true" aria-label={t("panel.search")}>
        <div className="cmdk-input">
          <Search size={18} aria-hidden />
          <input
            ref={input}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("panel.search")}
            aria-label={t("panel.search")}
            role="combobox"
            aria-expanded="true"
            aria-controls="cmdk-list"
            aria-activedescendant={filtered[index] ? `cmdk-${filtered[index]!.id}` : undefined}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setIndex((i) => Math.min(filtered.length - 1, i + 1)); }
              else if (e.key === "ArrowUp") { e.preventDefault(); setIndex((i) => Math.max(0, i - 1)); }
              else if (e.key === "Enter") { e.preventDefault(); pick(filtered[index]); }
              else if (e.key === "Escape") { e.preventDefault(); onClose(); }
            }}
          />
          <kbd>Esc</kbd>
        </div>
        <ul className="cmdk-list" id="cmdk-list" role="listbox" ref={list}>
          {!filtered.length && <li className="cmdk-empty">{t("panel.noResults")}</li>}
          {filtered.map((c, i) => {
            const head = c.group !== lastGroup ? c.group : null;
            lastGroup = c.group;
            const Icon = c.icon;
            return (
              <React.Fragment key={c.id}>
                {head && <li className="cmdk-group" role="presentation">{head}</li>}
                <li id={`cmdk-${c.id}`} role="option" aria-selected={i === index} data-index={i} className={cn("cmdk-item", i === index && "active")} onMouseMove={() => setIndex(i)} onClick={() => pick(c)}>
                  <span className="cmdk-icon">{Icon ? <Icon size={16} /> : <ChevronRight size={16} />}</span>
                  <span className="cmdk-label">{c.label}</span>
                  {c.hint && <small>{c.hint}</small>}
                  {i === index && <CornerDownLeft size={14} className="cmdk-enter" aria-hidden />}
                </li>
              </React.Fragment>
            );
          })}
        </ul>
        <div className="cmdk-foot">
          <span><kbd>↑</kbd><kbd>↓</kbd> {t("panel.kbdMove")}</span>
          <span><kbd>Enter</kbd> {t("panel.kbdOpen")}</span>
        </div>
      </div>
    </div>
  );
}

/** Ctrl+K / Cmd+K və "/" qısayolları. */
export function usePaletteHotkey(setOpen: (v: boolean) => void) {
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = !!target && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen(true); }
      else if (e.key === "/" && !typing) { e.preventDefault(); setOpen(true); }
    };
    document.addEventListener("keydown", on);
    return () => document.removeEventListener("keydown", on);
  }, [setOpen]);
}

/** Bir neçə rolu olan istifadəçi üçün rejim dəyişmə (PRD §6, §7.3). */
export function useModeSwitch(onAdmin: () => void) {
  const { refresh } = useSession();
  const { navigate } = useRouter();
  return useApiMutation((role: string) => post("/auth/select-mode", { role }), {
    onSuccess: async (r: any) => {
      await refresh();
      if (r.redirectTo === "ADMIN_APP") onAdmin();
      else navigate(r.redirectTo);
    },
  });
}

export interface MenuLink {
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  to?: string;
  onClick?: () => void;
}

export function UserMenu({ links, onAdmin }: { links: MenuLink[]; onAdmin: () => void }) {
  const { t, enumLabel } = useI18n();
  const { user, logout } = useSession();
  const { navigate } = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const mode = useModeSwitch(onAdmin);
  useDismiss(ref, open, () => setOpen(false));
  if (!user) return null;
  const close = () => setOpen(false);
  return (
    <div className="kit-dropdown" ref={ref}>
      <button type="button" className="panel-user-btn" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="menu" aria-label={t("panel.userMenu")}>
        <Avatar name={user.fullName} tone={user.avatarTone} src={user.avatarUrl} size={32} />
      </button>
      {open && (
        <div className="kit-dropdown-menu user-menu" role="menu">
          <div className="user-menu-head">
            <Avatar name={user.fullName} tone={user.avatarTone} src={user.avatarUrl} size={40} />
            <div>
              <strong>{user.fullName}</strong>
              <small>{user.companyName ?? enumLabel("Role", user.activeRole)}</small>
              <small>{user.email ?? user.phone}</small>
            </div>
          </div>
          {links.map((l) =>
            l.to ? (
              <Link key={l.label} to={l.to} className="dropdown-item" role="menuitem" onClick={close}><l.icon size={16} /> {l.label}</Link>
            ) : (
              <button key={l.label} type="button" className="dropdown-item" role="menuitem" onClick={() => { close(); l.onClick?.(); }}><l.icon size={16} /> {l.label}</button>
            ),
          )}
          {user.roles.length > 1 && (
            <>
              <div className="user-menu-sep">{t("auth.switchMode")}</div>
              {user.roles.map((r) => (
                <button key={r} type="button" role="menuitemradio" aria-checked={r === user.activeRole} className={cn("dropdown-item", r === user.activeRole && "active")} disabled={r === user.activeRole || mode.isPending} onClick={() => { close(); mode.mutate(r); }}>
                  <Repeat size={16} /> {enumLabel("Role", r)}
                </button>
              ))}
            </>
          )}
          <div className="user-menu-sep" />
          <button type="button" className="dropdown-item danger" role="menuitem" onClick={async () => { close(); await logout(); navigate("/login"); }}>
            <LogOut size={16} /> {t("logout")}
          </button>
        </div>
      )}
    </div>
  );
}
