import type { NextRequest } from "next/server";

import { handleLogout } from "../../lib/auth/route-core.ts";
import { getServerAuthConfig } from "../../lib/auth/server-config.ts";

export async function POST(request: NextRequest) {
  return handleLogout(request, getServerAuthConfig());
}
