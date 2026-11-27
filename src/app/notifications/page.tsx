"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck, Mail, Volume2, VolumeX } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { InstallAppBanner } from "@/components/InstallAppBanner";
import { useApp } from "@/context/AppContext";
import { playTinocleanTone, subscribeToWebPush } from "@/lib/pwa";

export default function NotificationsPage() {
  const {
    currentUser,
    userNotifications,
    unreadCount,
    markNotificationRead,
    markAllNotificationsRead,
    updateProfile,
  } = useApp();

  const [pushMessage, setPushMessage] = useState("");
  const mode =
    currentUser?.role === "admin" || currentUser?.role === "staff" ? "admin" : "customer";

  const handleEnablePush = async () => {
    if (!currentUser) return;
    const res = await subscribeToWebPush(currentUser.id);
    setPushMessage(res.message);
    if (res.ok) {
      await updateProfile({ pushNotificationsEnabled: true });
    }
  };

  return (
    <AppShell mode={mode}>
      <div className="max-w-3xl mx-auto space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#02A1DB]">
              Alerts &amp; Updates
            </p>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B2049] flex items-center gap-2.5">
              Notifications
              {unreadCount > 0 && (
                <span className="rounded-full bg-[#FF4D4D] text-white text-xs font-extrabold px-2.5 py-0.5">
                  {unreadCount} unread
                </span>
              )}
            </h1>
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllNotificationsRead}
              className="btn-tino-primary text-xs px-3.5 py-2 self-start"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Mark all read
            </button>
          )}
        </div>

        {/* Notification & Sound Controls (Section 8.1 - 8.4) */}
        {currentUser && (
          <div className="card-tino p-4 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Preferences
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={handleEnablePush}
                className="rounded-xl border border-slate-200 bg-[#F5F9FA] hover:bg-[#edf6fc] px-3.5 py-2.5 text-left transition cursor-pointer"
              >
                <div className="flex items-center gap-2 text-xs font-bold text-[#0B2049]">
                  <Bell className="w-4 h-4 text-[#264099]" />
                  Web Push Alerts
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Enable browser push &amp; app icon badge
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  const next = !currentUser.soundEnabled;
                  updateProfile({ soundEnabled: next });
                  if (next) playTinocleanTone(true);
                }}
                className="rounded-xl border border-slate-200 bg-[#F5F9FA] hover:bg-[#edf6fc] px-3.5 py-2.5 text-left transition cursor-pointer"
              >
                <div className="flex items-center gap-2 text-xs font-bold text-[#0B2049]">
                  {currentUser.soundEnabled ? (
                    <Volume2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <VolumeX className="w-4 h-4 text-slate-400" />
                  )}
                  Tinoclean Sound: {currentUser.soundEnabled ? "On" : "Muted"}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Plays 2.2s chime in-app
                </div>
              </button>

              <button
                type="button"
                onClick={() =>
                  updateProfile({
                    emailNotificationsEnabled: !currentUser.emailNotificationsEnabled,
                  })
                }
                className="rounded-xl border border-slate-200 bg-[#F5F9FA] hover:bg-[#edf6fc] px-3.5 py-2.5 text-left transition cursor-pointer"
              >
                <div className="flex items-center gap-2 text-xs font-bold text-[#0B2049]">
                  <Mail className="w-4 h-4 text-[#02A1DB]" />
                  Email Updates: {currentUser.emailNotificationsEnabled ? "On" : "Off"}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Order status copies via Google SMTP
                </div>
              </button>
            </div>
            {pushMessage && (
              <p className="text-xs font-semibold text-[#264099] bg-sky-50 rounded-xl px-3 py-2">
                {pushMessage}
              </p>
            )}
          </div>
        )}

        <InstallAppBanner compact />

        <div className="space-y-2.5">
          {userNotifications.length === 0 ? (
            <div className="card-tino p-10 text-center space-y-2">
              <Bell className="w-10 h-10 text-slate-300 mx-auto" />
              <div className="font-bold text-[#0B2049]">No notifications yet</div>
              <p className="text-xs text-slate-500">
                Every order status change, discount reward and receipt update will appear here.
              </p>
            </div>
          ) : (
            userNotifications.map((ntf) => {
              const targetHref = ntf.orderId
                ? mode === "admin"
                  ? `/tc-ops-m9x4k7p2/orders`
                  : `/orders/${ntf.orderId}`
                : "#";
              return (
                <div
                  key={ntf.id}
                  onClick={() => {
                    if (!ntf.isRead) markNotificationRead(ntf.id);
                  }}
                  className={`card-tino p-4 transition cursor-pointer ${
                    ntf.isRead
                      ? "bg-white opacity-85"
                      : "bg-gradient-to-r from-[#eff8fd] to-white border-l-4 border-l-[#02A1DB]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {!ntf.isRead && (
                          <span className="w-2.5 h-2.5 rounded-full bg-[#FF4D4D] shrink-0" />
                        )}
                        <span className="font-extrabold text-sm text-[#0B2049]">{ntf.title}</span>
                        {ntf.tagNumber && (
                          <span className="rounded-md bg-[#edf5fb] text-[#264099] px-2 py-0.5 text-[11px] font-bold">
                            {ntf.tagNumber}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-600">{ntf.body}</p>
                      <div className="text-[11px] text-slate-400">
                        {new Date(ntf.createdAt).toLocaleString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                    {ntf.orderId && (
                      <Link
                        href={targetHref}
                        className="shrink-0 rounded-xl bg-white border border-slate-200 px-3 py-1.5 text-xs font-bold text-[#264099] hover:bg-sky-50"
                      >
                        View
                      </Link>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </AppShell>
  );
}
