"use client";

import React from "react";
import { AlertCircle, Database, KeyRound, Mail } from "lucide-react";
import { TinocleanLogo } from "./TinocleanLogo";

export function SetupRequiredBanner({ error }: { error: string }) {
  return (
    <div className="min-h-screen bg-[#F5F9FA] flex items-center justify-center p-4">
      <div className="max-w-xl w-full card-tino p-7 sm:p-8 space-y-5 border-t-4 border-t-[#FF4D4D]">
        <div className="flex items-center justify-between">
          <TinocleanLogo size={42} subtitle="Production Build" />
          <span className="rounded-full bg-red-50 border border-red-200 text-[#FF4D4D] px-3 py-1 text-xs font-extrabold">
            Setup Required
          </span>
        </div>

        <div className="rounded-2xl bg-red-50/80 border border-red-200 p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-[#FF4D4D] shrink-0 mt-0.5" />
          <div className="text-sm text-red-900">
            <div className="font-extrabold">Environment Configuration Missing</div>
            <p className="text-xs mt-1 leading-relaxed">{error}</p>
          </div>
        </div>

        <div className="space-y-3 text-xs text-slate-600">
          <p className="font-semibold text-[#0B2049]">
            This is a live production build (no demo fallback). Add your credentials to{" "}
            <code className="bg-slate-100 px-1.5 py-0.5 rounded font-bold">.env.local</code> and
            run the Supabase migration in{" "}
            <code className="bg-slate-100 px-1.5 py-0.5 rounded font-bold">
              supabase/migrations/001_initial_schema.sql
            </code>
            :
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="rounded-xl bg-[#F5F9FA] border border-slate-200 p-3 space-y-1">
              <Database className="w-4 h-4 text-[#264099]" />
              <div className="font-bold text-[#0B2049]">Supabase DB &amp; Auth</div>
              <div className="text-[11px] text-slate-500">
                <code>NEXT_PUBLIC_SUPABASE_URL</code>, <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>,{" "}
                <code>SUPABASE_SERVICE_ROLE_KEY</code>
              </div>
            </div>

            <div className="rounded-xl bg-[#F5F9FA] border border-slate-200 p-3 space-y-1">
              <Mail className="w-4 h-4 text-[#02A1DB]" />
              <div className="font-bold text-[#0B2049]">Google SMTP</div>
              <div className="text-[11px] text-slate-500">
                <code>SMTP_USER</code> &amp; <code>SMTP_APP_PASSWORD</code> (Gmail / Workspace)
              </div>
            </div>

            <div className="rounded-xl bg-[#F5F9FA] border border-slate-200 p-3 space-y-1">
              <KeyRound className="w-4 h-4 text-emerald-600" />
              <div className="font-bold text-[#0B2049]">Web Push VAPID</div>
              <div className="text-[11px] text-slate-500">
                <code>NEXT_PUBLIC_VAPID_PUBLIC_KEY</code> &amp; <code>VAPID_PRIVATE_KEY</code>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
