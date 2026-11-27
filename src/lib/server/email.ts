import nodemailer from "nodemailer";

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  dedupeKey?: string;
}

const sentDedupeCache = new Set<string>();

function getTransporter() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_APP_PASSWORD;
  if (!user || !pass) return null;

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 465),
    secure: process.env.SMTP_SECURE !== "false",
    auth: { user, pass },
  });
}

export function buildTinocleanEmailHtml(options: {
  heading: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaUrl?: string;
  footerNote?: string;
}): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const cta =
    options.ctaLabel && options.ctaUrl
      ? `<div style="margin:24px 0;"><a href="${options.ctaUrl}" style="display:inline-block;background:linear-gradient(135deg,#264099,#02A1DB);color:#ffffff;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:12px;">${options.ctaLabel}</a></div>`
      : "";

  return `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#F5F9FA;font-family:'Segoe UI',Arial,sans-serif;color:#0B2049;">
  <div style="max-width:560px;margin:24px auto;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 6px 24px rgba(11,32,73,0.08);">
    <div style="background:linear-gradient(135deg,#264099,#02A1DB);padding:24px 28px;color:#ffffff;">
      <div style="font-size:20px;font-weight:800;letter-spacing:0.5px;">TINO CLEAN</div>
      <div style="font-size:12px;opacity:0.9;margin-top:2px;">Laundry Management System • UPSA</div>
    </div>
    <div style="padding:28px;">
      <h2 style="margin:0 0 12px;font-size:20px;color:#0B2049;">${options.heading}</h2>
      <div style="font-size:15px;line-height:1.6;color:#334155;">${options.bodyHtml}</div>
      ${cta}
      <hr style="border:none;border-top:1px solid #E2E8F0;margin:24px 0 16px;" />
      <p style="font-size:12px;color:#64748B;margin:0;">
        ${options.footerNote || "Pay on delivery or collection (Cash or MTN MoMo to GhanaPay 0551750854 — MARTIN)."}<br/>
        <a href="${appUrl}" style="color:#02A1DB;text-decoration:none;">Open Tinoclean App</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

export async function sendEmail(input: SendEmailInput): Promise<{
  ok: boolean;
  error?: string;
}> {
  if (input.dedupeKey && sentDedupeCache.has(input.dedupeKey)) {
    return { ok: true };
  }

  const transporter = getTransporter();
  if (!transporter) {
    return {
      ok: false,
      error:
        "Google SMTP credentials (SMTP_USER and SMTP_APP_PASSWORD) are not configured on the server.",
    };
  }

  try {
    const fromName = process.env.SMTP_FROM_NAME || "Tinoclean Laundry";
    const fromEmail = process.env.SMTP_USER;
    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: input.to,
      subject: input.subject,
      html: input.html,
    });
    if (input.dedupeKey) sentDedupeCache.add(input.dedupeKey);
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "SMTP delivery failed";
    console.error("[Tinoclean SMTP Error]", message);
    return { ok: false, error: message };
  }
}

export function buildOtpEmail(
  purpose: "signup" | "password_reset" | "upsa_student",
  code: string
) {
  // Section 8.4: Never put OTPs in subject lines!
  const subject =
    purpose === "signup"
      ? "Verify your Tinoclean Laundry account"
      : purpose === "upsa_student"
      ? "Verify your UPSA student email for Tinoclean"
      : "Reset your Tinoclean Laundry password";

  const heading =
    purpose === "signup"
      ? "Verify your email address"
      : purpose === "upsa_student"
      ? "Confirm your UPSA student status"
      : "Password reset verification";

  const bodyHtml = `
    <p>Use the one-time verification code below to continue:</p>
    <div style="margin:20px 0;padding:16px;background:#F5F9FA;border:1px solid #CBD5E1;border-radius:14px;text-align:center;">
      <span style="font-size:32px;font-weight:800;letter-spacing:8px;color:#264099;">${code}</span>
    </div>
    <p>This code expires in <strong>10 minutes</strong> and can only be used once. If you did not request this, you can safely ignore this email.</p>
  `;

  return {
    subject,
    html: buildTinocleanEmailHtml({ heading, bodyHtml }),
  };
}
