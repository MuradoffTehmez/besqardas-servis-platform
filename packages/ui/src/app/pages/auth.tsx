"use client";
import React, { useState } from "react";
import { CheckCircle2, KeyRound, Mail, Phone, ShieldCheck, Smartphone, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@sp/utils";
import { ApiError, post, useApi, useQueryClient } from "@sp/api-client";
import { useI18n } from "../core/i18n";
import { Link, useRouter } from "../core/router";
import { useSession } from "../core/session";
import { adminUrl, homeFor, webUrl } from "../core/shells";
import { Check, FormError, Loading, Radios, SelectField, TextField, errorText, useFormState } from "../kit/base";
import { FileDrop, OtpInput, PhoneField, type PickedFile } from "../kit/media";

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
/* Usta müraciəti (§9.4)                                                */
/* ------------------------------------------------------------------ */

export function BecomeTechnicianPage() {
  const { t, text, enumLabel, money } = useI18n();
  const { navigate } = useRouter();
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
  const steps = [t("techApply.step1"), t("techApply.step2"), t("techApply.step3"), t("techApply.step4"), t("techApply.step5")];
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
      if (errs.some((k) => ["firstName", "lastName", "phone", "email"].includes(k))) setStep(0);
    }
  };
  if (done) {
    return (
      <div className="container py-12 max-w-xl mx-auto text-center">
        <CheckCircle2 size={56} className="text-success mx-auto" />
        <h1>{t("techApply.doneTitle")}</h1>
        <p>{t("techApply.doneText")}</p>
        <div className="kit-steps-status mt-4">
          <span className="badge badge-warning">{enumLabel("TechnicianStatus", "PENDING_VERIFICATION")}</span> → <span className="badge">{enumLabel("TechnicianStatus", "VERIFIED")}</span> → <span className="badge">{enumLabel("TechnicianStatus", "ACTIVE")}</span>
        </div>
        <button type="button" className="btn primary mt-6" onClick={() => navigate("/")}>{t("system.home")}</button>
      </div>
    );
  }
  return (
    <div className="container py-8">
      <header className="pub-hero-small">
        <span className="eyebrow">{t("techApply.eyebrow")}</span>
        <h1>{t("techApply.title")}</h1>
        <p>{t("techApply.text")}</p>
        <p className="text-sm text-muted">{t("techApply.staffNote")}</p>
      </header>
      <ol className="wizard-stepper kit-stepper" aria-label={t("common.steps")}>
        {steps.map((s, i) => <li key={s} className={cn("wizard-step-pill", i === step && "active", i < step && "done")} aria-current={i === step ? "step" : undefined}>{i + 1}. {s}</li>)}
      </ol>
      <div className="kit-card mt-4 max-w-4xl mx-auto">
        <div className="kit-card-body">
          <FormError error={error} />
          {step === 0 && (
            <div className="kit-grid cols-2">
              <TextField label={t("fields.firstName")} required value={v.firstName} onValue={(x) => form.set("firstName", x)} error={form.errors.firstName} />
              <TextField label={t("fields.lastName")} required value={v.lastName} onValue={(x) => form.set("lastName", x)} error={form.errors.lastName} />
              <PhoneField label={t("auth.phone")} required value={v.phone} onValue={(x) => form.set("phone", x)} error={form.errors.phone} />
              <TextField label={t("email")} type="email" required value={v.email} onValue={(x) => form.set("email", x)} error={form.errors.email} />
              <SelectField label={t("fields.city")} value={v.city} onValue={(x) => form.set("city", x)} options={["Bakı", "Sumqayıt", "Gəncə"].map((c) => ({ value: c, label: c }))} />
            </div>
          )}
          {step === 1 && (
            <>
              <p className="text-muted mb-3">{t("techApply.specHint")}</p>
              {specs.isLoading ? <Loading /> : (
                <div className="kit-chip-grid">
                  {specList.map((s: any) => <button key={s.id} type="button" className={cn("chip", v.specializationIds.includes(s.id) && "active")} aria-pressed={v.specializationIds.includes(s.id)} onClick={() => toggle("specializationIds", s.id)}>{text(s.name)}</button>)}
                </div>
              )}
              {form.errors.specializationIds && <p className="kit-field-error">{t("validation.selectAtLeastOne")}</p>}
            </>
          )}
          {step === 2 && (
            <>
              <h3>{t("techApply.zones")}</h3>
              <div className="kit-chip-grid mb-4">
                {(zones.data ?? []).map((z: any) => <button key={z.id} type="button" className={cn("chip", v.zoneIds.includes(z.id) && "active")} aria-pressed={v.zoneIds.includes(z.id)} onClick={() => toggle("zoneIds", z.id)}>{text(z.name)}</button>)}
              </div>
              <h3>{t("techApply.hours")}</h3>
              <div className="kit-chip-grid mb-3">
                {[1, 2, 3, 4, 5, 6, 0].map((d) => <button key={d} type="button" className={cn("chip", v.workDays.includes(d) && "active")} aria-pressed={v.workDays.includes(d)} onClick={() => toggle("workDays", d)}>{t(`days.${d}`)}</button>)}
              </div>
              <div className="kit-grid cols-2">
                <TextField label={t("techApply.from")} type="time" value={v.workFrom} onValue={(x) => form.set("workFrom", x)} />
                <TextField label={t("techApply.to")} type="time" value={v.workTo} onValue={(x) => form.set("workTo", x)} />
              </div>
            </>
          )}
          {step === 3 && (
            <>
              <p className="text-muted mb-3">{t("techApply.docsHint")}</p>
              <FileDrop files={docs} onChange={setDocs} accept="image/*,application/pdf" capture />
              {form.errors.documents && <p className="kit-field-error">{t("validation.uploadDocuments")}</p>}
            </>
          )}
          {step === 4 && (
            <>
              <p className="text-muted mb-3">{t("techApply.planHint")}</p>
              <Radios name="period" value={v.billingPeriod} onValue={(x) => form.set("billingPeriod", x)} columns={2} options={[{ value: "MONTH_1", label: enumLabel("BillingPeriod", "MONTH_1") }, { value: "MONTH_12", label: enumLabel("BillingPeriod", "MONTH_12") }]} />
              <div className="kit-plan-cards mt-4">
                {(plans.data ?? []).map((p) => {
                  const price = p.prices.find((x: any) => x.period === v.billingPeriod);
                  return (
                    <label key={p.id} className={cn("kit-plan selectable", v.planId === p.id && "current")}>
                      <input type="radio" name="plan" checked={v.planId === p.id} onChange={() => form.set("planId", p.id)} className="sr-only" />
                      <h3>{text(p.name)}</h3>
                      <p className="text-sm">{text(p.description)}</p>
                      <div className="kit-plan-price"><strong>{money(price?.price)}</strong><span>/ {enumLabel("BillingPeriod", v.billingPeriod)}</span></div>
                      {p.trialDays ? <small className="text-success">{t("plans.trial", { days: p.trialDays })}</small> : null}
                      <ul className="kit-plan-mini">
                        {(defs.data ?? []).filter((d) => d.group === "TECHNICIAN" && p.entitlements[d.code] !== undefined && p.entitlements[d.code] !== false && p.entitlements[d.code] !== 0).slice(0, 7).map((d) => <li key={d.code}>{text(d.label)}{typeof p.entitlements[d.code] !== "boolean" ? `: ${p.entitlements[d.code] === "UNLIMITED" ? t("plans.unlimited") : p.entitlements[d.code]}` : ""}</li>)}
                      </ul>
                    </label>
                  );
                })}
              </div>
              <p className="text-sm text-muted mt-3">{t("techApply.noCommission")}</p>
            </>
          )}
        </div>
        <div className="wizard-footer kit-card-foot">
          <button type="button" className="btn outline" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>{t("common.back")}</button>
          {step < steps.length - 1 ? (
            <button type="button" className="btn primary" disabled={!canNext} onClick={() => setStep((s) => s + 1)}>{t("continue")}</button>
          ) : (
            <button type="button" className="btn primary" disabled={!canNext} onClick={submit}>{t("techApply.submit")}</button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* B2B müraciəti (§9.5)                                                 */
/* ------------------------------------------------------------------ */

export function BusinessPage() {
  const { t, enumLabel } = useI18n();
  const form = useFormState({ companyName: "", voen: "", legalAddress: "", contactName: "", contactPhone: "", contactEmail: "", segment: "CORPORATE", note: "" });
  const [docs, setDocs] = useState<PickedFile[]>([]);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const v = form.values;
  if (done) return (
    <div className="container py-12 max-w-xl mx-auto text-center">
      <CheckCircle2 size={56} className="text-success mx-auto" />
      <h1>{t("b2bApply.doneTitle")}</h1>
      <p>{t("b2bApply.doneText")}</p>
    </div>
  );
  return (
    <div className="container py-8">
      <header className="pub-hero-small">
        <span className="eyebrow">B2B</span>
        <h1>{t("b2bApply.title")}</h1>
        <p>{t("b2bApply.text")}</p>
      </header>
      <div className="kit-grid cols-3 mb-6">
        {["CORPORATE", "PARTNER", "WHOLESALE"].map((s) => (
          <button key={s} type="button" className={cn("choice-card", v.segment === s && "active")} onClick={() => form.set("segment", s)} aria-pressed={v.segment === s}>
            <strong>{enumLabel("Segment", s)}</strong>
            <small className="text-muted">{t(`b2bApply.segment_${s}`)}</small>
          </button>
        ))}
      </div>
      <form className="kit-card max-w-4xl mx-auto" onSubmit={async (e) => { e.preventDefault(); setError(null); try { await post("/auth/b2b-application", { ...v, documents: docs.map((d) => ({ kind: "OTHER", name: d.name })) }); setDone(true); } catch (err) { setError(err); form.fromError(err); } }}>
        <div className="kit-card-body">
          <FormError error={error} />
          <div className="kit-grid cols-2">
            <TextField label={t("b2bApply.companyName")} required value={v.companyName} onValue={(x) => form.set("companyName", x)} error={form.errors.companyName} />
            <TextField label={t("docs.voen")} required inputMode="numeric" maxLength={10} value={v.voen} onValue={(x) => form.set("voen", x.replace(/\D/g, ""))} error={form.errors.voen} hint={t("b2bApply.voenHint")} />
            <TextField label={t("b2bApply.legalAddress")} required className="span-2" value={v.legalAddress} onValue={(x) => form.set("legalAddress", x)} error={form.errors.legalAddress} />
            <TextField label={t("b2bApply.contactName")} required value={v.contactName} onValue={(x) => form.set("contactName", x)} error={form.errors.contactName} />
            <PhoneField label={t("auth.phone")} required value={v.contactPhone} onValue={(x) => form.set("contactPhone", x)} error={form.errors.contactPhone} />
            <TextField label={t("email")} type="email" required value={v.contactEmail} onValue={(x) => form.set("contactEmail", x)} error={form.errors.contactEmail} />
          </div>
          <h3 className="mt-4">{t("b2bApply.documents")}</h3>
          <FileDrop files={docs} onChange={setDocs} />
          <p className="text-sm text-muted mt-3">{t("b2bApply.processNote")}</p>
        </div>
        <div className="kit-card-foot"><button className="btn primary">{t("b2bApply.submit")}</button></div>
      </form>
    </div>
  );
}

export const authErrorText = errorText;
