"use client";

import React, { useState } from "react";
import { AlertTriangle, Check, Copy, Smartphone } from "lucide-react";
import { BusinessSettings } from "@/lib/types";

/**
 * Section 9.1: "Pay with MTN MoMo" Help Card using the steps on the Tinoclean flyer.
 * Only explains manual payment to GhanaPay wallet 0551750854 (MARTIN); does not take online payment.
 */
export function MomoHelpCard({
  settings,
  amountFormatted,
}: {
  settings: BusinessSettings;
  amountFormatted?: string;
}) {
  const [copied, setCopied] = useState(false);
  const walletNumber = settings.momoNumber || "0551750854";
  const recipientName = settings.momoAccountName || "MARTIN";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(walletNumber.replace(/\s+/g, ""));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="rounded-2xl bg-[#FFFDF2] border border-[#FFD21F] p-4 space-y-3 text-xs text-[#0B2049]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#FFD21F] text-[#0B2049] flex items-center justify-center font-black">
            <Smartphone className="w-4 h-4" />
          </div>
          <div>
            <div className="font-extrabold text-sm text-[#0B2049]">Pay with MTN MoMo</div>
            <div className="text-[11px] text-slate-600">
              Network: <strong>GhanaPay</strong> • Recipient: <strong>{recipientName}</strong>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#0B2049] text-white px-3 py-1.5 text-xs font-bold hover:opacity-90 cursor-pointer"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-[#FFD21F]" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "Copied!" : `Copy ${walletNumber}`}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        <div className="rounded-xl bg-white border border-amber-200/80 p-3 space-y-1">
          <div className="font-extrabold text-[#264099]">Option 1: USSD (*170#)</div>
          <ol className="list-decimal list-inside space-y-0.5 text-slate-700 leading-relaxed">
            <li>
              Dial <strong>*170#</strong>
            </li>
            <li>
              Choose <strong>Transfer Money</strong> → <strong>Other Networks</strong> →{" "}
              <strong>GhanaPay</strong>
            </li>
            <li>
              Enter <strong>{walletNumber}</strong>
            </li>
            <li>
              Enter amount{amountFormatted ? ` (${amountFormatted})` : ""} and reference{" "}
              <strong>&quot;Laundry&quot;</strong>
            </li>
            <li>
              Check recipient name shows <strong>{recipientName}</strong> before confirming with your
              MoMo PIN.
            </li>
          </ol>
        </div>

        <div className="rounded-xl bg-white border border-amber-200/80 p-3 space-y-1">
          <div className="font-extrabold text-[#264099]">Option 2: MTN MoMo App</div>
          <ol className="list-decimal list-inside space-y-0.5 text-slate-700 leading-relaxed">
            <li>Open the <strong>MTN MoMo app</strong></li>
            <li>
              Tap <strong>Send Money / Transfer</strong> → <strong>Other Networks</strong> →{" "}
              <strong>GhanaPay</strong>
            </li>
            <li>
              Enter wallet number <strong>{walletNumber}</strong>
            </li>
            <li>
              Enter amount{amountFormatted ? ` (${amountFormatted})` : ""} and reference{" "}
              <strong>&quot;Laundry&quot;</strong>
            </li>
            <li>
              Verify name shows <strong>{recipientName}</strong> and confirm.
            </li>
          </ol>
        </div>
      </div>

      <div className="rounded-xl bg-amber-100/80 border border-amber-300 px-3 py-2 flex items-start gap-2 text-[11px] font-semibold text-amber-950">
        <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        <span>
          Always confirm the network is <strong>GhanaPay</strong> and the recipient name is{" "}
          <strong>{recipientName}</strong>, and never share your PIN. Show your transaction
          reference to Tinoclean staff upon delivery or collection.
        </span>
      </div>
    </div>
  );
}
