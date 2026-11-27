import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/server/supabase";
import { buildTicketWhatsAppMessage, toWhatsAppNumber } from "@/lib/phone";

const Schema = z.object({ orderId: z.string().min(1) });

/**
 * Automatically sends the digital ticket to the customer's WhatsApp DM using the
 * WhatsApp Business Cloud API (Meta). Only runs when these env vars are set:
 *   WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID
 * Optional (recommended, needed to message customers who haven't chatted in 24h):
 *   WHATSAPP_TEMPLATE_NAME, WHATSAPP_TEMPLATE_LANG (default "en")
 * If not configured, returns { sent: false, reason: "not_configured" } and staff can
 * use the one-tap "Send on WhatsApp" button instead.
 */
export async function POST(req: NextRequest) {
  try {
    const parsed = Schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Invalid order." }, { status: 400 });
    }

    const token = process.env.WHATSAPP_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    if (!token || !phoneNumberId) {
      return NextResponse.json({ ok: true, sent: false, reason: "not_configured" });
    }

    const admin = getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json({ ok: false, error: "Supabase not configured." }, { status: 503 });
    }

    const [{ data: order }, { data: settings }] = await Promise.all([
      admin
        .from("toon_orders")
        .select("tag_number, public_token, customer_name, customer_phone, total_amount, balance_due, ready_by")
        .eq("id", parsed.data.orderId)
        .maybeSingle(),
      admin.from("toon_business_settings").select("*").eq("id", 1).maybeSingle(),
    ]);

    if (!order) {
      return NextResponse.json({ ok: false, error: "Order not found." }, { status: 404 });
    }

    const to = toWhatsAppNumber(order.customer_phone);
    if (!to) {
      return NextResponse.json({ ok: true, sent: false, reason: "invalid_phone" });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://toon-laundry.vercel.app";
    const ticketUrl = `${appUrl}/ticket/${order.public_token}`;
    const templateName = process.env.WHATSAPP_TEMPLATE_NAME;

    const payload = templateName
      ? {
          messaging_product: "whatsapp",
          to,
          type: "template",
          template: {
            name: templateName,
            language: { code: process.env.WHATSAPP_TEMPLATE_LANG || "en" },
            components: [
              {
                type: "body",
                parameters: [
                  { type: "text", text: order.customer_name },
                  { type: "text", text: order.tag_number },
                  { type: "text", text: `GH₵${Number(order.total_amount).toFixed(2)}` },
                  { type: "text", text: ticketUrl },
                ],
              },
            ],
          },
        }
      : {
          messaging_product: "whatsapp",
          to,
          type: "text",
          text: {
            preview_url: true,
            body: buildTicketWhatsAppMessage({
              businessName: settings?.business_name || "Tinoclean Laundry",
              tagNumber: order.tag_number,
              customerName: order.customer_name,
              totalAmount: Number(order.total_amount),
              balanceDue: Number(order.balance_due),
              readyBy: order.ready_by,
              ticketUrl,
              momoNumber: settings?.momo_number || "0551750854",
              momoAccountName: settings?.momo_account_name || "MARTIN",
            }),
          },
        };

    const res = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[WhatsApp Send Error]", errText);
      return NextResponse.json({ ok: true, sent: false, reason: "api_error", detail: errText });
    }

    return NextResponse.json({ ok: true, sent: true });
  } catch (err) {
    console.error("[WhatsApp Ticket Error]", err);
    return NextResponse.json({ ok: false, error: "Failed to send ticket." }, { status: 500 });
  }
}
