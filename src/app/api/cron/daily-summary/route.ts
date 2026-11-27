import { NextRequest, NextResponse } from "next/server";
import { buildTinocleanEmailHtml, sendEmail } from "@/lib/server/email";
import { getSupabaseAdmin } from "@/lib/server/supabase";
import { formatCurrency } from "@/lib/pricing";

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json(
      { ok: false, error: "Supabase server credentials are not configured." },
      { status: 503 }
    );
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [
    { data: settings },
    { data: todayOrders },
    { data: todayPayments },
    { data: unpaidDelivered },
  ] = await Promise.all([
    admin.from("toon_business_settings").select("*").eq("id", 1).maybeSingle(),
    admin
      .from("toon_orders")
      .select("id, status, total_amount")
      .gte("created_at", todayStart.toISOString()),
    admin
      .from("toon_payments")
      .select("amount, method")
      .gte("created_at", todayStart.toISOString()),
    admin
      .from("toon_orders")
      .select("balance_due")
      .eq("status", "completed")
      .gt("balance_due", 0),
  ]);

  const ordersReceived = todayOrders?.length || 0;
  const ordersCompleted = todayOrders?.filter((o) => o.status === "completed").length || 0;
  const cashCollected = (todayPayments || [])
    .filter((p) => p.method === "cash")
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const momoCollected = (todayPayments || [])
    .filter((p) => p.method === "mobile_money")
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const cashToCollect = (unpaidDelivered || []).reduce(
    (sum, o) => sum + Number(o.balance_due),
    0
  );

  const ownerEmail = settings?.daily_summary_email || process.env.SMTP_USER;
  if (!ownerEmail) {
    return NextResponse.json(
      { ok: false, error: "No daily summary email configured." },
      { status: 400 }
    );
  }

  const dateStr = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const html = buildTinocleanEmailHtml({
    heading: `Daily Summary — ${dateStr}`,
    bodyHtml: `
      <table style="width:100%;border-collapse:collapse;margin-top:12px;">
        <tr><td style="padding:8px 0;border-bottom:1px solid #E2E8F0;">Orders received today</td><td style="text-align:right;font-weight:700;">${ordersReceived}</td></tr>
        <tr><td style="padding:8px 0;border-bottom:1px solid #E2E8F0;">Orders completed today</td><td style="text-align:right;font-weight:700;">${ordersCompleted}</td></tr>
        <tr><td style="padding:8px 0;border-bottom:1px solid #E2E8F0;">Cash collected</td><td style="text-align:right;font-weight:700;color:#10B981;">${formatCurrency(cashCollected)}</td></tr>
        <tr><td style="padding:8px 0;border-bottom:1px solid #E2E8F0;">Mobile Money collected</td><td style="text-align:right;font-weight:700;color:#02A1DB;">${formatCurrency(momoCollected)}</td></tr>
        <tr><td style="padding:8px 0;">Cash still to collect (delivered/unpaid)</td><td style="text-align:right;font-weight:700;color:#FF4D4D;">${formatCurrency(cashToCollect)}</td></tr>
      </table>
    `,
    ctaLabel: "Open Admin Reports",
    ctaUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/tc-ops-m9x4k7p2/reports`,
  });

  const res = await sendEmail({
    to: ownerEmail,
    subject: `Tinoclean Daily Summary — ${dateStr}`,
    html,
  });

  return NextResponse.json({
    ok: res.ok,
    summary: { ordersReceived, ordersCompleted, cashCollected, momoCollected, cashToCollect },
  });
}
