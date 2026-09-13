import { db } from "../db/state";
import type { AddressSnapshot, ServiceOrderRec } from "../db/types";
import { createRng, idFor } from "../lib/rng";
import { atTime, bakuAt, daysAgo, hoursFromNow } from "../lib/time";
import { PROD } from "../data/catalog";
import { SVC } from "../data/services";
import { ADDR, COMPANY, aid, did, uid } from "../data/people";
import { createServiceOrder, type NewOrderInput } from "../engine/orders";
import { simulate, ctxFor } from "./sim";
import { applyAction, isDone } from "../engine/workflow";

/** Servis sifarişləri seed-i — skriptli ssenarilər və tarixi (bağlanmış) sifarişlər. */

const snap = (addressId: string, oneTime = false): AddressSnapshot => {
  const a = ADDR[addressId]!;
  return { id: a.id, label: a.label, city: a.city, street: a.street, building: a.building, apartment: a.apartment, floor: a.floor, entrance: a.entrance, location: a.location, isDefault: a.isDefault, oneTime };
};

const variant = (key: string, idx = 0) => PROD[key]!.variants[idx]!.id;
const labor = (name: string, price: string, optional = false) => ({ type: "LABOR" as const, name, quantity: "1", unit: "pcs", unitPrice: price, optional, ownMaterial: false });
const mat = (key: string, quantity: string, unit: string, idx = 0, optional = false, ownMaterial = false, unitPrice?: string) => ({ type: "MATERIAL" as const, productId: variant(key, idx), name: key, quantity, unit, optional, ownMaterial, unitPrice });

function order(input: Omit<NewOrderInput, "createdAt"> & { createdAt: string }): ServiceOrderRec {
  return atTime(input.createdAt, () => createServiceOrder(input));
}

export function seedServiceOrders() {
  db.counters.SV = 900;

  // ---- Tarixi bağlanmış sifarişlər (hesabatlar, hesablaşmalar, tarixçə) ----
  const rng = createRng(1052);
  const customers = ["aysel", "rashad", "gunel", "murad", "leyla", "orkhan-c", "sevda", "john"];
  const history: { svc: string; tech: string; form: "ON_SITE" | "CARRY_IN"; device?: string; est?: Parameters<typeof simulate>[1]["estimate"] }[] = [
    { svc: "ac-periodic", tech: "elvin", form: "ON_SITE" },
    { svc: "ac-repair", tech: "elvin", form: "ON_SITE", est: [mat("r32", "0.8", "kg"), labor("Qaz doldurma işi", "35.00")] },
    { svc: "boiler-periodic", tech: "ilkin", form: "ON_SITE" },
    { svc: "boiler-repair", tech: "samir", form: "ON_SITE", est: [mat("ntc-sensor", "1", "pcs"), labor("Sensorun dəyişdirilməsi", "25.00")] },
    { svc: "pool-periodic", tech: "vugar", form: "ON_SITE" },
    { svc: "ac-repair", tech: "kamran", form: "ON_SITE", est: [mat("compressor-lg", "1", "pcs"), mat("r32", "1.2", "kg"), labor("Kompressorun dəyişdirilməsi", "60.00")] },
    { svc: "electric-install", tech: "ramil", form: "ON_SITE" },
    { svc: "pump-repair", tech: "vugar", form: "ON_SITE", est: [labor("Nasosun təmiri", "45.00"), { type: "MATERIAL" as const, name: "Öz materialı: salnik dəsti", quantity: "1", unit: "set", unitPrice: "18.00", optional: false, ownMaterial: true }] },
    { svc: "ac-periodic", tech: "tural-t", form: "ON_SITE" },
    { svc: "boiler-diag", tech: "ilkin", form: "ON_SITE", est: [labor("Alışma blokunun təmizlənməsi", "30.00")] },
  ];
  const customerDevice: Record<string, string | undefined> = { aysel: did("aysel-lg"), rashad: did("rashad-baxi"), gunel: did("gunel-samsung"), murad: did("murad-lg"), leyla: did("leyla-daikin"), "orkhan-c": did("orkhan-bosch"), sevda: did("sevda-gree"), john: did("john-lg") };
  const customerAddr: Record<string, string> = { aysel: aid("aysel-home"), rashad: aid("rashad-home"), gunel: aid("gunel-home"), murad: aid("murad-home"), leyla: aid("leyla-home"), "orkhan-c": aid("orkhan-home"), sevda: aid("sevda-home"), john: aid("john-home") };
  for (let i = 0; i < 34; i++) {
    const h = history[i % history.length]!;
    let c = customers[rng.int(0, customers.length - 1)]!;
    if ((h.tech === "samir" || h.tech === "ilkin") && c === "murad") c = "rashad";
    if (h.tech === "kamran" && c === "orkhan-c") c = "aysel";
    const created = daysAgo(90 - i * 2.5);
    const o = order({ serviceId: SVC[h.svc]!, executionForm: h.form, customerId: uid(c), deviceId: customerDevice[c], description: "Planlı müraciət", address: snap(customerAddr[c]!), contactChannel: "CALL", createdAt: created, scheduledAt: created, source: i % 4 === 0 ? "OPERATOR" : "WEB", operatorId: i % 4 === 0 ? uid("operator") : null });
    if (c === "murad" || c === "orkhan-c") o.address = snap(customerAddr[c]!);
    simulate(o, { technician: h.tech, estimate: h.est ?? [labor("Usta xidməti", "40.00")], start: created, stepMinutes: 50, close: i % 9 !== 0, paymentMethod: i % 3 === 0 ? "CARD_ONLINE" : "CARD_POS" });
  }

  // ---- SV-1048: Aysel — kondisioner periodik servisi, bağlanmış, zəmanət aktiv ----
  const o1048 = order({ number: "SV-1048", serviceId: SVC["ac-periodic"]!, executionForm: "ON_SITE", customerId: uid("aysel"), deviceId: did("aysel-lg"), description: "İllik təmizlik və qaz təzyiqinin yoxlanması", address: snap(aid("aysel-home")), contactChannel: "WHATSAPP", createdAt: daysAgo(40), scheduledAt: daysAgo(38) });
  simulate(o1048, { technician: "elvin", start: daysAgo(39.5), close: true, paymentMethod: "CARD_ONLINE" });

  // ---- SV-1050: Aysel ofis — kondisioner quraşdırma (şablon A), bağlanmış ----
  const o1050 = order({ number: "SV-1050", serviceId: SVC["ac-install"]!, executionForm: "ON_SITE", customerId: uid("aysel"), deviceId: did("aysel-lg2"), description: "Ofis kabinetinə LG DualCool X123 quraşdırılması", address: snap(aid("aysel-office")), contactChannel: "CALL", createdAt: daysAgo(210), scheduledAt: daysAgo(208) });
  simulate(o1050, { technician: "kamran", start: daysAgo(209.8), stepMinutes: 90, estimate: [mat("copper-pipe", "4", "m", 1), mat("insulation", "4", "m"), mat("cable", "5", "m", 1), mat("connector", "4", "pcs"), labor("Standart quraşdırma", "80.00"), labor("Divar deşilməsi (əlavə)", "15.00", true)], decision: "APPROVE", close: true, paymentMethod: "CARD_ONLINE" });

  // ---- SV-1052: Aysel — LG kondisioner təmiri, smeta təsdiq gözləyir ----
  const o1052 = order({ number: "SV-1052", serviceId: SVC["ac-repair"]!, executionForm: "ON_SITE", customerId: uid("aysel"), deviceId: did("aysel-lg"), problemCode: "NOT_COOLING", description: "Kondisioner işə düşür, amma soyutmur. Xarici blokdan səs gəlir.", address: snap(aid("aysel-home")), contactChannel: "WHATSAPP", createdAt: daysAgo(2), scheduledAt: bakuAt(-1, 11), attachments: [{ name: "xarici-blok.jpg", mimeType: "image/jpeg", size: 412000 }], preferredTechnicianId: uid("elvin") });
  simulate(o1052, { technician: "elvin", start: daysAgo(1.9), stepMinutes: 40, estimate: [mat("compressor-lg18", "1", "pcs"), mat("r32", "1.2", "kg"), labor("Usta xidməti — kompressorun dəyişdirilməsi", "40.00"), mat("ac-filter", "1", "set", 0, true)], stop: (o) => o.status === "WAITING_FOR_CUSTOMER" });

  // ---- SV-1053: Aysel — Bosch kombi, götürmə və çatdırma; daşınma mərhələsi kuryerdə ----
  const o1053 = order({ number: "SV-1053", serviceId: SVC["boiler-repair"]!, executionForm: "PICKUP_DELIVERY", customerId: uid("aysel"), deviceId: did("aysel-bosch"), problemCode: "PRESSURE_DROP", description: "Təzyiq tez-tez düşür, E9 xətası verir.", address: snap(aid("aysel-home")), contactChannel: "CALL", createdAt: daysAgo(1), scheduledAt: hoursFromNow(2) });
  simulate(o1053, { technician: "samir", courier: "orxan", start: daysAgo(0.9), stepMinutes: 30, stop: (o) => o.stages.find((s) => s.type === "LOGISTICS" && s.status === "ASSIGNED" && o.stages.filter((x) => x.type === "LOGISTICS" && x.status === "COMPLETED").length === 1) !== undefined });

  // ---- SV-1054: Aysel — kondisioner quraşdırma (şablon A), yeni sifariş ----
  order({ number: "SV-1054", serviceId: SVC["ac-install"]!, executionForm: "ON_SITE", customerId: uid("aysel"), description: "Yataq otağına 12000 BTU kondisioner quraşdırılması (məhsul platformadan alınıb)", address: snap(aid("aysel-summer")), contactChannel: "CALL", createdAt: hoursFromNow(-1.2), scheduledAt: bakuAt(2, 10), preferredTechnicianId: uid("kamran"), device: { categoryId: db.equipmentCategories[0]!.id, brandId: PROD["lg-dualcool"]!.brandId, modelId: PROD["lg-dualcool"]!.modelId, modelName: "LG DualCool Inverter 12000 BTU", serialNumber: null } });

  // ---- SV-1060: Rəşad — Baxi kombi, servis mərkəzinə gətirmə, qəbul gözləyir ----
  order({ number: "SV-1060", serviceId: SVC["boiler-repair"]!, executionForm: "CARRY_IN", customerId: uid("rashad"), deviceId: did("rashad-baxi"), problemCode: "IGNITION", description: "Alışmır, klik səsi gəlir.", address: null, contactChannel: "SMS", createdAt: hoursFromNow(-3), scheduledAt: bakuAt(0, 16) });

  // ---- SV-1061: Günel — Ariston diaqnostika, İlkinə təklif göndərilib ----
  const o1061 = order({ number: "SV-1061", serviceId: SVC["boiler-diag"]!, executionForm: "ON_SITE", customerId: uid("gunel"), deviceId: did("gunel-ariston"), problemCode: "NO_HOT_WATER", description: "Radiatorlar isinir, isti su gəlmir.", address: snap(aid("gunel-home")), contactChannel: "CALL", createdAt: hoursFromNow(-5), scheduledAt: bakuAt(1, 14) });
  simulate(o1061, { technician: "ilkin", start: hoursFromNow(-4.8), stepMinutes: 20, stop: (o) => o.stages.some((s) => s.status === "ASSIGNED") });

  // ---- SV-1062: Leyla — Daikin periodik servis, Elvinə təklif ----
  const o1062 = order({ number: "SV-1062", serviceId: SVC["ac-periodic"]!, executionForm: "ON_SITE", customerId: uid("leyla"), deviceId: did("leyla-daikin"), description: "Mövsümi təmizlik", address: snap(aid("leyla-home")), contactChannel: "WHATSAPP", createdAt: hoursFromNow(-2), scheduledAt: bakuAt(1, 10) });
  simulate(o1062, { technician: "elvin", start: hoursFromNow(-1.9), stepMinutes: 10, stop: (o) => o.stages.some((s) => s.status === "ASSIGNED") });

  // ---- SV-1063: Günel — Samsung təmir, Elvin qəbul edib, bu gün ----
  const o1063 = order({ number: "SV-1063", serviceId: SVC["ac-repair"]!, executionForm: "ON_SITE", customerId: uid("gunel"), deviceId: did("gunel-samsung"), problemCode: "LEAKING", description: "Daxili blokdan su damcılayır.", address: snap(aid("gunel-home")), contactChannel: "CALL", createdAt: daysAgo(1), scheduledAt: bakuAt(0, 15) });
  simulate(o1063, { technician: "elvin", start: daysAgo(0.95), stepMinutes: 25, stop: (o) => o.stages.some((s) => s.type === "ARRIVAL" && s.status === "ACCEPTED") });

  // ---- SV-1064: Murad (Sumqayıt) — Fərid diaqnostika aparır ----
  const o1064 = order({ number: "SV-1064", serviceId: SVC["ac-repair"]!, executionForm: "ON_SITE", customerId: uid("murad"), deviceId: did("murad-lg"), problemCode: "ERROR_CODE", description: "CH05 xətası.", address: snap(aid("murad-home")), contactChannel: "CALL", createdAt: hoursFromNow(-6), scheduledAt: bakuAt(0, 12) });
  simulate(o1064, { technician: "farid-t", start: hoursFromNow(-5.5), stepMinutes: 30, stop: (o) => o.stages.some((s) => s.type === "DIAGNOSTICS" && s.status === "IN_PROGRESS") });

  // ---- SV-1065: John — periodik servis, Kamran icra edir ----
  const o1065 = order({ number: "SV-1065", serviceId: SVC["ac-periodic"]!, executionForm: "ON_SITE", customerId: uid("john"), deviceId: did("john-lg"), description: "Filter cleaning", address: snap(aid("john-home")), contactChannel: "EMAIL", createdAt: hoursFromNow(-8), scheduledAt: bakuAt(0, 9) });
  simulate(o1065, { technician: "kamran", start: hoursFromNow(-7.5), stepMinutes: 30, stop: (o) => o.stages.some((s) => s.type === "EXECUTION" && s.status === "IN_PROGRESS") });

  // ---- SV-1066: Leyla — Vaillant kombi quraşdırma, test mərhələsində ----
  const o1066 = order({ number: "SV-1066", serviceId: SVC["boiler-install"]!, executionForm: "ON_SITE", customerId: uid("leyla"), deviceId: did("leyla-vaillant"), description: "Köhnə kombinin yenisi ilə əvəzlənməsi", address: snap(aid("leyla-home")), contactChannel: "CALL", createdAt: daysAgo(3), scheduledAt: bakuAt(0, 10) });
  simulate(o1066, { technician: "samir", start: daysAgo(2.9), stepMinutes: 60, stop: (o) => o.stages.some((s) => s.type === "TEST" && s.status === "IN_PROGRESS") });

  // ---- SV-1067: Orxan (Gəncə) — carry-in, təmir icra olunur ----
  const o1067 = order({ number: "SV-1067", serviceId: SVC["boiler-repair"]!, executionForm: "CARRY_IN", customerId: uid("orkhan-c"), deviceId: did("orkhan-bosch"), problemCode: "NO_HEATING", description: "İsitmə rejimi işləmir.", address: null, contactChannel: "CALL", createdAt: daysAgo(4), scheduledAt: daysAgo(4) });
  o1067.branchId = db.branches[3]!.id;
  simulate(o1067, { technician: "anar", start: daysAgo(3.9), stepMinutes: 120, estimate: [mat("board-bosch", "1", "pcs"), labor("Platanın dəyişdirilməsi və proqramlaşdırma", "50.00")], stop: (o) => o.stages.some((s) => s.type === "EXECUTION" && s.status === "IN_PROGRESS") });

  // ---- SV-1068: Sevda — dayandırılıb ----
  const o1068 = order({ number: "SV-1068", serviceId: SVC["ac-repair"]!, executionForm: "ON_SITE", customerId: uid("sevda"), deviceId: did("sevda-gree"), problemCode: "NOISE", description: "Güclü səs-küy.", address: snap(aid("sevda-home")), contactChannel: "SMS", createdAt: daysAgo(5), scheduledAt: daysAgo(3) });
  simulate(o1068, { technician: "tural-t", start: daysAgo(4.9), stepMinutes: 30, stop: (o) => o.status === "CONFIRMED" || o.status === "IN_PROGRESS" });
  atTime(daysAgo(4), () => applyAction(o1068, { action: "hold", reasonCode: "WAIT_CUSTOMER_DOCS", note: "Müştəri binaya giriş icazəsi gözləyir" }, ctxFor("operator")));

  // ---- SV-1069: Rəşad — ləğv olunub ----
  const o1069 = order({ number: "SV-1069", serviceId: SVC["ac-periodic"]!, executionForm: "ON_SITE", customerId: uid("rashad"), deviceId: did("rashad-midea"), description: "Təmizlik", address: snap(aid("rashad-home")), contactChannel: "CALL", createdAt: daysAgo(6) });
  atTime(daysAgo(5.9), () => applyAction(o1069, { action: "cancel", reasonCode: "CUSTOMER_REQUEST" }, ctxFor("rashad", "CUSTOMER")));

  // ---- SV-1070: Aysel — hovuz nasosu, götürmə-çatdırma, smetadan imtina → geri çatdırılma ----
  const o1070 = order({ number: "SV-1070", serviceId: SVC["pool-repair"]!, executionForm: "PICKUP_DELIVERY", customerId: uid("aysel"), deviceId: did("aysel-pool"), problemCode: "NOT_WORKING", description: "Nasos işə düşmür, qısaqapanma ehtimalı.", address: snap(aid("aysel-summer")), contactChannel: "CALL", createdAt: daysAgo(6), scheduledAt: daysAgo(5) });
  simulate(o1070, { technician: "vugar", courier: "orxan", start: daysAgo(5.9), stepMinutes: 180, estimate: [labor("Mühərrikin sarğısının yenilənməsi", "180.00"), mat("pool-pump", "1", "pcs", 0, true)], decision: "REJECT", rejectReason: "WILL_REPLACE", stop: (o) => o.stages.some((s) => s.type === "LOGISTICS" && s.status === "READY" && o.estimates[0]?.status === "REJECTED") });

  // ---- SV-1080: SLA pozulmuş yeni sifariş (operator reaksiya verməyib) ----
  order({ number: "SV-1080", serviceId: SVC["boiler-repair"]!, executionForm: "ON_SITE", customerId: uid("leyla"), deviceId: did("leyla-vaillant"), problemCode: "PRESSURE_DROP", description: "Təcili: təzyiq sıfıra düşür", address: snap(aid("leyla-home")), contactChannel: "CALL", createdAt: hoursFromNow(-3.5), urgent: false });

  // ---- Korporativ sifarişlər (Azər Holding) ----
  const corpUser = uid("corporate");
  const corpDevices = db.devices.filter((d) => d.ownerId === COMPANY.azer);
  const c1 = order({ number: "SV-1072", serviceId: SVC["ac-repair"]!, executionForm: "ON_SITE", customerId: corpUser, companyId: COMPANY.azer, siteId: aid("azer-mall"), deviceId: corpDevices[1]!.id, problemCode: "NOT_COOLING", description: "Azər Mall 2-ci mərtəbə: kondisioner soyutmur", address: snap(aid("azer-mall")), contactChannel: "EMAIL", createdAt: daysAgo(1.5), scheduledAt: daysAgo(1.2), source: "B2B", urgent: true });
  simulate(c1, { technician: "kamran", start: daysAgo(1.45), stepMinutes: 30, estimate: [mat("r32", "1.5", "kg"), labor("Sızmanın aradan qaldırılması", "55.00"), labor("Profilaktik yoxlama (əlavə)", "20.00", true)], stop: (o) => o.status === "WAITING_FOR_CUSTOMER" });
  const c2 = order({ number: "SV-1073", serviceId: SVC["boiler-periodic"]!, executionForm: "ON_SITE", customerId: corpUser, companyId: COMPANY.azer, siteId: aid("azer-hq"), deviceId: corpDevices.find((d) => d.modelName.includes("Bosch"))!.id, description: "Rüblük planlı servis — baş ofis", address: snap(aid("azer-hq")), contactChannel: "EMAIL", createdAt: daysAgo(12), scheduledAt: daysAgo(10), source: "AUTO" });
  simulate(c2, { technician: "samir", start: daysAgo(11.9), close: true, paymentMethod: "BANK_TRANSFER" });
  order({ number: "SV-1074", serviceId: SVC["ac-periodic"]!, executionForm: "ON_SITE", customerId: uid("corporate-site"), companyId: COMPANY.azer, siteId: aid("azer-warehouse"), deviceId: corpDevices[2]!.id, description: "Logistika anbarı — 6 kondisionerin təmizlənməsi", address: snap(aid("azer-warehouse")), contactChannel: "CALL", createdAt: hoursFromNow(-4), scheduledAt: bakuAt(3, 9), source: "B2B" });
  const c4 = order({ number: "SV-1075", serviceId: SVC["ac-install"]!, executionForm: "ON_SITE", customerId: corpUser, companyId: COMPANY.azer, siteId: aid("azer-ganja"), description: "Gəncə ofisinə 3 kondisioner", address: snap(aid("azer-ganja")), contactChannel: "EMAIL", createdAt: daysAgo(7), scheduledAt: daysAgo(6), source: "B2B", device: { categoryId: db.equipmentCategories[0]!.id, brandId: PROD["daikin-sensira"]!.brandId, modelId: PROD["daikin-sensira"]!.modelId, modelName: "Daikin Sensira ×3", serialNumber: null } });
  c4.branchId = db.branches[3]!.id;

  // ---- Partner sifarişləri (KlimaPro — son müştəri adından) ----
  const p1 = order({ number: "SV-1049", serviceId: SVC["ac-install"]!, executionForm: "ON_SITE", customerId: uid("partner"), partnerCompanyId: COMPANY.klima, endCustomer: { name: "Səbuhi Orucov", phone: "+994506661122", address: "Bakı, Azadlıq pr. 71, mənzil 18" }, description: "Son müştəri: 18000 BTU quraşdırma", address: { id: "one-time-p1", label: "Son müştəri", city: "Bakı", street: "Azadlıq pr. 71", apartment: "18", location: { lat: 40.4, lng: 49.84 }, isDefault: false, oneTime: true }, contactChannel: "CALL", createdAt: daysAgo(20), scheduledAt: daysAgo(18), source: "B2B", device: { categoryId: db.equipmentCategories[0]!.id, brandId: PROD["gree-multi"]!.brandId, modelId: null, modelName: "Gree Bora 18", serialNumber: "GRB18-00912" } });
  simulate(p1, { technician: "kamran", start: daysAgo(19.9), stepMinutes: 80, estimate: [mat("copper-pipe", "3", "m", 1), mat("cable", "4", "m", 1), labor("Standart quraşdırma", "80.00")], close: true, paymentMethod: "BANK_TRANSFER" });
  const p2 = order({ number: "SV-1077", serviceId: SVC["boiler-repair"]!, executionForm: "ON_SITE", customerId: uid("partner"), partnerCompanyId: COMPANY.klima, endCustomer: { name: "Nərgiz Kazımova", phone: "+994555443322", address: "Bakı, Qara Qarayev pr. 40, mənzil 9" }, problemCode: "NO_HEATING", description: "Son müştəri: kombi isitmir", address: { id: "one-time-p2", label: "Son müştəri", city: "Bakı", street: "Qara Qarayev pr. 40", apartment: "9", location: { lat: 40.41, lng: 49.94 }, isDefault: false, oneTime: true }, contactChannel: "CALL", createdAt: daysAgo(0.6), scheduledAt: bakuAt(1, 16), source: "B2B" });
  simulate(p2, { technician: "ilkin", start: daysAgo(0.55), stepMinutes: 20, stop: (o) => o.stages.some((s) => s.type === "ARRIVAL" && s.status === "ACCEPTED") });

  // ---- SV-1078: Zəmanət sifarişi (SV-1048 ilə əlaqəli) ----
  const w1048 = db.warranties.find((w) => w.orderId === o1048.id);
  const o1078 = order({ number: "SV-1078", type: "WARRANTY", serviceId: SVC["ac-repair"]!, executionForm: "ON_SITE", customerId: uid("aysel"), deviceId: did("aysel-lg"), problemCode: "LEAKING", description: "Servisdən sonra drenajdan su damcılayır (zəmanət iddiası)", address: snap(aid("aysel-home")), contactChannel: "CALL", createdAt: hoursFromNow(-20), relatedOrderId: o1048.id, source: "WARRANTY", operatorId: uid("operator") });
  simulate(o1078, { technician: "elvin", start: hoursFromNow(-19), stepMinutes: 25, stop: (o) => isDone(o.stages[0]!) && o.stages[1]!.status === "READY" });
  if (w1048) {
    db.warrantyClaims.push({ id: idFor("claim:1"), number: "ZI-201", warrantyId: w1048.id, customerId: uid("aysel"), description: "Drenajdan su damcılayır", status: "CONVERTED", serviceOrderId: o1078.id, decisionNote: "Zəmanət müddəti daxilindədir — sifariş yaradıldı", createdAt: hoursFromNow(-21) });
  }

  db.counters.SV = 1100;
  // sabahkı rezervin real sifarişə bağlanması
  const res = db.reservations.find((r) => r.sourceNumber === "SV-1071");
  if (res) { res.sourceId = o1062.id; res.sourceNumber = o1062.number; }
}
