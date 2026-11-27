import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/server/supabase";

const CreateStaffSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(5),
  password: z.string().min(8),
  actorId: z.string().optional(),
  actorName: z.string().optional(),
  permissions: z
    .object({
      orders: z.boolean(),
      payments: z.boolean(),
      weighing: z.boolean(),
      reports: z.boolean(),
    })
    .optional(),
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
    const parsed = CreateStaffSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message || "Invalid staff details." },
        { status: 400 }
      );
    }

    const email = parsed.data.email.toLowerCase().trim();
    const { data: created, error: authErr } = await admin.auth.admin.createUser({
      email,
      password: parsed.data.password,
      email_confirm: true,
      user_metadata: { full_name: parsed.data.fullName.trim() },
    });

    if (authErr || !created.user) {
      return NextResponse.json(
        { ok: false, error: authErr?.message || "Failed to create staff user." },
        { status: 400 }
      );
    }

    const referralCode = `TC${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const staffPerms = parsed.data.permissions || {
      orders: true,
      payments: true,
      weighing: true,
      reports: false,
    };

    const { error: profErr } = await admin.from("toon_profiles").upsert({
      id: created.user.id,
      full_name: parsed.data.fullName.trim(),
      email,
      phone: parsed.data.phone.trim(),
      role: "staff",
      student_status: "none",
      referral_code: referralCode,
      staff_permissions: staffPerms,
    });

    if (profErr) {
      return NextResponse.json({ ok: false, error: profErr.message }, { status: 400 });
    }

    await admin.from("toon_audit_logs").insert({
      actor_id: parsed.data.actorId || null,
      actor_name: parsed.data.actorName || "Admin",
      action: "STAFF_ACCOUNT_CREATED",
      entity_type: "staff",
      entity_id: created.user.id,
      details: { full_name: parsed.data.fullName, email, phone: parsed.data.phone },
    });

    return NextResponse.json({ ok: true, staffId: created.user.id });
  } catch (err) {
    console.error("[Create Staff Error]", err);
    return NextResponse.json(
      { ok: false, error: "Could not create staff account." },
      { status: 500 }
    );
  }
}
