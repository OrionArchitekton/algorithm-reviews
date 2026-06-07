import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root to this project (a stray lockfile higher up the tree
  // otherwise confuses Next's root inference and can break the Vercel build).
  turbopack: { root: __dirname },
};

export default nextConfig;
