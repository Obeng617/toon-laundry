"use client";

import React, { useState } from "react";
import { CheckCircle2, GraduationCap, RotateCcw, Search, ShieldOff, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useApp } from "@/context/AppContext";

/**
 * Section 5.1 & 8.6: Admin Student Verification Screen
 * Lists all students who have verified a UPSA student email (idnumber@upsamail.edu.gh),
 * showing school email, student ID number, date verified, and 12-month expiry date.
 * Allows Admin to search, revoke or reinstate student status with a logged reason.
 */
export default function AdminStudentVerificationPage() {
  const { users, revokeOrReinstateStudent } = useApp();
  const [query, setQuery] = useState("");
  const [modalTarget, setModalTarget] = useState<{
    userId: string;
    fullName: string;
    action: "revoke" | "reinstate";
  } | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const studentAccounts = users
    .filter((u) => u.upsaEmail || u.studentStatus !== "none")
    .filter((u) => {
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return (
        u.fullName.toLowerCase().includes(q) ||
        (u.upsaEmail || "").toLowerCase().includes(q) ||
        (u.studentIdNumber || "").toLowerCase().includes(q)
      );
    });

  const handleConfirmAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalTarget) return;
    setError("");
    const res = await revokeOrReinstateStudent(
      modalTarget.userId,
      modalTarget.action,
      reason
    );
    if (!res.ok) {
      setError(res.error || "Failed to update student status.");
      return;
    }
    setModalTarget(null);
    setReason("");
  };

  return (
    <AppShell mode="admin">
      <div className="space-y-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[#02A1DB]">
            UPSA Student Eligibility (@upsamail.edu.gh)
          </p>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B2049]">
            Student Verification
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Students verify by confirming an OTP sent to their official{" "}
            <strong>idnumber@upsamail.edu.gh</strong> address (valid for 12 months). You can revoke
            or reinstate status below with a reason.
          </p>
        </div>

        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by student name, ID number or @upsamail.edu.gh..."
            className="input-tino pl-10"
          />
        </div>

        <div className="card-tino overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F5F9FA] text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">UPSA Email</th>
                  <th className="px-4 py-3">Student ID Number</th>
                  <th className="px-4 py-3">Date Verified</th>
                  <th className="px-4 py-3">Expiry Date (12 Months)</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {studentAccounts.map((s) => (
                  <tr key={s.id} className="hover:bg-[#F6FFFF]">
                    <td className="px-4 py-3">
                      <div className="font-bold text-[#0B2049]">{s.fullName}</div>
                      <div className="text-xs text-slate-400">{s.phone}</div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-[#264099]">
                      {s.upsaEmail || "—"}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-[#0B2049]">
                      {s.studentIdNumber || "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {s.studentVerifiedAt
                        ? new Date(s.studentVerifiedAt).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {s.studentExpiresAt
                        ? new Date(s.studentExpiresAt).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {s.studentStatus === "verified" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-0.5 text-xs font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Verified
                        </span>
                      ) : s.studentStatus === "revoked" ? (
                        <div>
                          <span className="rounded-full bg-red-100 text-red-700 px-2.5 py-0.5 text-xs font-bold">
                            Revoked
                          </span>
                          {s.studentRevokedReason && (
                            <div className="text-[11px] text-red-600 mt-0.5">
                              {s.studentRevokedReason}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="rounded-full bg-amber-100 text-amber-800 px-2.5 py-0.5 text-xs font-bold">
                          Expired
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {s.studentStatus === "verified" ? (
                        <button
                          type="button"
                          onClick={() => {
                            setModalTarget({
                              userId: s.id,
                              fullName: s.fullName,
                              action: "revoke",
                            });
                            setReason("");
                            setError("");
                          }}
                          className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 px-3 py-1.5 text-xs font-bold text-red-700 cursor-pointer"
                        >
                          <ShieldOff className="w-3.5 h-3.5" />
                          Revoke
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setModalTarget({
                              userId: s.id,
                              fullName: s.fullName,
                              action: "reinstate",
                            });
                            setReason("");
                            setError("");
                          }}
                          className="inline-flex items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-800 cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Reinstate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {studentAccounts.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-xs text-slate-500">
                      <GraduationCap className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      No verified UPSA student accounts found yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Revoke / Reinstate Reason Modal */}
        {modalTarget && (
          <div className="fixed inset-0 z-50 bg-[#0B2049]/50 backdrop-blur-xs flex items-center justify-center p-4">
            <form
              onSubmit={handleConfirmAction}
              className="card-tino w-full max-w-md p-6 space-y-4 bg-white"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-[#0B2049]">
                  {modalTarget.action === "revoke"
                    ? `Revoke Student Status — ${modalTarget.fullName}`
                    : `Reinstate Student Status — ${modalTarget.fullName}`}
                </h3>
                <button
                  type="button"
                  onClick={() => setModalTarget(null)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Reason (saved in audit trail)
                </label>
                <input
                  type="text"
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Enter reason..."
                  className="input-tino"
                />
              </div>
              {error && <p className="text-xs font-bold text-red-600">{error}</p>}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalTarget(null)}
                  className="btn-tino-secondary text-xs px-4 py-2"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-tino-primary text-xs px-4 py-2">
                  Confirm
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </AppShell>
  );
}
