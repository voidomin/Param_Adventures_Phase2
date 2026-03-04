import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import { AuthProvider } from "@/lib/AuthContext";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  ),
  title: {
    default: "Param Adventures | Curated Trekking & Adventure Experiences",
    template: "%s | Param Adventures",
  },
  description:
    "Discover curated treks, spiritual journeys, and experiential adventures across India's most breathtaking landscapes. Book your next adventure with Param Adventures.",
  keywords: [
    "trekking",
    "adventure",
    "India treks",
    "hiking",
    "spiritual journeys",
    "outdoor experiences",
    "Param Adventures",
  ],
  authors: [{ name: "Param Adventures" }],
  openGraph: {
    type: "website",
    locale: "en_IN",
    siteName: "Param Adventures",
    title: "Param Adventures | Curated Trekking & Adventure Experiences",
    description:
      "Discover curated treks, spiritual journeys, and experiential adventures across India.",
    images: [
      {
        url: "/param-logo.png",
        width: 512,
        height: 512,
        alt: "Param Adventures Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Param Adventures",
    description:
      "Discover curated treks and adventure experiences across India.",
    images: ["/param-logo.png"],
  },
  icons: {
    icon: "/param-logo.png",
    apple: "/param-logo.png",
  },
  robots: {
    index: true,
    follow: true,
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
        className={`${outfit.variable} ${inter.variable} font-body antialiased`}
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
