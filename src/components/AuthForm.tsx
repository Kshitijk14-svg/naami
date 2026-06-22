"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import gsap from "gsap";
import { ROLE_REDIRECT, Role } from "@/models/roles";

type AuthStep = "email" | "signup" | "otp" | "success" | "error";

export default function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get("from") ?? null;

  const [step, setStep] = useState<AuthStep>("email");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [otp, setOtp] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const emailViewRef = useRef<HTMLDivElement>(null);
  const signupViewRef = useRef<HTMLDivElement>(null);
  const otpViewRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

  // Resend countdown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [resendCooldown]);

  const transitionStep = (
    toStep: AuthStep,
    fromRef: React.RefObject<HTMLDivElement | null>,
    toRef: React.RefObject<HTMLDivElement | null>
  ) => {
    if (fromRef.current && toRef.current) {
      gsap.to(fromRef.current, {
        opacity: 0,
        y: -16,
        duration: 0.35,
        ease: "power2.in",
        onComplete: () => {
          setStep(toStep);
          // Wait a tick for react to render the target block, then fade it in
          setTimeout(() => {
            if (toRef.current) {
              gsap.fromTo(
                toRef.current,
                { opacity: 0, y: 16 },
                { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" }
              );
            }
          }, 0);
        },
      });
    } else {
      setStep(toStep);
    }
  };

  const handleContinueEmail = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!email) return;
    setErrorMsg("");
    setIsLoading(true);

    try {
      const checkRes = await fetch(`/api/auth/check-user?email=${encodeURIComponent(email)}`);
      const checkData = await checkRes.json();
      
      if (!checkRes.ok) {
        setErrorMsg(checkData.error ?? "Failed to check account status.");
        setIsLoading(false);
        return;
      }

      if (checkData.exists) {
        // User exists: Send OTP code immediately
        const res = await fetch("/api/auth/send-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const data = await res.json();
        setIsLoading(false);
        if (!res.ok) {
          setErrorMsg(data.error ?? "Failed to send code.");
          return;
        }
        setResendCooldown(60);
        transitionStep("otp", emailViewRef, otpViewRef);
      } else {
        // User is new: Show name signup form
        setIsLoading(false);
        transitionStep("signup", emailViewRef, signupViewRef);
      }
    } catch {
      setErrorMsg("Network error. Please try again.");
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!email || !name) return;
    setErrorMsg("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name }),
      });
      const data = await res.json();
      setIsLoading(false);
      if (!res.ok) {
        setErrorMsg(data.error ?? "Failed to send code.");
        return;
      }
      setResendCooldown(60);
      transitionStep("otp", signupViewRef, otpViewRef);
    } catch {
      setErrorMsg("Network error. Please try again.");
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!otp || otp.length < 6) return;
    setErrorMsg("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();
      setIsLoading(false);
      if (!res.ok) {
        setErrorMsg(data.error ?? "Incorrect code.");
        return;
      }

      setStep("success");
      const role: Role = data.role;
      const destination = returnUrl ?? ROLE_REDIRECT[role];

      // Brief delay for success feedback before navigating
      setTimeout(() => {
        router.push(destination);
        router.refresh();
      }, 700);
    } catch {
      setErrorMsg("Network error. Please try again.");
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setErrorMsg("");
    setResendCooldown(60);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name }),
      });
      const data = await res.json();
      if (!res.ok) setErrorMsg(data.error ?? "Failed to resend.");
    } catch {
      setErrorMsg("Network error. Please try again.");
    }
  };

  const isSuccess = step === "success";

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
        {/* Label */}
        <p
          className="font-sans font-bold uppercase tracking-[0.3em] mb-4"
          style={{ fontSize: "9px", color: "#8B1A1A" }}
        >
          NAAMI // ATELIER ACCESS
        </p>

        {/* Heading */}
        <h1
          className="font-serif font-light uppercase mb-10"
          style={{
            fontSize: "clamp(2rem, 5vw, 2.8rem)",
            color: "#111111",
            lineHeight: 1.1,
            letterSpacing: "0.03em",
          }}
        >
          Enter the
          <br />
          <span style={{ color: "#8B1A1A", fontStyle: "italic" }}>Atelier</span>
        </h1>

        {/* Email step */}
        {step === "email" && (
          <div ref={emailViewRef}>
            <form onSubmit={handleContinueEmail} noValidate>
              <label
                htmlFor="email"
                className="font-sans font-bold uppercase tracking-[0.2em] block mb-3"
                style={{ fontSize: "9px", color: "rgba(17,17,17,0.45)" }}
              >
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
                className="w-full bg-transparent outline-none font-sans pb-3 mb-8 placeholder:text-[#111111]/25 disabled:opacity-50"
                style={{
                  fontSize: "15px",
                  color: "#111111",
                  borderBottom: "1.5px solid #8B1A1A",
                  borderRadius: 0,
                }}
              />

              {errorMsg && (
                <p
                  className="font-sans text-[11px] mb-5"
                  style={{ color: "#8B1A1A" }}
                >
                  {errorMsg}
                </p>
              )}

              <button
                type="submit"
                disabled={isLoading || !email}
                className="w-full py-4 font-sans font-bold uppercase tracking-[0.25em] transition-opacity hover:opacity-80 disabled:opacity-40"
                style={{
                  fontSize: "10px",
                  backgroundColor: "#8B1A1A",
                  color: "#F4F0E6",
                  cursor: isLoading ? "wait" : "pointer",
                }}
              >
                {isLoading ? "Checking…" : "Continue"}
              </button>
            </form>
          </div>
        )}

        {/* Signup step */}
        {step === "signup" && (
          <div ref={signupViewRef}>
            <p
              className="font-sans text-[12px] mb-6 leading-relaxed"
              style={{ color: "rgba(17,17,17,0.6)" }}
            >
              You are new to the Atelier. Please enter your name to register.
            </p>

            <form onSubmit={handleSignUp} noValidate>
              <label
                htmlFor="name"
                className="font-sans font-bold uppercase tracking-[0.2em] block mb-3"
                style={{ fontSize: "9px", color: "rgba(17,17,17,0.45)" }}
              >
                Full Name
              </label>
              <input
                id="name"
                type="text"
                autoFocus
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
                placeholder="First Last"
                className="w-full bg-transparent outline-none font-sans pb-3 mb-8 placeholder:text-[#111111]/25 disabled:opacity-50"
                style={{
                  fontSize: "15px",
                  color: "#111111",
                  borderBottom: "1.5px solid #8B1A1A",
                  borderRadius: 0,
                }}
              />

              {errorMsg && (
                <p
                  className="font-sans text-[11px] mb-5"
                  style={{ color: "#8B1A1A" }}
                >
                  {errorMsg}
                </p>
              )}

              <button
                type="submit"
                disabled={isLoading || !name}
                className="w-full py-4 font-sans font-bold uppercase tracking-[0.25em] transition-opacity hover:opacity-80 disabled:opacity-40 mb-5"
                style={{
                  fontSize: "10px",
                  backgroundColor: "#8B1A1A",
                  color: "#F4F0E6",
                  cursor: isLoading ? "wait" : "pointer",
                }}
              >
                {isLoading ? "Sending Code…" : "Sign Up"}
              </button>
            </form>

            <button
              onClick={() => {
                setStep("email");
                setName("");
                setErrorMsg("");
              }}
              className="font-sans text-[10px] uppercase tracking-widest hover:opacity-60 transition-opacity"
              style={{ color: "rgba(17,17,17,0.4)" }}
            >
              ← Change email
            </button>
          </div>
        )}

        {/* OTP step */}
        {(step === "otp" || isSuccess) && (
          <div ref={otpViewRef}>
            <p
              className="font-sans text-[12px] mb-6 leading-relaxed"
              style={{ color: "rgba(17,17,17,0.6)" }}
            >
              We sent a 6-digit code to{" "}
              <span style={{ color: "#111111", fontWeight: 600 }}>{email}</span>
            </p>

            <form onSubmit={handleVerifyOtp} noValidate>
              <label
                htmlFor="otp"
                className="font-sans font-bold uppercase tracking-[0.2em] block mb-3"
                style={{ fontSize: "9px", color: "rgba(17,17,17,0.45)" }}
              >
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
                className="w-full bg-transparent outline-none font-sans pb-3 mb-8 placeholder:text-[#111111]/25 tracking-[0.4em] disabled:opacity-50"
                style={{
                  fontSize: "22px",
                  color: "#111111",
                  borderBottom: "1.5px solid #8B1A1A",
                  borderRadius: 0,
                }}
              />

              {errorMsg && (
                <p
                  className="font-sans text-[11px] mb-5"
                  style={{ color: "#8B1A1A" }}
                >
                  {errorMsg}
                </p>
              )}

              <button
                type="submit"
                disabled={isLoading || isSuccess || otp.length < 6}
                className="w-full py-4 font-sans font-bold uppercase tracking-[0.25em] transition-opacity hover:opacity-80 disabled:opacity-40 mb-5"
                style={{
                  fontSize: "10px",
                  backgroundColor: isSuccess ? "#3a6b3a" : "#8B1A1A",
                  color: "#F4F0E6",
                  cursor: isLoading ? "wait" : "pointer",
                  transition: "background-color 0.3s ease",
                }}
              >
                {isSuccess ? "Signed In ✓" : isLoading ? "Verifying…" : "Verify Code"}
              </button>
            </form>

            <div className="flex items-center justify-between">
              <button
                onClick={() => {
                  setStep("email");
                  setOtp("");
                  setName("");
                  setErrorMsg("");
                }}
                className="font-sans text-[10px] uppercase tracking-widest hover:opacity-60 transition-opacity"
                style={{ color: "rgba(17,17,17,0.4)" }}
              >
                ← Change email
              </button>
              <button
                onClick={handleResend}
                disabled={resendCooldown > 0}
                className="font-sans font-bold text-[10px] uppercase tracking-widest transition-opacity disabled:opacity-30"
                style={{ color: "#8B1A1A" }}
              >
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
              </button>
            </div>
          </div>
        )}

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
          PASSWORDLESS · SECURE · BESPOKE
        </p>
      </div>
    </div>
  );
}
