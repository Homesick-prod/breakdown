import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "../components/ThemeProvider";
import InstallPrompt from "../components/InstallPrompt";

export const viewport = {
  themeColor: "#4CA18A",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://mentalbreakdown.web.app"),
  title: "MentalBreakdown — Film Production Suite",
  description: "MentalBreakdown is the ultimate shooting schedule & shot list editor for filmmakers. Manage your production timeline effortlessly. Save time, shoot smarter.",
  applicationName: "MentalBreakdown",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "MentalBreakdown",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/icon-192.png",
  },
  openGraph: {
    title: "MentalBreakdown — Film Production Suite",
    description: "Shooting schedule and shot list editor for filmmakers.",
    siteName: "MentalBreakdown",
    images: [
      {
        url: "/mentalbreakdown-og-v2.png",
        width: 1200,
        height: 630,
        alt: "MentalBreakdown film production planning app",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MentalBreakdown — Film Production Suite",
    description: "Shooting schedule and shot list editor for filmmakers.",
    images: ["/mentalbreakdown-og-v2.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ThemeProvider>
          {children}
          <InstallPrompt />
        </ThemeProvider>
      </body>
    </html>
  );
}
