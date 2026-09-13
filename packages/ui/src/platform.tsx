"use client";
import React, { useEffect, useState, lazy, Suspense } from "react";
import { resolveText } from "./utils/i18n";

import { Header } from "./components/layout/header";
import { Footer } from "./components/layout/footer";

import { HomeView } from "./views/public/home-view";
import { ServicesView } from "./views/public/services-view";
import { ServiceDetailView } from "./views/public/service-detail-view";
import { BookingWizard } from "./views/public/booking-wizard";
import { ShopView } from "./views/public/shop-view";
import { ProductDetailView } from "./views/public/product-detail-view";
import { CartView } from "./views/public/cart-view";
import { CheckoutView } from "./views/public/checkout-view";
import { TechniciansView } from "./views/public/technicians-view";
import { PricingView } from "./views/public/pricing-view";
import { WarrantyVerifyView } from "./views/public/warranty-verify-view";
import { InfoView } from "./views/public/info-view";
import { LoginView } from "./views/auth/login-view";
const CustomerPortal = lazy(() => import("./views/customer/customer-portal").then((module) => ({ default: module.CustomerPortal })));
const TechnicianPortal = lazy(() => import("./views/technician/technician-portal").then((module) => ({ default: module.TechnicianPortal })));
const CourierPortal = lazy(() => import("./views/courier/courier-portal").then((module) => ({ default: module.CourierPortal })));
const AdminPortal = lazy(() => import("./views/admin/admin-portal").then((module) => ({ default: module.AdminPortal })));

type Row = Record<string, any>;

export function Platform(props: { admin?: boolean }) {
  return <Suspense fallback={<main className="container py-12" aria-busy="true"><p role="status">Yüklənir...</p></main>}><PlatformContent {...props} /></Suspense>;
}

function PlatformContent({ admin = false }: { admin?: boolean }) {
  const [path, setPath] = useState("/az");
  const [locale, setLocale] = useState<"az" | "ru" | "en">("az");

  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [session, setSession] = useState<Row | null>(null);
  const [brand, setBrand] = useState<Row | null>(null);
  const [data, setData] = useState<Row>({});
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [revision, setRevision] = useState(0);
  const [cartCount, setCartCount] = useState(0);
  const [bookingWizardOpen, setBookingWizardOpen] = useState(false);
  const [bookingService, setBookingService] = useState<any | null>(null);

  const page = path.split("?")[0].replace(/^\/(az|ru|en)(?=\/|$)/, "") || "/";

  // API helper
  const req = async (url: string, method = "GET", body?: unknown) => {
    const r = await fetch("/api" + url, {
      method,
      headers: { "Content-Type": "application/json", "Accept-Language": locale },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (r.status === 204) return {};
    const d = await r.json();
    if (!r.ok) throw Error(d.message || "Xəta baş verdi");
    return d;
  };

  const go = (url: string) => {
    const u = `/${locale}${url === "/" ? "" : url}`;
    window.history.pushState({}, "", u);
    setPath(u);
    window.scrollTo(0, 0);
  };

  // Sync with browser history
  useEffect(() => {
    const sync = () => {
      const p = window.location.pathname + window.location.search;
      const l = p.split("/")[1];
      setLocale(l === "en" || l === "ru" ? l : "az");
      setPath(p);
    };
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  // Load initial branding and session
  useEffect(() => {
    req("/branding")
      .then(setBrand)
      .catch(() => {});
    req("/auth/session")
      .then((s) => {
        setSession(s);
        setCartCount(s.cartCount || 0);
      })
      .catch(() => {});
  }, [locale, revision]);

  // Load page-specific data
  useEffect(() => {
    let active = true;
    setBusy(true);
    setError("");

    const load = async () => {
      let d: Row = {};

      if (admin) {
        if (session?.authenticated) {
          const [orders, techs] = await Promise.all([
            req("/service-orders"),
            req("/technicians"),
          ]);
          d = { orders: orders.items || [], technicians: techs.items || [] };
        }
      } else if (page.startsWith("/account") || (page === "/technician" || page.startsWith("/technician/")) || page.startsWith("/courier")) {
        if (session?.authenticated) {
          const [orders, dev, addrs] = await Promise.all([
            req("/service-orders"),
            page.startsWith("/account") && (session?.user?.activeRole || session?.user?.role) !== "TECHNICIAN" ? req("/account/devices") : Promise.resolve({ items: [] }),
            req("/auth/session").catch(() => ({})),
          ]);
          d = {
            orders: orders.items || [],
            devices: dev.items || [],
            addresses: addrs.addresses || [],
          };
        }
      } else if (page === "/" || page === "/services" || page === "/shop") {
        const [services, products, categories, techs] = await Promise.all([
          req("/services?pageSize=100"),
          req("/products?pageSize=100"),
          req("/equipment-categories"),
          req("/technicians"),
        ]);
        d = {
          services: services.items || [],
          products: products.items || [],
          categories: categories || [],
          technicians: techs.items || [],
        };
      } else if (page.startsWith("/services/")) {
        const slug = page.split("/")[2];
        const [svc, cat] = await Promise.all([
          req("/services/" + slug),
          req("/equipment-categories"),
        ]);
        d = { service: svc, categories: cat || [] };
      } else if (page.startsWith("/product/")) {
        const slug = page.split("/")[2];
        const [prod, dev] = await Promise.all([
          req("/products/" + slug),
          session?.authenticated ? req("/account/devices") : Promise.resolve({ items: [] }),
        ]);
        d = { product: prod, devices: dev.items || [] };
      } else if (page === "/technicians") {
        const [techs, services] = await Promise.all([req("/technicians"), req("/services?pageSize=100")]);
        d = { technicians: techs.items || [], services: services.items || [] };
      } else if (page === "/cart" || page === "/checkout") {
        const [cart, addrs, branches] = await Promise.all([
          req("/cart"),
          session?.authenticated ? req("/auth/session").catch(() => ({})) : Promise.resolve({}),
          req("/branches"),
        ]);
        d = {
          cart,
          addresses: addrs.addresses || [],
          branches: branches.items || [],
        };
      } else if (page === "/contact" || page === "/branches") {
        const branches = await req("/branches");
        d = { branches: branches.items || [] };
      }

      if (active) {
        setData(d);
        setBusy(false);
      }
    };

    load().catch((e) => {
      if (active) {
        setError(e.message);
        setBusy(false);
      }
    });

    return () => {
      active = false;
    };
  }, [path, locale, revision, session?.authenticated, admin]);

  // Cart operations
  const handleAddToCart = async (product: any, withInstallation?: boolean) => {
    try {
      const variant = product.variants?.[0] || { id: product.id };
      await req("/cart/items", "POST", {
        skuId: variant.id,
        quantity: 1,
        installationAdded: !!withInstallation,
      });
      setCartCount((c) => c + 1);
      setNotice(`"${resolveText(product.name, locale, "Məhsul")}" səbətə əlavə edildi.`);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleUpdateCartQuantity = async (itemId: string, qty: number) => {
    try {
      await req(`/cart/items/${itemId}`, "PATCH", { quantity: qty });
      setRevision((r) => r + 1);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleRemoveCartItem = async (itemId: string) => {
    try {
      await req(`/cart/items/${itemId}`, "DELETE");
      setRevision((r) => r + 1);
    } catch (e: any) {
      setError(e.message);
    }
  };

  // Auth operations
  const handleLogin = async (creds: any) => {
    const res = challengeId && creds.otp
      ? await req("/auth/2fa", "POST", { challengeId, code: creds.otp })
      : await req("/auth/login", "POST", creds);
    if (res.status === "TWO_FACTOR_REQUIRED") {
      setChallengeId(res.challengeId);
      return { ...res, requires2FA: true };
    }
    setChallengeId(null);
    if (res.session) setSession(res.session);
    setRevision((r) => r + 1);
    return res;
  };

  const handleLogout = async () => {
    await req("/auth/logout", "POST");
    setSession(null);
    setRevision((r) => r + 1);
    go("/");
  };

  // Order operations
  const handleSubmitServiceOrder = async (orderData: any) => {
    const res = await req("/service-orders", "POST", orderData);
    setRevision((r) => r + 1);
    return res;
  };

  const handleCheckoutSubmit = async (checkoutData: any) => {
    const res = await req("/checkout", "POST", checkoutData);
    setRevision((r) => r + 1);
    return res;
  };

  // Navigation items for header
  const navItems = [
    { label: "Ana Səhifə", href: "/" },
    { label: "Xidmətlər", href: "/services" },
    { label: "Mağaza", href: "/shop" },
    { label: "Ustalar", href: "/technicians" },
    { label: "Abunəlik", href: "/pricing" },
    { label: "Haqqımızda", href: "/about" },
    { label: "Əlaqə", href: "/contact" },
  ];

  if ((admin || page === "/account" || page.startsWith("/account/") || page === "/technician" || page.startsWith("/technician/") || page === "/courier" || page.startsWith("/courier/")) && session?.authenticated && (busy || error)) {
    return <main className="container py-12" aria-busy={busy}>{error ? <div role="alert" className="alert alert-danger">{error}<button className="btn outline" onClick={() => setRevision((r) => r + 1)}>Yenidən yoxla</button></div> : <p role="status">Yüklənir...</p>}</main>;
  }

  // RENDER ADMIN PORTAL
  if (admin) {
    if (!session?.authenticated) {
      return (
        <LoginView
          isAdmin
          locale={locale}
          onSubmitLogin={handleLogin}
          onLoginSuccess={() => setRevision((r) => r + 1)}
        />
      );
    }

    return (
      <AdminPortal
        orders={data.orders || []}
        technicians={data.technicians || []}
        locale={locale}
        onLogout={handleLogout}
        onAssignTechnician={async (orderId, techId) => {
          await req(`/service-orders/${orderId}/assign`, "POST", { technicianId: techId }).catch(() => {});
          setRevision((r) => r + 1);
        }}
      />
    );
  }

  // RENDER SPECIALIZED PORTALS (Customer, Technician, Courier)
  if ((page === "/technician" || page.startsWith("/technician/")) || (session?.user?.activeRole || session?.user?.role) === "TECHNICIAN") {
    if (!session?.authenticated) {
      return (
        <LoginView
          locale={locale}
          onSubmitLogin={handleLogin}
          onLoginSuccess={() => setRevision((r) => r + 1)}
        />
      );
    }
    return (
      <TechnicianPortal
        technicianUser={session.user}
        orders={data.orders || []}
        locale={locale}
        onLogout={handleLogout}
      />
    );
  }

  if (page.startsWith("/courier") || (session?.user?.activeRole || session?.user?.role) === "COURIER") {
    if (!session?.authenticated) {
      return (
        <LoginView
          locale={locale}
          onSubmitLogin={handleLogin}
          onLoginSuccess={() => setRevision((r) => r + 1)}
        />
      );
    }
    return <CourierPortal onLogout={handleLogout} />;
  }

  if (page.startsWith("/account")) {
    if (!session?.authenticated) {
      return (
        <LoginView
          locale={locale}
          onSubmitLogin={handleLogin}
          onLoginSuccess={() => setRevision((r) => r + 1)}
        />
      );
    }
    return (
      <CustomerPortal
        user={session.user}
        orders={data.orders || []}
        devices={data.devices || []}
        addresses={data.addresses || []}
        locale={locale}
        onLogout={handleLogout}
        onBookService={() => {
          go("/services");
        }}
      />
    );
  }

  if (page === "/login") {
    return (
      <LoginView
        locale={locale}
        onSubmitLogin={handleLogin}
        onLoginSuccess={() => {
          setRevision((r) => r + 1);
          go("/account");
        }}
      />
    );
  }

  // RENDER PUBLIC WEBSITE
  return (
    <div className="site-wrapper">
      <Header
        logoText={brand?.logoText || "besqardas"}
        navItems={navItems}
        currentPath={page}
        locale={locale}
        cartCount={cartCount}
        user={session?.authenticated ? session.user : null}
        onNavigate={go}
        onLocaleChange={(l) => {
          setLocale(l);
          const newPath = `/${l}${page === "/" ? "" : page}`;
          window.history.pushState({}, "", newPath);
          setPath(newPath);
        }}
        onOpenCart={() => go("/cart")}
        onOpenSearch={() => go("/services")}
      />

      <a className="skip-link" href="#main-content">Əsas məzmuna keç</a>
      <main id="main-content" tabIndex={-1} aria-busy={busy}>
        {error && <div className="container py-4"><div className="alert alert-danger" role="alert">{error} <button className="btn outline" onClick={() => setRevision((r) => r + 1)}>Yenidən yoxla</button></div></div>}
        {notice && <div className="container py-4"><div className="alert alert-success" role="status">{notice} <button className="btn ghost" onClick={() => setNotice("")}>Bağla</button></div></div>}
        {busy && (
          <div className="container py-12 text-center text-muted">
            <div className="skeleton large max-w-xl mx-auto mb-4" />
            <span>Yüklənir...</span>
          </div>
        )}

        {!busy && !error && (
          <>
            {((page.startsWith("/services/") && !data.service) || (page.startsWith("/product/") && !data.product) || !["/", "/services", "/shop", "/cart", "/checkout", "/technicians", "/pricing", "/about", "/contact", "/branches", "/faq", "/terms", "/privacy"].includes(page) && !page.startsWith("/services/") && !page.startsWith("/product/") && !page.startsWith("/warranty")) && <div className="container py-12 empty-state"><h1>Səhifə tapılmadı</h1><button className="btn primary" onClick={() => go("/")}>Ana səhifəyə qayıt</button></div>}
            {page === "/" && (
              <HomeView
                services={data.services || []}
                products={data.products || []}
                technicians={data.technicians || []}
                categories={data.categories || []}
                locale={locale}
                onNavigate={go}
                onBookService={(s) => {
                  setBookingService(s || null);
                  setBookingWizardOpen(true);
                }}
                onAddToCart={handleAddToCart}
              />
            )}

            {page === "/services" && (
              <ServicesView
                initialCategory={new URLSearchParams(path.split("?")[1] || "").get("category") || ""}
                services={data.services || []}
                categories={data.categories || []}
                locale={locale}
                onNavigate={go}
                onBookService={(s) => {
                  setBookingService(s);
                  setBookingWizardOpen(true);
                }}
              />
            )}

            {page.startsWith("/services/") && data.service && (
              <ServiceDetailView
                service={data.service}
                locale={locale}
                onBack={() => go("/services")}
                onBook={(s) => {
                  setBookingService(s);
                  setBookingWizardOpen(true);
                }}
              />
            )}

            {page === "/shop" && (
              <ShopView
                products={data.products || []}
                categories={data.categories || []}
                locale={locale}
                onNavigate={go}
                onAddToCart={handleAddToCart}
              />
            )}

            {page.startsWith("/product/") && data.product && (
              <ProductDetailView
                product={data.product}
                userDevices={data.devices || []}
                locale={locale}
                onBack={() => go("/shop")}
                onAddToCart={handleAddToCart}
              />
            )}

            {page === "/cart" && (
              <CartView
                cart={data.cart || { items: [] }}
                locale={locale}
                onUpdateQuantity={handleUpdateCartQuantity}
                onRemoveItem={handleRemoveCartItem}
                onProceedToCheckout={() => go("/checkout")}
                onContinueShopping={() => go("/shop")}
              />
            )}

            {page === "/checkout" && (
              <CheckoutView
                cart={data.cart || { items: [] }}
                user={session?.authenticated ? session.user : null}
                savedAddresses={data.addresses || []}
                branches={data.branches || []}
                locale={locale}
                onBackToCart={() => go("/cart")}
                onRequireLogin={() => go("/login")}
                onSubmitCheckout={handleCheckoutSubmit}
                onOrderSuccess={(order) => {
                  setCartCount(0);
                  alert(`Sifarişiniz qəbul olundu! Sifariş nömrəsi: ${order.number || "SO-1052"}`);
                  go("/account");
                }}
              />
            )}

            {page === "/technicians" && (
              <TechniciansView
                technicians={data.technicians || []}
                locale={locale}
                onNavigate={go}
                onBookTechnician={(tech) => {
                  setBookingService({ technicianId: tech.id });
                  setBookingWizardOpen(true);
                }}
              />
            )}

            {page === "/pricing" && (
              <PricingView
                locale={locale}
                onSelectPlan={(plan) => {
                  if (!session?.authenticated) {
                    go("/login");
                  } else {
                    alert(`"${plan}" planına keçid sorğusu qeydə alındı.`);
                    go("/account");
                  }
                }}
              />
            )}

            {page.startsWith("/warranty") && (
              <WarrantyVerifyView
                initialCode={page.split("/")[3] || ""}
                locale={locale}
                onNavigate={go}
              />
            )}

            {["/about", "/contact", "/branches", "/faq", "/terms", "/privacy"].includes(page) && (
              <InfoView
                pageType={page.replace("/", "") as any}
                branches={data.branches || []}
                locale={locale}
                onNavigate={go}
              />
            )}
          </>
        )}
      </main>

      <Footer
        companyName={brand?.companyName || "besqardasServis.az"}
        phone={brand?.contacts?.phone}
        email={brand?.contacts?.email}
        locale={locale}
        onNavigate={go}
      />

      {/* Global Booking Wizard Modal */}
      {bookingWizardOpen && <BookingWizard
        open={bookingWizardOpen}
        onClose={() => setBookingWizardOpen(false)}
        service={bookingService}
        services={data.services || []}
        userDevices={data.devices || []}
        userAddresses={data.addresses || []}
        technicians={data.technicians || []}
        locale={locale}
        onSubmitOrder={handleSubmitServiceOrder}
        onOrderSuccess={(order) => {
          setBookingWizardOpen(false);
          alert(`Sifarişiniz qeydə alındı! Sifariş nömrəsi: ${order.number || "SV-1052"}`);
          go("/account");
        }}
      />}
    </div>
  );
}
