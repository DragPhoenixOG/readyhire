import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every role dashboard is per-user and read at request time, so the app uses
  // classic dynamic rendering instead of Cache Components.
  cacheComponents: false,
  experimental: {
    serverActions: {
      // Document uploads are capped at 5 MB in src/lib/uploads.ts; leave room for multipart overhead.
      bodySizeLimit: "6mb",
    },
  },
  turbopack: {
    // The repository root has its own package-lock.json (Playwright demo); this app is self-contained.
    root: path.join(__dirname),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
