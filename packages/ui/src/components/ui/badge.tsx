"use client";
import React from "react";
import { cn } from "@sp/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "danger" | "info" | "outline" | "tone";
}

export function Badge({ className, variant = "default", children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "badge",
        variant === "success" && "badge-success",
        variant === "warning" && "badge-warning",
        variant === "danger" && "badge-danger",
        variant === "info" && "badge-info",
        variant === "outline" && "badge-outline",
        variant === "tone" && "badge-tone",
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
