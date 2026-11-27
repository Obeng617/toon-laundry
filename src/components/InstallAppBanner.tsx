"use client";

import React, { useEffect, useState } from "react";
import { Download, Share, Smartphone, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallAppBanner({ compact = false }: { compact?: boolean }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);

    const ua = window.navigator.userAgent.toLowerCase();
    setIsIos(/iphone|ipad|ipod/.test(ua));

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (isStandalone || dismissed) return null;

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setDeferredPrompt(null);
      }
    } else if (isIos) {
      setShowIosGuide(true);
    } else {
      setShowIosGuide(true);
    }
  };

  return (
    <div className="card-tino p-4 bg-gradient-to-r from-[#eff7fc] to-white border border-sky-200/80 no-print">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-[14px] bg-tino-gradient text-white flex items-center justify-center shrink-0">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-sm text-[#0B2049]">Install Tinoclean App</div>
            <p className="text-xs text-slate-600 mt-0.5">
              {compact
                ? "Add to your home screen for instant order tracking, push alerts and unread badges."
                : "Install Tinoclean on your phone or computer for one-tap booking, live push notifications and the red unread-count badge on the app icon."}
            </p>
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleInstall}
                className="inline-flex items-center gap-1.5 rounded-xl bg-tino-gradient px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                {deferredPrompt ? "Install Tinoclean" : isIos ? "How to Install on iPhone" : "Install App"}
              </button>
              <button
                type="button"
                onClick={() => setDismissed(true)}
                className="text-xs font-medium text-slate-500 hover:text-slate-700 px-2 py-1 cursor-pointer"
              >
                Not now
              </button>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss install banner"
          className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {showIosGuide && (
        <div className="mt-3 rounded-xl bg-white border border-sky-100 p-3 text-xs text-slate-700 space-y-1.5">
          <div className="font-semibold text-[#0B2049] flex items-center gap-1.5">
            <Share className="w-3.5 h-3.5 text-[#02A1DB]" />
            {isIos ? "iPhone & iPad Installation Steps" : "Install via Browser Menu"}
          </div>
          {isIos ? (
            <ol className="list-decimal list-inside space-y-1 text-slate-600">
              <li>
                Tap the <strong>Share</strong> icon in Safari&apos;s toolbar.
              </li>
              <li>
                Scroll down and tap <strong>Add to Home Screen</strong>.
              </li>
              <li>
                Open Tinoclean from your Home Screen and allow notifications to enable the red unread badge.
              </li>
            </ol>
          ) : (
            <p className="text-slate-600">
              Open your browser menu (<strong>⋮</strong> or address bar install icon) and select{" "}
              <strong>Install Tinoclean</strong> or <strong>Add to Home screen</strong>.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
