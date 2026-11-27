import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { issueOtp } from "@/lib/server/otp";
import { buildOtpEmail, sendEmail } from "@/lib/server/email";
import { getSupabaseAdmin } from "@/lib/server/supabase";

const RequestSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address."),
  purpose: z.enum(["signup", "password_reset", "upsa_student"]),
  currentUserId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const admin = getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Supabase credentials are not configured on the server. Add NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY to .env.local.",
        },
        { status: 503 }
      );
    }

    const body = await req.json();
    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message || "Invalid input." },
        { status: 400 }
      );
    }

    const { email, purpose, currentUserId } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();
    const ipAddress =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "127.0.0.1";

    if (purpose === "password_reset") {
      const { data: existingProfile } = await admin
        .from("toon_profiles")
        .select("id")
        .eq("email", normalizedEmail)
        .maybeSingle();

      if (!existingProfile) {
        return NextResponse.json({
          ok: true,
          message: "If this email is registered, we have sent a code.",
          expiresInSeconds: 600,
          resendCooldownSeconds: 60,
        });
      }
    }

    const result = await issueOtp({
      email: normalizedEmail,
      purpose,
      ipAddress,
      currentUserId,
    });
    if (!result.ok || !result.code) {
      return NextResponse.json(
        {
          ok: false,
          error: result.error || "Too many requests. Please try again later.",
          retryAfterSec: result.retryAfterSec,
        },
        { status: 429 }
      );
    }

    const emailContent = buildOtpEmail(purpose, result.code);
    const mailRes = await sendEmail({
      to: normalizedEmail,
      subject: emailContent.subject,
      html: emailContent.html,
    });

    if (!mailRes.ok) {
      return NextResponse.json(
        {
          ok: false,
          error:
            mailRes.error ||
            "Google SMTP failed to send verification email. Check SMTP_USER and SMTP_APP_PASSWORD.",
        },
        { status: 503 }
      );
    }

    const message =
      purpose === "password_reset"
        ? "If this email is registered, we have sent a code."
        : purpose === "upsa_student"
        ? "We have sent a 6-digit verification code to your UPSA student email."
        : "We have sent a 6-digit verification code to your email.";

    return NextResponse.json({
      ok: true,
      message,
      expiresInSeconds: 600,
      resendCooldownSeconds: 60,
    });
  } catch (err) {
    console.error("[OTP Request Error]", err);
    return NextResponse.json(
      { ok: false, error: "Unable to process request right now. Please try again." },
      { status: 500 }
    );
  }
}
