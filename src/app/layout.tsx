import type { Metadata, Viewport } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Corazon Empire — Fashion, Accessories & Home",
    template: "%s | Corazon Empire",
  },
  description:
    "Corazon Empire is a curated house of fashion, accessories and home pieces — considered design, quietly luxurious, made to be lived in.",
  applicationName: "Corazon Empire",
  keywords: ["Corazon Empire", "fashion", "accessories", "home decor", "waist beads", "Nigerian brand"],
  openGraph: {
    type: "website",
    siteName: "Corazon Empire",
    title: "Corazon Empire — Fashion, Accessories & Home",
    description: "Considered pieces for the wardrobe, the home and the everyday ritual.",
    url: siteUrl,
    locale: "en_NG",
  },
  twitter: { card: "summary_large_image", title: "Corazon Empire" },
  robots: { index: true, follow: true },
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#f8f4ed",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-NG">
      <body>{children}</body>
    </html>
  );
}
