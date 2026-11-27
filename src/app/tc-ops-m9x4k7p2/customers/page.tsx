"use client";

import React, { useState } from "react";
import { Gift, GraduationCap, Minus, Plus, Search, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useApp } from "@/context/AppContext";
import { formatCurrency } from "@/lib/pricing";

export default function AdminCustomersPage() {
  const { users, orders, settings, adjustCustomerDiscount } = useApp();
  const [query, setQuery] = useState("");
  const [discountModalUser, setDiscountModalUser] = useState<string | null>(null);
  const [discountDelta, setDiscountDelta] = useState<1 | -1>(1);
  const [discountReason, setDiscountReason] = useState("");
  const [err, setErr] = useState("");

  const customers = users
    .filter((u) => u.role === "customer")
    .filter((u) => {
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return (
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.phone.toLowerCase().includes(q) ||
        (u.upsaEmail || "").toLowerCase().includes(q)
      );
    });

  const handleAdjustDiscount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!discountModalUser) return;
    setErr("");
    const res = await adjustCustomerDiscount(discountModalUser, discountDelta, discountReason);
    if (!res.ok) {
      setErr(res.error || "Could not update discount.");
      return;
    }
    setDiscountModalUser(null);
    setDiscountReason("");
  };

  return (
    <AppShell mode="admin">
      <div className="space-y-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[#02A1DB]">Directory</p>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B2049]">Customers</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            View customer history, loyalty streak ({settings.loyaltyWashesRequired} washes),
            referral codes and manage manual discounts.
          </p>
        </div>

        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search customer name, email, UPSA email or phone..."
            className="input-tino pl-10"
          />
        </div>

        <div className="card-tino overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F5F9FA] text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">UPSA Student</th>
                  <th className="px-4 py-3">Loyalty &amp; Discounts</th>
                  <th className="px-4 py-3">Orders / Spend</th>
                  <th className="px-4 py-3 text-right">Manage Discount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map((c) => {
                  const custOrders = orders.filter((o) => o.customerId === c.id);
                  const spend = custOrders.reduce((s, o) => s + o.totalAmount, 0);
                  const totalDiscountsAvailable =
                    c.availableReferralDiscounts + c.manualDiscountsAvailable;
                  return (
                    <tr key={c.id} className="hover:bg-[#F6FFFF]">
                      <td className="px-4 py-3">
                        <div className="font-bold text-[#0B2049]">{c.fullName}</div>
                        <div className="text-xs text-slate-400">
                          Ref Code: <strong className="text-[#264099]">{c.referralCode}</strong>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        <div>{c.phone || "—"}</div>
                        <div className="text-slate-400">{c.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        {c.studentStatus === "verified" ? (
                          <div>
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-0.5 text-xs font-bold">
                              <GraduationCap className="w-3.5 h-3.5" />
                              Verified
                            </span>
                            <div className="text-[11px] text-slate-400 mt-0.5">{c.upsaEmail}</div>
                          </div>
                        ) : (
                          <span className="rounded-full bg-slate-100 text-slate-600 px-2.5 py-0.5 text-xs font-bold">
                            Regular
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <div className="font-bold text-[#0B2049]">
                          Streak: {c.completedWashesStreak} / {settings.loyaltyWashesRequired}
                        </div>
                        <div className="text-emerald-700 font-semibold">
                          {totalDiscountsAvailable} × {settings.discountPercent}% available
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-[#0B2049]">{custOrders.length} orders</div>
                        <div className="text-xs font-bold text-[#264099]">
                          {formatCurrency(spend)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setDiscountModalUser(c.id);
                              setDiscountDelta(1);
                              setErr("");
                            }}
                            className="inline-flex items-center gap-1 rounded-xl bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-bold text-emerald-800 hover:bg-emerald-100 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Add 10%
                          </button>
                          {c.manualDiscountsAvailable > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                setDiscountModalUser(c.id);
                                setDiscountDelta(-1);
                                setErr("");
                              }}
                              className="inline-flex items-center gap-1 rounded-xl bg-red-50 border border-red-200 px-2.5 py-1 text-xs font-bold text-red-700 hover:bg-red-100 cursor-pointer"
                            >
                              <Minus className="w-3.5 h-3.5" />
                              Remove
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {customers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-xs text-slate-500">
                      No customers found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add/Remove Customer Discount Modal (Section 3: logged in audit trail) */}
        {discountModalUser && (
          <div className="fixed inset-0 z-50 bg-[#0B2049]/50 backdrop-blur-xs flex items-center justify-center p-4">
            <form
              onSubmit={handleAdjustDiscount}
              className="card-tino w-full max-w-md p-6 space-y-4 bg-white"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-extrabold text-[#0B2049]">
                  <Gift className="w-5 h-5 text-[#02A1DB]" />
                  {discountDelta > 0
                    ? `Add ${settings.discountPercent}% Discount`
                    : `Remove ${settings.discountPercent}% Discount`}
                </div>
                <button
                  type="button"
                  onClick={() => setDiscountModalUser(null)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-slate-500">
                Enter the reason for this discount adjustment. It will be saved permanently in the
                audit trail.
              </p>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Reason</label>
                <input
                  type="text"
                  required
                  value={discountReason}
                  onChange={(e) => setDiscountReason(e.target.value)}
                  placeholder="e.g. Referral credit or customer goodwill"
                  className="input-tino"
                />
              </div>
              {err && <p className="text-xs font-bold text-red-600">{err}</p>}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDiscountModalUser(null)}
                  className="btn-tino-secondary text-xs px-4 py-2"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-tino-primary text-xs px-4 py-2">
                  Confirm &amp; Log
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </AppShell>
  );
}
