import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FitMonk Trainer",
  description: "A WhatsApp-native client manager for independent personal trainers.",
  manifest: "/manifest.webmanifest",
  // "Trainer" as the home-screen label so it reads clearly next to the Personal
  // app's "FitMonk" (F) icon.
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Trainer" },
  icons: {
    icon: "/icon-192.png",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#FAFAFA",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
