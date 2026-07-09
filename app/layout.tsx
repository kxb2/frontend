import { Inter } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

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
      <body>{children}</body>
    </html>
  );
}
