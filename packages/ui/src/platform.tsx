"use client";
import React, { useEffect, useState } from "react";
import az from "@sp/i18n/messages/az.json";
import ru from "@sp/i18n/messages/ru.json";
import en from "@sp/i18n/messages/en.json";
import {
  ArrowUpRight,
  ArrowRight,
  Wrench,
  Snowflake,
  Flame,
  Waves,
  Droplets,
  Zap,
  ShieldCheck,
  Clock3,
  Check,
  ChevronDown,
  ShoppingBag,
  Search,
  UserRound,
  Menu,
  X,
  MapPin,
  Phone,
  Star,
  Plus,
  Minus,
  Trash2,
  LayoutDashboard,
  ClipboardList,
  Box,
  Users,
  CalendarDays,
  Bell,
  LogOut,
  PackageCheck,
  ChevronRight,
  Settings2,
} from "lucide-react";

type Row = Record<string, any>;
const words = { az, ru, en };

const icons = [Snowflake, Flame, Waves, Droplets, Zap, Wrench];
const statusNames: Record<string, string[]> = {
  NEW: ["Yeni", "New", "Новый"],
  CONFIRMED: ["Təsdiqlənib", "Confirmed", "Подтверждён"],
  IN_PROGRESS: ["İcra olunur", "In progress", "В работе"],
  WAITING_FOR_CUSTOMER: ["Təsdiq gözləyir", "Awaiting approval", "Ожидает подтверждения"],
  COMPLETED: ["Tamamlanıb", "Completed", "Выполнен"],
  CLOSED: ["Bağlanıb", "Closed", "Закрыт"],
  CANCELLED: ["Ləğv edilib", "Cancelled", "Отменён"],
};
export function Platform({ admin = false }: { admin?: boolean }) {
  const [path, setPath] = useState("/az");
  const [locale, setLocale] = useState<keyof typeof words>("az");
  const t = words[locale];
  const [session, setSession] = useState<Row | null>(null),
    [brand, setBrand] = useState<Row | null>(null),
    [data, setData] = useState<Row>({}),
    [busy, setBusy] = useState(true),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [menu, setMenu] = useState(false),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState(""),
    [limit, setLimit] = useState(12),
    [revision, setRevision] = useState(0),
    [cartCount, setCartCount] = useState(0);
  const [selected, setSelected] = useState<Row | null>(null),
    [step, setStep] = useState(1),
    [sending, setSending] = useState(false),
    [result, setResult] = useState<Row | null>(null);
  const [form, setForm] = useState<Row>({
    executionForm: "ON_SITE",
    description: "",
    addressId: "",
    scheduledAt: "",
  });
  const [email, setEmail] = useState(admin ? "admin@demo.az" : "aysel@demo.az"),
    [password, setPassword] = useState("Demo1234!"),
    [challenge, setChallenge] = useState(""),
    [otp, setOtp] = useState("");
  const page = path.replace(/^\/(az|ru|en)/, "") || "/";
  const req = async (url: string, method = "GET", body?: unknown) => {
    const r = await fetch("/api" + url, {
      method,
      headers: { "Content-Type": "application/json", "Accept-Language": locale },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (r.status === 204) return {};
    const d = await r.json();
    if (!r.ok) throw Error(d.message || t.retry);
    return d;
  };
  const go = (url: string) => {
    setMenu(false);
    setSelected(null);
    setResult(null);
    setStep(1);
    setQuery("");
    setFilter("");
    setLimit(12);
    const u = `/${locale}${url === "/" ? "" : url}`;
    window.history.pushState({}, "", u);
    setPath(u);
    window.scrollTo(0, 0);
  };
  useEffect(() => {
    const sync = () => {
      const p = window.location.pathname;
      const l = p.split("/")[1];
      setLocale(l === "en" || l === "ru" ? l : "az");
      setPath(p);
      setSelected(null);
    };
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
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
  useEffect(() => {
    let active = true;
    setBusy(true);
    setError("");
    const load = async () => {
      let d: Row = {};
      if (admin || page.startsWith("/account")) {
        if (session?.authenticated) {
          const [o, dev] = await Promise.all([
            req("/service-orders"),
            admin ? Promise.resolve({ items: [] }) : req("/account/devices"),
          ]);
          d = { orders: o.items, devices: dev.items };
        }
      } else if (page === "/" || page === "/services" || page === "/shop" || page === "/search") {
        const [s, p, c] = await Promise.all([
          req("/services?pageSize=100"),
          req("/products?pageSize=100"),
          req("/equipment-categories"),
        ]);
        d = { services: s.items, products: p.items, categories: c };
      } else if (page.startsWith("/services/")) {
        d = { service: await req("/services/" + page.split("/")[2]) };
      } else if (page.startsWith("/product/"))
        d = { product: await req("/products/" + page.split("/")[2]) };
      else if (page === "/technicians") d = { technicians: (await req("/technicians")).items };
      else if (page === "/cart" || page === "/checkout") {
        d = { cart: await req("/cart") };
        if (page === "/checkout" && session?.authenticated && d.cart.items?.length) {
          const options = await req("/checkout/options?deliveryMethod=COURIER");
          d.cart = options.summary;
        }
      } else if (page === "/contact" || page === "/branches")
        d = { branches: (await req("/branches")).items };
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
  }, [path, locale, revision, session?.authenticated]);
  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(""), 3500);
    return () => clearTimeout(id);
  }, [notice]);
  const link = (url: string, label: React.ReactNode, cls = "") => (
    <a
      key={url}
      className={cls}
      href={`/${locale}${url === "/" ? "" : url}`}
      onClick={(e) => {
        if (!e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          go(url);
        }
      }}
    >
      {label}
    </a>
  );
  const money = (v: any) =>
    v?.amount
      ? new Intl.NumberFormat(locale === "az" ? "az-AZ" : locale === "ru" ? "ru-RU" : "en-GB", {
          style: "currency",
          currency: "AZN",
          maximumFractionDigits: 2,
        }).format(Number(v.amount))
      : "—";
  const date = (v: string) =>
    v
      ? new Intl.DateTimeFormat(locale === "az" ? "az-AZ" : locale === "ru" ? "ru-RU" : "en-GB", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Asia/Baku",
        }).format(new Date(v))
      : "—";
  const status = (s: string) => (
    <span className={"status " + s.toLowerCase()}>
      {statusNames[s]?.[locale === "az" ? 0 : locale === "en" ? 1 : 2] || s}
    </span>
  );
  const book = (s?: Row) => {
    if (!session?.authenticated) {
      sessionStorage.setItem("returnTo", s ? `/services/${s.slug}/book` : "/services");
      go("/login");
    } else go(s ? `/services/${s.slug}/book` : "/services");
  };
  const add = async (p: Row) => {
    setSending(true);
    try {
      const c = await req("/cart/items", "POST", {
        variantId: p.defaultVariantId,
        quantity: "1",
        unit: p.baseUnit,
        withInstallation: false,
      });
      setCartCount(c.itemCount ?? c.items?.length ?? 1);
      setNotice(t.add + " ✓");
    } catch (e) {
      setNotice((e as Error).message);
    } finally {
      setSending(false);
    }
  };
  const submitLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError("");
    try {
      const r = await req(
        challenge ? "/auth/2fa" : "/auth/login",
        "POST",
        challenge ? { challengeId: challenge, code: otp } : { email, password },
      );
      if (r.status === "TWO_FACTOR_REQUIRED") {
        setChallenge(r.challengeId);
        return;
      }
      setSession(r.session);
      setRevision((x) => x + 1);
      const dest = sessionStorage.getItem("returnTo");
      sessionStorage.removeItem("returnTo");
      go(admin ? "/" : dest || "/account");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSending(false);
    }
  };
  const logout = async () => {
    await req("/auth/logout", "POST");
    setSession(null);
    go("/login");
  };
  const art = (kind = "ac") => (
    <div className={"product-art " + (kind.includes("boiler") ? "boiler" : "")} aria-hidden="true">
      <div className="appliance">
        <span className="appliance-brand">{kind.includes("boiler") ? "THERMO" : "INVERTER"}</span>
        <span className="appliance-light" />
        <div className="vents" />
        <span className="appliance-display">24°</span>
      </div>
      <div className="air-line" />
      <div className="air-line second" />
    </div>
  );
  const serviceCard = (s: Row, i: number) => {
    const Icon =
      (
        {
          snowflake: Snowflake,
          flame: Flame,
          waves: Waves,
          droplets: Droplets,
          zap: Zap,
        } as Record<string, typeof Wrench>
      )[s.icon] || Wrench;
    return (
      <article className="service-card" key={s.id}>
        <div className="card-top">
          <span className={"icon-box tone" + (i % 3)}>
            <Icon size={26} />
          </span>
          <span className="muted small">
            {s.estimatedDurationMinutes} {locale === "az" ? "dəq" : locale === "ru" ? "мин" : "min"}
          </span>
        </div>
        <h3>{s.name}</h3>
        <p>{s.shortDescription}</p>
        <div className="card-bottom">
          <div>
            <small>{t.price}</small>
            <strong>
              {s.price
                ? money(s.price)
                : locale === "az"
                  ? "Diaqnostikadan sonra"
                  : locale === "ru"
                    ? "После диагностики"
                    : "After diagnosis"}
            </strong>
          </div>
          {link("/services/" + s.slug, <ArrowUpRight size={21} />, "round-link")}
        </div>
      </article>
    );
  };
  const productCard = (p: Row) => (
    <article className="product-card" key={p.id}>
      {link(
        "/product/" + p.slug,
        <>
          {art(p.imageUrl)}
          <span className="product-brand">{p.brandName}</span>
          <h3>{p.name}</h3>
        </>,
      )}
      <div className="rating">
        <Star size={13} fill="currentColor" /> {p.rating} <span>({p.reviewCount})</span>
      </div>
      <div className="card-bottom">
        <strong>{money(p.price?.effectivePrice)}</strong>
        <button
          className="icon-button add"
          aria-label={`${t.add}: ${p.name}`}
          disabled={sending || p.stockStatus === "OUT_OF_STOCK"}
          onClick={() => add(p)}
        >
          <Plus size={19} />
        </button>
      </div>
    </article>
  );
  const heading = (title: string, sub?: string) => (
    <div className="page-heading">
      <div className="breadcrumb">
        {link("/", t.home)} <ChevronRight size={13} /> {title}
      </div>
      <h1>{title}</h1>
      {sub && <p>{sub}</p>}
    </div>
  );
  const list = (items: Row[], key = "name") =>
    items.filter(
      (x) =>
        String(x[key]).toLocaleLowerCase(locale).includes(query.toLocaleLowerCase(locale)) &&
        (!filter || x.categoryId === filter),
    );
  const searchbar = (placeholder = t.search) => (
    <div className="search-input">
      <Search size={19} />
      <input
        aria-label={placeholder}
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {query && (
        <button aria-label={t.clear} onClick={() => setQuery("")}>
          <X size={17} />
        </button>
      )}
    </div>
  );
  const orderList = (orders: Row[]) => (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>{t.orders}</th>
            {admin && <th>{t.customer}</th>}
            <th>{t.date}</th>
            <th>{t.status}</th>
            <th>{t.total}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id}>
              <td>
                <strong>{o.serviceName}</strong>
                <small>
                  {o.number} · {o.device?.modelName || o.categoryName}
                </small>
              </td>
              {admin && <td>{o.customerName}</td>}
              <td>{date(o.scheduledAt || o.createdAt)}</td>
              <td>{status(o.status)}</td>
              <td>{money(o.total)}</td>
              <td>
                <button
                  className="icon-button"
                  aria-label={`${t.review} ${o.number}`}
                  onClick={() => setSelected(o)}
                >
                  <ArrowUpRight size={18} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!orders.length && <div className="empty">{t.empty}</div>}
    </div>
  );
  const loginScreen = (
    <div className="login-grid">
      <div className="login-story">
        <span className="eyebrow">{t.eyebrow}</span>
        <h1>
          {t.hero}
          <br />
          {t.hero2}
        </h1>
        {art()}
        <div className="login-assurance">
          <ShieldCheck />
          {t.guarantee}
        </div>
      </div>
      <form className="login-form" onSubmit={submitLogin}>
        <span className="icon-box">
          <UserRound />
        </span>
        <h1>{t.welcome}</h1>
        <p>{t.loginHint}</p>
        {challenge ? (
          <label>
            2FA
            <input
              required
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="123456"
            />
          </label>
        ) : (
          <>
            <label>
              {t.email}
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label>
              {t.password}
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
          </>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button className="btn primary" disabled={sending}>
          {sending ? t.loading : t.login}
          <ArrowRight size={17} />
        </button>
        <div className="demo-account">
          <strong>DEMO</strong>
          <p>{admin ? "admin@demo.az" : "aysel@demo.az"} · Demo1234!</p>
          {challenge && <p>2FA: 123456</p>}
        </div>
      </form>
    </div>
  );
  let content: React.ReactNode;
  if (page === "/login" || ((admin || page.startsWith("/account")) && !session?.authenticated))
    content = loginScreen;
  else if (busy)
    content = (
      <div className="container loading-state" aria-live="polite">
        <div className="skeleton large" />
        <div className="grid three">
          {[1, 2, 3].map((i) => (
            <div className="skeleton" key={i} />
          ))}
        </div>
        <span>{t.loading}</span>
      </div>
    );
  else if (error)
    content = (
      <div className="empty">
        <h2>{error}</h2>
        <button className="btn" onClick={() => setRevision((x) => x + 1)}>
          {t.retry}
        </button>
      </div>
    );
  else if (admin || page.startsWith("/account")) {
    const orders = data.orders || [];
    const tab = page.split("/").pop();
    content = (
      <div className="workspace">
        <aside className="sidebar">
          <div className="user-card">
            <span className="avatar">{session?.user?.firstName?.[0]}</span>
            <div>
              <strong>{session?.user?.firstName}</strong>
              <small>{admin ? t.admin : session?.plan?.name || "Basic"}</small>
            </div>
          </div>
          {[
            [admin ? "/" : "/account", t.dashboard, LayoutDashboard],
            [admin ? "/service-orders" : "/account/services", t.orders, ClipboardList],
            ...(!admin
              ? [
                  ["/account/devices", t.devices, Box],
                  ["/account/profile", t.profile, UserRound],
                ]
              : []),
          ].map(([url, label, Icon]: any) =>
            link(
              url,
              <>
                <Icon size={19} />
                {label}
              </>,
              page === url ? "side-link active" : "side-link",
            ),
          )}
          <div className="sidebar-help">
            <ShieldCheck />
            <h4>{t.help}</h4>
            <p>{brand?.contacts?.phone}</p>
            {link("/contact", t.contact)}
          </div>
          <button className="side-link" onClick={logout}>
            <LogOut size={18} />
            {t.logout}
          </button>
        </aside>
        <div className="workspace-content">
          <div className="workspace-title">
            <div>
              <span className="eyebrow">{admin ? "WORKSPACE" : t.account}</span>
              <h1>
                {tab === "devices"
                  ? t.devices
                  : tab === "profile"
                    ? t.profile
                    : tab === "services" || tab === "service-orders"
                      ? t.orders
                      : t.dashboard}
              </h1>
            </div>
            <button className="btn primary" onClick={() => book()}>
              <Plus size={17} />
              {t.new}
            </button>
          </div>
          {tab === "profile" ? (
            <div className="panel">
              <h2>{session?.user?.fullName}</h2>
              <p>{session?.user?.email}</p>
              <p>{session?.user?.phone}</p>
              <h3>{t.address}</h3>
              {session?.addresses?.map((a: Row) => (
                <p key={a.id}>
                  {a.label}: {a.city}, {a.street}
                </p>
              ))}
            </div>
          ) : tab === "devices" ? (
            <div className="grid three">
              {data.devices?.map((d: Row) => (
                <article className="panel" key={d.id}>
                  {art(d.modelName)}
                  <h3>{d.modelName}</h3>
                  <p>{d.serialNumber}</p>
                  <button className="btn" onClick={() => book()}>
                    {t.book}
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <>
              <div className="grid stats">
                <div className="stat">
                  <ClipboardList />
                  <span>{t.orders}</span>
                  <strong>{orders.length}</strong>
                </div>
                <div className="stat">
                  <Clock3 />
                  <span>{t.status}</span>
                  <strong>
                    {
                      orders.filter((o: Row) =>
                        ["NEW", "CONFIRMED", "IN_PROGRESS"].includes(o.status),
                      ).length
                    }
                    <small>
                      {" "}
                      {locale === "az" ? "aktiv" : locale === "ru" ? "активных" : "active"}
                    </small>
                  </strong>
                </div>
                <div className="stat">
                  <PackageCheck />
                  <span>
                    {statusNames.COMPLETED[locale === "az" ? 0 : locale === "en" ? 1 : 2]}
                  </span>
                  <strong>
                    {orders.filter((o: Row) => ["CLOSED", "COMPLETED"].includes(o.status)).length}
                  </strong>
                </div>
              </div>
              <div className="panel table-panel">
                <div className="section-heading">
                  <h2>{t.orders}</h2>
                  {searchbar()}
                </div>
                {orderList(list(orders, "serviceName"))}
              </div>
            </>
          )}
        </div>
      </div>
    );
  } else if (page === "/")
    content = (
      <>
        <section className="hero">
          <div className="container hero-grid">
            <div className="hero-copy">
              <span className="eyebrow">
                <span className="dot" />
                {t.eyebrow}
              </span>
              <h1>
                {t.hero}
                <br />
                <em>{t.hero2}</em>
              </h1>
              <p>{t.intro}</p>
              <div className="hero-actions">
                <button className="btn primary" onClick={() => book()}>
                  {t.book}
                  <ArrowUpRight size={19} />
                </button>
                {link(
                  "/services",
                  <>
                    {t.all}
                    <ArrowRight size={18} />
                  </>,
                  "btn outline",
                )}
              </div>
              <div className="hero-trust">
                <div className="mini-avatars">
                  <span>EQ</span>
                  <span>KM</span>
                  <span>NA</span>
                </div>
                <div>
                  <div className="stars">★★★★★</div>
                  <small>
                    {t.verified} · {t.guarantee}
                  </small>
                </div>
              </div>
            </div>
            <div className="hero-scene">
              <div className="scene-window">
                <i />
                <i />
                <i />
                <i />
              </div>
              <div className="scene-wall">{art()}</div>
              <div className="scene-cabinet">
                <span />
                <span />
                <span />
              </div>
              <div className="plant">
                <div />
                <i />
                <b />
              </div>
              <div className="scene-rug" />
              <div className="floating-card">
                <span className="icon-box">
                  <ShieldCheck />
                </span>
                <div>
                  <strong>{t.guarantee}</strong>
                  <small>{t.verified}</small>
                </div>
                <span className="check-circle">
                  <Check size={14} />
                </span>
              </div>
              <div className="scene-tag">
                <span className="dot" />
                {t.since}
              </div>
            </div>
          </div>
        </section>
        <div className="container">
          <div className="benefit-bar">
            {[
              [ShieldCheck, t.verified],
              [Clock3, t.onTime],
              [Settings2, t.transparent],
              [PackageCheck, t.guarantee],
            ].map(([Icon, label]: any) => (
              <div key={label}>
                <Icon size={22} />
                <strong>{label}</strong>
              </div>
            ))}
          </div>
          <section className="section">
            <div className="section-heading">
              <div>
                <span className="eyebrow">{t.services}</span>
                <h2>{t.choose}</h2>
                <p>{t.sub}</p>
              </div>
              {link(
                "/services",
                <>
                  {t.all}
                  <ArrowUpRight size={18} />
                </>,
                "text-link",
              )}
            </div>
            <div className="grid three">
              {(data.services || [])
                .filter(
                  (s: Row, i: number, a: Row[]) =>
                    a.findIndex((x) => x.categoryId === s.categoryId) === i,
                )
                .slice(0, 6)
                .map(serviceCard)}
            </div>
          </section>
          <section className="how-section">
            <div>
              <span className="eyebrow">01 — 02 — 03</span>
              <h2>{t.how}</h2>
              <p>{t.howSub}</p>
            </div>
            <div className="grid three">
              {[t.step1, t.step2, t.step3].map((s, i) => (
                <div className="how-step" key={s}>
                  <span>0{i + 1}</span>
                  <h3>{s}</h3>
                  <p>{[t.chooseService, t.onTime, t.guarantee][i]}</p>
                </div>
              ))}
            </div>
          </section>
          <section className="section">
            <div className="section-heading">
              <div>
                <span className="eyebrow">{t.shop}</span>
                <h2>{t.popular}</h2>
              </div>
              {link(
                "/shop",
                <>
                  {t.browse}
                  <ArrowUpRight size={18} />
                </>,
                "text-link",
              )}
            </div>
            <div className="grid four">{(data.products || []).slice(0, 4).map(productCard)}</div>
          </section>
          <section className="cta">
            <div>
              <h2>{t.ready}</h2>
              <p>{t.readySub}</p>
            </div>
            <button className="btn orange" onClick={() => book()}>
              {t.book}
              <ArrowUpRight size={18} />
            </button>
          </section>
        </div>
      </>
    );
  else if (["/services", "/shop", "/search"].includes(page)) {
    const isService = page === "/services",
      items = list(isService ? data.services || [] : data.products || []);
    content = (
      <div className="container">
        {heading(isService ? t.services : t.shop, isService ? t.sub : t.popular)}
        <div className="catalog-toolbar">
          {searchbar()}
          <label className="select-filter">
            <Settings2 size={17} />
            <select
              aria-label={t.allCategories}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="">{t.allCategories}</option>
              {(isService
                ? data.categories
                : [
                    ...new Map(
                      (data.products || []).map((p: Row) => [
                        p.categoryId,
                        { id: p.categoryId, name: p.categoryName },
                      ]),
                    ).values(),
                  ]
              )?.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <span className="muted">
            {items.length} {t.results}
          </span>
        </div>
        <div className={"grid " + (isService ? "three" : "four")}>
          {items.slice(0, limit).map(isService ? serviceCard : productCard)}
        </div>
        {!items.length && (
          <div className="empty">
            <Search />
            <h3>{t.empty}</h3>
            <button
              className="btn"
              onClick={() => {
                setQuery("");
                setFilter("");
              }}
            >
              {t.clear}
            </button>
          </div>
        )}
        {items.length > limit && (
          <div className="center">
            <button className="btn" onClick={() => setLimit((x) => x + 12)}>
              {t.more}
            </button>
          </div>
        )}
      </div>
    );
  } else if (page.startsWith("/services/") && data.service) {
    const s = data.service;
    const isBooking = page.endsWith("/book");
    content = (
      <div className="container">
        {heading(isBooking ? t.book : s.name, s.shortDescription)}
        {result ? (
          <div className="success panel">
            <span className="success-icon">
              <Check size={32} />
            </span>
            <h1>{t.success}</h1>
            <h3>{result.number}</h3>
            <p>{t.successSub}</p>
            {link("/account/services", t.viewOrders, "btn primary")}
          </div>
        ) : isBooking ? (
          <div className="booking-layout">
            <form
              className="panel booking-form"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!session?.authenticated) {
                  book(s);
                  return;
                }
                if (step < 3) {
                  setStep(step + 1);
                  return;
                }
                setSending(true);
                try {
                  setResult(
                    await req("/service-orders", "POST", {
                      ...form,
                      serviceId: s.id,
                      scheduledAt: new Date(form.scheduledAt).toISOString(),
                    }),
                  );
                } catch (e) {
                  setNotice((e as Error).message);
                } finally {
                  setSending(false);
                }
              }}
            >
              <div className="stepper">
                {[t.chooseService, t.address, t.summary].map((label, i) => (
                  <div className={step >= i + 1 ? "active" : ""} key={label}>
                    <b>{i + 1}</b>
                    <span>{label}</span>
                  </div>
                ))}
              </div>
              {step === 1 ? (
                <>
                  <h2>{t.serviceForm}</h2>
                  {s.executionForms.map((v: string) => (
                    <label
                      className={"radio-card " + (form.executionForm === v ? "chosen" : "")}
                      key={v}
                    >
                      <input
                        type="radio"
                        name="execution"
                        checked={form.executionForm === v}
                        onChange={() => setForm({ ...form, executionForm: v })}
                      />
                      <MapPin size={21} />
                      {v === "ON_SITE" ? t.onsite : v === "CARRY_IN" ? t.carry : t.pickup}
                    </label>
                  ))}
                  <label>
                    {t.description}
                    <textarea
                      required
                      minLength={10}
                      maxLength={2000}
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                    />
                  </label>
                </>
              ) : step === 2 ? (
                <>
                  <h2>{t.address}</h2>
                  <label>
                    {t.address}
                    <select
                      required
                      value={form.addressId}
                      onChange={(e) => setForm({ ...form, addressId: e.target.value })}
                    >
                      <option value="">—</option>
                      {session?.addresses?.map((a: Row) => (
                        <option key={a.id} value={a.id}>
                          {a.label} · {a.city}, {a.street}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    {t.time}
                    <input
                      required
                      type="datetime-local"
                      min={new Date(Date.now() + 3600000).toISOString().slice(0, 16)}
                      value={form.scheduledAt}
                      onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
                    />
                  </label>
                </>
              ) : (
                <>
                  <h2>{t.summary}</h2>
                  <h3>{s.name}</h3>
                  <p>{form.description}</p>
                  <p>{session?.addresses?.find((a: Row) => a.id === form.addressId)?.street}</p>
                  <p>{date(form.scheduledAt)}</p>
                  <label className="consent">
                    <input type="checkbox" required />
                    {t.consent}
                  </label>
                </>
              )}
              <div className="form-actions">
                {step > 1 && (
                  <button type="button" className="btn" onClick={() => setStep((x) => x - 1)}>
                    {t.back}
                  </button>
                )}
                <button className="btn primary" disabled={sending}>
                  {sending ? t.loading : step === 3 ? t.confirm : t.continue}
                  <ArrowRight size={17} />
                </button>
              </div>
            </form>
            <aside className="panel booking-summary">
              <span className="icon-box">
                <Wrench />
              </span>
              <h3>{s.name}</h3>
              <p>{s.shortDescription}</p>
              <hr />
              <div className="price-row">
                <span>{t.price}</span>
                <strong>{s.price ? money(s.price) : "—"}</strong>
              </div>
              <p className="small">
                {locale === "az"
                  ? "Yekun məbləğ diaqnostikadan sonra smeta ilə təsdiqlənir."
                  : locale === "ru"
                    ? "Итоговая сумма согласуется в смете после диагностики."
                    : "The final amount is approved in an estimate after diagnosis."}
              </p>
              <hr />
              <p>
                <ShieldCheck size={17} /> {t.guarantee}
              </p>
              <p>
                <Clock3 size={17} /> {t.onTime}
              </p>
            </aside>
          </div>
        ) : (
          <div className="detail-layout">
            <div>
              <div className="service-visual">
                <Wrench size={90} strokeWidth={1} />
                <Snowflake size={150} strokeWidth={0.6} />
              </div>
              <h2>{s.name}</h2>
              <p className="description">{s.description}</p>
              <h2>{t.faq}</h2>
              {s.faq?.map((f: Row, i: number) => (
                <details key={i}>
                  <summary>
                    {f.q}
                    <Plus size={17} />
                  </summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
            <aside className="panel booking-summary">
              <span className="eyebrow">{t.guarantee}</span>
              <h2>{money(s.price)}</h2>
              <p>{s.shortDescription}</p>
              <button
                className="btn primary"
                onClick={() => {
                  setForm({ ...form, executionForm: s.executionForms[0] });
                  book(s);
                }}
              >
                {t.book}
                <ArrowUpRight size={18} />
              </button>
              <hr />
              <p>
                <Clock3 size={18} />
                {s.estimatedDurationMinutes} min
              </p>
              <p>
                <ShieldCheck size={18} />
                {s.workWarrantyMonths}{" "}
                {locale === "az"
                  ? "ay zəmanət"
                  : locale === "ru"
                    ? "мес. гарантии"
                    : "months warranty"}
              </p>
            </aside>
          </div>
        )}
      </div>
    );
  } else if (page.startsWith("/product/") && data.product) {
    const p = data.product;
    content = (
      <div className="container">
        {heading(p.name, p.brandName)}
        <div className="detail-layout">
          <div className="product-detail-art">{art(p.imageUrl)}</div>
          <div className="panel">
            <span className="eyebrow">{p.brandName}</span>
            <h1>{p.name}</h1>
            <p>{p.description}</p>
            <p className="rating">
              <Star size={16} /> {p.rating} ({p.reviewCount})
            </p>
            <p className="status">
              {p.stockStatus === "OUT_OF_STOCK" ? t.unavailable : t.available}
            </p>
            <h2>{money(p.price?.effectivePrice)}</h2>
            <button
              className="btn primary"
              disabled={sending || p.stockStatus === "OUT_OF_STOCK"}
              onClick={() => add(p)}
            >
              {t.add}
              <ShoppingBag size={18} />
            </button>
            <hr />
            {p.highlights?.map((h: string) => (
              <p key={h}>
                <Check size={16} /> {h}
              </p>
            ))}
          </div>
        </div>
      </div>
    );
  } else if (page === "/technicians")
    content = (
      <div className="container">
        {heading(t.technicians, t.verified)}
        <div className="catalog-toolbar">{searchbar()}</div>
        <div className="grid three">
          {list(data.technicians || [], "fullName").map((tech: Row) => (
            <article className="panel technician" key={tech.id}>
              <div className="tech-avatar">
                {tech.fullName
                  .split(" ")
                  .map((v: string) => v[0])
                  .slice(0, 2)
                  .join("")}
                <ShieldCheck />
              </div>
              <h2>{tech.fullName}</h2>
              <p>
                {tech.city} · {tech.experienceYears}{" "}
                {locale === "az"
                  ? "il təcrübə"
                  : locale === "ru"
                    ? "лет опыта"
                    : "years experience"}
              </p>
              <div className="rating">
                <Star size={15} fill="currentColor" />
                {tech.rating} ({tech.reviewCount})
              </div>
              <div className="tech-tags">
                {tech.specializations?.slice(0, 3).map((s: any, i: number) => (
                  <span key={i}>{typeof s === "string" ? s : s.name}</span>
                ))}
              </div>
              <button className="btn" onClick={() => book()}>
                {t.book}
                <ArrowRight size={17} />
              </button>
            </article>
          ))}
        </div>
      </div>
    );
  else if (page === "/cart" || page === "/checkout") {
    const cart = data.cart;
    content = (
      <div className="container">
        {heading(page === "/cart" ? t.cart : t.checkout)}
        {result ? (
          <div className="success panel">
            <Check size={40} />
            <h1>{t.success}</h1>
            <h3>{result.salesOrderNumber}</h3>
            <p>{t.demo}</p>
            {link("/", t.backHome, "btn primary")}
          </div>
        ) : !cart?.items?.length ? (
          <div className="empty">
            <ShoppingBag size={44} />
            <h2>{t.empty}</h2>
            {link("/shop", t.browse, "btn primary")}
          </div>
        ) : (
          <div className="booking-layout">
            <div className="panel">
              {cart.items.map((item: Row) => (
                <div className="cart-item" key={item.id}>
                  {art(item.imageUrl)}
                  <div>
                    <h3>{item.name}</h3>
                    <p>{item.variantName}</p>
                    <strong>{money(item.lineTotal)}</strong>
                    <div className="quantity">
                      <button
                        disabled={sending || Number(item.quantity.value) <= 1}
                        aria-label="−"
                        onClick={async () => {
                          setSending(true);
                          try {
                            await req("/cart/items/" + item.id, "PATCH", {
                              quantity: String(Number(item.quantity.value) - 1),
                            });
                            setRevision((x) => x + 1);
                          } catch (e) {
                            setNotice((e as Error).message);
                          } finally {
                            setSending(false);
                          }
                        }}
                      >
                        <Minus size={14} />
                      </button>
                      <span>{item.quantity.value}</span>
                      <button
                        disabled={sending}
                        aria-label="+"
                        onClick={async () => {
                          setSending(true);
                          try {
                            await req("/cart/items/" + item.id, "PATCH", {
                              quantity: String(Number(item.quantity.value) + 1),
                            });
                            setRevision((x) => x + 1);
                          } catch (e) {
                            setNotice((e as Error).message);
                          } finally {
                            setSending(false);
                          }
                        }}
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                  <button
                    className="icon-button"
                    aria-label={t.remove}
                    onClick={async () => {
                      try {
                        await req("/cart/items/" + item.id, "DELETE");
                        setRevision((x) => x + 1);
                      } catch (e) {
                        setNotice((e as Error).message);
                      }
                    }}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
            <form
              className="panel booking-summary"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!session?.authenticated) {
                  sessionStorage.setItem("returnTo", "/checkout");
                  go("/login");
                  return;
                }
                if (page === "/cart") {
                  go("/checkout");
                  return;
                }
                setSending(true);
                try {
                  setResult(
                    await req("/checkout", "POST", {
                      deliveryMethod: "COURIER",
                      addressId: form.addressId,
                      paymentMethod: "CASH",
                      idempotencyKey: crypto.randomUUID(),
                      acceptTerms: true,
                    }),
                  );
                  setCartCount(0);
                } catch (e) {
                  setNotice((e as Error).message);
                } finally {
                  setSending(false);
                }
              }}
            >
              <h2>{t.summary}</h2>
              <div className="price-row">
                <span>{t.shop}</span>
                <strong>{money(cart.totals.subtotal)}</strong>
              </div>
              <div className="price-row">
                <span>{t.total}</span>
                <strong>{money(cart.totals.total)}</strong>
              </div>
              {page === "/checkout" && (
                <>
                  <label>
                    {t.address}
                    <select
                      required
                      value={form.addressId}
                      onChange={(e) => setForm({ ...form, addressId: e.target.value })}
                    >
                      <option value="">—</option>
                      {session?.addresses?.map((a: Row) => (
                        <option key={a.id} value={a.id}>
                          {a.street}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    {t.payment}
                    <select>
                      <option>{t.cash}</option>
                    </select>
                  </label>
                  <label className="consent">
                    <input type="checkbox" required />
                    {t.consent}
                  </label>
                </>
              )}
              <button className="btn primary" disabled={sending}>
                {sending ? t.loading : page === "/cart" ? t.checkout : t.confirm}
                <ArrowRight size={17} />
              </button>
              <p className="small">{t.demo}</p>
            </form>
          </div>
        )}
      </div>
    );
  } else if (["/about", "/contact", "/branches", "/faq"].includes(page))
    content = (
      <div className="container">
        {heading(page === "/about" ? t.about : page === "/faq" ? t.faq : t.contact, t.since)}
        <div className="detail-layout">
          <div className="panel">
            <span className="icon-box">
              <Wrench />
            </span>
            <h2>{t.since}</h2>
            <p className="description">{t.aboutText}</p>
            <p className="muted">{t.demoNote}</p>
            {link("/services", t.all, "btn primary")}
          </div>
          <div className="panel">
            <h2>{t.contact}</h2>
            <p>
              <Phone size={18} /> {brand?.contacts?.phone}
            </p>
            <p>
              <MapPin size={18} /> {brand?.contacts?.address}
            </p>
            <p>
              <Clock3 size={18} /> {t.working}
            </p>
            <p>{brand?.contacts?.email}</p>
          </div>
        </div>
      </div>
    );
  else
    content = (
      <div className="empty">
        <span className="eyebrow">404</span>
        <h1>{t.notFound}</h1>
        {link("/", t.backHome, "btn primary")}
      </div>
    );
  return (
    <>
      <div className="topbar">
        <div className="container">
          <span>
            <MapPin size={13} /> Bakı <span className="topbar-separator">|</span> {t.working}
          </span>
          <span>{t.demo}</span>
        </div>
      </div>
      <header className="header">
        <div className="container header-inner">
          {link(
            "/",
            <>
              <span className="logo-icon">
                <Wrench size={25} />
              </span>
              <span className="logo-text">
                {brand?.logoText || "besqardas"}
                <small>SERVİS</small>
              </span>
            </>,
            "logo",
          )}
          <nav className={menu ? "nav open" : "nav"} aria-label="Navigation">
            {[
              [t.home, "/"],
              [t.services, "/services"],
              [t.shop, "/shop"],
              [t.technicians, "/technicians"],
              [t.about, "/about"],
            ].map(([label, url]) => link(url, label, page === url ? "active" : ""))}
          </nav>
          <div className="header-actions">
            <select
              aria-label="Language"
              value={locale}
              onChange={(e) => {
                const l = e.target.value as keyof typeof words;
                setLocale(l);
                const u = `/${l}${page === "/" ? "" : page}`;
                window.history.pushState({}, "", u);
                setPath(u);
              }}
            >
              <option value="az">AZ</option>
              <option value="ru">RU</option>
              <option value="en">EN</option>
            </select>
            {!admin &&
              link(
                "/cart",
                <>
                  <ShoppingBag size={21} />
                  {cartCount > 0 && <b className="cart-count">{cartCount}</b>}
                </>,
                "icon-button cart-link",
              )}
            {link(
              session?.authenticated ? "/account" : "/login",
              <>
                <UserRound size={18} />
                <span>{session?.authenticated ? t.account : t.login}</span>
              </>,
              "btn login-button",
            )}
            <button
              aria-label="Menu"
              className="icon-button mobile-menu"
              onClick={() => setMenu(!menu)}
            >
              {menu ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </header>
      <main id="main-content">{content}</main>
      <footer>
        <div className="container footer-grid">
          <div>
            {link(
              "/",
              <>
                <span className="logo-icon">
                  <Wrench size={24} />
                </span>
                <strong>{brand?.logoText || "besqardas"} SERVİS</strong>
              </>,
              "logo",
            )}
            <p>{t.since}</p>
            <small>{t.demoNote}</small>
          </div>
          <div>
            <h4>{t.services}</h4>
            {link("/services", t.all)}
            {link("/shop", t.shop)}
            {link("/technicians", t.technicians)}
          </div>
          <div>
            <h4>{t.about}</h4>
            {link("/about", t.about)}
            {link("/contact", t.contact)}
            {link("/account", t.account)}
          </div>
          <div>
            <h4>{t.help}</h4>
            <strong>{brand?.contacts?.phone}</strong>
            <p>{t.working}</p>
            <span>{brand?.contacts?.email}</span>
          </div>
        </div>
        <div className="container footer-bottom">
          <span>
            © {new Date().getFullYear()} {brand?.companyName}
          </span>
          <span>{t.demo}</span>
        </div>
      </footer>
      {notice && (
        <div className="toast" role="status">
          <Check size={18} />
          {notice}
          <button aria-label="Close" onClick={() => setNotice("")}>
            <X size={15} />
          </button>
        </div>
      )}
      {selected && (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <section
            role="dialog"
            aria-modal="true"
            aria-label={selected.number}
            className="modal"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Escape") setSelected(null);
            }}
          >
            <button
              autoFocus
              className="modal-close icon-button"
              aria-label="Close"
              onClick={() => setSelected(null)}
            >
              <X />
            </button>
            <span className="eyebrow">{selected.number}</span>
            <h2>{selected.serviceName}</h2>
            {status(selected.status)}
            <p>{selected.description}</p>
            <p>
              <MapPin size={17} />
              {selected.addressShort}
            </p>
            <p>
              <Clock3 size={17} />
              {date(selected.scheduledAt || selected.createdAt)}
            </p>
            <div className="timeline">
              {selected.stages?.map((s: Row, i: number) => (
                <div key={s.id}>
                  <span className={s.status === "COMPLETED" ? "done" : ""}>{i + 1}</span>
                  <div>
                    <strong>{s.customerName || s.name}</strong>
                    <small>
                      {s.status === "COMPLETED" ? "✓" : s.status === "PENDING" ? "—" : s.status}
                    </small>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
