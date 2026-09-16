import { z } from "zod";
import { Money } from "./common";

export const CrmLeadStage = z.enum(["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"]);
export const CrmLeadSource = z.enum(["WEBSITE", "PHONE", "REFERRAL", "SOCIAL", "PARTNER", "WALK_IN", "OTHER"]);
export const CrmActivityType = z.enum(["NOTE", "CALL", "EMAIL", "MEETING", "TASK", "STAGE_CHANGE", "CONVERSION"]);
export const CrmCallOutcome = z.enum(["ANSWERED", "NO_ANSWER", "BUSY", "CALLBACK", "INTERESTED", "NOT_INTERESTED"]);

export const CrmLead = z.object({
  id: z.string(), number: z.string(), stage: CrmLeadStage, source: CrmLeadSource,
  name: z.string(), companyName: z.string().nullable(), phone: z.string(), email: z.string().nullable(),
  estimatedValue: Money, probability: z.number().min(0).max(100), ownerId: z.string(), ownerName: z.string(),
  nextActionAt: z.string().datetime().nullable(), note: z.string().nullable(), lostReason: z.string().nullable(),
  customerId: z.string().nullable(), quoteNumber: z.string().nullable(), createdAt: z.string().datetime(), updatedAt: z.string().datetime(),
});

export const CrmActivity = z.object({
  id: z.string(), leadId: z.string(), type: CrmActivityType, subject: z.string(), note: z.string().nullable(),
  outcome: CrmCallOutcome.nullable(), durationSeconds: z.number().int().nonnegative().nullable(), scheduledAt: z.string().datetime().nullable(),
  completedAt: z.string().datetime().nullable(), actorId: z.string(), actorName: z.string(), createdAt: z.string().datetime(),
});

export const CreateCrmLeadRequest = z.object({
  name: z.string().trim().min(2).max(120), companyName: z.string().trim().max(160).optional().nullable(),
  phone: z.string().trim().min(7).max(30), email: z.string().email().optional().nullable(), source: CrmLeadSource,
  estimatedValue: z.number().nonnegative().max(100_000_000).default(0), ownerId: z.string().min(1),
  nextActionAt: z.string().datetime().optional().nullable(), note: z.string().trim().max(2000).optional().nullable(),
});

export const UpdateCrmLeadRequest = CreateCrmLeadRequest.partial().extend({
  stage: CrmLeadStage.optional(), probability: z.number().min(0).max(100).optional(), lostReason: z.string().trim().max(500).optional().nullable(),
});

export const CreateCrmActivityRequest = z.object({
  type: z.enum(["NOTE", "EMAIL", "MEETING", "TASK"]), subject: z.string().trim().min(2).max(160),
  note: z.string().trim().max(2000).optional().nullable(), scheduledAt: z.string().datetime().optional().nullable(), completed: z.boolean().default(false),
});

export const CreateCrmCallRequest = z.object({
  outcome: CrmCallOutcome, durationSeconds: z.number().int().min(0).max(86_400).default(0), note: z.string().trim().max(2000).optional().nullable(),
});

export const ConvertCrmLeadRequest = z.object({ target: z.enum(["CUSTOMER", "QUOTE"]) });
