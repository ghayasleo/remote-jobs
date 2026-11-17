import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 'use cache' + cacheLife instead of route-level revalidate, and links that
  // prefetch each route's shared App Shell for instant navigation.
  cacheComponents: true,
  partialPrefetching: true,

  experimental: {
    // Offline navigations wait and retry instead of failing; see useOffline().
    useOffline: true,
  },

  async redirects() {
    return [
      // Links from the first version of this site ended in ".md".
      {
        source: "/company-profiles/:slug([a-zA-Z0-9-]+)\\.md",
        destination: "/company-profiles/:slug",
        permanent: true,
      },
    ];
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
      {
        // Always check for a new service worker.
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ];
  },
};

export default nextConfig;
