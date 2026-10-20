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
};

export default nextConfig;
