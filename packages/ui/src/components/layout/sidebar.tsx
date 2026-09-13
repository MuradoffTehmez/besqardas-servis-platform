"use client";
import React from "react";
import { LogOut, LucideIcon, ChevronRight } from "lucide-react";
import { cn } from "@sp/utils";

export interface SidebarItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string | number;
  badgeVariant?: "default" | "warning" | "danger" | "info" | "success";
}

export interface SidebarProps {
  items: SidebarItem[];
  currentPath: string;
  user?: {
    name?: string;
    fullName?: string;
    email?: string;
    role?: string;
    avatarUrl?: string;
  } | null;
  onNavigate: (href: string) => void;
  onLogout?: () => void;
  headerTitle?: string;
  className?: string;
}

export function Sidebar({
  items,
  currentPath,
  user,
  onNavigate,
  onLogout,
  headerTitle,
  className,
}: SidebarProps) {
  return (
    <aside className={cn("app-sidebar", className)}>
      {headerTitle && <div className="sidebar-title">{headerTitle}</div>}

      {user && (() => {
        const userName = user.fullName || user.name || "İstifadəçi";
        const initial = (userName.trim()[0] || "U").toUpperCase();
        return (
          <div className="sidebar-user-card">
            <div className="user-avatar">
              {user.avatarUrl ? (
                <img width={42} height={42} decoding="async" src={user.avatarUrl} alt={userName} />
              ) : (
                <span>{initial}</span>
              )}
            </div>
            <div className="user-details">
              <strong className="user-name">{userName}</strong>
              <small className="user-role">{user.role || user.email || ""}</small>
            </div>
          </div>
        );
      })()}

      <nav className="sidebar-nav">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive =
            currentPath === item.href ||
            (item.href !== "/" &&
              item.href !== "/account" &&
              item.href !== "/technician" &&
              item.href !== "/admin" &&
              currentPath.startsWith(item.href));

          return (
            <button
              key={item.id}
              className={cn("sidebar-link", isActive && "active")}
              aria-current={isActive ? "page" : undefined}
              onClick={() => onNavigate(item.href)}
            >
              <span className="sidebar-icon">
                <Icon size={18} />
              </span>
              <span className="sidebar-label">{item.label}</span>
              {item.badge != null && item.badge !== 0 && item.badge !== "0" && (
                <span className={cn("sidebar-badge", item.badgeVariant && `badge-${item.badgeVariant}`)}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {onLogout && (
        <div className="sidebar-footer">
          <button className="sidebar-link logout-link" onClick={onLogout}>
            <span className="sidebar-icon">
              <LogOut size={18} />
            </span>
            <span className="sidebar-label">Çıxış</span>
          </button>
        </div>
      )}
    </aside>
  );
}
