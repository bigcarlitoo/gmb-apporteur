import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Note: output: "export" removed to support API routes
  images: {
    unoptimized: true,
  },
  typescript: {
    // ignoreBuildErrors: true,
  },
  // Configuration pour les uploads de fichiers
  serverExternalPackages: [],
};

export default nextConfig;
