import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
          {children}
        <Toaster />
      </body>
    </html>
  );
}
