"use client";
import React from "react";
import { Badge } from "./badge";

export const STATUS_LABELS: Record<string, { az: string; ru: string; en: string; variant: "default" | "success" | "warning" | "danger" | "info" | "outline" | "tone" }> = {
  NEW: { az: "Yeni", ru: "Новый", en: "New", variant: "info" },
  CONFIRMED: { az: "Təsdiqlənib", ru: "Подтверждён", en: "Confirmed", variant: "info" },
  IN_PROGRESS: { az: "İcra olunur", ru: "В работе", en: "In progress", variant: "warning" },
  WAITING_FOR_CUSTOMER: { az: "Müştəri təsdiqi gözləyir", ru: "Ожидает одобрения", en: "Awaiting approval", variant: "warning" },
  ON_HOLD: { az: "Dayandırılıb", ru: "Приостановлен", en: "On hold", variant: "outline" },
  COMPLETED: { az: "Tamamlanıb", ru: "Выполнен", en: "Completed", variant: "success" },
  CLOSED: { az: "Bağlanıb", ru: "Закрыт", en: "Closed", variant: "success" },
  CANCELLED: { az: "Ləğv edilib", ru: "Отменён", en: "Cancelled", variant: "danger" },
  REJECTED: { az: "İmtina edilib", ru: "Отклонён", en: "Rejected", variant: "danger" },

  // Stage statuses
  PENDING: { az: "Gözləyir", ru: "Ожидает", en: "Pending", variant: "outline" },
  READY: { az: "Hazırdır", ru: "Готов", en: "Ready", variant: "info" },
  ASSIGNED: { az: "Təyin olunub", ru: "Назначен", en: "Assigned", variant: "info" },
  ACCEPTED: { az: "Qəbul edilib", ru: "Принят", en: "Accepted", variant: "info" },
  ON_THE_WAY: { az: "Yoldadır", ru: "В пути", en: "On the way", variant: "warning" },
  ARRIVED: { az: "Ünvandadır", ru: "На месте", en: "Arrived", variant: "warning" },
  WAITING_FOR_APPROVAL: { az: "Təsdiq gözləyir", ru: "Ожидает подтверждения", en: "Awaiting approval", variant: "warning" },
  WAITING_FOR_PART: { az: "Hissə gözlənilir", ru: "Ожидает деталь", en: "Waiting for part", variant: "warning" },
  BLOCKED: { az: "Bloklanıb", ru: "Заблокирован", en: "Blocked", variant: "danger" },
  SKIPPED: { az: "Keçildi", ru: "Пропущен", en: "Skipped", variant: "outline" },
  FAILED: { az: "Uğursuz", ru: "Не удалось", en: "Failed", variant: "danger" },

  // Payment statuses
  INITIATED: { az: "Başlanıb", ru: "Создан", en: "Initiated", variant: "outline" },
  PAID: { az: "Ödənilib", ru: "Оплачен", en: "Paid", variant: "success" },
  PARTIALLY_PAID: { az: "Qismən ödənilib", ru: "Частично оплачен", en: "Partially paid", variant: "warning" },
  REFUNDED: { az: "Geri qaytarılıb", ru: "Возвращён", en: "Refunded", variant: "outline" },
};

export interface StatusBadgeProps {
  status: string;
  locale?: "az" | "ru" | "en";
  className?: string;
}

export function StatusBadge({ status, locale = "az", className }: StatusBadgeProps) {
  const meta = STATUS_LABELS[status] || { az: status, ru: status, en: status, variant: "outline" };
  const label = meta[locale] || meta.az;

  return (
    <Badge variant={meta.variant} className={className}>
      {label}
    </Badge>
  );
}
