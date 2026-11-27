import React from "react";

export function TinocleanIcon({
  size = 40,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 512 512"
      className={className}
      aria-label="Tinoclean icon"
    >
      <defs>
        <linearGradient id="tino-logo-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#264099" />
          <stop offset="1" stopColor="#02A1DB" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="112" fill="url(#tino-logo-g)" />
      <path
        d="M256 86 C256 86 150 206 150 292 a106 106 0 0 0 212 0 C362 206 256 86 256 86 Z"
        fill="#fff"
      />
      <path
        d="M214 252 h84 M256 252 v96"
        stroke="#264099"
        strokeWidth="30"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="368" cy="128" r="16" fill="#fff" opacity=".9" />
      <circle cx="410" cy="176" r="10" fill="#fff" opacity=".75" />
      <circle cx="130" cy="150" r="12" fill="#fff" opacity=".8" />
    </svg>
  );
}

export function TinocleanLogo({
  size = 38,
  subtitle,
  light = false,
}: {
  size?: number;
  subtitle?: string;
  light?: boolean;
}) {
  return (
    <div className="inline-flex items-center gap-2.5 select-none">
      <TinocleanIcon size={size} className="shrink-0 shadow-sm rounded-[10px]" />
      <div className="leading-tight">
        <div
          className={`font-extrabold tracking-tight text-lg ${
            light ? "text-white" : "text-[#0B2049]"
          }`}
        >
          TINO <span className={light ? "text-[#7DE2FF]" : "text-[#02A1DB]"}>CLEAN</span>
        </div>
        {subtitle && (
          <div
            className={`text-[11px] font-semibold tracking-wider uppercase ${
              light ? "text-sky-200" : "text-slate-500"
            }`}
          >
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
}
