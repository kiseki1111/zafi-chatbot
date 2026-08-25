"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { useAppStore } from "@/lib/app-store";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

// ponytail: Lazy load semua halaman biar Next.js nggak compile semuanya di awal.
const Loading = () => <div className="p-8 space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-[400px] w-full" /></div>;

const OverviewPage = dynamic(() => import("@/components/modules/overview/overview-page").then(mod => mod.OverviewPage), { loading: Loading });
const ChatbotPage = dynamic(() => import("@/components/modules/chatbot/chatbot-page").then(mod => mod.ChatbotPage), { loading: Loading });
const KnowledgePage = dynamic(() => import("@/components/modules/knowledge/knowledge-page").then(mod => mod.KnowledgePage), { loading: Loading });
const SettingsPage = dynamic(() => import("@/components/modules/settings/settings-page").then(mod => mod.SettingsPage), { loading: Loading });
const OnboardingPage = dynamic(() => import("@/components/modules/onboarding/onboarding-page").then(mod => mod.OnboardingPage), { loading: Loading });


import { canAccess, defaultViewForRole } from "@/lib/rbac";
import type { ViewKey } from "@/lib/types";

export function DashboardShell() {
  const { user } = useAuthStore();
  const { view, setView, resetForRole } = useAppStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const viewParam = searchParams.get("view");

  // 1. Sync URL -> State (On Load or Back Button)
  useEffect(() => {
    if (!user) return;
    
    // Force onboarding if no tenant
    if (!user.tenantId) {
      if (view !== "onboarding") setView("onboarding");
      router.replace(`?view=onboarding`);
      return;
    }

    if (viewParam) {
      if (!canAccess(user.role, viewParam as ViewKey)) {
        const defaultView = defaultViewForRole(user.role);
        router.replace(`?view=${defaultView}`);
        setView(defaultView);
      } else if (viewParam !== view) {
        setView(viewParam as ViewKey);
      }
    } else {
      router.replace(`?view=${view}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewParam, user]);

  // 2. Sync State -> URL (On Menu Click)
  useEffect(() => {
    if (view && view !== viewParam) {
      router.push(`?view=${view}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  // 3. Reset internal state upon new login
  useEffect(() => {
    if (user) resetForRole(user.role);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  if (!user) return null;

  const render = () => {
    switch (view as ViewKey) {
      case "overview": return <OverviewPage />;
      case "chatbot": return <ChatbotPage />;
      case "knowledge": return <KnowledgePage />;
      case "settings": return <SettingsPage />;
      case "onboarding": return <OnboardingPage />;

      default: return <OverviewPage />;
    }
  };

  return (
    <div className="h-screen flex bg-muted/30 overflow-hidden">
      {/* Desktop sidebar - Hide if in onboarding */}
      {user.tenantId && (
        <aside className="hidden lg:block w-64 shrink-0 border-r bg-sidebar flex-col">
          <Sidebar />
        </aside>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {user.tenantId && <Topbar />}
        <main className="flex-1 p-4 lg:p-6 overflow-y-auto overflow-x-hidden">
          {render()}
        </main>
      </div>
    </div>
  );
}
