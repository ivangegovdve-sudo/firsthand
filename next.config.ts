import type { NextConfig } from "next";

// Keep pages, route handlers, assets, and the session cookie on one path scope.
const nextConfig: NextConfig = {
  basePath: "/firsthand",
};

export default nextConfig;
