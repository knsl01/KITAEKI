import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { ThemeProvider, themeBootstrapScript } from "@/components/theme-provider";
import "./globals.css";

// Satu-satunya keluarga huruf aplikasi. Bobot 400–800 untuk hierarki teks; miring dipakai untuk kutipan.
// next/font mengunduh dan menyajikannya dari domain sendiri (tanpa file huruf manual, tanpa permintaan ke Google saat runtime).
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  style: ["normal", "italic"],
  variable: "--font-jakarta",
  display: "swap",
});

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
    <html lang="id" className={jakarta.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript + sidebarBootstrap }} />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
