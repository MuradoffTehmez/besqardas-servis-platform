import { z } from "zod";

/** PRD §65.2 conventions */

export const Id = z.string().min(1);
export const IsoDateTime = z.string();

/** Money is always a decimal string — floats are never used. */
export const Money = z.object({
  amount: z.string().regex(/^-?\d+(\.\d{1,4})?$/),
  currency: z.string().default("AZN"),
});

export const Quantity = z.object({
  value: z.string(),
  unit: z.string(),
});

export const LocalizedText = z.object({
  az: z.string(),
  ru: z.string().optional().default(""),
  en: z.string().optional().default(""),
});

export const GeoPoint = z.object({ lat: z.number(), lng: z.number() });

export const ListQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(20),
  sort: z.string().optional(),
  q: z.string().optional(),
});

export const PageMeta = z.object({
  page: z.number(),
  pageSize: z.number(),
  total: z.number(),
  totalPages: z.number(),
});

export function paginated<T extends z.ZodTypeAny>(item: T) {
  return z.object({ items: z.array(item), meta: PageMeta });
}

export const ApiError = z.object({
  code: z.string(),
  message: z.string(),
  fieldErrors: z.record(z.string(), z.array(z.string())).optional(),
});

/** Actions the backend allows for the current user on a resource (PRD §18.4). */
export const AvailableAction = z.object({
  code: z.string(),
  stageId: z.string().optional(),
  requiresReason: z.boolean().optional(),
  reasonCategory: z.string().optional(),
  variant: z.enum(["primary", "secondary", "destructive"]).optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
});

export const Attachment = z.object({
  id: Id,
  url: z.string(),
  name: z.string(),
  mimeType: z.string(),
  size: z.number(),
  alt: LocalizedText.optional(),
});

export const HistoryEntry = z.object({
  id: Id,
  at: IsoDateTime,
  actorName: z.string(),
  actorRole: z.string().optional(),
  action: z.string(),
  fromStatus: z.string().optional(),
  toStatus: z.string().optional(),
  reason: z.string().optional(),
  note: z.string().optional(),
});

export const Address = z.object({
  id: Id,
  label: z.string(),
  city: z.string(),
  street: z.string(),
  building: z.string().optional(),
  apartment: z.string().optional(),
  floor: z.string().optional(),
  entrance: z.string().optional(),
  note: z.string().optional(),
  location: GeoPoint.optional(),
  isDefault: z.boolean().default(false),
  oneTime: z.boolean().optional(),
});

export const AddressInput = Address.omit({ id: true }).extend({
  label: z.string().min(1),
  city: z.string().min(1),
  street: z.string().min(3),
});
