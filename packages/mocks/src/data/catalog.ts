import type { LocalizedText } from "@sp/types";
import { L } from "../lib/i18n";
import { idFor } from "../lib/rng";
import { daysAgo } from "../lib/time";
import { EQ, SVC } from "./services";
import { extraAttributes, extraBrands, extraCategories, extraModels, extraProducts } from "./catalogExtra";

/** Məhsul kataloqu, PIM atributları, marka → seriya → model, SKU variantları (PRD §24–27) */

export interface ProductCategoryRec {
  id: string;
  parentId: string | null;
  slug: string;
  name: LocalizedText;
  attributeCodes: string[];
  order: number;
  active: boolean;
  imageTone: string;
  costingMethod: "WEIGHTED_AVERAGE" | "FIFO" | null;
}

const cat = (key: string, parent: string | null, slug: string, name: LocalizedText, attrs: string[], order: number, tone: string, costing: ProductCategoryRec["costingMethod"] = null): ProductCategoryRec => ({
  id: idFor(`pcat:${key}`),
  parentId: parent ? idFor(`pcat:${parent}`) : null,
  slug,
  name,
  attributeCodes: attrs,
  order,
  active: true,
  imageTone: tone,
  costingMethod: costing,
});

export const productCategories: ProductCategoryRec[] = [
  cat("ac", null, "kondisionerler", L("Kondisionerlər", "Кондиционеры", "Air conditioners"), ["cooling_btu", "heating_kw", "inverter", "energy_class", "refrigerant", "room_area", "noise_db", "wifi", "color"], 1, "sky"),
  cat("ac-split", "ac", "split-sistemler", L("Split sistemlər", "Сплит-системы", "Split systems"), [], 1, "sky"),
  cat("ac-multi", "ac", "multi-split", L("Multi-split", "Мульти-сплит", "Multi-split"), [], 2, "sky"),
  cat("boiler", null, "kombiler", L("Kombilər", "Котлы", "Boilers"), ["power_kw", "heating_area", "fuel", "hot_water", "flue_type"], 2, "orange"),
  cat("radiator", null, "radiatorlar", L("Radiatorlar", "Радиаторы", "Radiators"), ["material", "sections", "power_w", "height_mm"], 3, "red"),
  cat("pump", null, "nasoslar", L("Nasoslar", "Насосы", "Pumps"), ["power_kw", "flow_m3h", "head_m", "pump_kind"], 4, "emerald"),
  cat("pipe", null, "borular", L("Borular", "Трубы", "Pipes"), ["material", "diameter_mm", "wall_mm", "pressure_bar"], 5, "amber", "FIFO"),
  cat("pipe-copper", "pipe", "mis-borular", L("Mis borular", "Медные трубы", "Copper pipes"), [], 1, "amber", "FIFO"),
  cat("gas", null, "qaz-ve-freon", L("Qaz və freon", "Газ и фреон", "Gas & refrigerant"), ["refrigerant", "cylinder_kg"], 6, "cyan", "FIFO"),
  cat("parts", null, "ehtiyat-hisseleri", L("Ehtiyat hissələri", "Запчасти", "Spare parts"), ["part_kind"], 7, "slate"),
  cat("parts-compressor", "parts", "kompressorlar", L("Kompressorlar", "Компрессоры", "Compressors"), ["cooling_btu", "refrigerant", "voltage"], 1, "slate"),
  cat("parts-filter", "parts", "filtrler", L("Filtrlər", "Фильтры", "Filters"), [], 2, "slate"),
  cat("parts-sensor", "parts", "sensorlar", L("Sensorlar", "Датчики", "Sensors"), [], 3, "slate"),
  cat("parts-electronics", "parts", "elektronika", L("Elektronika", "Электроника", "Electronics"), [], 4, "slate"),
  cat("pool", null, "hovuz-avadanligi", L("Hovuz avadanlığı", "Оборудование для бассейнов", "Pool equipment"), ["power_kw", "flow_m3h"], 8, "blue"),
  cat("electric", null, "elektrik", L("Elektrik", "Электрика", "Electrical"), ["section_mm2", "cores"], 9, "yellow"),
  cat("ventilation", null, "ventilyasiya", L("Ventilyasiya", "Вентиляция", "Ventilation"), ["flow_m3h", "noise_db"], 10, "teal"),
  cat("consumables", null, "serfiyyat-materiallari", L("Sərfiyyat materialları", "Расходные материалы", "Consumables"), [], 11, "stone"),
];

productCategories.push(...extraCategories.map(([key, parent, slug, [az, ru, en], attrs, order, tone]) => cat(key, parent, slug, L(az, ru, en), attrs, order, tone, key === "insulation" || key === "cables" ? "FIFO" : null)));

export const PC = Object.fromEntries(productCategories.map((c) => [c.slug, c.id])) as Record<string, string>;

type Opt = [string, LocalizedText];
const o = (value: string, label: LocalizedText | string): Opt => [value, typeof label === "string" ? L(label) : label];

export interface AttributeRec {
  id: string;
  code: string;
  name: LocalizedText;
  type: "TEXT" | "NUMBER" | "NUMBER_UNIT" | "BOOLEAN" | "SELECT" | "MULTISELECT" | "DATE";
  unit: string | null;
  required: boolean;
  filterable: boolean;
  filterDisplay: "CHECKBOX" | "RANGE" | "SLIDER" | null;
  comparable: boolean;
  variantDefining: boolean;
  group: LocalizedText;
  options: { value: string; label: LocalizedText }[];
}

const G = {
  main: L("Əsas", "Основные", "Main"),
  energy: L("Enerji", "Энергия", "Energy"),
  dims: L("Ölçülər", "Размеры", "Dimensions"),
  tech: L("Texniki", "Технические", "Technical"),
};

const attr = (code: string, name: LocalizedText, type: AttributeRec["type"], group: LocalizedText, extra: Partial<AttributeRec> & { opts?: Opt[] } = {}): AttributeRec => ({
  id: idFor(`attr:${code}`),
  code,
  name,
  type,
  unit: extra.unit ?? null,
  required: extra.required ?? false,
  filterable: extra.filterable ?? true,
  filterDisplay: extra.filterDisplay ?? (type === "SELECT" || type === "MULTISELECT" || type === "BOOLEAN" ? "CHECKBOX" : "RANGE"),
  comparable: extra.comparable ?? true,
  variantDefining: extra.variantDefining ?? false,
  group,
  options: (extra.opts ?? []).map(([value, label]) => ({ value, label })),
});

export const attributes: AttributeRec[] = [
  attr("cooling_btu", L("Soyutma gücü", "Мощность охлаждения", "Cooling capacity"), "SELECT", G.main, { unit: "BTU/saat", required: true, variantDefining: true, opts: [o("9000", "9000"), o("12000", "12000"), o("18000", "18000"), o("24000", "24000"), o("36000", "36000"), o("48000", "48000")] }),
  attr("heating_kw", L("İsitmə gücü", "Мощность обогрева", "Heating capacity"), "NUMBER_UNIT", G.energy, { unit: "kW", filterable: false }),
  attr("inverter", L("Texnologiya", "Технология", "Technology"), "SELECT", G.main, { opts: [o("inverter", L("Inverter", "Инвертор", "Inverter")), o("onoff", L("On/Off", "On/Off", "On/Off"))] }),
  attr("energy_class", L("Enerji sinfi", "Класс энергоэффективности", "Energy class"), "SELECT", G.energy, { opts: [o("A+", "A+"), o("A++", "A++"), o("A+++", "A+++"), o("A", "A")] }),
  attr("refrigerant", L("Qaz tipi", "Тип хладагента", "Refrigerant"), "SELECT", G.tech, { opts: [o("R32", "R32"), o("R410A", "R410A"), o("R22", "R22"), o("R290", "R290"), o("R134a", "R134a")] }),
  attr("room_area", L("Tövsiyə olunan sahə", "Рекомендуемая площадь", "Recommended area"), "NUMBER_UNIT", G.main, { unit: "m²", filterDisplay: "SLIDER" }),
  attr("noise_db", L("Səs səviyyəsi", "Уровень шума", "Noise level"), "NUMBER_UNIT", G.tech, { unit: "dB" }),
  attr("wifi", L("Wi-Fi", "Wi-Fi", "Wi-Fi"), "BOOLEAN", G.main, {}),
  attr("color", L("Rəng", "Цвет", "Color"), "SELECT", G.main, { variantDefining: true, opts: [o("white", L("Ağ", "Белый", "White")), o("black", L("Qara", "Чёрный", "Black")), o("silver", L("Gümüşü", "Серебристый", "Silver"))] }),
  attr("power_kw", L("Güc", "Мощность", "Power"), "NUMBER_UNIT", G.energy, { unit: "kW" }),
  attr("heating_area", L("İsitmə sahəsi", "Площадь отопления", "Heating area"), "NUMBER_UNIT", G.main, { unit: "m²" }),
  attr("fuel", L("Yanacaq növü", "Вид топлива", "Fuel"), "SELECT", G.main, { opts: [o("gas", L("Təbii qaz", "Природный газ", "Natural gas")), o("electric", L("Elektrik", "Электричество", "Electric"))] }),
  attr("hot_water", L("İsti su məhsuldarlığı", "Производительность ГВС", "Hot water output"), "NUMBER_UNIT", G.tech, { unit: "l/dəq", filterable: false }),
  attr("flue_type", L("Baca tipi", "Тип дымохода", "Flue type"), "SELECT", G.tech, { opts: [o("turbo", L("Turbo (qapalı)", "Турбо (закрытый)", "Turbo (sealed)")), o("chimney", L("Atmosfer", "Атмосферный", "Open flue"))] }),
  attr("material", L("Material", "Материал", "Material"), "SELECT", G.main, { opts: [o("copper", L("Mis", "Медь", "Copper")), o("pprc", "PPR-C"), o("steel", L("Polad", "Сталь", "Steel")), o("aluminium", L("Alüminium", "Алюминий", "Aluminium")), o("bimetal", L("Bimetal", "Биметалл", "Bimetal")), o("pex", "PE-Xa"), o("multilayer", L("Metal-plastik", "Металлопластик", "Multilayer"))] }),
  attr("diameter_mm", L("Diametr", "Диаметр", "Diameter"), "SELECT", G.dims, { unit: "mm", variantDefining: true, opts: [o("6.35", "6.35 (1/4\")"), o("9.52", "9.52 (3/8\")"), o("12.7", "12.7 (1/2\")"), o("15.88", "15.88 (5/8\")"), o("20", "20"), o("25", "25")] }),
  attr("wall_mm", L("Divar qalınlığı", "Толщина стенки", "Wall thickness"), "NUMBER_UNIT", G.dims, { unit: "mm", filterable: false }),
  attr("pressure_bar", L("İşçi təzyiq", "Рабочее давление", "Working pressure"), "NUMBER_UNIT", G.tech, { unit: "bar", filterable: false }),
  attr("cylinder_kg", L("Balon çəkisi", "Вес баллона", "Cylinder weight"), "NUMBER_UNIT", G.main, { unit: "kq", filterable: false }),
  attr("part_kind", L("Hissə növü", "Тип запчасти", "Part type"), "SELECT", G.main, { opts: [o("compressor", L("Kompressor", "Компрессор", "Compressor")), o("board", L("Elektron plata", "Плата", "Control board")), o("sensor", L("Sensor", "Датчик", "Sensor")), o("filter", L("Filtr", "Фильтр", "Filter")), o("fan", L("Ventilyator", "Вентилятор", "Fan motor"))] }),
  attr("voltage", L("Gərginlik", "Напряжение", "Voltage"), "SELECT", G.tech, { unit: "V", opts: [o("220", "220 V"), o("380", "380 V")] }),
  attr("sections", L("Seksiya sayı", "Количество секций", "Sections"), "SELECT", G.dims, { variantDefining: true, opts: [o("6", "6"), o("8", "8"), o("10", "10"), o("12", "12")] }),
  attr("power_w", L("İstilik gücü", "Теплоотдача", "Heat output"), "NUMBER_UNIT", G.energy, { unit: "W" }),
  attr("height_mm", L("Hündürlük", "Высота", "Height"), "SELECT", G.dims, { unit: "mm", opts: [o("350", "350"), o("500", "500")] }),
  attr("flow_m3h", L("Məhsuldarlıq", "Производительность", "Flow rate"), "NUMBER_UNIT", G.tech, { unit: "m³/saat" }),
  attr("head_m", L("Basqı", "Напор", "Head"), "NUMBER_UNIT", G.tech, { unit: "m" }),
  attr("pump_kind", L("Nasos növü", "Тип насоса", "Pump type"), "SELECT", G.main, { opts: [o("circulation", L("Sirkulyasiya", "Циркуляционный", "Circulation")), o("well", L("Dərinlik", "Глубинный", "Well")), o("drainage", L("Drenaj", "Дренажный", "Drainage")), o("booster", L("Təzyiqartırıcı", "Повысительный", "Booster"))] }),
  attr("section_mm2", L("Kəsik", "Сечение", "Cross-section"), "SELECT", G.tech, { unit: "mm²", variantDefining: true, opts: [o("1.5", "1.5"), o("2.5", "2.5"), o("4", "4")] }),
  attr("cores", L("Damar sayı", "Количество жил", "Cores"), "SELECT", G.tech, { opts: [o("3", "3"), o("5", "5")] }),
];

attributes.push(...extraAttributes.map(([code, [az, ru, en], type, group, unit, variantDefining, opts]) => attr(code, L(az, ru, en), type, G[group], { unit, variantDefining, opts: opts.map(([v, l]) => o(v, typeof l === "string" ? l : L(l[0], l[1], l[2]))) })));

export interface BrandRec { id: string; slug: string; name: string; country: string; active: boolean }
export const brands: BrandRec[] = [
  ["lg", "LG", "Cənubi Koreya"], ["samsung", "Samsung", "Cənubi Koreya"], ["bosch", "Bosch", "Almaniya"], ["midea", "Midea", "Çin"],
  ["daikin", "Daikin", "Yaponiya"], ["gree", "Gree", "Çin"], ["baxi", "Baxi", "İtaliya"], ["ariston", "Ariston", "İtaliya"],
  ["vaillant", "Vaillant", "Almaniya"], ["grundfos", "Grundfos", "Danimarka"], ["wilo", "Wilo", "Almaniya"], ["kermi", "Kermi", "Almaniya"],
  ["mueller", "Mueller", "ABŞ"], ["honeywell", "Honeywell", "ABŞ"], ["copeland", "Copeland", "ABŞ"], ["prysmian", "Prysmian", "İtaliya"],
  ...extraBrands,
].map(([slug, name, country]) => ({ id: idFor(`brand:${slug}`), slug: slug!, name: name!, country: country!, active: true }));
export const BRAND = Object.fromEntries(brands.map((b) => [b.slug, b.id])) as Record<string, string>;

export interface SeriesRec { id: string; brandId: string; name: string }
export interface ModelRec { id: string; brandId: string; seriesId: string | null; categoryId: string; name: string; code: string }

const seriesDefs: [string, string, string][] = [
  ["lg-dualcool", "lg", "DualCool"], ["lg-artcool", "lg", "ArtCool"], ["samsung-windfree", "samsung", "WindFree"], ["midea-xtreme", "midea", "Xtreme"],
  ["daikin-sensira", "daikin", "Sensira"], ["gree-bora", "gree", "Bora"], ["bosch-condens", "bosch", "Condens"], ["baxi-luna", "baxi", "Luna"],
  ["ariston-clas", "ariston", "Clas"], ["vaillant-ecotec", "vaillant", "ecoTEC"], ["grundfos-scala", "grundfos", "SCALA"], ["wilo-star", "wilo", "Star"],
];
export const series: SeriesRec[] = seriesDefs.map(([key, brand, name]) => ({ id: idFor(`series:${key}`), brandId: BRAND[brand]!, name }));
const SER = Object.fromEntries(seriesDefs.map(([key], i) => [key, series[i]!.id])) as Record<string, string>;

const modelDefs: [string, string, string | null, string, string, string][] = [
  ["lg-x123", "lg", "lg-dualcool", EQ.ac, "DualCool X123", "S12EQ"],
  ["lg-x124", "lg", "lg-dualcool", EQ.ac, "DualCool X124", "S18EQ"],
  ["lg-a50", "lg", "lg-artcool", EQ.ac, "ArtCool A50", "AC09BH"],
  ["lg-18000", "lg", "lg-dualcool", EQ.ac, "DualCool 18000 BTU", "S18ET"],
  ["samsung-wf", "samsung", "samsung-windfree", EQ.ac, "WindFree Comfort 12", "AR12TXFC"],
  ["midea-x9", "midea", "midea-xtreme", EQ.ac, "Xtreme Save 09", "MSAG-09"],
  ["daikin-s25", "daikin", "daikin-sensira", EQ.ac, "Sensira FTXC25", "FTXC25D"],
  ["gree-bora18", "gree", "gree-bora", EQ.ac, "Bora 18", "GWH18AAD"],
  ["bosch-7000", "bosch", "bosch-condens", EQ.boiler, "Condens 7000", "GC7000iW"],
  ["bosch-2300", "bosch", "bosch-condens", EQ.boiler, "Condens 2300", "GC2300iW"],
  ["baxi-eco", "baxi", "baxi-luna", EQ.boiler, "Luna Duo-tec 24", "LDT24"],
  ["ariston-clas-one", "ariston", "ariston-clas", EQ.boiler, "Clas One 24", "CLAS1-24"],
  ["vaillant-plus", "vaillant", "vaillant-ecotec", EQ.boiler, "ecoTEC plus 25", "VUW256"],
  ["grundfos-scala2", "grundfos", "grundfos-scala", EQ.pump, "SCALA2 3-45", "SCALA2-345"],
  ["wilo-rs", "wilo", "wilo-star", EQ.pump, "Star-RS 25/6", "RS256"],
  ["pool-xyz", "grundfos", null, EQ.pool, "Pool Pump XYZ", "PPXYZ"],
  ...extraModels.map(([key, brand, ser, eq, name, code]) => [key, brand, ser, EQ[eq], name, code] as [string, string, string | null, string, string, string]),
];
export const models: ModelRec[] = modelDefs.map(([key, brand, ser, catId, name, code]) => ({
  id: idFor(`model:${key}`),
  brandId: BRAND[brand]!,
  seriesId: ser ? SER[ser]! : null,
  categoryId: catId,
  name,
  code,
}));
export const MODEL = Object.fromEntries(modelDefs.map(([key], i) => [key, models[i]!.id])) as Record<string, string>;

/* ------------------------------------------------------------------ */
/* Məhsullar                                                            */
/* ------------------------------------------------------------------ */

export interface VariantRec {
  id: string;
  sku: string;
  barcode: string;
  attributes: Record<string, string>;
  prices: { RETAIL: number; TECHNICIAN: number; PARTNER: number; WHOLESALE: number };
  weightKg: string;
  dimensionsCm: string;
}

export interface ProductRec {
  id: string;
  slug: string;
  name: LocalizedText;
  description: LocalizedText;
  highlights: LocalizedText[];
  type: "PHYSICAL" | "SPARE_PART" | "CONSUMABLE" | "BUNDLE";
  brandId: string;
  modelId: string | null;
  categoryId: string;
  baseUnit: string;
  conversions: { unit: string; factor: number; packagePriceCents?: number }[];
  attributes: Record<string, string>;
  variantAttrCodes: string[];
  variants: VariantRec[];
  rating: number;
  reviewCount: number;
  isNew: boolean;
  country: string;
  imageKind: string;
  imageTone: string;
  warrantyMonths: number;
  installServiceId: string | null;
  compatibleModelIds: string[];
  analogIds: string[];
  oemCode: string | null;
  visibility: string[];
  status: "ACTIVE" | "DRAFT" | "ARCHIVED";
  createdAt: string;
  returnRestriction: "return.cutToLength" | "return.installed" | null;
  videoUrl: string | null;
  bulky: boolean;
}

let barcodeSeq = 4760000000000;
const prices = (retail: number, tech = 0.8, partner = 0.75, wholesale = 0.7) => ({
  RETAIL: retail,
  TECHNICIAN: Math.round(retail * tech),
  PARTNER: Math.round(retail * partner),
  WHOLESALE: Math.round(retail * wholesale),
});

const variant = (productKey: string, sku: string, attrs: Record<string, string>, retail: number, weight = "1.0", dims = "10×10×10", ratios?: [number, number, number]): VariantRec => ({
  id: idFor(`variant:${productKey}:${sku}`),
  sku,
  barcode: String((barcodeSeq += 17)),
  attributes: attrs,
  prices: ratios ? prices(retail, ...ratios) : prices(retail),
  weightKg: weight,
  dimensionsCm: dims,
});

interface PDef {
  key: string;
  slug: string;
  name: LocalizedText;
  desc: LocalizedText;
  highlights?: LocalizedText[];
  type?: ProductRec["type"];
  brand: string;
  model?: string;
  category: string;
  unit?: string;
  conversions?: ProductRec["conversions"];
  attrs: Record<string, string>;
  variantAttrs?: string[];
  variants: VariantRec[];
  rating: number;
  reviews: number;
  isNew?: boolean;
  image: string;
  tone: string;
  warranty: number;
  install?: string;
  compatible?: string[];
  analogs?: string[];
  oem?: string;
  visibility?: string[];
  restriction?: ProductRec["returnRestriction"];
  video?: boolean;
  bulky?: boolean;
  status?: ProductRec["status"];
}

const acDesc = (name: string) =>
  L(
    `${name} — sakit iş rejimi, sürətli soyutma və enerjiyə qənaət edən inverter texnologiyası. Qış rejimində -15°C-yə qədər isitmə. Paketə daxildir: daxili və xarici blok, pult, montaj dəsti. Quraşdırma xidmətini səbətə əlavə edə bilərsiniz.`,
    `${name} — тихая работа, быстрое охлаждение и энергоэффективная инверторная технология. Обогрев до -15°C. В комплекте: внутренний и внешний блоки, пульт, монтажный комплект.`,
    `${name} — quiet operation, fast cooling and energy-saving inverter technology. Heating down to -15°C. In the box: indoor and outdoor units, remote and mounting kit.`,
  );

const acVariants = (key: string, base: string, btuPrices: [string, number][], colors = ["white"]) =>
  btuPrices.flatMap(([btu, price]) =>
    colors.map((color) => variant(key, `${base}-${btu.slice(0, 2)}${color === "white" ? "W" : color === "black" ? "B" : "S"}`, { cooling_btu: btu, color }, price + (color === "white" ? 0 : 6000), btu === "9000" ? "32" : btu === "12000" ? "38" : "52", "90×30×22 / 80×55×30")),
  );

const pdefs: PDef[] = [
  {
    key: "lg-dualcool", slug: "lg-dualcool-inverter", name: L("LG DualCool Inverter", "LG DualCool Inverter", "LG DualCool Inverter"), desc: acDesc("LG DualCool Inverter"),
    highlights: [L("Dual Inverter kompressor", "Компрессор Dual Inverter", "Dual Inverter compressor"), L("Wi-Fi idarəetmə (ThinQ)", "Управление по Wi-Fi (ThinQ)", "Wi-Fi control (ThinQ)"), L("A++ enerji sinfi", "Класс A++", "A++ energy class")],
    brand: "lg", model: "lg-x123", category: "split-sistemler", attrs: { heating_kw: "3.8", inverter: "inverter", energy_class: "A++", refrigerant: "R32", room_area: "35", noise_db: "19", wifi: "true" },
    variantAttrs: ["cooling_btu", "color"], variants: acVariants("lg-dualcool", "LG-DC", [["9000", 115000], ["12000", 135000], ["18000", 189000], ["24000", 239000]], ["white", "silver"]),
    rating: 4.8, reviews: 126, image: "ac", tone: "sky", warranty: 36, install: SVC["ac-install"], video: true, bulky: true,
  },
  {
    key: "lg-artcool", slug: "lg-artcool-gallery", name: L("LG ArtCool Gallery", "LG ArtCool Gallery", "LG ArtCool Gallery"), desc: acDesc("LG ArtCool Gallery"),
    highlights: [L("Dizayner panel", "Дизайнерская панель", "Designer panel"), L("Plazma filtr", "Плазменный фильтр", "Plasma filter")],
    brand: "lg", model: "lg-a50", category: "split-sistemler", attrs: { heating_kw: "3.2", inverter: "inverter", energy_class: "A+++", refrigerant: "R32", room_area: "28", noise_db: "21", wifi: "true" },
    variantAttrs: ["cooling_btu", "color"], variants: acVariants("lg-artcool", "LG-AC", [["9000", 169000], ["12000", 199000]], ["black", "white"]),
    rating: 4.9, reviews: 41, isNew: true, image: "ac", tone: "slate", warranty: 36, install: SVC["ac-install"], bulky: true,
  },
  {
    key: "samsung-windfree", slug: "samsung-windfree-comfort", name: L("Samsung WindFree Comfort", "Samsung WindFree Comfort", "Samsung WindFree Comfort"), desc: acDesc("Samsung WindFree Comfort"),
    highlights: [L("Küləksiz soyutma", "Охлаждение без сквозняка", "Wind-free cooling"), L("AI Auto Comfort", "AI Auto Comfort", "AI Auto Comfort")],
    brand: "samsung", model: "samsung-wf", category: "split-sistemler", attrs: { heating_kw: "3.5", inverter: "inverter", energy_class: "A++", refrigerant: "R32", room_area: "35", noise_db: "16", wifi: "true" },
    variantAttrs: ["cooling_btu"], variants: acVariants("samsung-windfree", "SM-WF", [["12000", 159000], ["18000", 219000]]),
    rating: 4.7, reviews: 88, image: "ac", tone: "cyan", warranty: 36, install: SVC["ac-install"], bulky: true,
  },
  {
    key: "midea-xtreme", slug: "midea-xtreme-save", name: L("Midea Xtreme Save", "Midea Xtreme Save", "Midea Xtreme Save"), desc: acDesc("Midea Xtreme Save"),
    highlights: [L("Sərfəli qiymət", "Выгодная цена", "Great value"), L("Self-clean funksiyası", "Функция самоочистки", "Self-clean")],
    brand: "midea", model: "midea-x9", category: "split-sistemler", attrs: { heating_kw: "2.8", inverter: "onoff", energy_class: "A+", refrigerant: "R410A", room_area: "25", noise_db: "26", wifi: "false" },
    variantAttrs: ["cooling_btu"], variants: acVariants("midea-xtreme", "MD-XS", [["9000", 69000], ["12000", 79000], ["18000", 109000]]),
    rating: 4.4, reviews: 203, image: "ac", tone: "indigo", warranty: 24, install: SVC["ac-install"], bulky: true,
  },
  {
    key: "daikin-sensira", slug: "daikin-sensira", name: L("Daikin Sensira", "Daikin Sensira", "Daikin Sensira"), desc: acDesc("Daikin Sensira"),
    brand: "daikin", model: "daikin-s25", category: "split-sistemler", attrs: { heating_kw: "3.4", inverter: "inverter", energy_class: "A++", refrigerant: "R32", room_area: "30", noise_db: "20", wifi: "false" },
    variantAttrs: ["cooling_btu"], variants: acVariants("daikin-sensira", "DK-SN", [["9000", 139000], ["12000", 159000], ["24000", 269000]]),
    rating: 4.8, reviews: 57, image: "ac", tone: "sky", warranty: 36, install: SVC["ac-install"], bulky: true,
  },
  {
    key: "gree-multi", slug: "gree-free-match-multi", name: L("Gree Free Match multi-split", "Gree Free Match мульти-сплит", "Gree Free Match multi-split"), desc: acDesc("Gree Free Match"),
    brand: "gree", model: "gree-bora18", category: "multi-split", attrs: { heating_kw: "5.6", inverter: "inverter", energy_class: "A++", refrigerant: "R32", room_area: "80", noise_db: "22", wifi: "true" },
    variantAttrs: ["cooling_btu"], variants: [variant("gree-multi", "GR-FM-18", { cooling_btu: "18000" }, 329000, "68"), variant("gree-multi", "GR-FM-24", { cooling_btu: "24000" }, 399000, "74")],
    rating: 4.6, reviews: 19, isNew: true, image: "ac", tone: "teal", warranty: 36, install: SVC["ac-install"], bulky: true,
  },
  {
    key: "bosch-7000", slug: "bosch-condens-7000", name: L("Bosch Condens 7000 kondensasiya kombisi", "Конденсационный котёл Bosch Condens 7000", "Bosch Condens 7000 condensing boiler"),
    desc: L("Yüksək səmərəli kondensasiya kombisi: 108% FIK, rəngli displey, ağıllı termostat dəstəyi. Mənzil və fərdi evlər üçün.", "Высокоэффективный конденсационный котёл: КПД 108%, цветной дисплей, умный термостат.", "High-efficiency condensing boiler: 108% efficiency, colour display, smart thermostat support."),
    highlights: [L("108% səmərəlilik", "КПД 108%", "108% efficiency"), L("Sakit iş", "Тихая работа", "Quiet operation")],
    brand: "bosch", model: "bosch-7000", category: "kombiler", attrs: { heating_area: "240", fuel: "gas", hot_water: "14", flue_type: "turbo" },
    variantAttrs: ["power_kw"], variants: [variant("bosch-7000", "BS-C7-24", { power_kw: "24" }, 229000, "40", "72×40×30"), variant("bosch-7000", "BS-C7-30", { power_kw: "30" }, 259000, "42", "72×40×30")],
    rating: 4.8, reviews: 64, image: "boiler", tone: "orange", warranty: 24, install: SVC["boiler-install"], bulky: true,
  },
  {
    key: "baxi-luna", slug: "baxi-luna-duo-tec", name: L("Baxi Luna Duo-tec 24", "Baxi Luna Duo-tec 24", "Baxi Luna Duo-tec 24"),
    desc: L("İkikonturlu kondensasiya kombisi, modulyasiyalı ocaq və paslanmayan istilik mübadiləçisi.", "Двухконтурный конденсационный котёл с модулируемой горелкой.", "Dual-circuit condensing boiler with modulating burner."),
    brand: "baxi", model: "baxi-eco", category: "kombiler", attrs: { power_kw: "24", heating_area: "200", fuel: "gas", hot_water: "13.7", flue_type: "turbo" },
    variants: [variant("baxi-luna", "BX-LDT-24", {}, 189000, "36", "76×45×34")],
    rating: 4.6, reviews: 38, image: "boiler", tone: "amber", warranty: 24, install: SVC["boiler-install"], bulky: true,
  },
  {
    key: "ariston-clas", slug: "ariston-clas-one-24", name: L("Ariston Clas One 24", "Ariston Clas One 24", "Ariston Clas One 24"),
    desc: L("Kompakt kondensasiya kombisi, Wi-Fi ilə uzaqdan idarəetmə imkanı.", "Компактный конденсационный котёл с Wi-Fi.", "Compact condensing boiler with Wi-Fi control."),
    brand: "ariston", model: "ariston-clas-one", category: "kombiler", attrs: { power_kw: "24", heating_area: "180", fuel: "gas", hot_water: "12", flue_type: "turbo" },
    variants: [variant("ariston-clas", "AR-CL1-24", {}, 159000, "32", "70×40×30")],
    rating: 4.5, reviews: 72, image: "boiler", tone: "rose", warranty: 24, install: SVC["boiler-install"], bulky: true,
  },
  {
    key: "kermi-radiator", slug: "kermi-profil-radiator", name: L("Kermi alüminium radiator", "Алюминиевый радиатор Kermi", "Kermi aluminium radiator"),
    desc: L("Yüksək istilik ötürmə qabiliyyətli seksiyalı alüminium radiator.", "Секционный алюминиевый радиатор с высокой теплоотдачей.", "Sectional aluminium radiator with high heat output."),
    brand: "kermi", category: "radiatorlar", attrs: { material: "aluminium", power_w: "1450", height_mm: "500" },
    variantAttrs: ["sections"], variants: ["6", "8", "10", "12"].map((s) => variant("kermi-radiator", `KR-AL-${s}`, { sections: s }, 1900 * Number(s), String(Number(s) * 1.2), "58×8×(8×n)")),
    rating: 4.5, reviews: 25, image: "radiator", tone: "red", warranty: 60,
  },
  {
    key: "grundfos-scala2", slug: "grundfos-scala2", name: L("Grundfos SCALA2 təzyiqartırıcı nasos", "Насос повышения давления Grundfos SCALA2", "Grundfos SCALA2 booster pump"),
    desc: L("Evlər üçün kompakt, səssiz təzyiqartırıcı nasos sistemi, daxili quru işləmə qorunması.", "Компактная тихая насосная станция для дома с защитой от сухого хода.", "Compact, quiet domestic booster with dry-run protection."),
    brand: "grundfos", model: "grundfos-scala2", category: "nasoslar", attrs: { power_kw: "0.55", flow_m3h: "3", head_m: "45", pump_kind: "booster" },
    variants: [variant("grundfos-scala2", "GF-SC2-345", {}, 89000, "11", "40×20×25")],
    rating: 4.9, reviews: 33, image: "pump", tone: "emerald", warranty: 24, install: SVC["pump-repair"],
  },
  {
    key: "wilo-star", slug: "wilo-star-rs", name: L("Wilo Star-RS sirkulyasiya nasosu", "Циркуляционный насос Wilo Star-RS", "Wilo Star-RS circulation pump"),
    desc: L("İstilik sistemləri üçün 3 sürətli sirkulyasiya nasosu.", "Трёхскоростной циркуляционный насос для отопления.", "3-speed circulation pump for heating systems."),
    brand: "wilo", model: "wilo-rs", category: "nasoslar", attrs: { power_kw: "0.09", flow_m3h: "3.3", head_m: "6", pump_kind: "circulation" },
    variants: [variant("wilo-star", "WL-RS-256", {}, 21000, "2.5", "18×13×13")],
    rating: 4.6, reviews: 51, image: "pump", tone: "green", warranty: 24,
  },
  {
    key: "copper-pipe", slug: "mueller-mis-boru", name: L("Mueller mis boru (kondisioner üçün)", "Медная труба Mueller (для кондиционеров)", "Mueller copper pipe (for AC)"),
    desc: L("Freon xətləri üçün yumşaldılmış mis boru. Metrlə və ya 50 m-lik rulonla satılır. Rulon qiyməti metr qiymətindən sərfəlidir.", "Отожжённая медная труба для фреоновых трасс. Продаётся метрами или бухтами по 50 м.", "Annealed copper pipe for refrigerant lines. Sold per metre or in 50 m rolls."),
    type: "CONSUMABLE", brand: "mueller", category: "mis-borular", unit: "m", conversions: [{ unit: "roll", factor: 50, packagePriceCents: 18000 }],
    attrs: { material: "copper", wall_mm: "0.8", pressure_bar: "45" }, variantAttrs: ["diameter_mm"],
    variants: [variant("copper-pipe", "MU-CU-635", { diameter_mm: "6.35" }, 400, "0.12", "rulon Ø55"), variant("copper-pipe", "MU-CU-952", { diameter_mm: "9.52" }, 620, "0.18", "rulon Ø55"), variant("copper-pipe", "MU-CU-127", { diameter_mm: "12.7" }, 890, "0.25", "rulon Ø60"), variant("copper-pipe", "MU-CU-1588", { diameter_mm: "15.88" }, 1150, "0.33", "rulon Ø60")],
    rating: 4.7, reviews: 44, image: "pipe", tone: "amber", warranty: 12, restriction: "return.cutToLength",
  },
  {
    key: "pprc-pipe", slug: "pprc-boru", name: L("PPR-C su borusu", "Труба PPR-C", "PPR-C water pipe"),
    desc: L("İsti və soyuq su xətləri üçün polipropilen boru, 4 m-lik parçalar.", "Полипропиленовая труба для горячей и холодной воды, отрезки 4 м.", "Polypropylene pipe for hot & cold water, 4 m lengths."),
    type: "CONSUMABLE", brand: "kermi", category: "borular", unit: "m", conversions: [{ unit: "pack", factor: 40 }],
    attrs: { material: "pprc", wall_mm: "3.4", pressure_bar: "20" }, variantAttrs: ["diameter_mm"],
    variants: [variant("pprc-pipe", "PP-20", { diameter_mm: "20" }, 180, "0.2"), variant("pprc-pipe", "PP-25", { diameter_mm: "25" }, 260, "0.3")],
    rating: 4.3, reviews: 17, image: "pipe", tone: "stone", warranty: 12, restriction: "return.cutToLength",
  },
  {
    key: "r32", slug: "freon-r32", name: L("Freon R32 (balon)", "Фреон R32 (баллон)", "R32 refrigerant (cylinder)"),
    desc: L("Kondisionerlər üçün ekoloji R32 freonu. Balonla və ya kiloqramla (ustalar üçün) satılır. 1 balon = 12 kq.", "Экологичный фреон R32. Продаётся баллонами или на вес (для мастеров). 1 баллон = 12 кг.", "Eco-friendly R32 refrigerant. Sold by cylinder or by kg (technicians). 1 cylinder = 12 kg."),
    type: "CONSUMABLE", brand: "honeywell", category: "qaz-ve-freon", unit: "kg", conversions: [{ unit: "cylinder", factor: 12, packagePriceCents: 30000 }],
    attrs: { refrigerant: "R32", cylinder_kg: "12" }, variants: [variant("r32", "HW-R32", {}, 2900, "1", "—", [0.85, 0.8, 0.75])],
    rating: 4.6, reviews: 29, image: "gas", tone: "cyan", warranty: 0, visibility: ["TECHNICIAN", "PARTNER", "WHOLESALE", "CORPORATE"],
  },
  {
    key: "r410a", slug: "freon-r410a", name: L("Freon R410A (balon)", "Фреон R410A (баллон)", "R410A refrigerant (cylinder)"),
    desc: L("R410A freonu, 11.3 kq balon.", "Фреон R410A, баллон 11,3 кг.", "R410A refrigerant, 11.3 kg cylinder."),
    type: "CONSUMABLE", brand: "honeywell", category: "qaz-ve-freon", unit: "kg", conversions: [{ unit: "cylinder", factor: 11.3 }],
    attrs: { refrigerant: "R410A", cylinder_kg: "11.3" }, variants: [variant("r410a", "HW-R410A", {}, 3400, "1", "—")],
    rating: 4.4, reviews: 12, image: "gas", tone: "rose", warranty: 0, visibility: ["TECHNICIAN", "PARTNER", "WHOLESALE", "CORPORATE"],
  },
  {
    key: "compressor-lg", slug: "lg-rotary-kompressor-12000", name: L("LG rotor kompressor 12000 BTU", "Роторный компрессор LG 12000 BTU", "LG rotary compressor 12000 BTU"),
    desc: L("LG DualCool və ArtCool seriyaları üçün orijinal rotor kompressor. OEM kodu ilə uyğunluğu yoxlayın.", "Оригинальный роторный компрессор для серий LG DualCool и ArtCool.", "Original rotary compressor for LG DualCool and ArtCool series."),
    type: "SPARE_PART", brand: "lg", category: "kompressorlar", attrs: { part_kind: "compressor", cooling_btu: "12000", refrigerant: "R32", voltage: "220" },
    variants: [variant("compressor-lg", "LG-CMP-12R32", {}, 12000, "9.5", "25×20×20")],
    rating: 4.7, reviews: 9, image: "compressor", tone: "slate", warranty: 12, compatible: ["lg-x123", "lg-x124", "lg-a50", "lg-18000"], oem: "GJT102MBA", analogs: ["compressor-copeland"],
  },
  {
    key: "compressor-lg18", slug: "lg-kompressor-18000", name: L("LG kompressor 18000 BTU", "Компрессор LG 18000 BTU", "LG compressor 18000 BTU"),
    desc: L("18000 BTU LG kondisionerləri üçün kompressor.", "Компрессор для кондиционеров LG 18000 BTU.", "Compressor for LG 18000 BTU air conditioners."),
    type: "SPARE_PART", brand: "lg", category: "kompressorlar", attrs: { part_kind: "compressor", cooling_btu: "18000", refrigerant: "R32", voltage: "220" },
    variants: [variant("compressor-lg18", "LG-CMP-18R32", {}, 16500, "12", "28×22×22")],
    rating: 4.6, reviews: 6, image: "compressor", tone: "zinc", warranty: 12, compatible: ["lg-x124", "lg-18000"], oem: "GKT176MAA",
  },
  {
    key: "compressor-copeland", slug: "copeland-universal-kompressor", name: L("Copeland universal kompressor 12000 BTU (analoq)", "Универсальный компрессор Copeland 12000 BTU (аналог)", "Copeland universal compressor 12000 BTU (analog)"),
    desc: L("LG, Samsung və Midea 12000 BTU modelləri üçün analoq kompressor.", "Аналоговый компрессор для моделей LG, Samsung, Midea 12000 BTU.", "Analog compressor for LG, Samsung and Midea 12000 BTU models."),
    type: "SPARE_PART", brand: "copeland", category: "kompressorlar", attrs: { part_kind: "compressor", cooling_btu: "12000", refrigerant: "R32", voltage: "220" },
    variants: [variant("compressor-copeland", "CP-UNI-12", {}, 9800, "10", "25×20×20")],
    rating: 4.3, reviews: 5, image: "compressor", tone: "stone", warranty: 6, compatible: ["lg-x123", "samsung-wf", "midea-x9"], analogs: ["compressor-lg"],
  },
  {
    key: "board-bosch", slug: "bosch-condens-idareetme-platasi", name: L("Bosch Condens idarəetmə platası", "Плата управления Bosch Condens", "Bosch Condens control board"),
    desc: L("Bosch Condens 2300/7000 kombiləri üçün orijinal elektron plata.", "Оригинальная плата для котлов Bosch Condens 2300/7000.", "Original control board for Bosch Condens 2300/7000 boilers."),
    type: "SPARE_PART", brand: "bosch", category: "elektronika", attrs: { part_kind: "board" },
    variants: [variant("board-bosch", "BS-PCB-C7", {}, 34000, "0.6", "20×15×5")],
    rating: 4.8, reviews: 7, image: "board", tone: "emerald", warranty: 12, compatible: ["bosch-7000", "bosch-2300"], oem: "87186445130",
  },
  {
    key: "ntc-sensor", slug: "ntc-temperatur-sensoru", name: L("NTC temperatur sensoru", "Датчик температуры NTC", "NTC temperature sensor"),
    desc: L("Kombi və kondisionerlər üçün universal NTC sensor (10 kΩ).", "Универсальный датчик NTC (10 кОм) для котлов и кондиционеров.", "Universal NTC sensor (10 kΩ) for boilers and ACs."),
    type: "SPARE_PART", brand: "honeywell", category: "sensorlar", attrs: { part_kind: "sensor" }, conversions: [{ unit: "box", factor: 20 }],
    variants: [variant("ntc-sensor", "HW-NTC-10K", {}, 1200, "0.02", "5×1×1")],
    rating: 4.5, reviews: 22, image: "sensor", tone: "violet", warranty: 6, compatible: ["bosch-7000", "baxi-eco", "ariston-clas-one", "lg-x123", "samsung-wf"],
  },
  {
    key: "ac-filter", slug: "kondisioner-toz-filtri", name: L("Kondisioner toz filtri (dəst)", "Пылевой фильтр кондиционера (комплект)", "AC dust filter (set)"),
    desc: L("Split sistemlər üçün yuyula bilən toz filtri, 2 ədədlik dəst.", "Моющийся пылевой фильтр для сплит-систем, комплект 2 шт.", "Washable dust filter for split systems, set of 2."),
    type: "SPARE_PART", brand: "lg", category: "filtrler", unit: "set", attrs: { part_kind: "filter" },
    variants: [variant("ac-filter", "LG-FLT-SET", {}, 1500, "0.1", "30×20×1")],
    rating: 4.2, reviews: 61, image: "filter", tone: "sky", warranty: 0, compatible: ["lg-x123", "lg-x124", "lg-a50", "lg-18000"],
  },
  {
    key: "connector", slug: "mis-birlesdirici-flare", name: L("Mis birləşdirici (flare qayka)", "Медная гайка-фитинг (flare)", "Copper flare nut connector"),
    desc: L("Freon xətləri üçün flare birləşdirici. 1 qutu = 20 ədəd.", "Фитинг для фреоновых трасс. 1 коробка = 20 шт.", "Flare connector for refrigerant lines. 1 box = 20 pcs."),
    type: "CONSUMABLE", brand: "mueller", category: "serfiyyat-materiallari", conversions: [{ unit: "box", factor: 20, packagePriceCents: 5000 }],
    attrs: {}, variants: [variant("connector", "MU-FLR-38", { diameter_mm: "9.52" }, 300, "0.03", "3×3×3")],
    rating: 4.4, reviews: 14, image: "fitting", tone: "amber", warranty: 0,
  },
  {
    key: "insulation", slug: "boru-izolyasiyasi", name: L("Boru izolyasiyası (kauçuk)", "Изоляция для труб (каучук)", "Pipe insulation (rubber)"),
    desc: L("Freon xətləri üçün kauçuk izolyasiya, 2 m-lik parçalar.", "Каучуковая изоляция для фреоновых трасс, отрезки 2 м.", "Rubber insulation for refrigerant lines, 2 m lengths."),
    type: "CONSUMABLE", brand: "mueller", category: "serfiyyat-materiallari", unit: "m", attrs: {}, variants: [variant("insulation", "MU-INS-9", {}, 150, "0.05")],
    rating: 4.1, reviews: 8, image: "pipe", tone: "zinc", warranty: 0, restriction: "return.cutToLength",
  },
  {
    key: "cable", slug: "prysmian-elektrik-kabeli", name: L("Prysmian elektrik kabeli NYM", "Электрический кабель Prysmian NYM", "Prysmian NYM power cable"),
    desc: L("Kondisioner və kombi qoşulması üçün mis damarlı kabel. Metrlə və ya 100 m-lik rulonla.", "Кабель с медными жилами для подключения. Метрами или бухтами 100 м.", "Copper-core cable for appliance connections. Per metre or 100 m rolls."),
    type: "CONSUMABLE", brand: "prysmian", category: "elektrik", unit: "m", conversions: [{ unit: "roll", factor: 100, packagePriceCents: 22000 }],
    attrs: { cores: "3" }, variantAttrs: ["section_mm2"],
    variants: [variant("cable", "PR-NYM-315", { section_mm2: "1.5" }, 180, "0.1"), variant("cable", "PR-NYM-325", { section_mm2: "2.5" }, 260, "0.14"), variant("cable", "PR-NYM-34", { section_mm2: "4" }, 390, "0.2")],
    rating: 4.6, reviews: 36, image: "cable", tone: "yellow", warranty: 12, restriction: "return.cutToLength",
  },
  {
    key: "pool-pump", slug: "hovuz-nasosu-filtrli", name: L("Hovuz nasosu (filtr qabı ilə)", "Насос для бассейна (с префильтром)", "Pool pump (with pre-filter)"),
    desc: L("Özünü sorucu hovuz nasosu, 0.75 kW, filtr qabı ilə.", "Самовсасывающий насос для бассейна 0,75 кВт с префильтром.", "Self-priming pool pump, 0.75 kW, with pre-filter."),
    brand: "grundfos", model: "pool-xyz", category: "hovuz-avadanligi", attrs: { power_kw: "0.75", flow_m3h: "14" },
    variants: [variant("pool-pump", "GF-POOL-075", {}, 74000, "14", "55×25×30")],
    rating: 4.5, reviews: 11, image: "pump", tone: "blue", warranty: 24, install: SVC["pool-repair"], bulky: true,
  },
  {
    key: "recuperator", slug: "ventilyasiya-rekuperatoru", name: L("Mənzil üçün rekuperator", "Рекуператор для квартиры", "Apartment heat recovery unit"),
    desc: L("İstilik geri qaytarması ilə ventilyasiya qurğusu, 150 m³/saat.", "Приточно-вытяжная установка с рекуперацией, 150 м³/ч.", "Ventilation unit with heat recovery, 150 m³/h."),
    brand: "vaillant", category: "ventilyasiya", attrs: { flow_m3h: "150", noise_db: "28" },
    variants: [variant("recuperator", "VL-REC-150", {}, 145000, "22", "60×60×30")],
    rating: 4.4, reviews: 4, isNew: true, image: "fan", tone: "teal", warranty: 24, status: "ACTIVE",
  },
  {
    key: "bundle-ac", slug: "lg-dualcool-12000-qurasdirma-paketi", name: L("Paket: LG DualCool 12000 + standart quraşdırma", "Пакет: LG DualCool 12000 + стандартная установка", "Bundle: LG DualCool 12000 + standard installation"),
    desc: L("Kondisioner, 3 m mis boru, izolyasiya, kabel və standart quraşdırma bir qiymətə.", "Кондиционер, 3 м медной трубы, изоляция, кабель и стандартная установка по одной цене.", "Air conditioner, 3 m copper pipe, insulation, cable and standard installation at one price."),
    type: "BUNDLE", brand: "lg", model: "lg-x123", category: "split-sistemler", unit: "set", attrs: { inverter: "inverter", energy_class: "A++", refrigerant: "R32", room_area: "35", wifi: "true" },
    variants: [variant("bundle-ac", "PKG-LG-DC12", { cooling_btu: "12000" }, 209000, "45")],
    rating: 4.9, reviews: 23, image: "ac", tone: "primary", warranty: 36, install: SVC["ac-install"], bulky: true, restriction: "return.installed",
  },
];

// Genişləndirilmiş çeşid (catalogExtra.ts): təsvir kateqoriyaya görə avtomatik yaradılır
const extraDesc = (name: [string, string, string], catSlug: string) => {
  const c = productCategories.find((x) => x.slug === catSlug)!;
  return L(
    `${name[0]} — "${c.name.az}" bölməsindən. Rəsmi zəmanət, filiallarda stok və Bakı üzrə çatdırılma. Ustalar və B2B müştərilər üçün xüsusi qiymətlər mövcuddur.`,
    `${name[1]} — раздел «${c.name.ru}». Официальная гарантия, наличие в филиалах и доставка по Баку. Специальные цены для мастеров и B2B.`,
    `${name[2]} — from "${c.name.en}". Official warranty, branch stock and delivery across Baku. Special prices for technicians and B2B customers.`,
  );
};
for (const e of extraProducts) {
  const variants = e.variants?.length ? e.variants.map(([sku, attrs, price]) => variant(e.key, sku, attrs, price)) : [variant(e.key, e.sku ?? e.key.toUpperCase(), {}, e.price)];
  const variantAttrs = e.variants?.length ? [...new Set(e.variants.flatMap(([, a]) => Object.keys(a)))] : [];
  pdefs.push({
    key: e.key, slug: e.slug, name: L(...e.name), desc: extraDesc(e.name, e.cat), highlights: (e.hl ?? []).map((h) => L(...h)), type: e.type, brand: e.brand, model: e.model, category: e.cat, unit: e.unit,
    conversions: e.conv?.map(([unit, factor, packagePriceCents]) => ({ unit, factor, packagePriceCents })), attrs: e.attrs ?? {}, variantAttrs, variants, rating: e.rating ?? 4.5, reviews: e.reviews ?? 0, isNew: e.isNew,
    image: e.image, tone: e.tone, warranty: e.warranty ?? 12, install: e.install ? SVC[e.install] : undefined, compatible: e.compat, visibility: e.pro ? ["TECHNICIAN", "PARTNER", "WHOLESALE", "CORPORATE"] : undefined,
    restriction: e.cut ? "return.cutToLength" : undefined, bulky: e.bulky,
  });
}

export const products: ProductRec[] = pdefs.map((d, i) => ({
  id: idFor(`product:${d.key}`),
  slug: d.slug,
  name: d.name,
  description: d.desc,
  highlights: d.highlights ?? [],
  type: d.type ?? "PHYSICAL",
  brandId: BRAND[d.brand]!,
  modelId: d.model ? MODEL[d.model]! : null,
  categoryId: PC[d.category]!,
  baseUnit: d.unit ?? "pcs",
  conversions: d.conversions ?? [],
  attributes: { ...d.attrs, ...(d.variants.length === 1 ? d.variants[0]!.attributes : {}) },
  variantAttrCodes: d.variantAttrs ?? [],
  variants: d.variants,
  rating: d.rating,
  reviewCount: d.reviews,
  isNew: d.isNew ?? false,
  country: brands.find((b) => b.slug === d.brand)!.country,
  imageKind: d.image,
  imageTone: d.tone,
  warrantyMonths: d.warranty,
  installServiceId: d.install ?? null,
  compatibleModelIds: (d.compatible ?? []).map((m) => MODEL[m]!),
  analogIds: (d.analogs ?? []).map((a) => idFor(`product:${a}`)),
  oemCode: d.oem ?? null,
  visibility: d.visibility ?? [],
  status: d.status ?? "ACTIVE",
  createdAt: daysAgo(d.isNew ? 7 + i : 90 + i * 3),
  returnRestriction: d.restriction ?? null,
  videoUrl: d.video ? "https://example.com/video.mp4" : null,
  bulky: d.bulky ?? false,
}));

export const PROD = Object.fromEntries(pdefs.map((d, i) => [d.key, products[i]!])) as Record<string, ProductRec>;
