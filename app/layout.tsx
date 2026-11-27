/** @format */

import type { Metadata, Viewport } from "next";
import { Navbar } from "@/components/Navbar";
import { arabic, quranFont, sans, serif } from "@/lib/fonts";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "القرآن الكريم",
  description: "اقرأ القرآن الكريم بالرسم العثماني",
  other: { "darkreader-lock": "true" }, // site is already dark: tell Dark Reader to stay off
};

export const viewport: Viewport = {
  viewportFit: "cover", // lets the controls avoid the iPhone home indicator
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
