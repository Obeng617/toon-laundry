"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { TinocleanLogo } from "@/components/TinocleanLogo";
import { DigitalTicket } from "@/components/DigitalTicket";
import { useApp } from "@/context/AppContext";

export default function PublicTicketPage() {
  const params = useParams<{ token: string }>();
  const { orders, settings } = useApp();
  const order = orders.find((o) => o.publicToken === params.token);

  return (
    <div className="min-h-screen bg-[#F5F9FA] py-6 px-4">
      <div className="max-w-lg mx-auto space-y-5">
        <div className="flex items-center justify-between no-print">
          <Link href="/">
            <TinocleanLogo size={34} />
          </Link>
          <Link href="/auth/register" className="btn-tino-secondary text-xs px-3.5 py-2">
            Create Account
          </Link>
        </div>

        {order ? (
          <>
            <DigitalTicket order={order} settings={settings} />
            <div className="card-tino p-4 text-center text-xs text-slate-600 no-print">
              Want live wash updates &amp; full order history on your phone?{" "}
              <Link href="/auth/register" className="font-bold text-[#264099] hover:underline">
                Register with your email
              </Link>{" "}
              and install the Tinoclean app.
            </div>
          </>
        ) : (
          <div className="card-tino p-8 text-center space-y-3">
            <div className="font-extrabold text-[#0B2049]">Ticket link not found</div>
            <p className="text-xs text-slate-500">
              This digital ticket link is invalid or has expired.
            </p>
            <Link href="/" className="btn-tino-primary text-xs px-4 py-2.5">
              Go to Tinoclean Home
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
