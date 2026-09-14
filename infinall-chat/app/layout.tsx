import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Infinall Chat — The Claude for Marketers",
  description:
    "An autonomous AI marketing workspace powered by Claude, featuring real-time web research, live artifact generation, and intelligent campaign planning.",
  keywords: ["AI marketing", "Claude", "marketing automation", "campaign strategy"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased">
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
