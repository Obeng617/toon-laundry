"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { TinocleanLogo } from "@/components/TinocleanLogo";
import { useApp } from "@/context/AppContext";

export default function LoginPage() {
  const router = useRouter();
  const { signInWithPassword } = useApp();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setLoading(true);
    try {
      const res = await signInWithPassword(email, password);
      if (!res.ok) {
        setError(res.error || "Invalid email or password.");
        return;
      }
      router.push("/");
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
            <h1 className="text-2xl font-extrabold text-[#0B2049]">Welcome back</h1>
            <p className="text-sm text-slate-500 mt-1">
              Sign in to book laundry and track your orders
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Email Address</label>
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

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
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

          <div className="flex items-center justify-between text-xs">
            <label className="inline-flex items-center gap-2 font-semibold text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded accent-[#264099]"
              />
              Remember me
            </label>
            <Link
              href="/auth/forgot-password"
              className="font-bold text-[#02A1DB] hover:underline"
            >
              Forgot password?
            </Link>
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
            {loading ? "Signing in..." : "Log in"}
          </button>
        </form>

        <p className="text-center text-xs text-slate-600">
          Don&apos;t have an account?{" "}
          <Link href="/auth/register" className="font-bold text-[#264099] hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
