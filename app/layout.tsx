/** @format */

import type { Metadata, Viewport } from "next";
import { Navbar } from "@/components/Navbar";
import { arabic, quranFont, sans, serif } from "@/lib/fonts";
import { Analytics } from "@vercel/analytics/next";
import { NavAutoHide } from "@/components/NavAutoHide";
import "./globals.css";

// ---- In app/layout.tsx: replace the `metadata` and `viewport` exports with these ----

// Add this import at the top:
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL), // makes share image paths absolute
  title: { default: SITE_NAME, template: `%s | ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "ar_AR",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: "/og/home.jpg?v=2",
    images: [
      {
        url: "/og/home.jpg",
        width: 1200,
        height: 630,
        alt: "القرآن الكريم — قراءة واستماع وتفسير",
      },
    ],
  },
  twitter: { card: "summary_large_image", images: ["/og/home.jpg?v=2"] },
  appleWebApp: {
    title: "القرآن",
    capable: true,
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  viewportFit: "cover", // lets the controls avoid the iPhone home indicator
  themeColor: "#000000", // phone browser bar color
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="ar"
      dir="rtl"
      suppressHydrationWarning
      className={`${sans.variable} ${serif.variable} ${arabic.variable} ${quranFont.variable} bg-black`}>
      <head>
        {/* Must be in the first HTML bytes: tells Dark Reader to stay off (the site has its own dark mode) */}
        <meta name="darkreader-lock" />
        {/* Apply the saved theme before the page paints (prevents a dark flash in light mode) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem("theme")==="light")document.documentElement.dataset.theme="light"}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-screen font-sans text-white antialiased">
        {/* Soft orange light behind the page so glass effects are visible */}
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-48 left-1/2 h-[640px] w-[640px] -translate-x-1/2 rounded-full bg-white/[0.04] blur-[150px]" />
          <div className="absolute -bottom-40 -left-40 h-[420px] w-[420px] rounded-full bg-white/[0.03] blur-[120px]" />
          <div className="absolute top-1/2 -right-40 h-[380px] w-[380px] rounded-full bg-white/[0.03] blur-[120px]" />
        </div>
        <Navbar />
        <NavAutoHide />
        {children}
        <footer
          dir="ltr"
          className="site-footer px-6 py-10 text-center text-xs leading-relaxed text-white/30">
          Quran text: Tanzil Project (tanzil.net) — CC BY 3.0
          <br />
          English translation: Saheeh International, via Tanzil — non-commercial
          use
          <br />
          At-Tafsir Al-Muyassar (King Fahd Complex), via Tanzil — non-commercial
          use
          <p>
            Tajweed colors: cpfair/quran-tajweed — CC BY 4.0 (automatically
            generated)
          </p>
        </footer>
        <Analytics />
      </body>
    </html>
  );
}
