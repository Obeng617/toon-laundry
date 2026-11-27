"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ServiceIcon } from "@/components/ServiceIcon";
import { useApp } from "@/context/AppContext";
import { formatCurrency } from "@/lib/pricing";

export default function ServicesPage() {
  const { services } = useApp();
  const activeServices = services.filter((s) => s.isActive);

  return (
    <AppShell mode="customer">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#02A1DB]">
              Tinoclean Care
            </p>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B2049]">Our Services</h1>
            <p className="text-sm text-slate-500 mt-1">
              Four weight-based laundry services with half-kilogram billing brackets, no pickup or
              delivery fees, and 10% loyalty &amp; referral discounts.
            </p>
          </div>
          <Link href="/book" className="btn-tino-primary text-sm self-start">
            Place an Order
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeServices.map((srv) => (
            <div key={srv.id} className="card-tino p-5 flex flex-col justify-between gap-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-13 h-13 rounded-[15px] bg-gradient-to-br from-[#eef7fc] to-[#d9eefb] border border-sky-200/70 flex items-center justify-center shadow-xs">
                    <ServiceIcon name={srv.iconName} slug={srv.slug} className="w-7 h-7" />
                  </div>
                  <span className="rounded-full bg-[#F5F9FA] border border-slate-200 px-3 py-1 text-xs font-bold text-[#264099]">
                    {srv.pricingType === "half_kg_tariff"
                      ? "Student GH₵7/kg • Regular GH₵8/kg"
                      : `${formatCurrency(srv.perKgRate)} per kg`}
                  </span>
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-[#0B2049]">{srv.name}</h2>
                  <p className="text-sm text-slate-600 mt-1">{srv.description}</p>
                </div>
                <ul className="space-y-1.5 text-xs text-slate-600 pt-1">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    Weights rounded up to the next 0.5 kg (minimum 1.0 kg)
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    Combine multiple services in one order — each shown on your digital ticket
                  </li>
                </ul>
              </div>

              <Link
                href={`/book?service=${srv.slug}`}
                className="btn-tino-secondary w-full text-xs py-2.5"
              >
                Book {srv.name}
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
