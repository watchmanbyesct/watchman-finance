/**
 * Copyright 2026 ESCT Holdings Inc.
 * Developed by Owens F. Shepard for ESCT Holdings Inc.
 */

import type { Metadata } from "next";
import { DM_Mono, DM_Sans, Playfair_Display } from "next/font/google";
import { EsctCopyrightFooter } from "@/components/layout/esct-copyright-footer";
import "./globals.css";

const fontDisplay = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const fontBody = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

const fontMono = DM_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Watchman Finance",
  description: "Financial operating system for the Watchman ecosystem.",
  icons: {
    icon: "/branding/watchman-by-esct.png",
    apple: "/branding/watchman-by-esct.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${fontDisplay.variable} ${fontBody.variable} ${fontMono.variable}`}
    >
      <body className={`${fontBody.className} min-h-screen flex flex-col`}>
        <div className="flex-1 flex flex-col min-h-0">{children}</div>
        <EsctCopyrightFooter />
      </body>
    </html>
  );
}
