"use client";

import React from "react";
import { Clock, MapPin, MessageCircle, Phone } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { MomoHelpCard } from "@/components/MomoHelpCard";
import { useApp } from "@/context/AppContext";

export default function ContactPage() {
  const { settings } = useApp();

  return (
    <AppShell mode="customer">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[#02A1DB]">Get in Touch</p>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B2049]">Contact Tinoclean</h1>
          <p className="text-sm text-slate-500 mt-1">
            Questions about your order, pickup/delivery arrangement or UPSA student verification?
            Reach us directly.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <a
            href={`https://wa.me/${settings.whatsappNumber}?text=${encodeURIComponent(
              "Hello Tinoclean Laundry, I need assistance with my laundry."
            )}`}
            target="_blank"
            rel="noreferrer"
            className="card-tino p-5 hover:border-emerald-300 transition flex items-start gap-4"
          >
            <div className="w-12 h-12 rounded-[14px] bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <MessageCircle className="w-6 h-6" />
            </div>
            <div>
              <div className="font-extrabold text-[#0B2049]">WhatsApp Chat</div>
              <div className="text-sm text-emerald-700 font-semibold mt-0.5">{settings.phone}</div>
              <div className="text-xs text-slate-500 mt-1">Arrange pickup or delivery directly</div>
            </div>
          </a>

          <a
            href={`tel:${settings.phone}`}
            className="card-tino p-5 hover:border-sky-300 transition flex items-start gap-4"
          >
            <div className="w-12 h-12 rounded-[14px] bg-[#edf6fc] text-[#264099] flex items-center justify-center shrink-0">
              <Phone className="w-6 h-6" />
            </div>
            <div>
              <div className="font-extrabold text-[#0B2049]">Call Us</div>
              <div className="text-sm text-[#264099] font-semibold mt-0.5">{settings.phone}</div>
              <div className="text-xs text-slate-500 mt-1">Speak with Tinoclean staff</div>
            </div>
          </a>
        </div>

        <div className="card-tino p-5 space-y-4">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-[#02A1DB] shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-sm text-[#0B2049]">Business Hours</div>
              <div className="text-sm text-slate-600 mt-0.5">{settings.operatingHours}</div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-[#264099] shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-sm text-[#0B2049]">Location &amp; Coverage</div>
              <div className="text-sm text-slate-600 mt-0.5">
                Location: <strong>{settings.location}</strong> • Coverage:{" "}
                <strong>{settings.coverageAreas}</strong>
              </div>
            </div>
          </div>
        </div>

        <MomoHelpCard settings={settings} />
      </div>
    </AppShell>
  );
}
