"use client";

import React, { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Calendar,
  CheckCircle2,
  Gift,
  Home as HomeIcon,
  MapPin,
  ShieldCheck,
  Store,
  Truck,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ServiceIcon } from "@/components/ServiceIcon";
import { useApp } from "@/context/AppContext";
import { buildOrderItemsAndTotals, formatCurrency } from "@/lib/pricing";
import { DiscountType, FulfilmentMethod } from "@/lib/types";

function BookOrderForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentUser, services, tariffs, settings, placeOrder } = useApp();

  const activeServices = services.filter((s) => s.isActive);
  const initialSlug = searchParams.get("service");
  const defaultService =
    activeServices.find((s) => s.slug === initialSlug) || activeServices[0];

  // Multi-service weights map: serviceId -> weightKg (0 if not selected)
  const [serviceWeights, setServiceWeights] = useState<Record<string, number>>(() =>
    defaultService ? { [defaultService.id]: 1.5 } : {}
  );
  const [fulfilmentMethod, setFulfilmentMethod] = useState<FulfilmentMethod>("drop_off");
  const [customerName, setCustomerName] = useState(currentUser?.fullName || "");
  const [customerPhone, setCustomerPhone] = useState(currentUser?.phone || "");
  const [address, setAddress] = useState(currentUser?.defaultAddress || "");
  const [scheduledAt, setScheduledAt] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const category = currentUser?.studentStatus === "verified" ? "student" : "regular";

  // Check if customer qualifies for ONE 10% discount (Section 3)
  const activeDiscountType: DiscountType = useMemo(() => {
    if (!currentUser) return "none";
    if (currentUser.completedWashesStreak >= settings.loyaltyWashesRequired) return "loyalty";
    if (currentUser.availableReferralDiscounts > 0) return "referral";
    if (currentUser.manualDiscountsAvailable > 0) return "manual";
    return "none";
  }, [currentUser, settings.loyaltyWashesRequired]);

  const serviceLines = useMemo(
    () =>
      Object.entries(serviceWeights)
        .filter(([, w]) => w > 0)
        .map(([serviceId, weightKg]) => ({ serviceId, weightKg })),
    [serviceWeights]
  );

  const estimate = useMemo(
    () =>
      buildOrderItemsAndTotals({
        lines: serviceLines,
        services: activeServices,
        tariffs,
        category,
        discountType: activeDiscountType,
        discountPercent: settings.discountPercent,
        isEstimated: true,
      }),
    [serviceLines, activeServices, tariffs, category, activeDiscountType, settings.discountPercent]
  );

  const toggleService = (serviceId: string) => {
    setServiceWeights((prev) => {
      const current = prev[serviceId] || 0;
      if (current > 0) {
        const next = { ...prev };
        delete next[serviceId];
        return next;
      }
      return { ...prev, [serviceId]: 1.5 };
    });
  };

  const setWeightForService = (serviceId: string, weightKg: number) => {
    setServiceWeights((prev) => ({
      ...prev,
      [serviceId]: Math.max(0.5, Number(weightKg) || 1.0),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (serviceLines.length === 0) {
      setError("Please select at least one laundry service.");
      return;
    }

    const finalName = customerName.trim() || currentUser?.fullName || "";
    const finalPhone = customerPhone.trim() || currentUser?.phone || "";
    if (!finalName || !finalPhone) {
      setError("Please enter your name and phone number.");
      return;
    }
    if ((fulfilmentMethod === "pickup" || fulfilmentMethod === "delivery") && !address.trim()) {
      setError(
        `Please enter your ${fulfilmentMethod === "pickup" ? "pickup" : "delivery"} address.`
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await placeOrder({
        customerId: currentUser?.id,
        customerName: finalName,
        customerPhone: finalPhone,
        customerEmail: currentUser?.email,
        fulfilmentMethod,
        pickupAddress: fulfilmentMethod === "pickup" ? address.trim() : undefined,
        pickupScheduledAt: fulfilmentMethod === "pickup" && scheduledAt ? scheduledAt : undefined,
        deliveryAddress: fulfilmentMethod === "delivery" ? address.trim() : undefined,
        deliveryScheduledAt:
          fulfilmentMethod === "delivery" && scheduledAt ? scheduledAt : undefined,
        dropOffScheduledAt:
          fulfilmentMethod === "drop_off" && scheduledAt ? scheduledAt : undefined,
        specialInstructions: specialInstructions.trim() || undefined,
        serviceLines,
      });

      if (!res.ok || !res.order) {
        setError(res.error || "Could not place order.");
        return;
      }
      router.push(`/orders/${res.order.id}?placed=1`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-5">
        {/* Step 1: Select One or More Services + Weight per Service (Section 3) */}
        <section className="card-tino p-5 space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-tino-gradient text-white text-xs font-extrabold flex items-center justify-center">
              1
            </span>
            <div>
              <h2 className="font-extrabold text-[#0B2049]">
                Select Services &amp; Estimated Weight
              </h2>
              <p className="text-xs text-slate-500">
                You can select one or more services. Each service is weighed and billed as its own
                line on your ticket.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {activeServices.map((srv) => {
              const weight = serviceWeights[srv.id] || 0;
              const selected = weight > 0;
              return (
                <div
                  key={srv.id}
                  className={`rounded-2xl border p-4 space-y-3 transition ${
                    selected
                      ? "border-[#02A1DB] bg-[#eff8fd] ring-2 ring-[#02A1DB]/20"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleService(srv.id)}
                    className="w-full text-left flex items-start gap-3 cursor-pointer"
                  >
                    <div className="w-11 h-11 rounded-[13px] bg-gradient-to-br from-[#eef7fc] to-[#d9eefb] border border-sky-200/70 flex items-center justify-center shrink-0 shadow-xs">
                      <ServiceIcon name={srv.iconName} slug={srv.slug} className="w-6 h-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-sm text-[#0B2049]">{srv.name}</span>
                        <span className="text-xs font-extrabold text-[#264099]">
                          {srv.pricingType === "half_kg_tariff"
                            ? category === "student"
                              ? "GH₵7/kg"
                              : "GH₵8/kg"
                            : `GH₵${srv.perKgRate}/kg`}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">{srv.description}</div>
                    </div>
                  </button>

                  {selected && (
                    <div className="pt-2 border-t border-sky-200/70 flex items-center justify-between gap-3">
                      <label className="text-xs font-bold text-[#0B2049]">
                        Est. Weight (kg):
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="0.5"
                        max="50"
                        value={weight}
                        onChange={(e) => setWeightForService(srv.id, Number(e.target.value))}
                        className="input-tino bg-white w-28 py-1.5 text-center font-bold"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Step 2: Fulfilment Method (No Pickup or Delivery Fees — Section 2 & 3) */}
        <section className="card-tino p-5 space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-tino-gradient text-white text-xs font-extrabold flex items-center justify-center">
              2
            </span>
            <h2 className="font-extrabold text-[#0B2049]">Choose Fulfilment Method</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                id: "drop_off" as const,
                title: "Customer Drop-off",
                desc: "Hand in laundry at our shop",
                icon: Store,
              },
              {
                id: "pickup" as const,
                title: "Tinoclean Pickup",
                desc: "We arrange pickup from your location",
                icon: HomeIcon,
              },
              {
                id: "delivery" as const,
                title: "Delivery",
                desc: "We deliver completed laundry to you",
                icon: Truck,
              },
            ].map((opt) => {
              const Icon = opt.icon;
              const selected = fulfilmentMethod === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setFulfilmentMethod(opt.id)}
                  className={`text-left rounded-2xl border p-3.5 space-y-1.5 transition cursor-pointer ${
                    selected
                      ? "border-[#02A1DB] bg-[#eff8fd] ring-2 ring-[#02A1DB]/20"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Icon className={`w-5 h-5 ${selected ? "text-[#264099]" : "text-slate-400"}`} />
                    <span className="text-xs font-extrabold text-emerald-600">No extra fee</span>
                  </div>
                  <div className="font-bold text-sm text-[#0B2049]">{opt.title}</div>
                  <div className="text-xs text-slate-500">{opt.desc}</div>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Your full name"
                className="input-tino"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Phone Number</label>
              <input
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={15}
                required
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, ""))}
                placeholder="0551750854"
                className="input-tino"
              />
            </div>
          </div>

          {(fulfilmentMethod === "pickup" || fulfilmentMethod === "delivery") && (
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                <MapPin className="w-3.5 h-3.5 inline mr-1 text-[#02A1DB]" />
                {fulfilmentMethod === "pickup"
                  ? "Pickup Address / Hostel & Room"
                  : "Delivery Address / Hostel & Room"}
              </label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. UPSA Hostel Block A, Room 105"
                className="input-tino"
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                <Calendar className="w-3.5 h-3.5 inline mr-1 text-[#02A1DB]" />
                Preferred Date &amp; Time (Optional)
              </label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="input-tino"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Special Instructions (Optional)
              </label>
              <input
                type="text"
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                placeholder="e.g. Separate whites, fold shirts"
                className="input-tino"
              />
            </div>
          </div>
        </section>
      </div>

      {/* Summary Column */}
      <aside className="space-y-4">
        <div className="card-tino p-5 space-y-4 sticky top-20">
          <h2 className="font-extrabold text-lg text-[#0B2049]">Order Summary</h2>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Customer Category</span>
              <span className="font-bold uppercase text-[#264099]">{category}</span>
            </div>

            {estimate.items.map((item) => (
              <div
                key={item.id}
                className={`flex justify-between gap-2 ${
                  item.itemType === "discount" ? "text-emerald-700 font-bold" : ""
                }`}
              >
                <span className={item.itemType === "discount" ? "text-emerald-700" : "text-slate-600"}>
                  {item.label}
                </span>
                <span className="font-bold shrink-0">{formatCurrency(item.lineTotal)}</span>
              </div>
            ))}

            <div className="border-t border-slate-200 pt-3 flex justify-between text-base font-extrabold text-[#0B2049]">
              <span>Estimated Total</span>
              <span className="text-[#264099]">{formatCurrency(estimate.totalAmount)}</span>
            </div>
          </div>

          {activeDiscountType !== "none" && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-900 flex items-start gap-2">
              <Gift className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong>{settings.discountPercent}% {activeDiscountType} discount applied!</strong>{" "}
                Shown as its own negative line on your order and digital ticket.
              </span>
            </div>
          )}

          <div className="rounded-xl bg-sky-50 border border-sky-200 p-3 text-xs text-[#0B2049] flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-[#264099] shrink-0 mt-0.5" />
            <span>
              <strong>Pay on delivery or collection:</strong> Cash or manual MTN MoMo to GhanaPay{" "}
              <strong>{settings.momoNumber}</strong> ({settings.momoAccountName}).
            </span>
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs font-semibold text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="btn-tino-primary w-full py-3.5 text-sm"
          >
            <CheckCircle2 className="w-4 h-4" />
            {submitting ? "Placing Order..." : "Confirm Order"}
          </button>
        </div>
      </aside>
    </form>
  );
}

export default function BookPage() {
  return (
    <AppShell mode="customer">
      <div className="space-y-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[#02A1DB]">New Booking</p>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B2049]">Place an Order</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Select your laundry services — receive your numbered digital ticket as soon as we weigh
            your laundry.
          </p>
        </div>
        <Suspense
          fallback={
            <div className="card-tino p-8 text-center text-sm text-slate-500">
              Loading booking form...
            </div>
          }
        >
          <BookOrderForm />
        </Suspense>
      </div>
    </AppShell>
  );
}
