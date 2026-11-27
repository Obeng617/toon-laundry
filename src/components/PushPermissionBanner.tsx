"use client";

import React, { useEffect, useState } from "react";
import { BellRing, X } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { subscribeToWebPush } from "@/lib/pwa";

export function PushPermissionBanner() {
  const { currentUser, updateProfile } = useApp();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window) || !currentUser) {
      setVisible(false);
      return;
    }
    const dismissed = sessionStorage.getItem("tc_push_banner_dismissed") === "1";
    if (!dismissed && Notification.permission === "default") {
      setVisible(true);
    } else {
      setVisible(false);
    }
  }, [currentUser]);

  if (!visible || !currentUser) return null;

  const handleEnable = async () => {
    const res = await subscribeToWebPush(currentUser.id);
    if (res.ok) {
      await updateProfile({ pushNotificationsEnabled: true });
    }
    setVisible(false);
  };

  const handleDismiss = () => {
    sessionStorage.setItem("tc_push_banner_dismissed", "1");
    setVisible(false);
  };

  return (
    <div className="mb-4 rounded-2xl bg-gradient-to-r from-[#264099] to-[#02A1DB] text-white p-3.5 sm:px-5 shadow-md flex items-center justify-between gap-3 no-print">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
          <BellRing className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="text-xs sm:text-sm font-extrabold">
            Enable Notifications &amp; Red App Icon Badge
          </div>
          <p className="text-[11px] sm:text-xs text-sky-100 truncate sm:whitespace-normal">
            Get instant laundry alerts, sound, and the unread count badge on your home screen icon.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={handleEnable}
          className="rounded-xl bg-white text-[#264099] hover:bg-sky-50 px-3 py-1.5 text-xs font-extrabold shadow-xs cursor-pointer"
        >
          Allow
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss"
          className="text-white/80 hover:text-white p-1 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
