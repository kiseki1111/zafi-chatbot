"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/app-store";
import { useAuthStore } from "@/lib/auth-store";
import { LoginForm } from "@/components/auth/login-form";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default function Home() {
  const { isAuthenticated, authView } = useAuthStore();
  const { theme } = useAppStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
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

  return <DashboardShell />;
}
