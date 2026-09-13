import type { LocalizedText, ServiceTypeCode, ExecutionForm } from "@sp/types";
import { L } from "../lib/i18n";
import { idFor } from "../lib/rng";

/** Avadanlıq kateqoriyaları, xidmət növləri, ixtisaslar, servislər və workflow şablonları (PRD §10, §11, §17) */

export const serviceTypeNames: Record<ServiceTypeCode, LocalizedText> = {
  INSTALLATION: L("Quraşdırma", "Установка", "Installation"),
  REMOVAL: L("Sökülmə", "Демонтаж", "Removal"),
  MEASUREMENT: L("Ölçü götürmə", "Замер", "Measurement"),
  DIAGNOSTICS: L("Diaqnostika", "Диагностика", "Diagnostics"),
  REPAIR: L("Təmir", "Ремонт", "Repair"),
  PERIODIC: L("Periodik servis", "Периодическое обслуживание", "Periodic service"),
};

export interface EquipmentCategoryRec {
  id: string;
  code: string;
  slug: string;
  name: LocalizedText;
  icon: string;
  serviceTypes: ServiceTypeCode[];
  skills: { id: string; name: LocalizedText }[];
  order: number;
  active: boolean;
}

const skill = (code: string, name: LocalizedText) => ({ id: idFor(`skill:${code}`), name });

export const equipmentCategories: EquipmentCategoryRec[] = [
  { id: idFor("eq:ac"), code: "AC", slug: "kondisioner", name: L("Kondisioner sistemləri", "Кондиционеры", "Air conditioning"), icon: "snowflake", serviceTypes: ["DIAGNOSTICS", "REPAIR", "INSTALLATION", "REMOVAL", "PERIODIC"], skills: [skill("gas-fill", L("Qaz doldurma", "Заправка фреоном", "Gas charging"))], order: 1, active: true },
  { id: idFor("eq:boiler"), code: "BOILER", slug: "kombi", name: L("Kombi sistemləri", "Котлы", "Boilers"), icon: "flame", serviceTypes: ["DIAGNOSTICS", "REPAIR", "INSTALLATION", "PERIODIC"], skills: [skill("flue", L("Baca sistemi", "Дымоход", "Flue systems"))], order: 2, active: true },
  { id: idFor("eq:heating"), code: "HEATING", slug: "istilik-sistemi", name: L("İstilik sistemləri", "Системы отопления", "Heating systems"), icon: "thermometer", serviceTypes: ["DIAGNOSTICS", "INSTALLATION", "REPAIR"], skills: [skill("piping", L("Borulama", "Разводка труб", "Piping"))], order: 3, active: true },
  { id: idFor("eq:pool"), code: "POOL", slug: "hovuz", name: L("Hovuz sistemləri", "Системы бассейнов", "Pool systems"), icon: "waves", serviceTypes: ["DIAGNOSTICS", "REPAIR", "INSTALLATION", "PERIODIC"], skills: [skill("pool-pump", L("Nasos", "Насос", "Pump")), skill("filtration", L("Filtrasiya", "Фильтрация", "Filtration")), skill("automation", L("Avtomatika", "Автоматика", "Automation"))], order: 4, active: true },
  { id: idFor("eq:pump"), code: "PUMP", slug: "nasos", name: L("Nasos və su sistemləri", "Насосы и водоснабжение", "Pumps & water systems"), icon: "droplets", serviceTypes: ["DIAGNOSTICS", "REPAIR", "INSTALLATION"], skills: [], order: 5, active: true },
  { id: idFor("eq:electric"), code: "ELECTRIC", slug: "elektrik", name: L("Elektrik avadanlıqları", "Электрооборудование", "Electrical equipment"), icon: "zap", serviceTypes: ["DIAGNOSTICS", "INSTALLATION", "REPAIR"], skills: [], order: 6, active: true },
  { id: idFor("eq:general"), code: "GENERAL", slug: "umumi", name: L("Ümumi", "Общее", "General"), icon: "ruler", serviceTypes: ["MEASUREMENT"], skills: [], order: 7, active: true },
];

export const EQ = {
  ac: equipmentCategories[0]!.id,
  boiler: equipmentCategories[1]!.id,
  heating: equipmentCategories[2]!.id,
  pool: equipmentCategories[3]!.id,
  pump: equipmentCategories[4]!.id,
  electric: equipmentCategories[5]!.id,
  general: equipmentCategories[6]!.id,
};

export interface SpecializationRec {
  id: string;
  categoryId: string;
  serviceType: ServiceTypeCode;
  requiresCertificate: boolean;
}

export const specializations: SpecializationRec[] = equipmentCategories.flatMap((c) =>
  c.serviceTypes.map((st) => ({
    id: idFor(`spec:${c.code}:${st}`),
    categoryId: c.id,
    serviceType: st,
    requiresCertificate: c.code === "BOILER" && (st === "INSTALLATION" || st === "REPAIR"),
  })),
);

export const spec = (cat: string, st: ServiceTypeCode) => idFor(`spec:${cat}:${st}`);

/* ------------------------------------------------------------------ */
/* Workflow şablonları (PRD §17.4 — A, B, C, D və əlavə şablonlar)       */
/* ------------------------------------------------------------------ */

type Cond = "ESTIMATE_APPROVED" | "ADVANCE_PAID" | "MATERIAL_RESERVED" | "PREVIOUS_COMPLETED";
type Req = "PHOTO" | "CHECKLIST" | "SIGNATURE" | "NOTE";

interface StageDef {
  key: string;
  name: LocalizedText;
  customerName: LocalizedText | null;
  type: string;
  executor: string;
  spec?: string | null;
  mandatory?: boolean;
  conditions?: Cond[];
  requirements?: Req[];
  checklist?: string[];
  sla?: number | null;
  parallel?: boolean;
}

function buildStages(tplKey: string, defs: StageDef[]) {
  return defs.map((d, i) => ({
    id: idFor(`tpl:${tplKey}:stage:${d.key}`),
    order: i + 1,
    name: d.name,
    customerName: d.customerName,
    type: d.type,
    executor: d.executor,
    executorSpecializationId: d.spec ?? null,
    mandatory: d.mandatory ?? true,
    startConditions: d.conditions ?? ["PREVIOUS_COMPLETED"],
    completionRequirements: d.requirements ?? [],
    checklist: d.checklist ?? [],
    slaMinutes: d.sla ?? null,
    parallelWithPrevious: d.parallel ?? false,
    notifyOnStart: d.customerName ? ["CUSTOMER"] : [],
    notifyOnComplete: d.customerName ? ["CUSTOMER"] : [],
  }));
}

const S = {
  operatorCheck: { key: "check", name: L("Operator yoxlaması", "Проверка оператором", "Operator check"), customerName: L("Sifariş qəbul edildi", "Заказ принят", "Order received"), type: "CHECK", executor: "OPERATOR", sla: 30 },
  assignment: { key: "assign", name: L("Usta təyinatı", "Назначение мастера", "Technician assignment"), customerName: L("Usta təyin olunur", "Назначается мастер", "Assigning a technician"), type: "ASSIGNMENT", executor: "DISPATCHER", sla: 60 },
  handoverPay: { key: "handover", name: L("Təhvil və ödəniş", "Сдача и оплата", "Handover & payment"), customerName: L("Təhvil və ödəniş", "Сдача и оплата", "Handover & payment"), type: "HANDOVER", executor: "TECHNICIAN", requirements: ["SIGNATURE"] as Req[], sla: 60 },
  warranty: { key: "warranty", name: L("Zəmanətin aktivləşməsi", "Активация гарантии", "Warranty activation"), customerName: L("Zəmanət aktivdir", "Гарантия активна", "Warranty active"), type: "WARRANTY", executor: "SYSTEM" },
  estimate: { key: "estimate", name: L("Smeta və müştəri təsdiqi", "Смета и согласование", "Estimate & approval"), customerName: L("Smetanın təsdiqi", "Согласование сметы", "Estimate approval"), type: "ESTIMATE_APPROVAL", executor: "CUSTOMER", sla: 24 * 60 },
  test: (spec?: string) => ({ key: "test", name: L("Test", "Тест", "Test"), customerName: L("Yoxlama", "Проверка", "Testing"), type: "TEST", executor: "TECHNICIAN", spec, requirements: ["CHECKLIST"] as Req[], checklist: ["Təzyiq / gərginlik normadadır", "Sızma yoxdur", "İş rejimləri yoxlanıldı"] }),
};

export interface TemplateRec {
  id: string;
  code: string;
  name: LocalizedText;
  executionForm: ExecutionForm;
  version: number;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  stages: ReturnType<typeof buildStages>;
  versions: { version: number; status: "DRAFT" | "ACTIVE" | "ARCHIVED"; createdAt: string; createdBy: string; stages?: ReturnType<typeof buildStages> }[];
  updatedAt: string;
}

const tpl = (key: string, code: string, name: LocalizedText, form: ExecutionForm, defs: StageDef[], version = 1): TemplateRec => ({
  id: idFor(`tpl:${key}`),
  code,
  name,
  executionForm: form,
  version,
  status: "ACTIVE",
  stages: buildStages(key, defs),
  versions: Array.from({ length: version }, (_, i) => ({
    version: i + 1,
    status: i + 1 === version ? ("ACTIVE" as const) : ("ARCHIVED" as const),
    createdAt: new Date(Date.now() - (version - i) * 20 * 86400_000).toISOString(),
    createdBy: "Admin İstifadəçi",
  })),
  updatedAt: new Date(Date.now() - 5 * 86400_000).toISOString(),
});

export const templates: TemplateRec[] = [
  // A — Kondisioner quraşdırma — Ünvanda
  tpl("ac-install-onsite", "TPL-A", L("Kondisioner quraşdırma — Ünvanda", "Установка кондиционера — На адресе", "AC installation — On site"), "ON_SITE", [
    S.operatorCheck,
    { key: "measure", name: L("Ölçü götürmə", "Замер", "Measurement"), customerName: L("Ölçü götürmə", "Замер", "Measurement"), type: "MEASUREMENT", executor: "TECHNICIAN", spec: spec("GENERAL", "MEASUREMENT"), requirements: ["PHOTO"], sla: 48 * 60 },
    { key: "material", name: L("Material hesablanması", "Расчёт материалов", "Material calculation"), customerName: null, type: "MATERIAL_CALC", executor: "TECHNICIAN", spec: spec("GENERAL", "MEASUREMENT"), sla: 4 * 60 },
    S.estimate,
    { key: "warehouse", name: L("Anbar hazırlığı", "Подготовка склада", "Warehouse preparation"), customerName: null, type: "WAREHOUSE_PREP", executor: "WAREHOUSE_EMPLOYEE", conditions: ["ESTIMATE_APPROVED"], sla: 8 * 60 },
    { key: "delivery", name: L("Çatdırılma", "Доставка", "Delivery"), customerName: L("Avadanlıq çatdırılır", "Доставка оборудования", "Equipment delivery"), type: "LOGISTICS", executor: "COURIER", sla: 24 * 60 },
    { key: "install", name: L("Quraşdırma", "Установка", "Installation"), customerName: L("Quraşdırma", "Установка", "Installation"), type: "EXECUTION", executor: "TECHNICIAN", spec: spec("AC", "INSTALLATION"), requirements: ["PHOTO", "CHECKLIST"], checklist: ["Daxili blok bərkidildi", "Xarici blok bərkidildi", "Vakuum çəkildi", "Drenaj yoxlanıldı"], sla: 6 * 60 },
    { key: "electric", name: L("Elektrik qoşulması", "Электроподключение", "Electrical connection"), customerName: null, type: "EXECUTION", executor: "TECHNICIAN", spec: spec("ELECTRIC", "INSTALLATION"), mandatory: false, sla: 3 * 60 },
    { key: "final", name: L("Yekun yoxlama", "Финальная проверка", "Final check"), customerName: null, type: "FINAL_CHECK", executor: "TECHNICIAN", spec: spec("AC", "INSTALLATION"), requirements: ["CHECKLIST"], checklist: ["Soyutma rejimi", "İsitmə rejimi", "Səs səviyyəsi normada"] },
    S.handoverPay,
    S.warranty,
  ], 3),
  // B — Kondisioner təmiri — Ünvanda
  tpl("repair-onsite", "TPL-B", L("Təmir — Ünvanda", "Ремонт — На адресе", "Repair — On site"), "ON_SITE", [
    S.operatorCheck,
    S.assignment,
    { key: "arrival", name: L("Gəliş", "Прибытие", "Arrival"), customerName: L("Usta yoldadır", "Мастер в пути", "Technician on the way"), type: "ARRIVAL", executor: "TECHNICIAN", sla: 48 * 60 },
    { key: "diagnostics", name: L("Diaqnostika", "Диагностика", "Diagnostics"), customerName: L("Diaqnostika", "Диагностика", "Diagnostics"), type: "DIAGNOSTICS", executor: "TECHNICIAN", requirements: ["PHOTO"], sla: 2 * 60 },
    S.estimate,
    { key: "part", name: L("Hissə gözlənilməsi", "Ожидание запчасти", "Waiting for part"), customerName: L("Ehtiyat hissəsi gözlənilir", "Ожидается запчасть", "Waiting for spare part"), type: "WAIT_PART", executor: "WAREHOUSE_EMPLOYEE", mandatory: false, conditions: ["ESTIMATE_APPROVED"] },
    { key: "repair", name: L("Təmir", "Ремонт", "Repair"), customerName: L("Təmir", "Ремонт", "Repair"), type: "EXECUTION", executor: "TECHNICIAN", conditions: ["ESTIMATE_APPROVED"], requirements: ["PHOTO"], sla: 4 * 60 },
    S.test(),
    S.handoverPay,
    S.warranty,
  ], 2),
  // C — Kombi təmiri — Servis mərkəzinə gətirmə
  tpl("repair-carryin", "TPL-C", L("Təmir — Servis mərkəzinə gətirmə", "Ремонт — В сервисный центр", "Repair — Carry-in"), "CARRY_IN", [
    { key: "intake", name: L("Qəbul aktı", "Акт приёма", "Intake act"), customerName: L("Cihaz qəbul edildi", "Устройство принято", "Device received"), type: "INTAKE", executor: "OPERATOR", requirements: ["PHOTO", "SIGNATURE"], sla: 30 },
    { key: "diagnostics", name: L("Diaqnostika", "Диагностика", "Diagnostics"), customerName: L("Diaqnostika", "Диагностика", "Diagnostics"), type: "DIAGNOSTICS", executor: "TECHNICIAN", sla: 24 * 60 },
    S.estimate,
    { key: "repair", name: L("Təmir", "Ремонт", "Repair"), customerName: L("Təmir", "Ремонт", "Repair"), type: "EXECUTION", executor: "TECHNICIAN", conditions: ["ESTIMATE_APPROVED"], sla: 48 * 60 },
    S.test(),
    { key: "ready", name: L("Hazırdır (müştəriyə bildiriş)", "Готово (уведомление клиенту)", "Ready (notify customer)"), customerName: L("Cihaz hazırdır", "Устройство готово", "Device ready"), type: "READY_NOTICE", executor: "SYSTEM" },
    { key: "handover", name: L("Müştəriyə təhvil və ödəniş", "Выдача клиенту и оплата", "Handover to customer & payment"), customerName: L("Təhvil və ödəniş", "Выдача и оплата", "Handover & payment"), type: "HANDOVER", executor: "OPERATOR", requirements: ["SIGNATURE"] },
    S.warranty,
  ], 1),
  // D — Kombi təmiri — Götürmə və çatdırma
  tpl("repair-pickup", "TPL-D", L("Təmir — Götürmə və çatdırma", "Ремонт — Забор и доставка", "Repair — Pickup & delivery"), "PICKUP_DELIVERY", [
    S.operatorCheck,
    { key: "pickup", name: L("Götürmə və qəbul aktı", "Забор и акт приёма", "Pickup & intake act"), customerName: L("Cihaz götürülür", "Забор устройства", "Device pickup"), type: "LOGISTICS", executor: "COURIER", requirements: ["PHOTO", "SIGNATURE"], sla: 24 * 60 },
    { key: "transport", name: L("Servis mərkəzinə daşınma", "Доставка в сервисный центр", "Transport to service center"), customerName: L("Servis mərkəzinə daşınır", "Везём в сервисный центр", "On the way to service center"), type: "LOGISTICS", executor: "COURIER", sla: 8 * 60 },
    { key: "diagnostics", name: L("Diaqnostika", "Диагностика", "Diagnostics"), customerName: L("Diaqnostika", "Диагностика", "Diagnostics"), type: "DIAGNOSTICS", executor: "TECHNICIAN", sla: 24 * 60 },
    S.estimate,
    { key: "repair", name: L("Təmir", "Ремонт", "Repair"), customerName: L("Təmir", "Ремонт", "Repair"), type: "EXECUTION", executor: "TECHNICIAN", conditions: ["ESTIMATE_APPROVED"], sla: 48 * 60 },
    S.test(),
    { key: "return", name: L("Geri çatdırılma", "Обратная доставка", "Return delivery"), customerName: L("Geri çatdırılır", "Доставка обратно", "Delivering back"), type: "LOGISTICS", executor: "COURIER", sla: 24 * 60 },
    { key: "handover", name: L("Təhvil və ödəniş", "Сдача и оплата", "Handover & payment"), customerName: L("Təhvil və ödəniş", "Сдача и оплата", "Handover & payment"), type: "HANDOVER", executor: "COURIER", requirements: ["SIGNATURE"] },
    S.warranty,
  ], 1),
  // Periodik servis — Ünvanda
  tpl("periodic-onsite", "TPL-P", L("Periodik servis — Ünvanda", "Периодическое обслуживание — На адресе", "Periodic service — On site"), "ON_SITE", [
    S.operatorCheck,
    S.assignment,
    { key: "arrival", name: L("Gəliş", "Прибытие", "Arrival"), customerName: L("Usta yoldadır", "Мастер в пути", "Technician on the way"), type: "ARRIVAL", executor: "TECHNICIAN" },
    { key: "service", name: L("Servis işləri", "Сервисные работы", "Service works"), customerName: L("Servis işləri", "Сервисные работы", "Service works"), type: "EXECUTION", executor: "TECHNICIAN", requirements: ["CHECKLIST", "PHOTO"], checklist: ["Filtrlər təmizləndi", "Drenaj yoxlanıldı", "Qaz təzyiqi ölçüldü", "Elektrik birləşmələri yoxlanıldı"] },
    S.handoverPay,
    S.warranty,
  ], 1),
  // Quraşdırma — Ünvanda (ümumi, məsələn kombi, nasos)
  tpl("install-onsite", "TPL-I", L("Quraşdırma — Ünvanda (ümumi)", "Установка — На адресе (общая)", "Installation — On site (generic)"), "ON_SITE", [
    S.operatorCheck,
    S.assignment,
    { key: "arrival", name: L("Gəliş", "Прибытие", "Arrival"), customerName: L("Usta yoldadır", "Мастер в пути", "Technician on the way"), type: "ARRIVAL", executor: "TECHNICIAN" },
    { key: "install", name: L("Quraşdırma", "Установка", "Installation"), customerName: L("Quraşdırma", "Установка", "Installation"), type: "EXECUTION", executor: "TECHNICIAN", requirements: ["PHOTO", "CHECKLIST"], checklist: ["Montaj tamamlandı", "Birləşmələr yoxlanıldı", "İlk işə salma"] },
    S.test(),
    S.handoverPay,
    S.warranty,
  ], 1),
  // Ölçü götürmə — Ünvanda
  tpl("measure-onsite", "TPL-M", L("Ölçü götürmə — Ünvanda", "Замер — На адресе", "Measurement — On site"), "ON_SITE", [
    S.operatorCheck,
    S.assignment,
    { key: "arrival", name: L("Gəliş", "Прибытие", "Arrival"), customerName: L("Usta yoldadır", "Мастер в пути", "Technician on the way"), type: "ARRIVAL", executor: "TECHNICIAN" },
    { key: "measure", name: L("Ölçü götürmə", "Замер", "Measurement"), customerName: L("Ölçü götürmə", "Замер", "Measurement"), type: "MEASUREMENT", executor: "TECHNICIAN", requirements: ["PHOTO", "NOTE"] },
    { key: "handover", name: L("Hesabatın təqdimi", "Передача отчёта", "Report handover"), customerName: L("Ölçü hesabatı", "Отчёт о замере", "Measurement report"), type: "HANDOVER", executor: "TECHNICIAN" },
  ], 1),
];

export const TPL = {
  acInstall: templates[0]!.id,
  repairOnSite: templates[1]!.id,
  repairCarryIn: templates[2]!.id,
  repairPickup: templates[3]!.id,
  periodic: templates[4]!.id,
  install: templates[5]!.id,
  measure: templates[6]!.id,
};

/* ------------------------------------------------------------------ */
/* Servislər = Kateqoriya × Xidmət növü                                */
/* ------------------------------------------------------------------ */

export interface ServiceRec {
  id: string;
  slug: string;
  name: LocalizedText;
  shortDescription: LocalizedText;
  description: LocalizedText;
  categoryId: string;
  serviceType: ServiceTypeCode;
  executionForms: ExecutionForm[];
  priceModel: "FIXED" | "STARTING_FROM" | "ESTIMATE_BASED";
  priceCents: number | null;
  specializationIds: string[];
  templateIds: Partial<Record<ExecutionForm, string>>;
  durationMinutes: number;
  warrantyMonths: number;
  imageTone: string;
  icon: string;
  faq: { q: LocalizedText; a: LocalizedText }[];
  problems: { code: string; label: LocalizedText }[];
  assignmentMethod: "CUSTOMER_CHOICE" | "DISPATCHER" | "AUTO";
  slotMinutes: number;
  travelBufferMinutes: number;
  rating: number;
  completedCount: number;
  active: boolean;
}

const acProblems = [
  { code: "NOT_COOLING", label: L("Soyutmur", "Не охлаждает", "Not cooling") },
  { code: "LEAKING", label: L("Su axıdır", "Течёт вода", "Leaking water") },
  { code: "NOISE", label: L("Səs-küy salır", "Шумит", "Making noise") },
  { code: "NOT_TURNING_ON", label: L("İşə düşmür", "Не включается", "Won't turn on") },
  { code: "ERROR_CODE", label: L("Ekranda xəta kodu", "Код ошибки на дисплее", "Error code on display") },
  { code: "BAD_SMELL", label: L("Pis qoxu", "Неприятный запах", "Bad smell") },
];
const boilerProblems = [
  { code: "NO_HOT_WATER", label: L("İsti su vermir", "Нет горячей воды", "No hot water") },
  { code: "NO_HEATING", label: L("Radiatorları qızdırmır", "Не греет радиаторы", "Radiators not heating") },
  { code: "PRESSURE_DROP", label: L("Təzyiq düşür", "Падает давление", "Pressure drops") },
  { code: "IGNITION", label: L("Alışmır", "Не зажигается", "Won't ignite") },
  { code: "ERROR_CODE", label: L("Xəta kodu", "Код ошибки", "Error code") },
];
const genericProblems = [
  { code: "NOT_WORKING", label: L("İşləmir", "Не работает", "Not working") },
  { code: "NOISE", label: L("Səs-küy", "Шум", "Noise") },
  { code: "LEAK", label: L("Sızma", "Утечка", "Leak") },
  { code: "OTHER", label: L("Digər", "Другое", "Other") },
];

const faqCommon = [
  { q: L("Diaqnostika pulludur?", "Диагностика платная?", "Is diagnostics paid?"), a: L("Smetanı qəbul etsəniz, diaqnostika haqqı yekun məbləğə daxil olunur. Smetadan imtina etdikdə standart halda haqq tutulmur.", "Если вы принимаете смету, диагностика входит в итоговую сумму. При отказе плата по умолчанию не взимается.", "If you accept the estimate, diagnostics is included in the total. If you decline, no fee is charged by default.") },
  { q: L("Zəmanət verilirmi?", "Даёте гарантию?", "Is there a warranty?"), a: L("Bəli, görülən işə və quraşdırılan hissələrə zəmanət verilir. Pro və Premium üzvlərə uzadılmış zəmanət tətbiq olunur.", "Да, на работы и установленные запчасти. Для Pro и Premium гарантия продлевается.", "Yes, on work and installed parts. Pro and Premium members get an extended warranty.") },
  { q: L("Ustanı özüm seçə bilərəmmi?", "Могу ли я выбрать мастера?", "Can I choose the technician?"), a: L("Bəli, sifariş zamanı uyğun ustalar siyahısından seçə və ya seçimi dispetçerə həvalə edə bilərsiniz.", "Да, можно выбрать из подходящих мастеров или доверить выбор диспетчеру.", "Yes, choose from matching technicians or let the dispatcher decide.") },
];

type SvcDef = {
  key: string;
  slug: string;
  cat: keyof typeof EQ;
  catCode: string;
  st: ServiceTypeCode;
  name: LocalizedText;
  short: LocalizedText;
  forms: ExecutionForm[];
  model: ServiceRec["priceModel"];
  price: number | null;
  duration: number;
  warranty: number;
  tone: string;
  icon: string;
  problems: ServiceRec["problems"];
  tplMap: Partial<Record<ExecutionForm, string>>;
  specs?: string[];
  assignment?: ServiceRec["assignmentMethod"];
  rating: number;
  completed: number;
};

const defs: SvcDef[] = [
  { key: "ac-install", slug: "kondisioner-qurasdirma", cat: "ac", catCode: "AC", st: "INSTALLATION", name: L("Kondisioner quraşdırılması", "Установка кондиционера", "Air conditioner installation"), short: L("Ölçü, material, quraşdırma və vakuum — bir sifarişdə", "Замер, материалы, монтаж и вакуумирование — в одном заказе", "Measurement, materials, mounting and vacuum — in one order"), forms: ["ON_SITE"], model: "STARTING_FROM", price: 8000, duration: 180, warranty: 12, tone: "sky", icon: "snowflake", problems: [], tplMap: { ON_SITE: TPL.acInstall }, specs: [spec("AC", "INSTALLATION")], rating: 4.8, completed: 1240 },
  { key: "ac-repair", slug: "kondisioner-temiri", cat: "ac", catCode: "AC", st: "REPAIR", name: L("Kondisioner təmiri", "Ремонт кондиционера", "Air conditioner repair"), short: L("Diaqnostika, smeta təsdiqi və təmir — ünvanda və ya servis mərkəzində", "Диагностика, смета и ремонт — на адресе или в сервисе", "Diagnostics, estimate and repair — on site or in our center"), forms: ["ON_SITE", "CARRY_IN", "PICKUP_DELIVERY"], model: "ESTIMATE_BASED", price: null, duration: 120, warranty: 6, tone: "cyan", icon: "wrench", problems: acProblems, tplMap: { ON_SITE: TPL.repairOnSite, CARRY_IN: TPL.repairCarryIn, PICKUP_DELIVERY: TPL.repairPickup }, specs: [spec("AC", "REPAIR")], rating: 4.7, completed: 2310 },
  { key: "ac-diag", slug: "kondisioner-diaqnostika", cat: "ac", catCode: "AC", st: "DIAGNOSTICS", name: L("Kondisioner diaqnostikası", "Диагностика кондиционера", "Air conditioner diagnostics"), short: L("Problemin səbəbini tapırıq və dəqiq smeta hazırlayırıq", "Находим причину и готовим точную смету", "We find the cause and prepare an exact estimate"), forms: ["ON_SITE", "CARRY_IN"], model: "FIXED", price: 2500, duration: 60, warranty: 0, tone: "indigo", icon: "stethoscope", problems: acProblems, tplMap: { ON_SITE: TPL.repairOnSite, CARRY_IN: TPL.repairCarryIn }, specs: [spec("AC", "DIAGNOSTICS")], rating: 4.8, completed: 980 },
  { key: "ac-periodic", slug: "kondisioner-periodik-servis", cat: "ac", catCode: "AC", st: "PERIODIC", name: L("Kondisionerin təmizlənməsi və periodik servisi", "Чистка и обслуживание кондиционера", "Air conditioner cleaning & maintenance"), short: L("Filtr, drenaj, qaz təzyiqi və elektrik yoxlaması", "Фильтры, дренаж, давление фреона и электрика", "Filters, drain, gas pressure and electrical check"), forms: ["ON_SITE"], model: "FIXED", price: 4500, duration: 60, warranty: 3, tone: "teal", icon: "sparkles", problems: [], tplMap: { ON_SITE: TPL.periodic }, specs: [spec("AC", "PERIODIC")], assignment: "CUSTOMER_CHOICE", rating: 4.9, completed: 3150 },
  { key: "ac-removal", slug: "kondisioner-sokulme", cat: "ac", catCode: "AC", st: "REMOVAL", name: L("Kondisionerin sökülməsi", "Демонтаж кондиционера", "Air conditioner removal"), short: L("Freonun toplanması ilə ehtiyatlı sökülmə", "Аккуратный демонтаж со сбором фреона", "Careful removal with refrigerant recovery"), forms: ["ON_SITE"], model: "FIXED", price: 5000, duration: 90, warranty: 0, tone: "slate", icon: "package-open", problems: [], tplMap: { ON_SITE: TPL.install }, specs: [spec("AC", "REMOVAL")], rating: 4.6, completed: 410 },
  { key: "boiler-install", slug: "kombi-qurasdirma", cat: "boiler", catCode: "BOILER", st: "INSTALLATION", name: L("Kombinin quraşdırılması", "Установка котла", "Boiler installation"), short: L("Sertifikatlı ustalarla qaz və baca bağlantısı", "Подключение газа и дымохода сертифицированными мастерами", "Gas and flue connection by certified technicians"), forms: ["ON_SITE"], model: "STARTING_FROM", price: 12000, duration: 240, warranty: 12, tone: "orange", icon: "flame", problems: [], tplMap: { ON_SITE: TPL.install }, specs: [spec("BOILER", "INSTALLATION")], rating: 4.8, completed: 760 },
  { key: "boiler-repair", slug: "kombi-temiri", cat: "boiler", catCode: "BOILER", st: "REPAIR", name: L("Kombi təmiri", "Ремонт котла", "Boiler repair"), short: L("Ünvanda, servis mərkəzində və ya götürmə-çatdırma ilə", "На адресе, в сервисе или с забором и доставкой", "On site, carry-in or pickup & delivery"), forms: ["ON_SITE", "CARRY_IN", "PICKUP_DELIVERY"], model: "ESTIMATE_BASED", price: null, duration: 120, warranty: 6, tone: "amber", icon: "wrench", problems: boilerProblems, tplMap: { ON_SITE: TPL.repairOnSite, CARRY_IN: TPL.repairCarryIn, PICKUP_DELIVERY: TPL.repairPickup }, specs: [spec("BOILER", "REPAIR")], rating: 4.7, completed: 1890 },
  { key: "boiler-diag", slug: "kombi-diaqnostika", cat: "boiler", catCode: "BOILER", st: "DIAGNOSTICS", name: L("Kombi diaqnostikası", "Диагностика котла", "Boiler diagnostics"), short: L("Elektron idarəetmə, alışma və təzyiq sistemi yoxlanışı", "Проверка электроники, розжига и давления", "Electronics, ignition and pressure check"), forms: ["ON_SITE", "CARRY_IN", "PICKUP_DELIVERY"], model: "FIXED", price: 3000, duration: 60, warranty: 0, tone: "rose", icon: "stethoscope", problems: boilerProblems, tplMap: { ON_SITE: TPL.repairOnSite, CARRY_IN: TPL.repairCarryIn, PICKUP_DELIVERY: TPL.repairPickup }, specs: [spec("BOILER", "DIAGNOSTICS")], rating: 4.7, completed: 650 },
  { key: "boiler-periodic", slug: "kombi-periodik-servis", cat: "boiler", catCode: "BOILER", st: "PERIODIC", name: L("Kombinin illik baxışı", "Ежегодное обслуживание котла", "Annual boiler service"), short: L("Qış öncəsi təhlükəsizlik və səmərəlilik yoxlaması", "Проверка безопасности и эффективности перед зимой", "Pre-winter safety and efficiency check"), forms: ["ON_SITE"], model: "FIXED", price: 6000, duration: 90, warranty: 3, tone: "orange", icon: "sparkles", problems: [], tplMap: { ON_SITE: TPL.periodic }, specs: [spec("BOILER", "PERIODIC")], rating: 4.9, completed: 1420 },
  { key: "heating-install", slug: "istilik-sistemi-qurasdirma", cat: "heating", catCode: "HEATING", st: "INSTALLATION", name: L("İstilik sisteminin quraşdırılması", "Монтаж системы отопления", "Heating system installation"), short: L("Radiator, kollektor və borulama işləri", "Радиаторы, коллекторы и разводка труб", "Radiators, manifolds and piping"), forms: ["ON_SITE"], model: "ESTIMATE_BASED", price: null, duration: 480, warranty: 24, tone: "red", icon: "thermometer", problems: [], tplMap: { ON_SITE: TPL.acInstall }, specs: [spec("HEATING", "INSTALLATION")], rating: 4.6, completed: 220 },
  { key: "pool-periodic", slug: "hovuz-periodik-servis", cat: "pool", catCode: "POOL", st: "PERIODIC", name: L("Hovuzun periodik servisi", "Обслуживание бассейна", "Pool maintenance"), short: L("Filtrasiya, nasos və avtomatika yoxlaması", "Фильтрация, насос и автоматика", "Filtration, pump and automation"), forms: ["ON_SITE"], model: "FIXED", price: 9000, duration: 120, warranty: 1, tone: "cyan", icon: "waves", problems: [], tplMap: { ON_SITE: TPL.periodic }, specs: [spec("POOL", "PERIODIC")], rating: 4.8, completed: 310 },
  { key: "pool-repair", slug: "hovuz-temiri", cat: "pool", catCode: "POOL", st: "REPAIR", name: L("Hovuz avadanlığının təmiri", "Ремонт оборудования бассейна", "Pool equipment repair"), short: L("Nasos, filtr və dozaj sistemləri", "Насосы, фильтры и дозирование", "Pumps, filters and dosing systems"), forms: ["ON_SITE", "PICKUP_DELIVERY"], model: "ESTIMATE_BASED", price: null, duration: 150, warranty: 6, tone: "blue", icon: "wrench", problems: genericProblems, tplMap: { ON_SITE: TPL.repairOnSite, PICKUP_DELIVERY: TPL.repairPickup }, specs: [spec("POOL", "REPAIR")], rating: 4.6, completed: 180 },
  { key: "pump-repair", slug: "nasos-temiri", cat: "pump", catCode: "PUMP", st: "REPAIR", name: L("Nasos təmiri", "Ремонт насоса", "Pump repair"), short: L("Dərinlik, sirkulyasiya və drenaj nasosları", "Глубинные, циркуляционные и дренажные насосы", "Well, circulation and drainage pumps"), forms: ["ON_SITE", "CARRY_IN"], model: "ESTIMATE_BASED", price: null, duration: 120, warranty: 6, tone: "emerald", icon: "droplets", problems: genericProblems, tplMap: { ON_SITE: TPL.repairOnSite, CARRY_IN: TPL.repairCarryIn }, specs: [spec("PUMP", "REPAIR")], rating: 4.7, completed: 540 },
  { key: "electric-install", slug: "elektrik-qurasdirma", cat: "electric", catCode: "ELECTRIC", st: "INSTALLATION", name: L("Elektrik qoşulması və quraşdırma", "Электромонтаж и подключение", "Electrical installation"), short: L("Ayrıca xətt, avtomat və torpaqlama", "Отдельная линия, автомат и заземление", "Dedicated line, breaker and grounding"), forms: ["ON_SITE"], model: "STARTING_FROM", price: 3500, duration: 90, warranty: 12, tone: "yellow", icon: "zap", problems: [], tplMap: { ON_SITE: TPL.install }, specs: [spec("ELECTRIC", "INSTALLATION")], rating: 4.8, completed: 870 },
  { key: "measurement", slug: "olcu-goturme", cat: "general", catCode: "GENERAL", st: "MEASUREMENT", name: L("Ölçü götürmə", "Замер", "On-site measurement"), short: L("Quraşdırmadan əvvəl ölçü və texniki rəy", "Замер и техническое заключение перед монтажом", "Measurement and technical assessment before installation"), forms: ["ON_SITE"], model: "FIXED", price: 1500, duration: 45, warranty: 0, tone: "violet", icon: "ruler", problems: [], tplMap: { ON_SITE: TPL.measure }, specs: [spec("GENERAL", "MEASUREMENT")], rating: 4.9, completed: 1600 },
];

export const services: ServiceRec[] = defs.map((d) => ({
  id: idFor(`service:${d.key}`),
  slug: d.slug,
  name: d.name,
  shortDescription: d.short,
  description: L(
    `${d.name.az} xidməti platformanın workflow mühərriki ilə mərhələ-mərhələ icra olunur: sifarişin yoxlanılması, usta təyinatı, ${d.model === "ESTIMATE_BASED" ? "diaqnostika və smetanın təsdiqi, " : ""}icra, test və təhvil. Hər mərhələni kabinetinizdən izləyə bilərsiniz. Bütün sənədlər (servis aktı, faktura, fiskal çek, zəmanət) şirkətin adından verilir.`,
    `Услуга «${d.name.ru}» выполняется поэтапно: проверка заказа, назначение мастера, ${d.model === "ESTIMATE_BASED" ? "диагностика и согласование сметы, " : ""}работы, тест и сдача. Каждый этап виден в личном кабинете. Все документы выдаются от имени компании.`,
    `${d.name.en} is delivered stage by stage: order check, technician assignment, ${d.model === "ESTIMATE_BASED" ? "diagnostics and estimate approval, " : ""}execution, testing and handover. Track every stage in your account. All documents are issued in the company's name.`,
  ),
  categoryId: EQ[d.cat],
  serviceType: d.st,
  executionForms: d.forms,
  priceModel: d.model,
  priceCents: d.price,
  specializationIds: d.specs ?? [spec(d.catCode, d.st)],
  templateIds: d.tplMap,
  durationMinutes: d.duration,
  warrantyMonths: d.warranty,
  imageTone: d.tone,
  icon: d.icon,
  faq: faqCommon,
  problems: d.problems,
  assignmentMethod: d.assignment ?? "DISPATCHER",
  slotMinutes: d.duration <= 60 ? 60 : d.duration <= 120 ? 120 : 180,
  travelBufferMinutes: 30,
  rating: d.rating,
  completedCount: d.completed,
  active: true,
}));

export const SVC = Object.fromEntries(defs.map((d, i) => [d.key, services[i]!.id])) as Record<string, string>;
