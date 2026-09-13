import { z } from "zod";
import { Address, AvailableAction, HistoryEntry, Id, IsoDateTime, Money, Quantity } from "./common";
import { DeliveryMethod, PaymentMethod, QuoteStatus, ReturnStatus, SalesOrderStatus } from "./enums";
import { Price } from "./catalog";

/** Səbət, checkout, satış sifarişləri, qaytarma (PRD §31–32); kommersiya təklifləri (§45.2) */

export const CartItem = z.object({
  id: Id,
  productId: Id,
  variantId: Id,
  slug: z.string(),
  name: z.string(),
  variantName: z.string(),
  sku: z.string(),
  imageTone: z.string(),
  quantity: Quantity,
  baseQuantity: Quantity,
  availableUnits: z.array(z.object({ unit: z.string(), label: z.string(), factor: z.string() })),
  unitPrice: Price,
  lineTotal: Money,
  installation: z.object({ serviceId: Id, name: z.string(), price: Money }).nullable(),
  installationAvailable: z.object({ serviceId: Id, name: z.string(), price: Money }).nullable(),
  stockStatus: z.enum(["IN_STOCK", "LOW", "OUT_OF_STOCK"]),
  warnings: z.array(z.object({ code: z.enum(["PRICE_CHANGED", "STOCK_LOW", "OUT_OF_STOCK"]), message: z.string() })),
  returnRestriction: z.string().nullable(),
});

export const CartTotals = z.object({
  subtotal: Money,
  discountTotal: Money,
  installationTotal: Money,
  deliveryTotal: Money,
  vatTotal: Money,
  total: Money,
  appliedDiscounts: z.array(z.object({ code: z.string(), label: z.string(), amount: Money, applied: z.boolean(), skippedReason: z.string().nullable() })),
});

export const Cart = z.object({
  id: Id,
  items: z.array(CartItem),
  promoCode: z.string().nullable(),
  promoError: z.string().nullable(),
  totals: CartTotals,
  itemCount: z.number(),
  merged: z.boolean(),
});

export const AddToCartRequest = z.object({
  variantId: z.string(),
  quantity: z.string(),
  unit: z.string(),
  withInstallation: z.boolean().default(false),
});

export const CheckoutOptions = z.object({
  deliveryMethods: z.array(z.object({ method: DeliveryMethod, label: z.string(), price: Money, eta: z.string(), available: z.boolean() })),
  pickupBranches: z.array(z.object({ id: Id, name: z.string(), address: z.string(), allInStock: z.boolean(), readyIn: z.string() })),
  addresses: z.array(Address),
  addressRules: z.object({ oneTimeAllowed: z.boolean(), maxAddresses: z.number(), source: z.enum(["PLAN", "B2B_CONTRACT"]) }),
  paymentMethods: z.array(z.object({ method: PaymentMethod, label: z.string(), available: z.boolean(), note: z.string().nullable() })),
  installmentOffers: z.array(z.object({ provider: z.string(), months: z.number(), monthly: Money })),
  installationSlots: z.array(z.object({ date: z.string(), slots: z.array(z.object({ start: IsoDateTime, end: IsoDateTime, available: z.boolean() })) })),
  requiresInvoiceDetails: z.boolean(),
  needsInstallation: z.boolean(),
});

export const CheckoutRequest = z.object({
  deliveryMethod: DeliveryMethod,
  addressId: z.string().nullable().optional(),
  oneTimeAddress: z.object({ city: z.string().min(2), street: z.string().min(3), building: z.string().optional(), apartment: z.string().optional() }).nullable().optional(),
  pickupBranchId: z.string().nullable().optional(),
  installationSlot: z.string().nullable().optional(),
  paymentMethod: PaymentMethod,
  installmentMonths: z.number().nullable().optional(),
  invoice: z.object({ companyName: z.string(), voen: z.string(), bankAccount: z.string().optional() }).nullable().optional(),
  note: z.string().optional(),
  idempotencyKey: z.string(),
});

export const CheckoutResult = z.object({
  salesOrderId: Id,
  salesOrderNumber: z.string(),
  serviceOrderNumber: z.string().nullable(),
  paymentId: z.string().nullable(),
  redirectUrl: z.string().nullable(),
});

export const SalesOrderLine = z.object({
  id: Id,
  productId: Id,
  slug: z.string(),
  name: z.string(),
  sku: z.string(),
  quantity: Quantity,
  unitPrice: Money,
  total: Money,
  returnable: z.boolean(),
  returnedQuantity: Quantity.nullable(),
});

export const SalesOrderSummary = z.object({
  id: Id,
  number: z.string(),
  status: SalesOrderStatus,
  customerName: z.string(),
  companyName: z.string().nullable(),
  itemCount: z.number(),
  total: Money,
  paymentStatus: z.string(),
  deliveryMethod: DeliveryMethod,
  createdAt: IsoDateTime,
  branchName: z.string(),
  channel: z.enum(["WEB", "BRANCH", "B2B", "OPERATOR"]),
});

export const SalesOrder = SalesOrderSummary.extend({
  lines: z.array(SalesOrderLine),
  subtotal: Money,
  discountTotal: Money,
  deliveryTotal: Money,
  vatTotal: Money,
  address: Address.nullable(),
  pickupBranchName: z.string().nullable(),
  paymentMethod: PaymentMethod,
  payments: z.array(z.object({ id: Id, number: z.string(), method: z.string(), status: z.string(), amount: Money, createdAt: IsoDateTime })),
  documents: z.array(z.object({ id: Id, number: z.string(), type: z.string(), status: z.string(), createdAt: IsoDateTime })),
  serviceOrderNumber: z.string().nullable(),
  history: z.array(HistoryEntry),
  availableActions: z.array(AvailableAction),
  trackingNote: z.string().nullable(),
});

export const ReturnRequest = z.object({
  id: Id,
  number: z.string(),
  salesOrderId: Id,
  salesOrderNumber: z.string(),
  customerName: z.string(),
  status: ReturnStatus,
  lines: z.array(z.object({ name: z.string(), quantity: Quantity, reason: z.string() })),
  reason: z.string(),
  inspectionResult: z.enum(["RESELLABLE", "DAMAGED", "RETURN_TO_SUPPLIER"]).nullable(),
  refundAmount: Money.nullable(),
  refundMethod: z.enum(["ORIGINAL", "BALANCE"]).nullable(),
  createdAt: IsoDateTime,
  history: z.array(HistoryEntry),
  availableActions: z.array(AvailableAction),
});

export const CreateReturnRequest = z.object({
  salesOrderId: z.string(),
  lines: z.array(z.object({ lineId: z.string(), quantity: z.string() })).min(1, { message: "validation.selectAtLeastOne" }),
  reason: z.string().min(3, { message: "validation.required" }),
  comment: z.string().optional(),
  photos: z.array(z.object({ name: z.string() })).default([]),
});

export const Quote = z.object({
  id: Id,
  number: z.string(),
  companyName: z.string(),
  status: QuoteStatus,
  lines: z.array(z.object({ sku: z.string(), name: z.string(), quantity: Quantity, unitPrice: Money.nullable(), total: Money.nullable() })),
  total: Money.nullable(),
  validUntil: IsoDateTime.nullable(),
  requestedAt: IsoDateTime,
  managerName: z.string(),
  note: z.string().nullable(),
  availableActions: z.array(AvailableAction),
});

export const QuickOrderLine = z.object({ sku: z.string().min(1), quantity: z.string().regex(/^\d+(\.\d+)?$/) });
export const QuickOrderValidation = z.object({
  lines: z.array(
    z.object({
      sku: z.string(),
      quantity: Quantity,
      found: z.boolean(),
      name: z.string().nullable(),
      unitPrice: Money.nullable(),
      total: Money.nullable(),
      minQuantity: z.string().nullable(),
      error: z.string().nullable(),
      variantId: z.string().nullable(),
    }),
  ),
  total: Money,
  minOrderAmount: Money,
  meetsMinimum: z.boolean(),
});
