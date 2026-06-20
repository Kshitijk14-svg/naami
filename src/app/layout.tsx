import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import "./globals.css";
import SelvedgeScrollbar from "@/components/SelvedgeScrollbar";
import CustomCursor from "@/components/CustomCursor";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NAAMI — Bespoke Selvedge Denim",
  description:
    "High-end bespoke denim crafted from Japanese and Cone Mills selvedge cloth. Luxury minimalist fashion for the modern wardrobe.",
  keywords: "luxury denim, selvedge, bespoke, indigo, raw denim, fashion",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${cormorant.variable} ${inter.variable} h-full antialiased`}
    >
      <body
        className="min-h-full flex flex-col overflow-x-hidden"
        style={{ backgroundColor: "#F4F0E6", color: "#111111" }}
        suppressHydrationWarning
      >
        {children}
        {/* Selvedge scroll indicator — fixed right-edge denim detail */}
        <SelvedgeScrollbar />
        {/* Custom image cursor */}
        <CustomCursor />
      </body>
    </html>
  );
}
