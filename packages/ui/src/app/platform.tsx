"use client";
import React from "react";
import { WebApp } from "./web";
import { AdminApp } from "./admin";
import type { InitialAppState } from "./core/app";

/** Tətbiq giriş nöqtəsi: `apps/web` üçün müştəri saytı, `apps/admin` üçün CRM/ERP (PRD §60–61). */
export function Platform({ admin = false, ...ssr }: { admin?: boolean } & InitialAppState) {
  return admin ? <AdminApp {...ssr} /> : <WebApp {...ssr} />;
}
