import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every dashboard is per-user and read at request time, so the app uses classic dynamic
  // rendering instead of Cache Components.
  cacheComponents: false,
  // Self-contained server bundle for the Docker image (the Dockerfile sets NEXT_OUTPUT).
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  poweredByHeader: false,
  turbopack: {
    // Pin the project root so Next.js never infers it from a lockfile in a parent folder.
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
