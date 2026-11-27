import React from "react";
import { LaundryService } from "@/lib/types";

/**
 * Bespoke, high-contrast duotone SVG laundry icons for Tinoclean services.
 * Designed with royal blue (#264099) and sky blue (#02A1DB) accents so they
 * remain crisp and vibrant in every state.
 */
export function ServiceIcon({
  name,
  slug,
  className = "w-7 h-7",
}: {
  name: LaundryService["iconName"];
  slug?: string;
  className?: string;
}) {
  const key = slug || name;

  // 1. Wash, Dry & Fold — Front-load washing machine drum with water wave & bubbles
  if (key === "wash-dry-fold" || key === "shirt") {
    return (
      <svg
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-hidden="true"
      >
        <rect
          x="4"
          y="3"
          width="28"
          height="30"
          rx="6"
          fill="#E6F4FB"
          stroke="#264099"
          strokeWidth="2.2"
        />
        <line x1="4" y1="10" x2="32" y2="10" stroke="#264099" strokeWidth="2" />
        <circle cx="9" cy="6.5" r="1.4" fill="#02A1DB" />
        <circle cx="13.5" cy="6.5" r="1.4" fill="#264099" />
        <rect x="23" y="5.3" width="5" height="2.4" rx="1.2" fill="#02A1DB" />
        <circle
          cx="18"
          cy="21.5"
          r="7.8"
          fill="#FFFFFF"
          stroke="#264099"
          strokeWidth="2.2"
        />
        <path
          d="M11.2 22.2C13 20.4 15.2 20.4 18 22.2C20.8 24 23 24 24.8 22.2C24.4 25.9 21.5 28.5 18 28.5C14.5 28.5 11.6 25.9 11.2 22.2Z"
          fill="#02A1DB"
          fillOpacity="0.35"
        />
        <path
          d="M11.5 22C13.5 20.2 15.8 20.2 18 22C20.2 23.8 22.5 23.8 24.5 22"
          stroke="#02A1DB"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="16" cy="17.5" r="1.1" fill="#02A1DB" />
        <circle cx="20.5" cy="18.5" r="0.9" fill="#264099" />
      </svg>
    );
  }

  // 2. Light Duvet — Quilted comforter & soft pillows
  if (key === "light-duvet" || key === "bed") {
    return (
      <svg
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-hidden="true"
      >
        {/* Headboard & Pillows */}
        <path
          d="M6 15V9C6 7.34315 7.34315 6 9 6H27C28.6569 6 30 7.34315 30 9V15"
          stroke="#264099"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <rect
          x="8.5"
          y="9.5"
          width="8"
          height="5.5"
          rx="2.2"
          fill="#E6F4FB"
          stroke="#02A1DB"
          strokeWidth="1.8"
        />
        <rect
          x="19.5"
          y="9.5"
          width="8"
          height="5.5"
          rx="2.2"
          fill="#E6F4FB"
          stroke="#02A1DB"
          strokeWidth="1.8"
        />
        {/* Quilted Duvet Body */}
        <rect
          x="4"
          y="15"
          width="28"
          height="14"
          rx="4"
          fill="#02A1DB"
          fillOpacity="0.18"
          stroke="#264099"
          strokeWidth="2.2"
        />
        <path
          d="M4 19.5H32"
          stroke="#02A1DB"
          strokeWidth="1.8"
          strokeDasharray="3 2.5"
        />
        <path
          d="M13 15V29M23 15V29"
          stroke="#264099"
          strokeWidth="1.6"
          strokeOpacity="0.45"
        />
        <path
          d="M7 29V31.5M29 29V31.5"
          stroke="#264099"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  // 3. Heavy Duvet — Multi-layered plush folded duvet stack with fresh sparkles
  if (key === "heavy-duvet" || key === "sparkles") {
    return (
      <svg
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-hidden="true"
      >
        {/* Top Folded Plush Layer */}
        <rect
          x="5"
          y="9"
          width="26"
          height="6.5"
          rx="3.25"
          fill="#E6F4FB"
          stroke="#264099"
          strokeWidth="2.1"
        />
        <path
          d="M10 12.2H26"
          stroke="#02A1DB"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        {/* Middle Thick Quilted Layer */}
        <rect
          x="4"
          y="16.5"
          width="28"
          height="7"
          rx="3.5"
          fill="#02A1DB"
          fillOpacity="0.25"
          stroke="#264099"
          strokeWidth="2.1"
        />
        <path
          d="M12 16.5V23.5M18 16.5V23.5M24 16.5V23.5"
          stroke="#264099"
          strokeWidth="1.6"
        />
        {/* Bottom Heavy Base Layer */}
        <rect
          x="5"
          y="24.5"
          width="26"
          height="6.5"
          rx="3.25"
          fill="#264099"
          fillOpacity="0.14"
          stroke="#264099"
          strokeWidth="2.1"
        />
        {/* Fresh Sparkle Star */}
        <path
          d="M29 3L30 5.3L32.3 6.3L30 7.3L29 9.6L28 7.3L25.7 6.3L28 5.3L29 3Z"
          fill="#02A1DB"
        />
        <circle cx="8" cy="5.5" r="1.3" fill="#02A1DB" />
      </svg>
    );
  }

  // 4. Express (Same Day) — Fast-spin clock / drum with high-voltage lightning bolt
  return (
    <svg
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle
        cx="18"
        cy="18.5"
        r="13"
        fill="#E6F4FB"
        stroke="#264099"
        strokeWidth="2.2"
      />
      <path
        d="M18 9.5C22.9706 9.5 27 13.5294 27 18.5"
        stroke="#02A1DB"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M15 3.5H21"
        stroke="#264099"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M19.5 11.5L13.5 19.2H18.2L16.5 25.5L22.8 17.6H18L19.5 11.5Z"
        fill="#02A1DB"
        stroke="#264099"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}
