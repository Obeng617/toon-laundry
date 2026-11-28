"use client";

import React, { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  MessageCircle,
  Plus,
  Scale,
  Search,
  Ticket,
  Trash2,
  X,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { DigitalTicket } from "@/components/DigitalTicket";
import { useApp } from "@/context/AppContext";
import { buildTicketWhatsAppMessage, toWhatsAppNumber } from "@/lib/phone";
import { buildOrderItemsAndTotals, formatCurrency } from "@/lib/pricing";
import { CustomerCategory, FulfilmentMethod, OrderStatus, PaymentMethod } from "@/lib/types";
import {
  getFulfilmentLabel,
  getNextStatus,
  getWorkflowMilestones,
  ORDER_STATUS_META,
} from "@/lib/workflow";

function AdminOrdersContent() {
  const searchParams = useSearchParams();
  const {
    currentUser,
    orders,
    users,
    services,
    tariffs,
    settings,
    placeOrder,
    weighAndIssueTicket,
    updateOrderStatus,
    assignStaff,
    deleteOrder,
    recordPayment,
  } = useApp();

  const activeServices = services.filter((s) => s.isActive);
  const [query, setQuery] = useState(searchParams.get("tag") || "");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedOrderId, setSelectedOrderId] = useState<string>(orders[0]?.id || "");
  const [showWalkInModal, setShowWalkInModal] = useState(searchParams.get("new") === "1");
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Multi-service weigh map for selected order
  const [weighMap, setWeighMap] = useState<Record<string, string>>({});
  const [categoryInput, setCategoryInput] = useState<CustomerCategory>("regular");
  const [readyByInput, setReadyByInput] = useState("");
  const [actionMsg, setActionMsg] = useState("");
  const [actionErr, setActionErr] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const [statusErr, setStatusErr] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Payment quick form state
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState<PaymentMethod>("cash");
  const [momoRef, setMomoRef] = useState("");

  // Unpaid completion exception
  const [exceptionReason, setExceptionReason] = useState("");

  // Walk-in form (Name & phone only + measured service weights)
  const [walkName, setWalkName] = useState("");
  const [walkPhone, setWalkPhone] = useState("");
  const [walkMethod, setWalkMethod] = useState<FulfilmentMethod>("drop_off");
  const [walkServiceId, setWalkServiceId] = useState(activeServices[0]?.id || "");
  const [walkWeight, setWalkWeight] = useState("1.5");

  const staffList = users.filter((u) => u.role === "admin" || u.role === "staff");

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        return (
          o.tagNumber.toLowerCase().includes(q) ||
          o.customerName.toLowerCase().includes(q) ||
          o.customerPhone.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [orders, query, statusFilter]);

  const selectedOrder =
    orders.find((o) => o.id === selectedOrderId) || filteredOrders[0] || null;

  const selectOrder = (id: string) => {
    const found = orders.find((o) => o.id === id);
    setSelectedOrderId(id);
    setActionErr("");
    setActionMsg("");
    setStatusErr("");
    setStatusMsg("");
    if (found) {
      const nextMap: Record<string, string> = {};
      for (const item of found.items) {
        if (item.serviceId && item.itemType !== "discount") {
          nextMap[item.serviceId] = String(
            item.actualWeightKg || item.billableWeightKg || item.quantity || 1.5
          );
        }
      }
      if (Object.keys(nextMap).length === 0 && activeServices[0]) {
        nextMap[activeServices[0].id] = String(
          found.actualWeightKg || found.estimatedWeightKg || 1.5
        );
      }
      setWeighMap(nextMap);
      setCategoryInput(found.appliedCategory);
      setPayAmount(String(found.balanceDue));
    }
  };

  const weighLines = useMemo(() => {
    const entries = Object.entries(weighMap)
      .map(([serviceId, val]) => ({ serviceId, weightKg: Number(val) || 0 }))
      .filter((l) => l.weightKg > 0);
    if (entries.length === 0 && selectedOrder && activeServices[0]) {
      return [
        {
          serviceId: activeServices[0].id,
          weightKg: selectedOrder.actualWeightKg || selectedOrder.estimatedWeightKg || 1.5,
        },
      ];
    }
    return entries;
  }, [weighMap, selectedOrder, activeServices]);

  const previewCalc = useMemo(() => {
    if (!selectedOrder) return null;
    let effectiveDiscountType = selectedOrder.discountType;
    let effectiveDiscountPercent =
      selectedOrder.discountType !== "none"
        ? selectedOrder.discountPercent > 0
          ? selectedOrder.discountPercent
          : settings.discountPercent
        : 0;

    if (effectiveDiscountType === "none" && selectedOrder.customerId) {
      const cust = users.find((u) => u.id === selectedOrder.customerId);
      if (cust) {
        if (cust.completedWashesStreak >= settings.loyaltyWashesRequired) {
          effectiveDiscountType = "loyalty";
        } else if (cust.availableReferralDiscounts > 0) {
          effectiveDiscountType = "referral";
        } else if (cust.manualDiscountsAvailable > 0) {
          effectiveDiscountType = "manual";
        }
        if (effectiveDiscountType !== "none") {
          effectiveDiscountPercent = settings.discountPercent;
        }
      }
    }

    return buildOrderItemsAndTotals({
      lines: weighLines,
      services: activeServices,
      tariffs,
      category: categoryInput,
      discountType: effectiveDiscountType,
      discountPercent: effectiveDiscountPercent,
      isEstimated: false,
    });
  }, [
    selectedOrder,
    users,
    weighLines,
    activeServices,
    tariffs,
    categoryInput,
    settings.discountPercent,
    settings.loyaltyWashesRequired,
  ]);

  const handleWeigh = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    setActionErr("");
    setActionMsg("");
    const res = await weighAndIssueTicket(
      selectedOrder.id,
      weighLines,
      readyByInput ? new Date(readyByInput).toISOString() : undefined,
      categoryInput
    );
    if (!res.ok) {
      setActionErr(res.error || "Could not record weight.");
    } else {
      setActionMsg("Weight recorded, tariff applied & digital ticket issued!");
    }
  };

  const handleStatusChange = async (nextStatus: OrderStatus) => {
    if (!selectedOrder || updatingStatus) return;
    setActionErr("");
    setActionMsg("");
    setStatusErr("");
    setStatusMsg("");
    setUpdatingStatus(true);
    try {
      const res = await updateOrderStatus(selectedOrder.id, nextStatus, {
        unpaidExceptionReason: exceptionReason.trim() || undefined,
      });
      if (!res.ok) {
        const msg = res.error || "Could not update status.";
        setActionErr(msg);
        setStatusErr(msg);
      } else {
        setExceptionReason("");
        const msg = `Order updated to ${ORDER_STATUS_META[nextStatus].label}. Customer notified.`;
        setActionMsg(msg);
        setStatusMsg(msg);
      }
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    setActionErr("");
    setStatusErr("");
    const res = await recordPayment({
      orderId: selectedOrder.id,
      amount: Number(payAmount) || selectedOrder.balanceDue,
      method: payMethod,
      momoReference: payMethod === "mobile_money" ? momoRef : undefined,
    });
    if (!res.ok) {
      setActionErr(res.error || "Payment failed.");
    } else {
      setMomoRef("");
      setActionMsg("Payment recorded & receipt updated!");
    }
  };

  const handleCreateWalkIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walkName.trim() || !walkPhone.trim()) return;
    const srvId = walkServiceId || activeServices[0]?.id;
    if (!srvId) return;

    const res = await placeOrder({
      customerName: walkName,
      customerPhone: walkPhone,
      isWalkIn: true,
      fulfilmentMethod: walkMethod,
      serviceLines: [{ serviceId: srvId, weightKg: Number(walkWeight) || 1.5 }],
      isActualWeight: true,
    });
    if (res.ok && res.order) {
      setShowWalkInModal(false);
      setWalkName("");
      setWalkPhone("");
      selectOrder(res.order.id);
      setShowTicketModal(true);
    }
  };

  const handleConfirmDeleteOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    setDeleting(true);
    setActionErr("");
    try {
      const res = await deleteOrder(
        selectedOrder.id,
        deleteReason.trim() || "Deleted by Admin"
      );
      if (!res.ok) {
        setActionErr(res.error || "Could not delete order.");
        return;
      }
      setShowDeleteModal(false);
      setDeleteReason("");
      setSelectedOrderId("");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[#02A1DB]">Operations</p>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B2049]">Orders Queue</h1>
        </div>
        <button
          type="button"
          onClick={() => setShowWalkInModal(true)}
          className="btn-tino-primary text-xs px-4 py-2.5 self-start"
        >
          <Plus className="w-4 h-4" />
          New Walk-in Order
        </button>
      </div>

      {/* Search & Status Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find quickly by tag number (TAG #0018), customer name or phone..."
            className="input-tino pl-10"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input-tino sm:w-56"
        >
          <option value="all">All Statuses</option>
          {Object.values(ORDER_STATUS_META).map((m) => (
            <option key={m.status} value={m.status}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      {/* Split Layout: Queue List + Selected Order Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-5 space-y-2.5 max-h-[75vh] overflow-y-auto pr-1">
          {filteredOrders.map((o) => {
            const active = selectedOrder?.id === o.id;
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => selectOrder(o.id)}
                className={`w-full text-left card-tino p-4 transition cursor-pointer ${
                  active
                    ? "border-[#02A1DB] ring-2 ring-[#02A1DB]/20 bg-[#eff8fd]"
                    : "hover:bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-black text-base text-[#0B2049]">{o.tagNumber}</div>
                    <div className="text-xs font-semibold text-slate-700">{o.customerName}</div>
                    <div className="text-[11px] text-slate-400">
                      {getFulfilmentLabel(o.fulfilmentMethod)} • {o.appliedCategory.toUpperCase()}
                    </div>
                  </div>
                  <span
                    className={`shrink-0 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${
                      ORDER_STATUS_META[o.status].badgeClass
                    }`}
                  >
                    {ORDER_STATUS_META[o.status].shortLabel}
                  </span>
                </div>
                <div className="mt-2.5 flex items-center justify-between text-xs">
                  <span className="text-slate-500">
                    {o.actualWeightKg
                      ? `${o.actualWeightKg.toFixed(2)} kg → ${o.billableBracketKg?.toFixed(1)} kg`
                      : `Est. ${o.estimatedWeightKg || 1} kg`}
                  </span>
                  <span className="font-extrabold text-[#0B2049]">
                    {formatCurrency(o.totalAmount)}{" "}
                    <span className={o.balanceDue === 0 ? "text-emerald-600" : "text-[#FF4D4D]"}>
                      ({o.balanceDue === 0 ? "PAID" : `Due ${formatCurrency(o.balanceDue)}`})
                    </span>
                  </span>
                </div>
              </button>
            );
          })}
          {filteredOrders.length === 0 && (
            <div className="card-tino p-8 text-center text-sm text-slate-500">
              No orders match your filter.
            </div>
          )}
        </div>

        {/* Order Workspace */}
        <div className="lg:col-span-7">
          {selectedOrder ? (
            <div className="card-tino p-5 space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black text-[#0B2049]">{selectedOrder.tagNumber}</h2>
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${
                        ORDER_STATUS_META[selectedOrder.status].badgeClass
                      }`}
                    >
                      {ORDER_STATUS_META[selectedOrder.status].label}
                    </span>
                  </div>
                  <div className="text-sm text-slate-600 mt-0.5">
                    {selectedOrder.customerName} • {selectedOrder.customerPhone}
                  </div>
                  {(selectedOrder.pickupAddress || selectedOrder.deliveryAddress) && (
                    <div className="text-xs text-slate-500 mt-0.5">
                      Address: {selectedOrder.pickupAddress || selectedOrder.deliveryAddress}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setShowTicketModal(true)}
                    className="btn-tino-secondary text-xs px-3 py-2"
                  >
                    <Ticket className="w-4 h-4" />
                    Digital Ticket
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const waNum = toWhatsAppNumber(selectedOrder.customerPhone);
                      if (!waNum) {
                        setActionErr("Customer phone number is missing or invalid for WhatsApp.");
                        return;
                      }
                      const ticketUrl = `${window.location.origin}/ticket/${selectedOrder.publicToken}`;
                      const msg = buildTicketWhatsAppMessage({
                        businessName: settings.businessName,
                        tagNumber: selectedOrder.tagNumber,
                        customerName: selectedOrder.customerName,
                        totalAmount: selectedOrder.totalAmount,
                        balanceDue: selectedOrder.balanceDue,
                        readyBy: selectedOrder.readyBy,
                        ticketUrl,
                        momoNumber: settings.momoNumber,
                        momoAccountName: settings.momoAccountName,
                      });
                      window.open(
                        `https://wa.me/${waNum}?text=${encodeURIComponent(msg)}`,
                        "_blank"
                      );
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 text-xs font-bold shadow-xs transition cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Send WhatsApp Ticket
                  </button>
                  <select
                    aria-label="Assign staff"
                    value={selectedOrder.assignedStaffId || ""}
                    onChange={(e) => assignStaff(selectedOrder.id, e.target.value)}
                    className="text-xs font-semibold rounded-xl border border-slate-200 bg-[#F5F9FA] px-2.5 py-2 text-[#0B2049]"
                  >
                    <option value="">Assign Staff...</option>
                    {staffList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.fullName}
                      </option>
                    ))}
                  </select>
                  {currentUser?.role === "admin" && (
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteReason("");
                        setShowDeleteModal(true);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 px-3 py-2 text-xs font-bold transition cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Order
                    </button>
                  )}
                </div>
              </div>

              {actionMsg && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-semibold text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  {actionMsg}
                </div>
              )}
              {actionErr && (
                <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs font-semibold text-red-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {actionErr}
                </div>
              )}

              {/* 1. Weigh Laundry (Multi-Service) & Issue Digital Ticket */}
              <form
                onSubmit={handleWeigh}
                className="rounded-2xl bg-[#F5F9FA] border border-slate-200/70 p-4 space-y-3"
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 text-sm font-extrabold text-[#0B2049]">
                    <Scale className="w-4 h-4 text-[#264099]" />
                    Record Actual Weight per Service &amp; Issue Ticket
                  </div>
                  <select
                    value={categoryInput}
                    onChange={(e) => setCategoryInput(e.target.value as CustomerCategory)}
                    className="text-xs font-bold rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[#264099]"
                  >
                    <option value="student">Student Tariff</option>
                    <option value="regular">Regular Tariff</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {activeServices.map((srv) => (
                    <div
                      key={srv.id}
                      className="rounded-xl bg-white border border-slate-200 p-2.5 flex items-center justify-between gap-2"
                    >
                      <div className="text-xs font-bold text-[#0B2049]">{srv.name}</div>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          step="0.05"
                          min="0"
                          value={weighMap[srv.id] || ""}
                          onChange={(e) =>
                            setWeighMap((prev) => ({ ...prev, [srv.id]: e.target.value }))
                          }
                          placeholder="0.00"
                          className="input-tino w-24 py-1 text-center text-xs font-bold"
                        />
                        <span className="text-xs text-slate-400">kg</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 items-end">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Custom &quot;Ready by&quot; Date/Time (Optional)
                    </label>
                    <input
                      type="datetime-local"
                      value={readyByInput}
                      onChange={(e) => setReadyByInput(e.target.value)}
                      className="input-tino bg-white text-xs py-2"
                    />
                  </div>
                  <button type="submit" className="btn-tino-primary w-full text-xs py-2.5">
                    Apply Weights &amp; Issue Ticket
                  </button>
                </div>

                {previewCalc && (
                  <div className="text-xs text-slate-600">
                    Preview: Actual <strong>{previewCalc.totalActualWeightKg.toFixed(2)} kg</strong>{" "}
                    →{" "}
                    <strong className="text-[#264099]">
                      {previewCalc.totalBillableWeightKg.toFixed(1)} kg billed
                    </strong>{" "}
                    • Total: <strong>{formatCurrency(previewCalc.totalAmount)}</strong>
                    {previewCalc.discountAmount > 0 && (
                      <span className="text-emerald-700 font-bold">
                        {" "}
                        (includes -{formatCurrency(previewCalc.discountAmount)}{" "}
                        {previewCalc.discountType} discount)
                      </span>
                    )}
                  </div>
                )}
              </form>

              {/* 2. Update Workflow Status */}
              <div className="space-y-3">
                <div className="text-sm font-extrabold text-[#0B2049]">Update Progress</div>
                <div className="flex flex-wrap gap-2">
                  {getWorkflowMilestones(selectedOrder.fulfilmentMethod).map((st) => {
                    const isCurrent = selectedOrder.status === st;
                    const isNext =
                      getNextStatus(selectedOrder.status, selectedOrder.fulfilmentMethod) === st;
                    return (
                      <button
                        key={st}
                        type="button"
                        disabled={updatingStatus}
                        onClick={() => handleStatusChange(st)}
                        className={`rounded-xl px-3 py-1.5 text-xs font-bold border transition cursor-pointer disabled:opacity-60 ${
                          isCurrent
                            ? "bg-tino-gradient text-white border-transparent shadow-sm"
                            : isNext
                            ? "bg-sky-50 text-[#264099] border-[#02A1DB] ring-2 ring-[#02A1DB]/15"
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        {ORDER_STATUS_META[st].shortLabel}
                      </button>
                    );
                  })}
                  {selectedOrder.status === "order_placed" && (
                    <button
                      type="button"
                      disabled={updatingStatus}
                      onClick={() => handleStatusChange("rejected")}
                      className="rounded-xl px-3 py-1.5 text-xs font-bold border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 cursor-pointer disabled:opacity-60"
                    >
                      Reject Order
                    </button>
                  )}
                </div>

                {statusMsg && (
                  <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-semibold text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    {statusMsg}
                  </div>
                )}
                {statusErr && (
                  <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs font-semibold text-red-700 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    {statusErr}
                  </div>
                )}

                {selectedOrder.balanceDue > 0 && currentUser?.role === "admin" && (
                  <div
                    className={`rounded-xl p-3 space-y-2 border ${
                      statusErr
                        ? "bg-amber-50 border-red-300 ring-2 ring-red-100"
                        : "bg-amber-50 border-amber-200"
                    }`}
                  >
                    <div className="text-[11px] font-bold text-amber-900">
                      Admin Unpaid Completion Exception — required to mark Completed while{" "}
                      {formatCurrency(selectedOrder.balanceDue)} is unpaid (or record payment below)
                    </div>
                    <input
                      type="text"
                      value={exceptionReason}
                      onChange={(e) => setExceptionReason(e.target.value)}
                      placeholder="Enter written reason if releasing laundry before full payment..."
                      className="input-tino bg-white text-xs py-2"
                    />
                  </div>
                )}
              </div>

              {/* 3. Quick Record Payment (Pay on Delivery/Collection) */}
              {selectedOrder.balanceDue > 0 && (
                <form
                  onSubmit={handleRecordPayment}
                  className="rounded-2xl bg-emerald-50/70 border border-emerald-200 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-extrabold text-emerald-900">
                      <CreditCard className="w-4 h-4 text-emerald-600" />
                      Record Payment (Balance: {formatCurrency(selectedOrder.balanceDue)})
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <input
                      type="number"
                      step="0.01"
                      min="0.5"
                      max={selectedOrder.balanceDue}
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      placeholder="Amount (GH₵)"
                      className="input-tino bg-white text-sm"
                    />
                    <select
                      value={payMethod}
                      onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
                      className="input-tino bg-white text-sm"
                    >
                      <option value="cash">Cash</option>
                      <option value="mobile_money">MTN MoMo → GhanaPay (0551750854)</option>
                    </select>
                    <button type="submit" className="btn-tino-primary text-xs py-2.5">
                      Confirm Payment
                    </button>
                  </div>
                  {payMethod === "mobile_money" && (
                    <input
                      type="text"
                      required
                      value={momoRef}
                      onChange={(e) => setMomoRef(e.target.value)}
                      placeholder="Required: Mobile Money Transaction Reference"
                      className="input-tino bg-white text-xs"
                    />
                  )}
                </form>
              )}
            </div>
          ) : (
            <div className="card-tino p-10 text-center text-sm text-slate-500">
              Select an order from the queue to manage weighing, status and payment.
            </div>
          )}
        </div>
      </div>

      {/* Walk-in Order Modal (Section 9.2: name and phone only) */}
      {showWalkInModal && (
        <div className="fixed inset-0 z-50 bg-[#0B2049]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateWalkIn}
            className="card-tino w-full max-w-md p-6 space-y-4 bg-white"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-[#0B2049]">Create Walk-in Order</h3>
              <button
                type="button"
                onClick={() => setShowWalkInModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Serve walk-in customers with name and phone number only. A private shareable digital
              ticket link is generated immediately.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Customer Name</label>
                <input
                  type="text"
                  required
                  value={walkName}
                  onChange={(e) => setWalkName(e.target.value)}
                  placeholder="Customer full name"
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
                  value={walkPhone}
                  onChange={(e) => setWalkPhone(e.target.value.replace(/\D/g, ""))}
                  placeholder="0551750854"
                  className="input-tino"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Service</label>
                <select
                  value={walkServiceId}
                  onChange={(e) => setWalkServiceId(e.target.value)}
                  className="input-tino"
                >
                  {activeServices.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Measured Weight (kg)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    min="0.1"
                    required
                    value={walkWeight}
                    onChange={(e) => setWalkWeight(e.target.value)}
                    className="input-tino"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Fulfilment</label>
                  <select
                    value={walkMethod}
                    onChange={(e) => setWalkMethod(e.target.value as FulfilmentMethod)}
                    className="input-tino"
                  >
                    <option value="drop_off">Drop-off / Collection</option>
                    <option value="delivery">Delivery</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowWalkInModal(false)}
                className="btn-tino-secondary text-xs px-4 py-2"
              >
                Cancel
              </button>
              <button type="submit" className="btn-tino-primary text-xs px-4 py-2">
                Create &amp; Issue Ticket
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Digital Ticket Preview Modal */}
      {showTicketModal && selectedOrder && (
        <div className="fixed inset-0 z-50 bg-[#0B2049]/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg my-auto bg-[#F5F9FA] rounded-3xl p-4 sm:p-5 relative">
            <button
              type="button"
              onClick={() => setShowTicketModal(false)}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white shadow flex items-center justify-center text-slate-500 hover:text-slate-800 cursor-pointer no-print"
            >
              <X className="w-4 h-4" />
            </button>
            <DigitalTicket order={selectedOrder} settings={settings} />
          </div>
        </div>
      )}

      {/* Delete Order Confirmation Modal (Admin Only) */}
      {showDeleteModal && selectedOrder && (
        <div className="fixed inset-0 z-50 bg-[#0B2049]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleConfirmDeleteOrder}
            className="card-tino w-full max-w-md p-6 space-y-4 bg-white"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-red-600 font-extrabold text-lg">
                <Trash2 className="w-5 h-5" />
                Delete {selectedOrder.tagNumber}?
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              This will permanently delete <strong>{selectedOrder.tagNumber}</strong> for{" "}
              <strong>{selectedOrder.customerName}</strong> ({formatCurrency(selectedOrder.totalAmount)})
              along with its ticket and items. The deletion will be recorded in the audit trail.
            </p>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Reason for deletion (Optional)
              </label>
              <input
                type="text"
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="e.g. Duplicate booking or test order"
                className="input-tino"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="btn-tino-secondary text-xs px-4 py-2"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={deleting}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#FF4D4D] hover:bg-red-600 text-white px-4 py-2 text-xs font-bold shadow-sm transition cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {deleting ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default function AdminOrdersPage() {
  return (
    <AppShell mode="admin">
      <Suspense
        fallback={
          <div className="card-tino p-8 text-center text-sm text-slate-500">Loading orders...</div>
        }
      >
        <AdminOrdersContent />
      </Suspense>
    </AppShell>
  );
}
