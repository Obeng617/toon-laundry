"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Award, GraduationCap, Info } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useApp } from "@/context/AppContext";
import { formatCurrency } from "@/lib/pricing";

export default function PricingPage() {
  const { tariffs, services, settings } = useApp();

  const otherServices = services.filter((s) => s.isActive && s.pricingType === "per_kg");

  return (
    <AppShell mode="customer">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#02A1DB]">
              Transparent Half-Kilogram Brackets
            </p>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B2049]">
              Simple, Clear Pricing
            </h1>
            <p className="text-[15px] sm:text-base font-semibold text-slate-700 mt-1.5 leading-relaxed">
              We record your exact decimal weight and bill using our half-kilogram tariff table. Pay
              only on delivery or collection.
            </p>
          </div>
          <Link href="/book" className="btn-tino-primary text-sm self-start">
            Book Laundry
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Tariff Table (1.0 kg to 10.0 kg) */}
        <div className="card-tino overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-extrabold text-[#0B2049]">
                Wash, Dry &amp; Fold — Half-Kilogram Tariff Table
              </h2>
              <p className="text-xs font-semibold text-slate-600 mt-0.5">
                Weights below 1.0 kg use the 1.0 kg bracket. Weights between points round up to the
                next 0.5 kg bracket.
              </p>
            </div>
            <Link
              href="/account"
              className="text-xs font-extrabold text-[#02A1DB] hover:underline flex items-center gap-1"
            >
              <GraduationCap className="w-4 h-4" />
              Verify Student Email
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F5F9FA] text-left text-xs uppercase tracking-wider text-slate-600">
                <tr>
                  <th className="px-5 py-3 font-extrabold">Weight Bracket</th>
                  <th className="px-5 py-3 font-extrabold text-emerald-700">Student Tariff</th>
                  <th className="px-5 py-3 font-extrabold text-[#264099]">Regular Tariff</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tariffs
                  .filter((t) => t.isActive)
                  .map((t) => (
                    <tr key={t.id} className="hover:bg-[#F6FFFF]">
                      <td className="px-5 py-3 font-bold text-[#0B2049]">
                        {t.weightKg.toFixed(1)} kg
                      </td>
                      <td className="px-5 py-3 font-extrabold text-emerald-700">
                        {formatCurrency(t.studentPrice)}
                      </td>
                      <td className="px-5 py-3 font-extrabold text-[#264099]">
                        {formatCurrency(t.regularPrice)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Other Services & Loyalty/Referral Rules */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card-tino p-5 space-y-3">
            <h3 className="font-extrabold text-[#0B2049]">Other Services &amp; Per-Kg Rates</h3>
            <div className="divide-y divide-slate-100">
              {otherServices.map((s) => (
                <div key={s.id} className="py-2.5 flex items-center justify-between text-sm">
                  <div>
                    <div className="font-bold text-[#0B2049]">{s.name}</div>
                    <div className="text-xs text-slate-500">{s.description}</div>
                  </div>
                  <div className="font-extrabold text-[#264099] shrink-0 ml-3">
                    {formatCurrency(s.perKgRate)} / kg
                  </div>
                </div>
              ))}
            </div>
            <div className="rounded-xl bg-[#F5F9FA] p-3 text-xs text-slate-600 flex items-start gap-2">
              <Info className="w-4 h-4 text-[#02A1DB] shrink-0 mt-0.5" />
              <span>
                Light Duvet, Heavy Duvet and Express are charged per kilogram (rounded up to the
                next 0.5 kg, minimum 1.0 kg) and are the same rate for student and regular
                customers.
              </span>
            </div>
          </div>

          <div className="card-tino p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-[#264099]" />
              <h3 className="font-extrabold text-[#0B2049]">
                Loyalty &amp; Referral Discounts ({settings.discountPercent}% Off)
              </h3>
            </div>
            <div className="space-y-2.5 text-xs text-slate-600 leading-relaxed">
              <p>
                <strong>Loyalty Discount:</strong> Complete{" "}
                <strong>{settings.loyaltyWashesRequired} consecutive orders</strong> and your{" "}
                <strong>{settings.loyaltyWashesRequired + 1}th order gets {settings.discountPercent}% off</strong>{" "}
                the total payable. After that discounted order is completed, the count starts again
                at zero.
              </p>
              <p>
                <strong>Referral Discount:</strong> Share your personal referral code from{" "}
                <Link href="/account" className="text-[#02A1DB] font-bold hover:underline">
                  My Profile
                </Link>
                . When a new client registers with your code and completes their first order, you
                earn <strong>{settings.discountPercent}% off</strong> one of your next orders.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
