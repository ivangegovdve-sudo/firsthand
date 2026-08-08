import type { NextConfig } from "next";

/**
 * Firsthand is served at sdforest.site/firsthand through a Vercel rewrite on
 * the orchestrator-gpt project. A rewrite of /firsthand/:path* alone would not
 * cover the /_next/* asset requests the HTML emits, so basePath moves every
 * route and asset URL under the subpath — pages, chunks, fonts and all.
 *
 * Consequence: this app also runs at /firsthand locally and on its own
 * vercel.app domain. The root path is not served.
 */
const nextConfig: NextConfig = {
  basePath: "/firsthand",
};

export default nextConfig;
