import type { Metadata, Viewport } from "next";
import { Nunito, Fredoka } from "next/font/google";
import "./globals.css";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

const sans = Nunito({ subsets: ["latin"], variable: "--font-sans" });
const display = Fredoka({ subsets: ["latin"], variable: "--font-display", weight: ["500", "600"] });

export const metadata: Metadata = {
  title: "Ryan & Evie",
  description: "Our little place.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Ryan & Evie", statusBarStyle: "default" },
  icons: {
    icon: [{ url: "/favicon-32.png", sizes: "32x32" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FDF6F1" },
    { media: "(prefers-color-scheme: dark)", color: "#1B1620" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable}`}>
      <body className="font-sans antialiased">
        <ServiceWorkerRegister />
        <main className="mx-auto w-full max-w-md px-4 pb-10 pt-4">{children}</main>
      </body>
    </html>
  );
}
