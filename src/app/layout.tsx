import type { Metadata, Viewport } from "next";
import { PwaBootstrap } from "@/lib/pwa";
import { SiteChrome } from "@/components/site-chrome";
import "./globals.css";

export const metadata: Metadata = {
  title: "善缘阁 · 为家人祈福求灵签",
  description:
    "心诚则灵。为家人点一盏祈福灯，求一支关帝灵签，看一卦命理八字。一念慈悲，福报自来。",
  applicationName: "善缘阁",
  authors: [{ name: "善缘阁" }],
  keywords: [
    "善缘阁", "祈福", "求签", "关帝灵签", "八字精批",
    "周公解梦", "求灵签", "看手相", "看面相", "命理",
  ],
  openGraph: {
    title: "善缘阁 · 为家人祈福求灵签",
    description:
      "心诚则灵。为家人点一盏祈福灯，求一支关帝灵签，看一卦命理八字。一念慈悲，福报自来。",
    siteName: "善缘阁",
    images: [{ url: "https://putiyuan.pages.dev/share-cover.svg", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "善缘阁 · 为家人祈福求灵签",
    description:
      "心诚则灵。为家人点一盏祈福灯，求一支关帝灵签，看一卦命理八字。一念慈悲，福报自来。",
    images: ["https://putiyuan.pages.dev/share-cover.svg"],
  },
  other: {
    "format-detection": "telephone=no, email=no, address=no",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-mobile-web-app-title": "善缘阁",
    "x5-fullscreen": "true",
    "x5-page-mode": "app",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#111611",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/favicon.svg" />
      </head>
      <body className="min-h-full flex flex-col">
        <PwaBootstrap />
        <SiteChrome>{children}</SiteChrome>
      </body>
    </html>
  );
}
