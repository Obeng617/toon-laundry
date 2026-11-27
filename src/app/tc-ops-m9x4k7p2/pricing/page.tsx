"use client";

import React, { useState } from "react";
import { Plus, Save } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ServiceIcon } from "@/components/ServiceIcon";
import { useApp } from "@/context/AppContext";

export default function AdminPricingPage() {
  const { tariffs, services, updateTariffBracket, addTariffBracket, upsertService } = useApp();

  const [newWeight, setNewWeight] = useState("");
  const [newStudentPrice, setNewStudentPrice] = useState("");
  const [newRegularPrice, setNewRegularPrice] = useState("");
  const [savedNotice, setSavedNotice] = useState("");

  const flashSaved = (msg: string) => {
    setSavedNotice(msg);
    setTimeout(() => setSavedNotice(""), 2500);
  };

  const handleAddBracket = async (e: React.FormEvent) => {
    e.preventDefault();
    const w = Number(newWeight);
    const s = Number(newStudentPrice);
    const r = Number(newRegularPrice);
    if (!w || !s || !r) return;
    await addTariffBracket(w, s, r);
    setNewWeight("");
    setNewStudentPrice("");
    setNewRegularPrice("");
    flashSaved(`Added ${w.toFixed(1)} kg tariff bracket.`);
  };

  return (
    <AppShell mode="admin">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#02A1DB]">
              Tariff &amp; Rate Management
            </p>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B2049]">
              Services &amp; Pricing
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Edit the half-kilogram Student &amp; Regular tariff table (1.0 kg to 10.0 kg) and per-kg
              service rates. Past orders keep their saved tariff snapshot.
            </p>
          </div>
          {savedNotice && (
            <span className="rounded-xl bg-emerald-100 text-emerald-800 px-3.5 py-2 text-xs font-extrabold">
              {savedNotice}
            </span>
          )}
        </div>

        {/* 1. Four Laundry Services & Rates (Section 2 & 3) */}
        <div className="card-tino p-5 space-y-4">
          <h2 className="font-extrabold text-[#0B2049]">Laundry Services &amp; Per-Kg Rates</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {services.map((srv) => (
              <div
                key={srv.id}
                className="rounded-2xl border border-slate-200 bg-[#F5F9FA] p-4 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-11 h-11 rounded-[13px] bg-gradient-to-br from-[#eef7fc] to-[#d9eefb] border border-sky-200/70 flex items-center justify-center shadow-xs">
                      <ServiceIcon name={srv.iconName} slug={srv.slug} className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="font-extrabold text-sm text-[#0B2049]">{srv.name}</div>
                      <div className="text-[11px] text-slate-500">
                        {srv.pricingType === "half_kg_tariff"
                          ? "Uses Half-Kg Tariff Table below"
                          : "Charged per kg (same for Student & Regular)"}
                      </div>
                    </div>
                  </div>
                  <label className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={srv.isActive}
                      onChange={(e) => {
                        upsertService({ ...srv, isActive: e.target.checked });
                        flashSaved(`Updated ${srv.name}`);
                      }}
                      className="accent-[#264099]"
                    />
                    Active
                  </label>
                </div>

                {srv.pricingType === "per_kg" && (
                  <div className="flex items-center justify-between gap-3 pt-1">
                    <label className="text-xs font-bold text-slate-600">Rate per kg (GH₵):</label>
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      defaultValue={srv.perKgRate}
                      onBlur={(e) => {
                        const val = Number(e.target.value);
                        if (val > 0 && val !== srv.perKgRate) {
                          upsertService({ ...srv, perKgRate: val });
                          flashSaved(`Updated ${srv.name} rate to GH₵${val.toFixed(2)}/kg`);
                        }
                      }}
                      className="input-tino bg-white w-28 py-1.5 text-right font-extrabold"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 2. Editable Half-Kilogram Tariff Table (Section 3) */}
        <div className="card-tino overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-extrabold text-[#0B2049]">
              Wash, Dry &amp; Fold — Editable Half-Kilogram Tariff Table
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Edit any bracket price and click outside the box (or press Tab) to save immediately to
              Supabase.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F5F9FA] text-left text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-bold">Weight Bracket (kg)</th>
                  <th className="px-5 py-3 font-bold text-emerald-700">Student Tariff (GH₵)</th>
                  <th className="px-5 py-3 font-bold text-[#264099]">Regular Tariff (GH₵)</th>
                  <th className="px-5 py-3 font-bold">Active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tariffs.map((t) => (
                  <tr key={t.id} className="hover:bg-[#F6FFFF]">
                    <td className="px-5 py-2.5 font-extrabold text-[#0B2049]">
                      {t.weightKg.toFixed(1)} kg
                    </td>
                    <td className="px-5 py-2.5">
                      <input
                        type="number"
                        step="0.5"
                        min="1"
                        defaultValue={t.studentPrice}
                        onBlur={(e) => {
                          const val = Number(e.target.value);
                          if (val > 0 && val !== t.studentPrice) {
                            updateTariffBracket(t.id, { studentPrice: val });
                            flashSaved(
                              `Updated ${t.weightKg.toFixed(1)} kg Student tariff to GH₵${val}`
                            );
                          }
                        }}
                        className="input-tino bg-white w-28 py-1.5 font-bold text-emerald-700"
                      />
                    </td>
                    <td className="px-5 py-2.5">
                      <input
                        type="number"
                        step="0.5"
                        min="1"
                        defaultValue={t.regularPrice}
                        onBlur={(e) => {
                          const val = Number(e.target.value);
                          if (val > 0 && val !== t.regularPrice) {
                            updateTariffBracket(t.id, { regularPrice: val });
                            flashSaved(
                              `Updated ${t.weightKg.toFixed(1)} kg Regular tariff to GH₵${val}`
                            );
                          }
                        }}
                        className="input-tino bg-white w-28 py-1.5 font-bold text-[#264099]"
                      />
                    </td>
                    <td className="px-5 py-2.5">
                      <input
                        type="checkbox"
                        checked={t.isActive}
                        onChange={(e) =>
                          updateTariffBracket(t.id, { isActive: e.target.checked })
                        }
                        className="accent-[#264099] w-4 h-4 cursor-pointer"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Add New Bracket */}
          <form
            onSubmit={handleAddBracket}
            className="p-4 bg-[#F5F9FA] border-t border-slate-200 flex flex-wrap items-end gap-3"
          >
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Weight Bracket (kg)
              </label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                required
                value={newWeight}
                onChange={(e) => setNewWeight(e.target.value)}
                placeholder="e.g. 10.5"
                className="input-tino bg-white w-32 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Student Price (GH₵)
              </label>
              <input
                type="number"
                step="0.5"
                min="1"
                required
                value={newStudentPrice}
                onChange={(e) => setNewStudentPrice(e.target.value)}
                placeholder="e.g. 74"
                className="input-tino bg-white w-32 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Regular Price (GH₵)
              </label>
              <input
                type="number"
                step="0.5"
                min="1"
                required
                value={newRegularPrice}
                onChange={(e) => setNewRegularPrice(e.target.value)}
                placeholder="e.g. 84"
                className="input-tino bg-white w-32 py-2 text-xs"
              />
            </div>
            <button type="submit" className="btn-tino-primary text-xs px-4 py-2.5">
              <Plus className="w-4 h-4" />
              Add Bracket
            </button>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
