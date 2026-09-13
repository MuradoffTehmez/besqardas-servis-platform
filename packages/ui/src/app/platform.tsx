"use client";
import React from "react";
import { WebApp } from "./web";
import { Platform as LegacyPlatform } from "../platform";

/** Tətbiq giriş nöqtəsi: `apps/web` üçün müştəri saytı, `apps/admin` üçün CRM/ERP (PRD §60–61). */
export function Platform({ admin = false }: { admin?: boolean }) {
  return admin ? <LegacyPlatform admin /> : <WebApp />;
}
