import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 'use cache' + cacheLife instead of route-level revalidate, and links that
  // prefetch each route's shared App Shell for instant navigation.
  cacheComponents: true,
  partialPrefetching: true,

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
};

export default nextConfig;
