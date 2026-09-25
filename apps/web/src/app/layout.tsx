import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "Chatbot Manager — Kelola AI Asisten WhatsApp",
  description: "Dasbor pusat untuk mengelola chatbot AI dan operasional WhatsApp Anda.",
  keywords: ["properti", "AI agent", "WhatsApp", "Waha", "chatbot", "CRM", "real estate", "Indonesia"],
  authors: [{ name: "Chatbot Manager" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground">
        {children}
        <Toaster />
        <SonnerToaster richColors position="top-right" />
      </body>
    </html>
  );
}
