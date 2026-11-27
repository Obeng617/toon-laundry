import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { buildTinocleanEmailHtml, sendEmail } from "@/lib/server/email";
import { sendWebPush } from "@/lib/server/push";
import { getSupabaseAdmin } from "@/lib/server/supabase";

const DispatchSchema = z.object({
  userId: z.string().optional(),
  toEmail: z.string().email().optional(),
  emailEnabled: z.boolean().default(true),
  title: z.string().min(1),
  body: z.string().min(1),
  orderId: z.string().optional(),
  tagNumber: z.string().optional(),
  eventKey: z.string().min(1),
  unreadCount: z.number().int().min(0).default(1),
});

export async function POST(req: NextRequest) {
  try {
    const raw = await req.json();
    const parsed = DispatchSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Invalid notification payload." }, { status: 400 });
    }

    const data = parsed.data;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const orderUrl = data.orderId ? `${appUrl}/orders/${data.orderId}` : `${appUrl}/notifications`;

    let emailStatus: { ok: boolean; error?: string } = { ok: true };
    if (data.toEmail && data.emailEnabled) {
      emailStatus = await sendEmail({
        to: data.toEmail,
        subject: data.tagNumber ? `${data.title} — ${data.tagNumber}` : data.title,
        dedupeKey: data.eventKey,
        html: buildTinocleanEmailHtml({
          heading: data.title,
          bodyHtml: `<p>${data.body}</p>${
            data.tagNumber
              ? `<p style="margin-top:12px;">Order Reference: <strong style="color:#264099;">${data.tagNumber}</strong></p>`
              : ""
          }`,
          ctaLabel: data.orderId ? "View Order & Ticket" : "Open Tinoclean",
          ctaUrl: orderUrl,
        }),
      });
    }

    let pushSent = 0;
    const admin = getSupabaseAdmin();
    if (admin && data.userId) {
      const { data: subs } = await admin
        .from("toon_push_subscriptions")
        .select("endpoint, p256dh, auth")
        .eq("user_id", data.userId);

      if (subs && subs.length > 0) {
        for (const sub of subs) {
          const res = await sendWebPush(sub, {
            title: data.title,
            body: data.body,
            url: orderUrl,
            tag: data.eventKey,
            unreadCount: data.unreadCount,
          });
          if (res.ok) pushSent += 1;
        }
      }
    }

    return NextResponse.json({
      ok: true,
      email: emailStatus,
      pushSent,
    });
  } catch (err) {
    console.error("[Notification Dispatch Error]", err);
    return NextResponse.json({ ok: false, error: "Notification dispatch failed." }, { status: 500 });
  }
}
