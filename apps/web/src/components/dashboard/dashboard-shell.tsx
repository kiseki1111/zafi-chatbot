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
const ClientsPage = dynamic(() => import("@/components/modules/clients/clients-page").then(mod => mod.ClientsPage), { loading: Loading });
const AvailabilityPage = dynamic(() => import("./views/availability-view").then(mod => mod.AvailabilityView), { loading: Loading });
const BusLayoutPage = dynamic(() => import("./views/bus-layout-view").then(mod => mod.BusLayoutView), { loading: Loading });
const ChatbotPage = dynamic(() => import("@/components/modules/chatbot/chatbot-page").then(mod => mod.ChatbotPage), { loading: Loading });
const KnowledgePage = dynamic(() => import("@/components/modules/knowledge/knowledge-page").then(mod => mod.KnowledgePage), { loading: Loading });
const FollowupPage = dynamic(() => import("@/components/modules/followup/followup-page").then(mod => mod.FollowupPage), { loading: Loading });
const SettingsPage = dynamic(() => import("@/components/modules/settings/settings-page").then(mod => mod.SettingsPage), { loading: Loading });
const CrmPage = dynamic(() => import("@/components/modules/crm/crm-page").then(mod => mod.CrmPage), { loading: Loading });


import { canAccess, defaultViewForRole } from "@/lib/rbac";
import type { ViewKey } from "@/lib/types";
import { cn } from "@/lib/utils";

export function DashboardShell() {
  const { user } = useAuthStore();
  const { view, setView, resetForRole, enabledMenus } = useAppStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const viewParam = searchParams.get("view");
  // 1. Sync URL -> State (On Load or Back Button)
  useEffect(() => {
    if (!user) return;

    // Load custom color palette if available (reset ke default dulu jika tidak ada palette per-akun)
    if (user.role === "superadmin" || !user.tenantId) {
      document.documentElement.style.setProperty("--brand-primary", "#059669");
      document.documentElement.style.setProperty("--brand-secondary", "#0d9488");
      document.documentElement.style.setProperty("--brand-accent", "#3b82f6");
    } else {
      fetch(`/api/v1/tenant/${user.tenantId}/dashboard`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (!data) return;
          const tenant = data?.data?.tenant || data?.tenant;
          const palette = tenant?.metadata?.colorPalette;
          const primary = palette?.primary || "#059669";
          const secondary = palette?.secondary || "#0d9488";
          const accent = palette?.accent || "#3b82f6";
          document.documentElement.style.setProperty("--brand-primary", primary);
          document.documentElement.style.setProperty("--brand-secondary", secondary);
          document.documentElement.style.setProperty("--brand-accent", accent);
        })
        .catch(() => {
          document.documentElement.style.setProperty("--brand-primary", "#059669");
          document.documentElement.style.setProperty("--brand-secondary", "#0d9488");
          document.documentElement.style.setProperty("--brand-accent", "#3b82f6");
        });
    }

    if (viewParam) {
      if (!canAccess(user.role, viewParam as ViewKey, enabledMenus, user)) {
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
  }, [viewParam, user, enabledMenus]);

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
      case "clients": return <ClientsPage />;
      case "overview": return <OverviewPage />;
      case "bus_layout": return <BusLayoutPage />;
      case "availability": return <AvailabilityPage />;
      case "chatbot": return <ChatbotPage />;
      case "knowledge": return <KnowledgePage />;
      case "followup": return <FollowupPage />;
      case "settings": return <SettingsPage />;
      case "crm": return <CrmPage />;

      default: return <OverviewPage />;
    }
  };

  return (
    <div className="h-screen flex bg-muted/30 overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden lg:block w-64 shrink-0 border-r bg-sidebar flex-col">
        <Sidebar />
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {user.tenantId && <Topbar />}
        <main className={cn(
          "flex-1 overflow-x-hidden",
          view === "chatbot" ? "p-1 lg:p-1.5 overflow-hidden flex flex-col" : "p-4 lg:p-6 overflow-y-auto"
        )}>
          {render()}
        </main>
      </div>
    </div>
  );
}
