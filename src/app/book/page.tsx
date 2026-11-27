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
import { DiscountType, FulfilmentMethod } from "@/lib/types";

function BookOrderForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentUser, services, settings, placeOrder } = useApp();

  const activeServices = services.filter((s) => s.isActive);
  const initialSlug = searchParams.get("service");
  const defaultService =
    activeServices.find((s) => s.slug === initialSlug) || activeServices[0];

  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(() =>
    defaultService ? [defaultService.id] : []
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

  const selectedServices = useMemo(
    () => activeServices.filter((s) => selectedServiceIds.includes(s.id)),
    [activeServices, selectedServiceIds]
  );

  const toggleService = (serviceId: string) => {
    setSelectedServiceIds((prev) =>
      prev.includes(serviceId) ? prev.filter((id) => id !== serviceId) : [...prev, serviceId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (selectedServiceIds.length === 0) {
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
        serviceLines: selectedServiceIds.map((serviceId) => ({ serviceId, weightKg: 1 })),
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
        {/* Step 1: Select One or More Services (Staff weighs laundry at drop-off/pickup) */}
        <section className="card-tino p-5 space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-tino-gradient text-white text-xs font-extrabold flex items-center justify-center">
              1
            </span>
            <div>
              <h2 className="font-extrabold text-[#0B2049]">Select Services</h2>
              <p className="text-xs text-slate-500">
                Choose the service(s) you want. Our staff will weigh your laundry and send your
                digital ticket with the exact price.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {activeServices.map((srv) => {
              const selected = selectedServiceIds.includes(srv.id);
              return (
                <button
                  key={srv.id}
                  type="button"
                  onClick={() => toggleService(srv.id)}
                  className={`w-full text-left rounded-2xl border p-4 flex items-start gap-3 transition cursor-pointer ${
                    selected
                      ? "border-[#02A1DB] bg-[#eff8fd] ring-2 ring-[#02A1DB]/20"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="w-11 h-11 rounded-[13px] bg-gradient-to-br from-[#eef7fc] to-[#d9eefb] border border-sky-200/70 flex items-center justify-center shrink-0 shadow-xs">
                    <ServiceIcon name={srv.iconName} slug={srv.slug} className="w-6 h-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-sm text-[#0B2049]">{srv.name}</span>
                      {selected && (
                        <CheckCircle2 className="w-4 h-4 text-[#02A1DB] shrink-0" />
                      )}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">{srv.description}</div>
                  </div>
                </button>
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
              <label className="block text-xs font-bold text-slate-600 mb-1">
                WhatsApp Phone Number
              </label>
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
              <p className="text-[11px] font-semibold text-[#264099] mt-1">
                Provide your active WhatsApp number — your digital ticket will be sent to you on
                WhatsApp.
              </p>
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

          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Customer Category</span>
              <span className="font-bold uppercase text-[#264099]">{category}</span>
            </div>

            <div className="border-t border-slate-100 pt-2.5 space-y-1.5">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Selected Services ({selectedServices.length})
              </div>
              {selectedServices.length > 0 ? (
                selectedServices.map((srv) => (
                  <div key={srv.id} className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-[#0B2049]">{srv.name}</span>
                    <span className="text-xs font-semibold text-slate-500 shrink-0">
                      To be weighed
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-400">No services selected yet.</div>
              )}
            </div>

            <div className="border-t border-slate-200 pt-3 flex items-center justify-between text-sm font-extrabold text-[#0B2049]">
              <span>Final Total</span>
              <span className="text-[#264099]">Calculated after weighing</span>
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
