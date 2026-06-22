import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
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
  title: "NAAMI — Bespoke Handcrafted Shirts",
  description:
    "High-end bespoke shirts crafted from Egyptian cotton, Japanese linen, and heritage weaves. Luxury editorial fashion for the modern wardrobe.",
  keywords: "luxury shirts, bespoke shirts, Oxford cloth, chambray, linen shirts, heritage weave, fashion",
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
        <Navbar />
        {children}
        {/* Selvedge scroll indicator — fixed right-edge denim detail */}
        <SelvedgeScrollbar />
        {/* Custom image cursor */}
        <CustomCursor />
      </body>
    </html>
  );
}
