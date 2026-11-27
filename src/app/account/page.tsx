"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Award,
  Check,
  CheckCircle2,
  Copy,
  Gift,
  GraduationCap,
  KeyRound,
  LogOut,
  Mail,
  Shield,
  User,
  XCircle,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useApp } from "@/context/AppContext";
import { parseUpsaStudentEmail } from "@/lib/pricing";

export default function AccountPage() {
  const { currentUser, settings, updateProfile, refreshData, signOut } = useApp();

  const [fullName, setFullName] = useState(currentUser?.fullName || "");
  const [phone, setPhone] = useState(currentUser?.phone || "");
  const [defaultAddress, setDefaultAddress] = useState(currentUser?.defaultAddress || "");
  const [savedMsg, setSavedMsg] = useState("");
  const [copiedRef, setCopiedRef] = useState(false);

  // Section 8.6: UPSA Student Email OTP verification state
  const [upsaEmail, setUpsaEmail] = useState(currentUser?.upsaEmail || "");
  const [pendingUpsaEmail, setPendingUpsaEmail] = useState("");
  const [otpStep, setOtpStep] = useState<"idle" | "code">("idle");
  const [otpCode, setOtpCode] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [svLoading, setSvLoading] = useState(false);
  const [svError, setSvError] = useState("");
  const [svSuccess, setSvSuccess] = useState("");

  useEffect(() => {
    if (currentUser) {
      setFullName(currentUser.fullName);
      setPhone(currentUser.phone);
      setDefaultAddress(currentUser.defaultAddress || "");
      if (currentUser.upsaEmail) {
        setUpsaEmail(currentUser.upsaEmail);
      }
    }
  }, [currentUser]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const mode =
    currentUser?.role === "admin" || currentUser?.role === "staff" ? "admin" : "customer";

  if (!currentUser) {
    return (
      <AppShell mode="customer">
        <div className="max-w-md mx-auto card-tino p-8 text-center space-y-4">
          <User className="w-12 h-12 text-[#02A1DB] mx-auto" />
          <h1 className="text-xl font-extrabold text-[#0B2049]">
            Sign in to your Tinoclean account
          </h1>
          <p className="text-sm text-slate-500">
            Track orders, view digital tickets, verify your UPSA student email, and track loyalty
            discounts.
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="/auth/login" className="btn-tino-primary text-sm px-5 py-2.5">
              Log in
            </Link>
            <Link href="/auth/register" className="btn-tino-secondary text-sm px-5 py-2.5">
              Register
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await updateProfile({
      fullName: fullName.trim() || currentUser.fullName,
      phone: phone.trim(),
      defaultAddress: defaultAddress.trim(),
    });
    if (res.ok) {
      setSavedMsg("Profile updated.");
      setTimeout(() => setSavedMsg(""), 2500);
    }
  };

  const handleSendUpsaOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSvError("");
    setSvSuccess("");

    const parsed = parseUpsaStudentEmail(upsaEmail);
    if (!parsed.valid) {
      setSvError(parsed.error || "Enter a valid @upsamail.edu.gh student email.");
      return;
    }

    setSvLoading(true);
    try {
      const res = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: parsed.normalizedEmail,
          purpose: "upsa_student",
          currentUserId: currentUser.id,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setSvError(data.error || "Could not send verification code.");
        return;
      }
      const normalized = parsed.normalizedEmail || upsaEmail.trim().toLowerCase();
      setUpsaEmail(normalized);
      setPendingUpsaEmail(normalized);
      setOtpStep("code");
      setCooldown(data.resendCooldownSeconds || 60);
    } catch {
      setSvError("Network error. Please try again.");
    } finally {
      setSvLoading(false);
    }
  };

  const handleVerifyUpsaOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSvError("");
    const targetEmail = (pendingUpsaEmail || upsaEmail).trim().toLowerCase();
    if (!targetEmail) {
      setOtpStep("idle");
      setSvError("Please enter your @upsamail.edu.gh email and request a new OTP.");
      return;
    }
    setSvLoading(true);
    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: targetEmail,
          purpose: "upsa_student",
          code: otpCode.trim(),
          currentUserId: currentUser.id,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setSvError(data.error || "Invalid verification code.");
        return;
      }
      setSvSuccess("UPSA Student email verified! Student tariff rate is now active for 12 months.");
      setPendingUpsaEmail("");
      setOtpStep("idle");
      setOtpCode("");
      await refreshData();
    } catch {
      setSvError("Verification failed. Please try again.");
    } finally {
      setSvLoading(false);
    }
  };

  const referralLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/auth/register?ref=${currentUser.referralCode}`
      : `/auth/register?ref=${currentUser.referralCode}`;

  const handleCopyReferral = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 2000);
    } catch {
      // Fallback
    }
  };

  const washesRequired = settings.loyaltyWashesRequired || 3;
  const streak = Math.min(washesRequired, currentUser.completedWashesStreak);
  const nextOrderIsLoyaltyDiscounted = currentUser.completedWashesStreak >= washesRequired;

  return (
    <AppShell mode={mode}>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#02A1DB]">My Account</p>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B2049]">
              {currentUser.fullName}
            </h1>
            <p className="text-xs text-slate-500">
              {currentUser.email} • Role: <strong className="uppercase">{currentUser.role}</strong>
            </p>
          </div>
          {currentUser.role === "admin" || currentUser.role === "staff" ? (
            <div className="flex items-center gap-2">
              <Link href="/tc-ops-m9x4k7p2" className="btn-tino-secondary text-xs px-3.5 py-2">
                <Shield className="w-4 h-4" />
                Admin Dashboard
              </Link>
            </div>
          ) : null}
        </div>

        {/* Loyalty & Referral Discounts Card (Section 3 & 6.1) */}
        {currentUser.role === "customer" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card-tino p-5 space-y-3 bg-gradient-to-br from-[#eff8fd] to-white border border-sky-200/70">
              <div className="flex items-center justify-between gap-2 flex-nowrap">
                <div className="flex items-center gap-1.5 min-w-0 font-extrabold text-sm sm:text-base text-[#0B2049]">
                  <Award className="w-4 h-4 sm:w-5 sm:h-5 text-[#264099] shrink-0" />
                  <span className="truncate">
                    Loyalty Discount ({settings.discountPercent}% Off)
                  </span>
                </div>
                <span className="shrink-0 whitespace-nowrap rounded-full bg-[#264099] text-white px-2.5 py-0.5 text-[11px] sm:text-xs font-extrabold">
                  {streak}/{washesRequired} washes
                </span>
              </div>

              <div className="h-2.5 rounded-full bg-slate-200 overflow-hidden">
                <div
                  className="h-full rounded-full bg-tino-gradient transition-all"
                  style={{ width: `${Math.round((streak / washesRequired) * 100)}%` }}
                />
              </div>

              <p className="text-xs text-slate-600 font-medium">
                {nextOrderIsLoyaltyDiscounted ? (
                  <strong className="text-emerald-700">
                    Unlocked! Your next wash automatically gets {settings.discountPercent}% off!
                  </strong>
                ) : (
                  <>
                    <strong>
                      {streak} of {washesRequired} washes done.
                    </strong>{" "}
                    Your {washesRequired + 1}th wash gets {settings.discountPercent}% off!
                  </>
                )}
              </p>
            </div>

            <div className="card-tino p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-extrabold text-[#0B2049]">
                  <Gift className="w-5 h-5 text-[#02A1DB]" />
                  Refer a Friend ({settings.discountPercent}% Off)
                </div>
                {(currentUser.availableReferralDiscounts > 0 ||
                  currentUser.manualDiscountsAvailable > 0) && (
                  <span className="rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-0.5 text-xs font-extrabold">
                    {currentUser.availableReferralDiscounts + currentUser.manualDiscountsAvailable}{" "}
                    available
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-600">
                Share your referral code. When a new client completes their first wash, you earn{" "}
                <strong>{settings.discountPercent}% off</strong> your next order.
              </p>

              <div className="flex items-center gap-2">
                <div className="flex-1 rounded-xl bg-[#F5F9FA] border border-slate-200 px-3 py-2 font-mono text-sm font-black text-[#264099] tracking-wider">
                  {currentUser.referralCode}
                </div>
                <button
                  type="button"
                  onClick={handleCopyReferral}
                  className="btn-tino-secondary text-xs px-3 py-2"
                >
                  {copiedRef ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  {copiedRef ? "Copied!" : "Copy Link"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* UPSA Student Email OTP Verification (Section 8.6 — No ID Photo Upload) */}
        {currentUser.role === "customer" && (
          <div className="card-tino p-5 space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-[#264099]" />
                <h2 className="font-extrabold text-[#0B2049]">
                  UPSA Student Verification (OTP)
                </h2>
              </div>

              {currentUser.studentStatus === "verified" ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 px-3 py-1 text-xs font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Verified Student
                </span>
              ) : currentUser.studentStatus === "revoked" ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-100 text-red-700 px-3 py-1 text-xs font-bold">
                  <XCircle className="w-3.5 h-3.5" />
                  Revoked
                </span>
              ) : (
                <span className="rounded-full bg-slate-100 text-slate-600 px-3 py-1 text-xs font-bold">
                  Not verified
                </span>
              )}
            </div>

            {currentUser.studentStatus === "verified" && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-xs text-emerald-900 space-y-1">
                <div className="font-extrabold text-sm">
                  Student Tariff Active (GH₵7 at 1.0 kg • GH₵10 at 1.5 kg for Wash, Dry &amp; Fold)
                </div>
                <div>
                  UPSA Email: <strong>{currentUser.upsaEmail}</strong> • Student ID:{" "}
                  <strong>{currentUser.studentIdNumber}</strong>
                </div>
                {currentUser.studentExpiresAt && (
                  <div>
                    Valid until:{" "}
                    <strong>
                      {new Date(currentUser.studentExpiresAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </strong>{" "}
                    (renews annually by OTP)
                  </div>
                )}
              </div>
            )}

            {currentUser.studentStatus !== "verified" && (
              <div className="space-y-3">
                <p className="text-xs text-slate-600">
                  Enter your official UPSA student email (
                  <strong>idnumber@upsamail.edu.gh</strong>) to receive a 6-digit verification code.
                  No student ID card or photo upload is required.
                </p>

                {otpStep === "idle" ? (
                  <form onSubmit={handleSendUpsaOtp} className="flex flex-col sm:flex-row gap-2.5">
                    <div className="relative flex-1">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        value={upsaEmail}
                        onChange={(e) => setUpsaEmail(e.target.value)}
                        placeholder="10293847@upsamail.edu.gh"
                        className="input-tino pl-10"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={svLoading}
                      className="btn-tino-primary text-xs px-5 py-2.5 shrink-0"
                    >
                      {svLoading ? "Sending OTP..." : "Send UPSA OTP"}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyUpsaOtp} className="space-y-3">
                    <div className="flex flex-col sm:flex-row gap-2.5">
                      <div className="relative flex-1">
                        <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          required
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                          placeholder="Enter 6-digit OTP sent to @upsamail.edu.gh"
                          className="input-tino pl-10 font-bold tracking-widest"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={svLoading || otpCode.length !== 6}
                        className="btn-tino-primary text-xs px-5 py-2.5 shrink-0"
                      >
                        {svLoading ? "Verifying..." : "Verify Student OTP"}
                      </button>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <button
                        type="button"
                        onClick={() => setOtpStep("idle")}
                        className="text-slate-500 hover:underline cursor-pointer"
                      >
                        Change UPSA email
                      </button>
                      <button
                        type="button"
                        disabled={cooldown > 0}
                        onClick={() => handleSendUpsaOtp()}
                        className="font-bold text-[#02A1DB] disabled:text-slate-400 cursor-pointer"
                      >
                        {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend OTP"}
                      </button>
                    </div>
                  </form>
                )}

                {svError && (
                  <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs font-semibold text-red-700">
                    {svError}
                  </div>
                )}
                {svSuccess && (
                  <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-semibold text-emerald-800">
                    {svSuccess}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Personal Details Form */}
        <form onSubmit={handleSaveProfile} className="card-tino p-5 space-y-4">
          <h2 className="font-extrabold text-[#0B2049]">Personal Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="input-tino"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                WhatsApp Phone Number
              </label>
              <input
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={15}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                placeholder="0551750854"
                className="input-tino"
              />
              <p className="text-[11px] font-semibold text-[#264099] mt-1">
                Your digital laundry ticket is sent to this WhatsApp number once you provide the
                right number.
              </p>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">
              Default Pickup / Delivery Address
            </label>
            <input
              type="text"
              value={defaultAddress}
              onChange={(e) => setDefaultAddress(e.target.value)}
              placeholder="e.g. UPSA Hostel Block B, Room 204"
              className="input-tino"
            />
          </div>
          <div className="flex items-center gap-3">
            <button type="submit" className="btn-tino-primary text-xs px-5 py-2.5">
              Save Changes
            </button>
            {savedMsg && <span className="text-xs font-bold text-emerald-600">{savedMsg}</span>}
          </div>
        </form>

        <div className="flex justify-center pt-2 pb-4">
          <button
            type="button"
            onClick={signOut}
            className="rounded-xl border border-slate-200 bg-white hover:bg-red-50 hover:text-red-600 px-6 py-2.5 text-sm font-bold text-slate-600 inline-flex items-center gap-2 shadow-xs transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </div>
    </AppShell>
  );
}
