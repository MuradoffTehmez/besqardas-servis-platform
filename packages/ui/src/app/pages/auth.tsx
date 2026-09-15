"use client";
import React, { useState } from "react";
import { Award, BadgeCheck, Boxes, Building, CalendarDays, Check as CheckIcon, CheckCircle2, FileText, Handshake, IdCard, Info, KeyRound, Mail, MapPin, Phone, Receipt, Send, ShieldCheck, Smartphone, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@sp/utils";
import { ApiError, post, useApi, useQueryClient } from "@sp/api-client";
import { useI18n } from "../core/i18n";
import { Link, useRouter } from "../core/router";
import { useSession } from "../core/session";
import { adminUrl, homeFor, webUrl } from "../core/shells";
import { Check, FormError, Loading, Radios, SelectField, TextField, errorText, useFormState } from "../kit/base";
import { FileDrop, OtpInput, PhoneField, type PickedFile } from "../kit/media";
import { InfoHero } from "./info";

/* ------------------------------------------------------------------ */
/* Ümumi auth layout                                                   */
/* ------------------------------------------------------------------ */

export function AuthLayout({ title, subtitle, children, wide }: { title: React.ReactNode; subtitle?: React.ReactNode; children: React.ReactNode; wide?: boolean }) {
  const { t, locale } = useI18n();
  const { setLocale } = useRouter();
  return (
    <div className="auth-shell">
      <aside className="auth-story">
        <Link to="/" className="brand-logo auth-logo"><span className="logo-icon">bq</span><span className="logo-text">besqardas<span className="logo-sub">servis</span></span></Link>
        <h2>{t("auth.storyTitle")}</h2>
        <ul>
          <li><CheckCircle2 size={18} /> {t("auth.story1")}</li>
          <li><CheckCircle2 size={18} /> {t("auth.story2")}</li>
          <li><CheckCircle2 size={18} /> {t("auth.story3")}</li>
        </ul>
      </aside>
      <main id="main-content" className={cn("auth-main", wide && "wide")}>
        <div className="auth-top">
          <Link to="/" className="btn ghost btn-sm">← {t("auth.backToSite")}</Link>
          <select className="form-input auth-lang" value={locale} onChange={(e) => setLocale(e.target.value as "az")} aria-label={t("common.language")}>
            <option value="az">Azərbaycan</option>
            <option value="ru">Русский</option>
            <option value="en">English</option>
          </select>
        </div>
        <div className="auth-card">
          <h1>{title}</h1>
          {subtitle && <p className="text-muted mb-4">{subtitle}</p>}
          {children}
        </div>
      </main>
    </div>
  );
}

function safeNext(next: string | null) {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/login") ? next : null;
}

export function useAfterLogin(app: "web" | "admin") {
  const { navigate, query } = useRouter();
  const qc = useQueryClient();
  return async (result: any) => {
    await qc.invalidateQueries({ queryKey: ["api"] });
    if (result.status === "SELECT_MODE") return navigate(`/select-mode${query.get("next") ? `?next=${encodeURIComponent(query.get("next")!)}` : ""}`);
    const target = result.redirectTo as string;
    const next = safeNext(query.get("next"));
    if (app === "admin") {
      if (target === "ADMIN_APP") return navigate(next ?? "/", { replace: true });
      window.location.href = webUrl(target);
      return;
    }
    if (target === "ADMIN_APP") {
      window.location.href = adminUrl();
      return;
    }
    navigate(next ?? target, { replace: true });
  };
}

/* ------------------------------------------------------------------ */
/* Giriş (§9.2): telefon + OTP və e-poçt + şifrə                        */
/* ------------------------------------------------------------------ */

export function LoginPage({ app = "web" }: { app?: "web" | "admin" }) {
  const { t, enumLabel } = useI18n();
  const after = useAfterLogin(app);
  const [method, setMethod] = useState<"EMAIL" | "PHONE">(app === "admin" ? "EMAIL" : "PHONE");
  const [step, setStep] = useState<"CREDENTIALS" | "OTP" | "2FA">("CREDENTIALS");
  const form = useFormState({ email: "", password: "", phone: "", code: "" });
  const [challenge, setChallenge] = useState<{ id: string; masked: string; devCode?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const demo = useApi<any[]>("/auth/demo-accounts", { staleTime: Infinity });

  const handle = async (fn: () => Promise<any>) => {
    setBusy(true);
    setError(null);
    try {
      const r = await fn();
      if (r?.status === "TWO_FACTOR_REQUIRED") {
        setChallenge({ id: r.challengeId, masked: r.maskedTarget });
        form.set("code", "");
        setStep("2FA");
        return;
      }
      if (r?.status === "OK" || r?.status === "SELECT_MODE") await after(r);
    } catch (e) {
      setError(e);
      form.fromError(e);
    } finally {
      setBusy(false);
    }
  };

  const submitCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    if (method === "EMAIL") return handle(() => post("/auth/login", { email: form.values.email, password: form.values.password }));
    return handle(async () => {
      const r = await post("/auth/otp/request", { phone: form.values.phone, purpose: "LOGIN" });
      setChallenge({ id: r.challengeId, masked: r.maskedTarget, devCode: r.devCode });
      setStep("OTP");
      return null;
    });
  };

  if (step === "2FA" && challenge) {
    return (
      <AuthLayout title={t("auth.twoFactorTitle")} subtitle={t("auth.twoFactorText", { target: challenge.masked })}>
        <form onSubmit={(e) => { e.preventDefault(); void handle(() => post("/auth/2fa", { challengeId: challenge.id, code: form.values.code })); }}>
          <FormError error={error} />
          <OtpInput value={form.values.code} onChange={(v) => form.set("code", v)} autoFocus />
          <p className="kit-field-hint mt-2">{t("auth.demoCode")}</p>
          <button className="btn primary w-full mt-4" disabled={busy || form.values.code.length < 6}><ShieldCheck size={16} /> {t("auth.verify")}</button>
          <button type="button" className="btn ghost w-full mt-2" onClick={() => setStep("CREDENTIALS")}>{t("common.back")}</button>
        </form>
      </AuthLayout>
    );
  }

  if (step === "OTP" && challenge) {
    return (
      <AuthLayout title={t("auth.otpTitle")} subtitle={t("auth.otpText", { target: challenge.masked })}>
        <form onSubmit={(e) => { e.preventDefault(); void handle(() => post("/auth/otp/verify", { phone: form.values.phone, code: form.values.code, challengeId: challenge.id })); }}>
          <FormError error={error} />
          <OtpInput value={form.values.code} onChange={(v) => form.set("code", v)} autoFocus />
          {challenge.devCode && <p className="kit-field-hint mt-2">{t("auth.devCode", { code: challenge.devCode })}</p>}
          <button className="btn primary w-full mt-4" disabled={busy || form.values.code.length < 6}>{t("auth.signIn")}</button>
          <div className="flex justify-between mt-3">
            <button type="button" className="btn ghost btn-sm" onClick={() => setStep("CREDENTIALS")}>{t("auth.changeNumber")}</button>
            <button type="button" className="btn ghost btn-sm" onClick={() => handle(async () => { await post("/auth/otp/request", { phone: form.values.phone, purpose: "LOGIN" }); toast.success(t("auth.codeResent")); return null; })}>{t("auth.resend")}</button>
          </div>
        </form>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title={app === "admin" ? t("auth.adminLoginTitle") : t("auth.loginTitle")} subtitle={app === "admin" ? t("auth.adminLoginText") : t("auth.loginText")}>
      <div className="kit-segment" role="tablist">
        <button type="button" role="tab" aria-selected={method === "PHONE"} className={cn(method === "PHONE" && "active")} onClick={() => setMethod("PHONE")}><Phone size={15} /> {t("auth.byPhone")}</button>
        <button type="button" role="tab" aria-selected={method === "EMAIL"} className={cn(method === "EMAIL" && "active")} onClick={() => setMethod("EMAIL")}><Mail size={15} /> {t("auth.byEmail")}</button>
      </div>
      <form onSubmit={submitCredentials} noValidate>
        <FormError error={error instanceof ApiError && !Object.keys(error.fieldErrors).length ? error : null} />
        {method === "EMAIL" ? (
          <>
            <TextField label={t("email")} type="email" autoComplete="email" required value={form.values.email} onValue={(v) => form.set("email", v)} error={form.errors.email} />
            <TextField label={t("password")} type="password" autoComplete="current-password" required value={form.values.password} onValue={(v) => form.set("password", v)} error={form.errors.password} />
            <div className="flex justify-end mb-3"><Link to="/forgot-password" className="text-brand text-sm">{t("auth.forgot")}</Link></div>
          </>
        ) : (
          <PhoneField label={t("auth.phone")} required value={form.values.phone} onValue={(v) => form.set("phone", v)} error={form.errors.phone} hint={t("auth.phoneHint")} />
        )}
        <button className="btn primary w-full" disabled={busy}>{method === "EMAIL" ? t("auth.signIn") : t("auth.sendCode")}</button>
      </form>
      {app === "web" && (
        <p className="text-center mt-4 text-sm">{t("auth.noAccount")} <Link to="/register" className="text-brand font-semibold">{t("auth.register")}</Link></p>
      )}
      {demo.data && (
        <details className="auth-demo mt-6">
          <summary>{t("auth.demoAccounts")}</summary>
          <ul>
            {demo.data.filter((d) => app === "web" || !["CUSTOMER", "TECHNICIAN", "COURIER", "CORPORATE_CUSTOMER", "PARTNER", "WHOLESALE_CUSTOMER"].includes(d.role)).map((d) => (
              <li key={d.login}>
                <button type="button" onClick={() => { if (d.login.startsWith("+")) { setMethod("PHONE"); form.set("phone", d.login); } else { setMethod("EMAIL"); form.set("email", d.login); form.set("password", d.password); } }}>
                  <strong>{d.label}</strong>
                  <small>{d.login} · {enumLabel("Role", d.role)}</small>
                </button>
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted">{t("auth.demoHint")}</p>
          {app === "admin" ? <a className="text-brand text-sm font-semibold" href={webUrl("/demo")}>{t("panel.platformMap")} →</a> : <Link to="/demo" className="text-brand text-sm font-semibold">{t("panel.platformMap")} →</Link>}
        </details>
      )}
    </AuthLayout>
  );
}

/* ------------------------------------------------------------------ */
/* Rejim seçimi (§7.3)                                                  */
/* ------------------------------------------------------------------ */

export function SelectModePage({ app = "web" }: { app?: "web" | "admin" }) {
  const { t, enumLabel } = useI18n();
  const { user, loading } = useSession();
  const after = useAfterLogin(app);
  const [busy, setBusy] = useState<string | null>(null);
  if (loading) return <Loading />;
  if (!user) return <LoginPage app={app} />;
  return (
    <AuthLayout title={t("auth.selectModeTitle")} subtitle={t("auth.selectModeText")}>
      <div className="grid gap-3">
        {user.roles.map((r) => (
          <button key={r} type="button" className="choice-card" disabled={!!busy} onClick={async () => { setBusy(r); try { await after(await post("/auth/select-mode", { role: r })); } finally { setBusy(null); } }}>
            <strong>{enumLabel("Role", r)}</strong>
            <small className="text-muted">{t(`auth.modeHint.${homeFor(r) === "ADMIN_APP" ? "internal" : r}`)}</small>
          </button>
        ))}
      </div>
    </AuthLayout>
  );
}

/* ------------------------------------------------------------------ */
/* Qeydiyyat (§9.1)                                                     */
/* ------------------------------------------------------------------ */

export function RegisterPage() {
  const { t, locale } = useI18n();
  const after = useAfterLogin("web");
  const form = useFormState({ method: "PHONE" as "PHONE" | "EMAIL", firstName: "", lastName: "", phone: "", email: "", password: "", acceptTerms: false, marketingConsent: false, code: "" });
  const [challenge, setChallenge] = useState<{ id: string; masked: string; devCode: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const v = form.values;
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (challenge) {
        await after(await post("/auth/otp/verify", { phone: v.phone, code: v.code, challengeId: challenge.id }));
        return;
      }
      const r = await post("/auth/register", { method: v.method, firstName: v.firstName, lastName: v.lastName, phone: v.method === "PHONE" ? v.phone : v.phone || undefined, email: v.method === "EMAIL" ? v.email : undefined, password: v.method === "EMAIL" ? v.password : undefined, locale, acceptTerms: v.acceptTerms || undefined, marketingConsent: v.marketingConsent });
      if (r.status === "OTP_SENT") setChallenge({ id: r.challengeId, masked: r.maskedTarget, devCode: r.devCode });
      else await after(r);
    } catch (err) {
      setError(err);
      form.fromError(err);
    } finally {
      setBusy(false);
    }
  };
  return (
    <AuthLayout title={t("auth.registerTitle")} subtitle={t("auth.registerText")}>
      <div className="auth-links mb-4">
        <Link to="/become-technician" className="chip"><UserPlus size={14} /> {t("auth.technicianApply")}</Link>
        <Link to="/business" className="chip">{t("auth.b2bApply")}</Link>
      </div>
      <form onSubmit={submit} noValidate>
        <FormError error={error instanceof ApiError && !Object.keys(error.fieldErrors).length ? error : null} />
        {challenge ? (
          <>
            <p>{t("auth.otpText", { target: challenge.masked })}</p>
            <OtpInput value={v.code} onChange={(c) => form.set("code", c)} autoFocus />
            <p className="kit-field-hint mt-2">{t("auth.devCode", { code: challenge.devCode })}</p>
          </>
        ) : (
          <>
            <Radios name="method" value={v.method} onValue={(m) => form.set("method", m)} columns={2} options={[{ value: "PHONE", label: t("auth.byPhone") }, { value: "EMAIL", label: t("auth.byEmail") }]} />
            <div className="kit-grid cols-2 mt-3">
              <TextField label={t("fields.firstName")} required autoComplete="given-name" value={v.firstName} onValue={(x) => form.set("firstName", x)} error={form.errors.firstName} />
              <TextField label={t("fields.lastName")} required autoComplete="family-name" value={v.lastName} onValue={(x) => form.set("lastName", x)} error={form.errors.lastName} />
            </div>
            {v.method === "PHONE" ? (
              <PhoneField label={t("auth.phone")} required value={v.phone} onValue={(x) => form.set("phone", x)} error={form.errors.phone} />
            ) : (
              <>
                <TextField label={t("email")} type="email" required autoComplete="email" value={v.email} onValue={(x) => form.set("email", x)} error={form.errors.email} />
                <TextField label={t("password")} type="password" required autoComplete="new-password" value={v.password} onValue={(x) => form.set("password", x)} error={form.errors.password} hint={t("auth.passwordHint")} />
              </>
            )}
            <Check checked={v.acceptTerms} onValue={(x) => form.set("acceptTerms", x)} label={<>{t("auth.acceptTerms1")} <Link to="/terms" className="text-brand">{t("legal.terms")}</Link> {t("auth.acceptTerms2")} <Link to="/privacy" className="text-brand">{t("legal.privacy")}</Link></>} />
            {form.errors.acceptTerms && <p className="kit-field-error">{t("validation.acceptTerms")}</p>}
            <Check checked={v.marketingConsent} onValue={(x) => form.set("marketingConsent", x)} label={t("auth.marketingConsent")} />
          </>
        )}
        <button className="btn primary w-full mt-4" disabled={busy}>{challenge ? t("auth.confirmAndCreate") : t("auth.createAccount")}</button>
      </form>
      <p className="text-center mt-4 text-sm">{t("auth.haveAccount")} <Link to="/login" className="text-brand font-semibold">{t("login")}</Link></p>
    </AuthLayout>
  );
}

export function ForgotPasswordPage() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  return (
    <AuthLayout title={t("auth.forgotTitle")} subtitle={t("auth.forgotText")}>
      {sent ? (
        <div className="alert alert-success" role="status">
          {t("auth.resetSent")}
          <p className="mt-2 text-sm"><Link to={sent} className="text-brand">{t("auth.demoResetLink")}</Link></p>
        </div>
      ) : (
        <form onSubmit={async (e) => { e.preventDefault(); setError(null); try { const r = await post("/auth/forgot-password", { email }); setSent(r.devResetLink); } catch (err) { setError(err); } }}>
          <FormError error={error} />
          <TextField label={t("email")} type="email" required value={email} onValue={setEmail} error={error instanceof ApiError ? error.fieldErrors.email : undefined} />
          <button className="btn primary w-full"><KeyRound size={16} /> {t("auth.sendResetLink")}</button>
        </form>
      )}
      <p className="text-center mt-4"><Link to="/login" className="text-brand">{t("auth.backToLogin")}</Link></p>
    </AuthLayout>
  );
}

export function ResetPasswordPage() {
  const { t } = useI18n();
  const { query, navigate } = useRouter();
  const form = useFormState({ password: "", confirmPassword: "" });
  const [error, setError] = useState<unknown>(null);
  return (
    <AuthLayout title={t("auth.resetTitle")}>
      <form onSubmit={async (e) => { e.preventDefault(); setError(null); try { await post("/auth/reset-password", { token: query.get("token") ?? "", ...form.values }); toast.success(t("auth.passwordChanged")); navigate("/login"); } catch (err) { setError(err); form.fromError(err); } }}>
        <FormError error={error instanceof ApiError && !Object.keys(error.fieldErrors).length ? error : null} />
        {error instanceof ApiError && error.fieldErrors.token && <div className="alert alert-danger">{t("validation.tokenInvalid")}</div>}
        <TextField label={t("auth.newPassword")} type="password" autoComplete="new-password" required value={form.values.password} onValue={(v) => form.set("password", v)} error={form.errors.password} hint={t("auth.passwordHint")} />
        <TextField label={t("auth.confirmPassword")} type="password" autoComplete="new-password" required value={form.values.confirmPassword} onValue={(v) => form.set("confirmPassword", v)} error={form.errors.confirmPassword} />
        <button className="btn primary w-full">{t("auth.savePassword")}</button>
      </form>
    </AuthLayout>
  );
}

/** E-poçt və telefon təsdiqi (§9.1) */
export function VerifyPage() {
  const { t } = useI18n();
  const { user, refresh } = useSession();
  const { query, navigate } = useRouter();
  const type = (query.get("type") ?? (user && !user.emailVerified ? "email" : "phone")) as "email" | "phone";
  const [code, setCode] = useState("");
  const [error, setError] = useState<unknown>(null);
  if (!user) return <LoginPage />;
  const done = type === "email" ? user.emailVerified : user.phoneVerified;
  return (
    <AuthLayout title={t(`auth.verify_${type}_title`)} subtitle={t(`auth.verify_${type}_text`, { target: type === "email" ? user.email ?? "" : user.phone ?? "" })}>
      {done ? (
        <div className="alert alert-success">{t("auth.alreadyVerified")}</div>
      ) : (
        <form onSubmit={async (e) => { e.preventDefault(); setError(null); try { await post("/auth/verify", { type, code }); await refresh(); toast.success(t("auth.verified")); navigate(homeFor(user.activeRole) === "ADMIN_APP" ? "/" : homeFor(user.activeRole)); } catch (err) { setError(err); } }}>
          <FormError error={error} />
          <OtpInput value={code} onChange={setCode} autoFocus />
          <p className="kit-field-hint mt-2">{t("auth.demoCode")}</p>
          <button className="btn primary w-full mt-4" disabled={code.length < 6}>{t("auth.verify")}</button>
          <button type="button" className="btn ghost w-full mt-2" onClick={async () => { await post("/auth/verify/resend"); toast.success(t("auth.codeResent")); }}>{t("auth.resend")}</button>
        </form>
      )}
      <p className="text-center mt-4"><button type="button" className="btn ghost btn-sm" onClick={() => navigate(homeFor(user.activeRole) === "ADMIN_APP" ? "/" : homeFor(user.activeRole))}>{t("auth.later")}</button></p>
    </AuthLayout>
  );
}

/** 2FA tənzimləmə səhifəsi (§60.2 /2fa) — daxili rollar üçün məcburidir. */
export function TwoFactorPage() {
  const { t } = useI18n();
  const { user, refresh, loading } = useSession();
  const [code, setCode] = useState("");
  const [error, setError] = useState<unknown>(null);
  if (loading) return <Loading />;
  if (!user) return <LoginPage />;
  return (
    <AuthLayout title={t("auth.twoFactorSetupTitle")} subtitle={t("auth.twoFactorSetupText")}>
      <div className="kit-note mb-4"><Smartphone size={18} /> {user.twoFactorEnabled ? t("auth.twoFactorOn") : t("auth.twoFactorOff")}</div>
      <form onSubmit={async (e) => { e.preventDefault(); setError(null); try { await post("/account/security/2fa", { enabled: !user.twoFactorEnabled, code }); await refresh(); toast.success(t("common.saved")); setCode(""); } catch (err) { setError(err); } }}>
        <FormError error={error} />
        {!user.twoFactorEnabled && (<><OtpInput value={code} onChange={setCode} /><p className="kit-field-hint mt-2">{t("auth.demoCode")}</p></>)}
        <button className={cn("btn w-full mt-4", user.twoFactorEnabled ? "outline" : "primary")}>{user.twoFactorEnabled ? t("auth.disable2fa") : t("auth.enable2fa")}</button>
      </form>
    </AuthLayout>
  );
}

/* ------------------------------------------------------------------ */
/* Müraciət səhifələri üçün ortaq hissələr                              */
/* ------------------------------------------------------------------ */

function BenefitCard({ title, items }: { title: string; items: { icon: React.ComponentType<{ size?: number; "aria-hidden"?: boolean }>; text: string }[] }) {
  return (
    <div className="apply-benefits">
      <h2>{title}</h2>
      <ul>
        {items.map((it, i) => (
          <li key={i}><span><it.icon size={18} aria-hidden /></span>{it.text}</li>
        ))}
      </ul>
    </div>
  );
}

function ApplyDone({ title, text, steps, current = 0, children }: { title: string; text: string; steps: string[]; current?: number; children?: React.ReactNode }) {
  return (
    <div className="info-page">
      <div className="container apply-done">
        <div className="apply-done-card" role="status">
          <span className="apply-done-icon"><CheckCircle2 size={40} aria-hidden /></span>
          <h1>{title}</h1>
          <p>{text}</p>
          <ol className="apply-timeline">
            {steps.map((s, i) => (
              <li key={i} className={cn(i < current && "done", i === current && "now")}>
                <span>{i < current ? <CheckIcon size={13} aria-hidden /> : i + 1}</span>{s}
              </li>
            ))}
          </ol>
          <div className="apply-done-actions">{children}</div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Usta müraciəti (§9.4)                                                */
/* ------------------------------------------------------------------ */

export function BecomeTechnicianPage() {
  const { t, text, enumLabel, money } = useI18n();
  const specs = useApi<any[]>("/specializations");
  const zones = useApi<any[]>("/zones");
  const plans = useApi<any[]>("/plans?group=TECHNICIAN");
  const defs = useApi<any[]>("/entitlement-definitions");
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [docs, setDocs] = useState<PickedFile[]>([]);
  const form = useFormState({ firstName: "", lastName: "", phone: "", email: "", city: "Bakı", specializationIds: [] as string[], zoneIds: [] as string[], workDays: [1, 2, 3, 4, 5, 6], workFrom: "09:00", workTo: "19:00", planId: "", billingPeriod: "MONTH_1" });
  const v = form.values;
  const k = (key: string, vars?: Record<string, string | number>) => t(`techApply.${key}`, vars);
  const steps = [k("step1"), k("step2"), k("step3"), k("step4"), k("step5")];
  const toggle = (key: "specializationIds" | "zoneIds" | "workDays", value: any) => form.set(key, (v[key] as any[]).includes(value) ? (v[key] as any[]).filter((x) => x !== value) : [...(v[key] as any[]), value]);
  const specList = specs.data ?? [];
  const canNext = [v.firstName && v.lastName && v.phone && v.email, v.specializationIds.length > 0, v.zoneIds.length > 0 && v.workDays.length > 0, docs.length > 0, !!v.planId][step];
  const submit = async () => {
    setError(null);
    try {
      await post("/auth/technician-application", { ...v, documents: docs.map((d, i) => ({ kind: i === 0 ? "ID_CARD" : "CERTIFICATE", name: d.name })) });
      setDone(true);
    } catch (e) {
      setError(e);
      form.fromError(e);
      const errs = e instanceof ApiError ? Object.keys(e.fieldErrors) : [];
      if (errs.some((key) => ["firstName", "lastName", "phone", "email"].includes(key))) setStep(0);
    }
  };
  if (done) {
    return (
      <ApplyDone title={k("doneTitle")} text={k("doneText")} current={1} steps={["PENDING_VERIFICATION", "VERIFIED", "ACTIVE"].map((s) => enumLabel("TechnicianStatus", s))}>
        <Link to="/" className="btn primary">{t("b2bApply.backHome")}</Link>
        <Link to="/pricing?group=TECHNICIAN" className="btn outline">{t("nav.pricing")}</Link>
      </ApplyDone>
    );
  }
  return (
    <div className="info-page apply">
      <InfoHero
        eyebrow={k("eyebrow")}
        title={k("title")}
        text={k("text")}
        aside={<BenefitCard title={k("benefitsTitle")} items={[{ icon: BadgeCheck, text: k("benefit1") }, { icon: MapPin, text: k("benefit2") }, { icon: CalendarDays, text: k("benefit3") }, { icon: Receipt, text: k("benefit4") }]} />}
      >
        <p className="apply-note"><Info size={16} aria-hidden /> {k("staffNote")}</p>
      </InfoHero>

      <div className="container info-body">
        <div className="apply-layout">
          <div className="apply-form">
            <ol className="apply-stepper" aria-label={t("common.steps")}>
              {steps.map((s, i) => (
                <li key={s} className={cn(i === step && "active", i < step && "done")} aria-current={i === step ? "step" : undefined}>
                  <span className="apply-step-dot">{i < step ? <CheckIcon size={14} aria-hidden /> : i + 1}</span>
                  <span className="apply-step-label">{s}</span>
                </li>
              ))}
            </ol>
            <div className="apply-step-head">
              <small>{k("stepOf", { n: step + 1, total: steps.length })}</small>
              <h2>{steps[step]}</h2>
            </div>
            <FormError error={error} />
            {step === 0 && (
              <div className="apply-grid">
                <TextField label={t("fields.firstName")} required value={v.firstName} onValue={(x) => form.set("firstName", x)} error={form.errors.firstName} autoComplete="given-name" />
                <TextField label={t("fields.lastName")} required value={v.lastName} onValue={(x) => form.set("lastName", x)} error={form.errors.lastName} autoComplete="family-name" />
                <PhoneField label={t("auth.phone")} required value={v.phone} onValue={(x) => form.set("phone", x)} error={form.errors.phone} />
                <TextField label={t("email")} type="email" required value={v.email} onValue={(x) => form.set("email", x)} error={form.errors.email} autoComplete="email" />
                <SelectField label={t("fields.city")} value={v.city} onValue={(x) => form.set("city", x)} options={["Bakı", "Sumqayıt", "Gəncə"].map((c) => ({ value: c, label: c }))} />
              </div>
            )}
            {step === 1 && (
              <>
                <p className="apply-hint">{k("specHint")}</p>
                {specs.isLoading ? <Loading /> : (
                  <div className="apply-chips">
                    {specList.map((s: any) => <button key={s.id} type="button" className={cn("apply-chip", v.specializationIds.includes(s.id) && "active")} aria-pressed={v.specializationIds.includes(s.id)} onClick={() => toggle("specializationIds", s.id)}>{v.specializationIds.includes(s.id) && <CheckIcon size={14} aria-hidden />}{text(s.name)}</button>)}
                  </div>
                )}
                {form.errors.specializationIds && <p className="kit-field-error">{t("validation.selectAtLeastOne")}</p>}
              </>
            )}
            {step === 2 && (
              <>
                <h3 className="apply-sub">{k("zones")}</h3>
                <div className="apply-chips">
                  {(zones.data ?? []).map((z: any) => <button key={z.id} type="button" className={cn("apply-chip", v.zoneIds.includes(z.id) && "active")} aria-pressed={v.zoneIds.includes(z.id)} onClick={() => toggle("zoneIds", z.id)}>{v.zoneIds.includes(z.id) && <CheckIcon size={14} aria-hidden />}{text(z.name)}</button>)}
                </div>
                <h3 className="apply-sub">{k("hours")}</h3>
                <div className="apply-chips">
                  {[1, 2, 3, 4, 5, 6, 0].map((d) => <button key={d} type="button" className={cn("apply-chip", v.workDays.includes(d) && "active")} aria-pressed={v.workDays.includes(d)} onClick={() => toggle("workDays", d)}>{t(`days.${d}`)}</button>)}
                </div>
                <div className="apply-grid mt-3">
                  <TextField label={k("from")} type="time" value={v.workFrom} onValue={(x) => form.set("workFrom", x)} />
                  <TextField label={k("to")} type="time" value={v.workTo} onValue={(x) => form.set("workTo", x)} />
                </div>
              </>
            )}
            {step === 3 && (
              <>
                <p className="apply-hint">{k("docsHint")}</p>
                <FileDrop files={docs} onChange={setDocs} accept="image/*,application/pdf" capture />
                {form.errors.documents && <p className="kit-field-error">{t("validation.uploadDocuments")}</p>}
              </>
            )}
            {step === 4 && (
              <>
                <p className="apply-hint">{k("planHint")}</p>
                <Radios name="period" value={v.billingPeriod} onValue={(x) => form.set("billingPeriod", x)} columns={2} options={[{ value: "MONTH_1", label: enumLabel("BillingPeriod", "MONTH_1") }, { value: "MONTH_12", label: enumLabel("BillingPeriod", "MONTH_12") }]} />
                <div className="apply-plans">
                  {(plans.data ?? []).map((p) => {
                    const price = p.prices.find((x: any) => x.period === v.billingPeriod);
                    return (
                      <label key={p.id} className={cn("apply-plan", v.planId === p.id && "active", p.highlight && "is-featured")}>
                        <input type="radio" name="plan" checked={v.planId === p.id} onChange={() => form.set("planId", p.id)} className="sr-only" />
                        <span className="apply-plan-top"><strong>{text(p.name)}</strong>{p.highlight && <span className="apply-plan-flag">{t("plans.popular")}</span>}</span>
                        <small className="apply-plan-desc">{text(p.description)}</small>
                        <span className="apply-plan-price"><strong>{money(price?.price)}</strong> / {enumLabel("BillingPeriod", v.billingPeriod)}</span>
                        {p.trialDays ? <small className="apply-plan-trial">{t("plans.trial", { days: p.trialDays })}</small> : null}
                        <ul>
                          {(defs.data ?? []).filter((d) => d.group === "TECHNICIAN" && p.entitlements[d.code] !== undefined && p.entitlements[d.code] !== false && p.entitlements[d.code] !== 0).slice(0, 5).map((d) => <li key={d.code}><CheckIcon size={13} aria-hidden /> {text(d.label)}{typeof p.entitlements[d.code] !== "boolean" ? `: ${p.entitlements[d.code] === "UNLIMITED" ? t("plans.unlimited") : p.entitlements[d.code]}` : ""}</li>)}
                        </ul>
                      </label>
                    );
                  })}
                </div>
                <p className="apply-hint mt-3">{k("noCommission")}</p>
              </>
            )}
            <div className="apply-nav">
              <button type="button" className="btn outline" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>{t("common.back")}</button>
              {step < steps.length - 1 ? (
                <button type="button" className="btn primary" disabled={!canNext} onClick={() => setStep((s) => s + 1)}>{t("continue")}</button>
              ) : (
                <button type="button" className="btn primary" disabled={!canNext} onClick={submit}><Send size={16} aria-hidden /> {k("submit")}</button>
              )}
            </div>
          </div>

          <aside className="apply-aside">
            <section className="info-section compact">
              <h2>{k("reqTitle")}</h2>
              <ul className="apply-req">
                <li><IdCard size={18} aria-hidden /> {k("req1")}</li>
                <li><Award size={18} aria-hidden /> {k("req2")}</li>
                <li><BadgeCheck size={18} aria-hidden /> {k("req3")}</li>
              </ul>
            </section>
            <section className="info-section compact">
              <h2>{t("nav.pricing")}</h2>
              <p className="apply-hint">{k("noCommission")}</p>
              <Link to="/pricing?group=TECHNICIAN" className="btn outline w-full">{t("nav.pricing")}</Link>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* B2B müraciəti (§9.5)                                                 */
/* ------------------------------------------------------------------ */

const SEGMENT_ICONS: Record<string, React.ComponentType<{ size?: number; "aria-hidden"?: boolean }>> = { CORPORATE: Building, PARTNER: Handshake, WHOLESALE: Boxes };

export function BusinessPage() {
  const { t, enumLabel } = useI18n();
  const brand = useApi<any>("/branding", { staleTime: 300_000 });
  const form = useFormState({ companyName: "", voen: "", legalAddress: "", contactName: "", contactPhone: "", contactEmail: "", segment: "CORPORATE", note: "" });
  const [docs, setDocs] = useState<PickedFile[]>([]);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const v = form.values;
  const k = (key: string) => t(`b2bApply.${key}`);
  const phone = brand.data?.contacts?.phone as string | undefined;
  const how = [k("how1"), k("how2"), k("how3"), k("how4")];
  if (done) {
    return (
      <ApplyDone title={k("doneTitle")} text={k("doneText")} steps={how} current={1}>
        <Link to="/" className="btn primary">{k("backHome")}</Link>
        <Link to="/shop" className="btn outline">{t("nav.shop")}</Link>
      </ApplyDone>
    );
  }
  return (
    <div className="info-page apply">
      <InfoHero
        eyebrow={k("eyebrow")}
        title={k("title")}
        text={k("text")}
        aside={<BenefitCard title={k("benefitsTitle")} items={[{ icon: ShieldCheck, text: k("benefit1") }, { icon: Receipt, text: k("benefit2") }, { icon: CalendarDays, text: k("benefit3") }, { icon: FileText, text: k("benefit4") }]} />}
      />
      <div className="container info-body">
        <div className="apply-layout">
          <form className="apply-form" noValidate onSubmit={async (e) => { e.preventDefault(); setError(null); try { await post("/auth/b2b-application", { ...v, documents: docs.map((d) => ({ kind: "OTHER", name: d.name })) }); setDone(true); } catch (err) { setError(err); form.fromError(err); } }}>
            <FormError error={error} />
            <section className="apply-sec">
              <h2><span className="apply-num">1</span> {k("segmentTitle")}</h2>
              <div className="apply-segments" role="radiogroup" aria-label={k("segmentTitle")}>
                {["CORPORATE", "PARTNER", "WHOLESALE"].map((s) => {
                  const Icon = SEGMENT_ICONS[s] ?? Building;
                  return (
                    <button key={s} type="button" role="radio" aria-checked={v.segment === s} className={cn("apply-seg", v.segment === s && "active")} onClick={() => form.set("segment", s)}>
                      <span className="apply-seg-icon"><Icon size={22} aria-hidden /></span>
                      <strong>{enumLabel("Segment", s)}</strong>
                      <small>{k(`segment_${s}`)}</small>
                      <span className="apply-seg-check" aria-hidden><CheckIcon size={13} /></span>
                    </button>
                  );
                })}
              </div>
            </section>
            <section className="apply-sec">
              <h2><span className="apply-num">2</span> {k("companySection")}</h2>
              <div className="apply-grid">
                <TextField label={k("companyName")} required value={v.companyName} onValue={(x) => form.set("companyName", x)} error={form.errors.companyName} autoComplete="organization" />
                <TextField label={t("docs.voen")} required inputMode="numeric" maxLength={10} value={v.voen} onValue={(x) => form.set("voen", x.replace(/\D/g, ""))} error={form.errors.voen} hint={k("voenHint")} />
                <TextField label={k("legalAddress")} required className="span-2" value={v.legalAddress} onValue={(x) => form.set("legalAddress", x)} error={form.errors.legalAddress} />
              </div>
            </section>
            <section className="apply-sec">
              <h2><span className="apply-num">3</span> {k("contactSection")}</h2>
              <div className="apply-grid">
                <TextField label={k("contactName")} required value={v.contactName} onValue={(x) => form.set("contactName", x)} error={form.errors.contactName} autoComplete="name" />
                <PhoneField label={t("auth.phone")} required value={v.contactPhone} onValue={(x) => form.set("contactPhone", x)} error={form.errors.contactPhone} />
                <TextField label={t("email")} type="email" required value={v.contactEmail} onValue={(x) => form.set("contactEmail", x)} error={form.errors.contactEmail} autoComplete="email" />
              </div>
            </section>
            <section className="apply-sec">
              <h2><span className="apply-num">4</span> {k("documents")}</h2>
              <FileDrop files={docs} onChange={setDocs} />
              <p className="apply-hint mt-3">{k("processNote")}</p>
            </section>
            <div className="apply-nav">
              <p className="apply-hint">{k("agree")} <Link to="/terms" className="text-brand">{t("legal.terms")}</Link></p>
              <button className="btn primary btn-lg"><Send size={17} aria-hidden /> {k("submit")}</button>
            </div>
          </form>

          <aside className="apply-aside">
            <section className="info-section compact">
              <h2>{k("howTitle")}</h2>
              <ol className="apply-how">
                {how.map((s, i) => <li key={i}><span>{i + 1}</span>{s}</li>)}
              </ol>
            </section>
            <section className="info-section compact">
              <h2>{k("helpTitle")}</h2>
              <p className="apply-hint">{k("helpText")}</p>
              {phone && <a className="btn outline w-full" href={`tel:${phone.replace(/[^\d+*]/g, "")}`}><Phone size={16} aria-hidden /> {phone}</a>}
              <Link to="/contact" className="btn ghost w-full mt-2">{t("contact")}</Link>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}

export const authErrorText = errorText;
