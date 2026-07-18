"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/lib/auth-store";
import { useAppStore } from "@/lib/app-store";
import { LoginForm } from "@/components/auth/login-form";
import { RegisterForm } from "@/components/auth/register-form";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default function Home() {
  const { isAuthenticated, authView } = useAuthStore();
  const { theme } = useAppStore();

  // Apply theme class
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
  }, [theme]);

  if (!isAuthenticated) {
    if (authView === "register") return <RegisterForm />;
    if (authView === "forgot") return <ForgotPasswordForm />;
    return <LoginForm />;
  }

  return <DashboardShell />;
}
