"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/app-store";
import { useAuthStore } from "@/lib/auth-store";
import { LoginForm } from "@/components/auth/login-form";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { NoSubscriptionModal } from "@/components/auth/no-subscription-modal";

export default function Home() {
  const { user, isAuthenticated, authView } = useAuthStore();
  const { theme } = useAppStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("theme-transition");
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    // ponytail: lepas class setelah animasi selesai agar transisi lain tidak ikut terkunci
    const timer = window.setTimeout(() => root.classList.remove("theme-transition"), 350);
    return () => window.clearTimeout(timer);
  }, [theme]);

  if (!mounted) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    if (authView === "forgot") return <ForgotPasswordForm />;
    return <LoginForm />;
  }

  const isUnsubscribed = user?.hasSubscription === false;

  return (
    <>
      <div className={isUnsubscribed ? "h-full w-full filter blur-sm pointer-events-none select-none transition-all duration-300" : "h-full w-full"}>
        <DashboardShell />
      </div>
      {isUnsubscribed && <NoSubscriptionModal />}
    </>
  );
}
