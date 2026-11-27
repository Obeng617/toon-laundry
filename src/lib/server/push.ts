import webpush from "web-push";

let vapidConfigured = false;

export function isVapidConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY
  );
}

function ensureVapid(): boolean {
  if (vapidConfigured) return true;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:support@tinoclean.com";

  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
  return true;
}

export interface PushSubscriptionRecord {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface PushSendResult {
  ok: boolean;
  statusCode?: number;
  error?: string;
  notConfigured?: boolean;
}

export async function sendWebPush(
  subscription: PushSubscriptionRecord,
  payload: {
    title: string;
    body: string;
    url: string;
    tag: string;
    unreadCount: number;
  }
): Promise<PushSendResult> {
  if (!ensureVapid()) {
    console.warn("[Tinoclean WebPush] VAPID keys are not configured on the server.");
    return {
      ok: false,
      notConfigured: true,
      error: "VAPID keys (NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY) missing on server.",
    };
  }

  try {
    const result = await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      },
      JSON.stringify(payload)
    );
    return { ok: true, statusCode: result?.statusCode || 201 };
  } catch (err: unknown) {
    const pushErr = err as { statusCode?: number; body?: string; message?: string };
    const statusCode = pushErr?.statusCode;
    const message = pushErr?.body || pushErr?.message || "Push delivery failed";
    console.error("[Tinoclean WebPush Error]", {
      statusCode,
      endpointHost: (() => {
        try {
          return new URL(subscription.endpoint).host;
        } catch {
          return "unknown";
        }
      })(),
      message,
    });
    return { ok: false, statusCode, error: message };
  }
}
