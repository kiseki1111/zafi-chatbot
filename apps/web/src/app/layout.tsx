import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { GoogleOAuthProvider } from "@react-oauth/google";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PropertiKu Agent — AI Asisten Properti WhatsApp",
  description: "Platform AI agent untuk asisten properti berbasis WhatsApp (Waha). Chatbot, CRM leads, marketing, order, keuangan, & RBAC dalam satu dasbor.",
  keywords: ["properti", "AI agent", "WhatsApp", "Waha", "chatbot", "CRM", "real estate", "Indonesia"],
  authors: [{ name: "PropertiKu Agent" }],
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
        <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ""}>
          {children}
        </GoogleOAuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
