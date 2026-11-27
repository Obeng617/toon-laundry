"use client";

import React from "react";
import { BellRing, X } from "lucide-react";
import { useApp } from "@/context/AppContext";

export function ToastBanner() {
  const { toast, dismissToast } = useApp();
  if (!toast) return null;

  return (
    <div className="fixed top-4 right-4 left-4 sm:left-auto sm:w-96 z-50 no-print animate-in fade-in slide-in-from-top-2">
      <div className="card-tino p-3.5 border-l-4 border-l-[#02A1DB] bg-white shadow-xl flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-tino-gradient text-white flex items-center justify-center shrink-0">
          <BellRing className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm text-[#0B2049]">{toast.title}</div>
          <p className="text-xs text-slate-600 mt-0.5 leading-snug">{toast.body}</p>
        </div>
        <button
          type="button"
          onClick={dismissToast}
          aria-label="Close notification"
          className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
