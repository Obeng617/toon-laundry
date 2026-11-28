import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/server/supabase";

const SyncRewardsSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("consume_discount"),
    customerId: z.string().uuid(),
    discountType: z.enum(["loyalty", "referral", "manual"]),
  }),
  z.object({
    action: z.literal("refund_discount"),
    customerId: z.string().uuid(),
    discountType: z.enum(["loyalty", "referral", "manual"]),
    loyaltyWashesRequired: z.number().int().min(1).default(3),
  }),
  z.object({
    action: z.literal("complete_order"),
    orderId: z.string().uuid(),
    customerId: z.string().uuid(),
    discountType: z.enum(["none", "loyalty", "referral", "manual"]),
    loyaltyWashesRequired: z.number().int().min(1).default(3),
  }),
]);

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
    const parsed = SyncRewardsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message || "Invalid payload." },
        { status: 400 }
      );
    }

    const data = parsed.data;

    if (data.action === "consume_discount") {
      const { data: profile } = await admin
        .from("toon_profiles")
        .select("id, completed_washes_streak, available_referral_discounts, manual_discounts_available")
        .eq("id", data.customerId)
        .maybeSingle();

      if (!profile) {
        return NextResponse.json({ ok: false, error: "Customer not found." }, { status: 404 });
      }

      if (data.discountType === "loyalty") {
        await admin
          .from("toon_profiles")
          .update({ completed_washes_streak: 0 })
          .eq("id", profile.id);
      } else if (data.discountType === "referral") {
        await admin
          .from("toon_profiles")
          .update({
            available_referral_discounts: Math.max(0, Number(profile.available_referral_discounts || 0) - 1),
          })
          .eq("id", profile.id);
      } else if (data.discountType === "manual") {
        await admin
          .from("toon_profiles")
          .update({
            manual_discounts_available: Math.max(0, Number(profile.manual_discounts_available || 0) - 1),
          })
          .eq("id", profile.id);
      }

      return NextResponse.json({ ok: true });
    }

    if (data.action === "refund_discount") {
      const { data: profile } = await admin
        .from("toon_profiles")
        .select("id, completed_washes_streak, available_referral_discounts, manual_discounts_available")
        .eq("id", data.customerId)
        .maybeSingle();

      if (!profile) {
        return NextResponse.json({ ok: false, error: "Customer not found." }, { status: 404 });
      }

      if (data.discountType === "loyalty") {
        const restored = Math.max(
          Number(profile.completed_washes_streak || 0),
          data.loyaltyWashesRequired
        );
        await admin
          .from("toon_profiles")
          .update({ completed_washes_streak: restored })
          .eq("id", profile.id);
      } else if (data.discountType === "referral") {
        await admin
          .from("toon_profiles")
          .update({
            available_referral_discounts: Number(profile.available_referral_discounts || 0) + 1,
          })
          .eq("id", profile.id);
      } else if (data.discountType === "manual") {
        await admin
          .from("toon_profiles")
          .update({
            manual_discounts_available: Number(profile.manual_discounts_available || 0) + 1,
          })
          .eq("id", profile.id);
      }

      return NextResponse.json({ ok: true });
    }

    if (data.action === "complete_order") {
      const { data: customer } = await admin
        .from("toon_profiles")
        .select(
          "id, full_name, completed_washes_streak, referred_by_id, referral_reward_credited"
        )
        .eq("id", data.customerId)
        .maybeSingle();

      if (!customer) {
        return NextResponse.json({ ok: false, error: "Customer not found." }, { status: 404 });
      }

      // If this order used a loyalty discount, streak stays 0 (was reset at placement/weighing).
      // Otherwise increment streak by 1.
      const nextStreak =
        data.discountType === "loyalty"
          ? 0
          : Number(customer.completed_washes_streak || 0) + 1;

      await admin
        .from("toon_profiles")
        .update({ completed_washes_streak: nextStreak })
        .eq("id", customer.id);

      let referrerCredited: { id: string; customerName: string } | null = null;

      if (customer.referred_by_id && !customer.referral_reward_credited) {
        await admin
          .from("toon_profiles")
          .update({ referral_reward_credited: true })
          .eq("id", customer.id);

        const { data: referrer } = await admin
          .from("toon_profiles")
          .select("id, available_referral_discounts")
          .eq("id", customer.referred_by_id)
          .maybeSingle();

        if (referrer) {
          await admin
            .from("toon_profiles")
            .update({
              available_referral_discounts: Number(referrer.available_referral_discounts || 0) + 1,
            })
            .eq("id", referrer.id);

          referrerCredited = {
            id: referrer.id,
            customerName: customer.full_name || "Your friend",
          };
        }
      }

      return NextResponse.json({
        ok: true,
        nextStreak,
        loyaltyUnlocked: nextStreak === data.loyaltyWashesRequired,
        referrerCredited,
      });
    }

    return NextResponse.json({ ok: false, error: "Unsupported action." }, { status: 400 });
  } catch (err) {
    console.error("[Sync Rewards Error]", err);
    return NextResponse.json(
      { ok: false, error: "Failed to sync customer rewards." },
      { status: 500 }
    );
  }
}
