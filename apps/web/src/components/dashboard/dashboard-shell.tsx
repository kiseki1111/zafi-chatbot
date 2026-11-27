"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/auth-store";
import { useAppStore } from "@/lib/app-store";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { BottomNav } from "./bottom-nav";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { OnboardingWizardDialog } from "@/components/modules/onboarding/onboarding-wizard-dialog";

// ponytail: Direct import halaman asisten inti agar navigasi instan 0ms tanpa kompilasi chunk/skeleton delay
import { AssistantChatPage } from "@/components/modules/assistant/assistant-chat-page";
import { WaWhitelistPage } from "@/components/modules/whitelist/wa-whitelist-page";
import { IntegrationsPage } from "@/components/modules/integrations/integrations-page";
import { EmployeesPage } from "@/components/modules/employees/employees-page";
import { AssistantAuditLogsPage } from "@/components/modules/audit/audit-logs-page";

// Lazy load modul sekunder / superadmin yang jarang dibuka
const Loading = () => <div className="p-8 space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-[400px] w-full" /></div>;

const OverviewPage = dynamic(() => import("@/components/modules/overview/overview-page").then(mod => mod.OverviewPage), { loading: Loading });
const ClientsPage = dynamic(() => import("@/components/modules/clients/clients-page").then(mod => mod.ClientsPage), { loading: Loading });
const AvailabilityPage = dynamic(() => import("./views/availability-view").then(mod => mod.AvailabilityView), { loading: Loading });
const BusLayoutPage = dynamic(() => import("./views/bus-layout-view").then(mod => mod.BusLayoutView), { loading: Loading });
const ChatbotPage = dynamic(() => import("@/components/modules/chatbot/chatbot-page").then(mod => mod.ChatbotPage), { loading: Loading });
const ProductsPage = dynamic(() => import("@/components/modules/products/products-page").then(mod => mod.ProductsPage), { loading: Loading });
const KnowledgePage = dynamic(() => import("@/components/modules/knowledge/knowledge-page").then(mod => mod.KnowledgePage), { loading: Loading });
const FollowupPage = dynamic(() => import("@/components/modules/followup/followup-page").then(mod => mod.FollowupPage), { loading: Loading });
const SettingsPage = dynamic(() => import("@/components/modules/settings/settings-page").then(mod => mod.SettingsPage), { loading: Loading });
const CrmPage = dynamic(() => import("@/components/modules/crm/crm-page").then(mod => mod.CrmPage), { loading: Loading });

// Superadmin Pages
const PlatformOverviewPage = dynamic(() => import("@/components/modules/superadmin/platform-overview-page").then(mod => mod.PlatformOverviewPage), { loading: Loading });
const WahaMonitorPage = dynamic(() => import("@/components/modules/superadmin/waha-monitor-page").then(mod => mod.WahaMonitorPage), { loading: Loading });
const QuotaMonitorPage = dynamic(() => import("@/components/modules/superadmin/quota-monitor-page").then(mod => mod.QuotaMonitorPage), { loading: Loading });
const PricingPlansPage = dynamic(() => import("@/components/modules/superadmin/pricing-plans-page").then(mod => mod.PricingPlansPage), { loading: Loading });
const AiConfigPage = dynamic(() => import("@/components/modules/superadmin/ai-config-page").then(mod => mod.AiConfigPage), { loading: Loading });
const SystemLogsPage = dynamic(() => import("@/components/modules/superadmin/system-logs-page").then(mod => mod.SystemLogsPage), { loading: Loading });


import { canAccess, defaultViewForRole } from "@/lib/rbac";
import type { Role, ViewKey } from "@/lib/types";
import { cn } from "@/lib/utils";

export function DashboardShell() {
  const { user } = useAuthStore();
  const { view, setView, resetForRole, enabledMenus } = useAppStore();

  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [onboardingInitialData, setOnboardingInitialData] = useState<any>({});

  // 1. One-time Setup: Theme Palette & Initial Status Check (Hanya dijalankan 1x saat user/tenant berubah)
  useEffect(() => {
    if (!user) return;

    if (user.role === "superadmin" || !user.tenantId) {
      document.documentElement.style.setProperty("--brand-primary", "#059669");
      document.documentElement.style.setProperty("--brand-secondary", "#0d9488");
      document.documentElement.style.setProperty("--brand-accent", "#3b82f6");
      return;
    }

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

        const isGlobalDisabled = Boolean(
          data?.isGlobalOnboardingDisabled ||
          data?.data?.isGlobalOnboardingDisabled
        );

        if (
          tenant &&
          tenant.isOnboarded === false &&
          !isGlobalDisabled &&
          user.role !== "superadmin"
        ) {
          setOnboardingInitialData({
            storeName: tenant.name || "",
            category: tenant.category || "general",
            phone: tenant.phone || "",
            address: tenant.address || "",
            agentName: tenant.agentName || "Luna",
            agentTone: tenant.agentTone || "Santai & Ramah (Kak, Sis, Bro)",
            instructions: tenant.extraInfo || "",
          });
          setOnboardingOpen(true);
        }
      })
      .catch(() => {
        document.documentElement.style.setProperty("--brand-primary", "#059669");
        document.documentElement.style.setProperty("--brand-secondary", "#0d9488");
        document.documentElement.style.setProperty("--brand-accent", "#3b82f6");
      });
  }, [user?.id, user?.tenantId]);

  // 2. Pure URL Routing Sync (tanpa Next.js router RSC fetch / hard reload)
  useEffect(() => {
    if (!user) return;
    const safeRole = (user.role || "operator").toLowerCase() as Role;
    const params = new URLSearchParams(window.location.search);
    const urlView = params.get("view") as ViewKey | null;

    const targetView =
      urlView && canAccess(safeRole, urlView, enabledMenus, user)
        ? urlView
        : canAccess(safeRole, view, enabledMenus, user)
          ? view
          : defaultViewForRole(safeRole);

    if (targetView !== view) {
      setView(targetView);
    }
    if (urlView !== targetView) {
      params.set("view", targetView);
      window.history.replaceState(window.history.state, "", `?${params.toString()}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.role, enabledMenus]);

  // 3. Sync State -> URL (On Menu Click) & Browser Back/Forward (popstate)
  useEffect(() => {
    if (!user || !view) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("view") !== view) {
      params.set("view", view);
      window.history.pushState(window.history.state, "", `?${params.toString()}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  useEffect(() => {
    if (!user) return;
    const onPopState = () => {
      const safeRole = (user.role || "operator").toLowerCase() as Role;
      const urlView = new URLSearchParams(window.location.search).get("view") as ViewKey | null;
      if (urlView && canAccess(safeRole, urlView, enabledMenus, user)) {
        setView(urlView);
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.role, enabledMenus]);

  // 4. Reset internal state upon new login
  useEffect(() => {
    if (user) resetForRole((user.role || "operator").toLowerCase() as Role);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  if (!user) return null;

  const render = () => {
    switch (view as ViewKey) {
      case "platform_overview": return <PlatformOverviewPage />;
      case "clients": return <ClientsPage />;
      case "waha_monitor": return <WahaMonitorPage />;
      case "quota_monitor": return <QuotaMonitorPage />;
      case "pricing_plans": return <PricingPlansPage />;
      case "ai_config": return <AiConfigPage />;
      case "system_logs": return <SystemLogsPage />;
      case "overview": return <OverviewPage />;
      // Customer Service
      case "chatbot": return <ChatbotPage />;
      case "crm": return <CrmPage />;
      case "availability": return <AvailabilityPage />;
      case "products": return <ProductsPage />;
      case "bus_layout": return <BusLayoutPage />;
      case "followup": return <FollowupPage />;
      // Asisten HR & Accounting
      case "assistant_chat": return <AssistantChatPage />;
      case "wa_whitelist": return <WaWhitelistPage />;
      case "integrations": return <IntegrationsPage />;
      case "employees": return <EmployeesPage />;
      case "audit_logs": return <AssistantAuditLogsPage />;
      // Bersama
      case "knowledge": return <KnowledgePage />;
      case "settings": return <SettingsPage />;

      default: return user.role === "superadmin" ? <PlatformOverviewPage /> : <OverviewPage />;
    }
  };

  return (
    <div className="h-full w-full flex bg-muted/30 overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex w-64 shrink-0 border-r bg-sidebar flex-col h-full">
        <Sidebar />
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <Topbar />
        <main className={cn(
          "flex-1 overflow-x-hidden [scrollbar-gutter:stable]",
          (view === "chatbot" || view === "crm" || view === "assistant_chat") ? "p-0 lg:p-2 pb-16 lg:pb-2 overflow-hidden flex flex-col" : "p-4 lg:p-6 pb-20 lg:pb-6 overflow-y-scroll"
        )}>
          <div key={view} className={cn("animate-in fade-in-50 slide-in-from-bottom-2 duration-200 ease-out", (view === "chatbot" || view === "crm" || view === "assistant_chat") && "flex-1 flex flex-col min-h-0")}>
            {render()}
          </div>
        </main>
        {/* Mobile Bottom Navigation for PWA */}
        <BottomNav />
      </div>

      {/* Onboarding Wizard Dialog */}
      <OnboardingWizardDialog
        open={onboardingOpen}
        onOpenChange={setOnboardingOpen}
        initialData={onboardingInitialData}
      />
    </div>
  );
}
