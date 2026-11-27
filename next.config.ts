/** @format */

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },

  // Security headers on every page
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Don't guess file types (blocks a class of script injection)
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Other sites see only the domain, never the full page address
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // No other site may show this one inside a frame (clickjacking)
          { key: "X-Frame-Options", value: "DENY" },
          // The site never needs these device features
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
          },
          // Safe part of a CSP: no frames, no plugins, no <base> tricks, forms only to this site
          {
            key: "Content-Security-Policy",
            value:
              "frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
