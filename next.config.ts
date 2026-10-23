import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // The public site's Demo button lives bottom-left.
  devIndicators: { position: "bottom-right" },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // Fictional brand: every response, HTML or not (images, fonts), stays out of search results.
  // robots.txt allows crawling so search engines can read this header (src/app/robots.ts).
  async headers() {
    return [{ source: "/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] }];
  },
  // The demo lives on its custom domain; the default Vercel address points there.
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "nusavista-journey.vercel.app" }],
        destination: "https://nusavista-journey.demo.kalsara.id/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
