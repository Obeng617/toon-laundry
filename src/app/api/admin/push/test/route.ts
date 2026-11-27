import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isVapidConfigured, sendWebPush } from "@/lib/server/push";
import { getSupabaseAdmin } from "@/lib/server/supabase";

const TestPushSchema = z.object({
  actorId: z.string().min(1),
  targetUserId: z.string().optional(),
  badgeCount: z.number().int().min(0).max(99).default(3),
});

export async function POST(req: NextRequest) {
  try {
    const admin = getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json(
        { ok: false, error: "Supabase server environment is not configured." },
        { status: 503 }
      );
    }

    const parsed = TestPushSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
    }

    // Admin-only check
    const { data: actor } = await admin
      .from("toon_profiles")
      .select("role")
      .eq("id", parsed.data.actorId)
      .maybeSingle();

    if (!actor || actor.role !== "admin") {
      return NextResponse.json(
        { ok: false, error: "Only an Administrator can send test push notifications." },
        { status: 403 }
      );
    }

    if (!isVapidConfigured()) {
      return NextResponse.json(
        {
          ok: false,
          vapidConfigured: false,
          error:
            "VAPID keys (NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY) are missing in server environment variables.",
        },
        { status: 503 }
      );
    }

    const targetId = parsed.data.targetUserId || parsed.data.actorId;
    const { data: subs } = await admin
      .from("toon_push_subscriptions")
      .select("id, endpoint, p256dh, auth, user_agent")
      .eq("user_id", targetId);

    if (!subs || subs.length === 0) {
      return NextResponse.json({
        ok: true,
        vapidConfigured: true,
        pushSent: 0,
        results: [],
        message:
          "No push subscriptions found for this account. Open the installed app on your phone, tap 'Allow' on Notifications, and try again.",
      });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://toon-laundry.vercel.app";
    let pushSent = 0;
    const results: Array<{
      endpointHost: string;
      statusCode?: number;
      ok: boolean;
      deleted?: boolean;
      error?: string;
    }> = [];

    for (const sub of subs) {
      const endpointHost = (() => {
        try {
          return new URL(sub.endpoint).host;
        } catch {
          return "unknown";
        }
      })();

      const res = await sendWebPush(sub, {
        title: "Tinoclean Test Push",
        body: `Test notification — app icon badge should now show ${parsed.data.badgeCount}.`,
        url: `${appUrl}/notifications`,
        tag: `tinoclean-test-${Date.now()}`,
        unreadCount: parsed.data.badgeCount,
      });

      console.log("[Tinoclean Admin Test Push]", {
        targetId,
        endpointHost,
        ok: res.ok,
        statusCode: res.statusCode,
        error: res.error,
      });

      let deleted = false;
      if (!res.ok && (res.statusCode === 404 || res.statusCode === 410)) {
        await admin.from("toon_push_subscriptions").delete().eq("id", sub.id);
        deleted = true;
      }

      if (res.ok) pushSent += 1;
      results.push({
        endpointHost,
        statusCode: res.statusCode,
        ok: res.ok,
        deleted,
        error: res.error,
      });
    }

    return NextResponse.json({
      ok: true,
      vapidConfigured: true,
      pushSent,
      results,
    });
  } catch (err) {
    console.error("[Admin Test Push Error]", err);
    return NextResponse.json({ ok: false, error: "Test push failed." }, { status: 500 });
  }
}
