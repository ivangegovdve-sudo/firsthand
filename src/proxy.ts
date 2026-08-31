import type { NextRequest } from "next/server";

import { handleProxy } from "./lib/auth/proxy-core.ts";
import { getServerAuthConfig } from "./lib/auth/server-config.ts";

export function proxy(request: NextRequest) {
  return handleProxy(request, getServerAuthConfig());
}

export const config = {
  matcher: "/:path*",
};
