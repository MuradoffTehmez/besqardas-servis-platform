"use client";
import React from "react";
import { cn } from "@sp/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "icon";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "btn",
          variant === "primary" && "primary",
          variant === "outline" && "outline",
          variant === "secondary" && "secondary",
          variant === "danger" && "danger",
          variant === "ghost" && "ghost",
          variant === "icon" && "icon-button",
          size === "sm" && "btn-sm",
          size === "lg" && "btn-lg",
          loading && "btn-loading",
          className
        )}
        {...props}
      >
        {loading ? (
          <span className="btn-spinner" aria-hidden="true" />
        ) : null}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
