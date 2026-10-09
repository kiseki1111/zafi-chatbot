import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { PwaRegister } from "@/components/pwa-register";
import { BackgroundTaskCenter } from "@/components/ui/background-task-center";

export const viewport: Viewport = {
  themeColor: "#059669",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Chatbot Manager — Kelola AI Asisten WhatsApp",
  description: "Dasbor pusat untuk mengelola chatbot AI dan operasional WhatsApp Anda.",
  keywords: ["properti", "AI agent", "WhatsApp", "Waha", "chatbot", "CRM", "real estate", "Indonesia"],
  authors: [{ name: "Chatbot Manager" }],
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Chatbot Manager",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground min-h-screen">
        {children}
        <PwaRegister />
        <Toaster />
        <SonnerToaster richColors position="top-right" />
        <BackgroundTaskCenter />
      </body>
    </html>
  );
}
