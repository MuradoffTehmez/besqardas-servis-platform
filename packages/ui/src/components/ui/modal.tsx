"use client";
import React, { useEffect, useId, useRef } from "react";
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
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const subtitleId = useId();
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return;
    const previousFocus = document.activeElement;
    const overflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = overflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
      <dialog
        ref={dialogRef}
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={title ? undefined : "Dialog"}
        aria-describedby={subtitle ? subtitleId : undefined}
        onCancel={(event) => { event.preventDefault(); onClose(); }}
        className={cn(
          "modal",
          maxWidth === "sm" && "modal-sm",
          maxWidth === "lg" && "modal-lg",
          maxWidth === "xl" && "modal-xl",
          maxWidth === "full" && "modal-full",
          className
        )}
        onClick={(event) => {
          if (event.target !== event.currentTarget) return;
          const rect = event.currentTarget.getBoundingClientRect();
          if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose();
        }}
      >
        <button
          autoFocus
          type="button"
          className="modal-close icon-button"
          aria-label="Bağla"
          onClick={onClose}
        >
          <X size={20} />
        </button>
        {title && (
          <div className="modal-header">
            <h2 id={titleId}>{title}</h2>
            {subtitle && <p id={subtitleId} className="modal-subtitle">{subtitle}</p>}
          </div>
        )}
        <div className="modal-body">{children}</div>
      </dialog>
  );
}
