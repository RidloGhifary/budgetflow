import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";

import { PWARegister } from "@/components/pwa/pwa-register";
import { getThemeInitScript } from "@/lib/theme";
import { AppProviders } from "@/providers/app-providers";

const appDescription =
  "A manual-first personal finance dashboard for tracking income, expenses, budgets, debts, saving goals, and financial reports.";
const metadataBase = new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000");

export const metadata: Metadata = {
  applicationName: "BudgetFlow",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "BudgetFlow"
  },
  authors: [{ name: "BudgetFlow" }],
  creator: "BudgetFlow",
  description: appDescription,
  icons: {
    apple: "/apple-icon.png",
    icon: "/icon.png",
    shortcut: "/favicon.ico"
  },
  keywords: [
    "budget tracker",
    "expense tracker",
    "income tracker",
    "personal finance",
    "financial dashboard",
    "saving goals",
    "debt tracker",
    "BudgetFlow"
  ],
  manifest: "/manifest.webmanifest",
  metadataBase,
  openGraph: {
    description: appDescription,
    images: [
      {
        alt: "BudgetFlow app icon",
        height: 630,
        url: "/opengraph-image.png",
        width: 1200
      }
    ],
    siteName: "BudgetFlow",
    title: "BudgetFlow",
    type: "website"
  },
  title: {
    default: "BudgetFlow",
    template: "%s | BudgetFlow"
  },
  twitter: {
    card: "summary_large_image",
    description: appDescription,
    images: ["/opengraph-image.png"],
    title: "BudgetFlow"
  }
};

export const viewport: Viewport = {
  themeColor: "#0B1512"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html className="dark" lang="en" suppressHydrationWarning>
      <body>
        <Script id="budgetflow-theme-init" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: getThemeInitScript() }} />
        <AppProviders>{children}</AppProviders>
        <PWARegister />
      </body>
    </html>
  );
}
