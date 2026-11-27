-- =====================================================================
-- TINOCLEAN LAUNDRY MANAGEMENT SYSTEM — SUPABASE SQL SCHEMA (v1.2)
-- Project Ref: bhblhdidlkwpoytcjtqu
-- Every table is prefixed with "toon_" and every command is numbered
-- with clear START and END markers.
-- =====================================================================

-- === COMMAND 01 START: Enable pgcrypto extension ===
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
-- === COMMAND 01 END ===


-- === COMMAND 02 START: Create enum toon_user_role ===
DO $$ BEGIN
  CREATE TYPE public.toon_user_role AS ENUM ('admin', 'staff', 'customer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
-- === COMMAND 02 END ===


-- === COMMAND 03 START: Create enum toon_student_status ===
DO $$ BEGIN
  CREATE TYPE public.toon_student_status AS ENUM ('none', 'verified', 'expired', 'revoked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
-- === COMMAND 03 END ===


-- === COMMAND 04 START: Create enum toon_customer_category ===
DO $$ BEGIN
  CREATE TYPE public.toon_customer_category AS ENUM ('student', 'regular');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
-- === COMMAND 04 END ===


-- === COMMAND 05 START: Create enum toon_fulfilment_method ===
DO $$ BEGIN
  CREATE TYPE public.toon_fulfilment_method AS ENUM ('drop_off', 'pickup', 'delivery');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
-- === COMMAND 05 END ===


-- === COMMAND 06 START: Create enum toon_order_status ===
DO $$ BEGIN
  CREATE TYPE public.toon_order_status AS ENUM (
    'order_placed',
    'order_confirmed',
    'pickup_scheduled',
    'laundry_received',
    'washing_in_progress',
    'drying_in_progress',
    'ironing_and_folding',
    'ready_for_collection',
    'out_for_delivery',
    'completed',
    'rejected',
    'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
-- === COMMAND 06 END ===


-- === COMMAND 07 START: Create enum toon_payment_status ===
DO $$ BEGIN
  CREATE TYPE public.toon_payment_status AS ENUM ('unpaid', 'partially_paid', 'paid');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
-- === COMMAND 07 END ===


-- === COMMAND 08 START: Create enum toon_payment_method ===
DO $$ BEGIN
  CREATE TYPE public.toon_payment_method AS ENUM ('cash', 'mobile_money');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
-- === COMMAND 08 END ===


-- === COMMAND 09 START: Create sequence toon_order_tag_seq (sequential TAG #0001) ===
CREATE SEQUENCE IF NOT EXISTS public.toon_order_tag_seq START WITH 1 INCREMENT BY 1;
-- === COMMAND 09 END ===


-- === COMMAND 10 START: Create table toon_profiles (users & UPSA student verification) ===
CREATE TABLE IF NOT EXISTS public.toon_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  role public.toon_user_role NOT NULL DEFAULT 'customer',

  -- Section 8.6: UPSA Student Verification (idnumber@upsamail.edu.gh via OTP, 12-month expiry)
  student_status public.toon_student_status NOT NULL DEFAULT 'none',
  upsa_email TEXT UNIQUE,
  student_id_number TEXT,
  student_verified_at TIMESTAMPTZ,
  student_expires_at TIMESTAMPTZ,
  student_revoked_reason TEXT,

  -- Section 3: Loyalty & Referral Discounts
  referral_code TEXT UNIQUE NOT NULL DEFAULT upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 8)),
  referred_by_id UUID REFERENCES public.toon_profiles(id) ON DELETE SET NULL,
  referral_reward_credited BOOLEAN NOT NULL DEFAULT FALSE,
  completed_washes_streak INT NOT NULL DEFAULT 0,
  available_referral_discounts INT NOT NULL DEFAULT 0,
  manual_discounts_available INT NOT NULL DEFAULT 0,

  default_address TEXT,
  saved_addresses JSONB NOT NULL DEFAULT '[]'::jsonb,
  email_notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  push_notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  sound_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  staff_permissions JSONB NOT NULL DEFAULT '{"orders": true, "payments": true, "weighing": true, "reports": false}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT toon_upsa_domain_check CHECK (
    upsa_email IS NULL OR upsa_email ~* '^[^@]+@upsamail\.edu\.gh$'
  )
);
-- === COMMAND 10 END ===


-- === COMMAND 11 START: Create table toon_services (4 weight-based laundry services) ===
CREATE TABLE IF NOT EXISTS public.toon_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon_name TEXT NOT NULL DEFAULT 'shirt',
  pricing_type TEXT NOT NULL CHECK (pricing_type IN ('half_kg_tariff', 'per_kg')),
  per_kg_rate NUMERIC(10, 2) NOT NULL DEFAULT 0,
  same_day BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- === COMMAND 11 END ===


-- === COMMAND 12 START: Create table toon_tariff_brackets (half-kg tariff table 1.0 to 10.0 kg) ===
CREATE TABLE IF NOT EXISTS public.toon_tariff_brackets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  weight_kg NUMERIC(5, 2) UNIQUE NOT NULL,
  student_price NUMERIC(10, 2) NOT NULL,
  regular_price NUMERIC(10, 2) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- === COMMAND 12 END ===


-- === COMMAND 13 START: Create table toon_business_settings ===
CREATE TABLE IF NOT EXISTS public.toon_business_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  business_name TEXT NOT NULL DEFAULT 'Tinoclean Laundry',
  location TEXT NOT NULL DEFAULT 'UPSA',
  phone TEXT NOT NULL DEFAULT '0551750854',
  whatsapp_number TEXT NOT NULL DEFAULT '233551750854',
  momo_number TEXT NOT NULL DEFAULT '0551750854',
  momo_network TEXT NOT NULL DEFAULT 'GhanaPay (via MTN MoMo)',
  momo_account_name TEXT NOT NULL DEFAULT 'MARTIN',
  operating_hours TEXT NOT NULL DEFAULT 'Monday to Saturday, 7:30 am to 7:30 pm. Closed on Sundays.',
  coverage_areas TEXT NOT NULL DEFAULT 'Everywhere (No pickup or delivery coverage restriction)',
  default_turnaround_hours INT NOT NULL DEFAULT 24,
  loyalty_washes_required INT NOT NULL DEFAULT 3,
  discount_percent NUMERIC(5, 2) NOT NULL DEFAULT 10.00,
  referral_expiry_days INT,
  daily_summary_email TEXT,
  daily_summary_hour INT NOT NULL DEFAULT 20,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- === COMMAND 13 END ===


-- === COMMAND 14 START: Create table toon_orders ===
CREATE TABLE IF NOT EXISTS public.toon_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_seq BIGINT UNIQUE NOT NULL DEFAULT nextval('public.toon_order_tag_seq'),
  tag_number TEXT UNIQUE GENERATED ALWAYS AS ('TAG #' || LPAD(tag_seq::text, 4, '0')) STORED,
  public_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  customer_id UUID REFERENCES public.toon_profiles(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  is_walk_in BOOLEAN NOT NULL DEFAULT FALSE,

  -- Fulfilment (no pickup or delivery fees)
  fulfilment_method public.toon_fulfilment_method NOT NULL DEFAULT 'drop_off',
  pickup_address TEXT,
  pickup_scheduled_at TIMESTAMPTZ,
  delivery_address TEXT,
  delivery_scheduled_at TIMESTAMPTZ,
  drop_off_scheduled_at TIMESTAMPTZ,
  special_instructions TEXT,

  -- Weight & Pricing Snapshot
  estimated_weight_kg NUMERIC(6, 2),
  actual_weight_kg NUMERIC(6, 2),
  billable_bracket_kg NUMERIC(6, 2),
  applied_category public.toon_customer_category NOT NULL DEFAULT 'regular',
  applied_tariff_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  subtotal_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,

  -- Loyalty / Referral Discount (one 10% discount max per order)
  discount_type TEXT NOT NULL DEFAULT 'none' CHECK (discount_type IN ('none', 'loyalty', 'referral', 'manual')),
  discount_percent NUMERIC(5, 2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,

  total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  amount_paid NUMERIC(10, 2) NOT NULL DEFAULT 0,
  balance_due NUMERIC(10, 2) GENERATED ALWAYS AS (GREATEST(total_amount - amount_paid, 0)) STORED,
  payment_status public.toon_payment_status NOT NULL DEFAULT 'unpaid',

  -- Workflow & Ticket
  status public.toon_order_status NOT NULL DEFAULT 'order_placed',
  assigned_staff_id UUID REFERENCES public.toon_profiles(id) ON DELETE SET NULL,
  received_at TIMESTAMPTZ,
  ready_by TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  ticket_issued_at TIMESTAMPTZ,
  unpaid_completion_exception_reason TEXT,
  unpaid_completion_approved_by UUID REFERENCES public.toon_profiles(id),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- === COMMAND 14 END ===


-- === COMMAND 15 START: Create table toon_order_items ===
CREATE TABLE IF NOT EXISTS public.toon_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.toon_orders(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.toon_services(id) ON DELETE SET NULL,
  service_name TEXT,
  label TEXT NOT NULL,
  actual_weight_kg NUMERIC(6, 2),
  billable_weight_kg NUMERIC(6, 2),
  quantity NUMERIC(8, 2) NOT NULL DEFAULT 1,
  unit_label TEXT NOT NULL DEFAULT 'kg',
  unit_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  line_total NUMERIC(10, 2) NOT NULL DEFAULT 0,
  item_type TEXT NOT NULL DEFAULT 'service' CHECK (item_type IN ('tariff', 'service', 'discount')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- === COMMAND 15 END ===


-- === COMMAND 16 START: Create table toon_order_status_history ===
CREATE TABLE IF NOT EXISTS public.toon_order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.toon_orders(id) ON DELETE CASCADE,
  status public.toon_order_status NOT NULL,
  note TEXT,
  changed_by UUID REFERENCES public.toon_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- === COMMAND 16 END ===


-- === COMMAND 17 START: Create table toon_payments ===
CREATE TABLE IF NOT EXISTS public.toon_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.toon_orders(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  method public.toon_payment_method NOT NULL,
  momo_reference TEXT UNIQUE,
  idempotency_key TEXT UNIQUE,
  recorded_by UUID NOT NULL REFERENCES public.toon_profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT toon_momo_ref_required CHECK (
    method = 'cash' OR (method = 'mobile_money' AND momo_reference IS NOT NULL AND length(trim(momo_reference)) > 0)
  )
);
-- === COMMAND 17 END ===


-- === COMMAND 18 START: Create table toon_notifications ===
CREATE TABLE IF NOT EXISTS public.toon_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.toon_profiles(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.toon_orders(id) ON DELETE CASCADE,
  tag_number TEXT,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  event_key TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, event_key)
);
-- === COMMAND 18 END ===


-- === COMMAND 19 START: Create table toon_push_subscriptions ===
CREATE TABLE IF NOT EXISTS public.toon_push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.toon_profiles(id) ON DELETE CASCADE,
  endpoint TEXT UNIQUE NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- === COMMAND 19 END ===


-- === COMMAND 20 START: Create table toon_email_queue ===
CREATE TABLE IF NOT EXISTS public.toon_email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_body TEXT NOT NULL,
  dedupe_key TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  attempts INT NOT NULL DEFAULT 0,
  last_error TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- === COMMAND 20 END ===


-- === COMMAND 21 START: Create table toon_otp_codes ===
CREATE TABLE IF NOT EXISTS public.toon_otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('signup', 'password_reset', 'upsa_student')),
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 5,
  used_at TIMESTAMPTZ,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- === COMMAND 21 END ===


-- === COMMAND 22 START: Create table toon_rate_limits ===
CREATE TABLE IF NOT EXISTS public.toon_rate_limits (
  key TEXT PRIMARY KEY,
  count INT NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- === COMMAND 22 END ===


-- === COMMAND 23 START: Create table toon_audit_logs ===
CREATE TABLE IF NOT EXISTS public.toon_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES public.toon_profiles(id) ON DELETE SET NULL,
  actor_name TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- === COMMAND 23 END ===


-- === COMMAND 24 START: Create performance indexes on toon_ tables ===
CREATE INDEX IF NOT EXISTS idx_toon_orders_customer_id ON public.toon_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_toon_orders_status ON public.toon_orders(status);
CREATE INDEX IF NOT EXISTS idx_toon_orders_tag_number ON public.toon_orders(tag_number);
CREATE INDEX IF NOT EXISTS idx_toon_notifications_user_unread ON public.toon_notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_toon_otp_codes_email_purpose ON public.toon_otp_codes(email, purpose, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_toon_profiles_upsa_email ON public.toon_profiles(upsa_email);
CREATE INDEX IF NOT EXISTS idx_toon_profiles_referral_code ON public.toon_profiles(referral_code);
-- === COMMAND 24 END ===


-- === COMMAND 25 START: Enable Row Level Security (RLS) on all toon_ tables ===
ALTER TABLE public.toon_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.toon_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.toon_tariff_brackets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.toon_business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.toon_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.toon_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.toon_order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.toon_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.toon_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.toon_push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.toon_audit_logs ENABLE ROW LEVEL SECURITY;
-- === COMMAND 25 END ===


-- === COMMAND 26 START: Create helper function toon_is_admin_or_staff() ===
CREATE OR REPLACE FUNCTION public.toon_is_admin_or_staff()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.toon_profiles
    WHERE id = auth.uid() AND role IN ('admin', 'staff')
  );
$$;
-- === COMMAND 26 END ===


-- === COMMAND 27 START: Create helper function toon_is_admin() ===
CREATE OR REPLACE FUNCTION public.toon_is_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.toon_profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;
-- === COMMAND 27 END ===


-- === COMMAND 28 START: Create RLS policies for toon_profiles ===
CREATE POLICY "toon_users_read_own_profile" ON public.toon_profiles
  FOR SELECT USING (id = auth.uid() OR public.toon_is_admin_or_staff());
CREATE POLICY "toon_users_update_own_profile" ON public.toon_profiles
  FOR UPDATE USING (id = auth.uid() OR public.toon_is_admin());
-- === COMMAND 28 END ===


-- === COMMAND 29 START: Create RLS policies for toon_services, toon_tariff_brackets, toon_business_settings ===
CREATE POLICY "toon_public_read_services" ON public.toon_services FOR SELECT USING (TRUE);
CREATE POLICY "toon_admin_manage_services" ON public.toon_services FOR ALL USING (public.toon_is_admin());

CREATE POLICY "toon_public_read_tariffs" ON public.toon_tariff_brackets FOR SELECT USING (TRUE);
CREATE POLICY "toon_admin_manage_tariffs" ON public.toon_tariff_brackets FOR ALL USING (public.toon_is_admin());

CREATE POLICY "toon_public_read_settings" ON public.toon_business_settings FOR SELECT USING (TRUE);
CREATE POLICY "toon_admin_manage_settings" ON public.toon_business_settings FOR ALL USING (public.toon_is_admin());
-- === COMMAND 29 END ===


-- === COMMAND 30 START: Create RLS policies for toon_orders, toon_order_items, toon_order_status_history ===
CREATE POLICY "toon_customers_read_own_orders" ON public.toon_orders
  FOR SELECT USING (customer_id = auth.uid() OR public.toon_is_admin_or_staff());
CREATE POLICY "toon_customers_create_own_orders" ON public.toon_orders
  FOR INSERT WITH CHECK (customer_id = auth.uid() OR public.toon_is_admin_or_staff());
CREATE POLICY "toon_staff_update_orders" ON public.toon_orders
  FOR UPDATE USING (public.toon_is_admin_or_staff());

CREATE POLICY "toon_read_own_order_items" ON public.toon_order_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.toon_orders o WHERE o.id = order_id AND (o.customer_id = auth.uid() OR public.toon_is_admin_or_staff()))
  );
CREATE POLICY "toon_staff_manage_order_items" ON public.toon_order_items
  FOR ALL USING (public.toon_is_admin_or_staff());

CREATE POLICY "toon_read_own_order_history" ON public.toon_order_status_history
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.toon_orders o WHERE o.id = order_id AND (o.customer_id = auth.uid() OR public.toon_is_admin_or_staff()))
  );
CREATE POLICY "toon_staff_insert_order_history" ON public.toon_order_status_history
  FOR INSERT WITH CHECK (public.toon_is_admin_or_staff());
-- === COMMAND 30 END ===


-- === COMMAND 31 START: Create RLS policies for toon_payments, toon_notifications, toon_push_subscriptions, toon_audit_logs ===
CREATE POLICY "toon_read_own_payments" ON public.toon_payments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.toon_orders o WHERE o.id = order_id AND (o.customer_id = auth.uid() OR public.toon_is_admin_or_staff()))
  );
CREATE POLICY "toon_staff_record_payments" ON public.toon_payments
  FOR INSERT WITH CHECK (public.toon_is_admin_or_staff());

CREATE POLICY "toon_users_manage_own_notifications" ON public.toon_notifications
  FOR ALL USING (user_id = auth.uid() OR public.toon_is_admin_or_staff());

CREATE POLICY "toon_users_manage_own_push_subscriptions" ON public.toon_push_subscriptions
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "toon_admin_manage_audit_logs" ON public.toon_audit_logs
  FOR ALL USING (public.toon_is_admin_or_staff());
-- === COMMAND 31 END ===


-- === COMMAND 32 START: Insert initial row in toon_business_settings ===
INSERT INTO public.toon_business_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
-- === COMMAND 32 END ===


-- === COMMAND 33 START: Seed toon_tariff_brackets (1.0 kg to 10.0 kg in 0.5 kg steps) ===
INSERT INTO public.toon_tariff_brackets (weight_kg, student_price, regular_price) VALUES
  (1.0, 7.00, 8.00),
  (1.5, 10.00, 12.00),
  (2.0, 14.00, 16.00),
  (2.5, 17.00, 20.00),
  (3.0, 21.00, 24.00),
  (3.5, 24.00, 28.00),
  (4.0, 28.00, 32.00),
  (4.5, 31.00, 36.00),
  (5.0, 35.00, 40.00),
  (5.5, 38.00, 44.00),
  (6.0, 42.00, 48.00),
  (6.5, 45.00, 52.00),
  (7.0, 49.00, 56.00),
  (7.5, 52.00, 60.00),
  (8.0, 56.00, 64.00),
  (8.5, 59.00, 68.00),
  (9.0, 63.00, 72.00),
  (9.5, 66.00, 76.00),
  (10.0, 70.00, 80.00)
ON CONFLICT (weight_kg) DO NOTHING;
-- === COMMAND 33 END ===


-- === COMMAND 34 START: Seed toon_services (4 weight-based laundry services) ===
INSERT INTO public.toon_services (slug, name, description, icon_name, pricing_type, per_kg_rate, same_day, sort_order) VALUES
  ('wash-dry-fold', 'Wash, Dry & Fold', 'Regular laundry washed, dried and neatly folded using our half-kilogram tariff table (Student GH₵7/kg, Regular GH₵8/kg).', 'shirt', 'half_kg_tariff', 0, FALSE, 1),
  ('light-duvet', 'Light Duvet', 'Deep hygienic wash and dry for light duvets, bedsheets and comforters (GH₵10 per kg, rounded up to 0.5 kg, min 1.0 kg).', 'bed', 'per_kg', 10.00, FALSE, 2),
  ('heavy-duvet', 'Heavy Duvet', 'Heavy-duty deep wash and thorough drying for thick duvets and blankets (GH₵15 per kg, rounded up to 0.5 kg, min 1.0 kg).', 'sparkles', 'per_kg', 15.00, FALSE, 3),
  ('express', 'Express (Same Day)', 'Priority wash, dry and fold returned the very same day (GH₵10 per kg, rounded up to 0.5 kg, min 1.0 kg).', 'zap', 'per_kg', 10.00, TRUE, 4)
ON CONFLICT (slug) DO NOTHING;
-- === COMMAND 34 END ===


-- === COMMAND 35 START: Grant table, sequence & function permissions to Supabase API roles ===
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
-- === COMMAND 35 END ===

