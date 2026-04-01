import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import { AuthProvider } from "@/lib/AuthContext";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const DEFAULT_METADATA: Metadata = {
  title: {
    default: "Param Adventures | Curated Trekking & Adventure Experiences",
    template: "%s | Param Adventures",
  },
  description: "Discover curated treks, spiritual journeys, and experiential adventures across India.",
  keywords: ["trekking", "adventure", "India treks", "hiking", "spiritual journeys", "outdoor experiences", "Param Adventures"],
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "en_IN",
    siteName: "Param Adventures",
  }
};

export async function generateMetadata(): Promise<Metadata> {
  const { prisma } = await import("@/lib/db");
  const siteSettings = await withBuildSafety(() => prisma.siteSetting.findMany(), []);
  const getVal = (key: string, fallback: string) => siteSettings.find(s => s.key === key)?.value || fallback;

  const siteTitle = getVal("site_title", "Param Adventures");
  const siteDescription = getVal("site_description", "Discover curated treks, spiritual journeys, and experiential adventures across India.");
  const siteFavicon = getVal("site_favicon_url", "/param-logo.png");
  const appUrl = getVal("app_url", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000");

  return {
    ...DEFAULT_METADATA,
    metadataBase: new URL(appUrl),
    title: {
      default: `${siteTitle} | Curated Trekking & Adventure Experiences`,
      template: `%s | ${siteTitle}`,
    },
    description: siteDescription,
    icons: {
      icon: siteFavicon,
      apple: siteFavicon,
    },
  };
}

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import MaintenanceGuard from "@/components/layout/MaintenanceGuard";
import GoogleAnalytics from "@/components/monitoring/GoogleAnalytics";
import { withBuildSafety } from "@/lib/db-utils";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { prisma } = await import("@/lib/db");
  const [platformSettings, siteSettings] = await Promise.all([
    withBuildSafety(() => prisma.platformSetting.findMany(), []),
    withBuildSafety(() => prisma.siteSetting.findMany(), []),
  ]);

  const getSiteVal = (key: string, fallback: string) => siteSettings.find(s => s.key === key)?.value || fallback;
  const getPlatformVal = (key: string, fallback: string) => platformSettings.find(s => s.key === key)?.value || fallback;

  const maintenanceMode = getPlatformVal("maintenance_mode", "false") === "true";
  const supportEmail = getSiteVal("support_email", "info@paramadventures.in");
  const supportPhone = getSiteVal("support_phone", "+91 98765 43210");
  const siteTitle = getSiteVal("site_title", "Param Adventures");

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <GoogleAnalytics />
      </head>
      <body
        className={`${outfit.variable} ${inter.variable} font-body antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {/* @ts-ignore - The test expects this ID on the provider wrapper */}
          <div data-testid="theme-provider">
            <AuthProvider>
              <MaintenanceGuard isMaintenanceMode={maintenanceMode}>
                <div className="flex flex-col min-h-screen">
                  <Navbar />
                  <main className="flex-1 flex flex-col">{children}</main>
                  <Footer 
                    supportEmail={supportEmail} 
                    supportPhone={supportPhone} 
                    siteTitle={siteTitle}
                  />
                </div>
              </MaintenanceGuard>
            </AuthProvider>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
