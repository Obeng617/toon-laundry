"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, Mail, ShieldCheck } from "lucide-react";
import { TinocleanLogo } from "@/components/TinocleanLogo";
import { useApp } from "@/context/AppContext";

export default function AdminLoginPage() {
  const router = useRouter();
  const { signInWithPassword, signOut } = useApp();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password) {
      setError("Please enter your admin or staff email and password.");
      return;
    }

    setLoading(true);
    try {
      const res = await signInWithPassword(email, password);
      if (!res.ok) {
        setError(res.error || "Invalid credentials.");
        return;
      }

      if (res.user?.role !== "admin" && res.user?.role !== "staff") {
        await signOut();
        setError("Access denied. This portal is restricted to Tinoclean Admin and Staff accounts.");
        return;
      }

      router.push("/tc-ops-m9x4k7p2");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B2049] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md card-tino p-7 sm:p-8 space-y-6 bg-white">
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <TinocleanLogo size={46} subtitle="Admin & Staff Portal" />
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#edf5fb] text-[#264099] px-3 py-1 text-xs font-extrabold">
            <ShieldCheck className="w-4 h-4 text-[#02A1DB]" />
            Authorised Tinoclean Staff Only
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-[#0B2049]">Admin &amp; Staff Sign In</h1>
            <p className="text-sm text-slate-500 mt-1">
              Manage orders, weigh laundry, issue tickets and record payments
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">
              Admin / Staff Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@tinoclean.com"
                className="input-tino pl-10"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="input-tino pl-10 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
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
            {loading ? "Signing in to Control Centre..." : "Sign in to Admin Dashboard"}
          </button>
        </form>

        <div className="text-center pt-2 border-t border-slate-100">
          <Link href="/" className="text-xs font-bold text-slate-500 hover:text-[#264099]">
            ← Return to Customer Website
          </Link>
        </div>
      </div>
    </div>
  );
}
