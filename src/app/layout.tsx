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

export async function generateMetadata(): Promise<Metadata> {
  const { prisma } = await import("@/lib/db");
  const siteSettings = await prisma.siteSetting.findMany();
  const getVal = (key: string, fallback: string) => siteSettings.find(s => s.key === key)?.value || fallback;

  const siteTitle = getVal("site_title", "Param Adventures");
  const siteDescription = getVal("site_description", "Discover curated treks, spiritual journeys, and experiential adventures across India.");
  const siteFavicon = getVal("site_favicon_url", "/param-logo.png");
  const appUrl = getVal("app_url", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000");

  return {
    metadataBase: new URL(appUrl),
    title: {
      default: `${siteTitle} | Curated Trekking & Adventure Experiences`,
      template: `%s | ${siteTitle}`,
    },
    description: siteDescription,
    keywords: [
      "trekking",
      "adventure",
      "India treks",
      "hiking",
      "spiritual journeys",
      "outdoor experiences",
      siteTitle,
    ],
    authors: [{ name: siteTitle }],
    openGraph: {
      type: "website",
      locale: "en_IN",
      siteName: siteTitle,
      title: `${siteTitle} | Curated Trekking & Adventure Experiences`,
      description: siteDescription,
      images: [
        {
          url: siteFavicon,
          width: 512,
          height: 512,
          alt: `${siteTitle} Logo`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: siteTitle,
      description: siteDescription,
      images: [siteFavicon],
    },
    icons: {
      icon: siteFavicon,
      apple: siteFavicon,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import MaintenanceGuard from "@/components/layout/MaintenanceGuard";
import GoogleAnalytics from "@/components/monitoring/GoogleAnalytics";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { prisma } = await import("@/lib/db");
  const [platformSettings, siteSettings] = await Promise.all([
    prisma.platformSetting.findMany(),
    prisma.siteSetting.findMany(),
  ]);

  const getSiteVal = (key: string, fallback: string) => siteSettings.find(s => s.key === key)?.value || fallback;
  const getPlatformVal = (key: string, fallback: string) => platformSettings.find(s => s.key === key)?.value || fallback;

  const maintenanceMode = getPlatformVal("maintenance_mode", "false") === "true";
  const supportEmail = getSiteVal("support_email", "info@paramadventures.in");
  const supportPhone = getSiteVal("support_phone", "+91 98765 43210");

  return (
    <html lang="en" suppressHydrationWarning>
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
          <AuthProvider>
            <MaintenanceGuard isMaintenanceMode={maintenanceMode}>
              <div className="flex flex-col min-h-screen">
                <Navbar />
                <main className="flex-1 flex flex-col">{children}</main>
                <Footer supportEmail={supportEmail} supportPhone={supportPhone} />
              </div>
            </MaintenanceGuard>
          </AuthProvider>
        </ThemeProvider>
        <GoogleAnalytics />
      </body>
    </html>
  );
}
