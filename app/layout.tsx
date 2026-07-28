import type { Metadata } from "next";
import { Inter } from "next/font/google";
import localFont from "next/font/local";
import Header from "@/app/components/Header";
import "react-loading-skeleton/dist/skeleton.css";
import { AuthProvider } from "@/app/auth/AuthContext";
import AuthGate from "@/app/auth/AuthGate";
import "./globals.css";

const SITE_NAME = "GeNova";
const SITE_DESCRIPTION = "Storyboard Builder";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL;

export const metadata: Metadata = {
  ...(SITE_URL ? { metadataBase: new URL(SITE_URL) } : {}),
  title: SITE_NAME,
  description: SITE_DESCRIPTION,
  openGraph: {
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    siteName: SITE_NAME,
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: ["/og-image.png"],
  },
};

// 영문(Inter)
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// 국문(Pretendard)
const pretendard = localFont({
  src: "../public/fonts/PretendardVariable.woff2",
  variable: "--font-pretendard",
  weight: "45 920",
  display: "swap",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${inter.variable} ${pretendard.variable}`}>
      <body className="bg-background flex h-screen flex-col">
        <AuthProvider>
          <AuthGate>
            <Header />
            {children}
          </AuthGate>
        </AuthProvider>
      </body>
    </html>
  );
}
