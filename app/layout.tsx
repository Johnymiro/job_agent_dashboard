import type { Metadata } from "next";
import { Atkinson_Hyperlegible_Next, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { AuthGate } from "@/components/AuthGate";
import { THEME_SCRIPT } from "@/components/theme";

// built for legibility: I / l / 1 and O / 0 all look different, which helps in code-heavy lessons
const sans = Atkinson_Hyperlegible_Next({ subsets: ["latin"], display: "swap", variable: "--font-atkinson" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], display: "swap", variable: "--font-plex-mono" });

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
    <html lang="en" className={`${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="font-sans antialiased">
        <Providers>
          <AuthGate>{children}</AuthGate>
        </Providers>
      </body>
    </html>
  );
}
