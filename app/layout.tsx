import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { AuthGate } from "@/components/AuthGate";
import { THEME_SCRIPT } from "@/components/theme";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "Jack Miro · Job Agent",
  description: "Job applications and freelance project outreach",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // data-theme is set by THEME_SCRIPT before paint, so the server markup differs
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className={`${inter.className} antialiased`}>
        <Providers>
          <AuthGate>{children}</AuthGate>
        </Providers>
      </body>
    </html>
  );
}
