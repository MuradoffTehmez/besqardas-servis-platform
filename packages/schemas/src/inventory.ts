import { z } from "zod";
import { AvailableAction, HistoryEntry, Id, IsoDateTime, Money, Quantity } from "./common";
import {
  CostingLevel,
  CostingMethod,
  MovementType,
  PurchaseStatus,
  ReservationSource,
  ReservationStatus,
  StockCountStatus,
  StockPurpose,
  TransferStatus,
  WarehouseType,
} from "./enums";

/** Anbar (PRD §34–40) */

export const Warehouse = z.object({
  id: Id,
  code: z.string(),
  name: z.string(),
  type: WarehouseType,
  branchId: Id,
  branchName: z.string(),
  groupId: z.string().nullable(),
  groupName: z.string().nullable(),
  responsibleName: z.string(),
  zones: z.array(z.string()),
  skuCount: z.number(),
  stockValue: Money,
  active: z.boolean(),
});

export const WarehouseGroup = z.object({
  id: Id,
  name: z.string(),
  warehouseIds: z.array(z.string()),
  warehouseNames: z.array(z.string()),
  costingMethod: CostingMethod.nullable(),
});

export const StockLevel = z.object({
  id: Id,
  productId: Id,
  productName: z.string(),
  sku: z.string(),
  categoryName: z.string(),
  warehouseId: Id,
  warehouseName: z.string(),
  branchName: z.string(),
  purpose: StockPurpose,
  physical: Quantity,
  reserved: Quantity,
  damaged: Quantity,
  available: Quantity,
  inTransit: Quantity,
  onOrder: Quantity,
  minLevel: Quantity,
  belowMin: z.boolean(),
  avgCost: Money,
  zone: z.string().nullable(),
});

export const StockMovement = z.object({
  id: Id,
  number: z.string(),
  type: MovementType,
  at: IsoDateTime,
  warehouseName: z.string(),
  productName: z.string(),
  sku: z.string(),
  quantity: Quantity,
  baseQuantity: Quantity,
  direction: z.enum(["IN", "OUT"]),
  unitCost: Money,
  reason: z.string().nullable(),
  actorName: z.string(),
  relatedDocument: z.string().nullable(),
  reversalOf: z.string().nullable(),
});

export const Reservation = z.object({
  id: Id,
  number: z.string(),
  source: ReservationSource,
  sourceNumber: z.string(),
  productId: Id,
  productName: z.string(),
  sku: z.string(),
  warehouseName: z.string(),
  quantity: Quantity,
  status: ReservationStatus,
  reservedFor: z.string(),
  expiresAt: IsoDateTime,
  createdAt: IsoDateTime,
  availableActions: z.array(AvailableAction),
});

export const CreateReservationRequest = z.object({
  productId: z.string().min(1),
  warehouseId: z.string().min(1),
  quantity: z.string().regex(/^\d+(\.\d+)?$/, { message: "validation.number" }),
  unit: z.string(),
  serviceOrderId: z.string().min(1, { message: "validation.reservationNeedsJob" }),
});

export const TransferLine = z.object({
  id: Id,
  productId: Id,
  productName: z.string(),
  sku: z.string(),
  quantity: Quantity,
  receivedQuantity: Quantity.nullable(),
});

export const Transfer = z.object({
  id: Id,
  number: z.string(),
  fromWarehouseId: Id,
  fromWarehouseName: z.string(),
  toWarehouseId: Id,
  toWarehouseName: z.string(),
  status: TransferStatus,
  lines: z.array(TransferLine),
  createdAt: IsoDateTime,
  createdBy: z.string(),
  shippedAt: IsoDateTime.nullable(),
  receivedAt: IsoDateTime.nullable(),
  discrepancyNote: z.string().nullable(),
  history: z.array(HistoryEntry),
  availableActions: z.array(AvailableAction),
});

export const CreateTransferRequest = z.object({
  fromWarehouseId: z.string().min(1),
  toWarehouseId: z.string().min(1),
  lines: z.array(z.object({ productId: z.string().min(1), quantity: z.string().regex(/^\d+(\.\d+)?$/), unit: z.string() })).min(1),
  note: z.string().optional(),
});

export const Supplier = z.object({
  id: Id,
  name: z.string(),
  voen: z.string(),
  contactName: z.string(),
  phone: z.string(),
  email: z.string(),
  paymentTerms: z.string(),
  productCount: z.number(),
  debt: Money,
  active: z.boolean(),
});

export const Purchase = z.object({
  id: Id,
  number: z.string(),
  supplierId: Id,
  supplierName: z.string(),
  warehouseName: z.string(),
  status: PurchaseStatus,
  lines: z.array(z.object({ id: Id, productName: z.string(), sku: z.string(), quantity: Quantity, receivedQuantity: Quantity, unitCost: Money, total: Money })),
  total: Money,
  expectedAt: IsoDateTime.nullable(),
  createdAt: IsoDateTime,
  invoiceNumber: z.string().nullable(),
  availableActions: z.array(AvailableAction),
});

export const StockCount = z.object({
  id: Id,
  number: z.string(),
  scope: z.enum(["FULL", "ZONE", "CATEGORY", "MOBILE"]),
  warehouseName: z.string(),
  status: StockCountStatus,
  blockMovements: z.boolean(),
  lines: z.array(z.object({ id: Id, productName: z.string(), sku: z.string(), system: Quantity, counted: Quantity.nullable(), difference: Quantity.nullable() })),
  accuracy: z.number().nullable(),
  scheduledAt: IsoDateTime,
  createdBy: z.string(),
  availableActions: z.array(AvailableAction),
});

export const CostingRule = z.object({
  id: Id,
  level: CostingLevel,
  targetId: z.string().nullable(),
  targetName: z.string(),
  method: CostingMethod,
  effectiveFrom: IsoDateTime,
  updatedBy: z.string(),
});

export const UnitConversionRow = z.object({
  id: Id,
  productId: Id,
  productName: z.string(),
  baseUnit: z.string(),
  unit: z.string(),
  factor: z.string(),
  packagePrice: Money.nullable(),
});
