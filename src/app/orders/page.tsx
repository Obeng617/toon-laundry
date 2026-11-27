"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, Award, Gift, Package, Plus, Search, Ticket } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useApp } from "@/context/AppContext";
import { formatCurrency } from "@/lib/pricing";
import { getFulfilmentLabel, ORDER_STATUS_META } from "@/lib/workflow";

export default function OrdersPage() {
  const { currentUser, orders, settings } = useApp();
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"active" | "completed" | "all">("all");

  const visibleOrders = orders.filter((o) => {
    if (currentUser?.role === "customer" && o.customerId !== currentUser.id) return false;
    if (
      tab === "active" &&
      (o.status === "completed" || o.status === "cancelled" || o.status === "rejected")
    )
      return false;
    if (tab === "completed" && o.status !== "completed") return false;
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      return (
        o.tagNumber.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        ORDER_STATUS_META[o.status].label.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const washesRequired = settings.loyaltyWashesRequired || 3;
  const streak = currentUser ? Math.min(washesRequired, currentUser.completedWashesStreak) : 0;

  return (
    <AppShell mode="customer">
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#02A1DB]">
              Order Tracking
            </p>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B2049]">
              My Orders &amp; Tickets
            </h1>
          </div>
          <Link href="/book" className="btn-tino-primary text-xs px-4 py-2.5 self-start">
            <Plus className="w-4 h-4" />
            New Order
          </Link>
        </div>

        {/* Section 3: Loyalty Progress & Available Referral Discounts Banner */}
        {currentUser && currentUser.role === "customer" && (
          <div className="card-tino p-4 bg-gradient-to-r from-[#eff8fd] to-white border border-sky-200/80 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-tino-gradient text-white flex items-center justify-center shrink-0">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-extrabold text-[#0B2049]">
                  {currentUser.completedWashesStreak >= washesRequired
                    ? `Your next wash gets ${settings.discountPercent}% off (Loyalty Discount unlocked)!`
                    : `${streak} of ${washesRequired} washes done. Your ${washesRequired + 1}th wash gets ${settings.discountPercent}% off.`}
                </div>
                <div className="text-[11px] text-slate-500">
                  Referral code: <strong className="text-[#264099]">{currentUser.referralCode}</strong>
                </div>
              </div>
            </div>

            {(currentUser.availableReferralDiscounts > 0 ||
              currentUser.manualDiscountsAvailable > 0) && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 text-emerald-800 px-3 py-1 text-xs font-extrabold">
                <Gift className="w-3.5 h-3.5" />
                {currentUser.availableReferralDiscounts + currentUser.manualDiscountsAvailable} ×{" "}
                {settings.discountPercent}% Referral Discount Available
              </span>
            )}
          </div>
        )}

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by tag number (e.g. TAG #0018) or status..."
              className="input-tino pl-10"
            />
          </div>
          <div className="flex rounded-xl bg-white border border-slate-200 p-1 self-start">
            {(["all", "active", "completed"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold capitalize transition cursor-pointer ${
                  tab === t ? "bg-tino-gradient text-white" : "text-slate-600 hover:text-[#0B2049]"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Orders List */}
        {visibleOrders.length === 0 ? (
          <div className="card-tino p-10 text-center space-y-3">
            <Package className="w-10 h-10 text-slate-300 mx-auto" />
            <div className="font-bold text-[#0B2049]">No orders found</div>
            <p className="text-xs text-slate-500">
              Place a new order to receive your numbered Tinoclean digital ticket.
            </p>
            <Link href="/book" className="btn-tino-primary text-xs px-4 py-2.5">
              Place an Order
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {visibleOrders.map((order) => {
              const meta = ORDER_STATUS_META[order.status];
              return (
                <Link
                  key={order.id}
                  href={`/orders/${order.id}`}
                  className="card-tino p-5 hover:border-sky-300 hover:shadow-md transition space-y-3.5 block"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-lg font-black text-[#0B2049] truncate">
                        {order.tagNumber}
                      </div>
                      <div className="text-xs text-slate-500 font-medium">
                        {getFulfilmentLabel(order.fulfilmentMethod)} •{" "}
                        {new Date(order.createdAt).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                    <span
                      className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1 text-[11px] font-bold ${meta.badgeClass}`}
                    >
                      {meta.label}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 rounded-xl bg-[#F5F9FA] p-3 text-xs">
                    <div>
                      <div className="text-slate-400">Weight</div>
                      <div className="font-bold text-[#0B2049]">
                        {order.actualWeightKg
                          ? `${order.actualWeightKg.toFixed(2)} kg`
                          : `~${order.estimatedWeightKg || 1} kg`}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400">Total</div>
                      <div className="font-bold text-[#0B2049]">
                        {formatCurrency(order.totalAmount)}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400">Balance Due</div>
                      <div
                        className={`font-extrabold ${
                          order.balanceDue === 0 ? "text-emerald-600" : "text-[#FF4D4D]"
                        }`}
                      >
                        {order.balanceDue === 0 ? "PAID" : formatCurrency(order.balanceDue)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs font-bold text-[#264099]">
                    <span className="inline-flex items-center gap-1.5">
                      <Ticket className="w-4 h-4 text-[#02A1DB]" />
                      Track progress &amp; digital ticket
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
