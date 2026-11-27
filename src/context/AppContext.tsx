"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { buildOrderItemsAndTotals } from "@/lib/pricing";
import { playTinocleanTone, registerServiceWorker, syncUnreadBadges } from "@/lib/pwa";
import { getBrowserSupabase } from "@/lib/supabase-browser";
import {
  AppNotification,
  AuditLogEntry,
  BusinessSettings,
  CustomerCategory,
  DiscountType,
  FulfilmentMethod,
  LaundryOrder,
  LaundryService,
  OrderItem,
  OrderServiceInputLine,
  OrderStatus,
  PaymentMethod,
  PaymentRecord,
  TariffBracket,
  UserProfile,
} from "@/lib/types";
import { ORDER_STATUS_META } from "@/lib/workflow";

const EMPTY_SETTINGS: BusinessSettings = {
  businessName: "Tinoclean Laundry",
  location: "UPSA",
  phone: "0551750854",
  whatsappNumber: "233551750854",
  momoNumber: "0551750854",
  momoNetwork: "GhanaPay (via MTN MoMo)",
  momoAccountName: "MARTIN",
  operatingHours: "Monday to Saturday, 7:30 am to 7:30 pm. Closed on Sundays.",
  coverageAreas: "Everywhere",
  defaultTurnaroundHours: 24,
  loyaltyWashesRequired: 3,
  discountPercent: 10,
  referralExpiryDays: null,
  dailySummaryEmail: "",
  dailySummaryHour: 20,
};

export interface PlaceOrderInput {
  customerId?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  isWalkIn?: boolean;
  fulfilmentMethod: FulfilmentMethod;
  pickupAddress?: string;
  pickupScheduledAt?: string;
  deliveryAddress?: string;
  deliveryScheduledAt?: string;
  dropOffScheduledAt?: string;
  specialInstructions?: string;
  serviceLines: OrderServiceInputLine[];
  isActualWeight?: boolean;
}

interface AppContextValue {
  hydrated: boolean;
  setupError: string | null;
  currentUser: UserProfile | null;
  users: UserProfile[];
  orders: LaundryOrder[];
  services: LaundryService[];
  tariffs: TariffBracket[];
  payments: PaymentRecord[];
  notifications: AppNotification[];
  userNotifications: AppNotification[];
  unreadCount: number;
  auditLogs: AuditLogEntry[];
  settings: BusinessSettings;
  toast: { id: string; title: string; body: string } | null;
  dismissToast: () => void;
  refreshData: () => Promise<void>;

  // Auth
  signInWithPassword: (
    email: string,
    password: string
  ) => Promise<{ ok: boolean; error?: string; user?: UserProfile }>;
  signOut: () => Promise<void>;
  updateProfile: (patch: Partial<UserProfile>) => Promise<{ ok: boolean; error?: string }>;

  // Orders & workflow
  placeOrder: (
    input: PlaceOrderInput
  ) => Promise<{ ok: boolean; order?: LaundryOrder; error?: string }>;
  updateOrderStatus: (
    orderId: string,
    status: OrderStatus,
    options?: { note?: string; unpaidExceptionReason?: string }
  ) => Promise<{ ok: boolean; error?: string }>;
  weighAndIssueTicket: (
    orderId: string,
    serviceLines: OrderServiceInputLine[],
    readyByIso?: string,
    categoryOverride?: CustomerCategory
  ) => Promise<{ ok: boolean; error?: string }>;
  assignStaff: (orderId: string, staffId: string) => Promise<void>;

  // Payments
  recordPayment: (input: {
    orderId: string;
    amount: number;
    method: PaymentMethod;
    momoReference?: string;
    notes?: string;
  }) => Promise<{ ok: boolean; error?: string }>;

  // Student verification & discounts (Admin)
  revokeOrReinstateStudent: (
    customerId: string,
    action: "revoke" | "reinstate",
    reason: string
  ) => Promise<{ ok: boolean; error?: string }>;
  adjustCustomerDiscount: (
    customerId: string,
    delta: number,
    reason: string
  ) => Promise<{ ok: boolean; error?: string }>;

  // Services, Tariffs, Staff, Settings
  updateTariffBracket: (id: string, patch: Partial<TariffBracket>) => Promise<void>;
  addTariffBracket: (
    weightKg: number,
    studentPrice: number,
    regularPrice: number
  ) => Promise<void>;
  upsertService: (
    service: Omit<LaundryService, "id"> & { id?: string }
  ) => Promise<void>;
  createStaffAccount: (input: {
    fullName: string;
    email: string;
    phone: string;
    password: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  updateBusinessSettings: (patch: Partial<BusinessSettings>) => Promise<void>;

  // Notifications
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

// Row mappers from Supabase snake_case to TypeScript camelCase
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapProfile(r: any): UserProfile {
  // Check 12-month student expiry automatically
  let studentStatus = r.student_status as UserProfile["studentStatus"];
  if (
    studentStatus === "verified" &&
    r.student_expires_at &&
    new Date(r.student_expires_at).getTime() < Date.now()
  ) {
    studentStatus = "expired";
  }

  return {
    id: r.id,
    fullName: r.full_name || "",
    email: r.email || "",
    phone: r.phone || "",
    role: r.role || "customer",
    studentStatus,
    upsaEmail: r.upsa_email,
    studentIdNumber: r.student_id_number,
    studentVerifiedAt: r.student_verified_at,
    studentExpiresAt: r.student_expires_at,
    studentRevokedReason: r.student_revoked_reason,
    referralCode: r.referral_code || "",
    referredById: r.referred_by_id,
    referralRewardCredited: Boolean(r.referral_reward_credited),
    completedWashesStreak: Number(r.completed_washes_streak || 0),
    availableReferralDiscounts: Number(r.available_referral_discounts || 0),
    manualDiscountsAvailable: Number(r.manual_discounts_available || 0),
    defaultAddress: r.default_address || "",
    savedAddresses: Array.isArray(r.saved_addresses) ? r.saved_addresses : [],
    emailNotificationsEnabled: r.email_notifications_enabled ?? true,
    pushNotificationsEnabled: r.push_notifications_enabled ?? true,
    soundEnabled: r.sound_enabled ?? true,
    staffPermissions: r.staff_permissions || {
      orders: true,
      payments: true,
      weighing: true,
      reports: false,
    },
    createdAt: r.created_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapService(r: any): LaundryService {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    description: r.description,
    iconName: r.icon_name || "shirt",
    pricingType: r.pricing_type === "per_kg" ? "per_kg" : "half_kg_tariff",
    perKgRate: Number(r.per_kg_rate || 0),
    sameDay: Boolean(r.same_day),
    isActive: Boolean(r.is_active),
    sortOrder: Number(r.sort_order || 0),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapTariff(r: any): TariffBracket {
  return {
    id: r.id,
    weightKg: Number(r.weight_kg),
    studentPrice: Number(r.student_price),
    regularPrice: Number(r.regular_price),
    isActive: Boolean(r.is_active),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapSettings(r: any): BusinessSettings {
  if (!r) return EMPTY_SETTINGS;
  return {
    businessName: r.business_name || EMPTY_SETTINGS.businessName,
    location: r.location || EMPTY_SETTINGS.location,
    phone: r.phone || EMPTY_SETTINGS.phone,
    whatsappNumber: r.whatsapp_number || EMPTY_SETTINGS.whatsappNumber,
    momoNumber: r.momo_number || EMPTY_SETTINGS.momoNumber,
    momoNetwork: r.momo_network || EMPTY_SETTINGS.momoNetwork,
    momoAccountName: r.momo_account_name || EMPTY_SETTINGS.momoAccountName,
    operatingHours: r.operating_hours || EMPTY_SETTINGS.operatingHours,
    coverageAreas: r.coverage_areas || EMPTY_SETTINGS.coverageAreas,
    defaultTurnaroundHours: Number(r.default_turnaround_hours || 24),
    loyaltyWashesRequired: Number(r.loyalty_washes_required || 3),
    discountPercent: Number(r.discount_percent || 10),
    referralExpiryDays: r.referral_expiry_days,
    dailySummaryEmail: r.daily_summary_email || "",
    dailySummaryHour: Number(r.daily_summary_hour || 20),
  };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [orders, setOrders] = useState<LaundryOrder[]>([]);
  const [services, setServices] = useState<LaundryService[]>([]);
  const [tariffs, setTariffs] = useState<TariffBracket[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [settings, setSettings] = useState<BusinessSettings>(EMPTY_SETTINGS);
  const [toast, setToast] = useState<{ id: string; title: string; body: string } | null>(null);
  const currentUserRef = React.useRef<UserProfile | null>(null);
  const isFetchingRef = React.useRef(false);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  const showToast = useCallback((title: string, body: string) => {
    const id = `toast-${Date.now()}`;
    setToast({ id, title, body });
    setTimeout(() => {
      setToast((prev) => (prev?.id === id ? null : prev));
    }, 4500);
  }, []);

  const refreshData = useCallback(async () => {
    if (isFetchingRef.current) return;
    const supabase = getBrowserSupabase();
    if (!supabase) {
      setSetupError(
        "Supabase credentials (NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY) are missing. Configure .env.local to connect to your live Supabase database."
      );
      setHydrated(true);
      return;
    }

    isFetchingRef.current = true;
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const [
        { data: srvRows, error: srvErr },
        { data: trfRows },
        { data: setRow },
        { data: profRows },
        { data: ordRows },
        { data: itemRows },
        { data: histRows },
        { data: payRows },
        { data: ntfRows },
        { data: audRows },
      ] = await Promise.all([
        supabase.from("toon_services").select("*").order("sort_order", { ascending: true }),
        supabase.from("toon_tariff_brackets").select("*").order("weight_kg", { ascending: true }),
        supabase.from("toon_business_settings").select("*").eq("id", 1).maybeSingle(),
        supabase.from("toon_profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("toon_orders").select("*").order("created_at", { ascending: false }),
        supabase.from("toon_order_items").select("*").order("created_at", { ascending: true }),
        supabase.from("toon_order_status_history").select("*").order("created_at", { ascending: true }),
        supabase.from("toon_payments").select("*").order("created_at", { ascending: false }),
        supabase.from("toon_notifications").select("*").order("created_at", { ascending: false }),
        supabase.from("toon_audit_logs").select("*").order("created_at", { ascending: false }).limit(200),
      ]);

      if (srvErr) {
        setSetupError(
          `Supabase schema error: ${srvErr.message}. Run supabase/migrations/001_initial_schema.sql in your Supabase SQL Editor.`
        );
        setHydrated(true);
        return;
      }

      setSetupError(null);
      const mappedProfiles = (profRows || []).map(mapProfile);
      setUsers(mappedProfiles);
      setServices((srvRows || []).map(mapService));
      setTariffs((trfRows || []).map(mapTariff));
      setSettings(mapSettings(setRow));

      if (session?.user) {
        const me = mappedProfiles.find((p) => p.id === session.user.id) || null;
        setCurrentUser(me);
      } else {
        setCurrentUser(null);
      }

      const mappedPayments: PaymentRecord[] = (payRows || []).map((p) => {
        const ord = (ordRows || []).find((o) => o.id === p.order_id);
        const recUser = mappedProfiles.find((u) => u.id === p.recorded_by);
        return {
          id: p.id,
          orderId: p.order_id,
          tagNumber: ord?.tag_number || "",
          customerName: ord?.customer_name || "",
          amount: Number(p.amount),
          method: p.method,
          momoReference: p.momo_reference || undefined,
          recordedBy: recUser?.fullName || "Staff",
          notes: p.notes || undefined,
          createdAt: p.created_at,
        };
      });
      setPayments(mappedPayments);

      const mappedOrders: LaundryOrder[] = (ordRows || []).map((o) => {
        const oItems: OrderItem[] = (itemRows || [])
          .filter((i) => i.order_id === o.id)
          .map((i) => ({
            id: i.id,
            serviceId: i.service_id || undefined,
            serviceName: i.service_name || undefined,
            label: i.label,
            actualWeightKg: i.actual_weight_kg ? Number(i.actual_weight_kg) : undefined,
            billableWeightKg: i.billable_weight_kg ? Number(i.billable_weight_kg) : undefined,
            quantity: Number(i.quantity),
            unitLabel: i.unit_label,
            unitPrice: Number(i.unit_price),
            lineTotal: Number(i.line_total),
            itemType: i.item_type,
          }));

        const oHist = (histRows || [])
          .filter((h) => h.order_id === o.id)
          .map((h) => {
            const actor = mappedProfiles.find((u) => u.id === h.changed_by);
            return {
              id: h.id,
              status: h.status as OrderStatus,
              note: h.note || undefined,
              changedBy: actor?.fullName || "Staff",
              createdAt: h.created_at,
            };
          });

        const oPays = mappedPayments.filter((p) => p.orderId === o.id);
        const staff = mappedProfiles.find((u) => u.id === o.assigned_staff_id);

        return {
          id: o.id,
          tagSeq: Number(o.tag_seq),
          tagNumber: o.tag_number,
          publicToken: o.public_token,
          customerId: o.customer_id || undefined,
          customerName: o.customer_name,
          customerPhone: o.customer_phone,
          customerEmail: o.customer_email || undefined,
          isWalkIn: Boolean(o.is_walk_in),
          fulfilmentMethod: o.fulfilment_method,
          pickupAddress: o.pickup_address || undefined,
          pickupScheduledAt: o.pickup_scheduled_at || undefined,
          deliveryAddress: o.delivery_address || undefined,
          deliveryScheduledAt: o.delivery_scheduled_at || undefined,
          dropOffScheduledAt: o.drop_off_scheduled_at || undefined,
          specialInstructions: o.special_instructions || undefined,
          estimatedWeightKg: o.estimated_weight_kg ? Number(o.estimated_weight_kg) : undefined,
          actualWeightKg: o.actual_weight_kg ? Number(o.actual_weight_kg) : undefined,
          billableBracketKg: o.billable_bracket_kg ? Number(o.billable_bracket_kg) : undefined,
          appliedCategory: o.applied_category,
          appliedTariffAmount: Number(o.applied_tariff_amount || 0),
          subtotalAmount: Number(o.subtotal_amount || o.total_amount || 0),
          discountType: (o.discount_type || "none") as DiscountType,
          discountPercent: Number(o.discount_percent || 0),
          discountAmount: Number(o.discount_amount || 0),
          totalAmount: Number(o.total_amount || 0),
          amountPaid: Number(o.amount_paid || 0),
          balanceDue: Number(o.balance_due ?? Math.max(0, Number(o.total_amount) - Number(o.amount_paid))),
          paymentStatus: o.payment_status,
          status: o.status,
          assignedStaffId: o.assigned_staff_id || undefined,
          assignedStaffName: staff?.fullName,
          receivedAt: o.received_at || undefined,
          readyBy: o.ready_by || undefined,
          completedAt: o.completed_at || undefined,
          ticketIssuedAt: o.ticket_issued_at || undefined,
          unpaidCompletionExceptionReason: o.unpaid_completion_exception_reason || undefined,
          items: oItems,
          statusHistory: oHist,
          payments: oPays,
          createdAt: o.created_at,
          updatedAt: o.updated_at,
        };
      });
      setOrders(mappedOrders);

      setNotifications(
        (ntfRows || []).map((n) => ({
          id: n.id,
          userId: n.user_id,
          orderId: n.order_id || undefined,
          tagNumber: n.tag_number || undefined,
          title: n.title,
          body: n.body,
          eventKey: n.event_key,
          isRead: Boolean(n.is_read),
          readAt: n.read_at,
          createdAt: n.created_at,
        }))
      );

      setAuditLogs(
        (audRows || []).map((a) => ({
          id: a.id,
          actorName: a.actor_name || "Admin",
          action: a.action,
          entityType: a.entity_type,
          entityId: a.entity_id || "",
          details:
            typeof a.details === "string" ? a.details : JSON.stringify(a.details || {}),
          createdAt: a.created_at,
        }))
      );
    } catch (err) {
      setSetupError(
        err instanceof Error ? err.message : "Failed to connect to Supabase database."
      );
    } finally {
      isFetchingRef.current = false;
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    registerServiceWorker();
    refreshData();

    const supabase = getBrowserSupabase();
    if (!supabase) return;

    const { data: authSub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        refreshData();
      }
    });

    const channel = supabase
      .channel("tinoclean-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "toon_orders" },
        () => refreshData()
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "toon_notifications" },
        (payload) => {
          refreshData();
          const row = payload.new as { user_id?: string; title?: string; body?: string };
          const activeUser = currentUserRef.current;
          if (row && activeUser && row.user_id === activeUser.id) {
            playTinocleanTone(activeUser.soundEnabled);
            showToast(row.title || "Tinoclean Update", row.body || "");
          }
        }
      )
      .subscribe();

    return () => {
      authSub.subscription.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [refreshData, showToast]);

  const userNotifications = useMemo(() => {
    if (!currentUser) return [];
    return notifications.filter((n) => n.userId === currentUser.id);
  }, [notifications, currentUser]);

  const unreadCount = useMemo(
    () => userNotifications.filter((n) => !n.isRead).length,
    [userNotifications]
  );

  // Sync all 4 unread badge layers (Section 8.2)
  useEffect(() => {
    if (!hydrated) return;
    syncUnreadBadges(unreadCount, "Tinoclean Laundry");
  }, [unreadCount, hydrated]);

  const createAndDispatchNotification = async (params: {
    recipientIds: string[];
    orderId?: string;
    tagNumber?: string;
    title: string;
    body: string;
    eventKey: string;
  }) => {
    const supabase = getBrowserSupabase();
    if (!supabase) return;

    for (const uid of params.recipientIds) {
      const { error } = await supabase.from("toon_notifications").upsert(
        {
          user_id: uid,
          order_id: params.orderId || null,
          tag_number: params.tagNumber || null,
          title: params.title,
          body: params.body,
          event_key: params.eventKey,
          is_read: false,
        },
        { onConflict: "user_id,event_key" }
      );

      if (!error) {
        const recipient = users.find((u) => u.id === uid);
        const nextUnread =
          notifications.filter((n) => n.userId === uid && !n.isRead).length + 1;

        fetch("/api/notifications/dispatch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: uid,
            toEmail: recipient?.email,
            emailEnabled: recipient?.emailNotificationsEnabled ?? true,
            title: params.title,
            body: params.body,
            orderId: params.orderId,
            tagNumber: params.tagNumber,
            eventKey: `${uid}:${params.eventKey}`,
            unreadCount: nextUnread,
          }),
        }).catch(() => {});

        if (currentUser?.id === uid) {
          playTinocleanTone(currentUser.soundEnabled);
          showToast(params.title, params.body);
        }
      }
    }
  };

  const signInWithPassword = async (email: string, password: string) => {
    const supabase = getBrowserSupabase();
    if (!supabase) {
      return { ok: false, error: "Supabase environment is not configured." };
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error || !data.user) {
      return { ok: false, error: error?.message || "Invalid email or password." };
    }
    await refreshData();
    const { data: prof } = await supabase
      .from("toon_profiles")
      .select("*")
      .eq("id", data.user.id)
      .maybeSingle();

    const mapped = prof ? mapProfile(prof) : undefined;
    return { ok: true, user: mapped };
  };

  const signOut = async () => {
    const supabase = getBrowserSupabase();
    if (supabase) await supabase.auth.signOut();
    setCurrentUser(null);
  };

  const updateProfile = async (patch: Partial<UserProfile>) => {
    const supabase = getBrowserSupabase();
    if (!supabase || !currentUser) return { ok: false, error: "Not signed in." };

    const dbPatch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (patch.fullName !== undefined) dbPatch.full_name = patch.fullName;
    if (patch.phone !== undefined) dbPatch.phone = patch.phone;
    if (patch.defaultAddress !== undefined) dbPatch.default_address = patch.defaultAddress;
    if (patch.savedAddresses !== undefined) dbPatch.saved_addresses = patch.savedAddresses;
    if (patch.emailNotificationsEnabled !== undefined)
      dbPatch.email_notifications_enabled = patch.emailNotificationsEnabled;
    if (patch.pushNotificationsEnabled !== undefined)
      dbPatch.push_notifications_enabled = patch.pushNotificationsEnabled;
    if (patch.soundEnabled !== undefined) dbPatch.sound_enabled = patch.soundEnabled;

    const { error } = await supabase
      .from("toon_profiles")
      .update(dbPatch)
      .eq("id", currentUser.id);
    if (error) return { ok: false, error: error.message };
    await refreshData();
    return { ok: true };
  };

  const placeOrder = async (input: PlaceOrderInput) => {
    const supabase = getBrowserSupabase();
    if (!supabase) return { ok: false, error: "Supabase is not configured." };

    const customer = input.customerId
      ? users.find((u) => u.id === input.customerId)
      : currentUser?.role === "customer"
      ? currentUser
      : undefined;

    const category: CustomerCategory =
      customer?.studentStatus === "verified" ? "student" : "regular";

    // Determine if customer qualifies for ONE 10% discount (Section 3: no stacking)
    let discountType: DiscountType = "none";
    if (customer) {
      if (customer.completedWashesStreak >= settings.loyaltyWashesRequired) {
        discountType = "loyalty";
      } else if (customer.availableReferralDiscounts > 0) {
        discountType = "referral";
      } else if (customer.manualDiscountsAvailable > 0) {
        discountType = "manual";
      }
    }

    const calc = buildOrderItemsAndTotals({
      lines: input.serviceLines,
      services,
      tariffs,
      category,
      discountType,
      discountPercent: settings.discountPercent,
      isEstimated: !input.isActualWeight,
    });

    const hasSameDayExpress = input.serviceLines.some((l) => {
      const s = services.find((srv) => srv.id === l.serviceId);
      return s?.sameDay && l.weightKg > 0;
    });

    const turnaroundHours = hasSameDayExpress ? 8 : settings.defaultTurnaroundHours;
    const now = new Date();
    const isReceivedNow = Boolean(input.isWalkIn && input.isActualWeight);
    const readyBy = isReceivedNow
      ? new Date(now.getTime() + turnaroundHours * 3600 * 1000).toISOString()
      : null;

    const { data: insertedOrder, error: ordErr } = await supabase
      .from("toon_orders")
      .insert({
        customer_id: customer?.id || input.customerId || null,
        customer_name: input.customerName.trim(),
        customer_phone: input.customerPhone.trim(),
        customer_email: input.customerEmail?.trim() || customer?.email || null,
        is_walk_in: Boolean(input.isWalkIn),
        fulfilment_method: input.fulfilmentMethod,
        pickup_address: input.pickupAddress || null,
        pickup_scheduled_at: input.pickupScheduledAt || null,
        delivery_address: input.deliveryAddress || null,
        delivery_scheduled_at: input.deliveryScheduledAt || null,
        drop_off_scheduled_at: input.dropOffScheduledAt || null,
        special_instructions: input.specialInstructions || null,
        estimated_weight_kg: calc.totalActualWeightKg,
        actual_weight_kg: input.isActualWeight ? calc.totalActualWeightKg : null,
        billable_bracket_kg: calc.totalBillableWeightKg,
        applied_category: category,
        applied_tariff_amount: calc.appliedTariffAmount,
        subtotal_amount: calc.subtotalAmount,
        discount_type: calc.discountType,
        discount_percent: calc.discountPercent,
        discount_amount: calc.discountAmount,
        total_amount: calc.totalAmount,
        amount_paid: 0,
        payment_status: "unpaid",
        status: isReceivedNow ? "laundry_received" : "order_placed",
        received_at: isReceivedNow ? now.toISOString() : null,
        ready_by: readyBy,
        ticket_issued_at: isReceivedNow ? now.toISOString() : null,
      })
      .select("*")
      .single();

    if (ordErr || !insertedOrder) {
      return { ok: false, error: ordErr?.message || "Failed to place order." };
    }

    // Insert line items (including negative discount line if applicable)
    if (calc.items.length > 0) {
      await supabase.from("toon_order_items").insert(
        calc.items.map((item) => ({
          order_id: insertedOrder.id,
          service_id: item.serviceId || null,
          service_name: item.serviceName || null,
          label: item.label,
          actual_weight_kg: item.actualWeightKg || null,
          billable_weight_kg: item.billableWeightKg || null,
          quantity: item.quantity,
          unit_label: item.unitLabel,
          unit_price: item.unitPrice,
          line_total: item.lineTotal,
          item_type: item.itemType,
        }))
      );
    }

    await supabase.from("toon_order_status_history").insert({
      order_id: insertedOrder.id,
      status: isReceivedNow ? "laundry_received" : "order_placed",
      note: isReceivedNow
        ? `Walk-in order received & weighed (${calc.totalActualWeightKg.toFixed(2)} kg)`
        : "Customer submitted booking",
      changed_by: currentUser?.id || null,
    });

    // If a referral or manual discount was applied, decrement available count now
    if (customer && calc.discountType === "referral") {
      await supabase
        .from("toon_profiles")
        .update({
          available_referral_discounts: Math.max(0, customer.availableReferralDiscounts - 1),
        })
        .eq("id", customer.id);
    } else if (customer && calc.discountType === "manual") {
      await supabase
        .from("toon_profiles")
        .update({
          manual_discounts_available: Math.max(0, customer.manualDiscountsAvailable - 1),
        })
        .eq("id", customer.id);
    }

    // Notify admin & staff
    const staffAndAdminIds = users
      .filter((u) => u.role === "admin" || u.role === "staff")
      .map((u) => u.id);

    await createAndDispatchNotification({
      recipientIds: staffAndAdminIds,
      orderId: insertedOrder.id,
      tagNumber: insertedOrder.tag_number,
      title: `New Order ${insertedOrder.tag_number}`,
      body: `${insertedOrder.customer_name} • GH₵${Number(insertedOrder.total_amount).toFixed(2)}`,
      eventKey: `${insertedOrder.id}:order_placed:staff`,
    });

    if (customer?.id) {
      await createAndDispatchNotification({
        recipientIds: [customer.id],
        orderId: insertedOrder.id,
        tagNumber: insertedOrder.tag_number,
        title: "Order placed",
        body:
          calc.discountType !== "none"
            ? `${ORDER_STATUS_META.order_placed.customerMessage(insertedOrder.tag_number)} Your ${calc.discountPercent}% ${calc.discountType} discount (-GH₵${calc.discountAmount.toFixed(2)}) has been applied!`
            : ORDER_STATUS_META.order_placed.customerMessage(insertedOrder.tag_number),
        eventKey: `${insertedOrder.id}:order_placed`,
      });
    }

    await refreshData();
    const freshOrder = orders.find((o) => o.id === insertedOrder.id) || {
      id: insertedOrder.id,
      tagSeq: Number(insertedOrder.tag_seq),
      tagNumber: insertedOrder.tag_number,
      publicToken: insertedOrder.public_token,
      customerName: insertedOrder.customer_name,
      customerPhone: insertedOrder.customer_phone,
      isWalkIn: Boolean(insertedOrder.is_walk_in),
      fulfilmentMethod: insertedOrder.fulfilment_method,
      appliedCategory: category,
      appliedTariffAmount: calc.appliedTariffAmount,
      subtotalAmount: calc.subtotalAmount,
      discountType: calc.discountType,
      discountPercent: calc.discountPercent,
      discountAmount: calc.discountAmount,
      totalAmount: calc.totalAmount,
      amountPaid: 0,
      balanceDue: calc.totalAmount,
      paymentStatus: "unpaid" as const,
      status: insertedOrder.status,
      items: calc.items,
      statusHistory: [],
      payments: [],
      createdAt: insertedOrder.created_at,
      updatedAt: insertedOrder.updated_at,
    };

    return { ok: true, order: freshOrder };
  };

  const weighAndIssueTicket = async (
    orderId: string,
    serviceLines: OrderServiceInputLine[],
    readyByIso?: string,
    categoryOverride?: CustomerCategory
  ) => {
    const supabase = getBrowserSupabase();
    if (!supabase) return { ok: false, error: "Supabase is not configured." };

    const validLines = serviceLines.filter((l) => l.weightKg > 0);
    if (validLines.length === 0) {
      return { ok: false, error: "Enter a positive measured weight for at least one service." };
    }

    const order = orders.find((o) => o.id === orderId);
    if (!order) return { ok: false, error: "Order not found." };

    const customer = order.customerId
      ? users.find((u) => u.id === order.customerId)
      : undefined;
    const category: CustomerCategory =
      categoryOverride ||
      (customer?.studentStatus === "verified" ? "student" : order.appliedCategory);

    const calc = buildOrderItemsAndTotals({
      lines: validLines,
      services,
      tariffs,
      category,
      discountType: order.discountType,
      discountPercent: order.discountPercent || settings.discountPercent,
      isEstimated: false,
    });

    const hasSameDay = validLines.some((l) => {
      const s = services.find((srv) => srv.id === l.serviceId);
      return s?.sameDay;
    });
    const turnaround = hasSameDay ? 8 : settings.defaultTurnaroundHours;
    const now = new Date().toISOString();
    const readyBy =
      readyByIso ||
      order.readyBy ||
      new Date(Date.now() + turnaround * 3600 * 1000).toISOString();

    const shouldAdvanceStatus =
      order.status === "order_placed" ||
      order.status === "order_confirmed" ||
      order.status === "pickup_scheduled";
    const nextStatus: OrderStatus = shouldAdvanceStatus ? "laundry_received" : order.status;
    const nextBalance = Math.max(0, Number((calc.totalAmount - order.amountPaid).toFixed(2)));
    const nextPayStatus =
      nextBalance === 0 ? "paid" : order.amountPaid > 0 ? "partially_paid" : "unpaid";

    const { error: updErr } = await supabase
      .from("toon_orders")
      .update({
        actual_weight_kg: calc.totalActualWeightKg,
        billable_bracket_kg: calc.totalBillableWeightKg,
        applied_category: category,
        applied_tariff_amount: calc.appliedTariffAmount,
        subtotal_amount: calc.subtotalAmount,
        discount_amount: calc.discountAmount,
        total_amount: calc.totalAmount,
        payment_status: nextPayStatus,
        status: nextStatus,
        received_at: order.receivedAt || now,
        ready_by: readyBy,
        ticket_issued_at: order.ticketIssuedAt || now,
        updated_at: now,
      })
      .eq("id", orderId);

    if (updErr) return { ok: false, error: updErr.message };

    // Replace order_items snapshot
    await supabase.from("toon_order_items").delete().eq("order_id", orderId);
    await supabase.from("toon_order_items").insert(
      calc.items.map((item) => ({
        order_id: orderId,
        service_id: item.serviceId || null,
        service_name: item.serviceName || null,
        label: item.label,
        actual_weight_kg: item.actualWeightKg || null,
        billable_weight_kg: item.billableWeightKg || null,
        quantity: item.quantity,
        unit_label: item.unitLabel,
        unit_price: item.unitPrice,
        line_total: item.lineTotal,
        item_type: item.itemType,
      }))
    );

    if (shouldAdvanceStatus) {
      await supabase.from("toon_order_status_history").insert({
        order_id: orderId,
        status: "laundry_received",
        note: `Weighed ${calc.totalActualWeightKg.toFixed(2)} kg → ${calc.totalBillableWeightKg.toFixed(1)} kg billed (${category}). Total GH₵${calc.totalAmount.toFixed(2)}`,
        changed_by: currentUser?.id || null,
      });
    }

    await supabase.from("toon_audit_logs").insert({
      actor_id: currentUser?.id || null,
      actor_name: currentUser?.fullName || "Staff",
      action: "WEIGH_AND_TICKET",
      entity_type: "order",
      entity_id: order.tagNumber,
      details: {
        actual_weight_kg: calc.totalActualWeightKg,
        billable_bracket_kg: calc.totalBillableWeightKg,
        category,
        total_amount: calc.totalAmount,
      },
    });

    if (order.customerId) {
      await createAndDispatchNotification({
        recipientIds: [order.customerId],
        orderId: order.id,
        tagNumber: order.tagNumber,
        title: `Digital Ticket Issued — ${order.tagNumber}`,
        body: `Laundry weighed at ${calc.totalActualWeightKg.toFixed(2)} kg (${calc.totalBillableWeightKg.toFixed(1)} kg billed). Total payable on delivery/collection: GH₵${calc.totalAmount.toFixed(2)}.`,
        eventKey: `${order.id}:ticket:${calc.totalActualWeightKg}`,
      });
    }

    await refreshData();
    return { ok: true };
  };

  const updateOrderStatus = async (
    orderId: string,
    status: OrderStatus,
    options?: { note?: string; unpaidExceptionReason?: string }
  ) => {
    const supabase = getBrowserSupabase();
    if (!supabase) return { ok: false, error: "Supabase is not configured." };

    const order = orders.find((o) => o.id === orderId);
    if (!order) return { ok: false, error: "Order not found." };

    // Section 9.1: Cannot mark Completed/Delivered until paid in full unless admin approves exception
    if (status === "completed" && order.balanceDue > 0) {
      if (currentUser?.role !== "admin") {
        return {
          ok: false,
          error: `Balance of GH₵${order.balanceDue.toFixed(2)} is still due. Record payment in full before completing, or ask an Admin to approve an exception.`,
        };
      }
      if (!options?.unpaidExceptionReason?.trim()) {
        return {
          ok: false,
          error: "An unpaid completion exception requires a written reason (saved in the audit trail).",
        };
      }
    }

    const now = new Date().toISOString();
    const { error } = await supabase
      .from("toon_orders")
      .update({
        status,
        completed_at: status === "completed" ? now : order.completedAt || null,
        unpaid_completion_exception_reason:
          options?.unpaidExceptionReason || order.unpaidCompletionExceptionReason || null,
        unpaid_completion_approved_by: options?.unpaidExceptionReason
          ? currentUser?.id || null
          : null,
        updated_at: now,
      })
      .eq("id", orderId);

    if (error) return { ok: false, error: error.message };

    await supabase.from("toon_order_status_history").insert({
      order_id: orderId,
      status,
      note: options?.unpaidExceptionReason
        ? `Admin exception: ${options.unpaidExceptionReason}`
        : options?.note || null,
      changed_by: currentUser?.id || null,
    });

    await supabase.from("toon_audit_logs").insert({
      actor_id: currentUser?.id || null,
      actor_name: currentUser?.fullName || "Staff",
      action: options?.unpaidExceptionReason
        ? "UNPAID_COMPLETION_EXCEPTION"
        : "ORDER_STATUS_UPDATED",
      entity_type: "order",
      entity_id: order.tagNumber,
      details: {
        status,
        note: options?.note,
        unpaid_exception_reason: options?.unpaidExceptionReason,
      },
    });

    // Section 3: Loyalty & Referral progression when an order is marked Completed
    if (status === "completed" && order.customerId) {
      const customer = users.find((u) => u.id === order.customerId);
      if (customer) {
        // 1. Loyalty streak update:
        // If this order used a loyalty discount, reset streak to 0. Otherwise increment streak.
        const nextStreak =
          order.discountType === "loyalty" ? 0 : customer.completedWashesStreak + 1;

        await supabase
          .from("toon_profiles")
          .update({ completed_washes_streak: nextStreak })
          .eq("id", customer.id);

        if (nextStreak === settings.loyaltyWashesRequired) {
          await createAndDispatchNotification({
            recipientIds: [customer.id],
            orderId: order.id,
            tagNumber: order.tagNumber,
            title: `Loyalty Discount Unlocked (${settings.discountPercent}% Off)!`,
            body: `You've completed ${settings.loyaltyWashesRequired} consecutive washes! Your next order automatically gets ${settings.discountPercent}% off.`,
            eventKey: `${customer.id}:loyalty_unlocked:${order.id}`,
          });
        }

        // 2. Referral reward check:
        // When a referred customer's FIRST order is completed, credit the referrer with a 10% discount
        if (customer.referredById && !customer.referralRewardCredited) {
          const referrer = users.find((u) => u.id === customer.referredById);
          await supabase
            .from("toon_profiles")
            .update({ referral_reward_credited: true })
            .eq("id", customer.id);

          if (referrer) {
            await supabase
              .from("toon_profiles")
              .update({
                available_referral_discounts: referrer.availableReferralDiscounts + 1,
              })
              .eq("id", referrer.id);

            await createAndDispatchNotification({
              recipientIds: [referrer.id],
              title: `Referral Discount Earned (${settings.discountPercent}% Off)!`,
              body: `${customer.fullName} completed their first Tinoclean order! You've earned ${settings.discountPercent}% off one of your next orders.`,
              eventKey: `referral_earned:${customer.id}`,
            });
          }
        }
      }
    }

    if (order.customerId) {
      const meta = ORDER_STATUS_META[status];
      await createAndDispatchNotification({
        recipientIds: [order.customerId],
        orderId: order.id,
        tagNumber: order.tagNumber,
        title: meta.label,
        body: meta.customerMessage(order.tagNumber),
        eventKey: `${order.id}:status:${status}`,
      });
    }

    await refreshData();
    return { ok: true };
  };

  const assignStaff = async (orderId: string, staffId: string) => {
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    await supabase
      .from("toon_orders")
      .update({
        assigned_staff_id: staffId || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);
    await refreshData();
  };

  const recordPayment = async (input: {
    orderId: string;
    amount: number;
    method: PaymentMethod;
    momoReference?: string;
    notes?: string;
  }) => {
    const supabase = getBrowserSupabase();
    if (!supabase) return { ok: false, error: "Supabase is not configured." };
    if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "staff")) {
      return { ok: false, error: "Only authorised Tinoclean staff can record payments." };
    }

    const order = orders.find((o) => o.id === input.orderId);
    if (!order) return { ok: false, error: "Order not found." };
    if (!input.amount || input.amount <= 0) {
      return { ok: false, error: "Enter a valid payment amount." };
    }
    if (input.amount > order.balanceDue + 0.01) {
      return {
        ok: false,
        error: `Amount exceeds balance due (GH₵${order.balanceDue.toFixed(2)}).`,
      };
    }

    const cleanRef = input.momoReference?.trim();
    if (input.method === "mobile_money") {
      if (!cleanRef) {
        return { ok: false, error: "Mobile Money transaction reference is required." };
      }
      const duplicate = payments.some(
        (p) => p.momoReference && p.momoReference.toLowerCase() === cleanRef.toLowerCase()
      );
      if (duplicate) {
        return {
          ok: false,
          error: `Mobile Money reference "${cleanRef}" has already been used.`,
        };
      }
    }

    const { data: insertedPay, error: payErr } = await supabase
      .from("toon_payments")
      .insert({
        order_id: order.id,
        amount: Number(input.amount.toFixed(2)),
        method: input.method,
        momo_reference: cleanRef || null,
        recorded_by: currentUser.id,
        notes: input.notes?.trim() || null,
      })
      .select("*")
      .single();

    if (payErr) return { ok: false, error: payErr.message };

    const nextPaid = Number((order.amountPaid + Number(input.amount)).toFixed(2));
    const nextBalance = Math.max(0, Number((order.totalAmount - nextPaid).toFixed(2)));
    const nextStatus = nextBalance === 0 ? "paid" : "partially_paid";

    await supabase
      .from("toon_orders")
      .update({
        amount_paid: nextPaid,
        payment_status: nextStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    await supabase.from("toon_audit_logs").insert({
      actor_id: currentUser.id,
      actor_name: currentUser.fullName,
      action: "PAYMENT_RECORDED",
      entity_type: "payment",
      entity_id: order.tagNumber,
      details: {
        amount: input.amount,
        method: input.method,
        momo_reference: cleanRef,
        balance_due: nextBalance,
      },
    });

    if (order.customerId) {
      await createAndDispatchNotification({
        recipientIds: [order.customerId],
        orderId: order.id,
        tagNumber: order.tagNumber,
        title: nextBalance === 0 ? "Payment Received — Receipt Ready" : "Partial Payment Recorded",
        body: `GH₵${Number(input.amount).toFixed(2)} received via ${
          input.method === "cash" ? "Cash" : `MTN MoMo (${cleanRef})`
        } for ${order.tagNumber}. Balance due: GH₵${nextBalance.toFixed(2)}.`,
        eventKey: `${order.id}:payment:${insertedPay.id}`,
      });
    }

    await refreshData();
    return { ok: true };
  };

  const revokeOrReinstateStudent = async (
    customerId: string,
    action: "revoke" | "reinstate",
    reason: string
  ) => {
    const supabase = getBrowserSupabase();
    if (!supabase) return { ok: false, error: "Supabase is not configured." };
    if (!reason.trim()) return { ok: false, error: "Please provide a reason for the audit trail." };

    const target = users.find((u) => u.id === customerId);
    if (!target) return { ok: false, error: "Customer not found." };

    const now = new Date();
    const oneYear = new Date(now);
    oneYear.setFullYear(oneYear.getFullYear() + 1);

    const { error } = await supabase
      .from("toon_profiles")
      .update({
        student_status: action === "revoke" ? "revoked" : "verified",
        student_revoked_reason: action === "revoke" ? reason.trim() : null,
        student_expires_at:
          action === "reinstate"
            ? target.studentExpiresAt || oneYear.toISOString()
            : target.studentExpiresAt,
        updated_at: now.toISOString(),
      })
      .eq("id", customerId);

    if (error) return { ok: false, error: error.message };

    await supabase.from("toon_audit_logs").insert({
      actor_id: currentUser?.id || null,
      actor_name: currentUser?.fullName || "Admin",
      action: action === "revoke" ? "STUDENT_STATUS_REVOKED" : "STUDENT_STATUS_REINSTATED",
      entity_type: "student_verification",
      entity_id: customerId,
      details: {
        customer_name: target.fullName,
        upsa_email: target.upsaEmail,
        reason: reason.trim(),
      },
    });

    await createAndDispatchNotification({
      recipientIds: [customerId],
      title:
        action === "revoke"
          ? "Student Discount Status Updated"
          : "Student Discount Reinstated",
      body:
        action === "revoke"
          ? `Your UPSA student discount status was revoked. Reason: ${reason.trim()}`
          : "Your UPSA student discount status has been reinstated!",
      eventKey: `student:${action}:${Date.now()}`,
    });

    await refreshData();
    return { ok: true };
  };

  const adjustCustomerDiscount = async (
    customerId: string,
    delta: number,
    reason: string
  ) => {
    const supabase = getBrowserSupabase();
    if (!supabase) return { ok: false, error: "Supabase is not configured." };
    if (!reason.trim()) return { ok: false, error: "A reason is required for the audit trail." };

    const target = users.find((u) => u.id === customerId);
    if (!target) return { ok: false, error: "Customer not found." };

    const nextCount = Math.max(0, target.manualDiscountsAvailable + delta);
    const { error } = await supabase
      .from("toon_profiles")
      .update({
        manual_discounts_available: nextCount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", customerId);

    if (error) return { ok: false, error: error.message };

    await supabase.from("toon_audit_logs").insert({
      actor_id: currentUser?.id || null,
      actor_name: currentUser?.fullName || "Admin",
      action: delta > 0 ? "DISCOUNT_GRANTED" : "DISCOUNT_REMOVED",
      entity_type: "discount",
      entity_id: customerId,
      details: {
        customer_name: target.fullName,
        delta,
        new_count: nextCount,
        reason: reason.trim(),
      },
    });

    if (delta > 0) {
      await createAndDispatchNotification({
        recipientIds: [customerId],
        title: `${settings.discountPercent}% Tinoclean Discount Added!`,
        body: `You have been awarded a ${settings.discountPercent}% discount for your next order (${reason.trim()}).`,
        eventKey: `manual_discount:${Date.now()}`,
      });
    }

    await refreshData();
    return { ok: true };
  };

  const updateTariffBracket = async (id: string, patch: Partial<TariffBracket>) => {
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    const dbPatch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (patch.studentPrice !== undefined) dbPatch.student_price = patch.studentPrice;
    if (patch.regularPrice !== undefined) dbPatch.regular_price = patch.regularPrice;
    if (patch.isActive !== undefined) dbPatch.is_active = patch.isActive;

    await supabase.from("toon_tariff_brackets").update(dbPatch).eq("id", id);
    await supabase.from("toon_audit_logs").insert({
      actor_id: currentUser?.id || null,
      actor_name: currentUser?.fullName || "Admin",
      action: "TARIFF_UPDATED",
      entity_type: "tariff",
      entity_id: id,
      details: patch,
    });
    await refreshData();
  };

  const addTariffBracket = async (
    weightKg: number,
    studentPrice: number,
    regularPrice: number
  ) => {
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    await supabase.from("toon_tariff_brackets").upsert(
      {
        weight_kg: Number(weightKg.toFixed(1)),
        student_price: Number(studentPrice.toFixed(2)),
        regular_price: Number(regularPrice.toFixed(2)),
        is_active: true,
      },
      { onConflict: "weight_kg" }
    );
    await refreshData();
  };

  const upsertService = async (
    service: Omit<LaundryService, "id"> & { id?: string }
  ) => {
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    const row = {
      slug: service.slug,
      name: service.name,
      description: service.description,
      icon_name: service.iconName,
      pricing_type: service.pricingType,
      per_kg_rate: service.perKgRate,
      same_day: Boolean(service.sameDay),
      is_active: service.isActive,
      sort_order: service.sortOrder,
      updated_at: new Date().toISOString(),
    };
    if (service.id) {
      await supabase.from("toon_services").update(row).eq("id", service.id);
    } else {
      await supabase.from("toon_services").insert(row);
    }
    await supabase.from("toon_audit_logs").insert({
      actor_id: currentUser?.id || null,
      actor_name: currentUser?.fullName || "Admin",
      action: "SERVICE_UPDATED",
      entity_type: "service",
      entity_id: service.slug,
      details: row,
    });
    await refreshData();
  };

  const createStaffAccount = async (input: {
    fullName: string;
    email: string;
    phone: string;
    password: string;
  }) => {
    const res = await fetch("/api/admin/staff/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...input,
        actorId: currentUser?.id,
        actorName: currentUser?.fullName,
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      return { ok: false, error: data.error || "Could not create staff account." };
    }
    await refreshData();
    return { ok: true };
  };

  const updateBusinessSettings = async (patch: Partial<BusinessSettings>) => {
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    const dbPatch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (patch.businessName !== undefined) dbPatch.business_name = patch.businessName;
    if (patch.location !== undefined) dbPatch.location = patch.location;
    if (patch.phone !== undefined) dbPatch.phone = patch.phone;
    if (patch.whatsappNumber !== undefined) dbPatch.whatsapp_number = patch.whatsappNumber;
    if (patch.momoNumber !== undefined) dbPatch.momo_number = patch.momoNumber;
    if (patch.momoNetwork !== undefined) dbPatch.momo_network = patch.momoNetwork;
    if (patch.momoAccountName !== undefined) dbPatch.momo_account_name = patch.momoAccountName;
    if (patch.operatingHours !== undefined) dbPatch.operating_hours = patch.operatingHours;
    if (patch.coverageAreas !== undefined) dbPatch.coverage_areas = patch.coverageAreas;
    if (patch.defaultTurnaroundHours !== undefined)
      dbPatch.default_turnaround_hours = patch.defaultTurnaroundHours;
    if (patch.loyaltyWashesRequired !== undefined)
      dbPatch.loyalty_washes_required = patch.loyaltyWashesRequired;
    if (patch.discountPercent !== undefined) dbPatch.discount_percent = patch.discountPercent;
    if (patch.referralExpiryDays !== undefined)
      dbPatch.referral_expiry_days = patch.referralExpiryDays;
    if (patch.dailySummaryEmail !== undefined)
      dbPatch.daily_summary_email = patch.dailySummaryEmail;
    if (patch.dailySummaryHour !== undefined) dbPatch.daily_summary_hour = patch.dailySummaryHour;

    await supabase.from("toon_business_settings").update(dbPatch).eq("id", 1);
    await refreshData();
  };

  const markNotificationRead = async (id: string) => {
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    await supabase
      .from("toon_notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("id", id);
    await refreshData();
  };

  const markAllNotificationsRead = async () => {
    const supabase = getBrowserSupabase();
    if (!supabase || !currentUser) return;
    await supabase
      .from("toon_notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("user_id", currentUser.id)
      .eq("is_read", false);
    await refreshData();
  };

  return (
    <AppContext.Provider
      value={{
        hydrated,
        setupError,
        currentUser,
        users,
        orders,
        services,
        tariffs,
        payments,
        notifications,
        userNotifications,
        unreadCount,
        auditLogs,
        settings,
        toast,
        dismissToast: () => setToast(null),
        refreshData,
        signInWithPassword,
        signOut,
        updateProfile,
        placeOrder,
        updateOrderStatus,
        weighAndIssueTicket,
        assignStaff,
        recordPayment,
        revokeOrReinstateStudent,
        adjustCustomerDiscount,
        updateTariffBracket,
        addTariffBracket,
        upsertService,
        createStaffAccount,
        updateBusinessSettings,
        markNotificationRead,
        markAllNotificationsRead,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
