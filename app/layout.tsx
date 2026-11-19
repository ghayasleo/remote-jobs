import type { Metadata, Viewport } from "next";
import { Figtree } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { GoogleTags } from "@/components/analytics/google-tags";
import { OfflineNotice, ServiceWorker } from "@/components/shell/connectivity";
import { BottomNav } from "@/components/shell/nav";
import { NavigationTracker } from "@/components/shell/navigation";
import { SiteFooter } from "@/components/shell/site-footer";
import { SiteHeader } from "@/components/shell/site-header";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BRAND } from "@/lib/brand-mark";
import { OG_BASE, SITE_BRAND, SITE_NAME, SITE_URL } from "@/lib/site";
import "./globals.css";

const figtree = Figtree({ subsets: ["latin"], display: "swap" });

const description =
  "Find remote-friendly tech companies by region and stack, and see who's hiring right now.";

// Search Console / Bing Webmaster verification codes, set as Vercel env vars.
const verification: Metadata["verification"] = {
  ...(process.env.GOOGLE_SITE_VERIFICATION && { google: process.env.GOOGLE_SITE_VERIFICATION }),
  ...(process.env.BING_SITE_VERIFICATION && { other: { "msvalidate.01": process.env.BING_SITE_VERIFICATION } }),
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `Remote-friendly tech companies · ${SITE_BRAND}`, template: `%s · ${SITE_BRAND}` },
  description,
  applicationName: SITE_BRAND,
  appleWebApp: { capable: true, title: SITE_NAME, statusBarStyle: "default" },
  formatDetection: { telephone: false },
  openGraph: { ...OG_BASE, description },
  twitter: { card: "summary_large_image" },
  verification,
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
        {/* Feed discovery. Rendered here (React hoists it into <head>) rather than in
            metadata, because pages that set their own alternates would drop it. */}
        <link rel="alternate" type="application/rss+xml" title="New remote roles" href="/feeds/jobs.xml" />
        <link rel="alternate" type="application/rss+xml" title="Newly added companies" href="/feeds/companies.xml" />
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <TooltipProvider>
            <a
              href="#main"
              className="sr-only rounded-full bg-primary font-medium text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-(--z-toast) focus:px-4 focus:py-2"
            >
              Skip to content
            </a>
            <SiteHeader />
            <OfflineNotice />
            {/* Room for the bottom tab bar on phones. */}
            <main id="main" className="pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
              {children}
            </main>
            <SiteFooter />
            <BottomNav />
            <NavigationTracker />
            <Toaster
              position="bottom-center"
              duration={5000}
              mobileOffset={{ bottom: "calc(4.75rem + env(safe-area-inset-bottom))" }}
            />
            <GoogleTags />
          </TooltipProvider>
        </ThemeProvider>
        <ServiceWorker />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
