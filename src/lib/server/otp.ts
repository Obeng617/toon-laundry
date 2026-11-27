import crypto from "node:crypto";
import { getSupabaseAdmin } from "./supabase";
import { parseUpsaStudentEmail } from "@/lib/pricing";

export type OtpPurpose = "signup" | "password_reset" | "upsa_student";

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds
const MAX_ATTEMPTS = 5;

function getSecret(): string {
  return process.env.OTP_HASH_SECRET || "tinoclean-prod-otp-secret";
}

export function hashOtp(email: string, purpose: OtpPurpose, code: string): string {
  return crypto
    .createHmac("sha256", getSecret())
    .update(`${email.toLowerCase().trim()}:${purpose}:${code.trim()}`)
    .digest("hex");
}

/**
 * Cryptographically secure 6-digit OTP (Section 8.5: never Math.random).
 */
export function generateSecureOtp(): string {
  return String(crypto.randomInt(100000, 1000000));
}

export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ allowed: boolean; retryAfterSec?: number; setupError?: string }> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return {
      allowed: false,
      setupError:
        "Supabase credentials (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) are missing in server environment.",
    };
  }

  const now = Date.now();
  const { data } = await admin
    .from("toon_rate_limits")
    .select("count, window_start")
    .eq("key", key)
    .maybeSingle();

  if (!data) {
    await admin.from("toon_rate_limits").upsert({
      key,
      count: 1,
      window_start: new Date(now).toISOString(),
    });
    return { allowed: true };
  }

  const windowStart = new Date(data.window_start).getTime();
  if (now - windowStart > windowMs) {
    await admin.from("toon_rate_limits").upsert({
      key,
      count: 1,
      window_start: new Date(now).toISOString(),
    });
    return { allowed: true };
  }

  if (data.count >= limit) {
    const retryAfterSec = Math.ceil((windowStart + windowMs - now) / 1000);
    return { allowed: false, retryAfterSec };
  }

  await admin
    .from("toon_rate_limits")
    .update({ count: data.count + 1 })
    .eq("key", key);
  return { allowed: true };
}

export async function issueOtp(params: {
  email: string;
  purpose: OtpPurpose;
  ipAddress: string;
  currentUserId?: string;
}): Promise<{
  ok: boolean;
  code?: string;
  error?: string;
  retryAfterSec?: number;
}> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return {
      ok: false,
      error:
        "Supabase server environment is not configured. Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY.",
    };
  }

  const email = params.email.toLowerCase().trim();

  // Section 8.6: Strict UPSA domain check for student verification
  if (params.purpose === "upsa_student") {
    const upsaCheck = parseUpsaStudentEmail(email);
    if (!upsaCheck.valid) {
      return { ok: false, error: upsaCheck.error };
    }
    // Ensure one UPSA email is linked to only one account
    const { data: existingUpsa } = await admin
      .from("toon_profiles")
      .select("id")
      .eq("upsa_email", email)
      .maybeSingle();

    if (existingUpsa && existingUpsa.id !== params.currentUserId) {
      return {
        ok: false,
        error: "This UPSA student email is already linked to another Tinoclean account.",
      };
    }
  }

  // Rate limits: 3 per email per 10 mins, 10 per IP per hour (Section 8.5)
  const emailLimit = await checkRateLimit(`otp:email:${email}`, 3, 10 * 60 * 1000);
  if (emailLimit.setupError) {
    return { ok: false, error: emailLimit.setupError };
  }
  if (!emailLimit.allowed) {
    return {
      ok: false,
      error: "Too many requests. Please try again later.",
      retryAfterSec: emailLimit.retryAfterSec,
    };
  }

  const ipLimit = await checkRateLimit(`otp:ip:${params.ipAddress}`, 10, 60 * 60 * 1000);
  if (!ipLimit.allowed) {
    return {
      ok: false,
      error: "Too many requests. Please try again later.",
      retryAfterSec: ipLimit.retryAfterSec,
    };
  }

  const now = Date.now();
  const { data: latest } = await admin
    .from("toon_otp_codes")
    .select("created_at")
    .eq("email", email)
    .eq("purpose", params.purpose)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latest) {
    const elapsed = now - new Date(latest.created_at).getTime();
    if (elapsed < RESEND_COOLDOWN_MS) {
      const wait = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
      return {
        ok: false,
        error: `Please wait ${wait} seconds before requesting a new code.`,
        retryAfterSec: wait,
      };
    }
  }

  const code = generateSecureOtp();
  const codeHash = hashOtp(email, params.purpose, code);
  const { error: insertErr } = await admin.from("toon_otp_codes").insert({
    email,
    purpose: params.purpose,
    code_hash: codeHash,
    expires_at: new Date(now + OTP_TTL_MS).toISOString(),
    attempts: 0,
    max_attempts: MAX_ATTEMPTS,
    ip_address: params.ipAddress,
  });

  if (insertErr) {
    return { ok: false, error: insertErr.message };
  }

  return { ok: true, code };
}

export async function verifyOtp(params: {
  email: string;
  purpose: OtpPurpose;
  code: string;
  ipAddress: string;
}): Promise<{ ok: boolean; error?: string }> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return {
      ok: false,
      error: "Supabase server environment is not configured.",
    };
  }

  const email = params.email.toLowerCase().trim();
  const verifyRate = await checkRateLimit(
    `otp:verify:${params.ipAddress}:${email}`,
    15,
    10 * 60 * 1000
  );
  if (!verifyRate.allowed) {
    return { ok: false, error: "Too many attempts. Please try again later." };
  }

  const now = Date.now();
  const submittedHash = hashOtp(email, params.purpose, params.code);

  const { data: latest } = await admin
    .from("toon_otp_codes")
    .select("*")
    .eq("email", email)
    .eq("purpose", params.purpose)
    .is("used_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!latest) {
    return { ok: false, error: "Invalid or expired code. Please request a new code." };
  }
  if (latest.attempts >= latest.max_attempts) {
    return {
      ok: false,
      error: "Code locked after 5 failed attempts. Please request a new code.",
    };
  }
  if (now > new Date(latest.expires_at).getTime()) {
    return { ok: false, error: "This code has expired. Please request a new one." };
  }

  const match = crypto.timingSafeEqual(
    Buffer.from(latest.code_hash, "hex"),
    Buffer.from(submittedHash, "hex")
  );

  if (!match) {
    await admin
      .from("toon_otp_codes")
      .update({ attempts: latest.attempts + 1 })
      .eq("id", latest.id);
    const remaining = Math.max(0, latest.max_attempts - (latest.attempts + 1));
    return {
      ok: false,
      error:
        remaining > 0
          ? `Incorrect code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`
          : "Code locked after 5 failed attempts. Please request a new code.",
    };
  }

  await admin
    .from("toon_otp_codes")
    .update({ used_at: new Date(now).toISOString() })
    .eq("id", latest.id);

  return { ok: true };
}
