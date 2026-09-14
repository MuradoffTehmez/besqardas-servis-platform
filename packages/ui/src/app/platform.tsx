"use client";
import React from "react";
import { WebApp } from "./web";
import { AdminApp } from "./admin";

/** Tətbiq giriş nöqtəsi: `apps/web` üçün müştəri saytı, `apps/admin` üçün CRM/ERP (PRD §60–61). */
export function Platform({ admin = false }: { admin?: boolean }) {
  return admin ? <AdminApp /> : <WebApp />;
}
