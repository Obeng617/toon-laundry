"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, Award, Calculator, GraduationCap, Info } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useApp } from "@/context/AppContext";
import { calculatePerKgService, calculateTariff, formatCurrency } from "@/lib/pricing";

export default function PricingPage() {
  const { tariffs, services, settings } = useApp();
  const [sampleWeight, setSampleWeight] = useState("1.25");

  const parsedWeight = Math.max(0.1, Number(sampleWeight) || 1.0);
  const studentCalc = calculateTariff(parsedWeight, "student", tariffs);
  const regularCalc = calculateTariff(parsedWeight, "regular", tariffs);
  const lightDuvetCalc = calculatePerKgService(parsedWeight, 10);
  const heavyDuvetCalc = calculatePerKgService(parsedWeight, 15);

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
              We record your exact decimal weight and bill using our half-kilogram tariff table. No
              pickup or delivery fees. Pay only on delivery or collection.
            </p>
          </div>
          <Link href="/book" className="btn-tino-primary text-sm self-start">
            Book Laundry
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Interactive Weight Bracket Calculator */}
        <div className="card-tino p-5 bg-gradient-to-br from-[#eff8fd] to-white border border-sky-200/70 space-y-4">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-[#264099]" />
            <h2 className="font-extrabold text-[#0B2049]">Live Weight &amp; Bracket Estimator</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
            <div>
              <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                Enter measured weight (kg)
              </label>
              <input
                type="number"
                step="0.05"
                min="0.1"
                max="30"
                value={sampleWeight}
                onChange={(e) => setSampleWeight(e.target.value)}
                className="input-tino font-bold text-lg"
              />
              <p className="text-xs font-semibold text-slate-700 mt-1">
                Actual: <strong>{studentCalc.actualWeightKg.toFixed(2)} kg</strong> → Bracket:{" "}
                <strong className="text-[#264099]">{studentCalc.billableBracketKg.toFixed(1)} kg</strong>
              </p>
            </div>

            <div className="rounded-2xl bg-white border border-emerald-200 p-4">
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-emerald-700">
                <GraduationCap className="w-4 h-4" />
                Wash, Dry &amp; Fold (Student)
              </div>
              <div className="text-2xl font-black text-[#0B2049] mt-1">
                {formatCurrency(studentCalc.tariffAmount)}
              </div>
              <div className="text-xs font-semibold text-slate-600">
                Verified Student Account
              </div>
            </div>

            <div className="rounded-2xl bg-white border border-sky-200 p-4">
              <div className="text-xs font-extrabold text-[#264099]">Wash, Dry &amp; Fold (Regular)</div>
              <div className="text-2xl font-black text-[#0B2049] mt-1">
                {formatCurrency(regularCalc.tariffAmount)}
              </div>
              <div className="text-xs font-semibold text-slate-600">
                {regularCalc.billableBracketKg.toFixed(1)} kg bracket
              </div>
            </div>

            <div className="rounded-2xl bg-white border border-slate-200 p-4">
              <div className="text-xs font-bold text-slate-700">Duvet / Express</div>
              <div className="text-sm font-extrabold text-[#0B2049] mt-1">
                Light / Express: {formatCurrency(lightDuvetCalc.lineTotal)}
              </div>
              <div className="text-sm font-extrabold text-[#264099]">
                Heavy Duvet: {formatCurrency(heavyDuvetCalc.lineTotal)}
              </div>
            </div>
          </div>
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
              <p>
                <strong>No Pickup or Delivery Fees:</strong> Pickup and delivery are arranged
                directly with Tinoclean with no coverage-area restriction.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
