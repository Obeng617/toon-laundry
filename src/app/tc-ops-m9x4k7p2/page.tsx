"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowRight,
  ClipboardList,
  CreditCard,
  GraduationCap,
  PlusCircle,
  Tag,
  Trash2,
  Wallet,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useApp } from "@/context/AppContext";
import { formatCurrency } from "@/lib/pricing";
import { ORDER_STATUS_META } from "@/lib/workflow";

export default function AdminOverviewPage() {
  const { currentUser, orders, payments, users, deleteOrder } = useApp();

  const newOrders = orders.filter((o) => o.status === "order_placed").length;
  const inProgress = orders.filter((o) =>
    [
      "order_confirmed",
      "pickup_scheduled",
      "laundry_received",
      "washing_in_progress",
      "drying_in_progress",
      "ironing_and_folding",
      "out_for_delivery",
    ].includes(o.status)
  ).length;
  const readyForCollection = orders.filter((o) => o.status === "ready_for_collection").length;
  const paymentsReceived = payments.reduce((sum, p) => sum + p.amount, 0);
  const verifiedStudents = users.filter((u) => u.studentStatus === "verified").length;

  return (
    <AppShell mode="admin">
      <div className="space-y-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[#02A1DB]">
            Control Centre
          </p>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B2049]">Dashboard Overview</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Monitor incoming laundry, track wash stages, record payments and manage tariffs.
          </p>
        </div>

        {/* Summary KPI Cards (Section 5) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card-tino p-5 space-y-1">
            <div className="text-xs font-bold text-slate-500">New Orders</div>
            <div className="text-3xl font-black text-[#264099]">{newOrders}</div>
            <div className="text-xs text-slate-400">Awaiting confirmation</div>
          </div>
          <div className="card-tino p-5 space-y-1">
            <div className="text-xs font-bold text-slate-500">In Progress</div>
            <div className="text-3xl font-black text-amber-500">{inProgress}</div>
            <div className="text-xs text-slate-400">Across active stages</div>
          </div>
          <div className="card-tino p-5 space-y-1">
            <div className="text-xs font-bold text-slate-500">Ready for Collection</div>
            <div className="text-3xl font-black text-emerald-600">{readyForCollection}</div>
            <div className="text-xs text-slate-400">Awaiting customers</div>
          </div>
          <div className="card-tino p-5 space-y-1">
            <div className="text-xs font-bold text-slate-500">Payments Received</div>
            <div className="text-2xl sm:text-3xl font-black text-[#0B2049]">
              {formatCurrency(paymentsReceived)}
            </div>
            <div className="text-xs text-slate-400">Cash &amp; Mobile Money</div>
          </div>
        </div>

        {/* Recent Orders + Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2 card-tino overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="font-extrabold text-[#0B2049]">Recent Orders</h2>
                <p className="text-xs text-slate-500">Review incoming laundry and update progress</p>
              </div>
              <Link
                href="/tc-ops-m9x4k7p2/orders"
                className="text-xs font-bold text-[#02A1DB] hover:underline inline-flex items-center gap-1"
              >
                Manage all
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#F5F9FA] text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Order</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Weight</th>
                    <th className="px-4 py-3">Total</th>
                    <th className="px-4 py-3">Status</th>
                    {currentUser?.role === "admin" && (
                      <th className="px-4 py-3 text-right">Action</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.slice(0, 8).map((o) => (
                    <tr key={o.id} className="hover:bg-[#F6FFFF]">
                      <td className="px-4 py-3 font-extrabold text-[#0B2049]">
                        <Link
                          href={`/tc-ops-m9x4k7p2/orders?tag=${encodeURIComponent(o.tagNumber)}`}
                          className="hover:text-[#02A1DB]"
                        >
                          {o.tagNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-700">
                        <div>{o.customerName}</div>
                        <div className="text-[11px] text-slate-400 uppercase">
                          {o.appliedCategory}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {o.actualWeightKg
                          ? `${o.actualWeightKg.toFixed(2)} kg (${o.billableBracketKg?.toFixed(1)} kg)`
                          : `Est. ${o.estimatedWeightKg || 1} kg`}
                      </td>
                      <td className="px-4 py-3 font-bold text-[#0B2049]">
                        <div>{formatCurrency(o.totalAmount)}</div>
                        <div
                          className={`text-[10px] font-bold uppercase ${
                            o.paymentStatus === "paid" ? "text-emerald-600" : "text-amber-600"
                          }`}
                        >
                          {o.paymentStatus.replace("_", " ")}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${
                            ORDER_STATUS_META[o.status].badgeClass
                          }`}
                        >
                          {ORDER_STATUS_META[o.status].shortLabel}
                        </span>
                      </td>
                      {currentUser?.role === "admin" && (
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={async () => {
                              if (
                                window.confirm(
                                  `Delete ${o.tagNumber} (${o.customerName}) permanently?`
                                )
                              ) {
                                await deleteOrder(o.id, "Deleted from Admin Overview");
                              }
                            }}
                            title={`Delete ${o.tagNumber}`}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 px-2.5 py-1 text-xs font-bold transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                  {orders.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-xs text-slate-500">
                        No orders recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card-tino p-5 space-y-3">
            <h2 className="font-extrabold text-[#0B2049]">Quick Actions</h2>
            <div className="space-y-2.5">
              <Link
                href="/tc-ops-m9x4k7p2/orders?new=1"
                className="flex items-center justify-between rounded-2xl bg-tino-gradient text-white px-4 py-3.5 text-sm font-bold shadow-sm hover:opacity-95 transition"
              >
                <span className="flex items-center gap-2.5">
                  <PlusCircle className="w-4 h-4" />
                  Create Walk-in Order
                </span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                href="/tc-ops-m9x4k7p2/student-requests"
                className="flex items-center justify-between rounded-2xl bg-[#edf6fc] hover:bg-sky-100 text-[#264099] px-4 py-3 text-sm font-bold transition"
              >
                <span className="flex items-center gap-2.5">
                  <GraduationCap className="w-4 h-4" />
                  UPSA Verified Students
                </span>
                <span className="rounded-full bg-[#264099] text-white text-xs font-extrabold px-2 py-0.5">
                  {verifiedStudents}
                </span>
              </Link>

              <Link
                href="/tc-ops-m9x4k7p2/payments"
                className="flex items-center justify-between rounded-2xl bg-[#edf6fc] hover:bg-sky-100 text-[#264099] px-4 py-3 text-sm font-bold transition"
              >
                <span className="flex items-center gap-2.5">
                  <CreditCard className="w-4 h-4" />
                  Record Payment
                </span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                href="/tc-ops-m9x4k7p2/pricing"
                className="flex items-center justify-between rounded-2xl bg-[#edf6fc] hover:bg-sky-100 text-[#264099] px-4 py-3 text-sm font-bold transition"
              >
                <span className="flex items-center gap-2.5">
                  <Tag className="w-4 h-4" />
                  Update Service Prices
                </span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                href="/tc-ops-m9x4k7p2/reports"
                className="flex items-center justify-between rounded-2xl bg-[#F5F9FA] hover:bg-slate-100 text-[#0B2049] px-4 py-3 text-sm font-bold transition"
              >
                <span className="flex items-center gap-2.5">
                  <Wallet className="w-4 h-4 text-[#02A1DB]" />
                  Cash, Discounts &amp; Reports
                </span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                href="/tc-ops-m9x4k7p2/orders"
                className="flex items-center justify-between rounded-2xl bg-[#F5F9FA] hover:bg-slate-100 text-[#0B2049] px-4 py-3 text-sm font-bold transition"
              >
                <span className="flex items-center gap-2.5">
                  <ClipboardList className="w-4 h-4 text-[#264099]" />
                  Weigh &amp; Issue Tickets
                </span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
