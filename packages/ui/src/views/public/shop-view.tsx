"use client";
import React, { useState, useMemo } from "react";
import { Search, Filter, ShoppingBag, SlidersHorizontal, X } from "lucide-react";
import { ProductCard } from "../../components/domain/product-card";
import { resolveText, type AppLocale } from "../../utils/i18n";

export interface ShopViewProps {
  products: any[];
  categories: any[];
  brands?: any[];
  locale?: "az" | "ru" | "en";
  onNavigate: (href: string) => void;
  onAddToCart: (product: any) => void;
}

export function ShopView({
  products,
  categories,
  brands = [],
  locale = "az",
  onNavigate,
  onAddToCart,
}: ShopViewProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedBrand, setSelectedBrand] = useState<string>("");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [priceRange, setPriceRange] = useState<number>(2500);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat = !selectedCategory || p.categoryId === selectedCategory;
      const matchBrand = !selectedBrand || p.brandId === selectedBrand || p.brandName === selectedBrand;
      const matchStock = !inStockOnly || p.stockStatus === "IN_STOCK";
      const name = resolveText(p.name, locale as AppLocale, "").toLowerCase();
      const brand = resolveText(p.brandName, locale as AppLocale, "").toLowerCase();
      const q = searchQuery.toLowerCase();
      const matchQuery =
        !searchQuery ||
        name.includes(q) ||
        brand.includes(q);

      const effectivePrice = Number(p.price?.effectivePrice?.amount || 0);
      const matchPrice = effectivePrice <= priceRange;

      return matchCat && matchBrand && matchStock && matchQuery && matchPrice;
    });
  }, [products, selectedCategory, selectedBrand, inStockOnly, searchQuery, priceRange, locale]);

  const clearFilters = () => {
    setSelectedCategory("");
    setSelectedBrand("");
    setInStockOnly(false);
    setSearchQuery("");
    setPriceRange(2500);
  };

  const hasActiveFilters = selectedCategory || selectedBrand || inStockOnly || searchQuery || priceRange !== 2500;

  return (
    <div className="shop-view container py-8">
      {/* Header */}
      <div className="page-header">
        <span className="eyebrow">Onlayn Mağaza</span>
        <h1>Məhsul və Ehtiyat Hissələri</h1>
        <p className="page-desc">
          İqlim sistemləri, kombilər, nasoslar və orijinal ehtiyat hissələri birbaşa zəmanətlə.
        </p>
      </div>

      <div className="shop-layout">
        {/* Sidebar Filters */}
        <aside className="shop-filters panel">
          <button type="button" className="filter-toggle btn outline w-full" aria-expanded={filtersOpen} aria-controls="shop-filter-fields" onClick={() => setFiltersOpen(!filtersOpen)}><SlidersHorizontal size={18} /> Filtrlər</button>
          <div id="shop-filter-fields" className={`filter-fields ${filtersOpen ? "is-open" : ""}`}>
          <div className="filters-header flex justify-between items-center mb-4">
            <h3 className="text-base font-bold flex items-center gap-2">
              <SlidersHorizontal size={18} /> Filtrlər
            </h3>
            {hasActiveFilters && (
              <button className="btn btn-sm ghost text-xs" onClick={clearFilters}>
                <X size={13} /> Sıfırla
              </button>
            )}
          </div>

          {/* Search Box */}
          <div className="filter-group mb-4">
            <label className="filter-label">Məhsul Axtarışı</label>
            <div className="search-input">
              <Search size={16} />
              <input
                type="search" aria-label="Məhsul Axtarışı"
                placeholder="Model, ad və ya SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Category Filter */}
          <div className="filter-group mb-4">
            <label className="filter-label" htmlFor="shop-view-field-1">Kateqoriya</label>
            <select id="shop-view-field-1"
              className="form-input text-sm"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">Bütün Kateqoriyalar</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name?.[locale] || c.name?.az || c.name}
                </option>
              ))}
            </select>
          </div>

          {/* In Stock Checkbox */}
          <div className="filter-group mb-4">
            <label className="checkbox-label cursor-pointer flex items-center gap-2">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => setInStockOnly(e.target.checked)}
              />
              <span>Yalnız Stokda Olanlar</span>
            </label>
          </div>

          {/* Price Range Slider */}
          <div className="filter-group mb-4">
            <label className="filter-label" htmlFor="shop-view-field-2">Maksimum Qiymət: {priceRange} AZN</label>
            <input id="shop-view-field-2"
              type="range"
              min={10}
              max={5000}
              step={20}
              value={priceRange}
              onChange={(e) => setPriceRange(Number(e.target.value))}
              className="range-slider w-full"
            />
          </div>
          </div>
        </aside>

        {/* Product Listing Main */}
        <div className="shop-main">
          <div className="shop-status-bar mb-4 flex justify-between items-center">
            <span className="results-count text-sm text-muted">
              {filteredProducts.length} məhsul tapıldı
            </span>
          </div>

          {filteredProducts.length > 0 ? (
            <div className="grid three products-grid">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  locale={locale}
                  onSelect={(p) => onNavigate(`/product/${p.slug}`)}
                  onAddToCart={onAddToCart}
                />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <ShoppingBag size={40} className="text-muted mb-2" />
              <h3>Seçilmiş kriteriyalara uyğun məhsul tapılmadı</h3>
              <p>Filtrləri sıfırlayaraq yenidən yoxlayın.</p>
              <button className="btn btn-sm outline mt-3" onClick={clearFilters}>
                Bütün məhsulları göstər
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
