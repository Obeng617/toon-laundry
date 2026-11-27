# Tinoclean Laundry Management System (v1.2 — Live Production Build)

Responsive installable web app (PWA) for **Tinoclean Laundry (UPSA)** built with **Next.js (App Router, TypeScript)**, **Tailwind CSS**, **Supabase (PostgreSQL, Auth, RLS, Realtime)**, **Web Push (VAPID + Badging API)**, and **Google SMTP**.

## 1. Confirmed Business Rules Implemented

- **Live Production Build Only**: Every screen reads and writes real data in Supabase. No demo mode, fake logins, or sample data fallback. If environment variables are missing, the app displays a clear setup error screen.
- **Four Weight-Based Services (Admin-Editable)**:
  1. **Wash, Dry & Fold (regular)** — Priced via the editable half-kilogram Student & Regular tariff table (`1.0 kg` to `10.0 kg`, pre-configured at GH₵7/kg student and GH₵8/kg regular; weights below `1.0 kg` use `1.0 kg`, and weights between points round up to the next `0.5 kg` bracket).
  2. **Light Duvet** — `GH₵10 per kg` (rounded up to the next `0.5 kg`, minimum `1.0 kg`, same for student and regular).
  3. **Heavy Duvet** — `GH₵15 per kg` (rounded up to the next `0.5 kg`, minimum `1.0 kg`, same for student and regular).
  4. **Express (Same-Day Wash, Dry & Fold)** — `GH₵10 per kg` (rounded up to the next `0.5 kg`, minimum `1.0 kg`, same for student and regular).
  - Multi-service orders are supported: each service appears as its own line item on the order and digital ticket with its own weight and amount.
  - **No pickup or delivery fees** (`GH₵0`). Coverage: **Everywhere**.
- **UPSA Student Verification via Email OTP (Section 8.6)**:
  - Verified exclusively by a 6-digit OTP sent to an official `@upsamail.edu.gh` email (`idnumber@upsamail.edu.gh`). Look-alike domains are rejected.
  - The part before `@` is saved as the customer's `student_id_number`. No ID card or photo upload is used.
  - Expires after **12 months** (`student_verified_at` and `student_expires_at`). Admin can search, revoke, or reinstate any student account with an audited reason.
- **Loyalty & Referral 10% Discounts (Section 3)**:
  - **Loyalty Discount**: After **3 consecutive completed washes**, the customer's **4th order automatically gets 10% off** the total payable. After completion of that discounted wash, the streak resets to `0`.
  - **Referral Discount**: Every customer gets a unique referral code & link in **My Profile**. When a referred friend completes their **first order**, the referrer earns a **10% discount** for one of their next orders.
  - At most **one 10% discount** applies per order (no stacking), shown as its own negative line item on the order and digital ticket (`Loyalty discount 10%  -GH₵...`).
- **Pay on Delivery / Collection & MTN MoMo → GhanaPay Help Card (Section 9.1)**:
  - No online payment gateway. Customers pay by **Cash** or manual **MTN Mobile Money** sent to Tinoclean's **GhanaPay wallet `0551750854` (recipient name `MARTIN`)**.
  - Includes the **"Pay with MTN MoMo" Help Card** on orders, tickets, and the contact page with **Option 1 (`*170#`)** and **Option 2 (MTN MoMo App)** steps, copy-number button, and PIN safety warning.
  - Only Tinoclean staff record payments (riders are out of scope).
- **Numbered Digital Ticket & Receipt (Section 9.2)**:
  - Sequential, never-reused `TAG #0001` format, repeated in large type at the bottom for laundry bag labelling.
  - Downloadable as PNG image, printable/saveable as PDF, and shareable on WhatsApp. Walk-in customers can be served with name and phone number only via a private shareable ticket link (`/ticket/[token]`).
- **Notifications, 4-Layer Unread Badge & Custom Sound (Section 8)**:
  - Web Push notifications (`public/sw.js`), 4-layer unread count badge (App Icon via Badging API, in-app red `#FF4D4D` bell & tab badge, browser tab title `(N) Tinoclean Laundry`, and dynamic canvas favicon badge), and original 2.2-second Tinoclean chime (`/sounds/tinoclean-tone.wav`).

---

## 2. Production Setup Instructions

### Step 1: Configure `.env.local`
Copy `.env.example` to `.env.local` and fill in your production credentials:

```bash
cp .env.example .env.local
```

Generate Web Push VAPID keys:
```bash
npx web-push generate-vapid-keys
```

### Step 2: Run & Build
```bash
pnpm run dev
pnpm run build
pnpm start
```
