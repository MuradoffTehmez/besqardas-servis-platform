"use client";
import React, { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@sp/utils";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "full";
  className?: string;
}

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = "md",
  className,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "modal",
          maxWidth === "sm" && "modal-sm",
          maxWidth === "lg" && "modal-lg",
          maxWidth === "xl" && "modal-xl",
          maxWidth === "full" && "modal-full",
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          autoFocus
          className="modal-close icon-button"
          aria-label="Bağla"
          onClick={onClose}
        >
          <X size={20} />
        </button>
        {title && (
          <div className="modal-header">
            <h2>{title}</h2>
            {subtitle && <p className="modal-subtitle">{subtitle}</p>}
          </div>
        )}
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
