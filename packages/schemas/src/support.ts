import { z } from "zod";
import { AvailableAction, HistoryEntry, Id, IsoDateTime, LocalizedText } from "./common";

/**
 * Help Desk — müraciət (bilet) sistemi. Kanallar: sayt, kabinet, telefon, e-poçt, WhatsApp.
 * SLA iki hədəfdən ibarətdir: ilk cavab və həll. Müştəri cavabı gözlənilərkən SLA saatı dayanır.
 */

export const TicketStatus = z.enum(["NEW", "OPEN", "PENDING_CUSTOMER", "ON_HOLD", "RESOLVED", "CLOSED"]);
export const TicketPriority = z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]);
export const TicketChannel = z.enum(["WEB_FORM", "PORTAL", "PHONE", "EMAIL", "WHATSAPP", "INTERNAL"]);
export const TicketQueue = z.enum(["GENERAL", "SERVICE", "SALES", "BILLING", "WARRANTY", "TECHNICAL"]);
export const TicketSlaState = z.enum(["ON_TRACK", "AT_RISK", "BREACHED", "PAUSED", "MET"]);
export const TicketMessageKind = z.enum(["PUBLIC", "INTERNAL", "SYSTEM"]);
export const TicketRelatedType = z.enum(["SERVICE_ORDER", "SALES_ORDER", "WARRANTY", "PAYMENT", "RETURN"]);

/** Prioritet üzrə SLA hədəfləri (dəqiqə). */
export const TicketSlaTargets = z.object({
  firstResponseMinutes: z.number().int().positive(),
  resolutionMinutes: z.number().int().positive(),
});

export const TicketCategory = z.object({
  id: Id,
  code: z.string(),
  name: LocalizedText,
  description: LocalizedText,
  queue: TicketQueue,
  defaultPriority: TicketPriority,
  sla: z.record(TicketPriority, TicketSlaTargets),
  customerVisible: z.boolean(),
  order: z.number(),
  active: z.boolean(),
});

export const CannedResponse = z.object({
  id: Id,
  shortcut: z.string(),
  title: LocalizedText,
  body: LocalizedText,
  categoryId: Id.nullable(),
  usageCount: z.number(),
  active: z.boolean(),
});

export const TicketAttachment = z.object({ name: z.string(), url: z.string().nullable() });

export const TicketMessage = z.object({
  id: Id,
  kind: TicketMessageKind,
  authorName: z.string(),
  authorRole: z.string(),
  fromCustomer: z.boolean(),
  body: z.string(),
  attachments: z.array(TicketAttachment),
  createdAt: IsoDateTime,
});

export const TicketSla = z.object({
  state: TicketSlaState,
  firstResponseDueAt: IsoDateTime.nullable(),
  resolutionDueAt: IsoDateTime.nullable(),
  firstRespondedAt: IsoDateTime.nullable(),
  /** Növbəti hədəf: cavab verilməyibsə ilk cavab, sonra həll. */
  target: z.enum(["FIRST_RESPONSE", "RESOLUTION"]),
  /** Növbəti hədəfə qalan dəqiqə (mənfi — gecikmə). */
  remainingMinutes: z.number().nullable(),
  resolutionRemainingMinutes: z.number().nullable(),
  breachedFirstResponse: z.boolean(),
  breachedResolution: z.boolean(),
  escalationLevel: z.number().int().min(0),
});

export const TicketSummary = z.object({
  id: Id,
  number: z.string(),
  subject: z.string(),
  status: TicketStatus,
  priority: TicketPriority,
  channel: TicketChannel,
  queue: TicketQueue,
  categoryId: Id,
  categoryName: z.string(),
  requesterName: z.string(),
  requesterId: Id.nullable(),
  companyName: z.string().nullable(),
  assigneeId: Id.nullable(),
  assigneeName: z.string().nullable(),
  relatedNumber: z.string().nullable(),
  tags: z.array(z.string()),
  sla: TicketSla,
  messageCount: z.number(),
  lastMessageAt: IsoDateTime,
  awaitingAgent: z.boolean(),
  csatRating: z.number().nullable(),
  createdAt: IsoDateTime,
  updatedAt: IsoDateTime,
});

export const Ticket = TicketSummary.extend({
  requesterPhone: z.string().nullable(),
  requesterEmail: z.string().nullable(),
  related: z.object({ type: TicketRelatedType, id: Id, number: z.string(), link: z.string().nullable() }).nullable(),
  serviceOrderId: Id.nullable(),
  serviceOrderNumber: z.string().nullable(),
  messages: z.array(TicketMessage),
  history: z.array(HistoryEntry),
  csat: z.object({ rating: z.number().int().min(1).max(5), comment: z.string().nullable(), at: IsoDateTime }).nullable(),
  resolvedAt: IsoDateTime.nullable(),
  closedAt: IsoDateTime.nullable(),
  availableActions: z.array(AvailableAction),
});

const MessageAttachments = z.array(z.object({ name: z.string().min(1), dataUrl: z.string().optional() })).max(5).optional();

const Required = z.string().min(1, "validation.required");
const Subject = z.string().trim().min(5, "validation.subjectMin").max(140, "validation.tooLong");
const Body = z.string().trim().min(10, "validation.commentMin").max(5000, "validation.tooLong");

/** Müştəri kabinetindən müraciət. */
export const CreateTicketRequest = z.object({
  categoryId: Required,
  subject: Subject,
  body: Body,
  relatedType: TicketRelatedType.optional(),
  relatedId: Id.optional(),
  attachments: MessageAttachments,
});

/** Saytdakı əlaqə formasından (qonaq) müraciət. */
export const ContactTicketRequest = z.object({
  topic: z.enum(["General", "Order", "Warranty", "Business", "Feedback"]),
  name: z.string().trim().min(2, "validation.required").max(80, "validation.tooLong"),
  phone: z.string().trim().max(20, "validation.phone").optional().default(""),
  email: z.string().trim().max(120, "validation.email").optional().default(""),
  orderNumber: z.string().trim().max(20, "validation.invalid").optional().default(""),
  message: Body,
});

/** Operatorun adından yaradılan müraciət (telefon zəngi, e-poçt). */
export const AdminCreateTicketRequest = z.object({
  categoryId: Required,
  subject: Subject,
  body: Body,
  channel: TicketChannel,
  priority: TicketPriority.optional(),
  requesterId: Id.optional(),
  requesterName: z.string().trim().max(80).optional(),
  requesterPhone: z.string().trim().max(20).optional(),
  assigneeId: Id.optional(),
  relatedType: TicketRelatedType.optional(),
  relatedId: Id.optional(),
});

export const TicketReplyRequest = z.object({
  body: z.string().trim().min(1, "validation.required").max(5000, "validation.tooLong"),
  internal: z.boolean().optional().default(false),
  /** Cavabdan sonra status: müştəri cavabı gözlənilir, həll olundu və ya açıq qalır. */
  statusAfter: z.enum(["OPEN", "PENDING_CUSTOMER", "RESOLVED"]).optional(),
  cannedResponseId: Id.optional(),
  attachments: MessageAttachments,
});

export const TicketActionRequest = z.object({
  code: z.string(),
  assigneeId: Id.optional(),
  priority: TicketPriority.optional(),
  categoryId: Id.optional(),
  reasonCode: z.string().optional(),
  note: z.string().max(1000).optional(),
  rating: z.number().int().min(1).max(5).optional(),
  comment: z.string().max(1000).optional(),
});

export const TicketStats = z.object({
  open: z.number(),
  unassigned: z.number(),
  mine: z.number(),
  awaitingAgent: z.number(),
  breached: z.number(),
  atRisk: z.number(),
  pendingCustomer: z.number(),
  resolvedToday: z.number(),
  avgFirstResponseMinutes: z.number().nullable(),
  avgResolutionMinutes: z.number().nullable(),
  slaCompliance: z.number().nullable(),
  csatAverage: z.number().nullable(),
  csatCount: z.number(),
  byQueue: z.array(z.object({ queue: TicketQueue, open: z.number(), breached: z.number() })),
  byChannel: z.array(z.object({ channel: TicketChannel, count: z.number() })),
  agents: z.array(z.object({ id: Id, name: z.string(), open: z.number(), resolved: z.number(), csat: z.number().nullable() })),
});
