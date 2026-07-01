"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import gsap from "gsap";
import { ROLE_REDIRECT, Role } from "@/models/roles";

type AuthMode = "signin" | "signup" | "reset";
type AuthStep = "form" | "otp" | "success";

const MIN_PASSWORD = 8;

export default function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Only honour same-origin relative paths — never an absolute/protocol-relative
  // URL — so a crafted ?from= can't turn login into an open redirect.
  const fromParam = searchParams.get("from");
  const safeFrom =
    fromParam && fromParam.startsWith("/") && !fromParam.startsWith("//")
      ? fromParam
      : null;

  const [mode, setMode] = useState<AuthMode>("signin");
  const [step, setStep] = useState<AuthStep>("form");

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [otp, setOtp] = useState("");

  const [errorMsg, setErrorMsg] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);

  // Entrance animation
  useEffect(() => {
    if (containerRef.current) {
      gsap.fromTo(
        containerRef.current,
        { opacity: 0, y: 24 },
        { opacity: 1, y: 0, duration: 0.9, ease: "power3.out", delay: 0.1 }
      );
    }
  }, []);

  // Fade the active view in whenever the mode or step changes
  useEffect(() => {
    if (viewRef.current) {
      gsap.fromTo(
        viewRef.current,
        { opacity: 0, y: 14 },
        { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" }
      );
    }
  }, [mode, step]);

  // Resend countdown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [resendCooldown]);

  const sendOtp = async (purpose: "signup" | "reset") => {
    const res = await fetch("/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name, purpose }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.message ?? data.error ?? "Failed to send code.");
      (err as Error & { code?: string }).code = data.error;
      throw err;
    }
  };

  const finishSignIn = (role: Role) => {
    setStep("success");
    const destination = safeFrom ?? ROLE_REDIRECT[role];
    setTimeout(() => {
      router.push(destination);
      router.refresh();
    }, 700);
  };

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setStep("form");
    setPassword("");
    setConfirm("");
    setOtp("");
    setErrorMsg("");
  };

  // ── Sign in with password ─────────────────────────────────────────────────
  const handleLogin = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!email || !password) return;
    setErrorMsg("");
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? "Incorrect email or password.");
        return;
      }
      finishSignIn(data.role);
    } catch {
      setErrorMsg("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Create account: collect details, then send verification OTP ───────────
  const handleSignUp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!email || !name || !password) return;
    if (password.length < MIN_PASSWORD) {
      setErrorMsg(`Password must be at least ${MIN_PASSWORD} characters.`);
      return;
    }
    if (password !== confirm) {
      setErrorMsg("Passwords do not match.");
      return;
    }
    setErrorMsg("");
    setIsLoading(true);
    try {
      await sendOtp("signup");
      setOtp("");
      setResendCooldown(60);
      setStep("otp");
    } catch (err) {
      // Email already has an account → send them to sign in (email stays prefilled).
      if ((err as Error & { code?: string }).code === "EMAIL_TAKEN") {
        switchMode("signin");
        setErrorMsg("This email is already registered — please sign in.");
        return;
      }
      setErrorMsg(err instanceof Error ? err.message : "Failed to send code.");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Request a password reset code ─────────────────────────────────────────
  const handleRequestReset = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!email) return;
    setErrorMsg("");
    setIsLoading(true);
    try {
      await sendOtp("reset");
      setOtp("");
      setPassword("");
      setConfirm("");
      setResendCooldown(60);
      setStep("otp");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to send code.");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Verify OTP (+ set password). Covers signup and reset. ─────────────────
  const handleVerifyOtp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (otp.length < 6) return;
    if (mode === "reset") {
      if (password.length < MIN_PASSWORD) {
        setErrorMsg(`Password must be at least ${MIN_PASSWORD} characters.`);
        return;
      }
      if (password !== confirm) {
        setErrorMsg("Passwords do not match.");
        return;
      }
    }
    setErrorMsg("");
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, password, name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? "Incorrect code.");
        return;
      }
      finishSignIn(data.role);
    } catch {
      setErrorMsg("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || mode === "signin") return;
    setErrorMsg("");
    setResendCooldown(60);
    try {
      await sendOtp(mode);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to resend.");
    }
  };

  const isSuccess = step === "success";
  const onOtp = step === "otp";
  const successMessage =
    mode === "signup"
      ? "Account created"
      : mode === "reset"
      ? "Password updated"
      : "Signed in";

  // ── Shared styles ─────────────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    fontSize: "15px",
    color: "#111111",
    borderBottom: "1.5px solid #8B1A1A",
    borderRadius: 0,
  };
  const inputClass =
    "w-full bg-transparent outline-none font-sans pb-3 mb-8 placeholder:text-[#111111]/25 disabled:opacity-50";
  const labelClass = "font-sans font-bold uppercase tracking-[0.2em] block mb-3";
  const labelStyle: React.CSSProperties = {
    fontSize: "9px",
    color: "rgba(17,17,17,0.45)",
  };
  const primaryBtnClass =
    "w-full py-4 font-sans font-bold uppercase tracking-[0.25em] transition-opacity hover:opacity-80 disabled:opacity-40";
  const linkClass =
    "font-sans text-[10px] uppercase tracking-widest hover:opacity-60 transition-opacity";

  const headline =
    mode === "signup" ? "Create" : mode === "reset" ? "Reset" : "Enter the";
  const headlineAccent =
    mode === "signup" ? "Account" : mode === "reset" ? "Access" : "Atelier";

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center px-6"
      style={{ backgroundColor: "#F4F0E6" }}
    >
      {/* Brand wordmark */}
      <Link
        href="/"
        className="absolute top-8 left-10 font-serif uppercase font-semibold hover:opacity-60 transition-opacity"
        style={{ fontSize: "1.15rem", letterSpacing: "0.18em", color: "#8B1A1A" }}
      >
        Naami
      </Link>

      <div ref={containerRef} className="w-full max-w-sm" style={{ opacity: 0 }}>
        <p
          className="font-sans font-bold uppercase tracking-[0.3em] mb-4"
          style={{ fontSize: "9px", color: "#8B1A1A" }}
        >
          NAAMI // ATELIER ACCESS
        </p>

        <h1
          className="font-serif font-light uppercase mb-8"
          style={{
            fontSize: "clamp(2rem, 5vw, 2.8rem)",
            color: "#111111",
            lineHeight: 1.1,
            letterSpacing: "0.03em",
          }}
        >
          {headline}
          <br />
          <span style={{ color: "#8B1A1A", fontStyle: "italic" }}>{headlineAccent}</span>
        </h1>

        {/* Sign in / Create account tabs (only on the entry form) */}
        {step === "form" && mode !== "reset" && (
          <div className="flex gap-6 mb-9">
            {(["signin", "signup"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                className="font-sans font-bold uppercase tracking-[0.2em] pb-2 transition-colors"
                style={{
                  fontSize: "10px",
                  color: mode === m ? "#8B1A1A" : "rgba(17,17,17,0.35)",
                  borderBottom: mode === m ? "2px solid #8B1A1A" : "2px solid transparent",
                }}
              >
                {m === "signin" ? "Sign In" : "Create Account"}
              </button>
            ))}
          </div>
        )}

        <div ref={viewRef}>
          {/* ── Sign In form ── */}
          {step === "form" && mode === "signin" && (
            <form onSubmit={handleLogin} noValidate>
              <label htmlFor="email" className={labelClass} style={labelStyle}>
                Email Address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                placeholder="your@email.com"
                className={inputClass}
                style={inputStyle}
              />
              <label htmlFor="password" className={labelClass} style={labelStyle}>
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                placeholder="••••••••"
                className={inputClass}
                style={inputStyle}
              />
              {errorMsg && (
                <p className="font-sans text-[11px] mb-5" style={{ color: "#8B1A1A" }}>
                  {errorMsg}
                </p>
              )}
              <button
                type="submit"
                disabled={isLoading || !email || !password}
                className={`${primaryBtnClass} mb-5`}
                style={{
                  fontSize: "10px",
                  backgroundColor: "#8B1A1A",
                  color: "#F4F0E6",
                  cursor: isLoading ? "wait" : "pointer",
                }}
              >
                {isLoading ? "Signing In…" : "Sign In"}
              </button>
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => switchMode("signup")}
                  className={linkClass}
                  style={{ color: "rgba(17,17,17,0.4)" }}
                >
                  Create account
                </button>
                <button
                  type="button"
                  onClick={() => switchMode("reset")}
                  className="font-sans font-bold text-[10px] uppercase tracking-widest transition-opacity hover:opacity-70"
                  style={{ color: "#8B1A1A" }}
                >
                  Forgot password?
                </button>
              </div>
            </form>
          )}

          {/* ── Create Account form ── */}
          {step === "form" && mode === "signup" && (
            <form onSubmit={handleSignUp} noValidate>
              <label htmlFor="signup-email" className={labelClass} style={labelStyle}>
                Email Address
              </label>
              <input
                id="signup-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                placeholder="your@email.com"
                className={inputClass}
                style={inputStyle}
              />
              <label htmlFor="name" className={labelClass} style={labelStyle}>
                Full Name
              </label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
                placeholder="First Last"
                className={inputClass}
                style={inputStyle}
              />
              <label htmlFor="new-password" className={labelClass} style={labelStyle}>
                Password
              </label>
              <input
                id="new-password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                placeholder="At least 8 characters"
                className={inputClass}
                style={inputStyle}
              />
              <label htmlFor="confirm-password" className={labelClass} style={labelStyle}>
                Confirm Password
              </label>
              <input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                disabled={isLoading}
                placeholder="Re-enter password"
                className={inputClass}
                style={inputStyle}
              />
              {errorMsg && (
                <p className="font-sans text-[11px] mb-5" style={{ color: "#8B1A1A" }}>
                  {errorMsg}
                </p>
              )}
              <button
                type="submit"
                disabled={isLoading || !email || !name || !password || !confirm}
                className={`${primaryBtnClass} mb-5`}
                style={{
                  fontSize: "10px",
                  backgroundColor: "#8B1A1A",
                  color: "#F4F0E6",
                  cursor: isLoading ? "wait" : "pointer",
                }}
              >
                {isLoading ? "Sending Code…" : "Create Account"}
              </button>
              <button
                type="button"
                onClick={() => switchMode("signin")}
                className={linkClass}
                style={{ color: "rgba(17,17,17,0.4)" }}
              >
                ← Already have an account? Sign in
              </button>
            </form>
          )}

          {/* ── Reset request form ── */}
          {step === "form" && mode === "reset" && (
            <form onSubmit={handleRequestReset} noValidate>
              <p
                className="font-sans text-[12px] mb-6 leading-relaxed"
                style={{ color: "rgba(17,17,17,0.6)" }}
              >
                Enter your email and we&rsquo;ll send a code to reset your password.
              </p>
              <label htmlFor="reset-email" className={labelClass} style={labelStyle}>
                Email Address
              </label>
              <input
                id="reset-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                placeholder="your@email.com"
                className={inputClass}
                style={inputStyle}
              />
              {errorMsg && (
                <p className="font-sans text-[11px] mb-5" style={{ color: "#8B1A1A" }}>
                  {errorMsg}
                </p>
              )}
              <button
                type="submit"
                disabled={isLoading || !email}
                className={`${primaryBtnClass} mb-5`}
                style={{
                  fontSize: "10px",
                  backgroundColor: "#8B1A1A",
                  color: "#F4F0E6",
                  cursor: isLoading ? "wait" : "pointer",
                }}
              >
                {isLoading ? "Sending Code…" : "Send Reset Code"}
              </button>
              <button
                type="button"
                onClick={() => switchMode("signin")}
                className={linkClass}
                style={{ color: "rgba(17,17,17,0.4)" }}
              >
                ← Back to sign in
              </button>
            </form>
          )}

          {/* ── OTP step (signup verify OR password reset) ── */}
          {onOtp && (
            <form onSubmit={handleVerifyOtp} noValidate>
              <p
                className="font-sans text-[12px] mb-6 leading-relaxed"
                style={{ color: "rgba(17,17,17,0.6)" }}
              >
                {mode === "reset" ? (
                  <>
                    If an account exists for{" "}
                    <span style={{ color: "#111111", fontWeight: 600 }}>{email}</span>, we&rsquo;ve
                    sent a reset code. Enter it and choose a new password.
                  </>
                ) : (
                  <>
                    We sent a 6-digit verification code to{" "}
                    <span style={{ color: "#111111", fontWeight: 600 }}>{email}</span>.
                  </>
                )}
              </p>

              <label htmlFor="otp" className={labelClass} style={labelStyle}>
                6-Digit Code
              </label>
              <input
                id="otp"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                autoComplete="one-time-code"
                autoFocus
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                disabled={isLoading || isSuccess}
                placeholder="000000"
                className={`${inputClass} tracking-[0.4em]`}
                style={{ ...inputStyle, fontSize: "22px" }}
              />

              {mode === "reset" && (
                <>
                  <label htmlFor="reset-password" className={labelClass} style={labelStyle}>
                    New Password
                  </label>
                  <input
                    id="reset-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading || isSuccess}
                    placeholder="At least 8 characters"
                    className={inputClass}
                    style={inputStyle}
                  />
                  <label htmlFor="reset-confirm" className={labelClass} style={labelStyle}>
                    Confirm New Password
                  </label>
                  <input
                    id="reset-confirm"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    disabled={isLoading || isSuccess}
                    placeholder="Re-enter password"
                    className={inputClass}
                    style={inputStyle}
                  />
                </>
              )}

              {errorMsg && (
                <p className="font-sans text-[11px] mb-5" style={{ color: "#8B1A1A" }}>
                  {errorMsg}
                </p>
              )}

              <button
                type="submit"
                disabled={isLoading || isSuccess || otp.length < 6}
                className={`${primaryBtnClass} mb-5`}
                style={{
                  fontSize: "10px",
                  backgroundColor: isSuccess ? "#3a6b3a" : "#8B1A1A",
                  color: "#F4F0E6",
                  cursor: isLoading ? "wait" : "pointer",
                  transition: "background-color 0.3s ease",
                }}
              >
                {isSuccess
                  ? "Signed In ✓"
                  : isLoading
                  ? "Verifying…"
                  : mode === "reset"
                  ? "Reset Password"
                  : "Verify & Continue"}
              </button>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => switchMode("signin")}
                  className={linkClass}
                  style={{ color: "rgba(17,17,17,0.4)" }}
                >
                  ← Back to sign in
                </button>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendCooldown > 0}
                  className="font-sans font-bold text-[10px] uppercase tracking-widest transition-opacity disabled:opacity-30"
                  style={{ color: "#8B1A1A" }}
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
                </button>
              </div>
            </form>
          )}

          {/* ── Success confirmation (brief, before redirect) ── */}
          {isSuccess && (
            <div className="py-4">
              <div
                className="flex items-center gap-3 px-5 py-4 mb-4"
                style={{ backgroundColor: "#EDE8DC", borderLeft: "3px solid #3a6b3a" }}
              >
                <span style={{ color: "#3a6b3a", fontSize: "18px" }}>✓</span>
                <p
                  className="font-sans font-bold uppercase tracking-[0.2em]"
                  style={{ fontSize: "11px", color: "#111111" }}
                >
                  {successMessage}
                </p>
              </div>
              <p
                className="font-sans"
                style={{ fontSize: "11px", color: "rgba(17,17,17,0.45)" }}
              >
                Redirecting…
              </p>
            </div>
          )}
        </div>

        {/* Selvedge rule decoration */}
        <div
          className="mt-14"
          style={{
            height: "1px",
            background: `linear-gradient(to right, #8B1A1A 2px, rgba(17,17,17,0.08) 2px, transparent)`,
          }}
        />
        <p
          className="font-sans mt-4 text-center"
          style={{ fontSize: "9px", color: "rgba(17,17,17,0.3)", letterSpacing: "0.15em" }}
        >
          PASSWORD PROTECTED · SECURE · BESPOKE
        </p>
      </div>
    </div>
  );
}
