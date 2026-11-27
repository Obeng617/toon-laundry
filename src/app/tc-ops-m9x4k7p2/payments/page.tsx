"use client";

import React, { useState } from "react";
import { AlertTriangle, CheckCircle2, CreditCard, Search, Ticket, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { DigitalTicket } from "@/components/DigitalTicket";
import { useApp } from "@/context/AppContext";
import { formatCurrency } from "@/lib/pricing";
import { PaymentMethod } from "@/lib/types";
import { ORDER_STATUS_META } from "@/lib/workflow";

export default function AdminPaymentsPage() {
  const { orders, payments, settings, recordPayment } = useApp();

  const [selectedOrderId, setSelectedOrderId] = useState(
    orders.find((o) => o.balanceDue > 0)?.id || orders[0]?.id || ""
  );
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [momoReference, setMomoReference] = useState("");
  const [notes, setNotes] = useState("");
  const [query, setQuery] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [receiptOrderId, setReceiptOrderId] = useState<string | null>(null);

  const unpaidOrders = orders.filter((o) => o.balanceDue > 0 && o.status !== "cancelled" && o.status !== "rejected");
  const selectedOrder = orders.find((o) => o.id === selectedOrderId);

  const totalCashReceived = payments
    .filter((p) => p.method === "cash")
    .reduce((s, p) => s + p.amount, 0);
  const totalMomoReceived = payments
    .filter((p) => p.method === "mobile_money")
    .reduce((s, p) => s + p.amount, 0);

  // Section 10: Only orders already delivered/completed or ready/collected and not paid count as cash to collect
  const deliveredUnpaidTotal = orders
    .filter((o) => o.status === "completed" && o.balanceDue > 0)
    .reduce((s, o) => s + o.balanceDue, 0);

  const pendingWashTotal = orders
    .filter(
      (o) =>
        o.status !== "completed" &&
        o.status !== "cancelled" &&
        o.status !== "rejected" &&
        o.balanceDue > 0
    )
    .reduce((s, o) => s + o.balanceDue, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setMsg("");
    if (!selectedOrder) {
      setErr("Select an order first.");
      return;
    }

    const payVal = Number(amount) || selectedOrder.balanceDue;
    const res = await recordPayment({
      orderId: selectedOrder.id,
      amount: payVal,
      method,
      momoReference: method === "mobile_money" ? momoReference : undefined,
      notes,
    });

    if (!res.ok) {
      setErr(res.error || "Could not record payment.");
      return;
    }
    setMsg(`Recorded ${formatCurrency(payVal)} for ${selectedOrder.tagNumber}. Receipt updated!`);
    setAmount("");
    setMomoReference("");
    setNotes("");
  };

  const receiptOrder = orders.find((o) => o.id === receiptOrderId);

  return (
    <AppShell mode="admin">
      <div className="space-y-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[#02A1DB]">
            Pay on Delivery or Collection
          </p>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B2049]">
            Payments &amp; Receipts
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Record Cash or manual MTN Mobile Money sent to GhanaPay wallet{" "}
            <strong>{settings.momoNumber}</strong> (recipient <strong>{settings.momoAccountName}</strong>
            ).
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card-tino p-4">
            <div className="text-xs font-bold text-slate-500">Cash Collected</div>
            <div className="text-2xl font-black text-emerald-600 mt-1">
              {formatCurrency(totalCashReceived)}
            </div>
          </div>
          <div className="card-tino p-4">
            <div className="text-xs font-bold text-slate-500">MTN MoMo Collected</div>
            <div className="text-2xl font-black text-[#02A1DB] mt-1">
              {formatCurrency(totalMomoReceived)}
            </div>
          </div>
          <div className="card-tino p-4">
            <div className="text-xs font-bold text-slate-500">Pending (In Wash / Ready)</div>
            <div className="text-2xl font-black text-[#264099] mt-1">
              {formatCurrency(pendingWashTotal)}
            </div>
            <div className="text-[11px] text-slate-400">Payable upon delivery/collection</div>
          </div>
          <div className="card-tino p-4">
            <div className="text-xs font-bold text-slate-500">Unpaid Delivered Orders</div>
            <div className="text-2xl font-black text-[#FF4D4D] mt-1">
              {formatCurrency(deliveredUnpaidTotal)}
            </div>
            <div className="text-[11px] text-slate-400">Completed with balance due</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Record Payment Form */}
          <form onSubmit={handleSubmit} className="card-tino p-5 space-y-4">
            <div className="flex items-center gap-2 font-extrabold text-[#0B2049]">
              <CreditCard className="w-5 h-5 text-[#264099]" />
              Record Payment
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Select Order</label>
              <select
                value={selectedOrderId}
                onChange={(e) => {
                  setSelectedOrderId(e.target.value);
                  const ord = orders.find((o) => o.id === e.target.value);
                  if (ord) setAmount(String(ord.balanceDue));
                }}
                className="input-tino"
              >
                <option value="">Choose unpaid order...</option>
                {unpaidOrders.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.tagNumber} — {o.customerName} (Due {formatCurrency(o.balanceDue)})
                  </option>
                ))}
              </select>
            </div>

            {selectedOrder && (
              <div className="rounded-xl bg-[#F5F9FA] p-3 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Order Total</span>
                  <span className="font-bold text-[#0B2049]">
                    {formatCurrency(selectedOrder.totalAmount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Balance Due</span>
                  <span className="font-extrabold text-[#FF4D4D]">
                    {formatCurrency(selectedOrder.balanceDue)}
                  </span>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Payment Amount (GH₵)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.5"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={selectedOrder ? String(selectedOrder.balanceDue) : "0.00"}
                className="input-tino font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Payment Method</label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                className="input-tino"
              >
                <option value="cash">Cash</option>
                <option value="mobile_money">
                  MTN Mobile Money → GhanaPay ({settings.momoNumber})
                </option>
              </select>
            </div>

            {method === "mobile_money" && (
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Mobile Money Transaction Reference (Required &amp; Unique)
                </label>
                <input
                  type="text"
                  required
                  value={momoReference}
                  onChange={(e) => setMomoReference(e.target.value)}
                  placeholder="Enter MoMo transaction ID"
                  className="input-tino"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Notes (Optional)</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Paid at counter on collection"
                className="input-tino"
              />
            </div>

            {msg && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-semibold text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                {msg}
              </div>
            )}
            {err && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs font-semibold text-red-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {err}
              </div>
            )}

            <button type="submit" className="btn-tino-primary w-full py-3 text-xs">
              Confirm &amp; Issue Receipt
            </button>
          </form>

          {/* Payment Ledger & Order Payment Statuses */}
          <div className="lg:col-span-2 space-y-5">
            <div className="card-tino overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-extrabold text-[#0B2049]">Order Payment Statuses</h2>
                <div className="relative w-56">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Filter by tag or name..."
                    className="input-tino pl-8 py-1.5 text-xs"
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#F5F9FA] text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Tag</th>
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3">Order Stage</th>
                      <th className="px-4 py-3">Total / Balance</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {orders
                      .filter((o) => {
                        if (!query.trim()) return true;
                        const q = query.toLowerCase();
                        return (
                          o.tagNumber.toLowerCase().includes(q) ||
                          o.customerName.toLowerCase().includes(q)
                        );
                      })
                      .map((o) => (
                        <tr key={o.id} className="hover:bg-[#F6FFFF]">
                          <td className="px-4 py-3 font-black text-[#0B2049]">{o.tagNumber}</td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-800">{o.customerName}</div>
                            <div className="text-xs text-slate-400">{o.customerPhone}</div>
                          </td>
                          <td className="px-4 py-3 text-xs">
                            {ORDER_STATUS_META[o.status].shortLabel}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-bold text-[#0B2049]">
                              {formatCurrency(o.totalAmount)}
                            </div>
                            <div className="text-xs text-slate-500">
                              Due: {formatCurrency(o.balanceDue)}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-xs font-extrabold uppercase ${
                                o.paymentStatus === "paid"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : o.paymentStatus === "partially_paid"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-red-50 text-[#FF4D4D]"
                              }`}
                            >
                              {o.paymentStatus.replace("_", " ")}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => setReceiptOrderId(o.id)}
                              className="inline-flex items-center gap-1 rounded-xl bg-[#edf5fb] text-[#264099] px-2.5 py-1 text-xs font-bold hover:bg-sky-100 cursor-pointer"
                            >
                              <Ticket className="w-3.5 h-3.5" />
                              Ticket
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recorded Payments History */}
            <div className="card-tino overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h2 className="font-extrabold text-[#0B2049]">Recorded Payments Ledger</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#F5F9FA] text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Order</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Method / MoMo Ref</th>
                      <th className="px-4 py-3">Staff</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payments.map((p) => (
                      <tr key={p.id}>
                        <td className="px-4 py-2.5 text-xs text-slate-500">
                          {new Date(p.createdAt).toLocaleString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="px-4 py-2.5 font-bold text-[#0B2049]">
                          {p.tagNumber} • {p.customerName}
                        </td>
                        <td className="px-4 py-2.5 font-extrabold text-emerald-700">
                          {formatCurrency(p.amount)}
                        </td>
                        <td className="px-4 py-2.5 text-xs">
                          <span className="font-bold uppercase">
                            {p.method === "cash" ? "Cash" : "MTN MoMo"}
                          </span>
                          {p.momoReference && (
                            <span className="ml-1.5 font-mono text-slate-500">
                              ({p.momoReference})
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-slate-600">{p.recordedBy}</td>
                      </tr>
                    ))}
                    {payments.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-xs text-slate-500">
                          No payments recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {receiptOrder && (
          <div className="fixed inset-0 z-50 bg-[#0B2049]/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <div className="w-full max-w-lg my-auto bg-[#F5F9FA] rounded-3xl p-4 sm:p-5 relative">
              <button
                type="button"
                onClick={() => setReceiptOrderId(null)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white shadow flex items-center justify-center text-slate-500 cursor-pointer no-print"
              >
                <X className="w-4 h-4" />
              </button>
              <DigitalTicket order={receiptOrder} settings={settings} />
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
