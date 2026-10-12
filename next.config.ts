import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // DRF URLs end with a slash; the API proxy adds it, so Next must not redirect it away.
  skipTrailingSlashRedirect: true,
  poweredByHeader: false,
};

export default nextConfig;
