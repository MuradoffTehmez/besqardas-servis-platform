"use client";
import React, { useState } from "react";
import { UserRound, Lock, Phone, ArrowRight, ShieldCheck, CheckCircle2 } from "lucide-react";

export interface LoginViewProps {
  isAdmin?: boolean;
  locale?: "az" | "ru" | "en";
  onSubmitLogin: (credentials: { email?: string; phone?: string; password?: string; otp?: string }) => Promise<any>;
  onLoginSuccess: (session: any) => void;
}

export function LoginView({
  isAdmin = false,
  locale = "az",
  onSubmitLogin,
  onLoginSuccess,
}: LoginViewProps) {
  const [method, setMethod] = useState<"EMAIL" | "PHONE">("EMAIL");
  const [email, setEmail] = useState(isAdmin ? "admin@demo.az" : "aysel@demo.az");
  const [phone, setPhone] = useState("+994501234567");
  const [password, setPassword] = useState("Demo1234!");
  const [requires2FA, setRequires2FA] = useState(false);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await onSubmitLogin({
        email: method === "EMAIL" ? email : undefined,
        phone: method === "PHONE" ? phone : undefined,
        password,
        otp: requires2FA ? otp : undefined,
      });

      if (res?.requires2FA) {
        setRequires2FA(true);
        setLoading(false);
        return;
      }

      setLoading(false);
      onLoginSuccess(res);
    } catch (err: any) {
      setLoading(false);
      setError(err.message || "Giriş uğursuz oldu. Məlumatları yoxlayın.");
    }
  };

  const setDemoCredentials = (type: "ADMIN" | "CUSTOMER" | "TECH") => {
    setRequires2FA(false);
    setError("");
    if (type === "ADMIN") {
      setEmail("admin@demo.az");
      setPassword("Demo1234!");
    } else if (type === "CUSTOMER") {
      setEmail("aysel@demo.az");
      setPassword("Demo1234!");
    } else {
      setEmail("elvin@demo.az");
      setPassword("Demo1234!");
    }
  };

  return (
    <div className="login-grid container py-12">
      {/* Left visual story */}
      <div className="login-story hidden lg:block">
        <span className="eyebrow">Təhlükəsiz Giriş</span>
        <h1>
          Evinizin Texniki Rahatlığı <br />
          və Rəsmi Servis Nəzarəti
        </h1>
        <div className="product-art my-6" aria-hidden="true">
          <div className="appliance">
            <span className="appliance-brand">BESQARDAS</span>
            <span className="appliance-light" />
            <div className="vents" />
            <span className="appliance-display">24°</span>
          </div>
          <div className="air-line" />
          <div className="air-line second" />
        </div>
        <div className="login-assurance flex items-center gap-2 text-sm text-muted">
          <ShieldCheck size={20} className="text-brand" />
          <span>Fərdi məlumatların qorunması və SSL təhlükəsizlik təminatı (§70)</span>
        </div>
      </div>

      {/* Right Login Form */}
      <form className="login-form panel p-8 max-w-md mx-auto w-full" onSubmit={handleSubmit}>
        <div className="icon-box mb-4">
          <UserRound size={26} />
        </div>

        <h2 className="text-2xl font-bold">
          {isAdmin ? "Admin CRM Girişi" : "Platformaya Giriş"}
        </h2>
        <p className="text-muted text-sm mb-6">
          Servis sifarişlərinizə və cihaz sənədlərinizə daxil olun.
        </p>

        {error && (
          <div className="alert alert-danger mb-4" role="alert">
            {error}
          </div>
        )}

        {requires2FA ? (
          <div className="form-group mb-4">
            <label htmlFor="login-otp" className="form-label">İki Faktorlu Doğrulama (2FA Kodu)</label>
            <input
              type="text" id="login-otp" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}"
              required
              maxLength={6}
              className="form-input text-center text-lg tracking-widest font-mono"
              placeholder="123456"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
            />
            <small className="text-muted block mt-1">
              Demo mühitində 2FA kodu: <strong>123456</strong>
            </small>
          </div>
        ) : (
          <>
            <div className="form-group mb-4">
              <label htmlFor="login-email" className="form-label">E-poçt Ünvanı</label>
              <input
                type="email" id="login-email" autoComplete="username"
                required
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="form-group mb-6">
              <label htmlFor="login-password" className="form-label">Şifrə</label>
              <input
                type="password" id="login-password" autoComplete="current-password"
                required
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </>
        )}

        <button className="btn btn-lg primary w-full mb-6" disabled={loading}>
          {loading ? "Giriş edilir..." : "Daxil Ol"} <ArrowRight size={18} />
        </button>

        {/* Demo Fast Switcher */}
        <div className="demo-account panel bg-soft p-4 border rounded">
          <strong className="text-xs text-brand block mb-2 font-bold uppercase tracking-wider">
            Sürətli Demo Girişləri
          </strong>
          <div className="demo-buttons flex gap-2">
            <button
              type="button"
              className="btn btn-sm outline text-xs flex-1"
              onClick={() => setDemoCredentials("CUSTOMER")}
            >
              Müştəri
            </button>
            <button
              type="button"
              className="btn btn-sm outline text-xs flex-1"
              onClick={() => setDemoCredentials("ADMIN")}
            >
              Admin CRM
            </button>
            <button
              type="button"
              className="btn btn-sm outline text-xs flex-1"
              onClick={() => setDemoCredentials("TECH")}
            >
              Usta
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
