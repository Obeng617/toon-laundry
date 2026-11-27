"use client";

import React, { useState } from "react";
import { Check, Copy, Download, MessageCircle, Printer, Share2 } from "lucide-react";
import { buildTicketWhatsAppMessage, toWhatsAppNumber } from "@/lib/phone";
import { formatCurrency } from "@/lib/pricing";
import { BusinessSettings, LaundryOrder } from "@/lib/types";
import { getFulfilmentLabel } from "@/lib/workflow";
import { MomoHelpCard } from "./MomoHelpCard";

function formatDateTime(iso?: string) {
  if (!iso) return "Pending";
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function DigitalTicket({
  order,
  settings,
  showActions = true,
}: {
  order: LaundryOrder;
  settings: BusinessSettings;
  showActions?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const isPaid = order.paymentStatus === "paid" && order.balanceDue === 0;
  const lastPayment = order.payments[order.payments.length - 1];
  const publicUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/ticket/${order.publicToken}`
      : `/ticket/${order.publicToken}`;

  const handleDownloadPng = () => {
    const canvas = document.createElement("canvas");
    const width = 720;
    const baseHeight = 880 + order.items.length * 44;
    canvas.width = width;
    canvas.height = baseHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, width, baseHeight);

    const grad = ctx.createLinearGradient(0, 0, width, 150);
    grad.addColorStop(0, "#264099");
    grad.addColorStop(1, "#02A1DB");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, 150);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "800 30px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(settings.businessName.toUpperCase(), width / 2, 56);

    ctx.font = "700 44px system-ui, sans-serif";
    ctx.fillText(order.tagNumber, width / 2, 114);

    if (isPaid) {
      ctx.fillStyle = "#10B981";
      ctx.fillRect(width - 170, 22, 140, 38);
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "800 20px system-ui, sans-serif";
      ctx.fillText("PAID", width - 100, 48);
    }

    ctx.textAlign = "left";
    let y = 195;
    const drawRow = (label: string, value: string) => {
      ctx.fillStyle = "#64748B";
      ctx.font = "600 18px system-ui, sans-serif";
      ctx.fillText(label, 44, y);
      ctx.fillStyle = "#0B2049";
      ctx.font = "700 20px system-ui, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(value, width - 44, y);
      ctx.textAlign = "left";
      y += 38;
    };

    drawRow("Customer", order.customerName);
    drawRow("Phone", order.customerPhone);
    drawRow("Category", order.appliedCategory.toUpperCase());
    drawRow("Fulfilment", getFulfilmentLabel(order.fulfilmentMethod));
    drawRow("In", formatDateTime(order.receivedAt || order.createdAt));
    drawRow("Ready by", formatDateTime(order.readyBy));
    if (order.actualWeightKg) {
      drawRow(
        "Weight / Bracket",
        `${order.actualWeightKg.toFixed(2)} kg → ${order.billableBracketKg?.toFixed(1)} kg`
      );
    }

    y += 10;
    ctx.strokeStyle = "#CBD5E1";
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(44, y);
    ctx.lineTo(width - 44, y);
    ctx.stroke();
    ctx.setLineDash([]);
    y += 36;

    ctx.fillStyle = "#264099";
    ctx.font = "800 18px system-ui, sans-serif";
    ctx.fillText("ITEMS", 44, y);
    ctx.textAlign = "right";
    ctx.fillText("AMOUNT", width - 44, y);
    ctx.textAlign = "left";
    y += 34;

    for (const item of order.items) {
      ctx.fillStyle = item.itemType === "discount" ? "#10B981" : "#0B2049";
      ctx.font = "500 18px system-ui, sans-serif";
      const truncated = item.label.length > 44 ? item.label.slice(0, 43) + "…" : item.label;
      ctx.fillText(truncated, 44, y);
      ctx.textAlign = "right";
      ctx.font = "700 18px system-ui, sans-serif";
      ctx.fillText(formatCurrency(item.lineTotal), width - 44, y);
      ctx.textAlign = "left";
      y += 38;
    }

    y += 10;
    ctx.strokeStyle = "#0B2049";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(44, y);
    ctx.lineTo(width - 44, y);
    ctx.stroke();
    y += 40;

    ctx.fillStyle = "#0B2049";
    ctx.font = "800 24px system-ui, sans-serif";
    ctx.fillText("TOTAL", 44, y);
    ctx.textAlign = "right";
    ctx.fillText(formatCurrency(order.totalAmount), width - 44, y);
    ctx.textAlign = "left";
    y += 42;

    ctx.fillStyle = isPaid ? "#10B981" : "#FF4D4D";
    ctx.font = "800 24px system-ui, sans-serif";
    ctx.fillText("BALANCE DUE", 44, y);
    ctx.textAlign = "right";
    ctx.fillText(formatCurrency(order.balanceDue), width - 44, y);
    ctx.textAlign = "left";
    y += 42;

    if (isPaid && lastPayment) {
      ctx.fillStyle = "#10B981";
      ctx.font = "700 18px system-ui, sans-serif";
      ctx.fillText(
        `PAID via ${lastPayment.method === "cash" ? "Cash" : `Mobile Money (${lastPayment.momoReference})`} • ${formatDateTime(lastPayment.createdAt)}`,
        44,
        y
      );
      y += 38;
    }

    y += 24;
    ctx.fillStyle = "#F5F9FA";
    ctx.fillRect(44, y, width - 88, 128);
    ctx.textAlign = "center";
    ctx.fillStyle = "#475569";
    ctx.font = "600 17px system-ui, sans-serif";
    ctx.fillText("Keep this ticket. Bring your tag number to collect.", width / 2, y + 38);
    ctx.fillStyle = "#0B2049";
    ctx.font = "900 46px system-ui, sans-serif";
    ctx.fillText(order.tagNumber, width / 2, y + 100);

    const link = document.createElement("a");
    link.download = `Tinoclean-${order.tagNumber.replace(/\s+#/, "-")}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const handleShare = async () => {
    const text = buildTicketWhatsAppMessage({
      businessName: settings.businessName,
      tagNumber: order.tagNumber,
      customerName: order.customerName,
      totalAmount: order.totalAmount,
      balanceDue: order.balanceDue,
      readyBy: order.readyBy,
      ticketUrl: publicUrl,
      momoNumber: settings.momoNumber,
      momoAccountName: settings.momoAccountName,
    });
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${settings.businessName} — ${order.tagNumber}`,
          text,
          url: publicUrl,
        });
        return;
      } catch {
        // User cancelled
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const handleSendToCustomerWhatsApp = () => {
    const waNumber = toWhatsAppNumber(order.customerPhone);
    const text = buildTicketWhatsAppMessage({
      businessName: settings.businessName,
      tagNumber: order.tagNumber,
      customerName: order.customerName,
      totalAmount: order.totalAmount,
      balanceDue: order.balanceDue,
      readyBy: order.readyBy,
      ticketUrl: publicUrl,
      momoNumber: settings.momoNumber,
      momoAccountName: settings.momoAccountName,
    });
    const url = waNumber
      ? `https://wa.me/${waNumber}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="space-y-4">
      <div className="card-tino print-ticket overflow-hidden max-w-md mx-auto bg-white border border-slate-200">
        {/* Ticket Header */}
        <div className="bg-tino-gradient px-6 py-5 text-white text-center relative">
          {isPaid && (
            <span className="absolute top-3.5 right-3.5 rounded-full bg-emerald-400 text-[#0B2049] px-3 py-0.5 text-xs font-extrabold tracking-wider uppercase shadow">
              PAID
            </span>
          )}
          <div className="text-xs font-bold tracking-[0.2em] uppercase text-sky-100">
            {settings.businessName}
          </div>
          <div className="text-3xl font-extrabold tracking-tight mt-1">{order.tagNumber}</div>
          <div className="text-xs text-sky-100 mt-1">
            {isPaid ? "Official Digital Receipt" : "Digital Laundry Ticket • Pay on Delivery/Collection"}
          </div>
        </div>

        {/* Metadata */}
        <div className="p-5 space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-y-2.5 gap-x-4 text-xs border-b border-dashed border-slate-200 pb-4">
            <div>
              <div className="text-slate-400 font-medium">Customer</div>
              <div className="font-bold text-[#0B2049] text-sm">{order.customerName}</div>
            </div>
            <div>
              <div className="text-slate-400 font-medium">Phone</div>
              <div className="font-semibold text-[#0B2049]">{order.customerPhone}</div>
            </div>
            <div>
              <div className="text-slate-400 font-medium">In</div>
              <div className="font-semibold text-slate-700">
                {formatDateTime(order.receivedAt || order.createdAt)}
              </div>
            </div>
            <div>
              <div className="text-slate-400 font-medium">Ready by</div>
              <div className="font-semibold text-[#264099]">{formatDateTime(order.readyBy)}</div>
            </div>
          </div>

          {/* Weight & Tariff Breakdown (Section 3) */}
          <div className="rounded-xl bg-[#F5F9FA] p-3 text-xs space-y-1 border border-slate-100">
            <div className="flex justify-between">
              <span className="text-slate-500">Customer category</span>
              <span className="font-bold uppercase text-[#264099]">{order.appliedCategory}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Actual measured weight</span>
              <span className="font-bold text-[#0B2049]">
                {order.actualWeightKg
                  ? `${order.actualWeightKg.toFixed(2)} kg`
                  : `Est. ${(order.estimatedWeightKg || 1).toFixed(1)} kg (awaiting weighing)`}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Applied billing bracket</span>
              <span className="font-bold text-[#0B2049]">
                {order.billableBracketKg ? `${order.billableBracketKg.toFixed(1)} kg` : "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Fulfilment</span>
              <span className="font-semibold text-slate-700">
                {getFulfilmentLabel(order.fulfilmentMethod)}
              </span>
            </div>
          </div>

          {/* Line items (including negative discount line when present) */}
          <div className="space-y-2 border-b border-dashed border-slate-200 pb-4">
            <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <span>Items</span>
              <span>Amount</span>
            </div>
            {order.items.map((item) => (
              <div
                key={item.id}
                className={`flex justify-between gap-3 text-sm ${
                  item.itemType === "discount" ? "text-emerald-700 font-bold" : ""
                }`}
              >
                <span className={item.itemType === "discount" ? "text-emerald-700" : "text-slate-700"}>
                  {item.label}
                </span>
                <span
                  className={`font-bold shrink-0 ${
                    item.itemType === "discount" ? "text-emerald-700" : "text-[#0B2049]"
                  }`}
                >
                  {formatCurrency(item.lineTotal)}
                </span>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="space-y-2">
            <div className="flex justify-between text-base font-bold text-[#0B2049]">
              <span>Total</span>
              <span>{formatCurrency(order.totalAmount)}</span>
            </div>
            {order.amountPaid > 0 && (
              <div className="flex justify-between text-sm font-semibold text-emerald-600">
                <span>Amount Paid</span>
                <span>-{formatCurrency(order.amountPaid)}</span>
              </div>
            )}
            <div
              className={`flex justify-between text-lg font-extrabold pt-2 border-t border-slate-200 ${
                isPaid ? "text-emerald-600" : "text-[#FF4D4D]"
              }`}
            >
              <span>Balance Due</span>
              <span>{formatCurrency(order.balanceDue)}</span>
            </div>
          </div>

          {isPaid && lastPayment && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 space-y-0.5">
              <div className="font-extrabold">PAID IN FULL</div>
              <div>
                Method:{" "}
                <strong>
                  {lastPayment.method === "cash"
                    ? "Cash"
                    : `Mobile Money (Ref: ${lastPayment.momoReference})`}
                </strong>
              </div>
              <div>Date: {formatDateTime(lastPayment.createdAt)}</div>
            </div>
          )}

          {/* Footer + Repeated Large Tag Number (Section 9.2) */}
          <div className="rounded-2xl bg-[#F5F9FA] border border-slate-200/70 p-4 text-center space-y-1.5">
            <p className="text-xs font-semibold text-slate-600">
              Keep this ticket. Bring your tag number to collect.
            </p>
            <div className="text-3xl font-black tracking-wider text-[#0B2049]">
              {order.tagNumber}
            </div>
          </div>
        </div>
      </div>

      {/* Pay with MTN MoMo Help Card (Section 9.1) */}
      {!isPaid && (
        <div className="max-w-md mx-auto no-print">
          <MomoHelpCard settings={settings} amountFormatted={formatCurrency(order.balanceDue)} />
        </div>
      )}

      {showActions && (
        <div className="flex flex-wrap items-center justify-center gap-2 no-print">
          <button
            type="button"
            onClick={handleDownloadPng}
            className="btn-tino-primary text-xs px-4 py-2.5"
          >
            <Download className="w-4 h-4" />
            Download Image (PNG)
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="btn-tino-secondary text-xs px-4 py-2.5"
          >
            <Printer className="w-4 h-4" />
            Save / Print PDF
          </button>
          <button
            type="button"
            onClick={handleSendToCustomerWhatsApp}
            className="inline-flex items-center justify-center gap-1.5 rounded-[14px] bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 shadow-sm transition cursor-pointer"
          >
            <MessageCircle className="w-4 h-4" />
            Send to Customer WhatsApp
          </button>
          <button
            type="button"
            onClick={handleShare}
            className="btn-tino-secondary text-xs px-4 py-2.5"
          >
            <Share2 className="w-4 h-4" />
            Share
          </button>
          <button
            type="button"
            onClick={handleCopyLink}
            className="btn-tino-secondary text-xs px-4 py-2.5"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            {copied ? "Link Copied!" : "Copy Ticket Link"}
          </button>
        </div>
      )}
    </div>
  );
}
