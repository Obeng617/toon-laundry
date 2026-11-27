"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  ClipboardList,
  CreditCard,
  GraduationCap,
  Home,
  LayoutDashboard,
  LogIn,
  Package,
  PlusCircle,
  Settings,
  ShieldCheck,
  Tag,
  User,
  Users,
  UserCog,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { SetupRequiredBanner } from "./SetupRequiredBanner";
import { TinocleanLogo } from "./TinocleanLogo";

export function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-[#FF4D4D] text-white text-[10px] font-extrabold leading-none shadow-sm">
      {count > 99 ? "99+" : count}
    </span>
  );
}

export function AppShell({
  children,
  mode = "customer",
}: {
  children: React.ReactNode;
  mode?: "customer" | "admin";
}) {
  const pathname = usePathname();
  const { hydrated, setupError, currentUser, unreadCount, users } = useApp();

  if (hydrated && setupError) {
    return <SetupRequiredBanner error={setupError} />;
  }

  const verifiedStudentsCount = users.filter((u) => u.studentStatus === "verified").length;

  const customerDesktopNav = [
    { href: "/", label: "Home" },
    { href: "/services", label: "Services" },
    { href: "/pricing", label: "Pricing" },
    { href: "/book", label: "Place Order" },
    { href: "/orders", label: "My Orders" },
    { href: "/contact", label: "Contact" },
  ];

  const adminSidebarNav = [
    { href: "/tc-ops-m9x4k7p2", label: "Overview", icon: LayoutDashboard },
    { href: "/tc-ops-m9x4k7p2/orders", label: "Orders", icon: ClipboardList },
    { href: "/tc-ops-m9x4k7p2/customers", label: "Customers", icon: Users },
    {
      href: "/tc-ops-m9x4k7p2/student-requests",
      label: "Student Verification",
      icon: GraduationCap,
      badge: verifiedStudentsCount,
    },
    { href: "/tc-ops-m9x4k7p2/pricing", label: "Services & Pricing", icon: Tag },
    { href: "/tc-ops-m9x4k7p2/payments", label: "Payments", icon: CreditCard },
    { href: "/tc-ops-m9x4k7p2/staff", label: "Staff", icon: UserCog },
    { href: "/tc-ops-m9x4k7p2/reports", label: "Reports", icon: BarChart3 },
    { href: "/tc-ops-m9x4k7p2/settings", label: "Settings", icon: Settings },
  ];

  if (mode === "admin") {
    if (hydrated && (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "staff"))) {
      return (
        <div className="min-h-screen bg-[#0B2049] flex items-center justify-center p-4">
          <div className="max-w-md w-full card-tino p-7 text-center space-y-4 bg-white">
            <TinocleanLogo size={42} subtitle="Admin & Staff Portal" />
            <h1 className="text-xl font-extrabold text-[#0B2049]">Admin or Staff Sign-In Required</h1>
            <p className="text-xs text-slate-500">
              This control centre is restricted to authorised Tinoclean Admin and Staff accounts.
            </p>
            <div className="flex flex-col sm:flex-row gap-2.5 justify-center pt-1">
              <Link href="/tc-ops-m9x4k7p2/login" className="btn-tino-primary text-xs px-5 py-3">
                Go to Staff Sign-In
              </Link>
              <Link href="/" className="btn-tino-secondary text-xs px-4 py-3">
                Customer Portal
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex bg-[#F5F9FA]">
        {/* Desktop Admin Sidebar */}
        <aside className="hidden lg:flex lg:flex-col w-64 bg-[#0B2049] text-white shrink-0 no-print">
          <div className="px-5 py-5 border-b border-white/10">
            <Link href="/tc-ops-m9x4k7p2">
              <TinocleanLogo size={36} subtitle="Admin & Staff" light />
            </Link>
          </div>
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {adminSidebarNav.map((item) => {
              const Icon = item.icon;
              const active =
                item.href === "/tc-ops-m9x4k7p2"
                  ? pathname === "/tc-ops-m9x4k7p2"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${
                    active
                      ? "bg-tino-gradient text-white shadow-md"
                      : "text-slate-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Icon className="w-4 h-4 shrink-0" />
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>
          <div className="p-4 border-t border-white/10 space-y-2">
            <Link
              href="/"
              className="flex items-center justify-center gap-2 w-full rounded-xl bg-white/10 hover:bg-white/15 px-3 py-2 text-xs font-semibold text-sky-100 transition"
            >
              View Customer Portal
            </Link>
          </div>
        </aside>

        {/* Admin Main Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-200/80 px-4 sm:px-6 h-16 flex items-center justify-between gap-3 no-print">
            <div className="flex items-center gap-3 lg:hidden">
              <Link href="/tc-ops-m9x4k7p2">
                <TinocleanLogo size={32} subtitle="Admin" />
              </Link>
            </div>
            <div className="hidden lg:flex items-center gap-2 text-xs font-semibold text-slate-500">
              <ShieldCheck className="w-4 h-4 text-[#02A1DB]" />
              <span>
                {currentUser ? (
                  <>
                    Signed in as <strong className="text-[#0B2049]">{currentUser.fullName}</strong> (
                    {currentUser.role})
                  </>
                ) : (
                  "Not signed in"
                )}
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <Link
                href="/notifications"
                className="relative w-10 h-10 rounded-xl bg-[#F5F9FA] hover:bg-sky-50 flex items-center justify-center text-[#0B2049] transition"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1">
                    <UnreadBadge count={unreadCount} />
                  </span>
                )}
              </Link>

              {currentUser ? (
                <Link
                  href="/account"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#edf5fb] text-[#264099] px-3 py-2 text-xs font-bold"
                >
                  <User className="w-3.5 h-3.5" />
                  {currentUser.fullName.split(" ")[0]}
                </Link>
              ) : (
                <Link
                  href="/auth/login"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-tino-gradient text-white px-3.5 py-2 text-xs font-semibold"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  Log in
                </Link>
              )}
            </div>
          </header>

          {/* Mobile quick horizontal admin sub-nav */}
          <div className="lg:hidden flex gap-2 overflow-x-auto px-4 py-2.5 bg-white border-b border-slate-100 no-print">
            {adminSidebarNav.map((item) => {
              const active =
                item.href === "/tc-ops-m9x4k7p2"
                  ? pathname === "/tc-ops-m9x4k7p2"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
                    active
                      ? "bg-tino-gradient text-white"
                      : "bg-[#F5F9FA] text-slate-600"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>

          <main className="flex-1 p-4 sm:p-6 pb-24 lg:pb-8 max-w-7xl w-full mx-auto">
            {children}
          </main>
        </div>

        {/* Mobile Bottom Nav (4 tabs — Section 14) */}
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-slate-200 px-2 py-2 grid grid-cols-4 no-print">
          {[
            { href: "/tc-ops-m9x4k7p2", label: "Home", icon: Home },
            { href: "/tc-ops-m9x4k7p2/orders", label: "Orders", icon: Package },
            { href: "/notifications", label: "Notifications", icon: Bell, badge: unreadCount },
            { href: "/account", label: "Account", icon: User },
          ].map((tab) => {
            const Icon = tab.icon;
            const active =
              tab.href === "/tc-ops-m9x4k7p2" ? pathname === "/tc-ops-m9x4k7p2" : pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex flex-col items-center justify-center gap-0.5 py-1 rounded-xl text-[11px] font-semibold ${
                  active ? "text-[#264099]" : "text-slate-400"
                }`}
              >
                <span className="relative">
                  <Icon className="w-5 h-5" />
                  {tab.badge ? (
                    <span className="absolute -top-1.5 -right-2.5">
                      <UnreadBadge count={tab.badge} />
                    </span>
                  ) : null}
                </span>
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    );
  }

  // CUSTOMER PORTAL SHELL
  return (
    <div className="min-h-screen flex flex-col bg-[#F5F9FA]">
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-200/70 no-print">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link href="/">
            <TinocleanLogo size={34} />
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {customerDesktopNav.map((item) => {
              const active =
                item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition ${
                    active
                      ? "bg-[#edf5fb] text-[#264099]"
                      : "text-slate-600 hover:text-[#0B2049] hover:bg-slate-50"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            {(currentUser?.role === "admin" || currentUser?.role === "staff") && (
              <Link
                href="/tc-ops-m9x4k7p2"
                className="inline-flex items-center gap-1 rounded-xl bg-[#0B2049] text-white px-3 py-2 text-xs font-semibold"
              >
                Admin
              </Link>
            )}

            <Link
              href="/notifications"
              className="relative w-10 h-10 rounded-xl bg-[#F5F9FA] hover:bg-sky-50 flex items-center justify-center text-[#0B2049] transition"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1">
                  <UnreadBadge count={unreadCount} />
                </span>
              )}
            </Link>

            {currentUser ? (
              <Link
                href="/account"
                className="hidden md:inline-flex items-center gap-2 rounded-xl bg-tino-gradient text-white px-3.5 py-2 text-xs font-semibold shadow-sm"
              >
                <User className="w-3.5 h-3.5" />
                {currentUser.fullName.split(" ")[0]}
              </Link>
            ) : (
              <Link
                href="/auth/login"
                className="inline-flex items-center gap-1.5 rounded-xl bg-tino-gradient text-white px-3.5 py-2 text-xs font-semibold shadow-sm"
              >
                <LogIn className="w-3.5 h-3.5" />
                Log in
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-5 pb-24 md:pb-10">
        {children}
      </main>

      {/* Mobile Bottom Navigation (4 Tabs — Section 14) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-slate-200 px-2 py-2 grid grid-cols-4 no-print">
        {[
          { href: "/", label: "Home", icon: Home },
          { href: "/orders", label: "Orders", icon: Package },
          { href: "/notifications", label: "Notifications", icon: Bell, badge: unreadCount },
          { href: "/account", label: "Account", icon: User },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center justify-center gap-0.5 py-1 rounded-xl text-[11px] font-semibold transition ${
                active ? "text-[#264099]" : "text-slate-400"
              }`}
            >
              <span className="relative">
                <Icon className="w-5 h-5" />
                {tab.badge ? (
                  <span className="absolute -top-1.5 -right-2.5">
                    <UnreadBadge count={tab.badge} />
                  </span>
                ) : null}
              </span>
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </nav>

      {pathname === "/" && (
        <Link
          href="/book"
          className="md:hidden fixed right-4 bottom-20 z-30 w-13 h-13 rounded-2xl bg-tino-gradient text-white shadow-lg flex items-center justify-center no-print"
          aria-label="Place an order"
        >
          <PlusCircle className="w-6 h-6" />
        </Link>
      )}
    </div>
  );
}
