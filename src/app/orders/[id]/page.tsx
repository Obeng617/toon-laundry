"use client";

import React from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, Circle, Clock, MapPin } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { DigitalTicket } from "@/components/DigitalTicket";
import { useApp } from "@/context/AppContext";
import { getFulfilmentLabel, getWorkflowMilestones, ORDER_STATUS_META } from "@/lib/workflow";

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const { orders, settings } = useApp();

  const order = orders.find((o) => o.id === params.id);
  const justPlaced = searchParams.get("placed") === "1";

  if (!order) {
    return (
      <AppShell mode="customer">
        <div className="card-tino p-8 text-center space-y-3">
          <div className="font-bold text-[#0B2049]">Order not found</div>
          <Link href="/orders" className="btn-tino-primary text-xs px-4 py-2.5">
            Back to My Orders
          </Link>
        </div>
      </AppShell>
    );
  }

  const milestones = getWorkflowMilestones(order.fulfilmentMethod);
  const currentIdx = milestones.indexOf(order.status);

  return (
    <AppShell mode="customer">
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3 no-print">
          <Link
            href="/orders"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#264099] hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to My Orders
          </Link>
          <span
            className={`rounded-full border px-3 py-1 text-xs font-bold ${
              ORDER_STATUS_META[order.status].badgeClass
            }`}
          >
            {ORDER_STATUS_META[order.status].label}
          </span>
        </div>

        {justPlaced && (
          <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 flex items-start gap-3 no-print">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-sm text-emerald-900">
              <strong>Order {order.tagNumber} placed!</strong> We&apos;ve notified Tinoclean staff.
              Your final ticket price will be confirmed once your laundry is weighed. Pay only on
              delivery or collection.
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
          {/* Status Timeline (Flexible per fulfilment method — Section 7) */}
          <div className="lg:col-span-2 card-tino p-5 space-y-4 no-print">
            <div>
              <h2 className="font-extrabold text-[#0B2049]">Order Progress</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {getFulfilmentLabel(order.fulfilmentMethod)} workflow
              </p>
            </div>

            {(order.pickupAddress || order.deliveryAddress) && (
              <div className="rounded-xl bg-[#F5F9FA] p-3 text-xs text-slate-700 flex items-start gap-2">
                <MapPin className="w-4 h-4 text-[#02A1DB] shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-[#0B2049]">
                    {order.fulfilmentMethod === "pickup" ? "Pickup Address" : "Delivery Address"}
                  </div>
                  <div>{order.pickupAddress || order.deliveryAddress}</div>
                </div>
              </div>
            )}

            <ol className="space-y-3 relative">
              {milestones.map((m, idx) => {
                const done = currentIdx >= idx;
                const isCurrent = currentIdx === idx;
                const hist = order.statusHistory.find((h) => h.status === m);
                const meta = ORDER_STATUS_META[m];

                return (
                  <li key={m} className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {done ? (
                        <CheckCircle2
                          className={`w-5 h-5 ${
                            isCurrent ? "text-[#02A1DB]" : "text-emerald-500"
                          }`}
                        />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-300" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 pb-2 border-b border-slate-100 last:border-0">
                      <div
                        className={`text-sm font-bold ${
                          done ? "text-[#0B2049]" : "text-slate-400"
                        }`}
                      >
                        {meta.label}
                      </div>
                      <div className="text-xs text-slate-500">{hist?.note || meta.description}</div>
                      {hist && (
                        <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(hist.createdAt).toLocaleString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          {/* Digital Ticket & Receipt (Section 9.2) */}
          <div className="lg:col-span-3">
            <DigitalTicket order={order} settings={settings} />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
