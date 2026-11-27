"use client";

import React, { useEffect, useState } from "react";
import { BellRing, CheckCircle2, Save } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useApp } from "@/context/AppContext";

export default function AdminSettingsPage() {
  const { currentUser, settings, updateBusinessSettings } = useApp();

  const [form, setForm] = useState(settings);
  const [saved, setSaved] = useState(false);
  const [pushTestStatus, setPushTestStatus] = useState<string>("");
  const [pushTesting, setPushTesting] = useState(false);

  const handleSendTestPush = async () => {
    if (!currentUser) return;
    setPushTesting(true);
    setPushTestStatus("");
    try {
      const res = await fetch("/api/admin/push/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actorId: currentUser.id, badgeCount: 3 }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setPushTestStatus(`Error: ${data.error || "Failed to send test push."}`);
      } else if (data.pushSent === 0 && (!data.results || data.results.length === 0)) {
        setPushTestStatus(data.message || "No subscribed devices found for your admin account.");
      } else {
        const summary = (data.results || [])
          .map(
            (r: { endpointHost: string; statusCode?: number; ok: boolean; deleted?: boolean; error?: string }) =>
              `${r.endpointHost}: HTTP ${r.statusCode || "?"} (${r.ok ? "OK" : r.deleted ? "Deleted stale 404/410" : r.error})`
          )
          .join(" | ");
        setPushTestStatus(`Sent ${data.pushSent}/${data.results?.length || 0} push(es) with badge=3. ${summary}`);
      }
    } catch {
      setPushTestStatus("Network error while sending test push.");
    } finally {
      setPushTesting(false);
    }
  };

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateBusinessSettings(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <AppShell mode="admin">
      <div className="max-w-3xl space-y-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[#02A1DB]">
            Configuration
          </p>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B2049]">Business Settings</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Configure Tinoclean contact details, business hours, GhanaPay wallet, turnaround time,
            and loyalty/referral discount rules.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card-tino p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Business Name</label>
              <input
                type="text"
                value={form.businessName}
                onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                className="input-tino"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Location</label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="input-tino"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Phone Number (Calls &amp; Payment)
              </label>
              <input
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={15}
                value={form.phone}
                onChange={(e) =>
                  setForm({ ...form, phone: e.target.value.replace(/\D/g, "") })
                }
                placeholder="0551750854"
                className="input-tino"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                WhatsApp Number (International format)
              </label>
              <input
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={15}
                value={form.whatsappNumber}
                onChange={(e) =>
                  setForm({ ...form, whatsappNumber: e.target.value.replace(/\D/g, "") })
                }
                placeholder="233551750854"
                className="input-tino"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                GhanaPay / MoMo Number
              </label>
              <input
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={15}
                value={form.momoNumber}
                onChange={(e) =>
                  setForm({ ...form, momoNumber: e.target.value.replace(/\D/g, "") })
                }
                placeholder="0551750854"
                className="input-tino"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Wallet Network</label>
              <input
                type="text"
                value={form.momoNetwork}
                onChange={(e) => setForm({ ...form, momoNetwork: e.target.value })}
                className="input-tino"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Recipient Name</label>
              <input
                type="text"
                value={form.momoAccountName}
                onChange={(e) => setForm({ ...form, momoAccountName: e.target.value })}
                className="input-tino"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Business Hours</label>
              <input
                type="text"
                value={form.operatingHours}
                onChange={(e) => setForm({ ...form, operatingHours: e.target.value })}
                className="input-tino"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Pickup &amp; Delivery Coverage
              </label>
              <input
                type="text"
                value={form.coverageAreas}
                onChange={(e) => setForm({ ...form, coverageAreas: e.target.value })}
                className="input-tino"
              />
            </div>
          </div>

          {/* Turnaround & Discount Rules (Section 3) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Default Turnaround (Hours)
              </label>
              <input
                type="number"
                min="1"
                value={form.defaultTurnaroundHours}
                onChange={(e) =>
                  setForm({ ...form, defaultTurnaroundHours: Number(e.target.value) })
                }
                className="input-tino"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Loyalty Washes Required
              </label>
              <input
                type="number"
                min="1"
                value={form.loyaltyWashesRequired}
                onChange={(e) =>
                  setForm({ ...form, loyaltyWashesRequired: Number(e.target.value) })
                }
                className="input-tino"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Discount Percentage (%)
              </label>
              <input
                type="number"
                step="0.5"
                min="1"
                max="100"
                value={form.discountPercent}
                onChange={(e) => setForm({ ...form, discountPercent: Number(e.target.value) })}
                className="input-tino"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Owner Daily Summary Email
              </label>
              <input
                type="email"
                value={form.dailySummaryEmail}
                onChange={(e) => setForm({ ...form, dailySummaryEmail: e.target.value })}
                placeholder="owner@tinoclean.com"
                className="input-tino"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Daily Summary Hour (0–23)
              </label>
              <input
                type="number"
                min="0"
                max="23"
                value={form.dailySummaryHour}
                onChange={(e) => setForm({ ...form, dailySummaryHour: Number(e.target.value) })}
                className="input-tino"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button type="submit" className="btn-tino-primary text-xs px-5 py-3">
              <Save className="w-4 h-4" />
              Save Settings
            </button>
            {saved && (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
                <CheckCircle2 className="w-4 h-4" />
                Settings saved to Supabase
              </span>
            )}
          </div>
        </form>

        {/* Admin-Only Push & Badge Diagnostics */}
        {currentUser?.role === "admin" && (
          <div className="card-tino p-6 space-y-3">
            <div className="flex items-center gap-2 font-extrabold text-[#0B2049]">
              <BellRing className="w-5 h-5 text-[#02A1DB]" />
              Web Push &amp; App Icon Badge Test (Admin Only)
            </div>
            <p className="text-xs text-slate-600">
              Sends a real Web Push to your signed-in Admin device(s) with{" "}
              <strong>unreadCount = 3</strong> so you can verify the home-screen app icon badge.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={pushTesting}
                onClick={handleSendTestPush}
                className="btn-tino-secondary text-xs px-4 py-2.5"
              >
                <BellRing className="w-4 h-4" />
                {pushTesting ? "Sending Test Push..." : "Send Test Push (Badge: 3)"}
              </button>
            </div>
            {pushTestStatus && (
              <div className="rounded-xl bg-[#F5F9FA] border border-slate-200 p-3 text-xs font-semibold text-[#0B2049]">
                {pushTestStatus}
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
