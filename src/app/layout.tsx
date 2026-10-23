import type { Metadata } from "next";
import { EB_Garamond, Libre_Franklin } from "next/font/google";
import type { ReactNode } from "react";
import { TopNav } from "@/components/TopNav";
import "./globals.css";

const garamond = EB_Garamond({
  subsets: ["latin", "greek"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-garamond",
  display: "swap",
});

const franklin = Libre_Franklin({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-franklin",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Providence Home Academy",
    template: "%s · Providence Home Academy",
  },
  description:
    "A classical, parent-led homeschool program. Teach from daily scripts, on screen or on paper, with your home-study records kept for you.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${garamond.variable} ${franklin.variable}`}>
      <body>
        <TopNav />
        {children}
      </body>
    </html>
  );
}
