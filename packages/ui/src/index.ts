"use client";

// UI Primitives & Domain Components
export * from "./components/ui/button";
export * from "./components/ui/badge";
export * from "./components/ui/status-badge";
export * from "./components/ui/input";
export * from "./components/ui/modal";
export * from "./components/ui/timeline";
export * from "./components/ui/data-table";

// Domain Cards
export * from "./components/domain/service-card";
export * from "./components/domain/product-card";
export * from "./components/domain/technician-card";
export * from "./components/domain/device-card";

// Layouts
export * from "./components/layout/header";
export * from "./components/layout/footer";
export * from "./components/layout/sidebar";

// Views
export * from "./views/public/home-view";
export * from "./views/public/services-view";
export * from "./views/public/service-detail-view";
export * from "./views/public/booking-wizard";
export * from "./views/public/shop-view";
export * from "./views/public/product-detail-view";
export * from "./views/public/cart-view";
export * from "./views/public/checkout-view";
export * from "./views/public/technicians-view";
export * from "./views/public/pricing-view";
export * from "./views/public/warranty-verify-view";
export * from "./views/public/info-view";
export * from "./views/auth/login-view";
export * from "./views/customer/customer-portal";
export * from "./views/technician/technician-portal";
export * from "./views/courier/courier-portal";
export * from "./views/admin/admin-portal";

// Integrated Platform Shell
export { Platform } from "./platform";

// Utilities
export * from "./utils/i18n";
