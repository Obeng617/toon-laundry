"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Eye, EyeOff, Gift, KeyRound, Lock, Mail, User } from "lucide-react";
import { TinocleanLogo } from "@/components/TinocleanLogo";
import { useApp } from "@/context/AppContext";
import { evaluatePasswordStrength } from "@/lib/password";

function RegisterFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signInWithPassword } = useApp();

  const [step, setStep] = useState<"form" | "otp">("form");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [referralCode, setReferralCode] = useState(searchParams.get("ref") || "");
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [otpCode, setOtpCode] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState("");
  const [error, setError] = useState("");

  const strength = evaluatePasswordStrength(password);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const requestOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError("");
    setInfo("");

    if (!fullName.trim()) {
      setError("Please enter your full name.");
      return;
    }
    if (!strength.isAcceptable) {
      setError("Please choose a stronger password (at least 8 characters with letters and numbers).");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, purpose: "signup" }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Could not send verification code.");
        if (data.retryAfterSec) setCooldown(data.retryAfterSec);
        return;
      }
      setInfo(data.message);
      setCooldown(data.resendCooldownSeconds || 60);
      setStep("otp");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          purpose: "signup",
          code: otpCode,
          fullName,
          password,
          referralCode: referralCode.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Invalid verification code.");
        return;
      }
      await signInWithPassword(email, password);
      router.push("/");
    } catch {
      setError("Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md card-tino p-7 sm:p-8 space-y-6">
      <div className="text-center space-y-3">
        <div className="flex justify-center">
          <TinocleanLogo size={46} />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-[#0B2049]">
            {step === "form" ? "Create your account" : "Verify your email"}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {step === "form"
              ? "Use your @upsamail.edu.gh email to unlock Student Tariff rates automatically"
              : `Enter the 6-digit code sent to ${email}`}
          </p>
        </div>
      </div>

      {step === "form" ? (
        <form onSubmit={requestOtp} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Full Name</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                className="input-tino pl-10"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com or idnumber@upsamail.edu.gh"
                className="input-tino pl-10"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPwd ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="input-tino pl-10 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                aria-label="Toggle password visibility"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {password.length > 0 && (
              <div className="mt-2 space-y-1">
                <div className="grid grid-cols-4 gap-1.5">
                  {[1, 2, 3, 4].map((bar) => (
                    <div
                      key={bar}
                      className="h-1.5 rounded-full transition-colors"
                      style={{
                        backgroundColor: strength.score >= bar ? strength.color : "#E2E8F0",
                      }}
                    />
                  ))}
                </div>
                <div className="flex justify-between text-[11px] font-semibold">
                  <span style={{ color: strength.color }}>{strength.label}</span>
                  {strength.hints[0] && (
                    <span className="text-slate-400">{strength.hints[0]}</span>
                  )}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showConfirm ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                className="input-tino pl-10 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                aria-label="Toggle confirm password visibility"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">
              Referral Code (Optional)
            </label>
            <div className="relative">
              <Gift className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                placeholder="Enter a friend's referral code"
                className="input-tino pl-10 uppercase"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs font-semibold text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-tino-primary w-full py-3.5 text-sm"
          >
            {loading ? "Sending verification code..." : "Continue & Send OTP"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} className="space-y-4">
          {info && (
            <div className="rounded-xl bg-sky-50 border border-sky-200 p-3 text-xs text-[#0B2049] flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#02A1DB] shrink-0 mt-0.5" />
              <span>{info} Code expires in 10 minutes (max 5 attempts).</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">
              6-Digit Verification Code
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                required
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                className="input-tino pl-10 text-center text-xl font-extrabold tracking-[0.35em]"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs font-semibold text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || otpCode.length !== 6}
            className="btn-tino-primary w-full py-3.5 text-sm"
          >
            {loading ? "Verifying..." : "Verify & Activate Account"}
          </button>

          <div className="flex items-center justify-between text-xs pt-1">
            <button
              type="button"
              onClick={() => setStep("form")}
              className="font-semibold text-slate-500 hover:text-slate-700 cursor-pointer"
            >
              Change email
            </button>
            <button
              type="button"
              disabled={cooldown > 0 || loading}
              onClick={() => requestOtp()}
              className="font-bold text-[#02A1DB] disabled:text-slate-400 cursor-pointer"
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend OTP"}
            </button>
          </div>
        </form>
      )}

      <p className="text-center text-xs text-slate-600">
        Already have an account?{" "}
        <Link href="/auth/login" className="font-bold text-[#264099] hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-[#F5F9FA] flex items-center justify-center px-4 py-10">
      <Suspense fallback={<div className="card-tino p-8 text-sm text-slate-500">Loading...</div>}>
        <RegisterFormContent />
      </Suspense>
    </div>
  );
}
