"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/lib/auth-store";
import { useAppStore } from "@/lib/app-store";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { OverviewPage } from "@/components/modules/overview/overview-page";
import { ChatbotPage } from "@/components/modules/chatbot/chatbot-page";
import { MarketingPage } from "@/components/modules/marketing/marketing-page";
import { OrdersPage } from "@/components/modules/orders/orders-page";
import { ContactsPage } from "@/components/modules/contacts/contacts-page";
import { PropertiesPage } from "@/components/modules/properties/properties-page";
import { UsersPage } from "@/components/modules/users/users-page";
import { FinancePage } from "@/components/modules/finance/finance-page";
import { SettingsPage } from "@/components/modules/settings/settings-page";

// Marketing Pages
import { BookingPage } from "@/components/modules/booking/booking-page";
import { SalesPage } from "@/components/modules/sales/sales-page";
import { KprPage } from "@/components/modules/kpr/kpr-page";
import { ListingPage } from "@/components/modules/listing/listing-page";
import { SocialPage } from "@/components/modules/social/social-page";
import { ReportsPage } from "@/components/modules/reports/reports-page";

import { canAccess, defaultViewForRole } from "@/lib/rbac";
import type { ViewKey } from "@/lib/types";

export function DashboardShell() {
  const { user } = useAuthStore();
  const { view, setView, resetForRole } = useAppStore();

  // Ensure current view is allowed for role
  useEffect(() => {
    if (user && !canAccess(user.role, user.division, view)) {
      setView(defaultViewForRole(user.role));
    }
  }, [user, view, setView]);

  // Sync view reset on login
  useEffect(() => {
    if (user) resetForRole(user.role);
  }, [user, resetForRole]);

  if (!user) return null;

  const render = () => {
    switch (view as ViewKey) {
      case "overview": return <OverviewPage />;
      case "chatbot": return <ChatbotPage />;
      case "marketing": return <MarketingPage />;
      case "orders": return <OrdersPage />;
      case "contacts": return <ContactsPage />;
      case "properties": return <PropertiesPage />;
      case "users": return <UsersPage />;
      case "finance": return <FinancePage />;
      case "settings": return <SettingsPage />;
      
      // Marketing pages
      case "booking": return <BookingPage />;
      case "sales": return <SalesPage />;
      case "kpr": return <KprPage />;
      case "listing": return <ListingPage />;
      case "social": return <SocialPage />;
      case "reports": return <ReportsPage />;

      default: return <OverviewPage />;
    }
  };

  return (
    <div className="h-screen flex bg-muted/30 overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 border-r bg-sidebar flex-col">
        <Sidebar />
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar />
        <main className="flex-1 p-4 lg:p-6 overflow-y-auto overflow-x-hidden">
          {render()}
        </main>
      </div>
    </div>
  );
}
