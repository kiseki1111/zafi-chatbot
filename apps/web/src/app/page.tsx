"use client";

export const dynamic = "force-dynamic";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { useAppStore } from "@/lib/app-store";
import { useAuthStore } from "@/lib/auth-store";

const LoginForm = dynamic(() => import("@/components/auth/login-form").then(m => ({ default: m.LoginForm })), { ssr: false });
const RegisterForm = dynamic(() => import("@/components/auth/register-form").then(m => ({ default: m.RegisterForm })), { ssr: false });
const ForgotPasswordForm = dynamic(() => import("@/components/auth/forgot-password-form").then(m => ({ default: m.ForgotPasswordForm })), { ssr: false });
const DashboardShell = dynamic(() => import("@/components/dashboard/dashboard-shell").then(m => ({ default: m.DashboardShell })), { ssr: false });

export default function Home() {
  const { isAuthenticated, authView } = useAuthStore();
  const { theme } = useAppStore();

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
