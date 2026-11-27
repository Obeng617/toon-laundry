"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Award,
  CheckCircle2,
  GraduationCap,
  MessageCircle,
  Package,
  ShieldCheck,
  Sparkles,
  Truck,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { InstallAppBanner } from "@/components/InstallAppBanner";
import { PublicLandingPage } from "@/components/PublicLandingPage";
import { ServiceIcon } from "@/components/ServiceIcon";
import { SetupRequiredBanner } from "@/components/SetupRequiredBanner";
import { useApp } from "@/context/AppContext";
import { formatCurrency } from "@/lib/pricing";
import { getFulfilmentLabel, getWorkflowMilestones, ORDER_STATUS_META } from "@/lib/workflow";

export default function HomePage() {
  const { hydrated, setupError, currentUser, orders, services, settings } = useApp();

  if (hydrated && setupError) {
    return <SetupRequiredBanner error={setupError} />;
  }

  // Show the professional public landing page to visitors before they log in or sign up
  if (hydrated && !currentUser) {
    return <PublicLandingPage />;
  }

  const myOrders = currentUser
    ? orders.filter((o) => o.customerId === currentUser.id)
    : [];
  const latestOrder = myOrders[0];

  const activeServices = services.filter((s) => s.isActive);
  const firstName = currentUser ? currentUser.fullName.split(" ")[0] : "there";

  const latestProgress = latestOrder
    ? (() => {
        const flow = getWorkflowMilestones(latestOrder.fulfilmentMethod);
        const idx = Math.max(0, flow.indexOf(latestOrder.status));
        return Math.round(((idx + 1) / flow.length) * 100);
      })()
    : 0;

  return (
    <AppShell mode="customer">
      <div className="space-y-6">
        {/* Greeting Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#02A1DB]">
              Welcome to Tinoclean
            </p>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B2049] mt-0.5 tracking-tight">
              Hello, {firstName} 👋
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Drop-off, pickup or delivery — pay only when you receive your laundry.
            </p>
          </div>
          {currentUser?.studentStatus === "verified" && (
            <div className="inline-flex items-center gap-2 self-start rounded-2xl bg-emerald-50 border border-emerald-200 px-3.5 py-2 text-xs font-bold text-emerald-800">
              <GraduationCap className="w-4 h-4 text-emerald-600" />
              Student Rate Active (GH₵7/kg)
            </div>
          )}
        </div>

        {/* Hero / Promo Banner */}
        <section className="relative overflow-hidden rounded-[22px] bg-[#0B2049] text-white px-5 py-7 sm:px-10 sm:py-9 shadow-lg">
          <div className="absolute -right-12 -top-12 w-56 h-56 rounded-full bg-[#02A1DB]/20 blur-2xl pointer-events-none" />
          <div className="absolute -left-10 -bottom-14 w-48 h-48 rounded-full bg-[#264099]/35 blur-2xl pointer-events-none" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-7 space-y-3.5 sm:space-y-4">
              <h2 className="text-[1.7rem] sm:text-4xl font-extrabold tracking-tight leading-[1.18]">
                Laundry day, made easier.
              </h2>
              <p className="text-[15px] sm:text-lg text-sky-100/95 leading-relaxed font-medium max-w-xl">
                Book a pickup, drop off your clothes, or arrange delivery.
              </p>
              <div className="grid grid-cols-2 sm:flex sm:flex-row items-center gap-2.5 sm:gap-3.5 pt-2">
                <Link
                  href="/book"
                  className="btn-tino-primary h-11 sm:h-12 px-3.5 sm:px-6 text-[13px] sm:text-sm font-bold rounded-[14px] whitespace-nowrap w-full sm:w-auto"
                >
                  <span>Place an order</span>
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </Link>
                <a
                  href={`https://wa.me/${settings.whatsappNumber}?text=${encodeURIComponent(
                    "Hello Tinoclean, I would like to book a laundry order."
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 sm:gap-2 h-11 sm:h-12 rounded-[14px] bg-white/12 hover:bg-white/20 border border-white/15 px-3.5 sm:px-5 text-[13px] sm:text-sm font-semibold text-white whitespace-nowrap w-full sm:w-auto transition"
                >
                  <MessageCircle className="w-4 h-4 text-sky-300 shrink-0" />
                  <span>WhatsApp Us</span>
                </a>
              </div>
            </div>

            <div className="lg:col-span-5">
              {/* Mobile: Single wide photo | Tablet/Desktop: 2-photo grid */}
              <div className="md:hidden rounded-2xl overflow-hidden border border-white/20 shadow-lg h-44">
                <img
                  src="https://images.unsplash.com/photo-1582735689369-4fe89db7114c?auto=format&fit=crop&w=700&q=85"
                  alt="Fresh folded laundry"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="hidden md:grid grid-cols-2 gap-2.5 h-52">
                <div className="rounded-2xl overflow-hidden border border-white/15 shadow-lg">
                  <img
                    src="https://images.unsplash.com/photo-1582735689369-4fe89db7114c?auto=format&fit=crop&w=700&q=85"
                    alt="Fresh folded laundry"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="rounded-2xl overflow-hidden border border-white/15 shadow-lg">
                  <img
                    src="https://images.unsplash.com/photo-1545173168-9f1947eebb7f?auto=format&fit=crop&w=700&q=85"
                    alt="Professional washing machines"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Service Icon Tiles Row (Section 14: 4 services in 14px rounded tiles) */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-extrabold text-[#0B2049]">Our Services</h2>
            <Link href="/services" className="text-xs font-bold text-[#02A1DB] hover:underline">
              See all
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            {activeServices.map((srv) => (
              <Link
                key={srv.id}
                href={`/book?service=${srv.slug}`}
                className="card-tino p-4 flex flex-col items-center text-center gap-2.5 hover:border-[#02A1DB] hover:shadow-md transition group"
              >
                <div className="w-14 h-14 rounded-[16px] bg-gradient-to-br from-[#eef7fc] to-[#d9eefb] border border-sky-200/70 group-hover:scale-105 flex items-center justify-center transition-transform shadow-xs">
                  <ServiceIcon name={srv.iconName} slug={srv.slug} className="w-8 h-8" />
                </div>
                <div className="text-xs sm:text-sm font-extrabold text-[#0B2049] leading-tight">
                  {srv.name}
                </div>
                <div className="text-[11px] text-[#264099] font-bold bg-[#eff7fc] px-2.5 py-0.5 rounded-full">
                  {srv.pricingType === "half_kg_tariff"
                    ? "From GH₵7 / kg"
                    : `${formatCurrency(srv.perKgRate)} / kg`}
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Track My Order Card + How It Works */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          <div className="lg:col-span-3 card-tino p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-[#264099]" />
                <h2 className="text-base font-extrabold text-[#0B2049]">Track My Order</h2>
              </div>
              <Link href="/orders" className="text-xs font-bold text-[#02A1DB] hover:underline">
                All orders ({myOrders.length})
              </Link>
            </div>

            {latestOrder ? (
              <Link
                href={`/orders/${latestOrder.id}`}
                className="block rounded-2xl bg-[#F5F9FA] hover:bg-[#edf6fc] border border-slate-200/70 p-4 transition space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-500 truncate">
                      {getFulfilmentLabel(latestOrder.fulfilmentMethod)}
                    </div>
                    <div className="text-lg sm:text-xl font-black text-[#0B2049] mt-0.5 whitespace-nowrap">
                      {latestOrder.tagNumber}
                    </div>
                  </div>
                  <span
                    className={`rounded-full border px-2.5 sm:px-3 py-1 text-[11px] sm:text-xs font-bold whitespace-nowrap shrink-0 ${
                      ORDER_STATUS_META[latestOrder.status].badgeClass
                    }`}
                  >
                    {ORDER_STATUS_META[latestOrder.status].label}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-tino-gradient transition-all"
                      style={{ width: `${latestProgress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-slate-500 font-medium">
                    <span>
                      {latestOrder.actualWeightKg
                        ? `${latestOrder.actualWeightKg.toFixed(2)} kg (${latestOrder.billableBracketKg?.toFixed(1)} kg bracket)`
                        : `Est. ${latestOrder.estimatedWeightKg || 1} kg`}
                    </span>
                    <span className="font-bold text-[#0B2049]">
                      Balance: {formatCurrency(latestOrder.balanceDue)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs font-bold text-[#264099] pt-1">
                  <span>Tap to view progress &amp; digital ticket</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </Link>
            ) : (
              <div className="rounded-2xl bg-[#F5F9FA] p-6 text-center space-y-3">
                <p className="text-sm text-slate-600">You have no active orders right now.</p>
                <Link href="/book" className="btn-tino-primary text-xs px-4 py-2.5">
                  Place an Order
                </Link>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2 pt-1">
              <div className="rounded-xl bg-[#F6FFFF] border border-sky-100 p-2 sm:p-2.5 text-center">
                <Truck className="w-4 h-4 text-[#02A1DB] mx-auto" />
                <div className="text-[10.5px] sm:text-[11px] font-bold text-[#0B2049] mt-1 leading-tight">
                  Free Pickup &amp; Delivery
                </div>
              </div>
              <div className="rounded-xl bg-[#F6FFFF] border border-sky-100 p-2 sm:p-2.5 text-center">
                <ShieldCheck className="w-4 h-4 text-[#264099] mx-auto" />
                <div className="text-[10.5px] sm:text-[11px] font-bold text-[#0B2049] mt-1 leading-tight">
                  Pay on Delivery
                </div>
              </div>
              <div className="rounded-xl bg-[#F6FFFF] border border-sky-100 p-2 sm:p-2.5 text-center">
                <Award className="w-4 h-4 text-emerald-600 mx-auto" />
                <div className="text-[10.5px] sm:text-[11px] font-bold text-[#0B2049] mt-1 leading-tight">
                  10% Off 4th Wash
                </div>
              </div>
            </div>
          </div>

          {/* 4-Step Booking Guide */}
          <div className="lg:col-span-2 card-tino p-5 space-y-3">
            <h2 className="text-base font-extrabold text-[#0B2049]">Book Your Laundry</h2>
            <ol className="space-y-2.5">
              {[
                {
                  step: 1,
                  title: "Choose service",
                  desc: "Wash, Dry & Fold, Light/Heavy Duvet or Same-Day Express",
                },
                {
                  step: 2,
                  title: "Choose drop-off, pickup or delivery",
                  desc: "Coverage everywhere",
                },
                {
                  step: 3,
                  title: "Choose a date and time",
                  desc: "Mon – Sat, 7:30 am – 7:30 pm",
                },
                {
                  step: 4,
                  title: "Confirm your order",
                  desc: "Pay Cash or MTN MoMo to GhanaPay 0551750854 (MARTIN) on receipt",
                },
              ].map((s) => (
                <li
                  key={s.step}
                  className="flex items-start gap-3 rounded-xl bg-[#F5F9FA] px-3 py-2.5"
                >
                  <span className="w-6 h-6 rounded-lg bg-tino-gradient text-white text-xs font-extrabold flex items-center justify-center shrink-0 mt-0.5">
                    {s.step}
                  </span>
                  <div>
                    <div className="text-xs font-bold text-[#0B2049]">{s.title}</div>
                    <div className="text-[11px] text-slate-500">{s.desc}</div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* Install PWA Prompt */}
        <InstallAppBanner />
      </div>
    </AppShell>
  );
}
