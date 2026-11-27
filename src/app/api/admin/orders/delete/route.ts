import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/server/supabase";

const DeleteOrderSchema = z.object({
  orderId: z.string().min(1),
  actorId: z.string().optional(),
  actorName: z.string().optional(),
  reason: z.string().optional(),
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

    const body = await req.json();
    const parsed = DeleteOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Invalid order ID." },
        { status: 400 }
      );
    }

    // Verify caller is an admin if actorId is provided
    if (parsed.data.actorId) {
      const { data: actor } = await admin
        .from("toon_profiles")
        .select("role, full_name")
        .eq("id", parsed.data.actorId)
        .maybeSingle();

      if (!actor || actor.role !== "admin") {
        return NextResponse.json(
          { ok: false, error: "Only an Administrator can delete orders." },
          { status: 403 }
        );
      }
    }

    const { data: order } = await admin
      .from("toon_orders")
      .select("id, tag_number, customer_name, total_amount, status")
      .eq("id", parsed.data.orderId)
      .maybeSingle();

    if (!order) {
      return NextResponse.json(
        { ok: false, error: "Order not found." },
        { status: 404 }
      );
    }

    const { error: delErr } = await admin
      .from("toon_orders")
      .delete()
      .eq("id", parsed.data.orderId);

    if (delErr) {
      return NextResponse.json(
        { ok: false, error: delErr.message },
        { status: 400 }
      );
    }

    await admin.from("toon_audit_logs").insert({
      actor_id: parsed.data.actorId || null,
      actor_name: parsed.data.actorName || "Admin",
      action: "ORDER_DELETED",
      entity_type: "order",
      entity_id: order.tag_number,
      details: {
        tag_number: order.tag_number,
        customer_name: order.customer_name,
        total_amount: order.total_amount,
        previous_status: order.status,
        reason: parsed.data.reason || "Deleted by Admin",
      },
    });

    return NextResponse.json({ ok: true, deletedTag: order.tag_number });
  } catch (err) {
    console.error("[Delete Order Error]", err);
    return NextResponse.json(
      { ok: false, error: "Failed to delete order." },
      { status: 500 }
    );
  }
}
