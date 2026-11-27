"use client";

import React, { useState } from "react";
import { CheckCircle2, UserPlus } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useApp } from "@/context/AppContext";

export default function AdminStaffPage() {
  const { users, orders, createStaffAccount } = useApp();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const staffMembers = users.filter((u) => u.role === "admin" || u.role === "staff");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setMsg("");
    if (password.length < 8) {
      setErr("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    try {
      const res = await createStaffAccount({ fullName, email, phone, password });
      if (!res.ok) {
        setErr(res.error || "Could not create staff account.");
        return;
      }
      setFullName("");
      setEmail("");
      setPhone("");
      setPassword("");
      setMsg("Staff account created in Supabase Auth.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell mode="admin">
      <div className="space-y-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[#02A1DB]">Team</p>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B2049]">Staff Accounts</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Create Tinoclean staff accounts and view allocated orders. Riders are out of scope —
            only Tinoclean staff record weights, status changes and payments.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <form onSubmit={handleCreate} className="card-tino p-5 space-y-3.5">
            <div className="flex items-center gap-2 font-extrabold text-[#0B2049]">
              <UserPlus className="w-5 h-5 text-[#264099]" />
              Create Staff Account
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Staff full name"
                className="input-tino"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="staff@tinoclean.com"
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
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                placeholder="0551750854"
                className="input-tino"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Initial Password (min 8 chars)
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Temporary password"
                className="input-tino"
              />
            </div>

            {msg && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-2.5 text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                {msg}
              </div>
            )}
            {err && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-2.5 text-xs font-bold text-red-700">
                {err}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-tino-primary w-full py-2.5 text-xs"
            >
              {loading ? "Creating..." : "Create Staff Account"}
            </button>
          </form>

          <div className="lg:col-span-2 card-tino overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-extrabold text-[#0B2049]">Active Admin &amp; Staff</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#F5F9FA] text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Contact</th>
                    <th className="px-4 py-3">Assigned Orders</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {staffMembers.map((s) => {
                    const assigned = orders.filter((o) => o.assignedStaffId === s.id).length;
                    return (
                      <tr key={s.id}>
                        <td className="px-4 py-3 font-bold text-[#0B2049]">{s.fullName}</td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-[#edf5fb] text-[#264099] px-2.5 py-0.5 text-xs font-extrabold uppercase">
                            {s.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600">
                          <div>{s.phone}</div>
                          <div className="text-slate-400">{s.email}</div>
                        </td>
                        <td className="px-4 py-3 font-extrabold text-[#0B2049]">{assigned}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
