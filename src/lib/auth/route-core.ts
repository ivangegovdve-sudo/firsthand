import type { NextRequest } from "next/server";
import nextServer from "next/server.js";

import type { AuthConfig } from "./config-core.ts";
import { isSameOriginRequest, isValidRequestHost } from "./request-policy.ts";
import {
  SESSION_COOKIE_NAME,
  accessKeyMatches,
  expiredSessionCookie,
  issueSession,
  sessionCookie,
  verifySession,
} from "./session-core.ts";

const { NextResponse } = nextServer;

export function authorizeMutationRequest(
  request: NextRequest,
  config: AuthConfig,
  nowMs = Date.now(),
) {
  if (
    request.method === "GET" ||
    request.method === "HEAD" ||
    request.method === "OPTIONS" ||
    !isSameOriginRequest(request, config.origin)
  ) {
    return false;
  }

  return verifySession(
    request.cookies.get(SESSION_COOKIE_NAME)?.value,
    config.sessionSecret,
    nowMs,
  );
}

export async function handleLogin(
  request: NextRequest,
  config: AuthConfig | null,
  nowMs = Date.now(),
  randomBytes?: () => Uint8Array,
) {
  const boundaryFailure = validateBoundary(request, config);
  if (boundaryFailure !== null || config === null) {
    return boundaryFailure ?? deny(503);
  }

  if (request.method === "GET" || request.method === "HEAD") {
    return loginPage(request.method === "HEAD");
  }
  if (request.method !== "POST") {
    return deny(405, { Allow: "GET, HEAD, POST" });
  }
  if (!isSameOriginRequest(request, config.origin)) {
    return deny(403);
  }

  const contentType = request.headers.get("content-type")?.split(";", 1)[0];
  if (contentType?.trim().toLowerCase() !== "application/x-www-form-urlencoded") {
    return deny(400);
  }

  try {
    const formData = await request.formData();
    const submitted = formData.getAll("accessKey");
    if (
      submitted.length !== 1 ||
      typeof submitted[0] !== "string" ||
      submitted[0].length > 4096
    ) {
      return deny(401);
    }

    const submittedBytes = new TextEncoder().encode(submitted[0]);
    if (!accessKeyMatches(submittedBytes, config.accessKeyVerifier)) {
      return deny(401);
    }

    const token = issueSession(config.sessionSecret, { nowMs, randomBytes });
    const response = NextResponse.redirect(
      new URL("/firsthand", config.origin),
      303,
    );
    response.cookies.set(sessionCookie(token, nowMs));
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch {
    return deny(400);
  }
}

export async function handleLogout(
  request: NextRequest,
  config: AuthConfig | null,
  nowMs = Date.now(),
) {
  const boundaryFailure = validateBoundary(request, config);
  if (boundaryFailure !== null || config === null) {
    return boundaryFailure ?? deny(503);
  }
  if (request.method !== "POST") {
    return deny(405, { Allow: "POST" });
  }
  if (!isSameOriginRequest(request, config.origin)) {
    return deny(403);
  }
  if (!authorizeMutationRequest(request, config, nowMs)) {
    return deny(401);
  }

  const response = NextResponse.redirect(
    new URL("/firsthand/login", config.origin),
    303,
  );
  response.cookies.set(expiredSessionCookie());
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

function validateBoundary(request: NextRequest, config: AuthConfig | null) {
  if (config === null) {
    return deny(503);
  }
  if (!isValidRequestHost(request, config.origin)) {
    return deny(421);
  }
  return null;
}

function deny(status: number, headers?: HeadersInit) {
  return new NextResponse(null, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      ...headers,
    },
  });
}

function loginPage(head: boolean) {
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Firsthand — private access</title>
    <style>
      :root { color-scheme: dark; font-family: ui-sans-serif, system-ui, sans-serif; background: #0a0a0a; color: #f3eee7; }
      body { min-height: 100vh; margin: 0; display: grid; place-items: center; }
      main { width: min(28rem, calc(100% - 3rem)); }
      h1 { font-family: ui-serif, Georgia, serif; font-weight: 500; }
      label, input, button { display: block; width: 100%; box-sizing: border-box; }
      label { margin-bottom: .5rem; font-size: .8rem; letter-spacing: .08em; text-transform: uppercase; }
      input { padding: .8rem; border: 1px solid #4a4540; background: #111; color: inherit; }
      button { margin-top: 1rem; padding: .8rem; border: 0; background: #e23727; color: white; font-weight: 700; cursor: pointer; }
      p { color: #aaa29a; line-height: 1.6; }
    </style>
  </head>
  <body>
    <main>
      <h1>Firsthand is private</h1>
      <p>Enter your access key to continue.</p>
      <form method="post" action="/firsthand/login">
        <label for="accessKey">Access key</label>
        <input id="accessKey" type="password" name="accessKey" autocomplete="current-password" required autofocus>
        <button type="submit">Continue</button>
      </form>
    </main>
  </body>
</html>`;

  return new NextResponse(head ? null : html, {
    status: 200,
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
      "Content-Type": "text/html; charset=utf-8",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
