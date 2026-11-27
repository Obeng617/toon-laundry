"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Eye, EyeOff, KeyRound, Lock, Mail } from "lucide-react";
import { TinocleanLogo } from "@/components/TinocleanLogo";
import { evaluatePasswordStrength } from "@/lib/password";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<"email" | "reset" | "done">("email");
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [neutralMsg, setNeutralMsg] = useState("");
  const [error, setError] = useState("");

  const strength = evaluatePasswordStrength(newPassword);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const handleRequestOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, purpose: "password_reset" }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Please try again later.");
        return;
      }
      setNeutralMsg(data.message);
      setCooldown(data.resendCooldownSeconds || 60);
      setStep("reset");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!strength.isAcceptable) {
      setError("Please choose a stronger password (at least 8 characters).");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          purpose: "password_reset",
          code: otpCode,
          password: newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Invalid or expired code.");
        return;
      }
      setStep("done");
    } catch {
      setError("Could not reset password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F9FA] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md card-tino p-7 sm:p-8 space-y-6">
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <TinocleanLogo size={46} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-[#0B2049]">Reset Password</h1>
            <p className="text-sm text-slate-500 mt-1">
              {step === "email"
                ? "Enter your email to receive a 6-digit verification code"
                : step === "reset"
                ? "Enter the code and choose a new password"
                : "Your password has been updated"}
            </p>
          </div>
        </div>

        {step === "email" && (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="input-tino pl-10"
                />
              </div>
            </div>
            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs font-semibold text-red-700">
                {error}
              </div>
            )}
            <button type="submit" disabled={loading} className="btn-tino-primary w-full py-3.5 text-sm">
              {loading ? "Sending..." : "Send Reset Code"}
            </button>
          </form>
        )}

        {step === "reset" && (
          <form onSubmit={handleReset} className="space-y-4">
            {neutralMsg && (
              <div className="rounded-xl bg-sky-50 border border-sky-200 p-3 text-xs text-[#0B2049]">
                {neutralMsg}
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">6-Digit OTP</label>
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
                  className="input-tino pl-10 text-center text-lg font-extrabold tracking-[0.35em]"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">New Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPwd ? "text" : "password"}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input-tino pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer"
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {newPassword.length > 0 && (
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="flex-1 grid grid-cols-4 gap-1">
                    {[1, 2, 3, 4].map((b) => (
                      <div
                        key={b}
                        className="h-1.5 rounded-full"
                        style={{ backgroundColor: strength.score >= b ? strength.color : "#E2E8F0" }}
                      />
                    ))}
                  </div>
                  <span className="text-[11px] font-bold" style={{ color: strength.color }}>
                    {strength.label}
                  </span>
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Confirm Password</label>
              <input
                type={showPwd ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-tino"
              />
            </div>
            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs font-semibold text-red-700">
                {error}
              </div>
            )}
            <button type="submit" disabled={loading} className="btn-tino-primary w-full py-3.5 text-sm">
              {loading ? "Updating..." : "Reset Password"}
            </button>
            <div className="text-right">
              <button
                type="button"
                disabled={cooldown > 0}
                onClick={() => handleRequestOtp()}
                className="text-xs font-bold text-[#02A1DB] disabled:text-slate-400 cursor-pointer"
              >
                {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
              </button>
            </div>
          </form>
        )}

        {step === "done" && (
          <div className="text-center space-y-4">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <p className="text-sm text-slate-600">
              Your password has been reset and all previous sessions have been signed out.
            </p>
            <Link href="/auth/login" className="btn-tino-primary w-full py-3 text-sm">
              Back to Log in
            </Link>
          </div>
        )}

        <p className="text-center text-xs text-slate-600">
          Remembered your password?{" "}
          <Link href="/auth/login" className="font-bold text-[#264099] hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
