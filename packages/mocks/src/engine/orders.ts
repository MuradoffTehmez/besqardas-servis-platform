import type { ExecutionForm } from "@sp/types";
import { db, nextNumber } from "../db/state";
import type { AddressSnapshot, ServiceOrderRec } from "../db/types";
import { newId } from "../lib/rng";
import { nowIso } from "../lib/time";
import { apiError } from "../lib/errors";
import { planForUser, userById } from "./context";
import { advance, applicableFeeRules, instantiateStages } from "./workflow";

/** Servis sifarişinin yaradılması (PRD §13). Nömrə prefiksi konfiqurasiya olunur (`SV-1052`). */

export interface NewOrderInput {
  serviceId: string;
  executionForm: ExecutionForm;
  customerId: string;
  companyId?: string | null;
  partnerCompanyId?: string | null;
  endCustomer?: { name: string; phone: string; address: string } | null;
  deviceId?: string | null;
  device?: { categoryId: string; brandId: string; modelId: string | null; modelName: string; serialNumber: string | null } | null;
  problemCode?: string | null;
  description: string;
  address?: AddressSnapshot | null;
  contactChannel?: ServiceOrderRec["contactChannel"];
  note?: string | null;
  urgent?: boolean;
  scheduledAt?: string | null;
  preferredTechnicianId?: string | null;
  source?: ServiceOrderRec["source"];
  operatorId?: string | null;
  type?: ServiceOrderRec["type"];
  createdAt?: string;
  relatedOrderId?: string | null;
  salesOrderId?: string | null;
  siteId?: string | null;
  attachments?: { name: string; mimeType: string; size: number }[];
  number?: string;
}

export function branchForAddress(address: AddressSnapshot | null | undefined): string {
  if (!address) return db.branches[0]!.id;
  const byCity = db.branches.filter((b) => b.city === address.city);
  if (!byCity.length) return db.branches[0]!.id;
  if (byCity.length === 1 || !address.location) return byCity[0]!.id;
  return byCity.sort((a, b) => Math.hypot(a.location.lat - address.location!.lat, a.location.lng - address.location!.lng) - Math.hypot(b.location.lat - address.location!.lat, b.location.lng - address.location!.lng))[0]!.id;
}

export function createServiceOrder(input: NewOrderInput, opts: { skipAdvance?: boolean } = {}): ServiceOrderRec {
  const service = db.services.find((s) => s.id === input.serviceId);
  if (!service) throw apiError(404, "SERVICE_NOT_FOUND", "error.notFound");
  if (!service.executionForms.includes(input.executionForm)) throw apiError(422, "VALIDATION", "error.validation", { executionForm: ["validation.required"] });
  const templateId = service.templateIds[input.executionForm]!;
  const template = db.templates.find((t) => t.id === templateId)!;
  const device = input.deviceId ? db.devices.find((d) => d.id === input.deviceId) : null;
  const customer = userById(input.customerId);
  const plan = customer && !input.companyId ? planForUser(customer, "CUSTOMER", null) : null;
  const disc = Number(plan?.entitlements.service_discount_percent ?? 0);
  const createdAt = input.createdAt ?? nowIso();
  const order: ServiceOrderRec = {
    id: newId("so"),
    number: input.number ?? nextNumber(db.settings.orderNumberPrefix.service, 1100),
    type: input.type ?? "STANDARD",
    status: "NEW",
    prevStatus: null,
    serviceId: service.id,
    templateId: template.id,
    templateVersion: template.version,
    executionForm: input.executionForm,
    customerId: input.customerId,
    companyId: input.companyId ?? null,
    partnerCompanyId: input.partnerCompanyId ?? null,
    endCustomer: input.endCustomer ?? null,
    deviceId: device?.id ?? null,
    device: device
      ? { categoryId: device.categoryId, brandId: device.brandId, modelId: device.modelId, modelName: device.modelName, serialNumber: device.serialNumber }
      : input.device ?? { categoryId: service.categoryId, brandId: db.brands[0]!.id, modelId: null, modelName: "—", serialNumber: null },
    deviceLocation: input.executionForm === "ON_SITE" ? null : "AT_CUSTOMER",
    problemCode: input.problemCode ?? null,
    description: input.description,
    attachments: (input.attachments ?? []).map((a) => ({ id: newId("att"), url: `/mock-uploads/${encodeURIComponent(a.name)}`, name: a.name, mimeType: a.mimeType, size: a.size })),
    address: input.address ?? null,
    contactChannel: input.contactChannel ?? "CALL",
    note: input.note ?? null,
    urgent: input.urgent ?? false,
    scheduledAt: input.scheduledAt ?? null,
    technicianId: null,
    branchId: branchForAddress(input.address),
    source: input.source ?? "WEB",
    operatorId: input.operatorId ?? null,
    assignmentMethod: input.preferredTechnicianId ? "CUSTOMER_CHOICE" : service.assignmentMethod === "CUSTOMER_CHOICE" ? "DISPATCHER" : service.assignmentMethod,
    stages: instantiateStages(template),
    estimates: [],
    materials: [],
    history: [
      {
        id: newId("hist"),
        at: createdAt,
        actorName: input.operatorId ? `${userById(input.operatorId)?.firstName ?? ""} ${userById(input.operatorId)?.lastName ?? ""}`.trim() : customer ? `${customer.firstName} ${customer.lastName}` : "Sistem",
        actorRole: input.operatorId ? "OPERATOR" : "CUSTOMER",
        action: "created",
        toStatus: "NEW",
      },
    ],
    fees: [],
    warrantyId: null,
    relatedOrderId: input.relatedOrderId ?? null,
    salesOrderId: input.salesOrderId ?? null,
    needsReschedule: false,
    createdAt,
    updatedAt: createdAt,
    closedAt: null,
    cancelReason: null,
    oldPartDisposition: null,
    basePriceCents: service.priceModel === "FIXED" && service.priceCents ? service.priceCents - Math.round((service.priceCents * disc) / 100) : null,
    siteId: input.siteId ?? null,
    approvalPending: false,
    preferredTechnicianId: input.preferredTechnicianId ?? null,
  };
  // ALWAYS tətbiq olunan haqlar (məs. şəhər xarici çağırış) yaradılma anında qeyd olunur
  for (const rule of applicableFeeRules(order).filter((r) => r.trigger === "ALWAYS")) {
    order.fees.push({ type: rule.type, label: rule.name, cents: rule.amountType === "FIXED" ? Math.round(Number(rule.amount) * 100) : 0, trigger: rule.trigger, waived: false });
  }
  db.serviceOrders.unshift(order);
  if (!opts.skipAdvance) advance(order, null);
  return order;
}
