import { db } from "../db/state";
import type { CrmLeadRec } from "../db/types";
import { idFor } from "../lib/rng";
import { daysAgo, daysFromNow } from "../lib/time";

/** Satış qıfını bütün mərhələlərlə nümayiş etdirən deterministik CRM seed-i. */
export function seedCrm() {
  const sellers = db.users.filter((u) => u.roles.some((r) => ["SALES_EMPLOYEE", "MANAGER", "ADMIN"].includes(r)));
  const owner = (i: number) => sellers[i % sellers.length]!.id;
  const rows: Omit<CrmLeadRec, "id" | "number" | "ownerId" | "createdAt" | "updatedAt">[] = [
    { stage: "NEW", source: "WEBSITE", name: "Nərgiz Həsənli", companyName: null, phone: "+994 50 222 14 80", email: "nergiz@example.az", estimatedValueCents: 165000, probability: 10, nextActionAt: daysFromNow(1), note: "Yeni mənzil üçün kondisioner dəsti", lostReason: null, customerId: null, quoteNumber: null },
    { stage: "CONTACTED", source: "PHONE", name: "Tural Rəhimov", companyName: null, phone: "+994 55 310 22 14", email: null, estimatedValueCents: 85000, probability: 25, nextActionAt: daysFromNow(2), note: "Kombi dəyişimi ilə maraqlanır", lostReason: null, customerId: null, quoteNumber: null },
    { stage: "QUALIFIED", source: "REFERRAL", name: "Aynur Məmmədova", companyName: "Orion Studio", phone: "+994 70 440 18 33", email: "aynur@orion.az", estimatedValueCents: 420000, probability: 45, nextActionAt: daysFromNow(1), note: "Ofis üçün 4 cihaz və quraşdırma", lostReason: null, customerId: null, quoteNumber: null },
    { stage: "PROPOSAL", source: "PARTNER", name: "Kamran Əliyev", companyName: "Caspian Foods MMC", phone: "+994 51 600 77 11", email: "kamran@caspianfoods.az", estimatedValueCents: 1280000, probability: 60, nextActionAt: daysFromNow(3), note: "Soyutma sistemi üzrə təklif göndərilib", lostReason: null, customerId: null, quoteNumber: "KT-CRM-901" },
    { stage: "NEGOTIATION", source: "WALK_IN", name: "Sevinc Quliyeva", companyName: "Medline Klinika", phone: "+994 50 810 12 90", email: "office@medline.az", estimatedValueCents: 2350000, probability: 80, nextActionAt: daysFromNow(1), note: "İllik servis müqaviləsinin şərtləri müzakirə olunur", lostReason: null, customerId: null, quoteNumber: "KT-CRM-902" },
    { stage: "WON", source: "SOCIAL", name: "Ramin Cəfərov", companyName: null, phone: "+994 55 900 30 20", email: "ramin@example.az", estimatedValueCents: 210000, probability: 100, nextActionAt: null, note: null, lostReason: null, customerId: db.users.find((u) => u.email === "rashad@demo.az")?.id ?? null, quoteNumber: "KT-CRM-898" },
    { stage: "LOST", source: "OTHER", name: "Elşən İsmayılov", companyName: "Delta Office", phone: "+994 77 310 80 70", email: null, estimatedValueCents: 720000, probability: 0, nextActionAt: null, note: null, lostReason: "Büdcə təsdiqlənmədi", customerId: null, quoteNumber: null },
  ];
  db.crmLeads = rows.map((row, i) => ({ ...row, id: idFor(`crm-lead:${i + 1}`), number: `LD-${1001 + i}`, ownerId: owner(i), createdAt: daysAgo(14 - i), updatedAt: daysAgo(Math.max(0, 7 - i)) }));
  db.crmActivities = db.crmLeads.flatMap((lead, i) => [
    { id: idFor(`crm-activity:${i}:1`), leadId: lead.id, type: "NOTE" as const, subject: "Lead qeydi yaradıldı", note: lead.note, outcome: null, durationSeconds: null, scheduledAt: null, completedAt: daysAgo(14 - i), actorId: lead.ownerId, createdAt: daysAgo(14 - i) },
    ...(lead.stage !== "NEW" ? [{ id: idFor(`crm-activity:${i}:2`), leadId: lead.id, type: "CALL" as const, subject: "İlkin əlaqə zəngi", note: "Ehtiyac və büdcə dəqiqləşdirildi", outcome: "ANSWERED" as const, durationSeconds: 185 + i * 20, scheduledAt: null, completedAt: daysAgo(6 - Math.min(i, 5)), actorId: lead.ownerId, createdAt: daysAgo(6 - Math.min(i, 5)) }] : []),
  ]);
}
