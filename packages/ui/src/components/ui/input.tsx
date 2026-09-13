"use client";
import React from "react";
import { cn } from "@sp/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, label, id, ...props }, ref) => {
    return (
      <div className="form-group">
        {label && <label htmlFor={id} className="form-label">{label}</label>}
        <input
          id={id}
          ref={ref}
          className={cn("form-input", error && "input-error", className)}
          {...props}
        />
        {error && <span className="error-text" role="alert">{error}</span>}
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
    return (
      <div className="form-group">
        {label && <label htmlFor={id} className="form-label">{label}</label>}
        <textarea
          id={id}
          ref={ref}
          className={cn("form-textarea", error && "input-error", className)}
          {...props}
        />
        {error && <span className="error-text" role="alert">{error}</span>}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";
