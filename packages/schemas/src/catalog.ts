import { z } from "zod";
import { Attachment, Id, IsoDateTime, LocalizedText, Money, Quantity } from "./common";
import { AttributeType, CostingMethod, DiscountStacking, FilterDisplay, PriceType, ProductType } from "./enums";

/** Kataloq, PIM, SKU, marka/model/uyğunluq, filtr, axtarış (PRD §24–30), qiymət (§46) */

export const Category = z.object({
  id: Id,
  parentId: z.string().nullable(),
  slug: z.string(),
  path: z.array(z.string()), // slugs from root
  name: z.string(),
  nameI18n: LocalizedText.optional(),
  imageUrl: z.string().nullable(),
  attributeSetIds: z.array(z.string()),
  order: z.number(),
  active: z.boolean(),
  productCount: z.number(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  costingMethod: CostingMethod.nullable().optional(),
});

export type CategoryNode = z.infer<typeof Category> & { children: CategoryNode[] };

export const AttributeOption = z.object({ value: z.string(), label: z.string(), labelI18n: LocalizedText.optional() });

export const Attribute = z.object({
  id: Id,
  code: z.string(),
  name: z.string(),
  nameI18n: LocalizedText.optional(),
  type: AttributeType,
  unit: z.string().nullable(),
  required: z.boolean(),
  filterable: z.boolean(),
  filterDisplay: FilterDisplay.nullable(),
  comparable: z.boolean(),
  variantDefining: z.boolean(),
  group: z.string(),
  options: z.array(AttributeOption),
  categoryIds: z.array(z.string()),
});

export const Brand = z.object({
  id: Id,
  slug: z.string(),
  name: z.string(),
  country: z.string(),
  logoText: z.string(),
  seriesCount: z.number(),
  modelCount: z.number(),
  active: z.boolean(),
});

export const Series = z.object({ id: Id, brandId: Id, name: z.string() });

export const DeviceModel = z.object({
  id: Id,
  brandId: Id,
  brandName: z.string(),
  seriesId: z.string().nullable(),
  seriesName: z.string().nullable(),
  categoryId: Id,
  categoryName: z.string(),
  name: z.string(),
  fullName: z.string(),
  code: z.string(),
  compatiblePartCount: z.number(),
});

/** Backend-in qaytardığı qiymət obyekti (PRD §46.4) */
export const AppliedDiscount = z.object({
  code: z.string(),
  label: z.string(),
  amount: Money,
  stacking: DiscountStacking,
  applied: z.boolean(),
  skippedReason: z.string().nullable().optional(),
});

export const InstallmentPlan = z.object({ months: z.number(), provider: z.string(), markupPercent: z.number(), total: Money, monthly: Money, difference: Money });

export const Price = z.object({
  basePrice: Money,
  effectivePrice: Money,
  priceType: PriceType,
  appliedDiscounts: z.array(AppliedDiscount),
  vat: z.object({ rate: z.string(), included: z.boolean() }),
  tiers: z.array(z.object({ minQuantity: z.string(), price: Money })).optional(),
  unitPrices: z.array(z.object({ unit: z.string(), label: z.string(), factor: z.string(), price: Money })).optional(),
  installment: z.object({ months: z.number(), monthly: Money, provider: z.string() }).nullable().optional(),
  /** Kredit şərtləri: müddət, əlavə faiz, ümumi məbləğ, aylıq ödəniş və nağd qiymətdən fərq. */
  installmentPlans: z.array(InstallmentPlan).optional(),
});

export const BranchStock = z.object({
  branchId: Id,
  branchName: z.string(),
  available: Quantity,
  status: z.enum(["IN_STOCK", "LOW", "OUT_OF_STOCK"]),
});

export const Variant = z.object({
  id: Id,
  sku: z.string(),
  barcode: z.string(),
  name: z.string(),
  attributes: z.record(z.string(), z.string()),
  price: Price,
  stockStatus: z.enum(["IN_STOCK", "LOW", "OUT_OF_STOCK"]),
  available: Quantity,
  weightKg: z.string(),
  dimensionsCm: z.string(),
});

export const ProductAttributeValue = z.object({
  code: z.string(),
  name: z.string(),
  group: z.string(),
  value: z.string(),
  displayValue: z.string(),
  comparable: z.boolean(),
});

export const ProductSummary = z.object({
  id: Id,
  slug: z.string(),
  name: z.string(),
  type: ProductType,
  brandName: z.string(),
  brandSlug: z.string(),
  modelName: z.string().nullable(),
  categoryId: Id,
  categoryName: z.string(),
  categoryPath: z.array(z.string()),
  imageUrl: z.string(),
  imageTone: z.string(),
  rating: z.number(),
  reviewCount: z.number(),
  price: Price,
  stockStatus: z.enum(["IN_STOCK", "LOW", "OUT_OF_STOCK"]),
  isNew: z.boolean(),
  hasPromotion: z.boolean(),
  baseUnit: z.string(),
  variantCount: z.number(),
  defaultVariantId: Id,
  highlights: z.array(z.string()),
  country: z.string(),
  installable: z.boolean(),
});

export const Product = ProductSummary.extend({
  description: z.string(),
  nameI18n: LocalizedText.optional(),
  descriptionI18n: LocalizedText.optional(),
  sku: z.string(),
  gallery: z.array(Attachment),
  videoUrl: z.string().nullable(),
  variants: z.array(Variant),
  variantAttributes: z.array(z.object({ code: z.string(), name: z.string(), options: z.array(z.string()) })),
  attributes: z.array(ProductAttributeValue),
  branchStock: z.array(BranchStock),
  compatibleModels: z.array(z.object({ id: Id, fullName: z.string() })),
  analogs: z.array(z.object({ id: Id, slug: z.string(), name: z.string(), oemCode: z.string().nullable() })),
  warranty: z.object({ months: z.number(), type: z.string() }),
  deliveryOptions: z.array(z.object({ method: z.string(), label: z.string(), price: Money.nullable(), eta: z.string() })),
  installationService: z.object({ serviceId: Id, slug: z.string(), name: z.string(), price: Money }).nullable(),
  related: z.array(ProductSummary),
  returnRestriction: z.string().nullable(),
  visibility: z.array(z.string()),
  unitConversions: z.array(z.object({ unit: z.string(), factor: z.string() })),
  status: z.enum(["ACTIVE", "DRAFT", "ARCHIVED"]),
  createdAt: IsoDateTime,
});

export const FacetOption = z.object({ value: z.string(), label: z.string(), count: z.number(), selected: z.boolean() });
export const Facet = z.object({
  code: z.string(),
  name: z.string(),
  display: FilterDisplay,
  unit: z.string().nullable(),
  options: z.array(FacetOption),
  range: z.object({ min: z.number(), max: z.number(), selectedMin: z.number().nullable(), selectedMax: z.number().nullable() }).nullable(),
});

export const ProductListResponse = z.object({
  items: z.array(ProductSummary),
  meta: z.object({ page: z.number(), pageSize: z.number(), total: z.number(), totalPages: z.number() }),
  facets: z.array(Facet),
  category: Category.nullable(),
  breadcrumbs: z.array(z.object({ slug: z.string(), name: z.string(), href: z.string() })),
  children: z.array(Category),
});

export const SearchResponse = z.object({
  query: z.string(),
  normalizedQuery: z.string(),
  products: z.array(ProductSummary),
  spareParts: z.array(ProductSummary),
  brands: z.array(z.object({ id: Id, slug: z.string(), name: z.string() })),
  models: z.array(z.object({ id: Id, fullName: z.string(), compatiblePartCount: z.number() })),
  services: z.array(z.object({ id: Id, slug: z.string(), name: z.string(), categoryName: z.string() })),
  faq: z.array(z.object({ id: Id, question: z.string() })),
  suggestions: z.array(z.string()),
  total: z.number(),
});

export const CompatibilityRecord = z.object({
  id: Id,
  productId: Id,
  productName: z.string(),
  sku: z.string(),
  modelId: Id,
  modelFullName: z.string(),
  source: z.enum(["MANUAL", "SERIES", "IMPORT"]),
  createdAt: IsoDateTime,
});

export const Unit = z.object({
  id: Id,
  code: z.string(),
  name: z.string(),
  short: z.string(),
  nameI18n: LocalizedText.optional(),
  precision: z.number(),
  system: z.boolean(),
});

export const PriceListEntry = z.object({
  id: Id,
  priceType: PriceType,
  name: z.string(),
  description: z.string(),
  currency: z.string(),
  vatIncluded: z.boolean(),
  itemCount: z.number(),
  active: z.boolean(),
  updatedAt: IsoDateTime,
});

export const Promotion = z.object({
  id: Id,
  code: z.string(),
  name: z.string(),
  kind: z.enum(["PERCENT", "FIXED", "PROMO_CODE", "SUBSCRIPTION"]),
  value: z.string(),
  stacking: DiscountStacking,
  combinableWith: z.array(z.string()),
  priority: z.number(),
  base: z.enum(["BASE_PRICE", "AFTER_PREVIOUS"]),
  maxDiscount: Money.nullable(),
  appliesTo: z.string(),
  segments: z.array(z.string()),
  startsAt: IsoDateTime,
  endsAt: IsoDateTime.nullable(),
  active: z.boolean(),
  usageCount: z.number(),
});

export const ProductUpsert = z.object({
  nameI18n: z.object({ az: z.string().min(2), ru: z.string().optional(), en: z.string().optional() }),
  slug: z.string().min(2),
  type: ProductType,
  brandId: z.string().min(1),
  categoryId: z.string().min(1),
  baseUnit: z.string().min(1),
  status: z.enum(["ACTIVE", "DRAFT", "ARCHIVED"]),
  descriptionI18n: z.object({ az: z.string(), ru: z.string().optional(), en: z.string().optional() }).optional(),
  attributes: z.record(z.string(), z.string()).default({}),
});
