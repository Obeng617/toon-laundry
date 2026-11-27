"use client";

import React, { useMemo, useState } from "react";
import { Download, Gift, Printer } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useApp } from "@/context/AppContext";
import { formatCurrency } from "@/lib/pricing";
import { getFulfilmentLabel, ORDER_STATUS_META } from "@/lib/workflow";

export default function AdminReportsPage() {
  const { orders, payments, auditLogs } = useApp();
  const [range, setRange] = useState<"today" | "week" | "month" | "all">("all");

  const cutoffMs = useMemo(() => {
    const now = Date.now();
    if (range === "today") return now - 24 * 3600 * 1000;
    if (range === "week") return now - 7 * 24 * 3600 * 1000;
    if (range === "month") return now - 30 * 24 * 3600 * 1000;
    return 0;
  }, [range]);

  const filteredOrders = useMemo(
    () =>
      orders.filter(
        (o) =>
          o.status !== "cancelled" &&
          o.status !== "rejected" &&
          new Date(o.createdAt).getTime() >= cutoffMs
      ),
    [orders, cutoffMs]
  );

  const filteredPayments = useMemo(
    () => payments.filter((p) => new Date(p.createdAt).getTime() >= cutoffMs),
    [payments, cutoffMs]
  );

  // Section 10: Distinguish gross order value, payments received, pending wash orders, and unpaid delivered/collected orders
  const grossOrderValue = filteredOrders.reduce((s, o) => s + o.totalAmount, 0);
  const paymentsReceived = filteredPayments.reduce((s, p) => s + p.amount, 0);
  const cashReceived = filteredPayments
    .filter((p) => p.method === "cash")
    .reduce((s, p) => s + p.amount, 0);
  const momoReceived = filteredPayments
    .filter((p) => p.method === "mobile_money")
    .reduce((s, p) => s + p.amount, 0);

  // Pending orders still being washed (NOT a debt)
  const pendingOrdersBalance = filteredOrders
    .filter((o) => o.status !== "completed" && o.balanceDue > 0)
    .reduce((s, o) => s + o.balanceDue, 0);

  // Cash to collect: orders delivered or collected (completed) but not yet fully paid
  const cashToCollectOrders = filteredOrders.filter(
    (o) => o.status === "completed" && o.balanceDue > 0
  );
  const cashToCollectTotal = cashToCollectOrders.reduce((s, o) => s + o.balanceDue, 0);

  // Student vs Regular breakdown
  const studentOrders = filteredOrders.filter((o) => o.appliedCategory === "student");
  const regularOrders = filteredOrders.filter((o) => o.appliedCategory === "regular");

  // Section 10: Discounts Given report (total loyalty & referral discounts with customers and orders)
  const discountedOrders = filteredOrders.filter(
    (o) => o.discountType !== "none" && o.discountAmount > 0
  );
  const totalLoyaltyDiscounts = discountedOrders
    .filter((o) => o.discountType === "loyalty")
    .reduce((s, o) => s + o.discountAmount, 0);
  const totalReferralDiscounts = discountedOrders
    .filter((o) => o.discountType === "referral" || o.discountType === "manual")
    .reduce((s, o) => s + o.discountAmount, 0);

  const handleExportCsv = () => {
    const headers = [
      "Tag Number",
      "Customer",
      "Phone",
      "Category",
      "Fulfilment",
      "Status",
      "Actual Weight (kg)",
      "Billable Bracket (kg)",
      "Discount Type",
      "Discount Amount (GHS)",
      "Total (GHS)",
      "Paid (GHS)",
      "Balance Due (GHS)",
      "Created At",
    ];
    const rows = filteredOrders.map((o) => [
      o.tagNumber,
      `"${o.customerName.replace(/"/g, '""')}"`,
      o.customerPhone,
      o.appliedCategory,
      o.fulfilmentMethod,
      o.status,
      o.actualWeightKg ?? "",
      o.billableBracketKg ?? "",
      o.discountType,
      o.discountAmount.toFixed(2),
      o.totalAmount.toFixed(2),
      o.amountPaid.toFixed(2),
      o.balanceDue.toFixed(2),
      o.createdAt,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Tinoclean-Report-${range}.csv`;
    a.click();
  };

  return (
    <AppShell mode="admin">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#02A1DB]">
              Business Intelligence
            </p>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B2049]">
              Reports &amp; Analytics
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2 no-print">
            <div className="flex rounded-xl bg-white border border-slate-200 p-1">
              {(["today", "week", "month", "all"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRange(r)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize cursor-pointer ${
                    range === r ? "bg-tino-gradient text-white" : "text-slate-600"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={handleExportCsv}
              className="btn-tino-secondary text-xs px-3.5 py-2"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="btn-tino-primary text-xs px-3.5 py-2"
            >
              <Printer className="w-3.5 h-3.5" />
              Export PDF
            </button>
          </div>
        </div>

        {/* Financial Distinction Cards (Section 10) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card-tino p-4">
            <div className="text-xs font-bold text-slate-500">Gross Order Value</div>
            <div className="text-2xl font-black text-[#0B2049] mt-1">
              {formatCurrency(grossOrderValue)}
            </div>
            <div className="text-[11px] text-slate-400">{filteredOrders.length} orders</div>
          </div>

          <div className="card-tino p-4">
            <div className="text-xs font-bold text-slate-500">Payments Received</div>
            <div className="text-2xl font-black text-emerald-600 mt-1">
              {formatCurrency(paymentsReceived)}
            </div>
            <div className="text-[11px] text-slate-500">
              Cash: {formatCurrency(cashReceived)} • MoMo: {formatCurrency(momoReceived)}
            </div>
          </div>

          <div className="card-tino p-4">
            <div className="text-xs font-bold text-slate-500">Pending (In Wash / Ready)</div>
            <div className="text-2xl font-black text-[#264099] mt-1">
              {formatCurrency(pendingOrdersBalance)}
            </div>
            <div className="text-[11px] text-slate-400">Pay on delivery (not a debt)</div>
          </div>

          <div className="card-tino p-4">
            <div className="text-xs font-bold text-slate-500">Cash to Collect (Unpaid Delivered)</div>
            <div className="text-2xl font-black text-[#FF4D4D] mt-1">
              {formatCurrency(cashToCollectTotal)}
            </div>
            <div className="text-[11px] text-slate-400">
              {cashToCollectOrders.length} delivered/collected orders
            </div>
          </div>
        </div>

        {/* Category & Fulfilment Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="card-tino p-5 space-y-3">
            <h2 className="font-extrabold text-[#0B2049]">Student vs Regular Sales</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-600">
                  UPSA Student Orders ({studentOrders.length})
                </span>
                <span className="font-extrabold text-emerald-700">
                  {formatCurrency(studentOrders.reduce((s, o) => s + o.totalAmount, 0))}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-600">Regular Orders ({regularOrders.length})</span>
                <span className="font-extrabold text-[#264099]">
                  {formatCurrency(regularOrders.reduce((s, o) => s + o.totalAmount, 0))}
                </span>
              </div>
            </div>
          </div>

          <div className="card-tino p-5 space-y-3">
            <h2 className="font-extrabold text-[#0B2049]">Orders by Fulfilment Method</h2>
            <div className="space-y-2 text-sm">
              {(["drop_off", "pickup", "delivery"] as const).map((m) => {
                const list = filteredOrders.filter((o) => o.fulfilmentMethod === m);
                return (
                  <div
                    key={m}
                    className="flex justify-between py-1.5 border-b border-slate-100 last:border-0"
                  >
                    <span className="text-slate-600">
                      {getFulfilmentLabel(m)} ({list.length})
                    </span>
                    <span className="font-bold text-[#0B2049]">
                      {formatCurrency(list.reduce((s, o) => s + o.totalAmount, 0))}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Section 10: Discounts Given Report (Loyalty & Referral) */}
        <div className="card-tino overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-[#02A1DB]" />
              <div>
                <h2 className="font-extrabold text-[#0B2049]">
                  Discounts Given (Loyalty &amp; Referral)
                </h2>
                <p className="text-xs text-slate-500">
                  Loyalty Total: <strong>{formatCurrency(totalLoyaltyDiscounts)}</strong> • Referral
                  Total: <strong>{formatCurrency(totalReferralDiscounts)}</strong>
                </p>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F5F9FA] text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Order Tag</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Discount Type</th>
                  <th className="px-4 py-3">Discount Amount</th>
                  <th className="px-4 py-3">Final Order Total</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {discountedOrders.map((o) => (
                  <tr key={o.id}>
                    <td className="px-4 py-2.5 font-black text-[#0B2049]">{o.tagNumber}</td>
                    <td className="px-4 py-2.5 font-semibold text-slate-700">{o.customerName}</td>
                    <td className="px-4 py-2.5">
                      <span className="rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-0.5 text-xs font-bold uppercase">
                        {o.discountType} ({o.discountPercent}%)
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-extrabold text-emerald-700">
                      -{formatCurrency(o.discountAmount)}
                    </td>
                    <td className="px-4 py-2.5 font-bold text-[#0B2049]">
                      {formatCurrency(o.totalAmount)}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">
                      {new Date(o.createdAt).toLocaleDateString("en-GB")}
                    </td>
                  </tr>
                ))}
                {discountedOrders.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-xs text-slate-500">
                      No discounted orders in this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Cash to Collect Table (Delivered/Collected but Unpaid) */}
        <div className="card-tino overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-extrabold text-[#0B2049]">
              Cash to Collect (Delivered / Collected Orders Not Yet Paid)
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F5F9FA] text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Tag Number</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Balance Outstanding</th>
                  <th className="px-4 py-3">Days Outstanding</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cashToCollectOrders.map((o) => {
                  const days = Math.max(
                    0,
                    Math.floor(
                      (Date.now() - new Date(o.completedAt || o.updatedAt).getTime()) /
                        (24 * 3600 * 1000)
                    )
                  );
                  return (
                    <tr key={o.id}>
                      <td className="px-4 py-2.5 font-black text-[#0B2049]">{o.tagNumber}</td>
                      <td className="px-4 py-2.5 font-semibold">{o.customerName}</td>
                      <td className="px-4 py-2.5 text-xs">{o.customerPhone}</td>
                      <td className="px-4 py-2.5 font-extrabold text-[#FF4D4D]">
                        {formatCurrency(o.balanceDue)}
                      </td>
                      <td className="px-4 py-2.5 text-xs font-bold text-slate-600">{days} days</td>
                    </tr>
                  );
                })}
                {cashToCollectOrders.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-xs text-slate-500">
                      All completed orders have been paid in full.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Audit Trail */}
        <div className="card-tino overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-extrabold text-[#0B2049]">Audit Trail</h2>
          </div>
          <div className="overflow-x-auto max-h-80">
            <table className="w-full text-xs">
              <thead className="bg-[#F5F9FA] text-left font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-2.5">Time</th>
                  <th className="px-4 py-2.5">Actor</th>
                  <th className="px-4 py-2.5">Action</th>
                  <th className="px-4 py-2.5">Target</th>
                  <th className="px-4 py-2.5">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.slice(0, 40).map((a) => (
                  <tr key={a.id}>
                    <td className="px-4 py-2 text-slate-500">
                      {new Date(a.createdAt).toLocaleString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-2 font-bold text-[#0B2049]">{a.actorName}</td>
                    <td className="px-4 py-2 font-mono font-bold text-[#264099]">{a.action}</td>
                    <td className="px-4 py-2 font-semibold">{a.entityId}</td>
                    <td className="px-4 py-2 text-slate-600">{a.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
