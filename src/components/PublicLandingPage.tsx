"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Award,
  CheckCircle2,
  Clock,
  Gift,
  GraduationCap,
  LogIn,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  Sparkles,
  Ticket,
  Truck,
  UserPlus,
} from "lucide-react";
import { InstallAppBanner } from "./InstallAppBanner";
import { MomoHelpCard } from "./MomoHelpCard";
import { ServiceIcon } from "./ServiceIcon";
import { TinocleanLogo } from "./TinocleanLogo";
import { useApp } from "@/context/AppContext";
import { formatCurrency } from "@/lib/pricing";

export function PublicLandingPage() {
  const { services, tariffs, settings } = useApp();

  const activeServices = services.filter((s) => s.isActive);

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F9FA] text-[#0B2049]">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link href="/">
            <TinocleanLogo size={36} subtitle="Laundry Management" />
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-600">
            <a href="#services" className="hover:text-[#264099] transition">
              Services
            </a>
            <a href="#pricing" className="hover:text-[#264099] transition">
              Pricing
            </a>
            <a href="#perks" className="hover:text-[#264099] transition">
              Discounts &amp; Perks
            </a>
            <a href="#how-it-works" className="hover:text-[#264099] transition">
              How It Works
            </a>
            <a href="#contact" className="hover:text-[#264099] transition">
              Contact
            </a>
          </nav>

          <div className="flex items-center gap-2.5">
            <Link
              href="/auth/login"
              className="btn-tino-primary h-10 text-xs sm:text-sm px-5 rounded-xl"
            >
              <LogIn className="w-4 h-4" />
              Log in
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 space-y-14">
        {/* 1. HERO SECTION */}
        <section className="relative overflow-hidden rounded-[26px] bg-[#0B2049] text-white p-6 sm:p-10 shadow-xl">
          <div className="absolute -right-16 -top-16 w-72 h-72 rounded-full bg-[#02A1DB]/25 blur-3xl pointer-events-none" />
          <div className="absolute -left-16 -bottom-16 w-64 h-64 rounded-full bg-[#264099]/40 blur-3xl pointer-events-none" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-7 items-center">
            <div className="lg:col-span-6 space-y-4 sm:space-y-5">
              <h1 className="text-[1.9rem] sm:text-4xl lg:text-5xl font-extrabold leading-[1.15] tracking-tight text-white">
                Laundry day, made easier.
              </h1>

              <p className="text-[15.5px] sm:text-lg text-white/95 leading-relaxed font-semibold max-w-xl">
                Book a pickup, drop off your clothes, or arrange delivery anywhere with{" "}
                <span className="text-[#7DE2FF] font-extrabold">zero pickup or delivery fees</span>.
                Track every wash stage live and pay only when you receive your clean laundry.
              </p>

              <div className="grid grid-cols-2 sm:flex sm:flex-row items-center gap-2.5 sm:gap-3.5 pt-2">
                <Link
                  href="/auth/login"
                  className="btn-tino-primary h-11 sm:h-12 px-3.5 sm:px-6 text-[13.5px] sm:text-sm font-bold rounded-[14px] whitespace-nowrap w-full sm:w-auto"
                >
                  <span>Place an order</span>
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </Link>
                <a
                  href={`https://wa.me/${settings.whatsappNumber}?text=${encodeURIComponent(
                    "Hello Tinoclean Laundry, I'd like to learn more about your laundry service."
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 sm:gap-2 h-11 sm:h-12 rounded-[14px] bg-white/15 hover:bg-white/25 border border-white/25 px-3.5 sm:px-5 text-[13.5px] sm:text-sm font-bold text-white whitespace-nowrap w-full sm:w-auto transition"
                >
                  <MessageCircle className="w-4 h-4 text-sky-300 shrink-0" />
                  <span>WhatsApp Us</span>
                </a>
              </div>
            </div>

            {/* Mobile: Single Clean Wide Hero Photo | Tablet & Desktop: 3-Photo Mosaic */}
            <div className="lg:col-span-6">
              {/* Mobile Layout (< md) */}
              <div className="md:hidden rounded-2xl overflow-hidden border border-white/20 shadow-xl h-48">
                <img
                  src="https://images.unsplash.com/photo-1582735689369-4fe89db7114c?auto=format&fit=crop&w=900&q=85"
                  alt="Freshly washed and neatly folded laundry"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Tablet & Desktop Layout (md+) */}
              <div className="hidden md:grid grid-cols-12 gap-3 items-stretch">
                <div className="col-span-7 rounded-2xl overflow-hidden border border-white/15 shadow-2xl h-64 lg:h-72">
                  <img
                    src="https://images.unsplash.com/photo-1582735689369-4fe89db7114c?auto=format&fit=crop&w=900&q=85"
                    alt="Freshly washed and neatly folded laundry stack"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="col-span-5 flex flex-col gap-3 h-64 lg:h-72">
                  <div className="flex-1 rounded-2xl overflow-hidden border border-white/15 shadow-xl">
                    <img
                      src="https://images.unsplash.com/photo-1545173168-9f1947eebb7f?auto=format&fit=crop&w=600&q=85"
                      alt="Modern professional washing machines"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 rounded-2xl overflow-hidden border border-white/15 shadow-xl">
                    <img
                      src="https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?auto=format&fit=crop&w=600&q=85"
                      alt="Clean folded towels and garments"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 2. OUR 4 SERVICES SECTION */}
        <section id="services" className="space-y-5 scroll-mt-20">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wider text-[#02A1DB]">
                What We Wash
              </p>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0B2049]">
                Four Transparent Laundry Services
              </h2>
              <p className="text-[15px] sm:text-base font-semibold text-slate-700 mt-1 leading-relaxed">
                Combine multiple services in a single order — each service is weighed and listed on
                its own line on your ticket.
              </p>
            </div>
            <Link href="/auth/register" className="btn-tino-secondary text-xs self-start">
              Sign Up to Book
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {activeServices.map((srv) => (
              <div
                key={srv.id}
                className="card-tino p-5 flex flex-col justify-between gap-4 hover:border-sky-300 hover:shadow-md transition"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-13 h-13 rounded-[15px] bg-gradient-to-br from-[#eef7fc] to-[#d9eefb] border border-sky-200/70 flex items-center justify-center shadow-xs">
                      <ServiceIcon name={srv.iconName} slug={srv.slug} className="w-7 h-7" />
                    </div>
                    <span className="rounded-full bg-[#F5F9FA] border border-slate-200 px-2.5 py-1 text-xs font-extrabold text-[#264099]">
                      {srv.pricingType === "half_kg_tariff"
                        ? "From GH₵7/kg"
                        : `${formatCurrency(srv.perKgRate)}/kg`}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-[#0B2049]">{srv.name}</h3>
                    <p className="text-[13.5px] sm:text-sm font-medium text-slate-700 mt-1 leading-relaxed">
                      {srv.description}
                    </p>
                  </div>
                </div>
                <Link
                  href="/auth/register"
                  className="text-xs font-extrabold text-[#02A1DB] hover:underline inline-flex items-center gap-1"
                >
                  Book {srv.name}
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* 3. INTERACTIVE PRICING & HALF-KG TARIFF TABLE */}
        <section id="pricing" className="space-y-6 scroll-mt-20">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wider text-[#02A1DB]">
              Clear Half-Kilogram Brackets
            </p>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0B2049]">
              Know Your Price Before You Book
            </h2>
            <p className="text-[15px] sm:text-base font-semibold text-slate-700 mt-1.5 leading-relaxed">
              We record your exact decimal weight and bill using our half-kilogram tariff table (1.0
              kg to 10.0 kg). Weights between brackets round up to the next 0.5 kg (minimum 1.0 kg).
            </p>
          </div>

          {/* Sample Tariff Brackets Table */}
          <div className="card-tino overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-extrabold text-[#0B2049]">
                Wash, Dry &amp; Fold — Half-Kilogram Tariff Table
              </h3>
              <span className="text-xs font-bold text-slate-600">
                Pre-configured up to 10.0 kg
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#F5F9FA] text-left text-xs uppercase tracking-wider text-slate-600">
                  <tr>
                    <th className="px-5 py-3 font-extrabold">Weight Bracket</th>
                    <th className="px-5 py-3 font-extrabold text-emerald-700">
                      Student Tariff
                    </th>
                    <th className="px-5 py-3 font-extrabold text-[#264099]">Regular Tariff</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tariffs
                    .filter((t) => t.isActive)
                    .slice(0, 10)
                    .map((t) => (
                      <tr key={t.id} className="hover:bg-[#F6FFFF]">
                        <td className="px-5 py-2.5 font-bold text-[#0B2049]">
                          {t.weightKg.toFixed(1)} kg
                        </td>
                        <td className="px-5 py-2.5 font-extrabold text-emerald-700">
                          {formatCurrency(t.studentPrice)}
                        </td>
                        <td className="px-5 py-2.5 font-extrabold text-[#264099]">
                          {formatCurrency(t.regularPrice)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* 4. STUDENT VERIFICATION & LOYALTY / REFERRAL PERKS */}
        <section id="perks" className="grid grid-cols-1 md:grid-cols-3 gap-5 scroll-mt-20">
          <div className="card-tino p-6 space-y-3 border-t-4 border-t-emerald-500">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <GraduationCap className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-lg text-[#0B2049]">
              Instant Student Verification
            </h3>
            <p className="text-[14px] sm:text-sm font-medium text-slate-700 leading-relaxed">
              Verify your student email with a 6-digit OTP to unlock the{" "}
              <strong>GH₵7/kg Student Tariff</strong> for 12 months — no student ID card photo
              upload needed.
            </p>
          </div>

          <div className="card-tino p-6 space-y-3 border-t-4 border-t-[#264099]">
            <div className="w-11 h-11 rounded-2xl bg-[#edf5fb] text-[#264099] flex items-center justify-center">
              <Award className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-lg text-[#0B2049]">
              {settings.discountPercent}% Off Every 4th Wash
            </h3>
            <p className="text-[14px] sm:text-sm font-medium text-slate-700 leading-relaxed">
              Complete <strong>{settings.loyaltyWashesRequired} consecutive washes</strong> and your{" "}
              <strong>
                {settings.loyaltyWashesRequired + 1}th order automatically gets{" "}
                {settings.discountPercent}% off
              </strong>{" "}
              the total payable across all services.
            </p>
          </div>

          <div className="card-tino p-6 space-y-3 border-t-4 border-t-[#02A1DB]">
            <div className="w-11 h-11 rounded-2xl bg-sky-50 text-[#02A1DB] flex items-center justify-center">
              <Gift className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-lg text-[#0B2049]">
              {settings.discountPercent}% Referral Rewards
            </h3>
            <p className="text-[14px] sm:text-sm font-medium text-slate-700 leading-relaxed">
              Every account gets a personal referral code and shareable link. When a friend you
              refer completes their first wash, you earn{" "}
              <strong>{settings.discountPercent}% off</strong> your next order.
            </p>
          </div>
        </section>

        {/* 5. HOW IT WORKS */}
        <section id="how-it-works" className="card-tino p-6 sm:p-8 space-y-6 scroll-mt-20">
          <div className="text-center max-w-xl mx-auto space-y-1">
            <p className="text-xs font-extrabold uppercase tracking-wider text-[#02A1DB]">
              Simple 4-Step Process
            </p>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0B2049]">
              How Tinoclean Works
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                step: "01",
                title: "Book Online in 60s",
                desc: "Choose Wash, Dry & Fold, Light/Heavy Duvet, or Same-Day Express.",
                icon: Sparkles,
              },
              {
                step: "02",
                title: "Drop-off, Pickup or Delivery",
                desc: "Drop off your laundry or let us arrange free pickup and delivery anywhere.",
                icon: Truck,
              },
              {
                step: "03",
                title: "Weighed & Ticket Issued",
                desc: "We record actual weight, apply your half-kg bracket, and issue your TAG ticket.",
                icon: Ticket,
              },
              {
                step: "04",
                title: "Pay on Delivery / Collection",
                desc: "Receive live push & email alerts, then pay Cash or MTN MoMo upon receipt.",
                icon: ShieldCheck,
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.step}
                  className="rounded-2xl bg-[#F5F9FA] border border-slate-200/70 p-4 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-[#02A1DB] bg-white px-2.5 py-1 rounded-lg border border-sky-100">
                      STEP {item.step}
                    </span>
                    <Icon className="w-5 h-5 text-[#264099]" />
                  </div>
                  <div className="font-extrabold text-sm text-[#0B2049]">{item.title}</div>
                  <p className="text-[13.5px] font-medium text-slate-700 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* 6. CONTACT, HOURS & PAY WITH MTN MOMO HELP CARD */}
        <section id="contact" className="grid grid-cols-1 lg:grid-cols-12 gap-6 scroll-mt-20">
          <div className="lg:col-span-5 card-tino p-6 space-y-4">
            <h2 className="text-xl font-extrabold text-[#0B2049]">Visit or Contact Tinoclean</h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-[#264099] shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-[#0B2049]">Location &amp; Coverage</div>
                  <div className="text-xs text-slate-600">
                    {settings.location} • Pickup &amp; delivery coverage:{" "}
                    <strong>{settings.coverageAreas}</strong>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-[#02A1DB] shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-[#0B2049]">Business Hours</div>
                  <div className="text-xs text-slate-600">{settings.operatingHours}</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-[#0B2049]">Phone &amp; WhatsApp</div>
                  <div className="text-xs text-slate-600">{settings.phone}</div>
                </div>
              </div>
            </div>

            <div className="pt-2 flex flex-wrap gap-2.5">
              <Link href="/auth/register" className="btn-tino-primary text-xs px-5 py-3">
                Create Your Account
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href={`https://wa.me/${settings.whatsappNumber}`}
                target="_blank"
                rel="noreferrer"
                className="btn-tino-secondary text-xs px-4 py-3"
              >
                <MessageCircle className="w-4 h-4" />
                Chat on WhatsApp
              </a>
            </div>
          </div>

          <div className="lg:col-span-7">
            <MomoHelpCard settings={settings} />
          </div>
        </section>

        {/* PWA Install Prompt */}
        <InstallAppBanner />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200/80 py-6 px-4 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#02A1DB]" />
            <span className="font-bold text-[#0B2049]">{settings.businessName}</span> •{" "}
            {settings.location} • {settings.phone}
          </div>
          <div className="flex items-center gap-4 font-semibold">
            <Link href="/auth/login" className="hover:text-[#264099]">
              Customer Login
            </Link>
            <Link href="/auth/register" className="hover:text-[#264099]">
              Create Account
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
