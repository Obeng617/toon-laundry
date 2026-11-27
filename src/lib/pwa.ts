"use client";

let audioUnlocked = false;
let unlockListenerAttached = false;

export function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  const doRegister = () => {
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((err) => {
      console.warn("[Tinoclean SW] Registration skipped:", err);
    });
  };

  if (document.readyState === "complete" || document.readyState === "interactive") {
    doRegister();
  } else {
    window.addEventListener("load", doRegister, { once: true });
  }

  setupAudioUnlock();
}

/**
 * Unlocks Web Audio / HTML5 Audio on the user's first tap or keypress anywhere in the app,
 * so notification sounds play automatically by default without extra setup.
 */
export function setupAudioUnlock() {
  if (typeof window === "undefined" || unlockListenerAttached || audioUnlocked) return;
  unlockListenerAttached = true;

  const unlock = () => {
    if (audioUnlocked) return;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        if (ctx.state === "suspended") {
          ctx.resume().catch(() => {});
        }
        const buf = ctx.createBuffer(1, 1, 22050);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(ctx.destination);
        src.start(0);
      }
      audioUnlocked = true;
    } catch {
      // Ignore
    }
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
  };

  window.addEventListener("pointerdown", unlock, { passive: true });
  window.addEventListener("keydown", unlock, { passive: true });
}

/**
 * Plays the original 2.2-second Tinoclean notification tone (Section 8.3).
 * Sound is ON by default for all users; falls back to Web Audio API chime if needed.
 */
export async function playTinocleanTone(enabled = true): Promise<void> {
  if (!enabled || typeof window === "undefined") return;
  try {
    const audio = new Audio("/sounds/tinoclean-tone.wav");
    audio.volume = 0.85;
    await audio.play();
    audioUnlocked = true;
  } catch {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === "suspended") {
        await ctx.resume().catch(() => {});
      }
      const now = ctx.currentTime;
      const freqs = [523.25, 659.25, 783.99, 1046.5];
      freqs.forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(f, now + idx * 0.14);
        gain.gain.setValueAtTime(0.001, now + idx * 0.14);
        gain.gain.exponentialRampToValueAtTime(0.18, now + idx * 0.14 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.14 + 0.65);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.14);
        osc.stop(now + idx * 0.14 + 0.7);
      });
      audioUnlocked = true;
    } catch {
      // Browser requires user gesture before audio
    }
  }
}

export function isAudioUnlocked() {
  return audioUnlocked;
}

/**
 * Syncs the unread count across all device-supported badge layers (Section 8.2):
 * (1) Installed app icon via Badging API (+ service worker message & ready registration)
 * (3) Browser tab title "(N) Tinoclean Laundry" and dynamic red badge on tab favicon
 */
export function syncUnreadBadges(count: number, baseTitle = "Tinoclean Laundry") {
  if (typeof window === "undefined") return;
  const safeCount = Math.max(0, Math.floor(count));

  // Layer 1: App Icon Badging API (Window + Service Worker)
  const nav = navigator as Navigator & {
    setAppBadge?: (contents?: number) => Promise<void>;
    clearAppBadge?: () => Promise<void>;
  };
  if (typeof nav.setAppBadge === "function") {
    if (safeCount > 0) {
      nav.setAppBadge(safeCount).catch(() => {});
    } else if (typeof nav.clearAppBadge === "function") {
      nav.clearAppBadge().catch(() => {});
    }
  }
  if ("serviceWorker" in navigator) {
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: "SET_BADGE",
        count: safeCount,
      });
    }
    navigator.serviceWorker.ready
      .then((reg) => {
        reg.active?.postMessage({ type: "SET_BADGE", count: safeCount });
      })
      .catch(() => {});
  }

  // Layer 3a: Browser tab title
  document.title = safeCount > 0 ? `(${safeCount}) ${baseTitle}` : baseTitle;

  // Layer 3b: Dynamic favicon with red unread badge
  updateFaviconBadge(safeCount);
}

function updateFaviconBadge(count: number) {
  if (typeof document === "undefined") return;
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const img = new Image();
  img.onload = () => {
    ctx.clearRect(0, 0, 64, 64);
    ctx.drawImage(img, 0, 0, 64, 64);

    if (count > 0) {
      const label = count > 99 ? "99+" : String(count);
      const radius = count > 9 ? 19 : 16;
      const cx = 64 - radius - 1;
      const cy = radius + 1;

      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = "#FF4D4D";
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#FFFFFF";
      ctx.stroke();

      ctx.fillStyle = "#FFFFFF";
      ctx.font = `bold ${count > 9 ? 17 : 20}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, cx, cy + 1);
    }

    let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = canvas.toDataURL("image/png");
  };
  img.src = "/icons/icon.svg";
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Automatically syncs Web Push subscription if notification permission is already granted.
 */
export async function syncExistingPushSubscription(userId: string): Promise<void> {
  if (
    typeof window === "undefined" ||
    !("Notification" in window) ||
    Notification.permission !== "granted" ||
    !("serviceWorker" in navigator)
  ) {
    return;
  }
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) return;

  try {
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
    }
    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, subscription: sub.toJSON() }),
    });
  } catch {
    // Ignore
  }
}

export async function subscribeToWebPush(userId: string): Promise<{
  ok: boolean;
  permission: NotificationPermission | "unsupported";
  message: string;
}> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return {
      ok: false,
      permission: "unsupported",
      message: "Push notifications are not supported on this browser.",
    };
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return {
      ok: false,
      permission,
      message:
        "Notification permission was not granted. You will still see all updates in your Notification Centre.",
    };
  }

  await syncExistingPushSubscription(userId);

  return {
    ok: true,
    permission: "granted",
    message: "Push notifications & app icon badge enabled! You'll get live Tinoclean updates.",
  };
}
