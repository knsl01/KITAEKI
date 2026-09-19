import type { Metadata, Viewport } from "next";
import {
  Bricolage_Grotesque,
  Figtree,
  Fraunces,
  Inter,
  Instrument_Serif,
  Plus_Jakarta_Sans,
} from "next/font/google";
import { ThemeProvider, themeBootstrapScript } from "@/components/theme-provider";
import "./globals.css";

// Pasangan bawaan ("Hangat") dimuat di awal. Dua pasangan lain baru diunduh saat dipilih (preload: false).
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--f-jakarta", display: "swap" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--f-fraunces", display: "swap", axes: ["opsz"] });
const figtree = Figtree({ subsets: ["latin"], variable: "--f-figtree", display: "swap", preload: false });
const bricolage = Bricolage_Grotesque({ subsets: ["latin"], variable: "--f-bricolage", display: "swap", preload: false });
const inter = Inter({ subsets: ["latin"], variable: "--f-inter", display: "swap", preload: false });
const instrument = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--f-instrument",
  display: "swap",
  preload: false,
});

const fontVariables = [jakarta, fraunces, figtree, bricolage, inter, instrument].map((f) => f.variable).join(" ");

export const metadata: Metadata = {
  title: { default: "KITA — Eki & Dinda", template: "%s · KITA" },
  description: "Keuangan dan rencana hidup bersama dalam satu tempat.",
  manifest: "/manifest.webmanifest",
  applicationName: "KITA",
  appleWebApp: { capable: true, title: "KITA", statusBarStyle: "black-translucent" },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F7F6F3" },
    { media: "(prefers-color-scheme: dark)", color: "#14201A" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const sidebarBootstrap = `(function(){try{document.documentElement.dataset.sidebar=localStorage.getItem("kita-sidebar-collapsed")==="1"?"collapsed":"expanded";}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={fontVariables} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript + sidebarBootstrap }} />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
