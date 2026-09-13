import { db } from "../db/state";
import { L } from "../lib/i18n";
import { idFor } from "../lib/rng";
import { daysAgo, daysFromNow } from "../lib/time";
import { PC } from "../data/catalog";
import { EQ } from "../data/services";
import { PLAN } from "../data/plans";
import { uid } from "../data/people";

/** Konfiqurasiya seed-ləri: kampaniyalar, haqq qaydaları, qiymət siyahıları, FAQ, şablonlar, abunəliklər. */

export function seedConfig() {
  db.promotions = [
    { id: idFor("promo:sub-pro-p"), code: "SUB_PRO_PRODUCT", name: L("Pro abunə — məhsul endirimi 5%", "Pro — скидка на товары 5%", "Pro — 5% product discount"), kind: "SUBSCRIPTION", value: 5, stacking: "STACKABLE", combinableWith: [], priority: 3, base: "AFTER_PREVIOUS", maxDiscountCents: null, categoryIds: [], productIds: [], segments: [], planCodes: ["CUSTOMER_PRO"], appliesTo: "PRODUCTS", startsAt: daysAgo(365), endsAt: null, active: true, usageCount: 412, promoCode: null },
    { id: idFor("promo:sub-premium-p"), code: "SUB_PREMIUM_PRODUCT", name: L("Premium abunə — məhsul endirimi 10%", "Premium — скидка на товары 10%", "Premium — 10% product discount"), kind: "SUBSCRIPTION", value: 10, stacking: "STACKABLE", combinableWith: [], priority: 3, base: "AFTER_PREVIOUS", maxDiscountCents: null, categoryIds: [], productIds: [], segments: [], planCodes: ["CUSTOMER_PREMIUM"], appliesTo: "PRODUCTS", startsAt: daysAgo(365), endsAt: null, active: true, usageCount: 238, promoCode: null },
    { id: idFor("promo:sub-pro-s"), code: "SUB_PRO_SERVICE", name: L("Pro abunə — servis endirimi 10%", "Pro — скидка на сервис 10%", "Pro — 10% service discount"), kind: "SUBSCRIPTION", value: 10, stacking: "STACKABLE", combinableWith: [], priority: 3, base: "BASE_PRICE", maxDiscountCents: null, categoryIds: [], productIds: [], segments: [], planCodes: ["CUSTOMER_PRO"], appliesTo: "SERVICES", startsAt: daysAgo(365), endsAt: null, active: true, usageCount: 530, promoCode: null },
    { id: idFor("promo:sub-premium-s"), code: "SUB_PREMIUM_SERVICE", name: L("Premium abunə — servis endirimi 15%", "Premium — скидка на сервис 15%", "Premium — 15% service discount"), kind: "SUBSCRIPTION", value: 15, stacking: "STACKABLE", combinableWith: [], priority: 3, base: "BASE_PRICE", maxDiscountCents: null, categoryIds: [], productIds: [], segments: [], planCodes: ["CUSTOMER_PREMIUM"], appliesTo: "SERVICES", startsAt: daysAgo(365), endsAt: null, active: true, usageCount: 301, promoCode: null },
    { id: idFor("promo:autumn-ac"), code: "AUTUMN_AC", name: L("Payız kampaniyası — kondisionerlər 10%", "Осенняя акция — кондиционеры 10%", "Autumn sale — air conditioners 10%"), kind: "PERCENT", value: 10, stacking: "STACKABLE", combinableWith: ["PAYIZ20"], priority: 2, base: "BASE_PRICE", maxDiscountCents: 30000, categoryIds: [PC.kondisionerler!], productIds: [], segments: ["RETAIL"], planCodes: [], appliesTo: "PRODUCTS", startsAt: daysAgo(10), endsAt: daysFromNow(40), active: true, usageCount: 87, promoCode: null },
    { id: idFor("promo:boiler-week"), code: "BOILER_WEEK", name: L("Kombi həftəsi — 15% (eksklüziv)", "Неделя котлов — 15% (эксклюзив)", "Boiler week — 15% (exclusive)"), kind: "PERCENT", value: 15, stacking: "EXCLUSIVE", combinableWith: [], priority: 1, base: "BASE_PRICE", maxDiscountCents: null, categoryIds: [PC.kombiler!], productIds: [], segments: ["RETAIL"], planCodes: [], appliesTo: "PRODUCTS", startsAt: daysAgo(3), endsAt: daysFromNow(4), active: true, usageCount: 19, promoCode: null },
    { id: idFor("promo:payiz20"), code: "PAYIZ20", name: L("PAYIZ20 promo kodu — 20 AZN", "Промокод PAYIZ20 — 20 AZN", "PAYIZ20 promo code — 20 AZN"), kind: "PROMO_CODE", value: 20, stacking: "COMBINABLE_WITH_LIST", combinableWith: ["AUTUMN_AC", "SUB_PRO_PRODUCT", "SUB_PREMIUM_PRODUCT"], priority: 4, base: "AFTER_PREVIOUS", maxDiscountCents: null, categoryIds: [], productIds: [], segments: ["RETAIL"], planCodes: [], appliesTo: "CART", startsAt: daysAgo(10), endsAt: daysFromNow(40), active: true, usageCount: 56, promoCode: "PAYIZ20" },
    { id: idFor("promo:welcome5"), code: "XOSGELDIN5", name: L("XOSGELDIN5 — ilk sifarişə 5%", "XOSGELDIN5 — 5% на первый заказ", "XOSGELDIN5 — 5% off first order"), kind: "PROMO_CODE", value: 5, stacking: "EXCLUSIVE", combinableWith: [], priority: 5, base: "BASE_PRICE", maxDiscountCents: 5000, categoryIds: [], productIds: [], segments: ["RETAIL"], planCodes: [], appliesTo: "CART", startsAt: daysAgo(100), endsAt: null, active: true, usageCount: 902, promoCode: "XOSGELDIN5" },
  ];

  db.feeRules = [
    { id: idFor("fee:pickup-diag"), name: L("Götürmə-çatdırma: smetadan imtina zamanı logistika haqqı", "Забор и доставка: плата за логистику при отказе от сметы", "Pickup & delivery: logistics fee when estimate is declined"), type: "LOGISTICS", categoryId: EQ.boiler, serviceType: null, executionForm: "PICKUP_DELIVERY", timeCondition: null, zone: "ANY", excludedPlans: ["CUSTOMER_PREMIUM"], trigger: "ON_ESTIMATE_REJECT", amountType: "FIXED", amount: "20.00", onEstimateApproved: "WAIVE", validFrom: daysAgo(200), validTo: null, active: true },
    { id: idFor("fee:late-cancel"), name: L("Usta yola çıxdıqdan sonra ləğv — çağırış haqqı", "Отмена после выезда мастера — плата за вызов", "Cancellation after departure — call-out fee"), type: "LATE_CANCELLATION", categoryId: null, serviceType: null, executionForm: "ON_SITE", timeCondition: null, zone: "ANY", excludedPlans: ["CUSTOMER_PREMIUM"], trigger: "ON_CANCEL_AFTER_DEPARTURE", amountType: "FIXED", amount: "15.00", onEstimateApproved: "WAIVE", validFrom: daysAgo(200), validTo: null, active: true },
    { id: idFor("fee:out-of-city"), name: L("Şəhər xarici çağırış haqqı", "Выезд за город", "Out-of-city call-out fee"), type: "CALL_OUT", categoryId: null, serviceType: null, executionForm: "ON_SITE", timeCondition: null, zone: "OUT_OF_CITY", excludedPlans: ["CUSTOMER_PREMIUM"], trigger: "ALWAYS", amountType: "FIXED", amount: "10.00", onEstimateApproved: "INCLUDE", validFrom: daysAgo(200), validTo: null, active: true },
    { id: idFor("fee:after-hours"), name: L("İş saatından kənar (20:00–08:00, həftə sonu)", "Вне рабочего времени (20:00–08:00, выходные)", "After hours (20:00–08:00, weekends)"), type: "AFTER_HOURS", categoryId: null, serviceType: "REPAIR", executionForm: null, timeCondition: { weekends: true, from: "20:00", to: "08:00" }, zone: "ANY", excludedPlans: ["CUSTOMER_PREMIUM"], trigger: "ALWAYS", amountType: "PERCENT", amount: "20", onEstimateApproved: "INCLUDE", validFrom: daysAgo(90), validTo: null, active: false },
    { id: idFor("fee:diag-ac"), name: L("Kondisioner diaqnostikası — imtina halında haqq (arxiv)", "Диагностика кондиционера — плата при отказе (архив)", "AC diagnostics — decline fee (archived)"), type: "DIAGNOSTICS", categoryId: EQ.ac, serviceType: "DIAGNOSTICS", executionForm: null, timeCondition: null, zone: "ANY", excludedPlans: [], trigger: "ON_ESTIMATE_REJECT", amountType: "FIXED", amount: "25.00", onEstimateApproved: "INCLUDE", validFrom: daysAgo(400), validTo: daysAgo(100), active: false },
  ];

  db.priceLists = [
    { id: idFor("pl:retail"), priceType: "RETAIL", name: L("Pərakəndə", "Розница", "Retail"), description: L("Qonaq və fərdi müştərilər, ƏDV daxil", "Гости и частные клиенты, с НДС", "Guests and individual customers, VAT included"), vatIncluded: true, active: true, updatedAt: daysAgo(4) },
    { id: idFor("pl:tech"), priceType: "TECHNICIAN", name: L("Usta qiymətləri", "Цены для мастеров", "Technician prices"), description: L("Müstəqil və STAFF ustalar", "Независимые и штатные мастера", "Independent and staff technicians"), vatIncluded: true, active: true, updatedAt: daysAgo(4) },
    { id: idFor("pl:partner"), priceType: "PARTNER", name: L("Partner", "Партнёр", "Partner"), description: L("Müqaviləli partnyorlar, ƏDV ayrıca", "Партнёры по договору, НДС отдельно", "Contract partners, VAT separate"), vatIncluded: false, active: true, updatedAt: daysAgo(9) },
    { id: idFor("pl:wholesale"), priceType: "WHOLESALE", name: L("Topdan", "Опт", "Wholesale"), description: L("Miqdar pillələri ilə, ƏDV ayrıca", "С объёмными ступенями, НДС отдельно", "With quantity tiers, VAT separate"), vatIncluded: false, active: true, updatedAt: daysAgo(9) },
    { id: idFor("pl:corporate"), priceType: "CORPORATE", name: L("Korporativ (müqaviləyə görə)", "Корпоративный (по договору)", "Corporate (contract-based)"), description: L("Pərakəndə qiymətdən müqavilə endirimi", "Скидка от розницы по договору", "Contract discount from retail"), vatIncluded: false, active: true, updatedAt: daysAgo(30) },
  ];

  const faq = (i: number, category: string, q: [string, string, string], a: [string, string, string]) => ({ id: idFor(`faq:${i}`), category, question: L(...q), answer: L(...a), order: i, status: "PUBLISHED" as const });
  db.faq = [
    faq(1, "orders", ["Sifarişi necə yarada bilərəm?", "Как оформить заказ?", "How do I place an order?"], ["Xidmət səhifəsində \"Sifariş et\" düyməsini seçin, cihazı, problemi, ünvanı və vaxtı qeyd edin. Sifariş üçün hesaba daxil olmaq lazımdır.", "На странице услуги нажмите «Заказать», укажите устройство, проблему, адрес и время. Нужен вход в аккаунт.", "Choose \"Book\" on a service page, then pick the device, problem, address and time. You need to be signed in."]),
    faq(2, "orders", ["Sifarişi ləğv etmək pulludur?", "Отмена заказа платная?", "Is cancellation paid?"], ["Ləğv standart halda pulsuzdur. Usta yola çıxdıqdan sonra ləğv edilərsə çağırış haqqı tətbiq oluna bilər — bu, sifariş təsdiqlənməzdən əvvəl göstərilir.", "Отмена бесплатна. После выезда мастера может взиматься плата — это показывается до подтверждения.", "Cancellation is free. A call-out fee may apply once the technician has left — shown before you confirm."]),
    faq(3, "estimate", ["Smetanı qəbul etməsəm nə olur?", "Что если я не приму смету?", "What if I decline the estimate?"], ["Standart halda diaqnostika haqqı tutulmur. Servis mərkəzində olan cihaz sizə qaytarılır.", "По умолчанию диагностика не оплачивается. Устройство из сервиса возвращается вам.", "By default no diagnostics fee is charged. A device in our service center is returned to you."]),
    faq(4, "payment", ["Hansı ödəniş üsulları var?", "Какие способы оплаты?", "Which payment methods are available?"], ["Nağd, kartla onlayn, POS terminal, taksit kartları (BirKart, Bolkart) və B2B üçün bank köçürməsi.", "Наличные, карта онлайн, POS, карты рассрочки и банковский перевод для B2B.", "Cash, online card, POS terminal, installment cards and bank transfer for B2B."]),
    faq(5, "warranty", ["Zəmanəti necə yoxlaya bilərəm?", "Как проверить гарантию?", "How can I verify a warranty?"], ["Zəmanət sənədindəki QR kodu skan edin və ya kodu \"Zəmanət yoxlaması\" səhifəsinə daxil edin.", "Отсканируйте QR-код на гарантийном талоне или введите код на странице проверки.", "Scan the QR code on the warranty document or enter the code on the verification page."]),
    faq(6, "subscription", ["Premium planın üstünlükləri nələrdir?", "Преимущества Premium?", "What does Premium include?"], ["Təcili servis (4 saat), 10 ünvan, ailə üzvləri, 15% servis və 10% məhsul endirimi, illik pulsuz baxış.", "Срочный сервис (4 ч), 10 адресов, семья, скидки 15% и 10%, ежегодный осмотр.", "Urgent service (4h), 10 addresses, family members, 15% service and 10% product discounts, a free annual check-up."]),
    faq(7, "technicians", ["Usta kimi necə qoşula bilərəm?", "Как стать мастером?", "How do I join as a technician?"], ["\"Usta kimi qoşul\" səhifəsində müraciət edin: ixtisaslar, xidmət zonası, sənədlər və abunə planı. Yoxlamadan sonra hesabınız aktivləşir.", "Подайте заявку на странице «Стать мастером»: специализации, зона, документы и план.", "Apply on the \"Become a technician\" page: specializations, zones, documents and a plan."]),
    faq(8, "delivery", ["Çatdırılma nə qədərdir?", "Сколько стоит доставка?", "How much is delivery?"], ["Bakı daxilində 10 AZN, 500 AZN-dən yuxarı sifarişlərdə pulsuzdur. Filialdan pulsuz götürə bilərsiniz.", "По Баку 10 AZN, бесплатно от 500 AZN. Самовывоз бесплатный.", "10 AZN within Baku, free over 500 AZN. Branch pickup is free."]),
  ];

  const tpl = (i: number, event: string, channel: "IN_APP" | "PUSH" | "EMAIL" | "SMS" | "WHATSAPP", recipient: string, subject: [string, string, string], body: [string, string, string], mandatory = true) => ({
    id: idFor(`ntpl:${i}`), event, channel, recipient, subject: L(...subject), body: L(...body), variables: ["orderNumber", "customerName", "serviceName", "link"], active: true, mandatory, updatedAt: daysAgo(i * 3),
  });
  db.notificationTemplates = [
    tpl(1, "ORDER_CREATED", "SMS", "CUSTOMER", ["Sifariş yaradıldı", "Заказ создан", "Order created"], ["{customerName}, {orderNumber} sifarişiniz qəbul edildi.", "{customerName}, заказ {orderNumber} принят.", "{customerName}, your order {orderNumber} was received."]),
    tpl(2, "TECHNICIAN_ON_WAY", "PUSH", "CUSTOMER", ["Usta yoldadır", "Мастер в пути", "Technician on the way"], ["{orderNumber}: usta yola çıxdı.", "{orderNumber}: мастер выехал.", "{orderNumber}: the technician is on the way."]),
    tpl(3, "ESTIMATE_READY", "WHATSAPP", "CUSTOMER", ["Smeta hazırdır", "Смета готова", "Estimate ready"], ["{orderNumber} üzrə smeta hazırdır: {link}", "Смета по {orderNumber}: {link}", "Estimate for {orderNumber}: {link}"]),
    tpl(4, "DEVICE_READY", "SMS", "CUSTOMER", ["Cihaz hazırdır", "Устройство готово", "Device ready"], ["{orderNumber}: cihazınız hazırdır.", "{orderNumber}: устройство готово.", "{orderNumber}: your device is ready."]),
    tpl(5, "NEW_OFFER", "PUSH", "TECHNICIAN", ["Yeni iş təklifi", "Новое предложение", "New job offer"], ["{serviceName} — {orderNumber}", "{serviceName} — {orderNumber}", "{serviceName} — {orderNumber}"]),
    tpl(6, "NEW_TASK", "SMS", "COURIER", ["Yeni tapşırıq", "Новая задача", "New task"], ["Yeni logistika tapşırığı: {link}", "Новая задача: {link}", "New logistics task: {link}"]),
    tpl(7, "SLA_BREACH", "IN_APP", "DISPATCHER", ["SLA aşıldı", "Нарушен SLA", "SLA breached"], ["{orderNumber}: mərhələnin SLA-sı aşıldı", "{orderNumber}: нарушен SLA этапа", "{orderNumber}: stage SLA breached"]),
    tpl(8, "PAYMENT_OK", "EMAIL", "CUSTOMER", ["Ödəniş uğurlu", "Оплата прошла", "Payment successful"], ["{orderNumber} üzrə ödəniş qəbul edildi.", "Оплата по {orderNumber} получена.", "Payment for {orderNumber} received."]),
    tpl(9, "LOW_STOCK", "IN_APP", "WAREHOUSE_EMPLOYEE", ["Aşağı stok", "Низкий остаток", "Low stock"], ["{serviceName} minimum həddən aşağıdır", "{serviceName} ниже минимума", "{serviceName} is below minimum"]),
    tpl(10, "SUBSCRIPTION_EXPIRING", "EMAIL", "CUSTOMER", ["Abunə bitir", "Подписка заканчивается", "Subscription expiring"], ["Abunəliyiniz 7 gün sonra bitir.", "Подписка закончится через 7 дней.", "Your subscription ends in 7 days."], false),
    tpl(11, "WARRANTY_EXPIRING", "PUSH", "CUSTOMER", ["Zəmanət bitir", "Гарантия заканчивается", "Warranty expiring"], ["{serviceName} zəmanəti bitir", "Гарантия {serviceName} заканчивается", "{serviceName} warranty is ending"], false),
    tpl(12, "SETTLEMENT_PAID", "EMAIL", "TECHNICIAN", ["Hesablaşma ödənildi", "Выплата произведена", "Settlement paid"], ["Dövr üzrə hesablaşma ödənildi.", "Выплата за период произведена.", "Period settlement has been paid."]),
  ];

  db.costingRules = [
    { id: idFor("cost:company"), level: "COMPANY", targetId: null, method: "WEIGHTED_AVERAGE", effectiveFrom: daysAgo(365), updatedBy: "Səbinə Axundova" },
    { id: idFor("cost:pipes"), level: "CATEGORY", targetId: PC.borular!, method: "FIFO", effectiveFrom: daysAgo(120), updatedBy: "Səbinə Axundova" },
    { id: idFor("cost:regions"), level: "WAREHOUSE_GROUP", targetId: db.warehouseGroups[2]!.id, method: "FIFO", effectiveFrom: daysAgo(60), updatedBy: "Admin İstifadəçi" },
  ];

  db.suppliers = [
    { id: idFor("sup:klimat"), name: "Klimat Distribution MMC", voen: "1401234561", contactName: "Ceyhun Əsgərov", phone: "+994125001010", email: "sales@klimat.az", paymentTerms: "30 gün təxirə salınmış", productIds: [], debtCents: 1245000, active: true },
    { id: idFor("sup:termo"), name: "TermoSistem ASC", voen: "1502345672", contactName: "Nurlan Vəliyev", phone: "+994125002020", email: "order@termosistem.az", paymentTerms: "Ön ödəniş", productIds: [], debtCents: 0, active: true },
    { id: idFor("sup:metal"), name: "Mis və Metal MMC", voen: "1603456783", contactName: "Elmar Həşimov", phone: "+994125003030", email: "info@mismetal.az", paymentTerms: "14 gün", productIds: [], debtCents: 318000, active: true },
    { id: idFor("sup:freon"), name: "Freon Trade MMC", voen: "1704567894", contactName: "Aqil Bayramov", phone: "+994125004040", email: "trade@freon.az", paymentTerms: "Ön ödəniş", productIds: [], debtCents: 0, active: false },
  ];

  // Abunəliklər
  const sub = (key: string, subscriberId: string, type: "CUSTOMER" | "TECHNICIAN" | "CORPORATE", planCode: string, status: "TRIAL" | "ACTIVE" | "PAST_DUE" | "GRACE_PERIOD" | "CANCELLED" | "EXPIRED", period: "MONTH_1" | "MONTH_12", startedDaysAgo: number, endsInDays: number, extra: Partial<(typeof db.subscriptions)[number]> = {}) => {
    const plan = db.plans.find((p) => p.code === planCode)!;
    const price = plan.prices.find((p) => p.period === period)!;
    return { id: idFor(`sub:${key}`), subscriberId, subscriberType: type, planId: plan.id, status, period, priceCents: Math.round(Number(price.price.amount) * 100), startedAt: daysAgo(startedDaysAgo), currentPeriodEnd: daysFromNow(endsInDays), autoRenew: true, pendingPlanId: null, cancelAtPeriodEnd: false, graceUntil: null, ...extra };
  };
  db.subscriptions = [
    sub("aysel", uid("aysel"), "CUSTOMER", "CUSTOMER_PREMIUM", "ACTIVE", "MONTH_12", 300, 65),
    sub("gunel", uid("gunel"), "CUSTOMER", "CUSTOMER_PRO", "ACTIVE", "MONTH_1", 40, 20),
    sub("leyla", uid("leyla"), "CUSTOMER", "CUSTOMER_PRO", "TRIAL", "MONTH_1", 6, 8),
    sub("elvin", uid("elvin"), "TECHNICIAN", "TECH_PRO", "ACTIVE", "MONTH_1", 380, 12),
    sub("vugar", uid("vugar"), "TECHNICIAN", "TECH_PREMIUM", "ACTIVE", "MONTH_12", 250, 115),
    sub("tural", uid("tural-t"), "TECHNICIAN", "TECH_BASIC", "PAST_DUE", "MONTH_1", 120, -2, { graceUntil: daysFromNow(5) }),
    sub("ilkin", uid("ilkin"), "TECHNICIAN", "TECH_PRO", "ACTIVE", "MONTH_12", 330, 35),
    sub("nicat", uid("nicat"), "TECHNICIAN", "TECH_BASIC", "TRIAL", "MONTH_1", 10, 4),
    sub("azer", "company:azer", "CORPORATE", "CORPORATE_STANDARD", "ACTIVE", "MONTH_12", 250, 115),
  ];
  db.subscriptions.find((s) => s.id === idFor("sub:azer"))!.subscriberId = db.b2bAccounts[0]!.id;
  // statistik saylar üçün sintetik abunəçilər
  for (let i = 0; i < 24; i++) {
    const code = i % 3 === 0 ? "CUSTOMER_PREMIUM" : "CUSTOMER_PRO";
    db.subscriptions.push(sub(`synthetic-${i}`, idFor(`synthetic-user:${i}`), "CUSTOMER", code, i % 7 === 0 ? "CANCELLED" : "ACTIVE", i % 2 ? "MONTH_1" : "MONTH_12", 30 + i * 9, 5 + i * 3));
  }
  void PLAN;

  db.staffLicenses = db.technicians
    .filter((t) => t.employmentType === "STAFF")
    .map((t, i) => ({ id: idFor(`lic:${t.id}`), technicianId: t.id, status: "ACTIVE" as const, issuedAt: daysAgo(400 - i * 20), issuedBy: "Admin İstifadəçi", revokedAt: null, capabilities: { materialReservation: true, statistics: i % 2 === 0, customerHistory: true } }));

  db.partnerships = [
    { id: idFor("ps:elvin"), technicianId: uid("elvin"), companyName: db.branding.legalName, status: "APPROVED", initiatedBy: "TECHNICIAN", zones: ["Bakı — Mərkəz", "Bakı — Şərq"], priceListName: "Usta qiymətləri", createdAt: daysAgo(380) },
    { id: idFor("ps:vugar"), technicianId: uid("vugar"), companyName: db.branding.legalName, status: "APPROVED", initiatedBy: "COMPANY", zones: ["Bakı — bütün zonalar"], priceListName: "Usta qiymətləri", createdAt: daysAgo(250) },
    { id: idFor("ps:ilkin"), technicianId: uid("ilkin"), companyName: db.branding.legalName, status: "APPROVED", initiatedBy: "TECHNICIAN", zones: ["Bakı — Mərkəz", "Bakı — Qərb"], priceListName: "Usta qiymətləri", createdAt: daysAgo(330) },
    { id: idFor("ps:tural"), technicianId: uid("tural-t"), companyName: db.branding.legalName, status: "APPROVED", initiatedBy: "TECHNICIAN", zones: ["Bakı — Qərb"], priceListName: "Usta qiymətləri", createdAt: daysAgo(120) },
    { id: idFor("ps:nicat"), technicianId: uid("nicat"), companyName: db.branding.legalName, status: "PENDING", initiatedBy: "TECHNICIAN", zones: ["Bakı — Şərq"], priceListName: "Usta qiymətləri", createdAt: daysAgo(9) },
    { id: idFor("ps:zaur"), technicianId: uid("zaur"), companyName: db.branding.legalName, status: "PENDING", initiatedBy: "TECHNICIAN", zones: ["Bakı — Mərkəz"], priceListName: "Usta qiymətləri", createdAt: daysAgo(2) },
  ];

  const desk = (key: string, name: ReturnType<typeof L>, type: "BRANCH" | "TECHNICIAN" | "COURIER", holderId: string | null, holderName: string, branchId: string, balance: number, limit: number | null, shift: "OPEN" | "CLOSED" | null, pending = 0) => ({
    id: idFor(`desk:${key}`), name, type, holderId, holderName, branchId, balanceCents: balance, limitCents: limit, shiftStatus: shift, shiftOpenedAt: shift === "OPEN" ? daysAgo(0.2) : null, pendingHandoverCents: pending,
  });
  db.cashDesks = [
    desk("narimanov", L("Nərimanov filial kassası", "Касса филиала Нариманов", "Narimanov branch cash desk"), "BRANCH", uid("accountant"), "Səbinə Axundova", db.branches[0]!.id, 384500, null, "OPEN"),
    desk("yasamal", L("Yasamal filial kassası", "Касса филиала Ясамал", "Yasamal branch cash desk"), "BRANCH", null, "Leyla Rzayeva", db.branches[1]!.id, 121000, null, "CLOSED"),
    desk("kamran", L("Kamran Əliyev — nağd balans", "Камран Алиев — наличные", "Kamran Aliyev — cash balance"), "TECHNICIAN", uid("kamran"), "Kamran Əliyev", db.branches[0]!.id, 42000, 150000, null, 42000),
    desk("samir", L("Samir Qasımov — nağd balans", "Самир Гасымов — наличные", "Samir Gasimov — cash balance"), "TECHNICIAN", uid("samir"), "Samir Qasımov", db.branches[1]!.id, 185000, 150000, null),
    desk("ramil", L("Ramil Sadıqov — nağd balans", "Рамиль Садыгов — наличные", "Ramil Sadigov — cash balance"), "TECHNICIAN", uid("ramil"), "Ramil Sadıqov", db.branches[0]!.id, 9000, 150000, null),
    desk("orxan", L("Orxan Məmmədli — kuryer nağdı", "Орхан Мамедли — наличные курьера", "Orkhan Mammadli — courier cash"), "COURIER", uid("orxan"), "Orxan Məmmədli", db.branches[0]!.id, 25900, 100000, null),
  ];
}
