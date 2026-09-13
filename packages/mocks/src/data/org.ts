import type { LocalizedText } from "@sp/types";
import { L } from "../lib/i18n";
import { idFor } from "../lib/rng";
import { daysAgo, hoursFromNow } from "../lib/time";

export const TENANT_ID = idFor("tenant:besqardas");

export const branding = {
  tenantId: TENANT_ID,
  companyName: "besqardasServis.az",
  legalName: "Beş Qardaş Servis MMC",
  domain: "besqardasservis.az",
  adminDomain: "admin.besqardasservis.az",
  logoText: "besqardas",
  logoUrl: null as string | null,
  faviconUrl: null as string | null,
  colors: { primary: "#0b5cad", accent: "#f59e0b", secondary: "#0f766e" },
  contacts: {
    phone: "+994 12 555 55 55",
    hotline: "*5555",
    email: "info@besqardasservis.az",
    whatsapp: "+994 50 555 55 55",
    address: "Bakı, Nərimanov r., Təbriz küç. 44",
  },
  social: { instagram: "https://instagram.com/", facebook: "https://facebook.com/" } as Record<string, string>,
  voen: "1403456781",
  documentFooter: "Beş Qardaş Servis MMC · VÖEN 1403456781 · Bakı, Təbriz küç. 44",
};

const hours = (from = "09:00", to = "19:00", saturday = true) =>
  [0, 1, 2, 3, 4, 5, 6].map((day) => ({
    day,
    from: day === 6 && !saturday ? "" : day === 0 ? "" : from,
    to: day === 6 && !saturday ? "" : day === 0 ? "" : day === 6 ? "15:00" : to,
    closed: day === 0 || (day === 6 && !saturday),
  }));

export interface BranchRec {
  id: string;
  code: string;
  name: LocalizedText;
  city: string;
  address: string;
  location: { lat: number; lng: number };
  phone: string;
  email: string;
  workingHours: ReturnType<typeof hours>;
  hasServiceCenter: boolean;
  managerName: string;
  active: boolean;
}

export const branches: BranchRec[] = [
  {
    id: idFor("branch:narimanov"),
    code: "BAK-N",
    name: L("Bakı — Nərimanov (Mərkəz)", "Баку — Нариманов (Центр)", "Baku — Narimanov (HQ)"),
    city: "Bakı",
    address: "Təbriz küç. 44, Nərimanov r.",
    location: { lat: 40.4093, lng: 49.8671 },
    phone: "+994 12 555 55 55",
    email: "narimanov@besqardasservis.az",
    workingHours: hours(),
    hasServiceCenter: true,
    managerName: "Fərid Quliyev",
    active: true,
  },
  {
    id: idFor("branch:yasamal"),
    code: "BAK-Y",
    name: L("Bakı — Yasamal", "Баку — Ясамал", "Baku — Yasamal"),
    city: "Bakı",
    address: "Şərifzadə küç. 12, Yasamal r.",
    location: { lat: 40.3812, lng: 49.8215 },
    phone: "+994 12 555 55 56",
    email: "yasamal@besqardasservis.az",
    workingHours: hours(),
    hasServiceCenter: false,
    managerName: "Leyla Rzayeva",
    active: true,
  },
  {
    id: idFor("branch:sumqayit"),
    code: "SUM",
    name: L("Sumqayıt", "Сумгаит", "Sumgait"),
    city: "Sumqayıt",
    address: "Sülh küç. 7, 9-cu mikrorayon",
    location: { lat: 40.5897, lng: 49.6686 },
    phone: "+994 18 655 55 55",
    email: "sumqayit@besqardasservis.az",
    workingHours: hours("09:00", "18:00"),
    hasServiceCenter: false,
    managerName: "Tural Abbasov",
    active: true,
  },
  {
    id: idFor("branch:ganja"),
    code: "GNC",
    name: L("Gəncə", "Гянджа", "Ganja"),
    city: "Gəncə",
    address: "Atatürk pr. 130",
    location: { lat: 40.6828, lng: 46.3606 },
    phone: "+994 22 255 55 55",
    email: "ganja@besqardasservis.az",
    workingHours: hours("09:00", "18:00", false),
    hasServiceCenter: true,
    managerName: "Səbinə Hüseynova",
    active: true,
  },
];

export const BR = {
  narimanov: branches[0]!.id,
  yasamal: branches[1]!.id,
  sumqayit: branches[2]!.id,
  ganja: branches[3]!.id,
};

const square = (lat: number, lng: number, d = 0.03) => [
  { lat: lat - d, lng: lng - d },
  { lat: lat - d, lng: lng + d },
  { lat: lat + d, lng: lng + d },
  { lat: lat + d, lng: lng - d },
];

export const zones = [
  { id: idFor("zone:bak-center"), name: L("Bakı — Mərkəz", "Баку — Центр", "Baku — Center"), branchId: BR.narimanov, city: "Bakı", polygon: square(40.405, 49.865), outOfCity: false, active: true },
  { id: idFor("zone:bak-west"), name: L("Bakı — Qərb (Yasamal, Binəqədi)", "Баку — Запад (Ясамал, Бинагади)", "Baku — West (Yasamal, Binagadi)"), branchId: BR.yasamal, city: "Bakı", polygon: square(40.39, 49.81), outOfCity: false, active: true },
  { id: idFor("zone:bak-east"), name: L("Bakı — Şərq (Xətai, Suraxanı)", "Баку — Восток (Хатаи, Сураханы)", "Baku — East (Khatai, Surakhani)"), branchId: BR.narimanov, city: "Bakı", polygon: square(40.39, 49.95), outOfCity: false, active: true },
  { id: idFor("zone:absheron"), name: L("Abşeron qəsəbələri", "Посёлки Абшерона", "Absheron settlements"), branchId: BR.narimanov, city: "Bakı", polygon: square(40.47, 50.0, 0.06), outOfCity: true, active: true },
  { id: idFor("zone:sumqayit"), name: L("Sumqayıt", "Сумгаит", "Sumgait"), branchId: BR.sumqayit, city: "Sumqayıt", polygon: square(40.59, 49.67), outOfCity: false, active: true },
  { id: idFor("zone:ganja"), name: L("Gəncə", "Гянджа", "Ganja"), branchId: BR.ganja, city: "Gəncə", polygon: square(40.68, 46.36), outOfCity: false, active: true },
];

export const ZN = {
  center: zones[0]!.id,
  west: zones[1]!.id,
  east: zones[2]!.id,
  absheron: zones[3]!.id,
  sumqayit: zones[4]!.id,
  ganja: zones[5]!.id,
};

export const warehouseGroups = [
  { id: idFor("wg:baku"), name: L("Bakı anbarları", "Склады Баку", "Baku warehouses"), costingMethod: null },
  { id: idFor("wg:mobile"), name: L("Mobil anbarlar", "Мобильные склады", "Mobile warehouses"), costingMethod: "WEIGHTED_AVERAGE" as const },
  { id: idFor("wg:regions"), name: L("Region anbarları", "Региональные склады", "Regional warehouses"), costingMethod: "FIFO" as const },
];

export interface WarehouseRec {
  id: string;
  code: string;
  name: LocalizedText;
  type: "CENTRAL" | "BRANCH" | "SERVICE_CENTER" | "MOBILE" | "TECHNICIAN" | "TRANSIT" | "QUARANTINE";
  branchId: string;
  groupId: string | null;
  responsibleName: string;
  zones: string[];
  active: boolean;
  technicianId?: string;
}

export const warehouses: WarehouseRec[] = [
  { id: idFor("wh:central"), code: "WH-01", name: L("Mərkəzi anbar", "Центральный склад", "Central warehouse"), type: "CENTRAL", branchId: BR.narimanov, groupId: warehouseGroups[0]!.id, responsibleName: "Rauf Nəsirov", zones: ["A", "B", "C"], active: true },
  { id: idFor("wh:yasamal"), code: "WH-02", name: L("Yasamal filial anbarı", "Склад филиала Ясамал", "Yasamal branch warehouse"), type: "BRANCH", branchId: BR.yasamal, groupId: warehouseGroups[0]!.id, responsibleName: "Kənan Məmmədli", zones: ["A"], active: true },
  { id: idFor("wh:service-center"), code: "WH-03", name: L("Servis mərkəzi anbarı", "Склад сервисного центра", "Service center warehouse"), type: "SERVICE_CENTER", branchId: BR.narimanov, groupId: warehouseGroups[0]!.id, responsibleName: "Rauf Nəsirov", zones: ["R1", "R2"], active: true },
  { id: idFor("wh:van1"), code: "MOB-01", name: L("Servis maşını №1", "Сервисная машина №1", "Service van #1"), type: "MOBILE", branchId: BR.narimanov, groupId: warehouseGroups[1]!.id, responsibleName: "Kamran Əliyev", zones: [], active: true },
  { id: idFor("wh:van2"), code: "MOB-02", name: L("Servis maşını №2", "Сервисная машина №2", "Service van #2"), type: "MOBILE", branchId: BR.yasamal, groupId: warehouseGroups[1]!.id, responsibleName: "Samir Qasımov", zones: [], active: true },
  { id: idFor("wh:sumqayit"), code: "WH-04", name: L("Sumqayıt filial anbarı", "Склад филиала Сумгаит", "Sumgait branch warehouse"), type: "BRANCH", branchId: BR.sumqayit, groupId: warehouseGroups[2]!.id, responsibleName: "Tural Abbasov", zones: [], active: true },
  { id: idFor("wh:ganja"), code: "WH-05", name: L("Gəncə filial anbarı", "Склад филиала Гянджа", "Ganja branch warehouse"), type: "BRANCH", branchId: BR.ganja, groupId: warehouseGroups[2]!.id, responsibleName: "Səbinə Hüseynova", zones: [], active: true },
  { id: idFor("wh:transit"), code: "TRN", name: L("Tranzit (virtual)", "Транзит (виртуальный)", "Transit (virtual)"), type: "TRANSIT", branchId: BR.narimanov, groupId: null, responsibleName: "Sistem", zones: [], active: true },
  { id: idFor("wh:quarantine"), code: "QRT", name: L("Karantin", "Карантин", "Quarantine"), type: "QUARANTINE", branchId: BR.narimanov, groupId: null, responsibleName: "Rauf Nəsirov", zones: [], active: true },
];

export const WH = {
  central: warehouses[0]!.id,
  yasamal: warehouses[1]!.id,
  serviceCenter: warehouses[2]!.id,
  van1: warehouses[3]!.id,
  van2: warehouses[4]!.id,
  sumqayit: warehouses[5]!.id,
  ganja: warehouses[6]!.id,
  transit: warehouses[7]!.id,
  quarantine: warehouses[8]!.id,
};

export const units = [
  ["pcs", L("ədəd", "штука", "piece"), "əd.", 0],
  ["m", L("metr", "метр", "metre"), "m", 2],
  ["cm", L("santimetr", "сантиметр", "centimetre"), "sm", 0],
  ["kg", L("kiloqram", "килограмм", "kilogram"), "kq", 3],
  ["g", L("qram", "грамм", "gram"), "q", 0],
  ["l", L("litr", "литр", "litre"), "l", 2],
  ["ml", L("millilitr", "миллилитр", "millilitre"), "ml", 0],
  ["roll", L("rulon", "рулон", "roll"), "rulon", 0],
  ["box", L("qutu", "коробка", "box"), "qutu", 0],
  ["pack", L("paket", "пакет", "pack"), "paket", 0],
  ["can", L("banka", "банка", "can"), "banka", 0],
  ["cylinder", L("balon", "баллон", "cylinder"), "balon", 0],
  ["set", L("dəst", "комплект", "set"), "dəst", 0],
  ["pallet", L("pallet", "паллет", "pallet"), "pallet", 0],
].map(([code, name, short, precision]) => ({
  id: idFor(`unit:${code}`),
  code: code as string,
  name: name as LocalizedText,
  nameI18n: name as LocalizedText,
  short: short as string,
  precision: precision as number,
  system: true,
}));

export const taxSettings = [
  { id: idFor("tax:vat18"), name: "ƏDV 18%", rate: "18.00", appliesTo: "Bütün məhsul və xidmətlər", exempt: false, b2cIncluded: true, b2bSeparate: true, active: true },
  { id: idFor("tax:exempt"), name: "ƏDV-dən azad", rate: "0.00", appliesTo: "Zəmanət çərçivəsində işlər", exempt: true, b2cIncluded: true, b2bSeparate: true, active: true },
];

export const orgSettings = {
  orderNumberPrefix: { service: "SV", sales: "SO", transfer: "TR", purchase: "PO" },
  timezone: "Asia/Baku",
  defaultLocale: "az",
  offerResponseMinutes: 30,
  estimateValidityDays: 7,
  estimateToleranceBps: 1000,
  settlementPeriod: "BIWEEKLY" as "WEEKLY" | "BIWEEKLY" | "MONTHLY",
  independentCashAllowed: false,
  technicianCashLimit: { amount: "1500.00", currency: "AZN" },
  deliveryFlatRate: { amount: "10.00", currency: "AZN" },
  freeDeliveryThreshold: { amount: "500.00", currency: "AZN" },
  reservationTtlHours: 48,
  returnWindowDays: 14,
  quietHours: { from: "22:00", to: "08:00" },
};

export const reasonCodes = [
  ["ON_HOLD", "WAIT_CUSTOMER_DOCS", L("Müştəridən sənəd gözlənilir", "Ожидаются документы клиента", "Waiting for customer documents")],
  ["ON_HOLD", "SUPPLIER_DELAY", L("Təchizatçı gecikməsi", "Задержка поставщика", "Supplier delay")],
  ["CANCELLED", "CUSTOMER_REQUEST", L("Müştərinin istəyi ilə", "По просьбе клиента", "Customer request")],
  ["CANCELLED", "DUPLICATE", L("Təkrar sifariş", "Дубликат заказа", "Duplicate order")],
  ["CANCELLED", "ESTIMATE_REJECTED", L("Smetadan imtina", "Отказ от сметы", "Estimate declined")],
  ["REJECTED", "OUT_OF_ZONE", L("Xidmət zonasından kənar", "Вне зоны обслуживания", "Outside service zone")],
  ["REJECTED", "NOT_SERVICEABLE", L("Cihaz servis olunmur", "Устройство не обслуживается", "Device not serviceable")],
  ["FAILED", "CUSTOMER_ABSENT", L("Müştəri ünvanda deyil", "Клиента нет по адресу", "Customer not at address")],
  ["FAILED", "WRONG_ADDRESS", L("Ünvan yanlışdır", "Неверный адрес", "Wrong address")],
  ["RESCHEDULE", "CUSTOMER_ASKED", L("Müştəri başqa vaxt istədi", "Клиент попросил другое время", "Customer asked for another time")],
  ["RESCHEDULE", "TECHNICIAN_UNAVAILABLE", L("Usta əlçatan deyil", "Мастер недоступен", "Technician unavailable")],
  ["ESTIMATE_REJECT", "TOO_EXPENSIVE", L("Qiymət bahadır", "Слишком дорого", "Too expensive")],
  ["ESTIMATE_REJECT", "WILL_REPLACE", L("Yeni cihaz alacağam", "Куплю новое устройство", "I'll buy a new device")],
  ["ESTIMATE_REJECT", "NEED_TIME", L("Düşünmək üçün vaxt lazımdır", "Нужно время подумать", "Need time to think")],
  ["DECLINE_JOB", "BUSY", L("Həmin vaxt məşğulam", "Занят в это время", "Busy at that time")],
  ["DECLINE_JOB", "TOO_FAR", L("Ünvan çox uzaqdır", "Адрес слишком далеко", "Address too far")],
  ["DECLINE_JOB", "NO_PARTS", L("Lazımi material yoxdur", "Нет нужных материалов", "No required materials")],
  ["FEE_WAIVE", "GOODWILL", L("Müştəri loyallığı", "Лояльность клиента", "Customer goodwill")],
  ["RETURN", "DEFECTIVE", L("Qüsurlu məhsul", "Бракованный товар", "Defective product")],
  ["RETURN", "NOT_AS_DESCRIBED", L("Təsvirə uyğun deyil", "Не соответствует описанию", "Not as described")],
].map(([category, code, label], i) => ({
  id: idFor(`reason:${code}`),
  code: code as string,
  category: category as string,
  label: label as LocalizedText,
  labelI18n: label as LocalizedText,
  active: true,
  order: i,
}));

export const kpiTargets = [
  ["FIRST_RESPONSE", L("Sifarişə ilk cavab müddəti", "Время первого ответа", "First response time"), "Yaradılmadan operatorun ilk reaksiyasına", "15", "min", "LTE", "12"],
  ["ACCEPTANCE_TIME", L("Sifarişin qəbul müddəti", "Время подтверждения заказа", "Order confirmation time"), "Yaradılmadan CONFIRMED statusuna", "30", "min", "LTE", "26"],
  ["ASSIGNMENT_TIME", L("Usta təyin etmə müddəti", "Время назначения мастера", "Technician assignment time"), "CONFIRMED → ACCEPTED", "60", "min", "LTE", "71"],
  ["START_TIME", L("Servisə başlama müddəti", "Время начала сервиса", "Time to start service"), "Təsdiqdən ilk sahə mərhələsinə", "48", "h", "LTE", "31"],
  ["REPAIR_DURATION", L("Orta təmir müddəti", "Среднее время ремонта", "Average repair time"), "Təsdiqdən təhvilə (ünvanda)", "2", "business_days", "LTE", "1.6"],
  ["SLA_COMPLIANCE", L("SLA daxilində tamamlanma", "Выполнение в рамках SLA", "Completed within SLA"), "SLA müddətində bağlanan sifarişlər", "90", "%", "GTE", "92.4"],
  ["SLA_BREACH", L("SLA pozuntusu faizi", "Доля нарушений SLA", "SLA breach rate"), "Ən azı bir SLA-sı pozulan sifarişlər", "5", "%", "LTE", "4.1"],
  ["FIRST_VISIT_FIX", L("İlk səfərdə həll", "Решение с первого визита", "First-visit fix rate"), "Təkrar gəliş tələb etməyən servislər", "75", "%", "GTE", "78"],
  ["REPEAT_REQUESTS", L("Təkrar müraciət faizi", "Доля повторных обращений", "Repeat request rate"), "30 gün ərzində eyni problem", "5", "%", "LTE", "3.2"],
  ["CANCELLATION", L("Sifariş ləğv faizi", "Доля отмен", "Cancellation rate"), "Ləğv olunan sifarişlər", "10", "%", "LTE", "7.5"],
  ["CSAT", L("Müştəri məmnuniyyəti", "Удовлетворённость клиентов", "Customer satisfaction"), "Orta reytinq", "4.5", "/5", "GTE", "4.7"],
  ["ESTIMATE_APPROVAL", L("Smeta təsdiq faizi", "Доля одобренных смет", "Estimate approval rate"), "Təsdiqlənən smetalar", "70", "%", "GTE", "73"],
  ["WARRANTY_CLAIMS", L("Zəmanət iddiası faizi", "Доля гарантийных обращений", "Warranty claim rate"), "Tamamlanmış işlərdən sonra", "3", "%", "LTE", "2.1"],
  ["STOCK_ACCURACY", L("Stok dəqiqliyi", "Точность остатков", "Stock accuracy"), "Sayımda uyğunluq", "98", "%", "GTE", "98.6"],
].map(([code, name, measurement, target, unit, comparator, current]) => ({
  id: idFor(`kpi:${code}`),
  code: code as string,
  name: name as LocalizedText,
  measurement: measurement as string,
  target: target as string,
  unit: unit as string,
  comparator: comparator as "LTE" | "GTE",
  current: current as string,
  scope: { serviceType: null, branchId: null, segment: null },
}));

export const integrations = [
  ["PAYMENT", "PaymentProvider", "Epoint", "SANDBOX", true, true, "ep_live_****8821", "OK"],
  ["PAYMENT", "PaymentProvider", "Payriff", "SANDBOX", false, false, null, "UNKNOWN"],
  ["POS", "PosProvider", "Kapital Bank POS", "SANDBOX", true, true, "kb_****1190", "OK"],
  ["INSTALLMENT", "InstallmentProvider", "BirKart (Kapital Bank)", "SANDBOX", true, true, "bk_****4410", "OK"],
  ["INSTALLMENT", "InstallmentProvider", "Bolkart (Bank of Baku)", "SANDBOX", true, false, "bb_****0021", "DEGRADED"],
  ["FISCAL", "FiscalProvider", "NKA provayderi (seçilməyib)", "SANDBOX", false, true, null, "UNKNOWN"],
  ["E_INVOICE", "EInvoiceProvider", "e-taxes.gov.az export", "SANDBOX", true, true, null, "OK"],
  ["SMS", "SmsProvider", "LSIM", "SANDBOX", true, true, "lsim_****7781", "OK"],
  ["SMS", "SmsProvider", "Twilio (ehtiyat)", "SANDBOX", true, false, "tw_****3312", "OK"],
  ["MESSAGING", "MessagingProvider", "WhatsApp Cloud API", "SANDBOX", false, true, null, "UNKNOWN"],
  ["EMAIL", "EmailProvider", "Amazon SES", "SANDBOX", true, true, "ses_****9921", "OK"],
  ["PUSH", "PushProvider", "Firebase Cloud Messaging", "SANDBOX", false, true, null, "UNKNOWN"],
  ["MAP", "MapProvider", "OpenStreetMap (MapLibre)", "LIVE", true, true, null, "OK"],
  ["STORAGE", "StorageProvider", "Cloudflare R2", "SANDBOX", true, true, "r2_****0042", "OK"],
  ["ACCOUNTING", "AccountingExporter", "Export (JSON / CSV / XLSX)", "LIVE", true, true, null, "OK"],
].map(([area, interfaceName, provider, mode, active, primary, maskedKey, health], i) => ({
  id: idFor(`integration:${i}`),
  area: area as string,
  interfaceName: interfaceName as string,
  provider: provider as string,
  mode: mode as "SANDBOX" | "LIVE",
  active: active as boolean,
  primary: primary as boolean,
  configured: !!maskedKey || area === "MAP" || area === "ACCOUNTING" || area === "E_INVOICE",
  maskedKey: maskedKey as string | null,
  lastEventAt: active ? hoursFromNow(-(i + 1)) : null,
  health: health as "OK" | "DEGRADED" | "DOWN" | "UNKNOWN",
}));

export const contentPages = [
  {
    id: idFor("page:about"),
    slug: "about",
    title: L("Haqqımızda", "О нас", "About us"),
    body: L(
      "besqardasServis.az kondisioner, kombi, istilik, hovuz, nasos və elektrik avadanlıqlarının quraşdırılması, diaqnostikası, təmiri və periodik servisini vahid platformada birləşdirir. 4 filial, 60-dan çox sertifikatlı usta və mərkəzi anbarımızla hər sifarişi izlənilə bilən mərhələlərlə icra edirik.\n\nMissiyamız: servis prosesini müştəri üçün şəffaf, usta üçün rahat, şirkət üçün isə ölçülə bilən etmək.",
      "besqardasServis.az объединяет установку, диагностику, ремонт и периодическое обслуживание кондиционеров, котлов, систем отопления, бассейнов, насосов и электрооборудования на единой платформе. 4 филиала, более 60 сертифицированных мастеров и центральный склад.\n\nНаша миссия — сделать сервис прозрачным для клиента, удобным для мастера и измеримым для компании.",
      "besqardasServis.az brings installation, diagnostics, repair and periodic maintenance of air conditioners, boilers, heating, pool, pump and electrical equipment into one platform. 4 branches, 60+ certified technicians and a central warehouse.\n\nOur mission: make service transparent for customers, convenient for technicians and measurable for the company.",
    ),
    status: "PUBLISHED",
    updatedAt: daysAgo(12),
  },
  {
    id: idFor("page:terms"),
    slug: "terms",
    title: L("İstifadə şərtləri", "Условия использования", "Terms of use"),
    body: L(
      "1. Ümumi müddəalar\nPlatformadan istifadə etməklə bu şərtləri qəbul edirsiniz.\n\n2. Sifarişlər\nServis sifarişi və checkout yalnız qeydiyyatdan keçmiş istifadəçilər üçündür. Ləğv standart halda pulsuzdur; istisnalar sifariş təsdiqlənməzdən əvvəl göstərilən haqq qaydaları ilə tətbiq olunur.\n\n3. Ödənişlər və sənədlər\nBütün ödənişlər şirkətə edilir, rəsmi sənədlər şirkətin adından verilir.\n\n4. Zəmanət\nZəmanət müddətləri məhsul, xidmət və abunə planı üzrə müəyyən olunur və zəmanət sənədində göstərilir.\n\n5. Qaytarma\nQaytarma istehlakçı hüquqları qanunvericiliyinə uyğun 14 gün ərzində mümkündür. Quraşdırılmış və ölçüyə görə kəsilmiş məhsulların qaytarılması məhduddur.",
      "1. Общие положения\nИспользуя платформу, вы принимаете эти условия.\n\n2. Заказы\nСервисный заказ и оформление доступны только зарегистрированным пользователям. Отмена бесплатна; исключения применяются по правилам, показанным до подтверждения.\n\n3. Оплата и документы\nВсе платежи поступают компании, официальные документы выдаются от имени компании.\n\n4. Гарантия\nСроки гарантии определяются по товару, услуге и плану подписки.\n\n5. Возврат\nВозврат возможен в течение 14 дней согласно законодательству о правах потребителей.",
      "1. General\nBy using the platform you accept these terms.\n\n2. Orders\nService orders and checkout are available to signed-in users only. Cancellation is free; exceptions apply under fee rules shown before confirmation.\n\n3. Payments & documents\nAll payments are made to the company; official documents are issued in the company's name.\n\n4. Warranty\nWarranty periods depend on product, service and subscription plan.\n\n5. Returns\nReturns are possible within 14 days in line with consumer protection law.",
    ),
    status: "PUBLISHED",
    updatedAt: daysAgo(30),
  },
  {
    id: idFor("page:privacy"),
    slug: "privacy",
    title: L("Məxfilik siyasəti", "Политика конфиденциальности", "Privacy policy"),
    body: L(
      "Fərdi məlumatlarınız Azərbaycan Respublikasının \"Fərdi məlumatlar haqqında\" qanununa uyğun emal olunur.\n\nNə toplayırıq: ad, əlaqə məlumatları, ünvanlar, cihaz və servis tarixçəsi.\nNə üçün: sifarişlərin icrası, zəmanət, bildirişlər və qanunla tələb olunan sənədlər.\nKimlə paylaşırıq: yalnız sifarişi icra edən usta və kuryer — tapşırıq aktiv olduğu müddətdə.\n\nHüquqlarınız: məlumatlarınızın ixracını və ya silinməsini \"Təhlükəsizlik\" bölməsindən tələb edə bilərsiniz. Marketinq bildirişləri yalnız razılığınızla göndərilir.",
      "Ваши персональные данные обрабатываются в соответствии с законом Азербайджанской Республики «О персональных данных».\n\nЧто собираем: имя, контакты, адреса, историю устройств и сервиса.\nЗачем: выполнение заказов, гарантия, уведомления и документы.\nС кем делимся: только с мастером и курьером на время активной задачи.\n\nВы можете запросить экспорт или удаление данных в разделе «Безопасность».",
      "Your personal data is processed under the Law of the Republic of Azerbaijan on Personal Data.\n\nWhat we collect: name, contacts, addresses, device and service history.\nWhy: fulfilling orders, warranty, notifications and required documents.\nWho we share with: only the technician and courier while a task is active.\n\nYou can request export or deletion of your data in the Security section.",
    ),
    status: "PUBLISHED",
    updatedAt: daysAgo(30),
  },
];

export const banners = [
  {
    id: idFor("banner:autumn"),
    placement: "HOME_HERO",
    title: L("Payız kampaniyası: kondisionerlərə 10% endirim", "Осенняя акция: скидка 10% на кондиционеры", "Autumn sale: 10% off air conditioners"),
    subtitle: L("Quraşdırma ilə birlikdə sifariş edin — eyni gün ölçü götürmə pulsuzdur", "Закажите с установкой — замер в тот же день бесплатно", "Order with installation — same-day measurement is free"),
    ctaLabel: L("Kataloqa bax", "Смотреть каталог", "Browse catalog"),
    ctaHref: "/shop/kondisionerler",
    tone: "primary",
    activeFrom: daysAgo(10),
    activeTo: hoursFromNow(24 * 40),
    status: "PUBLISHED",
  },
  {
    id: idFor("banner:boiler"),
    placement: "HOME_STRIP",
    title: L("Qış öncəsi kombi baxışı", "Осмотр котла перед зимой", "Pre-winter boiler check"),
    subtitle: L("Premium üzvlərə illik 1 pulsuz texniki baxış", "Premium: 1 бесплатный осмотр в год", "Premium members get 1 free annual check"),
    ctaLabel: L("Servis sifariş et", "Заказать сервис", "Book service"),
    ctaHref: "/services/kombi-periodik-servis",
    tone: "accent",
    activeFrom: daysAgo(5),
    activeTo: null,
    status: "PUBLISHED",
  },
];
