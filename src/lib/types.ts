export type UserRole = "admin" | "staff" | "customer";
export type StudentStatus = "none" | "verified" | "expired" | "revoked";
export type CustomerCategory = "student" | "regular";
export type FulfilmentMethod = "drop_off" | "pickup" | "delivery";
export type DiscountType = "none" | "loyalty" | "referral" | "manual";

export type OrderStatus =
  | "order_placed"
  | "order_confirmed"
  | "pickup_scheduled"
  | "laundry_received"
  | "washing_in_progress"
  | "drying_in_progress"
  | "ironing_and_folding"
  | "ready_for_collection"
  | "out_for_delivery"
  | "completed"
  | "rejected"
  | "cancelled";

export type PaymentStatus = "unpaid" | "partially_paid" | "paid";
export type PaymentMethod = "cash" | "mobile_money";

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;

  // Section 8.6: UPSA Student Verification via idnumber@upsamail.edu.gh OTP
  studentStatus: StudentStatus;
  upsaEmail?: string | null;
  studentIdNumber?: string | null;
  studentVerifiedAt?: string | null;
  studentExpiresAt?: string | null;
  studentRevokedReason?: string | null;

  // Section 3: Loyalty & Referral Discounts
  referralCode: string;
  referredById?: string | null;
  referredByName?: string | null;
  referralRewardCredited?: boolean;
  completedWashesStreak: number;
  availableReferralDiscounts: number;
  manualDiscountsAvailable: number;

  defaultAddress?: string;
  savedAddresses: string[];
  emailNotificationsEnabled: boolean;
  pushNotificationsEnabled: boolean;
  soundEnabled: boolean;
  staffPermissions?: {
    orders: boolean;
    payments: boolean;
    weighing: boolean;
    reports: boolean;
  };
  createdAt: string;
}

export interface LaundryService {
  id: string;
  slug: "wash-dry-fold" | "light-duvet" | "heavy-duvet" | "express" | string;
  name: string;
  description: string;
  iconName: "shirt" | "sparkles" | "flame" | "wind" | "bed" | "zap";
  pricingType: "half_kg_tariff" | "per_kg";
  perKgRate: number;
  sameDay?: boolean;
  isActive: boolean;
  sortOrder: number;
}

export interface TariffBracket {
  id: string;
  weightKg: number;
  studentPrice: number;
  regularPrice: number;
  isActive: boolean;
}

export interface OrderServiceInputLine {
  serviceId: string;
  weightKg: number;
}

export interface OrderItem {
  id: string;
  serviceId?: string;
  serviceName?: string;
  label: string;
  actualWeightKg?: number;
  billableWeightKg?: number;
  quantity: number;
  unitLabel: string;
  unitPrice: number;
  lineTotal: number;
  itemType: "tariff" | "service" | "discount";
}

export interface OrderStatusEvent {
  id: string;
  status: OrderStatus;
  note?: string;
  changedBy: string;
  createdAt: string;
}

export interface PaymentRecord {
  id: string;
  orderId: string;
  tagNumber: string;
  customerName: string;
  amount: number;
  method: PaymentMethod;
  momoReference?: string;
  recordedBy: string;
  notes?: string;
  createdAt: string;
}

export interface LaundryOrder {
  id: string;
  tagSeq: number;
  tagNumber: string;
  publicToken: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  isWalkIn: boolean;

  fulfilmentMethod: FulfilmentMethod;
  pickupAddress?: string;
  pickupScheduledAt?: string;
  deliveryAddress?: string;
  deliveryScheduledAt?: string;
  dropOffScheduledAt?: string;
  specialInstructions?: string;

  // Weight, Pricing & Discount Snapshot
  estimatedWeightKg?: number;
  actualWeightKg?: number;
  billableBracketKg?: number;
  appliedCategory: CustomerCategory;
  appliedTariffAmount: number;
  subtotalAmount: number;
  discountType: DiscountType;
  discountPercent: number;
  discountAmount: number;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  paymentStatus: PaymentStatus;

  status: OrderStatus;
  assignedStaffId?: string;
  assignedStaffName?: string;
  receivedAt?: string;
  readyBy?: string;
  completedAt?: string;
  ticketIssuedAt?: string;
  unpaidCompletionExceptionReason?: string;
  unpaidCompletionApprovedBy?: string;

  items: OrderItem[];
  statusHistory: OrderStatusEvent[];
  payments: PaymentRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  orderId?: string;
  tagNumber?: string;
  title: string;
  body: string;
  eventKey: string;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  actorName: string;
  action: string;
  entityType:
    | "order"
    | "payment"
    | "tariff"
    | "student_verification"
    | "discount"
    | "service"
    | "staff"
    | "settings";
  entityId: string;
  details: string;
  createdAt: string;
}

export interface BusinessSettings {
  businessName: string;
  location: string;
  phone: string;
  whatsappNumber: string;
  momoNumber: string;
  momoNetwork: string;
  momoAccountName: string;
  operatingHours: string;
  coverageAreas: string;
  defaultTurnaroundHours: number;
  loyaltyWashesRequired: number;
  discountPercent: number;
  referralExpiryDays?: number | null;
  dailySummaryEmail: string;
  dailySummaryHour: number;
}
