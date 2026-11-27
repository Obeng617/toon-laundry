/**
 * Converts a Ghana phone number into WhatsApp international format (digits only).
 * 0551750854 -> 233551750854, 233551750854 -> 233551750854, +233 55... -> 23355...
 */
export function toWhatsAppNumber(phone: string | undefined | null): string | null {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0") && digits.length === 10) digits = `233${digits.slice(1)}`;
  if (digits.length === 9) digits = `233${digits}`;
  if (digits.length < 11 || digits.length > 15) return null;
  return digits;
}

export function isValidGhanaPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  return /^0\d{9}$/.test(digits) || /^233\d{9}$/.test(digits);
}

export function buildTicketWhatsAppMessage(params: {
  businessName: string;
  tagNumber: string;
  customerName: string;
  totalAmount: number;
  balanceDue: number;
  readyBy?: string | null;
  ticketUrl: string;
  momoNumber: string;
  momoAccountName: string;
}): string {
  const ready = params.readyBy
    ? new Date(params.readyBy).toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "To be confirmed";

  return [
    `Hello ${params.customerName}, this is ${params.businessName}.`,
    ``,
    `Your laundry ticket: *${params.tagNumber}*`,
    `Total: GH₵${params.totalAmount.toFixed(2)}`,
    `Balance due: GH₵${params.balanceDue.toFixed(2)}`,
    `Ready by: ${ready}`,
    ``,
    `View / download your ticket: ${params.ticketUrl}`,
    ``,
    `Pay on delivery or collection: Cash, or MTN MoMo to GhanaPay ${params.momoNumber} (${params.momoAccountName}).`,
    `Please keep your tag number to collect your laundry.`,
  ].join("\n");
}
