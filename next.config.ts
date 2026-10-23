import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // PGlite ships WebAssembly and data files; load it from node_modules rather than bundling it.
  serverExternalPackages: ["@electric-sql/pglite"],
  // Course content and migrations are read from disk at runtime.
  outputFileTracingIncludes: {
    "/**": ["./content/**/*.json", "./drizzle/**/*", "./assets/fonts/*"],
  },
};

export default nextConfig;
