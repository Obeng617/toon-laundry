import {
  CustomerCategory,
  DiscountType,
  LaundryService,
  OrderItem,
  OrderServiceInputLine,
  TariffBracket,
} from "./types";

export interface TariffCalculationResult {
  actualWeightKg: number;
  billableBracketKg: number;
  category: CustomerCategory;
  tariffAmount: number;
}

/**
 * Rounds any positive decimal weight up to the next 0.5 kg with a minimum of 1.0 kg (Section 3).
 * Examples:
 * - 0.6 kg -> 1.0 kg
 * - 1.0 kg -> 1.0 kg
 * - 1.2 kg -> 1.5 kg
 * - 1.25 kg -> 1.5 kg
 */
export function roundToHalfKgBracket(weightKg: number): number {
  const clean = Math.max(0.01, Number(weightKg));
  if (clean <= 1.0) return 1.0;
  return Math.ceil((clean - 0.0001) * 2) / 2;
}

/**
 * Computes the Wash, Dry & Fold price from the admin-configured half-kilogram tariff table (Section 3).
 * - Below 1.0 kg uses the 1.0 kg bracket.
 * - Between listed half-kg brackets uses the next higher half-kg bracket.
 * - Above the highest listed bracket continues in 0.5 kg steps at the headline per-kg rate
 *   (student GH₵7/kg, regular GH₵8/kg, rounded to whole cedis).
 */
export function calculateTariff(
  actualWeightKg: number,
  category: CustomerCategory,
  brackets: TariffBracket[]
): TariffCalculationResult {
  const cleanActual = Math.max(0.1, Number(actualWeightKg.toFixed(2)));
  const billableBracket = roundToHalfKgBracket(cleanActual);

  const active = [...brackets]
    .filter((b) => b.isActive)
    .sort((a, b) => a.weightKg - b.weightKg);

  const matched = active.find((b) => b.weightKg >= billableBracket - 0.0001);
  if (matched) {
    return {
      actualWeightKg: cleanActual,
      billableBracketKg: matched.weightKg,
      category,
      tariffAmount: Number(
        (category === "student" ? matched.studentPrice : matched.regularPrice).toFixed(2)
      ),
    };
  }

  // Above highest configured bracket: student GH₵7/kg, regular GH₵8/kg, rounded to whole cedis
  const perKgHeadline = category === "student" ? 7 : 8;
  const amount = Math.round(billableBracket * perKgHeadline);
  return {
    actualWeightKg: cleanActual,
    billableBracketKg: billableBracket,
    category,
    tariffAmount: Number(amount.toFixed(2)),
  };
}

/**
 * Computes the price for a per-kg service (Light Duvet GH₵10/kg, Heavy Duvet GH₵15/kg, Express GH₵10/kg).
 * Weights are rounded up to the next 0.5 kg with a minimum of 1.0 kg, same for student & regular.
 */
export function calculatePerKgService(actualWeightKg: number, perKgRate: number) {
  const cleanActual = Math.max(0.1, Number(actualWeightKg.toFixed(2)));
  const billableKg = roundToHalfKgBracket(cleanActual);
  const lineTotal = Number((billableKg * perKgRate).toFixed(2));
  return {
    actualWeightKg: cleanActual,
    billableWeightKg: billableKg,
    lineTotal,
  };
}

export interface MultiServiceOrderCalculation {
  items: OrderItem[];
  totalActualWeightKg: number;
  totalBillableWeightKg: number;
  appliedTariffAmount: number;
  subtotalAmount: number;
  discountType: DiscountType;
  discountPercent: number;
  discountAmount: number;
  totalAmount: number;
}

/**
 * Computes all service line items and applies at most ONE 10% discount (Loyalty, Referral, or Manual)
 * as its own negative line item on the order and digital ticket (Section 3 & 9.2).
 */
export function buildOrderItemsAndTotals(params: {
  lines: OrderServiceInputLine[];
  services: LaundryService[];
  tariffs: TariffBracket[];
  category: CustomerCategory;
  discountType: DiscountType;
  discountPercent: number;
  isEstimated?: boolean;
}): MultiServiceOrderCalculation {
  const items: OrderItem[] = [];
  let totalActualWeightKg = 0;
  let totalBillableWeightKg = 0;
  let appliedTariffAmount = 0;
  let subtotalAmount = 0;

  for (const line of params.lines) {
    if (!line.weightKg || line.weightKg <= 0) continue;
    const srv = params.services.find((s) => s.id === line.serviceId);
    if (!srv) continue;

    if (srv.pricingType === "half_kg_tariff") {
      const calc = calculateTariff(line.weightKg, params.category, params.tariffs);
      totalActualWeightKg += calc.actualWeightKg;
      totalBillableWeightKg += calc.billableBracketKg;
      appliedTariffAmount += calc.tariffAmount;
      subtotalAmount += calc.tariffAmount;

      const catLabel = params.category === "student" ? "Student" : "Regular";
      items.push({
        id: `item-${srv.id}-${items.length}`,
        serviceId: srv.id,
        serviceName: srv.name,
        label: params.isEstimated
          ? `${srv.name} (Est. ${calc.billableBracketKg.toFixed(1)} kg ${catLabel})`
          : `${srv.name} (${catLabel} ${calc.billableBracketKg.toFixed(1)} kg bracket • Actual ${calc.actualWeightKg.toFixed(2)} kg)`,
        actualWeightKg: calc.actualWeightKg,
        billableWeightKg: calc.billableBracketKg,
        quantity: calc.billableBracketKg,
        unitLabel: "kg",
        unitPrice: calc.tariffAmount,
        lineTotal: calc.tariffAmount,
        itemType: "tariff",
      });
    } else {
      const calc = calculatePerKgService(line.weightKg, srv.perKgRate);
      totalActualWeightKg += calc.actualWeightKg;
      totalBillableWeightKg += calc.billableWeightKg;
      subtotalAmount += calc.lineTotal;

      items.push({
        id: `item-${srv.id}-${items.length}`,
        serviceId: srv.id,
        serviceName: srv.name,
        label: params.isEstimated
          ? `${srv.name} (Est. ${calc.billableWeightKg.toFixed(1)} kg @ GH₵${srv.perKgRate}/kg)`
          : `${srv.name} (${calc.billableWeightKg.toFixed(1)} kg billed • Actual ${calc.actualWeightKg.toFixed(2)} kg @ GH₵${srv.perKgRate}/kg)`,
        actualWeightKg: calc.actualWeightKg,
        billableWeightKg: calc.billableWeightKg,
        quantity: calc.billableWeightKg,
        unitLabel: "kg",
        unitPrice: srv.perKgRate,
        lineTotal: calc.lineTotal,
        itemType: "service",
      });
    }
  }

  subtotalAmount = Number(subtotalAmount.toFixed(2));
  let discountAmount = 0;
  const activeDiscountType =
    params.discountType !== "none" && params.discountPercent > 0 && subtotalAmount > 0
      ? params.discountType
      : "none";
  const activeDiscountPercent = activeDiscountType !== "none" ? params.discountPercent : 0;

  if (activeDiscountType !== "none") {
    discountAmount = Number(((subtotalAmount * activeDiscountPercent) / 100).toFixed(2));
    const discountTitle =
      activeDiscountType === "loyalty"
        ? `Loyalty discount ${activeDiscountPercent}%`
        : activeDiscountType === "referral"
        ? `Referral discount ${activeDiscountPercent}%`
        : `Special discount ${activeDiscountPercent}%`;

    items.push({
      id: `item-discount`,
      label: discountTitle,
      quantity: 1,
      unitLabel: "discount",
      unitPrice: -discountAmount,
      lineTotal: -discountAmount,
      itemType: "discount",
    });
  }

  const totalAmount = Math.max(0, Number((subtotalAmount - discountAmount).toFixed(2)));

  return {
    items,
    totalActualWeightKg: Number(totalActualWeightKg.toFixed(2)),
    totalBillableWeightKg: Number(totalBillableWeightKg.toFixed(2)),
    appliedTariffAmount: Number(appliedTariffAmount.toFixed(2)),
    subtotalAmount,
    discountType: activeDiscountType,
    discountPercent: activeDiscountPercent,
    discountAmount,
    totalAmount,
  };
}

export function formatCurrency(amount: number): string {
  const num = Number(amount || 0);
  if (num < 0) return `-GH₵${Math.abs(num).toFixed(2)}`;
  return `GH₵${num.toFixed(2)}`;
}

/**
 * Validates exact @upsamail.edu.gh student email and extracts the student ID number (Section 8.6).
 */
export function parseUpsaStudentEmail(email: string): {
  valid: boolean;
  studentIdNumber?: string;
  normalizedEmail?: string;
  error?: string;
} {
  const trimmed = email.trim().toLowerCase();
  const match = /^([a-z0-9._-]+)@([a-z0-9.-]+)$/i.exec(trimmed);
  if (!match) {
    return { valid: false, error: "Please enter a valid email address." };
  }
  const [, localPart, domainPart] = match;
  if (domainPart !== "upsamail.edu.gh") {
    return {
      valid: false,
      error: "Only official UPSA student emails ending in @upsamail.edu.gh are accepted.",
    };
  }
  if (!localPart || localPart.length < 3) {
    return {
      valid: false,
      error: "Enter your full UPSA student email (idnumber@upsamail.edu.gh).",
    };
  }
  return {
    valid: true,
    studentIdNumber: localPart,
    normalizedEmail: trimmed,
  };
}
