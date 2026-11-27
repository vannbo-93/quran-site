import type { MetadataRoute } from "next";

// Lets visitors install the site on their phone's home screen
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "القرآن الكريم",
    short_name: "القرآن",
    description: "اقرأ القرآن الكريم واستمع إليه، مع الترجمة والتفسير وألوان التجويد.",
    lang: "ar",
    dir: "rtl",
    start_url: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
