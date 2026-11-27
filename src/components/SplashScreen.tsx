"use client";

import React, { useEffect, useState } from "react";
import { useApp } from "@/context/AppContext";
import { TinocleanIcon } from "./TinocleanLogo";

export function SplashScreen() {
  const { hydrated } = useApp();
  const [minDelayDone, setMinDelayDone] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    // Only show the animated launch splash once per app session
    if (typeof window !== "undefined" && sessionStorage.getItem("tc_splash_shown") === "1") {
      setHidden(true);
      return;
    }

    const minTimer = setTimeout(() => {
      setMinDelayDone(true);
    }, 950);

    return () => clearTimeout(minTimer);
  }, []);

  useEffect(() => {
    if (hidden) return;
    if (hydrated && minDelayDone) {
      setFadingOut(true);
      sessionStorage.setItem("tc_splash_shown", "1");
      const fadeTimer = setTimeout(() => {
        setHidden(true);
      }, 350);
      return () => clearTimeout(fadeTimer);
    }
  }, [hydrated, minDelayDone, hidden]);

  if (hidden) return null;

  return (
    <div
      aria-label="Loading Tinoclean Laundry"
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-between px-6 py-12 text-white bg-gradient-to-br from-[#0B2049] via-[#264099] to-[#02A1DB] transition-opacity duration-350 ${
        fadingOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* Top spacer */}
      <div />

      {/* Center Animated Brand & Tagline */}
      <div className="flex flex-col items-center text-center space-y-5">
        <div className="relative flex items-center justify-center">
          <span className="absolute w-28 h-28 rounded-[32px] bg-white/15 animate-ping" />
          <span className="absolute w-24 h-24 rounded-[28px] bg-white/20 animate-pulse" />
          <div className="relative rounded-[24px] p-1.5 bg-white/15 backdrop-blur-sm shadow-2xl">
            <TinocleanIcon size={84} className="rounded-[20px]" />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="text-3xl sm:text-4xl font-black tracking-tight">
            TINO <span className="text-[#7DE2FF]">CLEAN</span>
          </div>
          <div className="text-xs sm:text-sm font-bold tracking-[0.26em] uppercase text-sky-200">
            Laundry Management
          </div>
        </div>

        <p className="text-sm font-medium text-sky-100/90 max-w-xs leading-relaxed">
          Fresh, neatly folded laundry — tracked live from pickup to delivery.
        </p>
      </div>

      {/* Bottom Loading Indicator */}
      <div className="flex flex-col items-center gap-3 w-full max-w-[200px]">
        <div className="w-full h-1.5 rounded-full bg-white/20 overflow-hidden">
          <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-[#7DE2FF] to-white animate-pulse" />
        </div>
        <span className="text-[11px] font-semibold tracking-wider uppercase text-sky-100/80">
          Loading Tinoclean...
        </span>
      </div>
    </div>
  );
}
