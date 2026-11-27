import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyOtp } from "@/lib/server/otp";
import { getSupabaseAdmin } from "@/lib/server/supabase";
import { parseUpsaStudentEmail } from "@/lib/pricing";
import { buildTinocleanEmailHtml, sendEmail } from "@/lib/server/email";

const VerifySchema = z.object({
  email: z.string().trim().email("Please enter a valid email address."),
  purpose: z.enum(["signup", "password_reset", "upsa_student"]),
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit verification code."),
  fullName: z.string().optional(),
  phone: z.string().optional(),
  password: z.string().min(8).optional(),
  referralCode: z.string().optional(),
  currentUserId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const admin = getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json(
        {
          ok: false,
          error: "Supabase server credentials are not configured.",
        },
        { status: 503 }
      );
    }

    const body = await req.json();
    const parsed = VerifySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message || "Invalid verification code." },
        { status: 400 }
      );
    }

    const ipAddress =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "127.0.0.1";

    const email = parsed.data.email.toLowerCase().trim();
    const result = await verifyOtp({
      email,
      purpose: parsed.data.purpose,
      code: parsed.data.code,
      ipAddress,
    });

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }

    const now = new Date();
    const oneYearLater = new Date(now);
    oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);

    // 1. SIGNUP COMPLETION
    if (parsed.data.purpose === "signup") {
      if (!parsed.data.password || !parsed.data.fullName) {
        return NextResponse.json(
          { ok: false, error: "Full name and password are required to complete registration." },
          { status: 400 }
        );
      }

      const { data: createdAuth, error: authErr } = await admin.auth.admin.createUser({
        email,
        password: parsed.data.password,
        email_confirm: true,
        user_metadata: { full_name: parsed.data.fullName.trim() },
      });

      if (authErr || !createdAuth.user) {
        return NextResponse.json(
          { ok: false, error: authErr?.message || "Could not create account." },
          { status: 400 }
        );
      }

      const upsa = parseUpsaStudentEmail(email);

      let referredById: string | null = null;
      if (parsed.data.referralCode?.trim()) {
        const cleanCode = parsed.data.referralCode.trim().toUpperCase();
        const { data: referrer } = await admin
          .from("toon_profiles")
          .select("id, email, phone, upsa_email")
          .eq("referral_code", cleanCode)
          .maybeSingle();

        if (
          referrer &&
          referrer.email?.toLowerCase() !== email &&
          referrer.upsa_email?.toLowerCase() !== email &&
          (!parsed.data.phone || referrer.phone !== parsed.data.phone.trim())
        ) {
          referredById = referrer.id;
        }
      }

      const referralCode = `TC${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

      const { error: profileErr } = await admin.from("toon_profiles").upsert({
        id: createdAuth.user.id,
        full_name: parsed.data.fullName.trim(),
        email,
        phone: parsed.data.phone?.trim() || "",
        role: "customer",
        student_status: upsa.valid ? "verified" : "none",
        upsa_email: upsa.valid ? upsa.normalizedEmail : null,
        student_id_number: upsa.valid ? upsa.studentIdNumber : null,
        student_verified_at: upsa.valid ? now.toISOString() : null,
        student_expires_at: upsa.valid ? oneYearLater.toISOString() : null,
        referral_code: referralCode,
        referred_by_id: referredById,
      });

      if (profileErr) {
        return NextResponse.json({ ok: false, error: profileErr.message }, { status: 400 });
      }

      return NextResponse.json({
        ok: true,
        verified: true,
        userId: createdAuth.user.id,
        studentVerified: upsa.valid,
      });
    }

    // 2. PASSWORD RESET COMPLETION
    if (parsed.data.purpose === "password_reset") {
      if (!parsed.data.password) {
        return NextResponse.json(
          { ok: false, error: "New password is required." },
          { status: 400 }
        );
      }

      const { data: profile } = await admin
        .from("toon_profiles")
        .select("id, full_name")
        .eq("email", email)
        .maybeSingle();

      if (!profile) {
        return NextResponse.json(
          { ok: false, error: "Invalid or expired code." },
          { status: 400 }
        );
      }

      const { error: updErr } = await admin.auth.admin.updateUserById(profile.id, {
        password: parsed.data.password,
      });

      if (updErr) {
        return NextResponse.json({ ok: false, error: updErr.message }, { status: 400 });
      }

      await admin.auth.admin.signOut(profile.id, "global").catch(() => {});

      await sendEmail({
        to: email,
        subject: "Your Tinoclean password was changed",
        html: buildTinocleanEmailHtml({
          heading: "Password Updated",
          bodyHtml: `<p>Hello ${profile.full_name || "there"},</p><p>Your Tinoclean Laundry account password was just reset and all previous sessions have been signed out. If you did not make this change, contact Tinoclean immediately on 0551750854.</p>`,
        }),
      });

      return NextResponse.json({ ok: true, verified: true });
    }

    // 3. UPSA STUDENT EMAIL VERIFICATION
    if (parsed.data.purpose === "upsa_student") {
      const upsa = parseUpsaStudentEmail(email);
      if (!upsa.valid) {
        return NextResponse.json({ ok: false, error: upsa.error }, { status: 400 });
      }
      if (!parsed.data.currentUserId) {
        return NextResponse.json(
          { ok: false, error: "Please sign in to verify your UPSA student email." },
          { status: 401 }
        );
      }

      const { error: updErr } = await admin
        .from("toon_profiles")
        .update({
          student_status: "verified",
          upsa_email: upsa.normalizedEmail,
          student_id_number: upsa.studentIdNumber,
          student_verified_at: now.toISOString(),
          student_expires_at: oneYearLater.toISOString(),
          student_revoked_reason: null,
          updated_at: now.toISOString(),
        })
        .eq("id", parsed.data.currentUserId);

      if (updErr) {
        return NextResponse.json({ ok: false, error: updErr.message }, { status: 400 });
      }

      await admin.from("toon_audit_logs").insert({
        actor_id: parsed.data.currentUserId,
        action: "UPSA_STUDENT_VERIFIED",
        entity_type: "student_verification",
        entity_id: parsed.data.currentUserId,
        details: {
          upsa_email: upsa.normalizedEmail,
          student_id_number: upsa.studentIdNumber,
          expires_at: oneYearLater.toISOString(),
        },
      });

      return NextResponse.json({
        ok: true,
        verified: true,
        upsaEmail: upsa.normalizedEmail,
        studentIdNumber: upsa.studentIdNumber,
        studentVerifiedAt: now.toISOString(),
        studentExpiresAt: oneYearLater.toISOString(),
      });
    }

    return NextResponse.json({ ok: true, verified: true });
  } catch (err) {
    console.error("[OTP Verify Error]", err);
    return NextResponse.json(
      { ok: false, error: "Verification failed. Please try again." },
      { status: 500 }
    );
  }
}
