/** @format */

import {
  Amiri_Quran,
  Inter_Tight,
  Instrument_Serif,
  Readex_Pro,
} from "next/font/google";

export const quranFont = Amiri_Quran({
  weight: "400",
  subsets: ["arabic"],
  display: "swap",
  variable: "--nf-quran",
});
export const sans = Inter_Tight({
  subsets: ["latin"],
  display: "swap",
  variable: "--nf-inter",
});
export const serif = Instrument_Serif({
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
  display: "swap",
  variable: "--nf-serif",
});
export const arabic = Readex_Pro({
  subsets: ["arabic", "latin"],
  display: "swap",
  variable: "--nf-readex",
});
