import { L } from "../lib/i18n";
import { idFor } from "../lib/rng";
import { daysAgo } from "../lib/time";

/** Dinamik plan sistemi — başlanğıc limitlər (PRD §41–43, §44.3). Qiymətlər nümunədir. */

const prices = (m1: number, m3: number | null, m6: number | null, m12: number) => [
  { period: "MONTH_1", price: { amount: (m1 / 100).toFixed(2), currency: "AZN" }, enabled: true },
  { period: "MONTH_3", price: { amount: ((m3 ?? 0) / 100).toFixed(2), currency: "AZN" }, enabled: m3 !== null },
  { period: "MONTH_6", price: { amount: ((m6 ?? 0) / 100).toFixed(2), currency: "AZN" }, enabled: m6 !== null },
  { period: "MONTH_12", price: { amount: (m12 / 100).toFixed(2), currency: "AZN" }, enabled: true },
];

export const entitlementDefinitions = [
  ["max_devices", "NUMBER", "CUSTOMER", L("Cihaz qeydiyyatı", "Регистрация устройств", "Registered devices")],
  ["max_addresses", "NUMBER", "CUSTOMER", L("Yadda saxlanılan ünvanlar", "Сохранённые адреса", "Saved addresses")],
  ["one_time_address", "BOOLEAN", "CUSTOMER", L("Birdəfəlik ünvan", "Разовый адрес", "One-time address")],
  ["max_active_orders", "NUMBER", "CUSTOMER", L("Aktiv servis sifarişi limiti", "Лимит активных заказов", "Active service orders")],
  ["extended_archive", "BOOLEAN", "CUSTOMER", L("Genişləndirilmiş sənəd arxivi", "Расширенный архив документов", "Extended document archive")],
  ["periodic_reminders", "BOOLEAN", "CUSTOMER", L("Periodik baxış xatırlatmaları", "Напоминания об обслуживании", "Periodic service reminders")],
  ["product_discount_percent", "PERCENT", "CUSTOMER", L("Məhsul endirimi", "Скидка на товары", "Product discount")],
  ["service_discount_percent", "PERCENT", "CUSTOMER", L("Servis endirimi", "Скидка на сервис", "Service discount")],
  ["extended_warranty_months", "NUMBER", "CUSTOMER", L("Uzadılmış iş zəmanəti (ay)", "Продлённая гарантия (мес.)", "Extended work warranty (months)")],
  ["priority_level", "NUMBER", "CUSTOMER", L("Prioritet səviyyəsi", "Уровень приоритета", "Priority level")],
  ["reaction_sla_hours", "NUMBER", "CUSTOMER", L("Reaksiya SLA-sı (saat)", "SLA реакции (ч)", "Reaction SLA (hours)")],
  ["urgent_service", "BOOLEAN", "CUSTOMER", L("Təcili servis", "Срочный сервис", "Urgent service")],
  ["urgent_arrival_hours", "NUMBER", "CUSTOMER", L("Təcili gəliş (saat)", "Срочный выезд (ч)", "Urgent arrival (hours)")],
  ["dedicated_hotline", "BOOLEAN", "CUSTOMER", L("Xüsusi çağrı xətti", "Выделенная линия", "Dedicated hotline")],
  ["free_annual_checkups", "NUMBER", "CUSTOMER", L("İllik pulsuz texniki baxış", "Бесплатный ежегодный осмотр", "Free annual check-ups")],
  ["family_members", "NUMBER", "CUSTOMER", L("Ailə üzvləri", "Члены семьи", "Family members")],
  ["public_profile", "BOOLEAN", "TECHNICIAN", L("Public profil", "Публичный профиль", "Public profile")],
  ["max_monthly_jobs", "UNLIMITED_NUMBER", "TECHNICIAN", L("Aylıq qəbul edilən sifariş limiti", "Лимит заказов в месяц", "Monthly accepted jobs")],
  ["max_active_jobs", "NUMBER", "TECHNICIAN", L("Aktiv iş limiti", "Лимит активных работ", "Active jobs at once")],
  ["max_specializations", "UNLIMITED_NUMBER", "TECHNICIAN", L("İxtisas sayı", "Количество специализаций", "Specializations")],
  ["max_zones", "UNLIMITED_NUMBER", "TECHNICIAN", L("Xidmət zonası sayı", "Количество зон", "Service zones")],
  ["technician_pricing", "BOOLEAN", "TECHNICIAN", L("Usta qiymətləri ilə alış", "Покупка по ценам мастера", "Technician pricing")],
  ["basic_statistics", "BOOLEAN", "TECHNICIAN", L("Əsas statistika", "Базовая статистика", "Basic statistics")],
  ["advanced_statistics", "BOOLEAN", "TECHNICIAN", L("Geniş statistika və gəlir hesabatları", "Расширенная статистика", "Advanced statistics")],
  ["special_prices", "BOOLEAN", "TECHNICIAN", L("Xüsusi qiymətlər", "Специальные цены", "Special prices")],
  ["max_reservations", "NUMBER", "TECHNICIAN", L("Material rezervasiyası", "Резервирование материалов", "Material reservations")],
  ["customer_history", "BOOLEAN", "TECHNICIAN", L("Müştəri tarixçəsi", "История клиентов", "Customer history")],
  ["search_boost", "BOOLEAN", "TECHNICIAN", L("Axtarışda üstünlük", "Приоритет в поиске", "Search boost")],
  ["advanced_crm", "BOOLEAN", "TECHNICIAN", L("Geniş CRM", "Расширенная CRM", "Advanced CRM")],
  ["promote", "BOOLEAN", "TECHNICIAN", L("Promote / reklam", "Продвижение", "Promotion / ads")],
  ["campaigns", "BOOLEAN", "TECHNICIAN", L("Xüsusi endirimlər və kampaniyalar", "Спецскидки и акции", "Special discounts & campaigns")],
  ["max_sites", "NUMBER", "CORPORATE", L("Ünvan (obyekt) sayı", "Количество объектов", "Sites")],
  ["max_company_users", "NUMBER", "CORPORATE", L("Şirkət istifadəçiləri", "Пользователи компании", "Company users")],
  ["max_corporate_devices", "NUMBER", "CORPORATE", L("Qeydiyyatlı cihaz sayı", "Количество устройств", "Registered devices")],
  ["planned_service", "BOOLEAN", "CORPORATE", L("Planlı servis", "Плановый сервис", "Planned service")],
].map(([code, valueType, group, label]) => ({ code: code as string, valueType: valueType as string, group: group as string, label: label as ReturnType<typeof L> }));

export interface PlanRec {
  id: string;
  code: string;
  group: "CUSTOMER" | "TECHNICIAN" | "CORPORATE" | "CUSTOM";
  name: ReturnType<typeof L>;
  description: ReturnType<typeof L>;
  tier: number;
  prices: ReturnType<typeof prices>;
  trialDays: number | null;
  visibility: "PUBLIC" | "INVITE_ONLY" | "ARCHIVED";
  entitlements: Record<string, boolean | number | string>;
  highlight: boolean;
  updatedAt: string;
}

export const plans: PlanRec[] = [
  {
    id: idFor("plan:CUSTOMER_BASIC"), code: "CUSTOMER_BASIC", group: "CUSTOMER", tier: 0, highlight: false, trialDays: null, visibility: "PUBLIC", updatedAt: daysAgo(20),
    name: L("Basic", "Basic", "Basic"), description: L("Pulsuz — servis sifarişi, cihazlar və tarixçə", "Бесплатно — заказы, устройства и история", "Free — orders, devices and history"),
    prices: prices(0, null, null, 0),
    entitlements: { max_devices: 10, max_addresses: 1, one_time_address: false, max_active_orders: 2, extended_archive: false, periodic_reminders: false, product_discount_percent: 0, service_discount_percent: 0, extended_warranty_months: 0, priority_level: 0, reaction_sla_hours: 24, urgent_service: false, urgent_arrival_hours: 0, dedicated_hotline: false, free_annual_checkups: 0, family_members: 0 },
  },
  {
    id: idFor("plan:CUSTOMER_PRO"), code: "CUSTOMER_PRO", group: "CUSTOMER", tier: 1, highlight: true, trialDays: 14, visibility: "PUBLIC", updatedAt: daysAgo(20),
    name: L("Pro", "Pro", "Pro"), description: L("Endirimlər, birdəfəlik ünvan və xatırlatmalar", "Скидки, разовый адрес и напоминания", "Discounts, one-time address and reminders"),
    prices: prices(990, 2690, 4990, 8990),
    entitlements: { max_devices: 25, max_addresses: 1, one_time_address: true, max_active_orders: 5, extended_archive: true, periodic_reminders: true, product_discount_percent: 5, service_discount_percent: 10, extended_warranty_months: 3, priority_level: 1, reaction_sla_hours: 8, urgent_service: false, urgent_arrival_hours: 0, dedicated_hotline: false, free_annual_checkups: 0, family_members: 0 },
  },
  {
    id: idFor("plan:CUSTOMER_PREMIUM"), code: "CUSTOMER_PREMIUM", group: "CUSTOMER", tier: 2, highlight: false, trialDays: null, visibility: "PUBLIC", updatedAt: daysAgo(20),
    name: L("Premium", "Premium", "Premium"), description: L("Təcili servis, 10 ünvan, ailə üzvləri və illik baxış", "Срочный сервис, 10 адресов, семья и ежегодный осмотр", "Urgent service, 10 addresses, family and annual check-up"),
    prices: prices(1990, 5390, 9990, 17990),
    entitlements: { max_devices: 50, max_addresses: 10, one_time_address: true, max_active_orders: 10, extended_archive: true, periodic_reminders: true, product_discount_percent: 10, service_discount_percent: 15, extended_warranty_months: 6, priority_level: 2, reaction_sla_hours: 2, urgent_service: true, urgent_arrival_hours: 4, dedicated_hotline: true, free_annual_checkups: 1, family_members: 4 },
  },
  {
    id: idFor("plan:TECH_BASIC"), code: "TECH_BASIC", group: "TECHNICIAN", tier: 0, highlight: false, trialDays: 14, visibility: "PUBLIC", updatedAt: daysAgo(15),
    name: L("Usta Basic", "Мастер Basic", "Technician Basic"), description: L("Başlanğıc üçün: public profil və 20 sifariş", "Для старта: профиль и 20 заказов", "To get started: public profile and 20 jobs"),
    prices: prices(1900, 5100, 9900, 18900),
    entitlements: { public_profile: true, max_monthly_jobs: 20, max_active_jobs: 3, max_specializations: 2, max_zones: 1, priority_level: 0, technician_pricing: true, basic_statistics: true, advanced_statistics: false, special_prices: false, max_reservations: 0, customer_history: false, search_boost: false, advanced_crm: false, promote: false, campaigns: false },
  },
  {
    id: idFor("plan:TECH_PRO"), code: "TECH_PRO", group: "TECHNICIAN", tier: 1, highlight: true, trialDays: 14, visibility: "PUBLIC", updatedAt: daysAgo(15),
    name: L("Usta Pro", "Мастер Pro", "Technician Pro"), description: L("Aktiv ustalar üçün: rezervasiya, geniş statistika", "Для активных мастеров: резервы и статистика", "For active pros: reservations and advanced stats"),
    prices: prices(3900, 10500, 19900, 37900),
    entitlements: { public_profile: true, max_monthly_jobs: 60, max_active_jobs: 6, max_specializations: 5, max_zones: 3, priority_level: 1, technician_pricing: true, basic_statistics: true, advanced_statistics: true, special_prices: true, max_reservations: 5, customer_history: true, search_boost: false, advanced_crm: false, promote: false, campaigns: false },
  },
  {
    id: idFor("plan:TECH_PREMIUM"), code: "TECH_PREMIUM", group: "TECHNICIAN", tier: 2, highlight: false, trialDays: null, visibility: "PUBLIC", updatedAt: daysAgo(15),
    name: L("Usta Premium", "Мастер Premium", "Technician Premium"), description: L("Limitsiz iş, axtarışda üstünlük, CRM və promote", "Без лимитов, приоритет, CRM и продвижение", "Unlimited jobs, search boost, CRM and promotion"),
    prices: prices(6900, 18900, 35900, 67900),
    entitlements: { public_profile: true, max_monthly_jobs: "UNLIMITED", max_active_jobs: 10, max_specializations: "UNLIMITED", max_zones: "UNLIMITED", priority_level: 2, technician_pricing: true, basic_statistics: true, advanced_statistics: true, special_prices: true, max_reservations: 20, customer_history: true, search_boost: true, advanced_crm: true, promote: true, campaigns: true },
  },
  {
    id: idFor("plan:CORPORATE_STANDARD"), code: "CORPORATE_STANDARD", group: "CORPORATE", tier: 1, highlight: false, trialDays: null, visibility: "INVITE_ONLY", updatedAt: daysAgo(40),
    name: L("Korporativ Standart", "Корпоративный Стандарт", "Corporate Standard"), description: L("Müqavilə əsasında: 20 obyekt, 500 cihaz, 2 saat SLA", "По договору: 20 объектов, 500 устройств, SLA 2 ч", "Contract-based: 20 sites, 500 devices, 2h SLA"),
    prices: prices(49000, null, null, 499000),
    entitlements: { max_sites: 20, max_company_users: 10, max_corporate_devices: 500, max_active_orders: 30, priority_level: 2, reaction_sla_hours: 2, urgent_service: true, urgent_arrival_hours: 4, planned_service: true },
  },
];

export const PLAN = Object.fromEntries(plans.map((p) => [p.code, p.id])) as Record<string, string>;
