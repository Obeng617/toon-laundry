import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { buildTinocleanEmailHtml, sendEmail } from "@/lib/server/email";
import { sendWebPush } from "@/lib/server/push";
import { getSupabaseAdmin } from "@/lib/server/supabase";

const DispatchSchema = z.object({
  userId: z.string().optional(),
  targetRole: z.enum(["customer", "staff"]).default("customer"),
  toEmail: z.string().email().optional(),
  emailEnabled: z.boolean().default(true),
  title: z.string().min(1),
  body: z.string().min(1),
  orderId: z.string().optional(),
  tagNumber: z.string().optional(),
  eventKey: z.string().min(1),
  unreadCount: z.number().int().min(0).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const raw = await req.json();
    const parsed = DispatchSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Invalid notification payload." }, { status: 400 });
    }

    const data = parsed.data;
    const admin = getSupabaseAdmin();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://toon-laundry.vercel.app";

    // Resolve the authoritative recipient using the Supabase server key (service role)
    let targetUserId = data.userId;
    let targetEmail = data.toEmail;
    let emailEnabled = data.emailEnabled;
    let pushEnabled = true;
    let tagNumber = data.tagNumber;

    if (admin && data.orderId && data.targetRole === "customer") {
      const { data: orderRow } = await admin
        .from("toon_orders")
        .select("customer_id, tag_number, customer_email")
        .eq("id", data.orderId)
        .maybeSingle();

      if (orderRow?.customer_id) {
        targetUserId = orderRow.customer_id;
      }
      if (orderRow?.tag_number) {
        tagNumber = orderRow.tag_number;
      }
      if (!targetEmail && orderRow?.customer_email) {
        targetEmail = orderRow.customer_email;
      }
    }

    if (admin && targetUserId) {
      const { data: profile } = await admin
        .from("toon_profiles")
        .select("email, email_notifications_enabled, push_notifications_enabled")
        .eq("id", targetUserId)
        .maybeSingle();

      if (profile) {
        if (!targetEmail && profile.email) targetEmail = profile.email;
        emailEnabled = profile.email_notifications_enabled ?? true;
        pushEnabled = profile.push_notifications_enabled ?? true;
      }
    }

    // Compute exact unread count for the target user from Supabase
    let unreadCount = data.unreadCount ?? 0;
    if (admin && targetUserId) {
      const { count } = await admin
        .from("toon_notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", targetUserId)
        .eq("is_read", false);
      if (typeof count === "number") {
        unreadCount = count;
      }
    }

    const orderUrl = data.orderId ? `${appUrl}/orders/${data.orderId}` : `${appUrl}/notifications`;

    let emailStatus: { ok: boolean; error?: string } = { ok: true };
    if (targetEmail && emailEnabled) {
      emailStatus = await sendEmail({
        to: targetEmail,
        subject: tagNumber ? `${data.title} — ${tagNumber}` : data.title,
        dedupeKey: data.eventKey,
        html: buildTinocleanEmailHtml({
          heading: data.title,
          bodyHtml: `<p>${data.body}</p>${
            tagNumber
              ? `<p style="margin-top:12px;">Order Reference: <strong style="color:#264099;">${tagNumber}</strong></p>`
              : ""
          }`,
          ctaLabel: data.orderId ? "View Order & Ticket" : "Open Tinoclean",
          ctaUrl: orderUrl,
        }),
      });
    }

    let pushSent = 0;
    const pushResults: Array<{
      userId: string;
      endpointHost: string;
      statusCode?: number;
      ok: boolean;
      deleted?: boolean;
      error?: string;
    }> = [];

    if (admin && targetUserId && pushEnabled) {
      const { data: subs } = await admin
        .from("toon_push_subscriptions")
        .select("id, endpoint, p256dh, auth")
        .eq("user_id", targetUserId);

      if (subs && subs.length > 0) {
        for (const sub of subs) {
          const endpointHost = (() => {
            try {
              return new URL(sub.endpoint).host;
            } catch {
              return "unknown";
            }
          })();

          const res = await sendWebPush(sub, {
            title: data.title,
            body: data.body,
            url: orderUrl,
            tag: data.eventKey,
            unreadCount,
          });

          console.log("[Tinoclean Push Dispatch]", {
            userId: targetUserId,
            endpointHost,
            ok: res.ok,
            statusCode: res.statusCode,
            error: res.error,
          });

          let deleted = false;
          if (!res.ok && (res.statusCode === 404 || res.statusCode === 410)) {
            await admin.from("toon_push_subscriptions").delete().eq("id", sub.id);
            deleted = true;
            console.log("[Tinoclean Push Cleanup] Deleted stale subscription", {
              id: sub.id,
              endpointHost,
              statusCode: res.statusCode,
            });
          }

          if (res.ok) pushSent += 1;
          pushResults.push({
            userId: targetUserId,
            endpointHost,
            statusCode: res.statusCode,
            ok: res.ok,
            deleted,
            error: res.error,
          });
        }
      }
    }

    return NextResponse.json({
      ok: true,
      targetUserId,
      unreadCount,
      email: emailStatus,
      pushSent,
      pushResults,
    });
  } catch (err) {
    console.error("[Notification Dispatch Error]", err);
    return NextResponse.json({ ok: false, error: "Notification dispatch failed." }, { status: 500 });
  }
}
