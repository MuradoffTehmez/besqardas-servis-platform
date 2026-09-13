"use client";
import React from "react";
import { Wrench, ShieldCheck, Calendar, MapPin, QrCode } from "lucide-react";
import { cn } from "@sp/utils";
import { resolveText, type AppLocale } from "../../utils/i18n";

export interface DeviceCardData {
  id: string;
  categoryName: string | { az?: string; ru?: string; en?: string };
  brandName: string | { az?: string; ru?: string; en?: string };
  modelName: string | { az?: string; ru?: string; en?: string };
  serialNumber?: string;
  addressShort?: string;
  warrantyUntil?: string;
  isUnderWarranty?: boolean;
  nextPeriodicServiceDate?: string;
}

export interface DeviceCardProps {
  device: DeviceCardData;
  locale?: "az" | "ru" | "en";
  onBookService?: (device: DeviceCardData) => void;
  onClaimWarranty?: (device: DeviceCardData) => void;
  onViewHistory?: (device: DeviceCardData) => void;
  className?: string;
}

export function DeviceCard({
  device,
  locale = "az",
  onBookService,
  onClaimWarranty,
  onViewHistory,
  className,
}: DeviceCardProps) {
  const catName = resolveText(device.categoryName, locale as AppLocale, "Avadanlıq");
  const brandName = resolveText(device.brandName, locale as AppLocale, "Brend");
  const modelName = resolveText(device.modelName, locale as AppLocale, "");

  return (
    <article className={cn("device-card panel", className)}>
      <div className="device-header">
        <div className="device-icon">
          <Wrench size={22} />
        </div>
        <div className="device-main">
          <span className="device-category">{catName}</span>
          <h3 className="device-title">
            {brandName} {modelName}
          </h3>
          {device.serialNumber && (
            <small className="device-sn">S/N: {device.serialNumber}</small>
          )}
        </div>
      </div>

      <div className="device-meta">
        {device.addressShort && (
          <div className="meta-item">
            <MapPin size={14} />
            <span>{device.addressShort}</span>
          </div>
        )}

        {device.warrantyUntil && (
          <div className="meta-item">
            <ShieldCheck
              size={14}
              className={device.isUnderWarranty ? "text-success" : "text-muted"}
            />
            <span>
              {device.isUnderWarranty
                ? locale === "az"
                  ? `Zəmanət: ${device.warrantyUntil}-dək`
                  : locale === "ru"
                    ? `Гарантия до: ${device.warrantyUntil}`
                    : `Warranty until: ${device.warrantyUntil}`
                : locale === "az"
                  ? "Zəmanət bitib"
                  : locale === "ru"
                    ? "Гарантия истекла"
                    : "Warranty expired"}
            </span>
          </div>
        )}

        {device.nextPeriodicServiceDate && (
          <div className="meta-item">
            <Calendar size={14} />
            <span>
              {locale === "az" ? "Planlı servis: " : locale === "ru" ? "Плановый сервис: " : "Next service: "}
              {device.nextPeriodicServiceDate}
            </span>
          </div>
        )}
      </div>

      <div className="device-actions">
        {onBookService && (
          <button
            className="btn btn-sm primary"
            onClick={() => onBookService(device)}
          >
            {locale === "az" ? "Servis çağır" : locale === "ru" ? "Вызвать мастера" : "Book service"}
          </button>
        )}
        {onClaimWarranty && device.isUnderWarranty && (
          <button
            className="btn btn-sm outline"
            onClick={() => onClaimWarranty(device)}
          >
            {locale === "az" ? "Zəmanət iddiası" : locale === "ru" ? "Гарантия" : "Warranty claim"}
          </button>
        )}
        {onViewHistory && (
          <button
            className="btn btn-sm ghost"
            onClick={() => onViewHistory(device)}
          >
            {locale === "az" ? "Tarixçə" : locale === "ru" ? "История" : "History"}
          </button>
        )}
      </div>
    </article>
  );
}
