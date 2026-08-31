import type { NextRequest } from "next/server";

import { handleLogin } from "../../lib/auth/route-core.ts";
import { getServerAuthConfig } from "../../lib/auth/server-config.ts";

export async function GET(request: NextRequest) {
  return handleLogin(request, getServerAuthConfig());
}

export async function HEAD(request: NextRequest) {
  return handleLogin(request, getServerAuthConfig());
}

export async function POST(request: NextRequest) {
  return handleLogin(request, getServerAuthConfig());
}
