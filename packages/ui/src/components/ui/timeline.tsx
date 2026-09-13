"use client";
import React from "react";
import { Check, Clock, AlertCircle } from "lucide-react";
import { cn } from "@sp/utils";

export interface TimelineStep {
  id: string;
  name: string;
  description?: string;
  status: "COMPLETED" | "IN_PROGRESS" | "PENDING" | "FAILED" | "SKIPPED" | string;
  assignee?: string;
  timestamp?: string;
}

export interface TimelineProps {
  steps: TimelineStep[];
  className?: string;
}

export function Timeline({ steps, className }: TimelineProps) {
  return (
    <div className={cn("interactive-timeline", className)}>
      {steps.map((step, idx) => {
        const isDone = step.status === "COMPLETED";
        const isCurrent = step.status === "IN_PROGRESS";
        const isFailed = step.status === "FAILED";

        return (
          <div
            key={step.id || idx}
            className={cn(
              "timeline-step",
              isDone && "step-done",
              isCurrent && "step-current",
              isFailed && "step-failed"
            )}
          >
            <div className="step-indicator">
              <span className="step-badge">
                {isDone ? (
                  <Check size={14} />
                ) : isCurrent ? (
                  <Clock size={14} className="animate-spin-slow" />
                ) : isFailed ? (
                  <AlertCircle size={14} />
                ) : (
                  idx + 1
                )}
              </span>
              {idx < steps.length - 1 && <div className="step-line" />}
            </div>
            <div className="step-content">
              <div className="step-header">
                <strong>{step.name}</strong>
                {step.timestamp && <small className="step-time">{step.timestamp}</small>}
              </div>
              {step.description && <p className="step-desc">{step.description}</p>}
              {step.assignee && (
                <small className="step-assignee">İcraçı: {step.assignee}</small>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
