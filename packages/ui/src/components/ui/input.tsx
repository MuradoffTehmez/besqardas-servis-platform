"use client";
import React, { useId } from "react";
import { cn } from "@sp/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, label, id, ...props }, ref) => {
    const generatedId = useId();
    const fieldId = id || generatedId;
    const describedBy = [props["aria-describedby"], error ? `${fieldId}-error` : undefined].filter(Boolean).join(" ") || undefined;
    return (
      <div className="form-group">
        {label && <label htmlFor={fieldId} className="form-label">{label}</label>}
        <input
          id={fieldId}
          ref={ref}
          className={cn("form-input", error && "input-error", className)}
          {...props}
          aria-invalid={error ? true : props["aria-invalid"]}
          aria-describedby={describedBy}
        />
        {error && <span id={`${fieldId}-error`} className="error-text" role="alert">{error}</span>}
      </div>
    );
  }
);
Input.displayName = "Input";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
  label?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, label, id, ...props }, ref) => {
    const generatedId = useId();
    const fieldId = id || generatedId;
    const describedBy = [props["aria-describedby"], error ? `${fieldId}-error` : undefined].filter(Boolean).join(" ") || undefined;
    return (
      <div className="form-group">
        {label && <label htmlFor={fieldId} className="form-label">{label}</label>}
        <textarea
          id={fieldId}
          ref={ref}
          className={cn("form-textarea", error && "input-error", className)}
          {...props}
          aria-invalid={error ? true : props["aria-invalid"]}
          aria-describedby={describedBy}
        />
        {error && <span id={`${fieldId}-error`} className="error-text" role="alert">{error}</span>}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";
