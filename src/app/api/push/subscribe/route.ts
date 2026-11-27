import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/server/supabase";

const SubscribeSchema = z.object({
  userId: z.string().min(1),
  subscription: z.object({
    endpoint: z.string().url(),
    keys: z.object({
      p256dh: z.string().min(1),
      auth: z.string().min(1),
    }),
  }),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = SubscribeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Invalid push subscription." }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    if (admin) {
      await admin.from("toon_push_subscriptions").upsert(
        {
          user_id: parsed.data.userId,
          endpoint: parsed.data.subscription.endpoint,
          p256dh: parsed.data.subscription.keys.p256dh,
          auth: parsed.data.subscription.keys.auth,
          user_agent: req.headers.get("user-agent") || "",
        },
        { onConflict: "endpoint" }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[Push Subscribe Error]", err);
    return NextResponse.json({ ok: false, error: "Failed to save subscription." }, { status: 500 });
  }
}
