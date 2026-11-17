import type { Metadata, Viewport } from "next";
import { Figtree } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { OfflineNotice, ServiceWorker } from "@/components/shell/connectivity";
import { BottomNav } from "@/components/shell/nav";
import { SiteHeader } from "@/components/shell/site-header";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BRAND } from "@/lib/brand-mark";
import "./globals.css";

const figtree = Figtree({ subsets: ["latin"], display: "swap" });

const siteUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:3000";

const description =
  "Find remote-friendly tech companies by region and stack, and see who's hiring right now.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Remote Jobs: remote-friendly tech companies", template: "%s · Remote Jobs" },
  description,
  applicationName: "Remote Jobs",
  appleWebApp: { capable: true, title: "Remote Jobs", statusBarStyle: "default" },
  formatDetection: { telephone: false },
  openGraph: { type: "website", siteName: "Remote Jobs", description },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: BRAND.white },
    { media: "(prefers-color-scheme: dark)", color: BRAND.darkChrome },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={figtree.className} suppressHydrationWarning>
      <body className="min-h-dvh antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <TooltipProvider>
            <a
              href="#main"
              className="sr-only rounded-full bg-primary px-4 py-2 font-medium text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-(--z-toast)"
            >
              Skip to content
            </a>
            <SiteHeader />
            <OfflineNotice />
            {/* Room for the bottom tab bar on phones. */}
            <main id="main" className="pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
              {children}
            </main>
            <BottomNav />
            <Toaster
              position="bottom-center"
              mobileOffset={{ bottom: "calc(4.75rem + env(safe-area-inset-bottom))" }}
            />
          </TooltipProvider>
        </ThemeProvider>
        <ServiceWorker />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
