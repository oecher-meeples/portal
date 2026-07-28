import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { AppShell } from "@/components/layout/app-shell";
import { BrandWatermark } from "@/components/layout/brand-watermark";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Oecher Meeples – Ludothek & Vereinsportal",
  description:
    "Der Brettspielverein für Aachen und Umgebung: Termine, News, Ludothek und Vereinsleben.",
  icons: {
    icon: "/meeple-150x150.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="de"
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col antialiased">
        <Script id="crypto-randomuuid-polyfill" strategy="beforeInteractive">
          {`if (typeof crypto !== "undefined" && typeof crypto.randomUUID !== "function") {
            crypto.randomUUID = function () {
              var bytes = crypto.getRandomValues(new Uint8Array(16));
              bytes[6] = (bytes[6] & 0x0f) | 0x40;
              bytes[8] = (bytes[8] & 0x3f) | 0x80;
              var hex = Array.prototype.map.call(bytes, function (b) {
                return b.toString(16).padStart(2, "0");
              });
              return (
                hex.slice(0, 4).join("") + "-" +
                hex.slice(4, 6).join("") + "-" +
                hex.slice(6, 8).join("") + "-" +
                hex.slice(8, 10).join("") + "-" +
                hex.slice(10, 16).join("")
              );
            };
          }`}
        </Script>
        <BrandWatermark />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AppShell>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
