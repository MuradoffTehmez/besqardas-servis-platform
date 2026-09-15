import type { PermissionScope, Role } from "@sp/types";
import { L } from "../lib/i18n";
import { idFor } from "../lib/rng";

/** İcazə modeli (PRD §8). Format: `resurs:əməliyyat`. */

export const RESOURCES = [
  "service_orders",
  "assignments",
  "estimates",
  "workflow_templates",
  "fee_rules",
  "reason_codes",
  "catalog",
  "price_rules",
  "inventory",
  "purchases",
  "sales_orders",
  "payments",
  "finance_reports",
  "subscription_plans",
  "b2b_accounts",
  "partner_commissions",
  "technician_settlements",
  "logistics_tasks",
  "customers",
  "technicians",
  "users",
  "roles",
  "audit_logs",
  "reviews",
  "content",
  "notification_templates",
  "integrations",
  "kpi_targets",
  "settings",
  "branches",
  "tickets",
  "loyalty",
] as const;

export type Resource = (typeof RESOURCES)[number];

const M = ["view", "create", "edit", "delete", "approve", "assign", "export"];
const E = ["view", "create", "edit"];
const V = ["view"];

type Matrix = Partial<Record<Resource, string[]>>;

const matrix: Record<string, Matrix> = {
  OPERATOR: {
    service_orders: E, assignments: V, estimates: E, workflow_templates: V, reason_codes: V, catalog: V, inventory: V,
    sales_orders: E, payments: V, logistics_tasks: E, users: V, customers: E, technicians: V, reviews: V, fee_rules: V, branches: V, tickets: [...E, "assign"], loyalty: V,
  },
  DISPATCHER: {
    service_orders: E, assignments: M, estimates: V, workflow_templates: V, reason_codes: V, catalog: V, inventory: V,
    logistics_tasks: M, users: V, customers: V, technicians: V, fee_rules: V, branches: V, tickets: E,
  },
  WAREHOUSE_EMPLOYEE: {
    service_orders: V, catalog: V, inventory: M, purchases: E, sales_orders: V, logistics_tasks: E, branches: V, tickets: V,
  },
  SALES_EMPLOYEE: {
    service_orders: V, catalog: V, price_rules: V, inventory: V, sales_orders: M, payments: V, subscription_plans: V,
    b2b_accounts: M, partner_commissions: V, logistics_tasks: V, users: V, customers: E, branches: V, tickets: E, loyalty: E,
  },
  ACCOUNTANT: {
    service_orders: V, catalog: V, price_rules: V, inventory: V, purchases: V, sales_orders: V, payments: M, finance_reports: M,
    subscription_plans: V, b2b_accounts: V, partner_commissions: M, technician_settlements: M, audit_logs: V, customers: V, branches: V, tickets: E, loyalty: E,
  },
  MANAGER: {
    service_orders: M, assignments: M, estimates: M, workflow_templates: V, fee_rules: [...V, "approve"], reason_codes: V, catalog: V, price_rules: V,
    inventory: M, purchases: M, sales_orders: M, payments: V, finance_reports: V, subscription_plans: V, b2b_accounts: M,
    partner_commissions: V, technician_settlements: V, logistics_tasks: M, users: V, audit_logs: V, customers: M, technicians: M,
    reviews: M, kpi_targets: V, content: V, branches: V, tickets: M, loyalty: M,
  },
  ADMIN: Object.fromEntries(RESOURCES.map((r) => [r, r === "roles" ? V : r === "audit_logs" ? V : M])) as Matrix,
  TECHNICIAN: {
    service_orders: ["view", "update_status"], assignments: ["view", "approve"], estimates: E, catalog: V, inventory: V,
    payments: ["view", "create"], technician_settlements: V, logistics_tasks: ["view", "update_status"],
  },
  COURIER: { logistics_tasks: ["view", "update_status"] },
};

const scopeOf: Partial<Record<Role, PermissionScope>> = {
  OPERATOR: "BRANCH",
  DISPATCHER: "BRANCH",
  WAREHOUSE_EMPLOYEE: "BRANCH",
  SALES_EMPLOYEE: "ORGANIZATION",
  ACCOUNTANT: "ORGANIZATION",
  MANAGER: "BRANCH",
  ADMIN: "ORGANIZATION",
  SUPER_ADMIN: "PLATFORM",
  TECHNICIAN: "ASSIGNED",
  COURIER: "ASSIGNED",
  CUSTOMER: "OWN",
  CORPORATE_CUSTOMER: "OWN",
  PARTNER: "OWN",
  WHOLESALE_CUSTOMER: "OWN",
};

export function permissionsFor(role: Role): { codes: string[]; scopes: Record<string, PermissionScope> } {
  if (role === "SUPER_ADMIN") {
    const scopes = Object.fromEntries(RESOURCES.map((r) => [r, "PLATFORM" as PermissionScope]));
    return { codes: ["*"], scopes };
  }
  const m = matrix[role] ?? {};
  const codes: string[] = [];
  const scopes: Record<string, PermissionScope> = {};
  for (const [resource, actions] of Object.entries(m)) {
    for (const a of actions!) codes.push(`${resource}:${a}`);
    scopes[resource] = scopeOf[role] ?? "OWN";
  }
  if (role === "ADMIN") codes.push("workflow_templates:edit");
  return { codes: [...new Set(codes)], scopes };
}

export const roleLabels: Record<Role, ReturnType<typeof L>> = {
  GUEST: L("Qonaq", "Гость", "Guest"),
  CUSTOMER: L("Müştəri", "Клиент", "Customer"),
  CORPORATE_CUSTOMER: L("Korporativ müştəri", "Корпоративный клиент", "Corporate customer"),
  PARTNER: L("Partner", "Партнёр", "Partner"),
  WHOLESALE_CUSTOMER: L("Topdan alıcı", "Оптовый покупатель", "Wholesale buyer"),
  TECHNICIAN: L("Usta", "Мастер", "Technician"),
  OPERATOR: L("Operator", "Оператор", "Operator"),
  DISPATCHER: L("Dispetçer", "Диспетчер", "Dispatcher"),
  WAREHOUSE_EMPLOYEE: L("Anbar əməkdaşı", "Сотрудник склада", "Warehouse employee"),
  COURIER: L("Kuryer / Sürücü", "Курьер / Водитель", "Courier / Driver"),
  SALES_EMPLOYEE: L("Satış əməkdaşı", "Менеджер по продажам", "Sales employee"),
  ACCOUNTANT: L("Mühasib", "Бухгалтер", "Accountant"),
  MANAGER: L("Menecer", "Менеджер", "Manager"),
  ADMIN: L("Admin", "Администратор", "Admin"),
  SUPER_ADMIN: L("Super Admin", "Супер-администратор", "Super Admin"),
};

const descriptions: Partial<Record<Role, ReturnType<typeof L>>> = {
  OPERATOR: L("Sifarişləri qəbul edir və yoxlayır, telefon zəngi əsasında sifariş yaradır", "Принимает и проверяет заказы, создаёт заказы по звонку", "Receives and checks orders, creates orders from calls"),
  DISPATCHER: L("Ustaları təyin edir, iş cədvəlini idarə edir", "Назначает мастеров, управляет расписанием", "Assigns technicians and manages schedules"),
  WAREHOUSE_EMPLOYEE: L("Qəbul, buraxılış, transfer, sayım", "Приём, отпуск, перемещение, инвентаризация", "Receiving, issuing, transfers, stock counts"),
  COURIER: L("Yalnız özünə təyin olunmuş logistika tapşırıqları", "Только назначенные логистические задачи", "Only their assigned logistics tasks"),
  SALES_EMPLOYEE: L("Satış, kommersiya təklifləri, B2B sifarişləri", "Продажи, КП, B2B-заказы", "Sales, quotes, B2B orders"),
  ACCOUNTANT: L("Ödənişlər, fakturalar, kassa, maliyyə hesabatları", "Платежи, счета, касса, финотчёты", "Payments, invoices, cash, finance reports"),
  MANAGER: L("Filial əməliyyatları və hesabatları", "Операции и отчёты филиала", "Branch operations and reports"),
  ADMIN: L("Sistem konfiqurasiyası: kataloq, workflow, qiymət qaydaları, planlar", "Настройка системы: каталог, workflow, цены, планы", "System configuration: catalog, workflow, pricing, plans"),
  SUPER_ADMIN: L("Tam səlahiyyət: rollar, icazələr, təşkilat ayarları", "Полные права: роли, разрешения, настройки", "Full access: roles, permissions, organization settings"),
  TECHNICIAN: L("Servis işlərini icra edir", "Выполняет сервисные работы", "Performs service work"),
  CUSTOMER: L("Fərdi müştəri", "Частный клиент", "Individual customer"),
  CORPORATE_CUSTOMER: L("Çoxlu ünvanı və cihazı olan təşkilat", "Организация с множеством объектов", "Organization with many sites and devices"),
  PARTNER: L("Müqavilə əsasında işləyən tərəfdaş", "Партнёр по договору", "Contract-based partner"),
  WHOLESALE_CUSTOMER: L("Toplu məhsul alan şirkət", "Компания-оптовик", "Bulk buyer company"),
};

export const roleDefinitions = (
  [
    "OPERATOR", "DISPATCHER", "WAREHOUSE_EMPLOYEE", "COURIER", "SALES_EMPLOYEE", "ACCOUNTANT", "MANAGER", "ADMIN", "SUPER_ADMIN",
    "TECHNICIAN", "CUSTOMER", "CORPORATE_CUSTOMER", "PARTNER", "WHOLESALE_CUSTOMER",
  ] as Role[]
).map((code) => {
  const { codes, scopes } = permissionsFor(code);
  return {
    id: idFor(`role:${code}`),
    code,
    name: roleLabels[code],
    description: descriptions[code] ?? L(""),
    system: true,
    internal: ["OPERATOR", "DISPATCHER", "WAREHOUSE_EMPLOYEE", "COURIER", "SALES_EMPLOYEE", "ACCOUNTANT", "MANAGER", "ADMIN", "SUPER_ADMIN"].includes(code),
    permissions: codes.map((c) => ({ code: c, scope: scopes[c.split(":")[0]!] ?? "ORGANIZATION" })),
  };
});
