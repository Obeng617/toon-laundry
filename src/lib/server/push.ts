import webpush from "web-push";

let vapidConfigured = false;

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

export async function sendWebPush(
  subscription: PushSubscriptionRecord,
  payload: {
    title: string;
    body: string;
    url: string;
    tag: string;
    unreadCount: number;
  }
): Promise<{ ok: boolean; error?: string }> {
  if (!ensureVapid()) {
    return { ok: true };
  }

  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      },
      JSON.stringify(payload)
    );
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Push delivery failed";
    console.error("[Tinoclean WebPush Error]", message);
    return { ok: false, error: message };
  }
}
