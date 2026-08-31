import type { NextRequest } from "next/server";
import nextServer from "next/server.js";

import type { AuthConfig } from "./config-core.ts";
import {
  isBrowserDocumentRequest,
  isExactLoginPath,
  isValidRequestHost,
} from "./request-policy.ts";
import { SESSION_COOKIE_NAME, verifySession } from "./session-core.ts";

const { NextResponse } = nextServer;

export function handleProxy(
  request: NextRequest,
  config: AuthConfig | null,
  nowMs = Date.now(),
) {
  if (config === null) {
    return deny(503);
  }
  if (!isValidRequestHost(request, config.origin)) {
    return deny(421);
  }

  if (isExactLoginPath(request.nextUrl.pathname, request.nextUrl.basePath)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (verifySession(token, config.sessionSecret, nowMs)) {
    return NextResponse.next();
  }

  if (isBrowserDocumentRequest(request)) {
    const response = NextResponse.redirect(
      new URL("/firsthand/login", config.origin),
    );
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }

  return deny(401);
}

function deny(status: number) {
  return new NextResponse(null, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      Vary: "Cookie",
    },
  });
}
